import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = "AIzaSyALQLgq_1yoxpL2iExCM17uKTi8P8JGaO4";
const genAI = new GoogleGenerativeAI(API_KEY);

async function run() {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-001" });
    try {
        const result = await model.generateContent("Hello, are you working?");
        const response = await result.response;
        console.log(response.text());
    } catch (error) {
        console.error("Error:", error);
    }
}

run();
