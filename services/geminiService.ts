// geminiService.ts
import { Tutor, Youth, Shift } from "../types";
import { parseISO } from "date-fns";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

export const generateSmartSchedule = async (
  tutors: Tutor[],
  youths: Youth[],
  startDate: string // YYYY-MM-DD of Monday
): Promise<Shift[]> => {

  const prompt = {
    tutors,
    youths,
    startDate
  };

  try {
    const response = await fetch(`${BACKEND_URL}/generate-turni`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: JSON.stringify(prompt) })
    });

    const jsonResponse = await response.json();
    const data = jsonResponse.data;

    // Se l'API backend restituisce errori
    if (!data || !Array.isArray(data)) return [];

    return data.map((s: any) => ({
      ...s,
      id: Math.random().toString(36).slice(2, 11)
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

  const prompt = {
    tutors,
    shifts
  };

  try {
    const response = await fetch(`${BACKEND_URL}/analyze-conflicts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: JSON.stringify(prompt) })
    });

    const data = await response.json();
    return data.text || "Impossibile analizzare.";

  } catch (error) {
    console.error("Errore analisi conflitti:", error);
    return "Errore durante l'analisi.";
  }
};
