import { GoogleGenAI } from "@google/genai";
import { Tutor, Youth, Shift } from "../types";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

export interface ConflictIssue {
  severity: "error" | "warning" | "info";
  category: string;
  title: string;
  description: string;
  affectedTutors?: string[];
  affectedDates?: string[];
}

export interface ConflictAnalysis {
  issues: ConflictIssue[];
  summary: string;
  score: number;
}

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
): Promise<ConflictAnalysis> => {
  const dayNames = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
  const tutorMap = Object.fromEntries(tutors.map(t => [t.id, t.name]));
  const shiftsEnriched = shifts.map(s => {
    const d = new Date(s.date + 'T12:00:00');
    return {
      tutor: tutorMap[s.tutorId] || s.tutorId,
      date: s.date,
      day: dayNames[d.getDay()],
      start: s.startTime,
      end: s.endTime,
    };
  });
  const tutorsData = tutors.map(t => ({
    name: t.name,
    maxHours: t.maxHoursPerWeek,
    off: t.unavailableDays.map(d => dayNames[d]),
  }));

  const prompt = `Analizza conflitti turni centro educativo e restituisci JSON strutturato.
Tutor: ${JSON.stringify(tutorsData)}
Turni: ${JSON.stringify(shiftsEnriched)}

Regole giorni indisponibili: i giorni "off" indicano i giorni di riposo del tutor. Se un turno cade in un giorno off, è un errore.

Controlla:
1. Sovrapposizioni orari stesso tutor (stessa data e ora)
2. Turni in giorni indisponibili
3. Ore max superate
4. Turni con orari strani (< 14:00 o > 19:00)
5. Tutor non utilizzati

IMPORTANTE: usa SOLO i nomi dei tutor (es. "Tutor 1") nei campi title e description. MAI usare gli ID nei testi.

Rispondi SOLO con questo JSON (nessun testo extra):
{
  "issues": [
    {
      "severity": "error|warning|info",
      "category": "Categoria problema",
      "title": "Titolo breve",
      "description": "Descrizione dettagliata",
      "affectedTutors": ["nome tutor"],
      "affectedDates": ["YYYY-MM-DD"]
    }
  ],
  "summary": "Riassunto in 1-2 frasi dello stato generale",
  "score": 0-100
}

score: 100 = perfetto, 0 = pessimo. Segna severity "error" per problemi gravi, "warning" per moderati, "info" per suggerimenti.`;

  const fallback: ConflictAnalysis = {
    issues: [],
    summary: "Errore durante l'analisi.",
    score: 0,
  };

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
      return fallback;
    }

    let cleanText = text.trim();
    if (cleanText.startsWith("```json")) {
      cleanText = cleanText.replace(/^```json/, "").replace(/```$/, "");
    }

    const data = JSON.parse(cleanText);
    if (!data.issues) return fallback;

    return {
      issues: data.issues || [],
      summary: data.summary || "Analisi completata.",
      score: typeof data.score === "number" ? data.score : 50,
    };
  } catch (error) {
    console.error("Errore analisi conflitti:", error);
    return fallback;
  }
};
