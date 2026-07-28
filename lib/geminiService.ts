import { Tutor, Youth, Shift } from "../types";

const API_BASE = import.meta.env.VITE_BACKEND_URL || "";

export const generateSmartSchedule = async (
  tutors: Tutor[],
  youths: Youth[],
  startDate: string
): Promise<Shift[]> => {
  try {
    const response = await fetch(`${API_BASE}/api/generate-turni`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tutors, youths, startDate }),
    });

    const jsonResponse = await response.json();
    const data = jsonResponse.data;

    if (!data || !Array.isArray(data)) return [];

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
  try {
    const response = await fetch(`${API_BASE}/api/analyze-conflicts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tutors, shifts }),
    });

    const data = await response.json();
    return data.text || "Impossibile analizzare.";
  } catch (error) {
    console.error("Errore analisi conflitti:", error);
    return "Errore durante l'analisi.";
  }
};
