import { GoogleGenAI } from "@google/genai";
import { Tutor, Youth, Shift } from "../types";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

export const generateSmartSchedule = async (
  tutors: Tutor[],
  youths: Youth[],
  startDate: string
): Promise<Shift[]> => {
  const fullPrompt = `
    Sei un esperto di pianificazione turni per un centro educativo.
    
    DATI DI INPUT (JSON):
    ${JSON.stringify({ tutors, youths, startDate })}
    
    OBIETTIVO:
    Genera una pianificazione settimanale (lunedì-sabato) distribuendo i ragazzi su TUTTI i tutor disponibili.
    
    REGOLE FONDAMENTALI:
    1. DEVI usare TUTTI i tutor disponibili, distribuendo equamente i ragazzi tra di essi.
    2. Rispetta le unavailableDays di ogni tutor (0=Domenica, 1=Lunedì, ..., 6=Sabato).
    3. Ogni tutor NON deve superare le sue maxHoursPerWeek totali nella settimana.
    4. Prioritizza l'abbinamento tra le specialties del tutor e i needs del ragazzo quando possibile.
    5. I turni devono essere tra le 14:00 e le 19:00 (orario pomeriggio centro).
    6. Durata turno tipica: 1-2 ore per ragazzo.
    7. Ogni ragazzo deve ricevere le sue requiredHoursPerWeek totali nella settimana.
    8. Un tutor NON può avere turni sovrapposti (non può seguire 2 ragazzi nella stessa fascia oraria).
    9. Genera turni per ogni giorno lunedì-sabato della settimana a partire da startDate.
    10. Assegna un'attività descrittiva per ogni turno (es. "Attività motoria", "Supporto compiti", "Socializzazione", "Attività creativa").
    
    ESEMPIO DI DISTRIBUZIONE CORRETTA:
    Se hai 3 tutor e 6 ragazzi, ogni tutor dovrebbe avere circa 2 ragazzi nella settimana.
    Se hai 2 tutor e 4 ragazzi, ogni tutor dovrebbe avere circa 2 ragazzi.
    
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
      model: "gemini-3-flash-preview",
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
      model: "gemini-3-flash-preview",
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
