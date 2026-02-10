import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY; // User provided key
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  generationConfig: {
    maxOutputTokens: 8192,
    temperature: 0.7,
  }
});

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
3. Suggest EXACTLY 3 HOUSEHOLD/DIY conversion options (things regular people can make at home)
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
MAX TOKENS PER REQUEST: 300 (Be extremely concise).

------------------------------------
STEP 1: WASTE DETECTION & CLASSIFICATION
------------------------------------
Detect all visible waste items and classify them.

For each detected item include:
- material_type (MUST be ONE word only: plastic, metal, glass, paper, fabric, organic, e-waste, mixed)
- specific_object (e.g., Bottle, Can, Box) - Keep it short.
- confidence_score (0.0 – 1.0)

------------------------------------
STEP 2: QUALITY & CONDITION ANALYSIS
------------------------------------
For each item determine:
- cleanliness_level (clean / moderately_dirty / heavily_contaminated)
- damage_level (intact / partially_damaged / broken)
- contamination_risk (low / medium / high)

------------------------------------
STEP 3: QUANTITY ESTIMATION
------------------------------------
Estimate:
- approximate_weight_kg (Number only)

Use conservative estimates if unsure.

------------------------------------
STEP 4: CONVERSION OPTIONS (HOUSEHOLD FOCUS)
------------------------------------
For each waste type, suggest EXACTLY 3 creative UPICYCLING/REUSE ideas for a regular Indian home.
*** ABSOLUTE RULE: VALUE ₹100 - ₹400 ***
- You MUST NOT suggest any idea worth less than ₹100 or more than ₹400.
- Ideas must be "Product Level" quality.

Each option must include:
- product_name (e.g., "Self-Watering Planter") - Title should be perfect.
- conversion_type (DIY / simple_craft / decorative)
- description (3-4 lines ONLY. Simple language. Clearly depict what to make.)
- required_processing (e.g., "Cut top, Paint")
- difficulty_level (easy / medium)
- estimated_conversion_cost_inr
- estimated_market_value_inr

------------------------------------
STEP 6: BEST RECOMMENDED OPTION
------------------------------------
Select ONE best option overall and explain why using:
- reasoning (Short sentence)

------------------------------------
STEP 7: IMAGE GENERATION PROMPTS
------------------------------------
For the best recommended option, generate TWO prompts:
1. product_visual_prompt (Concise)
2. before_after_prompt (Concise)

------------------------------------
STEP 8: ENVIRONMENTAL IMPACT
------------------------------------
Estimate:
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
  "quality_assessment": {
        "cleanliness_level": "string",
        "damage_level": "string",
        "contamination_risk": "string"
  },
  "quantity_estimation": {
        "approximate_weight_kg": number
  },
  "conversion_options": [
    {
        "product_name": "string",
        "conversion_type": "string",
        "description": "string",
        "required_processing": "string",
        "difficulty_level": "string",
        "estimated_conversion_cost_inr": number,
        "estimated_market_value_inr": number
    }
  ],
  "best_recommendation": {
        "recommended_option": "string",
        "reasoning": "string"
  },
  "image_generation": {...},
  "environmental_impact": {
    "sustainability_score": number
  },
  "overall_confidence": 0.0 – 1.0,

        You are an expert Recycling & Upcycling AI.
        
        Analyze the waste item in the image.
        
        **TASK 1: SCRAP VALUATION (SELLING MODE)**
        If the item falls into "Metal & Scrap" or "Other Recyclable Waste", you MUST estimate its **Sell Value** using the rate card below.
        
        **RATE CARD (Use LOWEST price in range):**
        *🧱 Metal & Scrap:* Iron(₹26), Steel(₹35), Stainless(₹85), Copper(₹425), Brass(₹305), Alum(₹105), Lead(₹150), Zinc(₹100), Tin(₹20), Motor(₹35), Fan(₹35).
        *🗑️ Other Recyclable:* Plastic(₹10), Newspaper(₹13), Books(₹10), Paper(₹12), Cardboard(₹5), E-Waste(₹50), Battery(₹72), Rubber(₹10), Wood(₹17).
        
        **TASK 2: UPCYCLING IDEAS (REUSE MODE)**
        Suggest **EXACTLY 3** practical, everyday useful upcycling ideas.
        
        **CRITICAL INSTRUCTION**:
        - Combine waste with 2-3 items to create a finished product worth ₹100-₹400.
        - Description: 3-4 lines, simple language, perfect title.
        
        **OUTPUT JSON FORMAT**:
        {
            "waste_analysis": {
                "detected_items": [
                    {
                        "specific_object": "Old Iron Pipe",
                        "material_type": "Iron", 
                        "confidence_score": 0.95
                    }
                ]
            },
            "quantity_estimation": {
                "approximate_weight_kg": 2.5,
                "approximate_market_value": 62.5
            },
            "environmental_impact": {
                "sustainability_score": 85
            },
             "quality_assessment": {
                "cleanliness_level": "Clean",
                "damage_level": "Intact",
                "contamination_risk": "Low"
             },
            "conversion_options": [
                {
                    "product_name": "Industrial Curtain Rod",
                    "conversion_type": "DIY",
                    "description": "A robust industrial-style curtain rod that adds rustic charm.",
                    "step_by_step_instructions": [
                        "Clean the iron pipe thoroughly to remove rust.",
                        "Apply a coat of anti-rust paint.",
                        "Mount using standard wall brackets."
                    ],
                    "difficulty_level": "Easy",
                    "estimated_market_value_inr": 450
                },
                { ... },
                { ... }
            ],
            "best_recommendation": {
                "recommended_option": "Industrial Curtain Rod",
                "reasoning": "High durability and aesthetic value."
            }
        }
        
        **IMPORTANT**: 
        - DO NOT return markdown. Return ONLY pure JSON.
        - KEEP IT CONCISE.
        - "approximate_market_value" MUST be filled if the item matches the rate card. If not, set to 0.
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
      console.log("RAW GEMINI RESPONSE:", text);

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

export async function generateIdeasFromText(nvidiaAnalysisText) {
  const maxRetries = 3;
  let attempt = 0;

  const TEXT_SYSTEM_PROMPT = `
You are a creative eco-friendly assistant.
INPUT: Visual description of a waste item.
TASK: Generate structured JSON with upcycling ideas & PRECISE PRICING.

INPUT ANALYSIS:
"${nvidiaAnalysisText}"

STRICT CONSTRAINTS:
1. OUTPUT: Valid JSON ONLY. No Markdown.
2. LENGTH: MAX 500 TOKENS total.
3. CURRENCY: INR (₹).
4. QUANTITY: EXACTLY 3 IDEAS.

CONVERSION OPTIONS (Exact 3 ideas):
- Value: ₹100 - ₹300 (STRICT).
- Product Name: Perfect title.
- Description: Perfect short summary (2-3 lines).
- Step-by-Step Instructions: Array of 3-4 short, precise steps.

CALCULATIONS:
- Vendor_Gross_Value = BMV * Weight_kg * QF * EF * PVM
- Max_Allowed_Price = New_Product_Price * 0.8 (20% Green Discount)
- Final_Selling_Price = MIN(Vendor_Gross_Value, Max_Allowed_Price)
- Vendor_Payout = Final_Selling_Price * 0.85 (15% Commission)

JSON STRUCTURE:
{
  "waste_analysis": {
    "detected_items": [{ "material_type": "string", "specific_object": "string", "confidence_score": 0.9 }]
  },
  "quantity_estimation": { "approximate_weight_kg": number },
  "environmental_impact": { "sustainability_score": number },
  "quality_assessment": { "cleanliness_level": "string", "damage_level": "string", "contamination_risk": "string" },
  "conversion_options": [
    {
      "product_name": "string",
      "conversion_type": "DIY",
      "description": "string",
      "step_by_step_instructions": ["Step 1", "Step 2", "Step 3"],
      "difficulty_level": "Easy",
      "pricing_analysis": {
        "base_material_value_per_kg": number,
        "quality_factor": number,
        "effort_factor": number,
        "product_value_multiplier": number,
        "vendor_gross_value": number,
        "final_selling_price": number,
        "vendor_payout": number
      }
    }
  ],
  "best_recommendation": { "recommended_option": "string", "reasoning": "string" }
}
`;

  while (attempt < maxRetries) {
    try {
      const result = await model.generateContent(TEXT_SYSTEM_PROMPT);
      const response = await result.response;
      const text = response.text();
      console.log("RAW GEMINI RESPONSE (Text-to-JSON):", text);

      const startIndex = text.indexOf('{');
      const endIndex = text.lastIndexOf('}');
      if (startIndex === -1 || endIndex === -1) throw new Error("Invalid response format");

      return JSON.parse(text.substring(startIndex, endIndex + 1));
    } catch (error) {
      console.error(`Gemini Text Analysis Error (Attempt ${attempt + 1})`, error);
      if (error.message.includes("429") || error.message.includes("503")) {
        attempt++;
        if (attempt < maxRetries) {
          await delay(2000 * Math.pow(2, attempt));
          continue;
        }
      }
      throw error;
    }
  }
}

export async function chatWithEcoBot(userMessage, chatHistory = []) {
  try {
    // Construct conversation history for context
    const historyPrompt = chatHistory.map(msg =>
      `${msg.isUser ? 'User' : 'EcoBot'}: ${msg.text}`
    ).join('\n');

    const prompt = `
      You are **EcoBot**, the exclusive AI assistant for the **EcoCycle** platform.
      
      **STRICT SCOPE ENFORCEMENT:**
      You must ONLY answer questions related to:
      1. **The EcoCycle Platform**:
         - **Smart Scan**: Taking photos of waste to identify materials and estimate value.
         - **Shop**: Buying upcycled/eco-friendly products.
         - **Vendor Connection**: Selling recyclable waste to local vendors.
         - **Dashboard/History**: Tracking user activity and credits.
      2. **Waste Management**: Recycling rules (specifically for India), upcycling ideas, waste segregation, and composting.
      3. **Sustainability**: Basic environmental impact of waste.

      **REFUSAL PROTOCOL:**
      If the user asks about **ANYTHING** else (e.g., general knowledge, coding, politics, math, entertainment, writing emails, etc.), you MUST strictly but politely refuse.
      - **Standard Refusal**: "I specialize only in EcoCycle and waste management. Please ask me about Smart Scan, recycling tips, or using the app."
      - Do NOT try to be helpful with off-topic request.

      **TONE & STYLE:**
      - Concise (max 2-3 sentences).
      - Encouraging and Green.
      - Use emojis occasionally (🌿, ♻️, ✅).

      **Conversation History:**
      ${historyPrompt}

      **User**: ${userMessage}
      **EcoBot**:
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("EcoBot Chat Error:", error);
    return "I'm having trouble connecting right now. Please try again or talk to our support team.";
  }
}