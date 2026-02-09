import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_NVIDIA_API_KEY;

export async function analyzeImageWithNvidia(base64Image) {
    if (!API_KEY) {
        throw new Error("NVIDIA API Key is missing. Please check .env file.");
    }

    // Ensure base64 string is formatted correctly for the API (data URI)
    const formattedImage = base64Image.startsWith("data:image")
        ? base64Image
        : `data:image/jpeg;base64,${base64Image}`;

    // Determine API URL based on environment
    // Dev: Use Vite proxy (/api/nvidia)
    // Prod: Use CORS Proxy + Direct URL
    const isProd = import.meta.env.PROD;
    const directUrl = 'https://integrate.api.nvidia.com/v1/chat/completions';
    const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(directUrl);

    const apiUrl = isProd ? proxyUrl : '/api/nvidia/v1/chat/completions';

    try {
        const response = await fetch(
            apiUrl,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
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
