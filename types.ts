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
  unavailableDays: number[]; // 0 = Sunday, 1 = Monday, etc.
  notes: string;
  phone?: string;
  email?: string;
  birthDate?: string;
  city?: string;
  role?: string;
  qualifications?: string;
  yearsExperience?: number;
  criminalRecordExpiry?: string | null;
  status?: string;
  entryDate?: string | null;
}

export interface Youth {
  id: string;
  name: string;
  needs: string[]; // e.g., "Supporto motorio", "Socializzazione"
  requiredHoursPerWeek: number;
  notes: string;
  birthDate?: string; // YYYY-MM-DD
  birthPlace?: string;
  gender?: string;
  nationality?: string;
  fiscalCode?: string;
  phone?: string;
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
  privacyConsentDate?: string | null;
  outingsAuthorized?: boolean;
  diagnoses: string[];
  allergies?: string;
  medications?: string;
  doctor?: string;
  referringTutorId?: string | null;
  entryDate?: string | null;
  status?: string;
  goals?: string;
}

export interface Shift {
  id: string;
  tutorId: string;
  youthId: string;
  date: string; // ISO Date string YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  activity: string;
  status?: string; // 'pianificato' | 'effettuato' | 'cancellato'
  actualStartTime?: string | null; // HH:mm effettivo
  actualEndTime?: string | null; // HH:mm effettivo
  actualNotes?: string;
}

export interface User {
  id: string;
  username: string;
  permissions: string[]; // e.g. ['DASHBOARD', 'TUTORS', 'ALL']
}

export type ViewState = 'LOGIN' | 'DASHBOARD' | 'TUTORS' | 'YOUTHS' | 'CALENDAR' | 'SUMMARY' | 'USER_MANAGEMENT';
