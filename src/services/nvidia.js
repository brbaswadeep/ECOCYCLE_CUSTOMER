import { GoogleGenerativeAI } from "@google/generative-ai";

export async function analyzeImageWithNvidia(base64Image) {
    // API Key is now handled by the backend/proxy (Vite or Cloudflare)

    // Ensure base64 string is formatted correctly for the API (data URI)
    const formattedImage = base64Image.startsWith("data:image")
        ? base64Image
        : `data:image/jpeg;base64,${base64Image}`;

    // Determine API URL based on environment
    // Dev: Use Vite proxy (/api/nvidia)
    // Prod: Use CORS Proxy + Direct URL
    // Use the same endpoint for both dev (Vite proxy) and prod (Cloudflare Function)
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
                            role: "user",
                            content: [
                                {
                                    type: "text",
                                    text: `Analyze this image strictly. 
                                    
                                    1. VALIDATION CHECK:
                                    Check if the image falls into any of these RESTRICTED categories:
                                    - No Waste Present: Selfies, Group photos, Pets, Landscapes, Food plates, App screenshots, Blank images.
                                    - Non-Physical Content: Text-only images, Memes, Social media screenshots, Digital artwork, Documents.
                                    - Unsafe / Harmful: Weapons, Illegal substances, Explicit content, Graphic violence.
                                    - Highly Blurry / Unreadable: Completely dark, Overexposed, Extreme motion blur, Camera covered.
                                    - Non-Recyclable Uploads: Human body parts, Animals, Running vehicles, Buildings, Clouds.

                                    2. RESPONSE FORMAT (JSON ONLY):
                                    You MUST return a valid JSON object with the following structure:
                                    {
                                        "valid": boolean, // true if it is a physical waste item, false if restricted
                                        "refusal_category": "string OR null", // e.g., "No Waste Present", "Unsafe", "Blurry", "Non-Physical"
                                        "refusal_reason": "string OR null", // brief explanation if valid is false
                                        "analysis": "string OR null" // If valid is true: Identify item, material, condition, and estimate weight.
                                    }
                                    
                                    If the image is VALID waste, set "valid": true and provide the "analysis".
                                    If the image is RESTRICTED, set "valid": false, identify the "refusal_category", and provide a "refusal_reason".
                                    `
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
                    max_tokens: 500,
                    temperature: 0.2, // Low temperature for more deterministic JSON
                    top_p: 0.7
                })
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`NVIDIA API Error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;

    } catch (error) {
        console.error("NVIDIA Analysis Failed:", error);
        throw error;
    }
}
