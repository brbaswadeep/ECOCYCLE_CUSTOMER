
import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = "AIzaSyCZoBHkwVFM1gcX5xVd_Dukk73AgGh_Qm4";
const genAI = new GoogleGenerativeAI(API_KEY);

async function listModels() {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Placeholder
        // The SDK doesn't have a direct listModels method on the instance easily accessible in this version usually, 
        // but the error message suggested it. 
        // Actually, checking standard docs, it's often a separate call or not in the high-level helper.
        // Let's try to just test "gemini-1.5-flash-001" or "gemini-pro-vision".

        console.log("Testing gemini-1.5-flash-latest...");
        try {
            const modelLatest = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
            const result = await modelLatest.generateContent("Hello");
            console.log("gemini-1.5-flash-latest IS VALID");
        } catch (e) {
            console.log("gemini-1.5-flash-latest FAILED: " + e.message);
        }

        console.log("Testing gemini-pro-vision...");
        try {
            const modelPro = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
            // gemini-pro-vision needs images usually, but let's see constructor.
            console.log("gemini-pro-vision Constructor ok");
        } catch (e) {
            console.log("gemini-pro-vision FAILED");
        }

    } catch (e) {
        console.error("Error:", e);
    }
}

listModels();
