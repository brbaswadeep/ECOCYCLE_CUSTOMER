
import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = "AIzaSyCZoBHkwVFM1gcX5xVd_Dukk73AgGh_Qm4";
const genAI = new GoogleGenerativeAI(API_KEY);

const MODELS_TO_TEST = [
    "gemini-2.0-flash-exp",
    "gemini-1.5-flash",
    "gemini-1.5-flash-001",
    "gemini-pro-vision",
    "gemini-1.0-pro-vision-latest",
    "gemini-pro"
];

async function test() {
    for (const modelName of MODELS_TO_TEST) {
        console.log(`Testing ${modelName}...`);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const prompt = "Hello";
            // For vision models, we might need an image, but let's try text first or careful catch
            if (modelName.includes("vision")) {
                // Skip text-only test for vision, just instantiate
                console.log(`Skipping generation for ${modelName} (vision model), but instantiation worked.`);
                // Try checking if it throws on content generation with just text
                try { await model.generateContent("test"); } catch (e) {
                    if (e.message.includes("404")) { throw e; }
                    console.log(`  -> Response from ${modelName} (might be error but not 404):`, e.message.substring(0, 50));
                }
            } else {
                await model.generateContent(prompt);
                console.log(`SUCCESS: ${modelName} is working.`);
                // If one works, we could stop, but let's see which ones work
            }
        } catch (e) {
            console.log(`FAILED: ${modelName} - ${e.message.split('[')[0]}`);
            if (e.message.includes("404")) console.log("  -> 404 Not Found");
        }
    }
}

test();
