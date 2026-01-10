import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = "AIzaSyA88GbEF31qoq4aOjK-ZOaJVl8JFAEHBbY";
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
