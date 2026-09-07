import { GoogleGenerativeAI } from "@google/generative-ai";

// Helper to safely extract JSON from AI response strings
export function parseVisionJSON(rawText) {
    if (!rawText) return null;
    try {
        const cleanText = rawText.replace(/```json/gi, '').replace(/```/gi, '').trim();
        const start = cleanText.indexOf('{');
        const end = cleanText.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end > start) {
            return JSON.parse(cleanText.substring(start, end + 1));
        }
    } catch (err) {
        console.warn("Vision JSON parse warning:", err);
    }
    return null;
}

// Multimodal Gemini Vision Fallback (fast & high accuracy)
async function analyzeWithGeminiVision(base64Image, userDetails = {}) {
    const API_KEYS = [
        import.meta.env.VITE_GEMINI_API_KEY,
        import.meta.env.VITE_GEMINI_API_KEY_BACKUP_1,
        import.meta.env.VITE_GEMINI_API_KEY_BACKUP_2
    ].filter(Boolean);

    const userContextStr = [
        userDetails.description ? `User description: "${userDetails.description}"` : null,
        userDetails.materialCategory && userDetails.materialCategory !== 'Auto-Detect' ? `User hint for material: "${userDetails.materialCategory}"` : null,
        userDetails.condition ? `Condition: "${userDetails.condition}"` : null,
        userDetails.approxWeight ? `Weight: "${userDetails.approxWeight}"` : null,
    ].filter(Boolean).join("\n");

    const prompt = `Analyze this physical scrap or waste item for recycling and upcycling.
${userContextStr ? `USER CONTEXT:\n${userContextStr}\n` : ''}

CRITICAL SAFETY & HAZARDOUS ITEMS CHECK:
You MUST immediately reject and set "valid": false with "refusal_category": "Hazardous Material Prohibited" if the image depicts ANY hazardous items:
1. Medical / Clinical Waste: Syringes, needles, scalpels, sharps, blood bags, IV sets, expired medicines, pharmaceuticals, tablets, clinical hospital waste.
2. Explosives & Munitions: Bombs, dynamite, grenades, gunpowder, fireworks, firecrackers, ammunition, bullets, cartridges, military artillery.
3. Weapons & Firearms: Guns, pistols, rifles, firearm components.
4. Toxic Chemicals & Corrosives: Concentrated acids, poisons, pesticides, asbestos, radioactive materials.

VALIDATION:
Check if the image is safe, physical recyclable/scrap waste.
If NOT physical waste (e.g. human face, selfie, screen screenshot, living animal, food plate, empty room, completely dark/blurry) or if HAZARDOUS/UNSAFE, set "valid": false with "refusal_category" and "refusal_reason".

OUTPUT FORMAT (JSON ONLY):
Return ONLY a valid JSON object matching:
{
    "valid": true,
    "refusal_category": null,
    "refusal_reason": null,
    "detected_item": "Specific name (e.g. Aluminium Soda Can, Iron Pipe, Corrugated Cardboard Box, Plastic Bottle)",
    "primary_material": "One standard material: Plastic, Iron / Steel, Aluminium, Copper, Brass, Cardboard, Paper, Glass, E-Waste, Rubber, or Wood",
    "secondary_material": null,
    "cleanliness": "Clean and dry or Minor dust or Dirty",
    "estimated_weight_kg": 0.5,
    "confidence_score": 0.95,
    "analysis": "1-sentence summary"
}`;

    const dataOnly = base64Image.includes(",") ? base64Image.split(",")[1] : base64Image;

    for (const key of API_KEYS) {
        try {
            const genAI = new GoogleGenerativeAI(key);
            const model = genAI.getGenerativeModel({
                model: "gemini-2.5-flash",
                generationConfig: { temperature: 0.1, maxOutputTokens: 1024 }
            });

            const result = await model.generateContent([
                prompt,
                { inlineData: { data: dataOnly, mimeType: "image/jpeg" } }
            ]);
            const text = result.response.text();
            const parsed = parseVisionJSON(text);
            if (parsed) return parsed;
        } catch (keyErr) {
            console.warn("Gemini vision key attempt failed:", keyErr);
        }
    }
    return null;
}

export async function analyzeImageWithNvidia(base64Image, userDetails = {}) {
    // Ensure base64 string is formatted correctly for the API (data URI)
    const formattedImage = base64Image.startsWith("data:image")
        ? base64Image
        : `data:image/jpeg;base64,${base64Image}`;

    const {
        description = "",
        materialCategory = "",
        condition = "",
        approxWeight = ""
    } = userDetails;

    const userContextStr = [
        description ? `User stated contents: "${description}"` : null,
        materialCategory && materialCategory !== 'Auto-Detect' ? `User estimated material: "${materialCategory}"` : null,
        condition ? `User estimated condition: "${condition}"` : null,
        approxWeight ? `User estimated weight: "${approxWeight}"` : null,
    ].filter(Boolean).join("\n");

    const promptText = `Analyze this image strictly as an industrial waste & recycling AI vision model.

${userContextStr ? `USER-PROVIDED INFORMATION ABOUT THIS ITEM:\n${userContextStr}\n` : ''}

1. CRITICAL SAFETY & HAZARDOUS MATERIAL RESTRICTION:
Check if the image falls into any of these RESTRICTED or HAZARDOUS categories:
- HAZARDOUS / MEDICAL WASTE: Syringes, needles, medical sharps, blood bags, IV tubing, pharmaceuticals, medicines, hospital waste. (STRICTLY PROHIBITED)
- EXPLOSIVES & MUNITIONS: Bombs, grenades, dynamite, fireworks, firecrackers, ammunition, bullets, cartridges, gunpowder. (STRICTLY PROHIBITED)
- WEAPONS: Guns, firearms, weapon parts. (STRICTLY PROHIBITED)
- TOXIC / CHEMICAL: Strong acids, poisons, pesticides, asbestos, radioactive materials. (STRICTLY PROHIBITED)
- No Waste Present: Selfies, Group photos, Pets, Landscapes, Food plates, App screenshots, Blank images.
- Non-Physical Content: Text-only images, Memes, Social media screenshots, Digital artwork, Documents.
- Highly Blurry / Unreadable: Completely dark, Overexposed, Extreme motion blur, Camera covered.
- Non-Recyclable Uploads: Human body parts, Animals, Running vehicles, Buildings, Clouds.

2. RESPONSE FORMAT (JSON ONLY):
You MUST return ONLY a valid JSON object strictly matching this schema:
{
    "valid": boolean,
    "refusal_category": string or null,
    "refusal_reason": string or null,
    "detected_item": string,
    "primary_material": string,
    "secondary_material": string or null,
    "cleanliness": string,
    "estimated_weight_kg": number,
    "confidence_score": number,
    "analysis": string
}

If the image is VALID safe scrap/waste, set "valid": true and identify accurately.
If the image is HAZARDOUS or RESTRICTED, set "valid": false, specify "refusal_category" (e.g. "Hazardous Material Prohibited", "Explosives Prohibited", "Medical Waste Prohibited", "Non-Waste Image"), and explain clearly in "refusal_reason".`;

    const apiUrl = '/api/nvidia';

    try {
        const response = await fetch(
            apiUrl,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: "meta/llama-3.2-11b-vision-instruct",
                    messages: [
                        {
                            role: "system",
                            content: "You are a professional industrial scrap and waste recycling AI vision system. You MUST respond with ONLY a single raw JSON object, starting with { and ending with }. Do not write any conversational text or markdown explanation."
                        },
                        {
                            role: "user",
                            content: [
                                {
                                    type: "text",
                                    text: promptText
                                },
                                {
                                    type: "image_url",
                                    image_url: {
                                        url: formattedImage
                                    }
                                }
                            ]
                        }
                    ],
                    max_tokens: 600,
                    temperature: 0.1,
                    top_p: 0.7
                })
            }
        );

        if (response.ok) {
            const data = await response.json();
            const rawContent = data?.choices?.[0]?.message?.content;
            const parsed = parseVisionJSON(rawContent);
            if (parsed) return parsed;
        }
    } catch (nvidiaErr) {
        console.warn("NVIDIA Vision primary attempt failed, trying Gemini fallback:", nvidiaErr);
    }

    // High accuracy multimodal fallback
    const fallbackParsed = await analyzeWithGeminiVision(base64Image, userDetails);
    if (fallbackParsed) {
        return fallbackParsed;
    }

    // If both failed, throw descriptive error so user can re-try
    throw new Error("Unable to analyze image clearly. Please ensure good lighting and clear scrap focus.");
}

