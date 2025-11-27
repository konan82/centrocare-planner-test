import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "key.env") });

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_API_KEY
});

async function listModels() {
    try {
        const response = await ai.models.list();
        console.log("Available models:");
        // The SDK structure for list might vary, let's try to log the whole response or iterate
        if (response.models) {
            response.models.forEach(m => {
                console.log(`- ${m.name} (Supported methods: ${m.supportedGenerationMethods})`);
            });
        } else {
            console.log(JSON.stringify(response, null, 2));
        }
    } catch (error) {
        console.error("Error listing models:", error);
    }
}

listModels();
