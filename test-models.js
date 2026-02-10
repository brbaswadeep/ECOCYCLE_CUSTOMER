
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
