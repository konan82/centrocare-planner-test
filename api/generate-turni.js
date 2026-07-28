import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { tutors, youths, startDate } = req.body;

    if (!tutors || !youths || !startDate) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const prompt = { tutors, youths, startDate };

    const fullPrompt = `
      Sei un assistente per la pianificazione dei turni in un centro educativo.
      
      DATI DI INPUT (JSON):
      ${JSON.stringify(prompt)}
      
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
      contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
      config: { responseMimeType: "application/json" },
    });

    let text;
    if (typeof response.text === "function") {
      text = await response.text();
    } else if (response.candidates && response.candidates.length > 0) {
      text = response.candidates[0].content.parts[0].text;
    } else {
      throw new Error("Unexpected response format from AI");
    }

    let cleanText = text.trim();
    if (cleanText.startsWith("```json")) {
      cleanText = cleanText.replace(/^```json/, "").replace(/```$/, "");
    }

    const data = JSON.parse(cleanText);
    return res.status(200).json({ data });
  } catch (error) {
    console.error("Error in generate-turni:", error);
    return res.status(500).json({ error: error.message });
  }
}
