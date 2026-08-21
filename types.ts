export enum AvailabilityType {
  MORNING = 'Mattina',
  AFTERNOON = 'Pomeriggio',
  FULL_DAY = 'Tutto il giorno',
}

export interface Tutor {
  id: string;
  name: string;
  specialties: string[]; // e.g., "Autismo", "Logopedia"
  maxHoursPerWeek: number;
  minHoursPerWeek?: number;
  unavailableDays: number[]; // 0 = Sunday, 1 = Monday, etc.
  notes: string;
  phone?: string;
  email?: string;
  birthDate?: string;
  city?: string;
  role?: string;
  qualifications?: string;
  yearsExperience?: number;
  status?: string;
  entryDate?: string | null;
}

export interface YouthContact {
  id: string;
  label: string; // es. "Genitore", "Zia", "Assistente"
  name: string;
  phone: string;
  email: string;
}

export interface Youth {
  id: string;
  name: string;
  needs: string[]; // e.g., "Supporto motorio", "Socializzazione"
  requiredHoursPerWeek: number;
  notes: string;
  birthDate?: string; // YYYY-MM-DD
  birthPlace?: string;
  fiscalCode?: string;
  phone?: string;
  school?: string;
  contacts: YouthContact[];
  privacyConsentDate?: string | null;
  outingsAuthorized?: boolean;
  diagnoses: string[];
  allergies?: string;
  medications?: string;
  contractStartDate?: string | null;
  contractEndDate?: string | null;
  tutorIds: string[];
  entryDate?: string | null;
  status?: string;
  goals?: string;
}

export interface Shift {
  id: string;
  tutorId: string;
  youthId: string;
  youthIds?: string[]; // più ragazzi/e per lo stesso turno
  date: string; // ISO Date string YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  activity: string;
  status?: string; // 'pianificato' | 'effettuato' | 'cancellato'
  actualStartTime?: string | null; // HH:mm effettivo
  actualEndTime?: string | null; // HH:mm effettivo
  actualNotes?: string;
  isTemplate?: boolean; // turno della settimana tipo (pianificazione)
  templateWeekday?: number | null; // 1 = LUN .. 6 = SAB (per turni template)
  templateShiftId?: string | null; // id del template da cui deriva un turno validato
}

export interface User {
  id: string;
  username: string;
  permissions: string[]; // e.g. ['DASHBOARD', 'TUTORS', 'ALL']
  tutorId?: string | null; // tutor associato: se presente e senza 'ALL', vede solo i propri turni
}

export type ViewState = 'LOGIN' | 'DASHBOARD' | 'TUTORS' | 'YOUTHS' | 'CALENDAR' | 'VALIDATION' | 'SUMMARY' | 'PAYROLL' | 'USER_MANAGEMENT';

export interface PaySettings {
  rateSingle: number;
  rateDouble: number;
  weeksPerMonth: number;
}
