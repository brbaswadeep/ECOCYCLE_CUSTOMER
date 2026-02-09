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
                                    text: "Analyze this waste image. Identify the item, material type, condition (clean/dirty/damaged), and estimate the weight. Be concise."
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
                    temperature: 0.2,
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
