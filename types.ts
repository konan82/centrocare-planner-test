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
}

export interface Youth {
  id: string;
  name: string;
  needs: string[]; // e.g., "Supporto motorio", "Socializzazione"
  requiredHoursPerWeek: number;
  notes: string;
}

export interface Shift {
  id: string;
  tutorId: string;
  youthId: string;
  date: string; // ISO Date string YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  activity: string;
}

export interface User {
  id: string;
  username: string;
  permissions: string[]; // e.g. ['DASHBOARD', 'TUTORS', 'ALL']
}

export type ViewState = 'LOGIN' | 'DASHBOARD' | 'TUTORS' | 'YOUTHS' | 'CALENDAR' | 'SUMMARY' | 'USER_MANAGEMENT';
