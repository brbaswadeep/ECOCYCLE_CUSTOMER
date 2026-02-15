const { onCall } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const OpenAI = require("openai");

const openAiApiKey = defineSecret("OPENAI_API_KEY");

exports.generateIdeas = onCall({ secrets: [openAiApiKey] }, async (request) => {
    // Check if user is authenticated
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const nvidiaAnalysisText = request.data.text;
    if (!nvidiaAnalysisText) {
        throw new HttpsError('invalid-argument', 'The function must be called with an argument "text".');
    }

    const apiKey = openAiApiKey.value();
    const openai = new OpenAI({ apiKey: apiKey });

    const SYSTEM_PROMPT = `
You are an eco-assistant.
INPUT: "${nvidiaAnalysisText}"
TASK: Generate JSON with 3 upcycling ideas.

CONSTRAINTS:
1. JSON ONLY.
2. MAX 500 TOKENS.
3. CURRENCY: ₹ (INR).
4. Value: ₹100-₹300.

JSON STRUCTURE (Use these EXACT short keys):
{
  "item": { "mat": "material", "obj": "object", "conf": 0.9 },
  "est": { "wt": number_kg, "val": number_inr },
  "env": { "score": number_0_100 },
  "qual": { "clean": "condition", "dmg": "damage_level", "risk": "contamination" },
  "opts": [
    {
      "name": "Title",
      "type": "DIY",
      "desc": "Summary (Max 5 words)",
      "steps": ["Step1", "Step2", "Step3"],
      "diff": "Easy",
      "cost": { "mat": number, "sell": number, "pay": number }
    }
  ],
  "rec": { "opt": "Best Option Name", "why": "Reason (Max 5 words)" }
}
`;

    try {
        const completion = await openai.chat.completions.create({
            messages: [
                { role: "system", content: SYSTEM_PROMPT }
            ],
            model: "gpt-3.5-turbo",
            response_format: { type: "json_object" },
            max_tokens: 500,
        });

        const responseContent = completion.choices[0].message.content;
        const mini = JSON.parse(responseContent);

        // Return the processed structure directly to frontend, or just the mini JSON
        // Mapping here to keep frontend logic consistent with backend response
        return {
            waste_analysis: {
                detected_items: [{
                    material_type: mini.item?.mat || "Unknown",
                    specific_object: mini.item?.obj || "Item",
                    confidence_score: mini.item?.conf || 0.9
                }]
            },
            quantity_estimation: {
                approximate_weight_kg: mini.est?.wt || 1,
                approximate_market_value: mini.est?.val || 0
            },
            environmental_impact: {
                sustainability_score: mini.env?.score || 50
            },
            quality_assessment: {
                cleanliness_level: mini.qual?.clean || "Average",
                damage_level: mini.qual?.dmg || "None",
                contamination_risk: mini.qual?.risk || "Low"
            },
            conversion_options: mini.opts?.map(opt => ({
                product_name: opt.name,
                conversion_type: opt.type,
                description: opt.desc,
                step_by_step_instructions: opt.steps,
                difficulty_level: opt.diff,
                pricing_analysis: {
                    base_material_value_per_kg: opt.cost?.mat || 0,
                    final_selling_price: opt.cost?.sell || 0,
                    vendor_payout: opt.cost?.pay || 0,
                    vendor_gross_value: opt.cost?.sell || 0
                }
            })) || [],
            best_recommendation: {
                recommended_option: mini.rec?.opt || "",
                reasoning: mini.rec?.why || ""
            }
        };

    } catch (error) {
        console.error("OpenAI Analysis Error:", error);
        throw new HttpsError('internal', 'Failed to generate ideas with OpenAI.', error);
    }
});
