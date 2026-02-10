
import { GoogleGenerativeAI } from "@google/generative-ai";

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getEnvVar(key) {
    try {
        const envPath = path.resolve(__dirname, '.env');
        const envFile = fs.readFileSync(envPath, 'utf8');
        const match = envFile.match(new RegExp(`^${key}=(.*)$`, 'm'));
        return match ? match[1].trim() : null;
    } catch (e) {
        console.error("Error reading .env file:", e);
        return null;
    }
}

const API_KEY = getEnvVar('VITE_GEMINI_API_KEY');

if (!API_KEY) {
    console.error("Error: VITE_GEMINI_API_KEY not found in .env file");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
        maxOutputTokens: 2000,
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
                    "description": "Transform this old iron pipe into a robust industrial-style curtain rod. Clean it thoroughly and mount it using simple wall brackets. It adds a rustic charm to your living room while being extremely durable.",
                    "required_processing": "Cleaning, Painting",
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

// Small red dot jpeg base64
const DUMMY_IMAGE = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIMFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD9/KKKKAP/2Q==";

async function run() {
    try {
        console.log("Analyzing image...");
        const imageParts = [{
            inlineData: {
                data: DUMMY_IMAGE.split(",")[1],
                mimeType: "image/jpeg",
            },
        }];

        const result = await model.generateContent([SYSTEM_PROMPT, ...imageParts]);
        const response = await result.response;
        // Text might be missing or blocked
        try {
            const text = response.text();
            console.log("RAW RESPONSE START ----------------");
            console.log(text);
            console.log("RAW RESPONSE END ------------------");

            // Robust JSON extraction
            const startIndex = text.indexOf('{');
            const endIndex = text.lastIndexOf('}');
            if (startIndex === -1 || endIndex === -1) {
                console.error("FAILED TO FIND JSON BRACKETS");
            } else {
                const jsonString = text.substring(startIndex, endIndex + 1);
                // JSON.parse might fail if there are comments or trailing commas
                const data = JSON.parse(jsonString);
                console.log("SUCCESSFULLY PARSED JSON");
            }

        } catch (e) {
            console.log("Could not get text() from response. Check for safety blocks.");
            console.log(JSON.stringify(result, null, 2));
        }

    } catch (e) {
        console.error("ERROR:", e);
    }
}

run();
