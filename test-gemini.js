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
