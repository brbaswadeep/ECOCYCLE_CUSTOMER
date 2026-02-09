import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = "AIzaSyC7D6oj9_6DMOgDFmc1TRok9lGUWsUitBg";
const genAI = new GoogleGenerativeAI(API_KEY);

async function run() {
    const models = ["gemini-1.5-pro", "gemini-1.5-flash-8b", "gemini-1.0-pro"];
    for (const modelName of models) {
        console.log("Testing " + modelName);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Hello?");
            console.log("SUCCESS: " + modelName);
            return;
        } catch (e) {
            console.log("FAILED " + modelName + ": " + e.message.split('[')[0]);
        }
    }
}

run();
