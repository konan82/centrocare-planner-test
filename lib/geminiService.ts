import { GoogleGenAI } from "@google/genai";
import { Tutor, Youth, Shift } from "../types";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

export const generateSmartSchedule = async (
  tutors: Tutor[],
  youths: Youth[],
  startDate: string
): Promise<Shift[]> => {
  const prompt = `Pianifica turni settimanali (lun-sab) per centro educativo.
Dati: ${JSON.stringify({ tutors: tutors.map(t => ({ id: t.id, name: t.name, specialties: t.specialties, maxHours: t.maxHoursPerWeek, off: t.unavailableDays })), youths: youths.map(y => ({ id: y.id, name: y.name, needs: y.needs, hours: y.requiredHoursPerWeek })), startDate })}

Regole:
- USA TUTTI i tutor, distribuisci equamente i ragazzi
- Rispetta unavailableDays (0=dom, 1=lu, ..., 6=sab)
- Max ore/tutor = maxHours, ogni ragazzo = requiredHours
- Turni 14:00-19:00, durata 1-2h, no sovrapposti
- Abbinamento specialties↔needs quando possibile
- Assegna attività (es. "Motorio", "Compiti", "Socializzazione")

Output: SOLO array JSON valido. Formato:
{"tutorId":"x","youthId":"x","date":"YYYY-MM-DD","startTime":"HH:MM","endTime":"HH:MM","activity":"x"}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
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
  const prompt = `Analizza conflitti turni centro educativo.
Dati tutor: ${JSON.stringify(tutors.map(t => ({ id: t.id, name: t.name, maxHours: t.maxHoursPerWeek, off: t.unavailableDays })))}
Turni: ${JSON.stringify(shifts.map(s => ({ tutorId: s.tutorId, date: s.date, start: s.startTime, end: s.endTime })))}

Controlla:
1. Sovrapposizioni orari stesso tutor
2. Turni in giorni indisponibili
3. Ore max superate

Rispondi con elenco puntato in italiano. Se ok, dillo.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
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
