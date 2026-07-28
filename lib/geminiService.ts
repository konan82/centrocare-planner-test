import { GoogleGenAI } from "@google/genai";
import { Tutor, Youth, Shift } from "../types";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

export const generateSmartSchedule = async (
  tutors: Tutor[],
  youths: Youth[],
  startDate: string
): Promise<Shift[]> => {
  const fullPrompt = `
    Sei un assistente per la pianificazione dei turni in un centro educativo.
    
    DATI DI INPUT (JSON):
    ${JSON.stringify({ tutors, youths, startDate })}
    
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

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-09-2025",
      contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
      config: { responseMimeType: "application/json" },
    });

    let text: string;
    if (typeof response.text === "function") {
      text = await response.text();
    } else if ((response as any).candidates && (response as any).candidates.length > 0) {
      text = (response as any).candidates[0].content.parts[0].text;
    } else {
      throw new Error("Unexpected response format from AI");
    }

    let cleanText = text.trim();
    if (cleanText.startsWith("```json")) {
      cleanText = cleanText.replace(/^```json/, "").replace(/```$/, "");
    }

    const data = JSON.parse(cleanText);
    if (!Array.isArray(data)) return [];

    return data.map((s: any) => ({
      ...s,
      id: Math.random().toString(36).slice(2, 11),
    }));
  } catch (error) {
    console.error("Errore generazione turni:", error);
    return [];
  }
};

export const analyzeConflicts = async (
  tutors: Tutor[],
  shifts: Shift[]
): Promise<string> => {
  const fullPrompt = `
    Analizza la seguente pianificazione turni per trovare conflitti o problemi.
    
    DATI (JSON):
    ${JSON.stringify({ tutors, shifts })}
    
    CONTROLLA:
    1. Tutor assegnati a più ragazzi contemporaneamente (sovrapposizione orari).
    2. Tutor che lavorano in giorni in cui non sono disponibili.
    3. Rispetto delle ore massime dei tutor.
    
    OUTPUT:
    Rispondi con un breve report testuale in italiano che elenca i problemi trovati. Usa elenchi puntati. Se è tutto ok, dillo.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-09-2025",
      contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
    });

    let text: string;
    if (typeof response.text === "function") {
      text = await response.text();
    } else if ((response as any).candidates && (response as any).candidates.length > 0) {
      text = (response as any).candidates[0].content.parts[0].text;
    } else {
      text = "Nessuna risposta generata.";
    }

    return text;
  } catch (error) {
    console.error("Errore analisi conflitti:", error);
    return "Errore durante l'analisi.";
  }
};
