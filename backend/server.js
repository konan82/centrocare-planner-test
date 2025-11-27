import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";
import path from "path";
import { fileURLToPath } from "url";
import routes from "./routes.js";

// Load key.env specifically
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "key.env") });

const app = express();

// CORS configuration - accept production frontend or localhost
const allowedOrigin = process.env.CORS_ORIGIN || "http://localhost:3000";
app.use(cors({ origin: allowedOrigin, credentials: true }));
app.use(bodyParser.json());

// Wire API routes
app.use('/api', routes);

// --- FIX QUI ---
// Costruttore corretto per GoogleGenAI
const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY
});
// ----------------

app.post("/generate-turni", async (req, res) => {
  try {
    const { prompt } = req.body;

    // Add instructions to the raw data
    const fullPrompt = `
      Sei un assistente per la pianificazione dei turni in un centro educativo.
      
      DATI DI INPUT (JSON):
      ${prompt}
      
      OBIETTIVO:
      Genera una pianificazione settimanale ottimizzata assegnando i ragazzi ai tutor.
      
      REGOLE:
      1. Rispetta le disponibilità dei tutor (unavailableDays: 0=Domenica, 1=Lunedì, ecc).
      2. Non superare le ore massime dei tutor.
      3. Cerca di coprire le ore richieste dai ragazzi.
      4. I turni devono essere tra le 14:00 e le 19:00.
      5. Durata turno tipica: 1-2 ore.
      
      OUTPUT RICHIESTO:
      Restituisci SOLAMENTE un array JSON valido di oggetti turno. Non aggiungere markdown o altro testo.
      Formato oggetto turno:
      {
        "tutorId": "id_tutor",
        "youthId": "id_ragazzo",
        "date": "YYYY-MM-DD",
        "startTime": "HH:MM",
        "endTime": "HH:MM",
        "activity": "Attività proposta"
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-09-2025",
      contents: [
        {
          role: "user",
          parts: [{ text: fullPrompt }]
        }
      ],
      config: {
        responseMimeType: "application/json"
      }
    });

    console.log("AI Response keys:", Object.keys(response));

    // Handle response based on SDK version
    let text;
    if (typeof response.text === 'function') {
      text = await response.text();
    } else if (response.candidates && response.candidates.length > 0) {
      // Fallback for different response structure
      text = response.candidates[0].content.parts[0].text;
    } else {
      throw new Error("Unexpected response format from AI");
    }
    // Ensure we parse the JSON correctly even if wrapped in markdown code blocks (though responseMimeType should handle it)
    let cleanText = text.trim();
    if (cleanText.startsWith("```json")) {
      cleanText = cleanText.replace(/^```json/, "").replace(/```$/, "");
    }

    const data = JSON.parse(cleanText);

    res.json({ data });
  } catch (error) {
    console.error("Errore backend generate-turni:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/analyze-conflicts", async (req, res) => {
  try {
    const { prompt } = req.body;

    const fullPrompt = `
      Analizza la seguente pianificazione turni per trovare conflitti o problemi.
      
      DATI (JSON):
      ${prompt}
      
      CONTROLLA:
      1. Tutor assegnati a più ragazzi contemporaneamente (sovrapposizione orari).
      2. Tutor che lavorano in giorni in cui non sono disponibili.
      3. Rispetto delle ore massime dei tutor.
      
      OUTPUT:
      Rispondi con un breve report testuale in italiano che elenca i problemi trovati. Usa elenchi puntati. Se è tutto ok, dillo.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-09-2025",
      contents: [
        {
          role: "user",
          parts: [{ text: fullPrompt }]
        }
      ]
    });

    let text;
    if (typeof response.text === 'function') {
      text = await response.text();
    } else if (response.candidates && response.candidates.length > 0) {
      text = response.candidates[0].content.parts[0].text;
    } else {
      text = "Nessuna risposta generata.";
    }

    res.json({ text });
  } catch (error) {
    console.error("Errore backend analyze-conflicts:", error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () =>
  console.log(`Backend running on port ${PORT}`)
);

console.log("Loaded Google API key:", process.env.GOOGLE_API_KEY ? "YES" : "NO");
