import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { tutors, shifts } = req.body;

    if (!tutors || !shifts) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const prompt = { tutors, shifts };

    const fullPrompt = `
      Analizza la seguente pianificazione turni per trovare conflitti o problemi.
      
      DATI (JSON):
      ${JSON.stringify(prompt)}
      
      CONTROLLA:
      1. Tutor assegnati a più ragazzi contemporaneamente (sovrapposizione orari).
      2. Tutor che lavorano in giorni in cui non sono disponibili.
      3. Rispetto delle ore massime dei tutor.
      
      OUTPUT:
      Rispondi con un breve report testuale in italiano che elenca i problemi trovati. Usa elenchi puntati. Se è tutto ok, dillo.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-09-2025",
      contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
    });

    let text;
    if (typeof response.text === "function") {
      text = await response.text();
    } else if (response.candidates && response.candidates.length > 0) {
      text = response.candidates[0].content.parts[0].text;
    } else {
      text = "Nessuna risposta generata.";
    }

    return res.status(200).json({ text });
  } catch (error) {
    console.error("Error in analyze-conflicts:", error);
    return res.status(500).json({ error: error.message });
  }
}
