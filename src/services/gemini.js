import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = "AIzaSyBcUBQ9xK-uJoDwfdNGuYE7IuWCQtOw6EM"; // User provided key
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const SYSTEM_PROMPT = `
You are a creative eco-friendly assistant for Indian households.

Your task is to analyze a given waste image and generate a complete, structured analysis focusing on DIY and simple household reuse.

You MUST strictly follow all instructions and output formats below.
Do NOT hallucinate unknown materials.
If confidence is low, explicitly mention it.

------------------------------------
OBJECTIVE
------------------------------------
From the provided waste image, perform the following tasks:

1. Identify and classify the waste materials present
2. Estimate quantity
3. Suggest the BEST HOUSEHOLD/DIY conversion options (things regular people can make at home)
4. Evaluate feasibility and economic value
5. Generate prompts for AI-based product image generation
6. Provide environmental impact metrics
7. Prepare data suitable for vendor matching and pricing

------------------------------------
INPUT
------------------------------------
- One image containing waste material(s)
- The image may contain multiple waste items
- The waste may be partially damaged, mixed, or contaminated

------------------------------------
OUTPUT REQUIREMENTS
------------------------------------
Your output MUST be valid JSON.
Do NOT include markdown.
Do NOT include explanations outside JSON.
Use realistic values.
Use INR (₹) for prices.

------------------------------------
STEP 1: WASTE DETECTION & CLASSIFICATION
------------------------------------
Detect all visible waste items and classify them.

For each detected item include:
- material_type (plastic, metal, glass, paper, fabric, organic, e-waste, mixed)
- specific_object (e.g., PET bottle, aluminum can, cardboard box)
- confidence_score (0.0 – 1.0)

------------------------------------
STEP 2: QUALITY & CONDITION ANALYSIS
------------------------------------
For each item determine:
- cleanliness_level (clean / moderately_dirty / heavily_contaminated)
- damage_level (intact / partially_damaged / broken)
- reusability_score (0.0 – 1.0)
- contamination_risk (low / medium / high)

------------------------------------
STEP 3: QUANTITY ESTIMATION
------------------------------------
Estimate:
- count (if discrete items)
- approximate_weight_kg
- volume_estimate_liters

Use conservative estimates if unsure.

------------------------------------
STEP 4: CONVERSION OPTIONS (HOUSEHOLD FOCUS)
------------------------------------
For each waste type, suggest creative UPICYCLING/REUSE ideas for a regular Indian home.

Each option must include:
- product_name (e.g., "Self-Watering Planter", "Organizer Box", "Bird Feeder")
- conversion_type (DIY / simple_craft / decorative)
- required_processing (e.g., "Cut top", "Paint", "Add soil")
- difficulty_level (easy / medium)
- estimated_conversion_cost_inr
- estimated_market_value_inr
- expected_profit_or_loss_inr

------------------------------------
STEP 5: FEASIBILITY SCORING
------------------------------------
For each conversion option calculate a feasibility score:

feasibility_score =
(0.4 × material_suitability)
+ (0.3 × cost_efficiency)
+ (0.2 × vendor_availability)
+ (0.1 × market_demand)

Return the score between 0 and 1.

------------------------------------
STEP 6: BEST RECOMMENDED OPTION
------------------------------------
Select ONE best option overall and explain why using:
- technical feasibility
- economic value
- environmental benefit

------------------------------------
STEP 7: IMAGE GENERATION PROMPTS
------------------------------------
For the best recommended option, generate TWO prompts:

1. product_visual_prompt:
   - Highly detailed
   - Photorealistic
   - Suitable for Stable Diffusion / Imagen
   - Must describe material transformation clearly

2. before_after_prompt:
   - Split-view description
   - Left: original waste
   - Right: final product

------------------------------------
STEP 8: ENVIRONMENTAL IMPACT
------------------------------------
Estimate:
- CO2_saved_kg
- landfill_diverted_kg
- energy_saved_kwh
- sustainability_score (0 – 100)

------------------------------------
STEP 9: PLATFORM-COMPATIBLE OUTPUT
------------------------------------
Structure final JSON exactly as follows:

{
  "waste_analysis": {
    "detected_items": [
      {
        "material_type": "string",
        "specific_object": "string",
        "confidence_score": number
      }
    ]
  },
  "quality_assessment": {...},
  "quantity_estimation": {...},
  "conversion_options": [...],
  "best_recommendation": {...},
  "image_generation": {...},
  "environmental_impact": {
    "sustainability_score": number,
    "CO2_saved_kg": number,
    "landfill_diverted_kg": number,
    "energy_saved_kwh": number
  },
  "overall_confidence": 0.0 – 1.0,
        You are an expert Recycling & Upcycling AI with a sophisticated Pricing Engine.
        Analyze the waste item in the image and suggest **3 practical, everyday useful** upcycling ideas.

        **CRITICAL PRICING & ANALYSIS LOGIC**:
        You must apply the following logic to generate data:

        1. **Material Analysis**:
           - Identify Material Group (Plastic, Textile, Wood, Metal, Glass).
           - Yield Factor ($Y$): Plastic(0.85), Textile(0.70), Wood(0.65), Metal(0.95), Glass(0.80).
           - Quality Grade ($Q$): Grade A (0.0 loss), Grade B (0.2 loss), Grade C (0.5 loss).
           - Usable Weight ($W_{final}$) = Input Weight * Yield Factor * (1 - Quality Loss).

        2. **Conversion Difficulty**:
           - Tier 1 (Easy): Cutting, Shredding. Multiplier ~1.0-1.2.
           - Tier 2 (Medium): Assembly, Sewing, Joinery. Multiplier ~1.5.
           - Tier 3 (Hard): Welding, Molding. Multiplier ~2.5.

        3. **Pricing Engine Formula (Estimation)**:
           - "base_manufacturing_cost": (Number) Calculated as: (Usable Weight * Material Rate) * Complexity Multiplier. This is the VENDOR'S PAYOUT.
        - "platform_fees_and_taxes": (Number) Calculated as 2% of Base Manufacturing Cost. (ECOCYCLE COMMISSION).
        - "customer_display_mfg_price": (Number) Base Manufacturing Cost + Platform Fees.
        - "logistics_cost": (Number) Flat rate Rs. 150 (if applicable).
           
        **OUTPUT JSON FORMAT**:
        {
            "waste_analysis": {
                "detected_items": [
                    {
                        "specific_object": "e.g., Denim Jeans",
                        "material_type": "Textile",
                        "condition": "Stained/Clean",
                        "quantity_found": 1
                    }
                ]
            },
            "environmental_impact": {
                "sustainability_score": 85,
                "co2_saved_kg": 2.5
            },
            "conversion_options": [
                {
                    "product_name": "Must be practical! (e.g., 'Denim Groceryote')",
                    "conversion_type": "DIY" | "Vendor Assisted" | "Hybrid",
                    "description": "Short description.",
                    "daily_use_case": "Explain usage (e.g., 'Replaces plastic bags for daily grocery runs').",
                    "required_processing": "e.g., 'Washing, Cutting patterns, Stitching'.",
                    "difficulty_level": "Easy" | "Medium" | "Hard",
                    
                    "materials_needed": {
                         "customer_can_provide": ["List items user likely has (e.g. Scissors, Old thread)"],
                         "vendor_can_provide": ["List professional supplies (e.g. Heavy Duty Zipper, Lining fabric)"]
                    },

                    "analysis_factors": {
                        "material_category": "Textile",
                        "yield_factor": 0.70,
                        "quality_grade": "B",
                        "complexity_tier": 2,
                        "input_weight_kg": 1.5,
                        "usable_weight_kg": 0.84
                    },

                    "cost_breakdown": {
                        "base_manufacturing_cost": 150,
                        "commission_and_taxes": 30,
                        "customer_display_mfg_price": 180,
                        "logistics_cost": 50
                    },

                    "estimated_market_value_inr": 450,
                    "expected_profit_or_loss_inr": 240,
                    "feasibility_score": 0.85
                }
            ]
        }
        
        **IMPORTANT**: 
        - DO NOT return markdown. Return ONLY pure JSON.
        - Be realistic with INR costs.
        - "product_name" MUST be a useful object, not just "art".
    `;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function analyzeWasteImage(base64Image) {
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
        try {
            // Remove header if present (e.g., "data:image/jpeg;base64,")
            const imageParts = [
                {
                    inlineData: {
                        data: base64Image.split(",")[1] || base64Image,
                        mimeType: "image/jpeg",
                    },
                },
            ];

            const result = await model.generateContent([SYSTEM_PROMPT, ...imageParts]);
            const response = await result.response;
            const text = response.text();

            // Robust JSON extraction: Find the first '{' and the last '}'
            const startIndex = text.indexOf('{');
            const endIndex = text.lastIndexOf('}');

            if (startIndex === -1 || endIndex === -1) {
                throw new Error("Invalid response format from AI");
            }

            const jsonString = text.substring(startIndex, endIndex + 1);
            return JSON.parse(jsonString);

        } catch (error) {
            console.error(`Gemini Analysis Error (Attempt ${attempt + 1}/${maxRetries}):`, error);

            // Handle both 429 (Too Many Requests) and 503 (Service Unavailable/Overloaded)
            if (error.message.includes("429") || error.status === 429 || error.message.includes("503") || error.status === 503) {
                attempt++;
                if (attempt < maxRetries) {
                    const waitTime = 2000 * Math.pow(2, attempt); // Exponential backoff: 4s, 8s, 16s
                    console.log(`Service overloaded or rate limit hit. Retrying in ${waitTime}ms...`);
                    await delay(waitTime);
                    continue;
                }
            }
            // For other errors, or if retries exhausted, throw
            if (attempt === maxRetries) {
                throw new Error("Service is currently experiencing high traffic. We tried multiple times but failed. Please try again in a minute.");
            }
            throw new Error("Failed to analyze image. Please try again.");
        }
    }
}
