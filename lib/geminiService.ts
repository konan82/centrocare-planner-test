import { GoogleGenAI } from "@google/genai";
import { Tutor, Youth, Shift } from "../types";

let aiClient: GoogleGenAI | null = null;

const getAiClient = () => {
  if (aiClient) return aiClient;
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Chiave API Gemini mancante. Imposta VITE_GEMINI_API_KEY nelle variabili d'ambiente.");
  }
  aiClient = new GoogleGenAI({ apiKey });
  return aiClient;
};

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
    const response = await getAiClient().models.generateContent({
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

export const analyzeConflicts = (
  tutors: Tutor[],
  shifts: Shift[]
): ConflictAnalysis => {
  const dayNames = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
  const issues: ConflictIssue[] = [];
  const tutorMap = Object.fromEntries(tutors.map(t => [t.id, t.name]));

  // 1. Turni in giorni di riposo
  tutors.forEach(t => {
    if (!t.unavailableDays?.length) return;
    const tutorShifts = shifts.filter(s => s.tutorId === t.id);
    tutorShifts.forEach(s => {
      if (!s.date) return;
      const d = new Date(s.date + 'T12:00:00');
      const dayOfWeek = d.getDay();
      if (t.unavailableDays.includes(dayOfWeek)) {
        issues.push({
          severity: 'error',
          category: 'Disponibilità',
          title: `Turno in giorno di riposo`,
          description: `${t.name} ha un turno il ${dayNames[dayOfWeek]} (${s.date}), giorno in cui è segnato come non disponibile.`,
          affectedTutors: [t.name],
          affectedDates: [s.date],
        });
      }
    });
  });

  // 2. Sovrapposizioni orari stesso tutor
  tutors.forEach(t => {
    const tutorShifts = shifts.filter(s => s.tutorId === t.id);
    for (let i = 0; i < tutorShifts.length; i++) {
      for (let j = i + 1; j < tutorShifts.length; j++) {
        const a = tutorShifts[i];
        const b = tutorShifts[j];
        if (a.date !== b.date) continue;
        if (!a.startTime || !a.endTime || !b.startTime || !b.endTime) continue;
        const aS = a.startTime, aE = a.endTime, bS = b.startTime, bE = b.endTime;
        if (aS < bE && bS < aE) {
          issues.push({
            severity: 'error',
            category: 'Sovrapposizione',
            title: `Turni sovrapposti`,
            description: `${t.name} ha due turni sovrapposti il ${a.date}: ${aS}-${aE} e ${bS}-${bE}.`,
            affectedTutors: [t.name],
            affectedDates: [a.date],
          });
        }
      }
    }
  });

  // 3. Ore max superate
  tutors.forEach(t => {
    if (!t.maxHoursPerWeek) return;
    const tutorShifts = shifts.filter(s => s.tutorId === t.id);
    let totalMin = 0;
    tutorShifts.forEach(s => {
      if (!s.startTime || !s.endTime) return;
      const [sh, sm] = s.startTime.split(':').map(Number);
      const [eh, em] = s.endTime.split(':').map(Number);
      totalMin += (eh * 60 + em) - (sh * 60 + sm);
    });
    const totalHours = totalMin / 60;
    if (totalHours > t.maxHoursPerWeek) {
      issues.push({
        severity: 'warning',
        category: 'Ore settimanali',
        title: `Ore massime superate`,
        description: `${t.name} ha ${totalHours}h assegnate, superando il limite di ${t.maxHoursPerWeek}h.`,
        affectedTutors: [t.name],
      });
    }
  });

  // 4. Turni con orari strani
  shifts.forEach(s => {
    if (!s.startTime || !s.endTime) return;
    const [sh, sm] = s.startTime.split(':').map(Number);
    const [eh, em] = s.endTime.split(':').map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    if (startMin < 14 * 60 || endMin > 19 * 60) {
      issues.push({
        severity: 'warning',
        category: 'Orario anomalo',
        title: `Turno fuori orario`,
        description: `${tutorMap[s.tutorId] || s.tutorId} ha un turno il ${s.date} dalle ${s.startTime} alle ${s.endTime}, fuori dalla fascia 14:00-19:00.`,
        affectedTutors: [tutorMap[s.tutorId] || s.tutorId],
        affectedDates: [s.date],
      });
    }
  });

  // 5. Tutor non utilizzati
  tutors.forEach(t => {
    const hasShifts = shifts.some(s => s.tutorId === t.id);
    if (!hasShifts) {
      issues.push({
        severity: 'info',
        category: 'Assegnazione',
        title: `Tutor senza turni`,
        description: `${t.name} non ha turni assegnati.`,
        affectedTutors: [t.name],
      });
    }
  });

  const score = Math.max(0, 100 - issues.reduce((penalty, issue) => {
    return penalty + (issue.severity === 'error' ? 20 : issue.severity === 'warning' ? 10 : 3);
  }, 0));

  const severityCounts = { error: 0, warning: 0, info: 0 };
  issues.forEach(i => severityCounts[i.severity]++);
  const summary = issues.length === 0
    ? 'Nessun conflitto rilevato. La pianificazione è ottimale.'
    : `Rilevati ${issues.length} problema/i: ${severityCounts.error} errori, ${severityCounts.warning} warning, ${severityCounts.info} info.`;

  return { issues, summary, score };
};
