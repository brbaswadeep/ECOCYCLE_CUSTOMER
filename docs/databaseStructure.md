# EcoCycle Database Structure

This document describes the Firestore data model used by the EcoCycle customer web app. It is written for engineers and AI agents building a companion admin panel that reads and writes the same database. Everything here was reverse engineered directly from the customer app source code (there is no formal schema definition or ORM in this project, Firestore is schemaless and every shape below is simply "what the customer app happens to read and write").

Project uses Firebase: Firestore (database), Firebase Auth (accounts), Firebase Storage (files, though most images actually go through Cloudinary, see notes below), Firebase Analytics.

## Conventions used in this document

- `{uid}`, `{requestId}`, etc. in a path mean "any document ID", usually a Firestore auto ID or a Firebase Auth UID.
- "Timestamp" means a Firestore `Timestamp` object (has `.toDate()` and `.seconds`), written with `serverTimestamp()`.
- A field marked "optional" may be absent entirely on older documents, not just null. The customer app defensively reads most fields with `?.` and fallback values, so assume any field can be missing when building admin UI.
- Because there is no backend/API layer, all reads and writes happen directly from the browser via the Firestore client SDK, governed only by `firestore.rules`. An admin app talks to the same database the same way.

## Top level collections

| Collection | Purpose | Created by |
|---|---|---|
| `customers` | Customer profile/account documents | Signup flow (`AuthContext.jsx`) |
| `customers/{uid}/history` | Subcollection: AI Smart Scan analysis history per customer | Smart Scan flow |
| `customers/{uid}/pointsHistory` | Subcollection: EcoPoints ledger entries (earn/redeem) per customer | Smart Scan flow (earn), Shop checkout (redeem) |
| `vendors` | Vendor/recycler business profiles | Vendor app (not in this repo), read-only from customer app |
| `requests` | Recycling pickup requests and "sell my scrap" requests | Smart Scan -> Request flow |
| `products` | EcoShop marketplace product listings | Vendor app (not in this repo), read-only from customer app except stock decrement |
| `orders` | EcoShop purchase orders (customer buying a product) | Shop checkout flow |
| `chats` | Person-to-person chat threads (customer <-> vendor) | Messaging feature |
| `chats/{chatId}/messages` | Subcollection: individual chat messages | Messaging feature |

There is no `admins` collection yet. The current `firestore.rules` only distinguishes "authenticated" vs "not authenticated" and does not check `role` in most rules (see Security Rules section). An admin app will need its own role-check strategy; see "Notes for the admin app" at the end of this document.

---

## `customers/{uid}`

The document ID is the Firebase Auth UID. Created at signup, read on every auth state change (`AuthContext.jsx`), spread onto the in-memory `currentUser` object so every page can read `currentUser.name`, `currentUser.phone`, etc. directly.

| Field | Type | Notes |
|---|---|---|
| `email` | string | From Firebase Auth |
| `role` | string | Always the literal `"customer"`. Used as the access-control check: on login and on every auth state change, the app reads this doc and signs the user out if `role !== 'customer'`. This is how the same Firebase Auth user pool is shared between the customer app and a separate vendor app. |
| `name` | string | Display name |
| `phone` | string | Mobile number. The Dashboard prompts the user to add this on first login if missing. |
| `createdAt` | string | ISO date string (`new Date().toISOString()`), NOT a Firestore Timestamp. Inconsistent with every other `createdAt` in this database, which are Firestore Timestamps. Read with `new Date(currentUser.createdAt)` in `Profile.jsx`. |
| `location` | object or absent | See "Location object shape" below. A global popup (`LocationRequiredPopup.jsx`) forces every logged-in customer to set this before using the app if it is missing. |
| `ecoPoints` | number | Live spendable EcoPoints balance (loyalty currency, redeemable only for EcoShop discounts, never cash). Fixed rate: 25 points = INR 1. Lazily backfilled the first time `Layout.jsx`/`EcoPointsSection.jsx` observes a customer doc without this field, seeded to `max(existingRequestCount * 50, 100)`. |
| `totalEarnedPoints` | number | Lifetime points earned, only ever incremented, never decremented. |
| `totalRedeemedPoints` | number | Lifetime points redeemed at EcoShop checkout. |

Location object shape (also reused for vendor locations and request-time snapshots):
```json
{
  "address": "123 Example Street, City, State",
  "coordinates": { "lat": 12.9716, "lng": 77.5946 },
  "lat": 12.9716,
  "lng": 77.5946,
  "name": "optional place display name, only set when picked via Places search"
}
```
`coordinates` is the canonical field used for distance math (`requestService.js`); the flat `lat`/`lng` are duplicated at the top level for convenience/back-compat by `LocationPicker.jsx`.

Writes to this document:
- Signup / Google sign-in: create with `email`, `role: 'customer'`, `createdAt`, `name`, `phone`.
- `Dashboard.jsx`: `updateDoc` to set `phone` after the "link mobile number" modal.
- `Profile.jsx`: `updateDoc` to set `name`, `phone`, `location` together on "Save Profile".
- `LocationRequiredPopup.jsx`: `updateDoc` to set `location` only.

---

## `customers/{uid}/history/{historyId}`

One document per Smart Scan AI analysis the customer has run. Auto-generated ID. Written once by `SmartScan.jsx` right after a successful analysis; never updated afterward, only deleted.

| Field | Type | Notes |
|---|---|---|
| `imageUrl` | string or null | Cloudinary-hosted image URL (see "Image hosting" note below), not a Firebase Storage path. |
| `timestamp` | Timestamp | `serverTimestamp()` at save time. |
| `userId` | string | Same as the parent `{uid}`, duplicated onto the doc for convenience. |
| `summary` | object | `{ material: string, object: string, score: number }`, a flattened quick-display copy of the deeper analysis, derived from `waste_analysis.detected_items[0]` and `environmental_impact.sustainability_score`. |
| `waste_analysis` | object | `{ detected_items: [{ material_type, specific_object, confidence_score }] }` |
| `quality_assessment` | object | `{ cleanliness_level, damage_level, contamination_risk }` |
| `quantity_estimation` | object | `{ approximate_weight_kg: number, approximate_market_value?: number }` |
| `environmental_impact` | object | `{ sustainability_score: number, co2_saved_kg or CO2_saved_kg?, landfill_diverted_kg?, energy_saved_kwh? }`. Field casing for CO2 is inconsistent across AI providers, the UI checks both `co2_saved_kg` and `CO2_saved_kg`. |
| `conversion_options` | array | Up to 3 AI-generated DIY/upcycling ideas. See "AI analysis result shape" below for full shape of each option. |
| `best_recommendation` | object | `{ recommended_option: string, reasoning: string }` |
| `image_generation` | object | Optional, prompts for future image generation features, not currently rendered. |
| `overall_confidence` | number | 0.0-1.0, optional. |

This entire document is essentially "whatever JSON the AI service (`gemini.js` primary, `openai.js` fallback, both driven off the `nvidia.js` vision identification step) returned, spread with a few extra bookkeeping fields." See the "AI Analysis Pipeline" section below for the exact JSON contract.

Deletes: `History.jsx` lets the user delete a scan, which deletes the Firestore doc and best-effort deletes the image from Firebase Storage (`deleteObject`) even though the image was actually uploaded to Cloudinary, not Firebase Storage. That storage delete call is expected to silently fail/no-op in the current setup; it is legacy code, harmless but non-functional.

Writing a Smart Scan analysis also awards EcoPoints: `customers/{uid}.ecoPoints` and `.totalEarnedPoints` are both incremented by 25 (`increment(25)`), and a corresponding ledger entry is added to `pointsHistory` (see below).

---

## `customers/{uid}/pointsHistory/{entryId}`

The EcoPoints ledger. Auto-generated ID, append-only (no updates or deletes observed), ordered by `createdAt desc` for the "Points Activity" list in `EcoPointsSection.jsx`.

| Field | Type | Notes |
|---|---|---|
| `points` | number | Positive for an earn event, negative for a redeem event. UI derives the "earned vs redeemed" icon and color purely from the sign of this field. |
| `title` | string | Human-readable label for the entry, e.g. `"SmartScan AI Analysis"` (earn) or an EcoShop checkout description (redeem). Falls back to a generic "EcoPoints Earned" / "EcoShop Discount" label in the UI if absent. |
| `createdAt` | Timestamp | `serverTimestamp()` |

Known writers today: Smart Scan analysis (+25, title `"SmartScan AI Analysis"`), Shop checkout when a customer redeems points for a discount (negative, one entry per order line that redeemed points). The EcoPoints UI also advertises "+50 pts per completed scrap pickup" and a "+10 to +50 pts Purity Bonus" for sorted recyclables as ways to earn, but no corresponding `pointsHistory`/`ecoPoints` write for either was found in this repo's request-completion or rating code paths; treat those two as advertised-but-not-yet-wired-up when building admin tooling that reconciles point totals against ledger entries.

---

## `vendors/{vendorId}`

Vendor business profiles. The customer app only ever reads this collection (and increments `rating`/`ratingCount`); vendor documents are created and managed by a separate vendor-facing app not present in this repo. Document ID is the vendor's Firebase Auth UID.

| Field | Type | Notes |
|---|---|---|
| `name` | string | Personal or fallback display name |
| `businessName` | string | Preferred display name if present (`vendor.businessName \|\| vendor.name` pattern used everywhere) |
| `contactPerson` | string | Optional |
| `phone` / `contactNumber` | string | Both field names appear in the codebase (`vendor.phone \|\| vendor.contactNumber`), treat as the same logical field with legacy naming drift |
| `address` | string | Optional, falls back to `location.address` |
| `location` | object | Same shape as customer `location` (see above), coordinates required for `findLocalVendors` distance search to include this vendor |
| `rating` | number | Average rating, default assumed `5` if absent when first computing a new average |
| `ratingCount` | number | Number of ratings received, default `0` |

Writes from the customer app: only `rating` and `ratingCount`, via `updateDoc`, after a customer submits a rating on a completed request (see `requests.userRating` below). New average is computed client-side: `((currentRating * ratingCount) + newScore) / (ratingCount + 1)`.

---

## `requests/{requestId}`

A recycling pickup request or a "sell my scrap for cash" request. This is the most complex document shape in the app because both the customer app and a separate vendor app read/write it collaboratively as the request moves through its lifecycle; the customer app only ever creates and reads it, plus writes `userRating`.

Created by `requestService.js -> createVendorRequest()`, called from `RequestConfirmation.jsx` after Smart Scan analysis.

### Fields written by the customer app at creation time

| Field | Type | Notes |
|---|---|---|
| `customerId` | string | Customer's UID |
| `uid` | string | Duplicate of `customerId`, kept "for easier querying in Dashboard" per an inline code comment |
| `customerLocation` | object | Snapshot of the customer's `location` object at request time |
| `itemDetails` | object | See below |
| `vendorIds` | array of string | Every vendor ID found within a 15km radius at request time (`findLocalVendors`), the request is effectively broadcast to all of them |
| `status` | string | Initial value always `"pending"` |
| `createdAt` | Timestamp | `serverTimestamp()` |
| `itemName` | string | Denormalized copy of `itemDetails.name`, defaults to `"Unknown Item"` |
| `itemImage` | string or null | Denormalized copy of the uploaded image URL |
| `type` | string | `"buy_request"` if `itemDetails.requestType === 'sell'`, otherwise `"pickup_request"` |

`itemDetails` sub-object:
```json
{
  "name": "string, product/item name",
  "material": "string, e.g. Plastic",
  "goal": "string, e.g. 'Sell Directly' or 'Recycle as: <product name>'",
  "requestType": "sell | recycle",
  "estimatedValue": 0,
  "askingPrice": 0,
  "analysis": { "...full AI analysis result, see below..." },
  "conversionDetails": { "...the selected conversion_options entry, or null if 'Sell Directly'..." },
  "image": "string URL or null (mapped from itemDetails.imageUrl at creation time)"
}
```

### Fields written/updated later (by vendor app, or by customer app after acceptance)

These are read defensively throughout `History.jsx`, `OrderDetails.jsx`, and `VendorProfile.jsx` but never written by this repo except `userRating`/`ratedAt`. Documented here because an admin panel will very likely need to read and possibly write these too.

| Field | Type | Notes |
|---|---|---|
| `status` | string | Observed values: `pending`, `accepted`, `declined`, `rejected`, `completed`. `History.jsx` treats anything not `declined` and not tracking-completed as "active". |
| `acceptedBy` | string | Vendor UID who accepted the request |
| `vendorName` | string | Denormalized vendor display name |
| `finalQuote` | object | `{ originalBasePrice, discountAmount, discountAppliedPercent, logisticsCost, platformFee, totalCustomerPrice, customerEarnings }`. `customerEarnings` used for "sell" requests, `totalCustomerPrice` used for the amount the customer owes on recycle/service requests. |
| `projectMeta` | object | `{ trackingStage, estimatedCompletion, trackingHistory }` |
| `projectMeta.trackingStage` | string enum | One of: `accepted`, `arrived`, `initiated`, `processing`, `finishing`, `completed` (a 6-stage pipeline; `OrderDetails.jsx` also recognizes a leading `requested` stage client-side for display only, it is not a stored value). |
| `projectMeta.estimatedCompletion` | Timestamp | Target completion date |
| `projectMeta.trackingHistory` | array | `[{ stage: string, timestamp: Timestamp }]`, one entry per stage transition |
| `userRating` | number 1-5 | Written by the customer app after `projectMeta.trackingStage === 'completed'` |
| `ratedAt` | Date | Plain JS `Date` (not `serverTimestamp()`) written alongside `userRating` |
| `quantity`, `weight` | number | Sometimes present as top-level convenience fields shown directly on activity cards |

### Status/stage relationship (important, easy to get wrong)

There are two overlapping state machines on the same document:
1. `status`: coarse request lifecycle (`pending -> accepted -> completed`, or `declined`/`rejected` as terminal negative states).
2. `projectMeta.trackingStage`: a finer 6-step pipeline that only exists once `status === 'accepted'`, describing physical fulfillment progress (accepted -> arrived -> initiated -> processing -> finishing -> completed).

"Completed" for a request specifically means `projectMeta.trackingStage === 'completed'`, not `status === 'completed'` (the code checks the tracking stage first and falls back to `status` for legacy documents). Any admin UI showing request state should replicate this same precedence.

---

## `products/{productId}`

EcoShop marketplace listings, "handcrafted goods made from reclaimed waste" sold by vendors. Read-only from the customer app (`Shop.jsx` fetches, filters client-side, decrements `quantity` on purchase). Created/managed by the vendor app.

| Field | Type | Notes |
|---|---|---|
| `name` | string | Product title |
| `description` | string | Free text, shown as "Product Story & Specs" |
| `price` | number | Price in INR, GST/delivery computed on top at checkout time (see Orders section) |
| `category` | string | One of the fixed customer-facing filter categories: `General`, `Gardening`, `Kitchen`, `Accessories`, `Outdoor`, `Decor`, `Furniture` (plus an `"All"` pseudo-category in the UI only, not a real value) |
| `quantity` | number | Stock count. Only products with `quantity > 0` are shown in the shop. Decremented via `increment(-qty)` on every purchase. |
| `image` | string | Single cover image URL, used as fallback if `images` is empty |
| `images` | array of string | Multiple gallery image URLs, shown with a thumbnail strip and counter badge |
| `type` | string | `"recycled"` triggers an "Upcycled" badge and a "100% Upcycled Certified" callout; any other value (or absent) is treated as a normal product |
| `sourceInventoryName` | string | Only meaningful when `type === 'recycled'`, describes what waste material the product was made from, e.g. "Reclaimed teak offcuts" |
| `vendorId` | string | Seller's vendor UID |
| `vendorName` | string | Denormalized seller display name, falls back to `"Verified Artisan"` |
| `createdAt` | Timestamp | Used for default "Featured / Newest" sort |

---

## `orders/{orderId}`

A completed EcoShop purchase (one order document per cart line item, not per checkout session, see "Multi-item checkout" note below). Created entirely by the customer app at checkout (`Shop.jsx -> checkOut()` and `handleBuySingle()`); status updates thereafter are made by the vendor app.

| Field | Type | Notes |
|---|---|---|
| `customerId` | string | Buyer's UID |
| `customerName` | string | From `currentUser.displayName \|\| currentUser.name`, fallback `"EcoCycle Member"` |
| `customerEmail` | string | |
| `deliveryAddress` | string | Free text, editable at checkout, defaults to the customer's saved `location.address` |
| `vendorId` | string | Seller's vendor UID, or the literal string `"verified_vendor"` if the product had no vendor attached |
| `vendorName` | string | Denormalized, defaults to `"Verified Artisan"` |
| `productId` | string | Reference to `products/{productId}` |
| `productName` | string | Denormalized product name |
| `productImage` | string | Denormalized cover image |
| `price` | number | Final total charged for this line item (equals `priceBreakdown.total`) |
| `priceBreakdown` | object | `{ subtotal, gst, deliveryFee, total, platformFee, vendorEarnings, ecoPointsDiscount, ecoPointsRedeemed }`. `gst` is always 18% of subtotal. `deliveryFee` is `0` if `subtotal >= 999`, otherwise `49` (flat rate, currently hardcoded in `Shop.jsx`). `platformFee` is 1.5% of subtotal. `vendorEarnings = total - platformFee`. `ecoPointsDiscount` (INR) and `ecoPointsRedeemed` (points, `ecoPointsDiscount * 25`) are only present when the customer chose to redeem EcoPoints at checkout; `total` already has the discount subtracted. When points are redeemed, `customers/{uid}.ecoPoints` is decremented by `ecoPointsRedeemed` and a negative-`points` entry is appended to `pointsHistory`. |
| `quantity` | number | Units purchased in this line item |
| `status` | string enum | `pending` (set at creation) -> `processing` / `accepted` -> `shipped` -> `delivered`. `cancelled` also appears as a terminal negative state in filtering logic. |
| `createdAt` | Timestamp | `serverTimestamp()` |
| `trackingId` | string | Optional, set later by vendor/courier integration |
| `deliveryPartner` | string | Optional, defaults to display text `"Green Logistics Express"` if absent |
| `userId` | string | Some historical documents use `userId` instead of `customerId` as the buyer reference; `History.jsx` runs two separate queries (`where customerId ==`, `where userId ==`) and merges/deduplicates results by document ID to handle both. New admin code should treat `customerId` as canonical and `userId` as a legacy fallback. |

Multi-item checkout note: when a customer checks out a cart with N distinct products, the app writes N separate `orders` documents in a loop (one per cart line), each with its own `priceBreakdown` and its own inventory decrement. There is no parent "order" or "cart session" document grouping them; from the database's point of view a 3-item cart checkout is indistinguishable from 3 separate single-item purchases placed at the same time.

---

## `chats/{chatId}`

Direct person-to-person messaging between a customer and a vendor. Exactly one continuous thread per pair of people is intended (see "Deterministic chat ID" below), regardless of how many orders/requests they have together.

| Field | Type | Notes |
|---|---|---|
| `participants` | array of exactly 2 string UIDs | Queried with `array-contains` to find "my chats" |
| `participantNames` | map | `{ [uid]: displayName }` for both participants, set/refreshed on every message send |
| `lastMessage` | string | Preview text shown in the chat list |
| `lastUpdated` | Timestamp | `serverTimestamp()`, used to sort the chat list newest-first |
| `unreadCount` | map | `{ [uid]: number }`, incremented for the receiver on every message send, reset to `0` for a user when they open/select that chat |
| `latestOrderId` / `orderId` | string, optional | If the conversation was started from an order/request context, both of these are set to that order/request ID (kept for backward compatibility, treat as the same field) |

### Deterministic chat ID

`chatService.js` computes a canonical chat ID as the two participant UIDs sorted alphabetically and joined with `_`, e.g. `"uidA_uidB"`. New conversations prefer this canonical ID so that the same two people always land in the same thread even if they start chatting from different entry points (an order page vs. a vendor profile page vs. Messages). Older/legacy chat documents may exist with random auto-generated IDs instead; `resolveChatId()` searches for those as a fallback before creating a new canonical-ID document. An admin app reading this collection should not assume the document ID has any particular format.

## `chats/{chatId}/messages/{messageId}`

| Field | Type | Notes |
|---|---|---|
| `text` | string | Message body, trimmed |
| `senderId` | string | UID of sender |
| `senderName` | string | Denormalized sender display name at time of send |
| `createdAt` | Timestamp | `serverTimestamp()`, subcollection is queried with `orderBy('createdAt', 'asc')` |

---

## AI Analysis Pipeline (shape of `history` docs and `requests.itemDetails.analysis`)

Both `customers/{uid}/history/{id}` and `requests/{id}.itemDetails.analysis` store the same JSON contract, the raw structured output of the AI waste-analysis pipeline. Understanding this shape matters for any admin dashboard that wants to show what the AI actually detected.

Pipeline (all client-side, no Cloud Functions involved for the AI call itself; two tiny Cloudflare Pages functions in `functions/api/` exist only as CORS-safe API-key-hiding proxies to OpenAI and NVIDIA):
1. Image is uploaded to Cloudinary (unsigned upload preset) to get a permanent public URL.
2. The same image (as compressed base64) is sent to NVIDIA's vision model (`meta/llama-3.2-11b-vision-instruct`) via `/api/nvidia`, which both validates that the photo is an acceptable physical waste item and produces a first-pass text description. If the image is rejected (selfies, pets, screenshots, unsafe content, etc.) NVIDIA returns `{ valid: false, refusal_category, refusal_reason }` and the app shows `RestrictionPopup.jsx` without ever calling the next step.
3. The NVIDIA text description is sent to Gemini (`gemini-2.5-flash`, via `gemini.js`, with up to 2 backup API keys rotated on 429/403/503) to produce the full structured JSON below. If Gemini fails entirely, OpenAI is used as a fallback (`openai.js`, via the `/api/generateIdeas` proxy function).

Full JSON contract produced by step 3:
```json
{
  "waste_analysis": {
    "detected_items": [
      { "material_type": "string, one of: plastic, metal, glass, paper, fabric, organic, e-waste, mixed",
        "specific_object": "short string, e.g. Bottle, Can, Box",
        "confidence_score": 0.0 }
    ]
  },
  "quality_assessment": {
    "cleanliness_level": "clean | moderately_dirty | heavily_contaminated",
    "damage_level": "intact | partially_damaged | broken",
    "contamination_risk": "low | medium | high"
  },
  "quantity_estimation": {
    "approximate_weight_kg": 0,
    "approximate_market_value": 0
  },
  "conversion_options": [
    {
      "product_name": "string",
      "conversion_type": "DIY | simple_craft | decorative",
      "description": "3-4 lines",
      "required_processing": "string, e.g. 'Cut top, Paint'",
      "difficulty_level": "easy | medium",
      "estimated_conversion_cost_inr": 0,
      "estimated_market_value_inr": 0,
      "step_by_step_instructions": ["string", "..."],
      "material_list": ["string", "..."]
    }
  ],
  "best_recommendation": {
    "recommended_option": "string, matches a conversion_options[].product_name",
    "reasoning": "short string"
  },
  "image_generation": { "product_visual_prompt": "string", "before_after_prompt": "string" },
  "environmental_impact": {
    "sustainability_score": 0,
    "co2_saved_kg": 0,
    "landfill_diverted_kg": 0,
    "energy_saved_kwh": 0
  },
  "overall_confidence": 0.0
}
```
Always exactly 3 entries are requested in `conversion_options`, each intentionally priced between roughly 100 and 400 INR by prompt instruction (not enforced in code, just instructed to the model). `image_generation` and some `environmental_impact` sub-fields are frequently absent depending on which AI provider actually answered; treat every field in this contract as optional when rendering.

There is a small unused/dead-code module, `src/services/environmentalImpactService.js`, which independently computes a conservative environmental-impact estimate (CO2/energy/water saved, trees-equivalent) from a hardcoded reference table keyed by waste type. It is not called anywhere in the current routed pages (its only consumer, `src/components/ImpactCalculator.jsx`, has a broken relative import path and is not mounted in `App.jsx`). Safe to ignore unless resurrecting that feature.

---

## Image hosting

Product/scan images are NOT stored in Firebase Storage despite Storage being configured. Two different upload paths exist:
- Smart Scan photos: uploaded client-side directly to Cloudinary (unsigned upload preset, cloud name defaults to `drrjsmqsh`, preset defaults to `ecocycle`, both overridable via `VITE_CLOUDINARY_CLOUD_NAME` / `VITE_CLOUDINARY_UPLOAD_PRESET`). The resulting `secure_url` is what gets saved as `imageUrl`/`itemImage` everywhere.
- EcoShop product images: presumably uploaded by the vendor app; the customer app only ever reads `product.image` / `product.images[]` URLs, never uploads product photos itself.
- Conversion-idea illustrative images (in `ProductCard.jsx`): fetched live from the Unsplash API by product name, with Lorem Picsum and a text placeholder as successive fallbacks. These are never persisted to Firestore, they are re-fetched every time the card renders.

Firebase Storage's own rules (`storage.rules`) currently allow unauthenticated public read AND write on every path (`allow read, write: if true`). This is a wide-open bucket; flagged here for awareness, not something this documentation pass fixes.

---

## Security Rules summary (`firestore.rules`)

All rules currently only check `request.auth != null` (any signed-in Firebase user, regardless of `role`), with two exceptions:
- `products/{productId}`: public read (`allow read: if true`) even when signed out, write requires auth.
- Everything else (`customers`, `vendors`, `requests`, `orders`, `chats` and their subcollections): both read and write require auth, with no ownership or role check at the rules level. In practice, the customer app enforces "this is a customer account" entirely in application code (`AuthContext.jsx` checking `role === 'customer'` after every login), not in Firestore rules. This means, at the rules level, any authenticated user (including a future admin account, or any vendor account) can already read and write any customer's data, any request, any order, and any chat. There is no `admins` allowlist and no per-document ownership check anywhere in `firestore.rules`.
- `customers/{userId}` subcollections are matched with a wildcard, `match /{allChildren=**}`, not one rule per named subcollection. This covers both `history` and `pointsHistory` (and any future subcollection added under a customer doc) with the same "any authenticated user" read/write rule, no extra rule changes are needed there when adding new customer subcollections.

## Notes for the admin app

- Since Firestore rules do not distinguish roles beyond "signed in or not", the admin app's access control will need to either add an `admins` collection/custom-claim check to `firestore.rules` (recommended, this repo does not currently have that pattern to copy) or otherwise ensure only trusted admin accounts can authenticate against this project at all.
- Reuse the exact field names and status enums documented above; the vendor app (not in this repo) is presumably the other writer of `requests.status`, `requests.projectMeta`, and `orders.status`, so an admin panel editing these should stay consistent with the values listed here (`pending`, `accepted`, `declined`, `rejected`, `completed` for requests; `pending`, `processing`, `shipped`, `delivered`, `cancelled` for orders; the 6-value `trackingStage` enum for request fulfillment).
- `createdAt` is a Firestore Timestamp everywhere except `customers.createdAt`, which is a plain ISO string. Handle both.
- Expect denormalized/duplicated fields everywhere (`vendorName` copied onto both `requests` and `orders`, `customerId`/`uid` duplicated on `requests`, `customerId`/`userId` duplicated on `orders`). An admin panel that edits, say, a vendor's business name should be aware it will not retroactively update the denormalized copies on existing request/order documents, exactly like the customer app itself does not.
