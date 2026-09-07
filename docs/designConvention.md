# EcoCycle Design Convention

This document describes the visual design system, UI patterns, and frontend architecture of the EcoCycle customer web app, so that a companion admin panel can be built with a consistent look and feel. It is written for engineers and AI agents, not end users.

Stack: React 19 + Vite 7, React Router 7, Tailwind CSS 3 (utility classes only, no CSS Modules or styled-components), Firebase (Auth, Firestore, Storage, Analytics), `lucide-react` for all icons. No component library (no MUI/Chakra/shadcn), every UI piece is a hand-built component using Tailwind classes directly in JSX. No TypeScript, this is plain JSX.

If building the admin panel as a separate app/repo, the fastest path to matching this look is: copy `tailwind.config.cjs`, `src/index.css`, and the `brand.*` color tokens below, then follow the component patterns in this document rather than trying to reuse compiled CSS.

## Brand color tokens

Defined in `tailwind.config.cjs` under `theme.extend.colors.brand`, used as `brand-red`, `brand-cream`, etc. throughout the app (Tailwind's `bg-brand-red`, `text-brand-brown`, `border-brand-brown/10`, and so on, including opacity modifiers like `/10`, `/20`, `/60`).

| Token | Hex | Role |
|---|---|---|
| `brand.red` | `#E35336` | Primary action color (main CTA buttons, "sell" flows, active/urgent states) |
| `brand.cream` | `#F5F5DC` | Page background color, the app's default canvas |
| `brand.orange` | `#F4A460` | Secondary accent (gradients, highlights, "eco" secondary CTAs) |
| `brand.brown` | `#5C2812` | Primary accent/text color, used for most headings, nav, and secondary buttons. Darkened from a lighter brown specifically for contrast (per an inline comment in the config). |
| `brand.black` | `#000000` | Strict black, used for primary body text and high-emphasis headings |
| `brand.green` | `#2E8B57` | Success / nature / positive-impact color (earnings, environmental stats) |

Global body defaults (`src/index.css`): background `#F5F5DC` (brand.cream), text color `#000000` (brand.black), no margin/padding, `box-sizing: border-box`. No custom `@font-face`; the app relies on the system font stack via Tailwind's default `font-sans`.

### Extended palette (used ad hoc alongside brand tokens)

The brand palette above is deliberately small (6 colors), so the app supplements it with plain Tailwind palette colors for semantic states that do not map cleanly onto "brand". Reuse this same mapping in the admin panel rather than inventing new semantic colors:

| Tailwind color | Meaning / where used |
|---|---|
| `emerald-*` | Success, "completed"/"delivered" status badges, active/live progress indicators (pulsing dots), positive stats |
| `amber-*` | Pending/warning states, rewards/points, "in transit" |
| `red-*` / `rose-*` | Errors, destructive actions (delete confirmations), "declined"/"cancelled" status badges |
| `blue-*` | Informational, "accepted"/"in_progress"/"shipped" status badges, info toasts |
| `gray-*` | Neutral/disabled states, skeleton loading placeholders, secondary buttons on white |
| `yellow-*` | Star ratings specifically (`fill-yellow-400`/`fill-amber-400`, used interchangeably in different files) |

A recurring exact custom color, `#FAF7F2` / `#FAF8F5` (a very light warm off-white, slightly different from `brand.cream`), is hardcoded (not a Tailwind token) as the background for "recessed" panel-in-a-card content: timeline steps, stat mini-cards, milestone content blocks. Treat it as an implicit 7th palette color: "recessed panel background".

## Layout shell

`src/layouts/Layout.jsx` is the authenticated app shell wrapping every protected route (see Routing section). Structure:
- **Desktop (`lg:` breakpoint and up)**: fixed-position left sidebar, `w-64`, white background, `border-r border-brand-brown/10`. Contains: logo header (`h-24`), nav links, a promotional "Smart Scan" card pinned above the footer, and a user profile footer link. Main content area has `lg:ml-64` to offset for the fixed sidebar.
- **Mobile (below `lg:`)**: sticky top header (`h-16`, `bg-white/90 backdrop-blur-md`) with logo and a hamburger toggle; tapping it slides in a right-anchored overlay drawer (`absolute right-0 top-16 bottom-0 w-64`) with the same nav links, over a `bg-black/40 backdrop-blur-sm` scrim. The mobile menu also includes a direct Smart Scan nav link (desktop relies on the promo card instead).
- Main scrollable content area: `bg-brand-cream`, inner padding `p-4 lg:p-8`.
- Two persistent floating overlays are mounted at the Layout level (so they appear on every authenticated page): `LocationRequiredPopup` (blocking modal if the customer has no saved location) and `EcoBot` (a bottom-right floating chat launcher, see Chat/Bot Widget pattern below).
- Nav items use a `NavLink` helper (local to `Layout.jsx`, not React Router's `NavLink`) that highlights the active route with `bg-brand-brown text-white`, and can show a small rectangular badge (`rounded` text chip, not a pill) next to the label. Two live badges exist today: an unread-message count on "Messages" (plain number, computed via a Firestore `onSnapshot` listener over the `chats` collection, default red), and an EcoPoints balance on "EcoPoints" (`"{n} pts"` string via a `badgeColor` override, amber). The badge only renders for a truthy value, not strictly `&gt; 0`, so a string badge like `"120 pts"` works the same way a numeric unread count does.

`AuthPage.jsx` (the only fully unauthenticated route besides the landing page) uses a distinct split-screen layout instead of the app shell: form on the left half, a full-height geometric/abstract art panel built entirely out of colored `div`s (brand color blocks, circles, triangles via CSS borders) on the right half, hidden on mobile (`hidden lg:block`).

## Routing and access control (`src/App.jsx`)

- `/` -> `LandingPage` (public, marketing page, no app shell)
- `/auth` -> `AuthPage` (public, no app shell)
- Every other route is nested under a shared `<Layout>` element and wrapped individually in `<ProtectedRoute>`: `/dashboard`, `/smart-scan`, `/messages`, `/shop`, `/ecopoints`, `/history`, `/history/:id`, `/profile`, `/orders/:orderId`, `/store-orders/:orderId`, `/vendors/:vendorId`.
- Unknown routes redirect to `/` (`<Route path="*" element={<Navigate to="/" replace />} />`).
- `ProtectedRoute` (`src/components/ProtectedRoute.jsx`) redirects to `/auth` if `currentUser` is falsy. It relies on `AuthProvider` (`src/context/AuthContext.jsx`) not rendering `children` at all until the initial Firebase auth check resolves (`{!loading && children}`), so there is no separate loading spinner needed inside `ProtectedRoute` itself.
- `AuthContext` is the single source of truth for the logged-in user; `currentUser` is the Firebase Auth user object spread together with that user's `customers/{uid}` Firestore document, so both `currentUser.email` (from Auth) and `currentUser.name`/`currentUser.phone`/`currentUser.location` (from Firestore) are available directly without a second fetch on every page.
- Route-level code splitting is not used; all pages are imported eagerly at the top of `App.jsx`.

An admin panel should mirror this same pattern (a shared authenticated shell + a `ProtectedRoute`-style guard) but will need its own separate role check, since this app's guard only checks "is any customer logged in", see `docs/databaseStructure.md` security notes for why that check currently lives in application code rather than Firestore rules.

## Component patterns

### Buttons

All buttons are plain `<button>`/`<Link>` elements with Tailwind classes, no shared `<Button>` component exists anywhere in the codebase; every button's classes are typed out inline at each call site. When building the admin panel, consider extracting these into a real shared component, but match these visual variants:

- **Primary / urgent action** (red): `bg-brand-red text-white font-bold rounded-xl hover:bg-brand-brown` (or a slightly darker inline hex hover like `hover:bg-[#c94328]` / `hover:bg-[#c4442b]`, used interchangeably with `hover:bg-brand-brown`). Used for the main CTA on a page: "Sell Directly", "Start Recycling Now", "Run Analysis".
- **Secondary / structural action** (brown): `bg-brand-brown text-white font-bold rounded-xl hover:bg-brand-black`. Used for "Save", "Submit", "Confirm", checkout, most modal primary actions. This is actually the most common button style in the app, brand-brown reads as the "default confirm" color and brand-red is reserved for higher-urgency/first-touch CTAs.
- **Outline / tertiary**: `bg-white border border-brand-brown/20 text-brand-brown hover:bg-brand-cream rounded-xl`. Used for "Cancel", secondary choices next to a primary button.
- **Cream / subtle filled**: `bg-brand-cream text-brand-brown border border-brand-brown/15 hover:bg-brand-cream/80 rounded-xl`. Used for lower-emphasis nav-adjacent actions (e.g. "Shop" next to "Smart Scan" on the dashboard).
- **Danger**: `bg-red-600 text-white hover:bg-red-700 rounded-xl`. Reserved specifically for destructive confirmation buttons (e.g. "Delete" in a confirm dialog), notably NOT using `brand-red` for this, brand-red is a brand/action color, not a semantic-danger color in this system.
- All buttons: `font-bold`, tactile press feedback via `active:scale-95`, disabled state via `disabled:opacity-50 disabled:cursor-not-allowed` (sometimes `opacity-70`), loading state swaps the label for a spinning `<Loader2 className="animate-spin" />` icon rather than showing both.
- Border radius is `rounded-xl` for almost every button; a few marketing/landing-page CTAs and pill-shaped profile buttons use `rounded-full` instead.

### Cards

Standard content card: `bg-white rounded-2xl (or rounded-3xl for hero/section-level cards) border border-brand-brown/10 shadow-sm hover:shadow-md transition-all p-5/p-6/p-8`. Nearly every piece of content on every page lives inside one of these. `rounded-3xl` is reserved for page-level hero panels and top-level section containers; `rounded-2xl` for cards nested inside those sections (e.g. individual stat tiles, individual list items).

A neumorphic/soft-UI shadow variant appears in a couple of places (`OrderDetails.jsx`): `shadow-[8px_8px_16px_rgba(0,0,0,0.05),-8px_-8px_16px_rgba(255,255,255,0.8)] border border-white` instead of the standard `border-brand-brown/10 shadow-sm`. This is a one-off stylistic choice, not a systematic alternate card style, do not treat it as a second official card variant.

### Modals / dialogs

No shared `<Modal>` component; every modal is hand-rolled with the same recurring structure:
```
<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
  <div className="bg-white rounded-2xl (or 3xl) shadow-2xl w-full max-w-{sm|md|lg|2xl} overflow-hidden animate-in zoom-in-95 duration-200">
    ...
  </div>
</div>
```
Z-index is manually staggered by hand across the app rather than using a portal/stack manager: ordinary modals use `z-50`, some "above everything" modals (product detail, cart drawer, invoice) go up to `z-[80]`/`z-[90]`/`z-[100]`. When adding new overlapping modals, check existing z-index usage in the relevant page rather than guessing, there is no central constant for this.

Confirmation dialogs (delete scan, delete order, rate vendor) follow a smaller centered variant: icon in a colored circle at the top (red-tinted for destructive, amber for rating), bold heading, one line of muted description, then a two-button footer (`flex-1` cancel button + `flex-1` confirm button).

Full-screen product/cart modals (`Shop.jsx`) instead slide in from an edge: cart is a right-anchored drawer (`animate-in slide-in-from-right`), matching a typical e-commerce cart UX rather than the centered-dialog pattern used elsewhere.

### Form inputs

Standard text/tel/email input: `w-full px-4 py-3 bg-white (or bg-gray-50) border border-gray-200 (or border-brand-brown/15) rounded-xl focus:outline-none focus:border-brand-red (or focus:border-brand-brown) focus:ring-1 focus:ring-{same color} text-brand-black placeholder-gray-400`. Icon-prefixed inputs place an absolutely-positioned `lucide-react` icon at `left-3 top-1/2 -translate-y-1/2` with `pl-10` on the input itself. Password fields add a show/hide toggle icon (`Eye`/`EyeOff`) at the right side with `pr-10`.

Labels: `block text-xs font-bold text-brand-black (or text-brand-brown) mb-1.5 uppercase tracking-wide`, required fields get a red asterisk: `<span className="text-brand-red">*</span>`.

Search inputs (used on History, Shop, Messages) follow a slightly more elaborate pattern: a wrapping `div` with `group relative flex items-center bg-white border border-brand-brown/15 rounded-2xl focus-within:ring-3 focus-within:ring-brand-brown/10 focus-within:border-brand-brown/40`, a leading search icon that changes color on focus-within, and a trailing clear ("x") button that only renders when the field has a value, plus a small `Esc` keyboard hint badge that only renders when the field is empty. `Escape` key is wired to clear the field.

### Status badges

Extremely consistent pattern repeated across History, OrderDetails, StoreOrderDetails, VendorProfile, Shop's order history: `text-xs font-bold px-2 (or 2.5|3) py-0.5 (or 1) rounded-lg (or xl) border capitalize`, color combination driven by a small mapping function duplicated (copy-pasted, not shared) in every file that needs it:
```js
if (status is completed/delivered) -> 'bg-emerald-50 text-emerald-700 border-emerald-200'
if (status is accepted/in_progress/shipped) -> 'bg-blue-50 text-blue-700 border-blue-200'
if (status is declined/cancelled) -> 'bg-red-50 text-red-700 border-red-200'
else (pending, default) -> 'bg-amber-50 text-amber-700 border-amber-200'
```
Reuse this exact mapping (and consider actually extracting it into a shared helper) for any admin-panel status displays.

### Empty states

Centered layout inside a card: icon in a rounded box (`w-12-16 h-12-16 rounded-2xl bg-brand-cream border border-brand-brown/10`, icon at ~50% opacity via `text-brand-brown/30` or `/40`), bold heading (`font-bold text-brand-black`), one line of muted supporting copy (`text-brand-brown/60`), optionally one or two CTA buttons below to resolve the empty state (e.g. "Start Your First Scan"). Search-driven empty states additionally offer a "clear search" affordance.

### Loading states

Two patterns depending on context:
- **Spinner**: `<Loader2 className="w-{n} h-{n} animate-spin text-brand-orange (or text-brand-red/text-brand-brown)" />` from `lucide-react`, used for full-page loads, button-pending states, and inline section loads.
- **Skeleton**: `animate-pulse` grey blocks (`bg-gray-200 rounded`) matching the shape of the eventual content, used specifically for the Shop product grid while products are being fetched.

### Toasts / inline notifications

No shared toast provider or portal, every page that needs toasts reimplements its own local `toast` state (`{ show, message, type }` or `{ message, type }`) and its own fixed-position rendering block. Two positioning conventions coexist:
- Bottom-right (`fixed bottom-6 right-6`): used in `History.jsx`.
- Top-right (`fixed top-5 right-5` or `top-24 right-6`): used in `Shop.jsx`, `OrderDetails.jsx`, `StoreOrderDetails.jsx`.

Visual shape either way: `bg-white/95 backdrop-blur-md border border-brand-brown/15 rounded-2xl shadow-xl`, a small colored icon chip on the left (emerald circle + `CheckCircle2` for success, red + `AlertCircle` for error, amber + `AlertCircle` for warning, blue + icon for info), the message text, entrance animation `animate-in slide-in-from-{top|bottom}-3 (or 5)`. Auto-dismiss timers vary per implementation (3000ms-4000ms), not standardized. If building a shared admin design system, this is a good candidate to consolidate into one real `<ToastProvider>`.

### Wallet / balance hero card

Introduced by `EcoPointsSection.jsx` for the EcoPoints balance display, this is the one place in the app that departs from the light `bg-white` card convention: a dark, full-bleed gradient panel (`rounded-3xl bg-gradient-to-br from-brand-brown via-[#3d190b] to-[#200b04] text-white p-6 sm:p-8 shadow-xl border border-brand-brown/20`) with two large soft-blurred color orbs positioned absolutely in opposite corners for depth (`absolute w-80 h-80 rounded-full blur-3xl pointer-events-none`, one `bg-brand-orange/15` top-right, one `bg-brand-green/20` bottom-left), content in a `relative z-10` wrapper on top. Use this pattern sparingly, for a single "primary balance/summary" panel per page, not as a general card style.

### Progress trackers / stepper timelines

A recurring, fairly elaborate pattern used for the request fulfillment pipeline (`History.jsx` card view and `OrderDetails.jsx` full page) and the EcoShop delivery pipeline (`StoreOrderDetails.jsx`): a horizontal row of circular step nodes connected by a background track line and an animated gradient-filled progress line (`bg-gradient-to-r from-brand-orange via-amber-500 to-emerald-500` or `from-brand-orange to-emerald-500`), each node showing a `lucide-react` icon while pending/current (current node pulses via `animate-pulse` on the icon and `ring-4 ring-emerald-500/15` around the node) or a checkmark (`CheckCircle`) once passed, with emerald as the "completed" node color throughout. `OrderDetails.jsx` additionally renders a full vertical timeline variant below the horizontal one, with per-stage timestamps pulled from `projectMeta.trackingHistory`.

Live/active indicators elsewhere in the app reuse the same visual vocabulary: a small `w-2 h-2 rounded-full bg-emerald-500` dot with `animate-ping` or `animate-pulse` to mean "this is happening right now" (used for pending-request callouts, unread presence indicators, "Live Status" badges).

### Chat / support bot widget

`EcoBot.jsx` is a floating bottom-right launcher (`fixed bottom-6 right-6 z-50`, a circular `brand-brown` button) mounted globally in `Layout.jsx`, present on every authenticated page. Clicking it opens a small popover panel (not a full modal, no backdrop) offering a choice between "EcoBot AI" (a Gemini-backed chat assistant, `chatWithEcoBot` in `gemini.js`) and "Support Team" (hands off to a third-party Tawk.to live chat widget, loaded via a script tag in `index.html` and normally kept hidden/minimized so it doesn't visually conflict with EcoBot's own launcher button).

This is architecturally separate from the person-to-person `ChatModal.jsx` / `Messages.jsx` system used for customer-vendor communication about a specific order or request; `EcoBot` never touches Firestore `chats`, it is a local in-memory conversation with the AI plus an escape hatch to human support.

### Person-to-person chat (Messages / ChatModal)

`Messages.jsx` (full chat list + thread page) and `ChatModal.jsx` (a smaller popup version opened from an order or vendor profile page) both render the same underlying `chats`/`messages` data (see `docs/databaseStructure.md`) with the same bubble pattern:
- Message bubble: `max-w-[85%] p-3 rounded-2xl text-sm shadow-sm`.
- Own messages: right-aligned, `bg-brand-orange text-white`, with one squared-off corner (`rounded-br-sm`) forming a speech-bubble "tail" pointing toward the sender's own side.
- Other participant's messages: left-aligned, `bg-white text-gray-800 border border-gray-100`, tail corner `rounded-bl-sm`.
- A typing indicator uses three dots with staggered `animate-bounce` delays, not a text label.
- Timestamps are formatted contextually (`formatChatTimestamp`): time only if sent today, `"Yesterday"` if sent yesterday, `"MMM D"` if sent earlier this year, otherwise `"DD/MM/YY"`.

### Product / marketplace grid (Shop)

`Shop.jsx` lists `products` documents in a responsive grid: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6`. Each `ProductCard.jsx` tile: cover image `h-52 object-cover` that scales on hover (`group-hover:scale-105`), badges overlaid on top of the image (top-left/top-right corners, e.g. an "Upcycled" badge when `type === 'recycled'`), a low-stock or out-of-stock tag pinned to the bottom-left of the image, then a content section below with product name, price (`₹` prefixed), and either an "Add to Cart" button or a quantity stepper (once the item is already in the cart) that toggle based on cart state.

## Typography

- Headings and any numeric "hero stat" (prices, counts, percentages): `font-extrabold` or `font-black`, sizes ranging from `text-xl` (card headers) up to `text-5xl`/`text-7xl` (landing page hero).
- Body text: `font-medium`, colored `text-brand-brown` or `text-brand-brown/60`-`/70` for de-emphasized secondary text (this "brand-brown at reduced opacity" pattern is the app's primary way of expressing text hierarchy, rather than switching font sizes).
- Small eyebrow/label text (section labels, form labels, stat card captions): `text-[10px]` or `text-xs`, `font-bold` or `font-extrabold`, `uppercase tracking-wide` or `tracking-wider`.
- Buttons and nav items: always `font-bold`.
- No custom web font is loaded; everything relies on Tailwind's default `font-sans` stack (the OS/browser default sans-serif).

## Spacing, radius, and shadow scales

- **Border radius**: `rounded-lg` for tiny chips/badges, `rounded-xl` for buttons/inputs/small cards/nav items, `rounded-2xl` for standard cards and mid-size modals, `rounded-3xl` for hero panels, page-level section containers, and large modals/drawers, `rounded-full` for avatars, pill badges, and circular icon containers.
- **Shadow**: `shadow-sm` is the default resting elevation for any card, `shadow-md` on hover for interactive cards, `shadow-lg`/`shadow-xl`/`shadow-2xl` for modals and hero-level emphasis. Tailwind's newer micro-shadow utilities `shadow-xs`/`shadow-2xs` appear frequently for very subtle chip/button elevation (this app's Tailwind version supports that finer scale).
- **Containers**: page content is generally wrapped in `max-w-5xl mx-auto` (most app pages) or `max-w-7xl mx-auto` (Dashboard, Shop, landing page), with outer padding `p-4 lg:p-8` coming from the Layout shell itself, so individual pages do not need to repeat horizontal padding.
- **Vertical rhythm**: sections within a page are stacked with `space-y-6` (sometimes `space-y-4` for tighter lists), grids use `gap-4` to `gap-6`.

## Animation conventions

Uses Tailwind's `animate-in`/`fade-in`/`zoom-in-95`/`slide-in-from-{direction}-{n}` utility classes (the `tailwindcss-animate`-style API) extensively for entrance transitions on modals, toasts, and newly-rendered content, typically with `duration-200` to `duration-700`. Standard Tailwind keyframe utilities in active use: `animate-spin` (loading spinners), `animate-pulse` (skeletons, "live" text, breathing emphasis on current stepper node), `animate-ping` (live/active status dots), `animate-bounce` (the 3-dot "typing..." indicator in EcoBot). Interactive elements commonly get `transition-all` or `transition-colors` plus `hover:` and `active:scale-95` for tactile press feedback. There is no reduced-motion handling (`prefers-reduced-motion`) anywhere in the codebase.

## Icons

`lucide-react` is the only icon set used anywhere in the app, no custom SVG icon set and no other icon library. Icons are typically sized `w-4 h-4` (inline with text), `w-5 h-5` (buttons, list items), up to `w-8 h-8`/`w-10 h-10` for large empty-state or header icons. Icon color generally matches or is a muted variant of the surrounding text color (`text-brand-brown/60`, `text-brand-red`, etc.) rather than being independently styled.

## Currency and formatting conventions

All monetary values are in Indian Rupees, rendered with a literal `₹` prefix directly in JSX (no `Intl.NumberFormat` currency formatting used consistently, some places use `.toLocaleString()` for thousands separators, most do not). Dates are formatted with plain `Date.prototype.toLocaleDateString()`/`toLocaleTimeString()` calls at each call site (no date library like `date-fns`/`dayjs` is used anywhere), formatting options are copy-pasted per call site rather than centralized.

## Things intentionally NOT abstracted (do not assume these exist)

To save the next engineer/agent time searching for them: there is no shared `<Button>`, `<Card>`, `<Modal>`, `<Toast>`/`<ToastProvider>`, `<Badge>`, or `<Input>` component anywhere in `src/components/`. Every one of the patterns described above is independently reimplemented with inline Tailwind classes at each usage site. If the admin panel should look and feel identical to the customer app, the pragmatic approach is to copy these class patterns directly rather than to look for a component to import. If the admin panel should be more maintainable than the customer app, extracting these patterns into a real shared component library (still using the same Tailwind classes/brand tokens documented here) is a reasonable improvement to make at that time, just be aware it would be a deviation from how the existing customer app is built, not a port of an existing pattern.
