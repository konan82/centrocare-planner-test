import { Tutor, Youth, Shift } from './types';

export const DAYS_OF_WEEK = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

export const INITIAL_TUTORS: Tutor[] = [
  {
    id: 't1',
    name: 'Marco Rossi',
    specialties: ['Sport', 'Attività all\'aperto'],
    maxHoursPerWeek: 20,
    unavailableDays: [6, 0], // Weekend off
    notes: 'Preferisce turni mattutini.',
  },
  {
    id: 't2',
    name: 'Elena Bianchi',
    specialties: ['Arte', 'Supporto compiti'],
    maxHoursPerWeek: 15,
    unavailableDays: [3], // Mercoledì off
    notes: 'Esperta in comunicazione aumentativa.',
  },
  {
    id: 't3',
    name: 'Luca Verdi',
    specialties: ['Musica', 'Autismo'],
    maxHoursPerWeek: 25,
    unavailableDays: [],
    notes: 'Disponibile sempre.',
  },
];

export const INITIAL_YOUTHS: Youth[] = [
  {
    id: 'y1',
    name: 'Giulia A.',
    needs: ['Supporto compiti', 'Socializzazione'],
    requiredHoursPerWeek: 6,
    notes: 'Ama disegnare.',
  },
  {
    id: 'y2',
    name: 'Francesco B.',
    needs: ['Attività motoria'],
    requiredHoursPerWeek: 4,
    notes: 'Ha bisogno di scaricare energia.',
  },
  {
    id: 'y3',
    name: 'Sofia C.',
    needs: ['Autonomia', 'Musica'],
    requiredHoursPerWeek: 8,
    notes: 'Molto sensibile ai rumori forti.',
  },
];

export const INITIAL_SHIFTS: Shift[] = [];
