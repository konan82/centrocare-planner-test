import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  Calendar as CalendarIcon,
  UserCheck,
  Plus,
  Trash2,
  BrainCircuit,
  AlertTriangle,
  Menu,
  X,
  Edit,
  Save,
  BarChart3,
  Check,
  ChevronDown,
  Lock,
  LogOut,
  Shield,
  UserPlus,
  Settings,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  TrendingUp,
  IdCard,
  Phone,
  HeartPulse,
  Target,
  BookOpen,
  Search,
  ArrowUp,
  ArrowDown,
  UserX,
  FilterX,
  Archive,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  MousePointer2,
  Play
} from 'lucide-react';
import { Tutor, Youth, Shift, ViewState, User } from './types';
import { INITIAL_TUTORS, INITIAL_YOUTHS, INITIAL_SHIFTS, DAYS_OF_WEEK } from './constants';
import { generateSmartSchedule, analyzeConflicts, ConflictAnalysis } from './lib/geminiService';
import { supabase } from './src/supabaseClient';
import { startOfWeek, addDays, format, parseISO, isSameDay, getISOWeek, getMonth, getYear, startOfMonth, endOfMonth, eachWeekOfInterval, endOfWeek } from 'date-fns';
import { it } from 'date-fns/locale';

const TUTOR_COLORS = [
  { bg: 'bg-blue-100', border: 'border-l-blue-500', text: 'text-blue-800', hover: 'hover:bg-blue-200', badge: 'bg-blue-500' },
  { bg: 'bg-emerald-100', border: 'border-l-emerald-500', text: 'text-emerald-800', hover: 'hover:bg-emerald-200', badge: 'bg-emerald-500' },
  { bg: 'bg-violet-100', border: 'border-l-violet-500', text: 'text-violet-800', hover: 'hover:bg-violet-200', badge: 'bg-violet-500' },
  { bg: 'bg-amber-100', border: 'border-l-amber-500', text: 'text-amber-800', hover: 'hover:bg-amber-200', badge: 'bg-amber-500' },
  { bg: 'bg-rose-100', border: 'border-l-rose-500', text: 'text-rose-800', hover: 'hover:bg-rose-200', badge: 'bg-rose-500' },
  { bg: 'bg-cyan-100', border: 'border-l-cyan-500', text: 'text-cyan-800', hover: 'hover:bg-cyan-200', badge: 'bg-cyan-500' },
  { bg: 'bg-orange-100', border: 'border-l-orange-500', text: 'text-orange-800', hover: 'hover:bg-orange-200', badge: 'bg-orange-500' },
  { bg: 'bg-pink-100', border: 'border-l-pink-500', text: 'text-pink-800', hover: 'hover:bg-pink-200', badge: 'bg-pink-500' },
  { bg: 'bg-indigo-100', border: 'border-l-indigo-500', text: 'text-indigo-800', hover: 'hover:bg-indigo-200', badge: 'bg-indigo-500' },
  { bg: 'bg-lime-100', border: 'border-l-lime-500', text: 'text-lime-800', hover: 'hover:bg-lime-200', badge: 'bg-lime-500' },
];

const ROLE_STYLES: Record<string, { badge: string; dot: string }> = {
  Educatore: { badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  Psicologo: { badge: 'bg-violet-100 text-violet-700 border-violet-200', dot: 'bg-violet-500' },
  'Tutor DSA': { badge: 'bg-blue-100 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  Operatore: { badge: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  Volontario: { badge: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-500' },
  Coordinatore: { badge: 'bg-rose-100 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
};
const ROLE_DEFAULT = { badge: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' };

const TUTOR_ROLES = ['Educatore', 'Psicologo', 'Tutor DSA', 'Operatore', 'Volontario', 'Coordinatore'];

// Settimana tipo: date di riferimento LUN-SAB (2026-08-03 era un Lunedì)
const TEMPLATE_ANCHOR = parseISO('2026-08-03');

// Giorno della settimana 1=LUN..6=SAB da una data ISO
const weekdayOf = (dateStr?: string | null) => {
  if (!dateStr) return 1;
  const d = parseISO(dateStr.split('T')[0]);
  if (isNaN(d.getTime())) return 1;
  return ((d.getDay() + 6) % 7) + 1;
};

// Ore consuntivo (validato): solo i turni effettuati contano; cancellati = 0; pianificati (non ancora validati) = 0
const getValidatedHours = (s: { status?: string; actualStartTime?: string | null; actualEndTime?: string | null; startTime: string; endTime: string }) => {
  if ((s.status || 'pianificato') !== 'effettuato') return 0;
  return getEffectiveHours(s);
};

const parseTimeMins = (t: string) => {
  const [h, m] = (t || '0:00').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

const getEffectiveTime = (s: { status?: string; actualStartTime?: string | null; actualEndTime?: string | null; startTime: string; endTime: string }) => {
  if ((s.status || 'pianificato') === 'cancellato') return null;
  const start = s.actualStartTime || s.startTime;
  const end = s.actualEndTime || s.endTime;
  if (!start || !end) return null;
  return { start, end };
};

const getEffectiveHours = (s: { status?: string; actualStartTime?: string | null; actualEndTime?: string | null; startTime: string; endTime: string }) => {
  const t = getEffectiveTime(s);
  if (!t) return 0;
  return (parseTimeMins(t.end) - parseTimeMins(t.start)) / 60;
};

const YOUTH_COLORS = [
  { bg: 'bg-sky-100', border: 'border-sky-300', text: 'text-sky-800', badge: 'bg-sky-500', hover: 'hover:bg-sky-200' },
  { bg: 'bg-fuchsia-100', border: 'border-fuchsia-300', text: 'text-fuchsia-800', badge: 'bg-fuchsia-500', hover: 'hover:bg-fuchsia-200' },
  { bg: 'bg-teal-100', border: 'border-teal-300', text: 'text-teal-800', badge: 'bg-teal-500', hover: 'hover:bg-teal-200' },
  { bg: 'bg-yellow-100', border: 'border-yellow-300', text: 'text-yellow-800', badge: 'bg-yellow-500', hover: 'hover:bg-yellow-200' },
  { bg: 'bg-red-100', border: 'border-red-300', text: 'text-red-800', badge: 'bg-red-500', hover: 'hover:bg-red-200' },
  { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-800', badge: 'bg-green-500', hover: 'hover:bg-green-200' },
  { bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-800', badge: 'bg-purple-500', hover: 'hover:bg-purple-200' },
  { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-800', badge: 'bg-blue-500', hover: 'hover:bg-blue-200' },
];

const getTutorColor = (tutorId: string, tutors: Tutor[]) => {
  const idx = tutors.findIndex(t => t.id === tutorId);
  return TUTOR_COLORS[idx % TUTOR_COLORS.length];
};

const getYouthColor = (youthId: string, youths: Youth[]) => {
  const idx = youths.findIndex(y => y.id === youthId);
  return YOUTH_COLORS[idx % YOUTH_COLORS.length];
};

const getInitials = (name?: string) => {
  if (!name) return '?';
  return name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
};

const getAge = (birthDate?: string) => {
  if (!birthDate) return null;
  const b = parseISO(birthDate);
  if (isNaN(b.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - b.getFullYear();
  const m = today.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--;
  return age;
};

// --- Components defined within App to share state easily for this demo ---

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'md' | 'lg';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className={`bg-white rounded-xl shadow-2xl w-full ${size === 'lg' ? 'max-w-2xl' : 'max-w-md'} overflow-hidden animate-fadeIn`}>
        <div className="flex justify-between items-center p-4 border-b bg-teal-600 text-white">
          <h3 className="font-semibold text-lg">{title}</h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <div className="p-6 text-slate-900 max-h-[80vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = "" }) => (
  <div className={`bg-white rounded-lg shadow-md border border-gray-100 ${className}`}>
    {children}
  </div>
);

const fieldCls = "w-full p-2.5 border border-slate-300 rounded-lg bg-white text-slate-900 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition placeholder:text-slate-400";

interface YouthSectionProps {
  icon: React.ReactNode;
  title: string;
  chipBg: string;
  headerBg: string;
  textColor: string;
  children: React.ReactNode;
}

const YouthSection: React.FC<YouthSectionProps> = ({ icon, title, chipBg, headerBg, textColor, children }) => (
  <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
    <div className={`flex items-center gap-2.5 px-4 py-2.5 border-b ${headerBg}`}>
      <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-white shadow-sm ${chipBg}`}>{icon}</span>
      <h4 className={`font-bold text-sm tracking-wide ${textColor}`}>{title}</h4>
    </div>
    <div className="px-4 py-4">{children}</div>
  </div>
);

// --- Error Boundary ---
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="bg-white p-8 rounded-lg shadow-xl max-w-2xl w-full border-l-4 border-red-500">
            <h1 className="text-2xl font-bold text-slate-800 mb-2 flex items-center">
              <AlertTriangle className="text-red-500 mr-2" />
              Si è verificato un errore imprevisto
            </h1>
            <p className="text-slate-600 mb-4">L'applicazione ha riscontrato un problema critico.</p>

            <div className="bg-slate-100 p-4 rounded-md overflow-auto text-xs font-mono text-slate-700 mb-6 max-h-64">
              {this.state.error?.toString()}
              {this.state.error?.stack && (
                <div className="mt-2 pt-2 border-t border-slate-200 opacity-75">
                  {this.state.error.stack}
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 transition-colors"
              >
                Riprova
              </button>
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                className="px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
              >
                Reset Dati Locali (Logout forzato)
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// --- Main App ---

export default function AppWrapper() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

function App() {
  const [view, setView] = useState<ViewState>('LOGIN');
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [youths, setYouths] = useState<Youth[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);

  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

  // Check Auth on Mount
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        // Fetch profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          setCurrentUser({
            id: session.user.id,
            username: profile.username,
            permissions: profile.permissions || [],
          });
          setToken(session.access_token);
          setView('DASHBOARD');
          return;
        }
      }

      // No valid session
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setToken(null);
      setCurrentUser(null);
      setView('LOGIN');
    };

    checkAuth();
  }, []);

  // Load data from Supabase on mount
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        const [t, y, s] = await Promise.all([
          supabase.from('tutors').select('*'),
          supabase.from('youths').select('*'),
          supabase.from('shifts').select('*')
        ]);

        if (t.error) throw t.error;
        if (y.error) throw y.error;
        if (s.error) throw s.error;

        const normalizedTutors = (t.data || []).map((tutor: any) => ({
          ...tutor,
          specialties: tutor.specialties || [],
          unavailableDays: tutor.unavailable_days || [],
          maxHoursPerWeek: tutor.max_hours_per_week,
          phone: tutor.phone || '',
          email: tutor.email || '',
          birthDate: tutor.birth_date || undefined,
          city: tutor.city || '',
          role: tutor.role || '',
          qualifications: tutor.qualifications || '',
          yearsExperience: tutor.years_experience || undefined,
          criminalRecordExpiry: tutor.criminal_record_expiry || null,
          status: tutor.status || 'attivo',
          entryDate: tutor.entry_date || null,
        }));

        const normalizedYouths = (y.data || []).map((youth: any) => ({
          ...youth,
          needs: youth.needs || [],
          diagnoses: youth.diagnoses || [],
          requiredHoursPerWeek: youth.required_hours_per_week,
          birthDate: youth.birth_date || undefined,
          birthPlace: youth.birth_place || '',
          gender: youth.gender || '',
          nationality: youth.nationality || '',
          fiscalCode: youth.fiscal_code || '',
          phone: youth.phone || '',
          parentName: youth.parent_name || '',
          parentPhone: youth.parent_phone || '',
          parentEmail: youth.parent_email || '',
          privacyConsentDate: youth.privacy_consent_date || null,
          outingsAuthorized: youth.outings_authorized || false,
          allergies: youth.allergies || '',
          medications: youth.medications || '',
          doctor: youth.doctor || '',
          referringTutorId: youth.referring_tutor_id || null,
          entryDate: youth.entry_date || null,
          status: youth.status || 'attivo',
          goals: youth.goals || '',
        }));

        const normalizedShifts = (s.data || []).map((shift: any) => ({
          ...shift,
          tutorId: shift.tutor_id,
          youthId: shift.youth_id,
          startTime: shift.start_time,
          endTime: shift.end_time,
          status: shift.status || 'pianificato',
          actualStartTime: shift.actual_start_time || null,
          actualEndTime: shift.actual_end_time || null,
          actualNotes: shift.actual_notes || '',
          isTemplate: shift.is_template || false,
          templateWeekday: shift.template_weekday || null,
          templateShiftId: shift.template_shift_id || null,
        }));

        setTutors(normalizedTutors);
        setYouths(normalizedYouths);
        setShifts(normalizedShifts);

        setIsLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        setLoadError('Errore nel caricamento dati. Riprovo tra 5 secondi...');
        setTimeout(() => { window.location.reload(); }, 5000);
      }
    })();
  }, []);

  // Date State for Calendar
  const [currentDate, setCurrentDate] = useState(new Date());

  // Modal States
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Partial<Shift> | null>(null);
  const [shiftModalMode, setShiftModalMode] = useState<'plan' | 'validate'>('validate');

  const [isTutorModalOpen, setIsTutorModalOpen] = useState(false);
  const [newTutor, setNewTutor] = useState<Partial<Tutor>>({});

  const [isYouthModalOpen, setIsYouthModalOpen] = useState(false);
  const [newYouth, setNewYouth] = useState<Partial<Youth>>({});
  const [youthSearch, setYouthSearch] = useState('');
  const [youthSort, setYouthSort] = useState<'asc' | 'desc'>('asc');
  const [youthStatusFilter, setYouthStatusFilter] = useState<'tutti' | 'attivo' | 'pausa' | 'archiviato'>('tutti');
  const [youthTutorFilter, setYouthTutorFilter] = useState('tutti');

  // AI State
  const [isGenerating, setIsGenerating] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ConflictAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Drag and Drop State
  const [draggedShiftId, setDraggedShiftId] = useState<string | null>(null);
  const [dragOverCoords, setDragOverCoords] = useState<{ dateStr: string, minutes: number } | null>(null);

  // Resize State (Google Calendar style: drag the bottom edge to change duration)
  const [resizingShiftId, setResizingShiftId] = useState<string | null>(null);
  const resizeRef = useRef<{ shiftId: string; startEndMin: number; startY: number; endMin: number | null } | null>(null);

  // Tutor Filter State ('all' or a tutor id)
  const [tutorFilter, setTutorFilter] = useState<string>('all');
  const [isTutorFilterOpen, setIsTutorFilterOpen] = useState(false);
  const [tutorSearch, setTutorSearch] = useState('');
  const [tutorSort, setTutorSort] = useState<'asc' | 'desc'>('asc');
  const [tutorStatusFilter, setTutorStatusFilter] = useState<'tutti' | 'attivo' | 'pausa' | 'archiviato'>('tutti');
  const [tutorRoleFilter, setTutorRoleFilter] = useState('tutti');
  const tutorFilterRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (tutorFilterRef.current && !tutorFilterRef.current.contains(e.target as Node)) {
        setIsTutorFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Mobile Menu State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Summary View State
  const [summaryStartDate, setSummaryStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [summaryEndDate, setSummaryEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [summaryViewMode, setSummaryViewMode] = useState<'TUTORS' | 'YOUTHS'>('TUTORS');

  // Helper: Get start of current week (Monday)
  const startOfCurrentWeek = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 6 }).map((_, i) => addDays(startOfCurrentWeek, i)); // LUN-SAB
  const templateWeekDays = Array.from({ length: 6 }).map((_, i) => addDays(TEMPLATE_ANCHOR, i)); // settimana tipo LUN-SAB

  // --- Handlers ---

  const handleSaveTutor = async () => {
    if (!newTutor.name) return;

    try {
      const tutorData = {
        id: newTutor.id || Math.random().toString(36).slice(2, 11),
        name: newTutor.name,
        specialties: newTutor.specialties || [],
        max_hours_per_week: newTutor.maxHoursPerWeek ?? 20,
        unavailable_days: newTutor.unavailableDays || [],
        notes: newTutor.notes || '',
        phone: newTutor.phone || '',
        email: newTutor.email || '',
        birth_date: newTutor.birthDate || null,
        city: newTutor.city || '',
        role: newTutor.role || '',
        qualifications: newTutor.qualifications || '',
        years_experience: newTutor.yearsExperience || null,
        criminal_record_expiry: newTutor.criminalRecordExpiry || null,
        status: newTutor.status || 'attivo',
        entry_date: newTutor.entryDate || null,
      };

      const { error } = await supabase.from('tutors').upsert(tutorData);
      if (error) throw error;

      if (newTutor.id) {
        setTutors(tutors.map(t => t.id === newTutor.id ? { ...t, ...tutorData, maxHoursPerWeek: tutorData.max_hours_per_week, unavailableDays: tutorData.unavailable_days, birthDate: tutorData.birth_date, criminalRecordExpiry: tutorData.criminal_record_expiry, entryDate: tutorData.entry_date, yearsExperience: tutorData.years_experience } : t));
      } else {
        setTutors([...tutors, { ...tutorData, maxHoursPerWeek: tutorData.max_hours_per_week, unavailableDays: tutorData.unavailable_days, birthDate: tutorData.birth_date, criminalRecordExpiry: tutorData.criminal_record_expiry, entryDate: tutorData.entry_date, yearsExperience: tutorData.years_experience }]);
      }
      setIsTutorModalOpen(false);
      setNewTutor({});
    } catch (error) {
      console.error("Error saving tutor:", error);
      alert("Errore nel salvataggio del tutor");
    }
  };

  const handleDeleteTutor = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo tutor?")) return;
    try {
      const { error } = await supabase.from('tutors').delete().eq('id', id);
      if (error) throw error;
      setTutors(tutors.filter(t => t.id !== id));
      setShifts(shifts.filter(s => s.tutorId !== id));
    } catch (error) {
      console.error("Error deleting tutor:", error);
      alert("Errore nell'eliminazione del tutor");
    }
  };

  const handleSaveYouth = async () => {
    if (!newYouth.name) return;

    try {
      const youthData = {
        id: newYouth.id || Math.random().toString(36).slice(2, 11),
        name: newYouth.name,
        needs: newYouth.needs || [],
        required_hours_per_week: newYouth.requiredHoursPerWeek ?? 4,
        notes: newYouth.notes || '',
        birth_date: newYouth.birthDate || null,
        birth_place: newYouth.birthPlace || '',
        gender: newYouth.gender || '',
        nationality: newYouth.nationality || '',
        fiscal_code: newYouth.fiscalCode || '',
        phone: newYouth.phone || '',
        parent_name: newYouth.parentName || '',
        parent_phone: newYouth.parentPhone || '',
        parent_email: newYouth.parentEmail || '',
        privacy_consent_date: newYouth.privacyConsentDate || null,
        outings_authorized: newYouth.outingsAuthorized || false,
        diagnoses: newYouth.diagnoses || [],
        allergies: newYouth.allergies || '',
        medications: newYouth.medications || '',
        doctor: newYouth.doctor || '',
        referring_tutor_id: newYouth.referringTutorId || null,
        entry_date: newYouth.entryDate || null,
        status: newYouth.status || 'attivo',
        goals: newYouth.goals || '',
      };

      const { error } = await supabase.from('youths').upsert(youthData);
      if (error) throw error;

      if (newYouth.id) {
        setYouths(youths.map(y => y.id === newYouth.id ? { ...y, ...youthData, requiredHoursPerWeek: youthData.required_hours_per_week } : y));
      } else {
        setYouths([...youths, { ...youthData, requiredHoursPerWeek: youthData.required_hours_per_week }]);
      }
      setIsYouthModalOpen(false);
      setNewYouth({});
    } catch (error) {
      console.error("Error saving youth:", error);
      alert("Errore nel salvataggio del ragazzo");
    }
  };

  const handleDeleteYouth = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo ragazzo?")) return;
    try {
      const { error } = await supabase.from('youths').delete().eq('id', id);
      if (error) throw error;
      setYouths(youths.filter(y => y.id !== id));
      setShifts(shifts.filter(s => s.youthId !== id));
    } catch (error) {
      console.error("Error deleting youth:", error);
      alert("Errore nell'eliminazione del ragazzo");
    }
  };

  const handleSaveShift = async () => {
    if (!editingShift?.tutorId || !editingShift?.youthId || !editingShift?.startTime || !editingShift?.endTime || !editingShift?.date) return;

    const isPlan = shiftModalMode === 'plan';
    const templateWeekday = isPlan
      ? (editingShift.templateWeekday ?? weekdayOf(editingShift.date))
      : null;

    try {
      const shiftData = {
        id: editingShift.id || Math.random().toString(36).slice(2, 11),
        tutor_id: editingShift.tutorId,
        youth_id: editingShift.youthId,
        date: editingShift.date,
        start_time: editingShift.startTime,
        end_time: editingShift.endTime,
        activity: editingShift.activity || 'Attività generica',
        status: isPlan ? 'pianificato' : (editingShift.status || 'pianificato'),
        actual_start_time: isPlan ? null : (editingShift.actualStartTime || null),
        actual_end_time: isPlan ? null : (editingShift.actualEndTime || null),
        actual_notes: isPlan ? '' : (editingShift.actualNotes || ''),
        is_template: isPlan,
        template_weekday: templateWeekday,
        template_shift_id: isPlan ? null : (editingShift.templateShiftId || null),
      };

      const { error } = await supabase.from('shifts').upsert(shiftData);
      if (error) throw error;

      const normalizedShift = {
        ...shiftData,
        tutorId: shiftData.tutor_id,
        youthId: shiftData.youth_id,
        startTime: shiftData.start_time,
        endTime: shiftData.end_time,
        status: shiftData.status,
        actualStartTime: shiftData.actual_start_time,
        actualEndTime: shiftData.actual_end_time,
        actualNotes: shiftData.actual_notes,
        isTemplate: shiftData.is_template,
        templateWeekday: shiftData.template_weekday,
        templateShiftId: shiftData.template_shift_id,
      };

      if (editingShift.id) {
        setShifts(shifts.map(s => s.id === normalizedShift.id ? normalizedShift : s));
      } else {
        setShifts([...shifts, normalizedShift]);
      }
      setIsShiftModalOpen(false);
      setEditingShift(null);

      if (isPlan) {
        if (editingShift.id) {
          await syncTemplateOccurrences(normalizedShift as Shift);
        } else {
          await propagateTemplateCreate(normalizedShift as Shift);
        }
      }
    } catch (error) {
      console.error("Error saving shift:", error);
      alert("Errore nel salvataggio del turno");
    }
  };

  const handleDeleteShift = async (id: string) => {
    if (!confirm("Eliminare questo turno?")) return;
    try {
      const shiftToDelete = shifts.find(s => s.id === id);
      const { error } = await supabase.from('shifts').delete().eq('id', id);
      if (error) throw error;
      setShifts(shifts.filter(s => s.id !== id));
      if (editingShift?.id === id) setIsShiftModalOpen(false);
      if (shiftToDelete?.isTemplate) {
        await deleteTemplateOccurrences(id);
      }
    } catch (error) {
      console.error("Error deleting shift:", error);
      alert("Errore nell'eliminazione del turno");
    }
  };

  const openNewShiftModal = (tutorId?: string, dateStr?: string, startTime?: string) => {
    setEditingShift({
      tutorId: tutorId || '',
      date: dateStr || format(new Date(), 'yyyy-MM-dd'),
      startTime: startTime || '15:00',
      endTime: startTime ? `${String((parseInt(startTime.split(':')[0]) + 2) % 24).padStart(2, '0')}:00` : '17:00',
      isTemplate: false,
      templateShiftId: null,
    });
    setShiftModalMode('validate');
    setIsShiftModalOpen(true);
  };

  const openNewTemplateShiftModal = (weekday: number, startTime?: string) => {
    setEditingShift({
      tutorId: '',
      date: format(addDays(TEMPLATE_ANCHOR, weekday - 1), 'yyyy-MM-dd'),
      templateWeekday: weekday,
      isTemplate: true,
      startTime: startTime || '15:00',
      endTime: startTime ? `${String((parseInt(startTime.split(':')[0]) + 2) % 24).padStart(2, '0')}:00` : '17:00',
    });
    setShiftModalMode('plan');
    setIsShiftModalOpen(true);
  };

  const openShiftModal = (shift: Shift, mode: 'plan' | 'validate') => {
    setEditingShift(shift);
    setShiftModalMode(mode);
    setIsShiftModalOpen(true);
  };

  const openNewTutorModal = () => {
    setNewTutor({});
    setIsTutorModalOpen(true);
  }

  const openEditTutorModal = (tutor: Tutor) => {
    setNewTutor({ ...tutor });
    setIsTutorModalOpen(true);
  }

  const openNewYouthModal = () => {
    setNewYouth({});
    setIsYouthModalOpen(true);
  }

  const openEditYouthModal = (youth: Youth) => {
    setNewYouth({ ...youth });
    setIsYouthModalOpen(true);
  }

  const handleGenerateSchedule = async (clearWeek: boolean) => {
    setShowConfirmClear(false);
    setIsGenerating(true);
    try {
      const startDateStr = format(TEMPLATE_ANCHOR, 'yyyy-MM-dd');

      if (clearWeek) {
        const { error: delErr } = await supabase
          .from('shifts')
          .delete()
          .eq('is_template', true);
        if (delErr) throw delErr;
        setShifts(prev => prev.filter(s => !s.isTemplate));
      }

      const newShifts = await generateSmartSchedule(tutors, youths, startDateStr);

      const shiftsToSave = newShifts.map(s => ({
        id: s.id,
        tutor_id: s.tutorId,
        youth_id: s.youthId,
        date: s.date,
        start_time: s.startTime,
        end_time: s.endTime,
        activity: s.activity || '',
        is_template: true,
        template_weekday: weekdayOf(s.date),
      }));

      if (shiftsToSave.length > 0) {
        const { error } = await supabase.from('shifts').upsert(shiftsToSave);
        if (error) throw error;
      }

      const templateShifts = shiftsToSave.map(s => ({
        id: s.id,
        tutorId: s.tutor_id,
        youthId: s.youth_id,
        date: s.date,
        startTime: s.start_time,
        endTime: s.end_time,
        activity: s.activity,
        status: 'pianificato',
        isTemplate: true,
        templateWeekday: s.template_weekday,
        templateShiftId: null,
      }));
      setShifts(prev => [...prev.filter(s => !s.isTemplate), ...templateShifts]);
    } catch (error) {
      console.error(error);
      alert("Errore durante la generazione dei turni. Verifica la chiave API.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    const report = analyzeConflicts(tutors, shifts.filter(s => s.isTemplate));
    setAnalysisResult(report);
    setIsAnalyzing(false);
  };

  // Copia i turni della pianificazione (template) nella settimana reale indicata (idempotente)
  const materializeWeek = async (weekStart: Date) => {
    const templateShifts = shifts.filter(s => s.isTemplate);
    if (templateShifts.length === 0) return;

    const weekDateStrs = Array.from({ length: 6 }).map((_, i) => format(addDays(weekStart, i), 'yyyy-MM-dd'));
    const existing = shifts.filter(s => !s.isTemplate && weekDateStrs.includes(s.date));
    const existingTemplateIds = new Set(existing.map(s => s.templateShiftId).filter(Boolean) as string[]);

    const toCreate = templateShifts.filter(t => !existingTemplateIds.has(t.id));
    if (toCreate.length === 0) return;

    const rows = toCreate.map(t => ({
      id: Math.random().toString(36).slice(2, 11),
      tutor_id: t.tutorId,
      youth_id: t.youthId,
      date: weekDateStrs[Math.min(Math.max(((t.templateWeekday || 1) - 1), 0), 5)],
      start_time: t.startTime,
      end_time: t.endTime,
      activity: t.activity || '',
      status: 'pianificato',
      is_template: false,
      template_weekday: null,
      template_shift_id: t.id,
    }));

    try {
      const { error } = await supabase.from('shifts').insert(rows);
      if (error) throw error;
      const normalized = rows.map(r => ({
        id: r.id,
        tutorId: r.tutor_id,
        youthId: r.youth_id,
        date: r.date,
        startTime: r.start_time,
        endTime: r.end_time,
        activity: r.activity,
        status: r.status,
        isTemplate: r.is_template,
        templateWeekday: r.template_weekday,
        templateShiftId: r.template_shift_id,
      }));
      setShifts(prev => [...prev, ...normalized]);
    } catch (error) {
      console.error("Error materializing week:", error);
      alert("Errore nella copia della pianificazione nella settimana");
    }
  };

  // Materializza la settimana visibile quando si entra in Consuntivo Turni o si cambia settimana
  useEffect(() => {
    if (view !== 'VALIDATION') return;
    materializeWeek(startOfWeek(currentDate, { weekStartsOn: 1 }));
  }, [view, currentDate]);

  // Sincronizza i turni già copiati in validazione con un template modificato,
  // ma SOLO per i giorni da oggi in poi e solo se non ancora validati/cancellati.
  const syncTemplateOccurrences = async (template: Shift) => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const occurrences = shifts.filter(s =>
      !s.isTemplate &&
      s.templateShiftId === template.id &&
      s.date >= todayStr &&
      (s.status || 'pianificato') === 'pianificato'
    );
    if (occurrences.length === 0) return;

    const wd = Math.min(Math.max((template.templateWeekday || weekdayOf(template.date)) - 1, 0), 5);
    const byId: Record<string, { date: string; start_time: string; end_time: string; activity: string; tutor_id: string; youth_id: string }> = {};
    for (const s of occurrences) {
      const weekStart = startOfWeek(parseISO(s.date), { weekStartsOn: 1 });
      byId[s.id] = {
        date: format(addDays(weekStart, wd), 'yyyy-MM-dd'),
        start_time: template.startTime,
        end_time: template.endTime,
        activity: template.activity || '',
        tutor_id: template.tutorId,
        youth_id: template.youthId,
      };
    }

    try {
      for (const [id, u] of Object.entries(byId)) {
        const { error } = await supabase.from('shifts').update({
          date: u.date,
          start_time: u.start_time,
          end_time: u.end_time,
          activity: u.activity,
          tutor_id: u.tutor_id,
          youth_id: u.youth_id,
        }).eq('id', id);
        if (error) throw error;
      }
      setShifts(prev => prev.map(s => {
        const u = byId[s.id];
        if (!u) return s;
        return {
          ...s,
          date: u.date,
          startTime: u.start_time,
          endTime: u.end_time,
          activity: u.activity,
          tutorId: u.tutor_id,
          youthId: u.youth_id,
        };
      }));
    } catch (error) {
      console.error("Error syncing template occurrences:", error);
      alert("Errore nell'aggiornamento dei turni futuri in validazione");
    }
  };

  // Rimuove da validazione i turni futuri (non ancora validati) quando un template viene eliminato
  const deleteTemplateOccurrences = async (templateId: string) => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const toDelete = shifts.filter(s =>
      !s.isTemplate &&
      s.templateShiftId === templateId &&
      s.date >= todayStr &&
      (s.status || 'pianificato') === 'pianificato'
    );
    if (toDelete.length === 0) return;
    const ids = toDelete.map(s => s.id);
    try {
      const { error } = await supabase.from('shifts').delete().in('id', ids);
      if (error) throw error;
      const idSet = new Set(ids);
      setShifts(prev => prev.filter(s => !idSet.has(s.id)));
    } catch (error) {
      console.error("Error deleting template occurrences:", error);
      alert("Errore nella rimozione dei turni futuri in validazione");
    }
  };

  // Aggiunge un nuovo template anche alle settimane future già materializzate in validazione
  const propagateTemplateCreate = async (template: Shift) => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const weekStarts = new Set<string>();
    shifts.forEach(s => {
      if (s.isTemplate || !s.date || s.date < todayStr) return;
      weekStarts.add(format(startOfWeek(parseISO(s.date), { weekStartsOn: 1 }), 'yyyy-MM-dd'));
    });

    const wd = Math.min(Math.max((template.templateWeekday || weekdayOf(template.date)) - 1, 0), 5);
    for (const ws of weekStarts) {
      const date = format(addDays(parseISO(ws), wd), 'yyyy-MM-dd');
      const exists = shifts.some(s => !s.isTemplate && s.templateShiftId === template.id && s.date === date);
      if (exists) continue;
      const row = {
        id: Math.random().toString(36).slice(2, 11),
        tutor_id: template.tutorId,
        youth_id: template.youthId,
        date,
        start_time: template.startTime,
        end_time: template.endTime,
        activity: template.activity || '',
        status: 'pianificato',
        is_template: false,
        template_weekday: null,
        template_shift_id: template.id,
      };
      try {
        const { error } = await supabase.from('shifts').insert(row);
        if (error) throw error;
        setShifts(prev => [...prev, {
          id: row.id,
          tutorId: row.tutor_id,
          youthId: row.youth_id,
          date: row.date,
          startTime: row.start_time,
          endTime: row.end_time,
          activity: row.activity,
          status: row.status,
          isTemplate: false,
          templateWeekday: null,
          templateShiftId: row.template_shift_id,
        }]);
      } catch (error) {
        console.error("Error propagating template create:", error);
        alert("Errore nell'aggiunta del turno alle settimane future");
      }
    }
  };

  // --- Drag and Drop Handlers ---
  const handleDragStart = (e: React.DragEvent, shiftId: string) => {
    const s = shifts.find(x => x.id === shiftId);
    if (s && (s.status === 'effettuato' || s.status === 'cancellato')) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData("text/plain", shiftId);
    e.dataTransfer.effectAllowed = "move";
    setDraggedShiftId(shiftId);
  };

  const handleDragOver = (e: React.DragEvent, dateStr: string, minutes: number) => {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = "move";

    // Only update state if it changed to prevent excessive re-renders
    if (dragOverCoords?.dateStr !== dateStr || dragOverCoords?.minutes !== minutes) {
      setDragOverCoords({ dateStr, minutes });
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Optional: could add logic to clear dragOverCoords if leaving the grid entirely,
    // but clearing it on Drop is usually sufficient.
  };

  const handleDrop = async (e: React.DragEvent, dateStr: string, minutes: number) => {
    e.preventDefault();
    const shiftId = e.dataTransfer.getData("text/plain");

    if (shiftId) {
      const shiftToUpdate = shifts.find(s => s.id === shiftId);
      if (shiftToUpdate) {
        const [sh, sm] = (shiftToUpdate.startTime || '15:00').split(':').map(Number);
        const [eh, em] = (shiftToUpdate.endTime || '17:00').split(':').map(Number);
        const durationMin = (eh * 60 + em) - (sh * 60 + sm);
        const newStartMin = minutes;
        const newEndMin = newStartMin + (durationMin > 0 ? durationMin : 120);
        const fmt = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
        const newStartTime = fmt(newStartMin);
        const newEndTime = fmt(newEndMin);

        const updatedShift = { ...shiftToUpdate, date: dateStr, startTime: newStartTime, endTime: newEndTime };
        if (shiftToUpdate.isTemplate) {
          updatedShift.templateWeekday = weekdayOf(dateStr);
        }
        const dbUpdate: Record<string, any> = {
          date: dateStr,
          start_time: newStartTime,
          end_time: newEndTime,
        };
        if (shiftToUpdate.isTemplate) {
          dbUpdate.template_weekday = weekdayOf(dateStr);
        } else if ((shiftToUpdate.status || 'pianificato') === 'effettuato') {
          dbUpdate.actual_start_time = newStartTime;
          dbUpdate.actual_end_time = newEndTime;
          updatedShift.actualStartTime = newStartTime;
          updatedShift.actualEndTime = newEndTime;
        } else {
          dbUpdate.actual_start_time = null;
          dbUpdate.actual_end_time = null;
          updatedShift.actualStartTime = null;
          updatedShift.actualEndTime = null;
        }
        try {
          const { error } = await supabase.from('shifts').update(dbUpdate).eq('id', shiftId);
          if (error) throw error;
          setShifts(prevShifts => prevShifts.map(s => s.id === shiftId ? updatedShift : s));
          if (shiftToUpdate.isTemplate) {
            await syncTemplateOccurrences(updatedShift as Shift);
          }
        } catch (error) {
          console.error("Error updating shift drop:", error);
          alert("Errore spostamento turno");
        }
      }
    }
    setDraggedShiftId(null);
    setDragOverCoords(null);
  };

  // --- Views ---

  const hasPermission = (perm: string) => {
    if (!currentUser) return false;
    // Safety check: ensure permissions is an array
    const perms = Array.isArray(currentUser.permissions) ? currentUser.permissions : [];
    if (perms.includes('ALL')) return true;
    return perms.includes(perm);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setCurrentUser(null);
    setView('LOGIN');
  };

  const renderSidebar = () => (
    <>
      {/* Desktop Sidebar */}
      <div className="w-64 bg-slate-900 text-slate-100 flex flex-col h-screen fixed left-0 top-0 z-50 shadow-xl hidden md:flex">
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-blue-500">
            CentroCare
          </h1>
          <p className="text-xs text-slate-400 mt-1">Gestione Pianificazione</p>
          <div className="mt-4 flex items-center text-xs text-slate-300 bg-slate-800 p-2 rounded">
            <div className="w-6 h-6 bg-teal-600 rounded-full flex items-center justify-center mr-2 font-bold">
              {currentUser?.username?.charAt(0).toUpperCase() || '?'}
            </div>
            <span>{currentUser?.username || 'Utente'}</span>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {hasPermission('DASHBOARD') && (
            <button onClick={() => setView('DASHBOARD')} className={`flex items-center space-x-3 w-full p-3 rounded-lg transition-colors ${view === 'DASHBOARD' ? 'bg-teal-600 text-white' : 'hover:bg-slate-800'}`}>
              <CalendarIcon size={20} />
              <span>Pianificazione Turni</span>
            </button>
          )}
          {hasPermission('DASHBOARD') && (
            <button onClick={() => setView('VALIDATION')} className={`flex items-center space-x-3 w-full p-3 rounded-lg transition-colors ${view === 'VALIDATION' ? 'bg-teal-600 text-white' : 'hover:bg-slate-800'}`}>
              <ClipboardCheck size={20} />
              <span>Consuntivo Turni</span>
            </button>
          )}
          {hasPermission('TUTORS') && (
            <button onClick={() => setView('TUTORS')} className={`flex items-center space-x-3 w-full p-3 rounded-lg transition-colors ${view === 'TUTORS' ? 'bg-teal-600 text-white' : 'hover:bg-slate-800'}`}>
              <UserCheck size={20} />
              <span>Gestione Tutor</span>
            </button>
          )}
          {hasPermission('YOUTHS') && (
            <button onClick={() => setView('YOUTHS')} className={`flex items-center space-x-3 w-full p-3 rounded-lg transition-colors ${view === 'YOUTHS' ? 'bg-teal-600 text-white' : 'hover:bg-slate-800'}`}>
              <Users size={20} />
              <span>Anagrafica Ragazzi</span>
            </button>
          )}
          {hasPermission('SUMMARY') && (
            <button onClick={() => setView('SUMMARY')} className={`flex items-center space-x-3 w-full p-3 rounded-lg transition-colors ${view === 'SUMMARY' ? 'bg-teal-600 text-white' : 'hover:bg-slate-800'}`}>
              <BarChart3 size={20} />
              <span>Riepilogo Ore</span>
            </button>
          )}

          {hasPermission('ALL') && (
            <>
              <div className="border-t border-slate-700 my-2 pt-2"></div>
              <button onClick={() => setView('USER_MANAGEMENT')} className={`flex items-center space-x-3 w-full p-3 rounded-lg transition-colors ${view === 'USER_MANAGEMENT' ? 'bg-teal-600 text-white' : 'hover:bg-slate-800'}`}>
                <Settings size={20} />
                <span>Gestione Utenti</span>
              </button>
            </>
          )}
        </nav>
        <div className="p-4 border-t border-slate-700">
          <button onClick={handleLogout} className="flex items-center space-x-3 w-full p-3 rounded-lg hover:bg-red-900/30 text-slate-300 hover:text-red-400 transition-colors">
            <LogOut size={20} />
            <span>Disconnetti</span>
          </button>
        </div>
      </div>

      {/* Mobile Sidebar */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black bg-opacity-50" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="w-64 bg-slate-900 text-slate-100 flex flex-col h-screen shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-700 flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-blue-500">
                  CentroCare
                </h1>
                <p className="text-xs text-slate-400 mt-1">Gestione Pianificazione</p>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2">
                <X size={24} />
              </button>
            </div>
            <nav className="flex-1 p-4 space-y-2">
              {hasPermission('DASHBOARD') && (
                <button onClick={() => { setView('DASHBOARD'); setIsMobileMenuOpen(false); }} className={`flex items-center space-x-3 w-full p-3 rounded-lg transition-colors ${view === 'DASHBOARD' ? 'bg-teal-600 text-white' : 'hover:bg-slate-800'}`}>
                  <CalendarIcon size={20} />
                  <span>Pianificazione Turni</span>
                </button>
              )}
              {hasPermission('DASHBOARD') && (
                <button onClick={() => { setView('VALIDATION'); setIsMobileMenuOpen(false); }} className={`flex items-center space-x-3 w-full p-3 rounded-lg transition-colors ${view === 'VALIDATION' ? 'bg-teal-600 text-white' : 'hover:bg-slate-800'}`}>
                  <ClipboardCheck size={20} />
                  <span>Consuntivo Turni</span>
                </button>
              )}
              {/* ... other mobile items ... */}
              {/* Simplified for brevity, assume similar logic for mobile */}
              <button onClick={handleLogout} className="flex items-center space-x-3 w-full p-3 rounded-lg hover:bg-red-900/30 text-slate-300 hover:text-red-400 transition-colors mt-auto">
                <LogOut size={20} />
                <span>Disconnetti</span>
              </button>
            </nav>
          </div>
        </div>
      )}
    </>
  );

  const renderMobileHeader = () => (
    <div className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center sticky top-0 z-20">
      <span className="font-bold text-lg">CentroCare</span>
      <button onClick={() => setIsMobileMenuOpen(true)} className="p-2"><Menu /></button>
    </div>
  );

  const renderTutorsList = () => {
    const allTutors = Array.isArray(tutors) ? tutors : [];
    const counts = {
      tutti: allTutors.length,
      attivo: allTutors.filter(t => t.status === 'attivo').length,
      pausa: allTutors.filter(t => t.status === 'pausa').length,
      archiviato: allTutors.filter(t => t.status === 'archiviato').length,
    };

    const weekDateStrs = new Set(weekDays.map(d => format(d, 'yyyy-MM-dd')));
    const weekHoursByTutor: Record<string, number> = {};
    shifts.forEach(s => {
      if (!s.tutorId || !weekDateStrs.has(s.date)) return;
      weekHoursByTutor[s.tutorId] = (weekHoursByTutor[s.tutorId] || 0) + getEffectiveHours(s);
    });

    const q = tutorSearch.trim().toLowerCase();
    const filtered = allTutors.filter(t => {
      const matchQ = !q || (t.name || '').toLowerCase().includes(q);
      const matchStatus = tutorStatusFilter === 'tutti' || t.status === tutorStatusFilter;
      const matchRole = tutorRoleFilter === 'tutti' || t.role === tutorRoleFilter;
      return matchQ && matchStatus && matchRole;
    });
    const sorted = [...filtered].sort((a, b) =>
      tutorSort === 'asc'
        ? (a.name || '').localeCompare(b.name || '', 'it')
        : (b.name || '').localeCompare(a.name || '', 'it')
    );

    const hasActiveFilters = q !== '' || tutorStatusFilter !== 'tutti' || tutorRoleFilter !== 'tutti';
    const resetFilters = () => {
      setTutorSearch('');
      setTutorStatusFilter('tutti');
      setTutorRoleFilter('tutti');
    };

    const statusCounters = [
      { key: 'tutti' as const, label: 'Totali', count: counts.tutti, icon: Users, active: 'border-teal-500 bg-teal-50 ring-teal-200', idle: 'border-slate-200 hover:border-teal-300', iconCls: 'bg-gradient-to-br from-teal-500 to-emerald-600' },
      { key: 'attivo' as const, label: 'Attivi', count: counts.attivo, icon: CheckCircle, active: 'border-emerald-500 bg-emerald-50 ring-emerald-200', idle: 'border-slate-200 hover:border-emerald-300', iconCls: 'bg-emerald-500' },
      { key: 'pausa' as const, label: 'In pausa', count: counts.pausa, icon: Clock, active: 'border-amber-500 bg-amber-50 ring-amber-200', idle: 'border-slate-200 hover:border-amber-300', iconCls: 'bg-amber-500' },
      { key: 'archiviato' as const, label: 'Archiviati', count: counts.archiviato, icon: Archive, active: 'border-slate-400 bg-slate-100 ring-slate-200', idle: 'border-slate-200 hover:border-slate-400', iconCls: 'bg-slate-500' },
    ];

    const renderCrimBadge = (tutor: Tutor) => {
      const expiry = tutor.criminalRecordExpiry;
      if (!expiry) {
        return <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-red-100 text-red-700 border border-red-200">Casellario mancante</span>;
      }
      const daysLeft = Math.floor((parseISO(expiry).getTime() - Date.now()) / 86400000);
      if (daysLeft < 0) return <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-red-100 text-red-700 border border-red-200">Casellario scaduto</span>;
      if (daysLeft <= 30) return <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-amber-100 text-amber-700 border border-amber-200">Casellario: scade tra {daysLeft}g</span>;
      return <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">Casellario ok</span>;
    };

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Elenco Tutor</h2>
            <p className="text-sm text-slate-500 mt-0.5">Educatori e operatori del centro</p>
          </div>
          <button onClick={openNewTutorModal} className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white px-4 py-2.5 rounded-lg flex items-center shadow-md shadow-teal-200 transition-all">
            <Plus size={18} className="mr-2" /> Nuovo Tutor
          </button>
        </div>

        {/* Contatori stato */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {statusCounters.map(c => (
            <button
              key={c.key}
              onClick={() => setTutorStatusFilter(c.key)}
              className={`flex items-center gap-3 rounded-xl border bg-white p-4 text-left transition-all ring-2 ring-transparent ${tutorStatusFilter === c.key ? c.active : c.idle}`}
            >
              <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0 ${c.iconCls}`}>
                <c.icon size={18} />
              </span>
              <span>
                <span className="block text-2xl font-extrabold text-slate-800 leading-none">{c.count}</span>
                <span className="block text-xs font-medium text-slate-500 mt-1">{c.label}</span>
              </span>
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              className="w-full pl-9 pr-9 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-900 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition placeholder:text-slate-400"
              placeholder="Cerca per nome..."
              value={tutorSearch}
              onChange={e => setTutorSearch(e.target.value)}
            />
            {tutorSearch && (
              <button onClick={() => setTutorSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            )}
          </div>
          <button
            onClick={() => setTutorSort(s => s === 'asc' ? 'desc' : 'asc')}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 shadow-sm hover:border-teal-300 hover:text-teal-700 transition-all flex items-center gap-1.5"
            title={tutorSort === 'asc' ? 'Ordinamento crescente (A-Z)' : 'Ordinamento decrescente (Z-A)'}
          >
            {tutorSort === 'asc' ? <ArrowUp size={15} /> : <ArrowDown size={15} />}
            Nome {tutorSort === 'asc' ? 'A-Z' : 'Z-A'}
          </button>
          <div className="flex gap-1.5">
            {(['attivo', 'pausa', 'archiviato'] as const).map(s => (
              <button
                key={s}
                onClick={() => setTutorStatusFilter(cur => cur === s ? 'tutti' : s)}
                className={`px-3 py-2 rounded-full border text-xs font-semibold transition-all ${
                  tutorStatusFilter === s
                    ? s === 'pausa' ? 'bg-amber-500 text-white border-amber-600' : s === 'archiviato' ? 'bg-slate-500 text-white border-slate-600' : 'bg-emerald-500 text-white border-emerald-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-400'
                }`}
              >
                {s === 'attivo' ? 'Attivi' : s === 'pausa' ? 'In pausa' : 'Archiviati'}
              </button>
            ))}
          </div>
          <select
            className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            value={tutorRoleFilter}
            onChange={e => setTutorRoleFilter(e.target.value)}
          >
            <option value="tutti">Tutti i ruoli</option>
            {TUTOR_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <span className="px-3.5 py-2 rounded-full bg-slate-100 text-slate-600 text-sm font-semibold">
            {filtered.length} su {allTutors.length} profili
          </span>
        </div>

        {/* Griglia card */}
        {sorted.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sorted.map(tutor => {
              const color = getTutorColor(tutor.id, allTutors);
              const roleStyle = (tutor.role && ROLE_STYLES[tutor.role]) || ROLE_DEFAULT;
              const assignedHours = weekHoursByTutor[tutor.id] || 0;
              const maxHours = tutor.maxHoursPerWeek || 0;
              const pct = maxHours > 0 ? Math.round((assignedHours / maxHours) * 100) : 0;
              const barColor = pct > 100 ? 'bg-red-500' : pct >= 85 ? 'bg-amber-500' : 'bg-emerald-500';
              const unavailableText = tutor.unavailableDays?.map(d => DAYS_OF_WEEK[d === 0 ? 6 : d - 1]).join(', ');
              return (
                <Card key={tutor.id} className="overflow-hidden hover:shadow-xl transition-shadow group">
                  <div className={`h-1.5 bg-gradient-to-r ${
                    tutor.status === 'pausa' ? 'from-amber-400 to-orange-500'
                    : tutor.status === 'archiviato' ? 'from-slate-300 to-slate-400'
                    : 'from-blue-400 to-cyan-500'
                  }`}></div>
                  <div className="p-5 relative">
                    <div className="absolute top-4 right-4 flex space-x-2 items-center">
                      {tutor.status === 'pausa' && <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-amber-100 text-amber-700 border border-amber-200">Pausa</span>}
                      {tutor.status === 'archiviato' && <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-slate-200 text-slate-600 border border-slate-300">Archiviato</span>}
                      <button onClick={() => openEditTutorModal(tutor)} className="text-gray-300 hover:text-blue-500 transition-colors" title="Modifica">
                        <Edit size={18} />
                      </button>
                      <button onClick={() => handleDeleteTutor(tutor.id)} className="text-gray-300 hover:text-red-500 transition-colors" title="Elimina">
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <div className="flex items-center mb-4">
                      <div className={`w-12 h-12 ${color.bg} ${color.text} rounded-2xl flex items-center justify-center font-bold text-lg shadow-sm`}>
                        {tutor.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div className="ml-4 min-w-0">
                        <h3 className="font-bold text-lg text-slate-800 truncate">{tutor.name}</h3>
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          {tutor.role && (
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border inline-flex items-center gap-1 ${roleStyle.badge}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${roleStyle.dot}`}></span>
                              {tutor.role}
                            </span>
                          )}
                          {tutor.city && <span className="text-xs text-slate-400">{tutor.city}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Ore settimanali */}
                    <div className="mb-3">
                      <div className="flex justify-between items-center text-xs mb-1">
                        <span className="font-semibold text-slate-400 uppercase">Ore settimana</span>
                        <span className={`font-bold ${pct > 100 ? 'text-red-600' : 'text-slate-600'}`}>
                          {assignedHours.toFixed(1)} / {maxHours}h {pct > 100 && <span className="text-red-500">· oltre limite</span>}
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${Math.min(100, pct)}%` }}></div>
                      </div>
                    </div>

                    {/* Contatti */}
                    {(tutor.phone || tutor.email) && (
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-sm text-slate-600">
                        {tutor.phone && (
                          <a href={`tel:${tutor.phone.replace(/\s+/g, '')}`} className="inline-flex items-center gap-1 text-teal-700 hover:underline font-medium">
                            <Phone size={13} /> {tutor.phone}
                          </a>
                        )}
                        {tutor.email && (
                          <a href={`mailto:${tutor.email}`} className="inline-flex items-center gap-1 text-teal-700 hover:underline font-medium truncate max-w-[180px]">
                            <span className="text-slate-500"><UserCheck size={13} /></span> {tutor.email}
                          </a>
                        )}
                      </div>
                    )}

                    <div className="mb-3">
                      <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Specialità</p>
                      <div className="flex flex-wrap gap-1.5">
                        {tutor.specialties?.length ? tutor.specialties.map(s => (
                          <span key={s} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-100">{s}</span>
                        )) : <span className="text-xs text-slate-400 italic">Nessuna specialità</span>}
                      </div>
                    </div>

                    {unavailableText && (
                      <div className="mb-3 flex items-center gap-1.5 text-sm text-slate-600">
                        <Clock size={13} className="text-slate-400 shrink-0" />
                        <span>Non disponibile: <span className="font-medium text-slate-700">{unavailableText}</span></span>
                      </div>
                    )}

                    <div className="mb-1">{renderCrimBadge(tutor)}</div>

                    {tutor.notes && <p className="text-sm text-slate-500 italic mt-3 border-t pt-3">"{tutor.notes}"</p>}
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <UserX size={28} className="text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-700">Nessun tutor trovato</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              {hasActiveFilters
                ? "Nessun tutor corrisponde ai filtri attuali. Prova a modificare ricerca o filtri."
                : "Non ci sono ancora tutor. Crea il primo tutor per iniziare."}
            </p>
            {hasActiveFilters && (
              <button onClick={resetFilters} className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition shadow-sm">
                <FilterX size={15} /> Azzera filtri
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderYouthsList = () => {
    const allYouths = Array.isArray(youths) ? youths : [];
    const counts = {
      tutti: allYouths.length,
      attivo: allYouths.filter(y => y.status === 'attivo').length,
      pausa: allYouths.filter(y => y.status === 'pausa').length,
      archiviato: allYouths.filter(y => y.status === 'archiviato').length,
    };

    const q = youthSearch.trim().toLowerCase();
    const filtered = allYouths.filter(y => {
      const matchQ = !q || (y.name || '').toLowerCase().includes(q);
      const matchStatus = youthStatusFilter === 'tutti' || y.status === youthStatusFilter;
      const matchTutor = youthTutorFilter === 'tutti' || y.referringTutorId === youthTutorFilter;
      return matchQ && matchStatus && matchTutor;
    });
    const sorted = [...filtered].sort((a, b) =>
      youthSort === 'asc'
        ? (a.name || '').localeCompare(b.name || '', 'it')
        : (b.name || '').localeCompare(a.name || '', 'it')
    );

    const hasActiveFilters = q !== '' || youthStatusFilter !== 'tutti' || youthTutorFilter !== 'tutti';
    const resetFilters = () => {
      setYouthSearch('');
      setYouthStatusFilter('tutti');
      setYouthTutorFilter('tutti');
    };

    const statusCounters = [
      { key: 'tutti' as const, label: 'Totali', count: counts.tutti, icon: Users, active: 'border-teal-500 bg-teal-50 ring-teal-200', idle: 'border-slate-200 hover:border-teal-300', iconCls: 'bg-gradient-to-br from-teal-500 to-emerald-600' },
      { key: 'attivo' as const, label: 'Attivi', count: counts.attivo, icon: CheckCircle, active: 'border-emerald-500 bg-emerald-50 ring-emerald-200', idle: 'border-slate-200 hover:border-emerald-300', iconCls: 'bg-emerald-500' },
      { key: 'pausa' as const, label: 'In pausa', count: counts.pausa, icon: Clock, active: 'border-amber-500 bg-amber-50 ring-amber-200', idle: 'border-slate-200 hover:border-amber-300', iconCls: 'bg-amber-500' },
      { key: 'archiviato' as const, label: 'Archiviati', count: counts.archiviato, icon: Archive, active: 'border-slate-400 bg-slate-100 ring-slate-200', idle: 'border-slate-200 hover:border-slate-400', iconCls: 'bg-slate-500' },
    ];

    const cardTheme = (status?: string) => {
      switch (status) {
        case 'pausa': return { strip: 'from-amber-400 to-orange-500', avatar: 'bg-amber-100 text-amber-700', pill: 'bg-amber-50 text-amber-700 border-amber-100' };
        case 'archiviato': return { strip: 'from-slate-300 to-slate-400', avatar: 'bg-slate-200 text-slate-500', pill: 'bg-slate-100 text-slate-500 border-slate-200' };
        default: return { strip: 'from-emerald-400 to-teal-500', avatar: 'bg-emerald-100 text-emerald-700', pill: 'bg-emerald-50 text-emerald-700 border-emerald-100' };
      }
    };

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Elenco Ragazzi</h2>
            <p className="text-sm text-slate-500 mt-0.5">Anagrafiche dei minori e percorsi al centro</p>
          </div>
          <button onClick={openNewYouthModal} className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white px-4 py-2.5 rounded-lg flex items-center shadow-md shadow-teal-200 transition-all">
            <Plus size={18} className="mr-2" /> Nuovo Profilo
          </button>
        </div>

        {/* Contatori stato */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {statusCounters.map(c => (
            <button
              key={c.key}
              onClick={() => setYouthStatusFilter(c.key)}
              className={`flex items-center gap-3 rounded-xl border bg-white p-4 text-left transition-all ring-2 ring-transparent ${youthStatusFilter === c.key ? c.active : c.idle}`}
            >
              <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0 ${c.iconCls}`}>
                <c.icon size={18} />
              </span>
              <span>
                <span className="block text-2xl font-extrabold text-slate-800 leading-none">{c.count}</span>
                <span className="block text-xs font-medium text-slate-500 mt-1">{c.label}</span>
              </span>
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              className="w-full pl-9 pr-9 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-900 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition placeholder:text-slate-400"
              placeholder="Cerca per nome..."
              value={youthSearch}
              onChange={e => setYouthSearch(e.target.value)}
            />
            {youthSearch && (
              <button onClick={() => setYouthSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            )}
          </div>
          <button
            onClick={() => setYouthSort(s => s === 'asc' ? 'desc' : 'asc')}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 shadow-sm hover:border-teal-300 hover:text-teal-700 transition-all flex items-center gap-1.5"
            title={youthSort === 'asc' ? 'Ordinamento crescente (A-Z)' : 'Ordinamento decrescente (Z-A)'}
          >
            {youthSort === 'asc' ? <ArrowUp size={15} /> : <ArrowDown size={15} />}
            Nome {youthSort === 'asc' ? 'A-Z' : 'Z-A'}
          </button>
          <div className="flex gap-1.5">
            {(['attivo', 'pausa', 'archiviato'] as const).map(s => (
              <button
                key={s}
                onClick={() => setYouthStatusFilter(cur => cur === s ? 'tutti' : s)}
                className={`px-3 py-2 rounded-full border text-xs font-semibold transition-all ${
                  youthStatusFilter === s
                    ? s === 'pausa' ? 'bg-amber-500 text-white border-amber-600' : s === 'archiviato' ? 'bg-slate-500 text-white border-slate-600' : 'bg-emerald-500 text-white border-emerald-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-400'
                }`}
              >
                {s === 'attivo' ? 'Attivi' : s === 'pausa' ? 'In pausa' : 'Archiviati'}
              </button>
            ))}
          </div>
          <select
            className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            value={youthTutorFilter}
            onChange={e => setYouthTutorFilter(e.target.value)}
          >
            <option value="tutti">Tutti i referenti</option>
            {tutors.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <span className="px-3.5 py-2 rounded-full bg-slate-100 text-slate-600 text-sm font-semibold">
            {filtered.length} su {allYouths.length} profili
          </span>
        </div>

        {/* Griglia card */}
        {sorted.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sorted.map(youth => {
              const theme = cardTheme(youth.status);
              const refTutor = tutors.find(t => t.id === youth.referringTutorId);
              return (
                <Card key={youth.id} className="overflow-hidden hover:shadow-xl transition-shadow group">
                  <div className={`h-1.5 bg-gradient-to-r ${theme.strip}`}></div>
                  <div className="p-5 relative">
                    <div className="absolute top-4 right-4 flex space-x-2 items-center">
                      {youth.status === 'pausa' && <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-amber-100 text-amber-700 border border-amber-200">Pausa</span>}
                      {youth.status === 'archiviato' && <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-slate-200 text-slate-600 border border-slate-300">Archiviato</span>}
                      <button onClick={() => openEditYouthModal(youth)} className="text-gray-300 hover:text-blue-500 transition-colors" title="Modifica">
                        <Edit size={18} />
                      </button>
                      <button onClick={() => handleDeleteYouth(youth.id)} className="text-gray-300 hover:text-red-500 transition-colors" title="Elimina">
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <div className="flex items-center mb-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shadow-sm ${theme.avatar}`}>
                        {youth.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div className="ml-4 min-w-0">
                        <h3 className="font-bold text-lg text-slate-800 truncate">{youth.name}</h3>
                        <p className="text-sm text-slate-500">
                          {youth.requiredHoursPerWeek}h / settimana
                          {getAge(youth.birthDate) !== null && ` · ${getAge(youth.birthDate)} anni`}
                        </p>
                      </div>
                    </div>
                    <div className="mb-3 space-y-2.5">
                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Esigenze</p>
                        <div className="flex flex-wrap gap-1.5">
                          {youth.needs?.length ? youth.needs.map(n => (
                            <span key={n} className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs rounded-full border border-amber-100">{n}</span>
                          )) : <span className="text-xs text-slate-400 italic">Nessuna esigenza indicata</span>}
                        </div>
                      </div>
                      {youth.diagnoses?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Diagnosi</p>
                          <div className="flex flex-wrap gap-1.5">
                            {youth.diagnoses.map(d => (
                              <span key={d} className="px-2 py-0.5 bg-rose-50 text-rose-700 text-xs rounded-full border border-rose-100">{d}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {refTutor && (
                        <div className="flex items-center gap-1.5 text-sm text-slate-600">
                          <UserCheck size={14} className="text-teal-600 shrink-0" />
                          <span className="truncate">Referente: <span className="font-medium text-slate-700">{refTutor.name}</span></span>
                        </div>
                      )}
                    </div>
                    {(youth.parentName || youth.parentPhone) && (
                      <div className="text-sm text-slate-600 bg-slate-50 rounded-lg p-2.5 border border-slate-100 space-y-1">
                        {youth.parentName && <p><span className="font-medium">Genitore:</span> {youth.parentName}</p>}
                        {youth.parentPhone && (
                          <p className="flex items-center gap-1.5">
                            <span className="font-medium">Tel:</span>
                            <a href={`tel:${youth.parentPhone.replace(/\s+/g, '')}`} className="text-teal-700 hover:underline font-medium inline-flex items-center gap-1">
                              <Phone size={13} /> {youth.parentPhone}
                            </a>
                          </p>
                        )}
                      </div>
                    )}
                    {youth.notes && <p className="text-sm text-slate-500 italic mt-4 border-t pt-3">"{youth.notes}"</p>}
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <UserX size={28} className="text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-700">Nessun profilo trovato</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              {hasActiveFilters
                ? "Nessun ragazzo corrisponde ai filtri attuali. Prova a modificare ricerca o filtri."
                : "Non ci sono ancora profili. Crea il primo ragazzo/a per iniziare."}
            </p>
            {hasActiveFilters && (
              <button onClick={resetFilters} className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition shadow-sm">
                <FilterX size={15} /> Azzera filtri
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderCalendar = (mode: 'plan' | 'validate') => {
    const isPlan = mode === 'plan';
    const calendarDays = isPlan ? templateWeekDays : weekDays;
    return (
      <div className="space-y-4 md:space-y-6 h-[calc(100dvh-7rem)] md:h-[calc(100dvh-5rem)] flex flex-col">
        {/* Calendar Header Controls */}
        <div className="relative rounded-2xl bg-white shadow-md ring-1 ring-slate-200 shrink-0">
          <div className={`h-1.5 rounded-t-2xl ${isPlan ? 'bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-400' : 'bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-400'}`}></div>
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center px-5 py-4 gap-3">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl text-white shadow-md ${isPlan ? 'bg-gradient-to-br from-teal-500 to-emerald-600 shadow-teal-200' : 'bg-gradient-to-br from-indigo-500 to-violet-600 shadow-indigo-200'}`}>
                {isPlan ? <CalendarIcon size={20} /> : <ClipboardCheck size={20} />}
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-800 tracking-tight leading-tight">
                  {isPlan ? 'Pianificazione Turni' : 'Consuntivo Turni'}
                </h2>
                <p className="text-xs text-slate-400 font-medium">
                  {isPlan
                    ? 'Settimana tipo LUN-SAB · 08:00 – 19:00 · ripetuta ogni settimana'
                    : `Fascia oraria LUN-SAB · 08:00 – 19:00 · copia della pianificazione`}
                </p>
              </div>
              {!isPlan && (
                <div className="flex items-center gap-1 ml-1 lg:ml-3">
                  <button
                    onClick={() => setCurrentDate(d => addDays(d, -7))}
                    title="Settimana precedente"
                    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 hover:shadow-sm transition-all text-slate-600"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setCurrentDate(new Date())}
                    title="Torna alla settimana corrente"
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                      isSameDay(calendarDays[0], startOfWeek(new Date(), { weekStartsOn: 1 }))
                        ? 'text-teal-600 bg-teal-50 border border-teal-100'
                        : 'text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {format(calendarDays[0], 'dd MMM')} – {format(calendarDays[5], 'dd MMM yyyy')}
                  </button>
                  <button
                    onClick={() => setCurrentDate(d => addDays(d, 7))}
                    title="Settimana successiva"
                    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 hover:shadow-sm transition-all text-slate-600"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="relative" ref={tutorFilterRef}>
                <button
                  onClick={() => setIsTutorFilterOpen(o => !o)}
                  title="Filtra per tutor"
                  className={`px-4 py-2.5 bg-white rounded-xl flex items-center gap-2 border shadow-sm hover:shadow transition-all font-semibold text-sm ${
                    tutorFilter === 'all'
                      ? 'text-slate-600 border-slate-200 hover:bg-slate-50'
                      : 'text-teal-600 border-teal-200 hover:bg-teal-50'
                  }`}
                >
                  <Users size={16} className="shrink-0" />
                  <span className="max-w-[140px] truncate">
                    {tutorFilter === 'all' ? 'Tutti' : (tutors.find(t => t.id === tutorFilter)?.name || 'Tutti')}
                  </span>
                  <ChevronDown size={14} className={`shrink-0 transition-transform ${isTutorFilterOpen ? 'rotate-180' : ''}`} />
                </button>

                {isTutorFilterOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-slate-200 shadow-xl z-50 overflow-hidden py-1">
                    <button
                      onClick={() => { setTutorFilter('all'); setIsTutorFilterOpen(false); }}
                      className={`w-full flex items-center justify-between px-4 py-2 text-sm text-left hover:bg-slate-50 ${
                        tutorFilter === 'all' ? 'text-teal-600 font-bold' : 'text-slate-700 font-medium'
                      }`}
                    >
                      Tutti
                      {tutorFilter === 'all' && <Check size={14} className="text-teal-600" />}
                    </button>
                    <div className="my-1 h-px bg-slate-100" />
                    {tutors.map(t => {
                      const active = tutorFilter === t.id;
                      return (
                        <button
                          key={t.id}
                          onClick={() => { setTutorFilter(t.id); setIsTutorFilterOpen(false); }}
                          className={`w-full flex items-center justify-between px-4 py-2 text-sm text-left hover:bg-slate-50 ${
                            active ? 'text-teal-600 font-bold' : 'text-slate-700 font-medium'
                          }`}
                        >
                          {t.name}
                          {active && <Check size={14} className="text-teal-600" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              {isPlan && (
                <button
                  onClick={async () => {
                    if (!confirm("Sei sicuro di voler cancellare TUTTI i turni della pianificazione? Questa azione non può essere annullata!")) return;
                    try {
                      const { error } = await supabase.from('shifts').delete().eq('is_template', true);
                      if (error) throw error;
                      alert(`Turni pianificati cancellati con successo!`);
                      setShifts(prev => prev.filter(s => !s.isTemplate));
                    } catch (error) {
                      console.error(error);
                      alert("Errore durante la cancellazione");
                    }
                  }}
                  className="px-4 py-2.5 bg-white text-red-600 rounded-xl hover:bg-red-50 flex items-center gap-2 border border-red-200 shadow-sm hover:shadow transition-all font-semibold text-sm"
                >
                  <Trash2 size={16} />
                  Cancella Tutti
                </button>
              )}
              {isPlan && (
                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="px-4 py-2.5 bg-white text-indigo-600 rounded-xl hover:bg-indigo-50 flex items-center gap-2 border border-indigo-200 shadow-sm hover:shadow transition-all font-semibold text-sm"
                >
                  {isAnalyzing ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div> : <AlertTriangle size={16} />}
                  Analizza Conflitti
                </button>
              )}
              {isPlan && (
                <button
                  onClick={() => setShowConfirmClear(true)}
                  disabled={isGenerating}
                  className="px-4 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl hover:from-teal-600 hover:to-emerald-600 shadow-md shadow-teal-200/60 flex items-center gap-2 transition-all font-semibold text-sm hover:shadow-lg"
                >
                  {isGenerating ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <BrainCircuit size={16} />}
                  AI Auto-Planner
                </button>
              )}
            </div>
          </div>
        </div>

        {/* AI Analysis Result */}
        {analysisResult && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-auto animate-fadeIn shrink-0 max-h-[40%]">
            {/* Header with score */}
            <div className={`px-6 py-4 flex items-center justify-between ${
              analysisResult.score >= 80 ? 'bg-emerald-50 border-b border-emerald-200' :
              analysisResult.score >= 50 ? 'bg-amber-50 border-b border-amber-200' :
              'bg-red-50 border-b border-red-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${
                  analysisResult.score >= 80 ? 'bg-emerald-100' :
                  analysisResult.score >= 50 ? 'bg-amber-100' :
                  'bg-red-100'
                }`}>
                  {analysisResult.score >= 80 ? <CheckCircle className="h-6 w-6 text-emerald-600" /> :
                   analysisResult.score >= 50 ? <AlertTriangle className="h-6 w-6 text-amber-600" /> :
                   <XCircle className="h-6 w-6 text-red-600" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Analisi AI Conflitti</h3>
                  <p className="text-sm text-gray-600">{analysisResult.summary}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className={`text-3xl font-black ${
                    analysisResult.score >= 80 ? 'text-emerald-600' :
                    analysisResult.score >= 50 ? 'text-amber-600' :
                    'text-red-600'
                  }`}>{analysisResult.score}</div>
                  <div className="text-xs text-gray-500 font-medium">/ 100</div>
                </div>
                <button onClick={() => setAnalysisResult(null)} className="text-gray-400 hover:text-gray-600 p-1">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Score bar */}
            <div className="px-6 pt-3">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    analysisResult.score >= 80 ? 'bg-emerald-500' :
                    analysisResult.score >= 50 ? 'bg-amber-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${analysisResult.score}%` }}
                />
              </div>
            </div>

            {/* Stats bar */}
            <div className="px-6 py-3 flex gap-4 text-sm">
              {analysisResult.issues.filter(i => i.severity === 'error').length > 0 && (
                <span className="flex items-center gap-1 text-red-600 font-semibold">
                  <XCircle size={14} /> {analysisResult.issues.filter(i => i.severity === 'error').length} Errori
                </span>
              )}
              {analysisResult.issues.filter(i => i.severity === 'warning').length > 0 && (
                <span className="flex items-center gap-1 text-amber-600 font-semibold">
                  <AlertCircle size={14} /> {analysisResult.issues.filter(i => i.severity === 'warning').length} Avvisi
                </span>
              )}
              {analysisResult.issues.filter(i => i.severity === 'info').length > 0 && (
                <span className="flex items-center gap-1 text-blue-600 font-semibold">
                  <Info size={14} /> {analysisResult.issues.filter(i => i.severity === 'info').length} Suggerimenti
                </span>
              )}
              {analysisResult.issues.length === 0 && (
                <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                  <CheckCircle size={14} /> Nessun problema trovato!
                </span>
              )}
            </div>

            {/* Issues list */}
            {analysisResult.issues.length > 0 && (
              <div className="px-6 pb-4 space-y-2">
                {analysisResult.issues.map((issue, idx) => (
                  <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg border ${
                    issue.severity === 'error' ? 'bg-red-50 border-red-200' :
                    issue.severity === 'warning' ? 'bg-amber-50 border-amber-200' :
                    'bg-blue-50 border-blue-200'
                  }`}>
                    <div className={`mt-0.5 flex-shrink-0 ${
                      issue.severity === 'error' ? 'text-red-500' :
                      issue.severity === 'warning' ? 'text-amber-500' :
                      'text-blue-500'
                    }`}>
                      {issue.severity === 'error' ? <XCircle size={18} /> :
                       issue.severity === 'warning' ? <AlertCircle size={18} /> :
                       <Info size={18} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${
                          issue.severity === 'error' ? 'bg-red-100 text-red-700' :
                          issue.severity === 'warning' ? 'bg-amber-100 text-amber-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>{issue.category}</span>
                        <span className="font-semibold text-gray-900 text-sm">{issue.title}</span>
                      </div>
                      <p className="text-sm text-gray-700 mt-1">{issue.description}</p>
                      {issue.affectedDates && issue.affectedDates.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {issue.affectedDates.map((d, i) => (
                            <span key={i} className="text-xs bg-white border border-gray-200 rounded px-1.5 py-0.5 text-gray-600">{d}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Weekly Time Matrix */}
        <div className="flex-1 min-h-0 rounded-2xl bg-white shadow-md ring-1 ring-slate-200 overflow-hidden flex flex-col">
          <div className="overflow-auto flex-1 min-h-0">
            <table className="w-full min-w-[1000px] border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="sticky left-0 top-0 z-40 border-b border-r border-slate-200 bg-slate-50/80 backdrop-blur p-2 w-16">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Orario</span>
                  </th>
                  {['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB'].map((label, i) => {
                    const isToday = !isPlan && isSameDay(calendarDays[i], new Date());
                    return (
                      <th key={i} className={`sticky top-0 z-30 border-b border-r border-slate-200 p-3 text-center min-w-[138px] ${
                        isToday ? 'bg-gradient-to-b from-teal-50 to-white' : 'bg-slate-50/80'
                      }`}>
                        <div className="flex flex-col items-center gap-1">
                          <span className={`text-sm font-extrabold tracking-widest ${
                            isToday ? 'text-teal-600' : 'text-slate-600'
                          }`}>
                            {label}
                          </span>
                          {!isPlan && (
                            <span className={`text-[10px] font-semibold tabular-nums ${
                              isToday ? 'text-teal-600' : 'text-slate-400'
                            }`}>
                              {format(calendarDays[i], 'dd/MM')}
                            </span>
                          )}
                          {isToday && (
                            <span className="text-[9px] font-bold uppercase tracking-wide bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-full px-2 py-0.5 shadow-sm shadow-teal-200">
                              Oggi
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const DAY_START = 8 * 60; // 08:00
                  const DAY_END = 19 * 60; // 19:00
                  const SLOT = 15; // granularità 15 min
                  const ROW_COUNT = (DAY_END - DAY_START) / SLOT + 1; // 45: 44 slot + riga finale di bordo (19:00)
                  const ROW_H = 36; // altezza riga (h-9) in px
                  const fmt = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

                  // Per-day layout: card positions (slot index, span, column) per shift.
                  // Overlapping shifts are placed side by side via greedy interval coloring.
                  const dayLayouts = calendarDays.map((day, dayIdx) => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const dayShifts = shifts.filter(s => {
                      if (tutorFilter !== 'all' && s.tutorId !== tutorFilter) return false;
                      if (isPlan) {
                        return s.isTemplate && (s.templateWeekday || weekdayOf(s.date)) === dayIdx + 1;
                      }
                      if (!s.date || s.isTemplate) return false;
                      const shiftDate = typeof s.date === 'string' ? s.date.split('T')[0] : '';
                      return shiftDate === dateStr;
                    });

                    const placed = dayShifts
                      .map(s => {
                        const [sh, sm] = (s.startTime || '0:0').split(':').map(Number);
                        const [eh, em] = (s.endTime || '0:0').split(':').map(Number);
                        const startMin = sh * 60 + sm;
                        const endMin = Math.max(startMin + SLOT, eh * 60 + em);
                        let slotIdx = Math.round((startMin - DAY_START) / SLOT);
                        slotIdx = Math.max(0, Math.min(slotIdx, ROW_COUNT - 1));
                        const span = Math.max(1, Math.min(Math.ceil((endMin - startMin) / SLOT), ROW_COUNT - slotIdx));
                        return { shift: s, slotIdx, span };
                      })
                      .sort((a, b) => a.slotIdx - b.slotIdx);

                    // Greedy interval coloring: overlapping shifts get distinct columns,
                    // non-overlapping ones can reuse the first free column.
                    const colEnds: number[] = [];
                    const colOf: number[] = [];
                    placed.forEach(p => {
                      const startAbs = p.slotIdx * SLOT + DAY_START;
                      const endAbs = (p.slotIdx + p.span) * SLOT + DAY_START;
                      let col = colEnds.findIndex(e => e <= startAbs);
                      if (col === -1) {
                        col = colEnds.length;
                        colEnds.push(0);
                      }
                      colEnds[col] = Math.max(colEnds[col], endAbs);
                      colOf.push(col);
                    });

                    // Split into overlap clusters so each cluster rescales its own width:
                    // a lone shift keeps full width even if elsewhere events overlap.
                    const clusterOf: number[] = [];
                    const clusterMaxCol: number[] = [];
                    let clusterIdx = -1;
                    let clusterEnd = -1;
                    placed.forEach((p, idx) => {
                      const startAbs = p.slotIdx * SLOT + DAY_START;
                      const endAbs = (p.slotIdx + p.span) * SLOT + DAY_START;
                      if (startAbs >= clusterEnd) {
                        clusterIdx += 1;
                        clusterEnd = -1;
                        clusterMaxCol.push(0);
                      }
                      clusterEnd = Math.max(clusterEnd, endAbs);
                      clusterOf.push(clusterIdx);
                      clusterMaxCol[clusterIdx] = Math.max(clusterMaxCol[clusterIdx], colOf[idx]);
                    });

                    return {
                      dateStr,
                      placed,
                      colOf,
                      clusterOf,
                      clusterMaxCol,
                    };
                  });

                  return Array.from({ length: ROW_COUNT }).map((_, rowIdx) => {
                    const minutes = DAY_START + rowIdx * SLOT;
                    const slotLabel = fmt(minutes);
                    const isHour = minutes % 60 === 0;
                    const isBand = Math.floor(minutes / 60) % 2 === 0;
                    const topBorderCls = isHour
                      ? 'border-t-2 border-slate-300'
                      : 'border-t border-dashed border-slate-200';

                    return (
                      <tr key={rowIdx} className="h-9">
                        <td className={`sticky left-0 z-20 border-r border-slate-200 w-16 text-center align-top relative ${
                          isBand ? 'bg-slate-100/70' : 'bg-white'
                        } ${topBorderCls}`}>
                          <span
                            className={`absolute left-0 right-0 block text-center leading-none tabular-nums ${
                              isHour ? 'text-[13px] font-bold text-slate-600' : 'text-[11px] text-slate-400'
                            }`}
                            style={{ top: rowIdx === 0 ? 4 : (isHour ? -2 : -1), transform: rowIdx === 0 ? 'none' : 'translateY(-50%)' }}
                          >
                            {slotLabel}
                          </span>
                        </td>
                        {dayLayouts.map((layout, i) => {
                          const isDragOver = dragOverCoords?.dateStr === layout.dateStr && dragOverCoords?.minutes === minutes;

                          return (
                            <td
                              key={i}
                              onDragOver={(e) => handleDragOver(e, layout.dateStr, minutes)}
                              onDrop={(e) => handleDrop(e, layout.dateStr, minutes)}
                              onClick={() => isPlan
                                ? openNewTemplateShiftModal(i + 1, slotLabel)
                                : openNewShiftModal(tutorFilter === 'all' ? '' : tutorFilter, layout.dateStr, slotLabel)}
                              className={`relative border-r border-slate-200 align-top transition-all duration-150 group/slot ${topBorderCls} ${
                                isBand ? 'bg-slate-50/40' : 'bg-white'
                              } ${
                                isDragOver
                                  ? 'bg-teal-50 ring-2 ring-inset ring-teal-400 rounded-lg shadow-inner'
                                  : 'hover:bg-teal-50/30'
                              }`}
                            >
                              {!layout.placed.some(p => p.slotIdx <= rowIdx && rowIdx < p.slotIdx + p.span) && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); isPlan
                                    ? openNewTemplateShiftModal(i + 1, slotLabel)
                                    : openNewShiftModal(tutorFilter === 'all' ? '' : tutorFilter, layout.dateStr, slotLabel); }}
                                  className="absolute top-0.5 right-0.5 z-20 w-5 h-5 rounded-md bg-white/95 border border-slate-200 text-slate-400 hover:text-teal-600 hover:border-teal-300 shadow-sm flex items-center justify-center opacity-0 group-hover/slot:opacity-100 transition-opacity"
                                >
                                  <Plus size={12} />
                                </button>
                              )}

                              {rowIdx === 0 && (
                                <div
                                  className="absolute z-10 pointer-events-none"
                                  style={{ top: -2, right: -1, left: 0, height: ROW_COUNT * ROW_H }}
                                >
                                  {layout.placed.map((p, idx) => {
                                    const shift = p.shift;
                                    const shiftStatus = shift.status || 'pianificato';
                                    const effettuato = shiftStatus === 'effettuato';
                                    const shiftLocked = effettuato || shiftStatus === 'cancellato';
                                    const tutor = tutors.find(t => t.id === shift.tutorId);
                                    const youth = youths.find(y => y.id === shift.youthId);
                                    const isDragging = draggedShiftId === shift.id;
                                    const tColor = getTutorColor(shift.tutorId, tutors);
                                    const yColor = getYouthColor(shift.youthId, youths);
                                    const col = layout.colOf[idx];
                                    const wPct = 100 / (layout.clusterMaxCol[layout.clusterOf[idx]] + 1);

                                    return (
                                      <div
                                        key={shift.id}
                                        draggable={!shiftLocked}
                                        onDragStart={(e) => handleDragStart(e, shift.id)}
                                        onClick={(e) => { e.stopPropagation(); openShiftModal(shift, isPlan ? 'plan' : 'validate'); }}
                                        className={`absolute pointer-events-auto rounded-md ${yColor.bg} border ${yColor.border} border-l-4 ${tColor.border} p-2 text-[13px] ${shiftLocked ? 'cursor-default' : 'cursor-move'} shadow-sm hover:shadow-md overflow-hidden group/item
                                          ${resizingShiftId === shift.id ? 'transition-none cursor-ns-resize' : 'transition-all duration-150'}
                                          ${isDragging ? 'opacity-40 scale-95' : 'opacity-100'}
                                          ${shiftStatus === 'cancellato' ? 'opacity-45 grayscale' : ''}
                                        `}
                                        style={{
                                          top: p.slotIdx * ROW_H + 1,
                                          height: p.span * ROW_H - 2,
                                          left: `${col * wPct}%`,
                                          width: `calc(${wPct}% - 2px)`,
                                        }}
                                      >
                                        {effettuato && (
                                          <div className="absolute inset-0 bg-emerald-300/40 pointer-events-none z-0"></div>
                                        )}
                                        {effettuato && (
                                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 overflow-hidden">
                                            <span className="uppercase font-black text-emerald-800/70 text-base sm:text-lg tracking-[0.3em] rotate-[-20deg] border-[3px] border-emerald-700/60 rounded-xl px-4 py-1 select-none whitespace-nowrap">
                                              Effettivo
                                            </span>
                                          </div>
                                        )}
                                        <div className="flex h-full flex-col min-w-0 relative z-10">
                                          <div className="flex items-center gap-1.5 shrink-0">
                                            <span className={`h-5 w-5 shrink-0 rounded-full ${tColor.bg} ${tColor.text} text-[10px] font-bold flex items-center justify-center shadow-sm`}>
                                              {getInitials(tutor?.name)}
                                            </span>
                                            <span className={`truncate font-bold text-slate-800 pointer-events-none text-[14px] leading-tight ${shiftStatus === 'cancellato' ? 'line-through' : ''}`}>
                                              {tutor?.name || 'Sconosciuto'}
                                            </span>
                                            {shiftStatus === 'cancellato' && (
                                              <span className="shrink-0 px-1.5 py-px rounded bg-red-100 text-red-600 text-[10px] font-bold uppercase">Annullato</span>
                                            )}
                                            <button
                                              onClick={(e) => { e.stopPropagation(); handleDeleteShift(shift.id); }}
                                              className="ml-auto opacity-0 group-hover/item:opacity-100 text-red-400 hover:text-red-600 shrink-0"
                                            >
                                              <Trash2 size={13} />
                                            </button>
                                          </div>

                                          <div className="my-1.5 h-px bg-white/70 shrink-0" />

                                          <div className="min-w-0 flex flex-col gap-1.5">
                                            <div className="flex items-center gap-1 min-w-0">
                                              <span className="shrink-0 rounded bg-white/70 border border-slate-300 px-1 py-px text-[9px] font-bold uppercase tracking-wide text-slate-600 leading-tight">
                                                Prog.
                                              </span>
                                              <span className={`rounded bg-white/80 px-1.5 py-px text-[13px] font-bold text-slate-700 tabular-nums pointer-events-none truncate ${shiftStatus === 'cancellato' ? 'line-through' : ''}`}>
                                                {shift.startTime}–{shift.endTime}
                                              </span>
                                            </div>

                                            {shiftStatus === 'effettuato' && shift.actualStartTime && (
                                              <div className="flex items-center gap-1 min-w-0">
                                                <span className="shrink-0 rounded bg-emerald-200/90 border border-emerald-400 px-1 py-px text-[9px] font-bold uppercase tracking-wide text-emerald-800 leading-tight">
                                                  Effett.
                                                </span>
                                                <span className="rounded bg-white/70 px-1.5 py-px text-[13px] font-bold text-emerald-800 tabular-nums pointer-events-none truncate">
                                                  {shift.actualStartTime}–{shift.actualEndTime}
                                                </span>
                                              </div>
                                            )}

                                            <div className="flex items-center gap-1.5 min-w-0">
                                              <span className={`h-2 w-2 rounded-full ${yColor.badge} shrink-0`}></span>
                                              <span className={`truncate font-semibold text-slate-600 pointer-events-none ${shiftStatus === 'cancellato' ? 'line-through' : ''}`}>
                                                {youth?.name || 'Sconosciuto'}
                                              </span>
                                            </div>

                                            {shift.activity && (
                                              <div className="truncate italic text-slate-500 pointer-events-none">
                                                {shift.activity}
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        {!shiftLocked && (
                                        <div
                                          className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize flex items-center justify-center"
                                          onPointerDown={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            e.currentTarget.setPointerCapture(e.pointerId);
                                            const [eh, em] = (shift.endTime || '0:0').split(':').map(Number);
                                            resizeRef.current = { shiftId: shift.id, startEndMin: eh * 60 + em, startY: e.clientY, endMin: null };
                                            setResizingShiftId(shift.id);
                                          }}
                                          onPointerMove={(e) => {
                                            const r = resizeRef.current;
                                            if (!r || r.shiftId !== shift.id) return;
                                            e.preventDefault();
                                            const deltaSlots = Math.round((e.clientY - r.startY) / ROW_H);
                                            const [sh, sm] = (shift.startTime || '0:0').split(':').map(Number);
                                            const startMin = sh * 60 + sm;
                                            const newEndMin = Math.max(startMin + SLOT, Math.min(r.startEndMin + deltaSlots * SLOT, DAY_END));
                                            if (r.endMin !== newEndMin) {
                                              r.endMin = newEndMin;
                                              const nEnd = fmt(newEndMin);
                                              setShifts(prev => prev.map(s => s.id === shift.id ? { ...s, endTime: nEnd } : s));
                                            }
                                          }}
                                          onPointerUp={(e) => {
                                            const r = resizeRef.current;
                                            if (!r || r.shiftId !== shift.id) return;
                                            e.preventDefault();
                                            try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* noop */ }
                                            const endMin = r.endMin ?? r.startEndMin;
                                            resizeRef.current = null;
                                            setResizingShiftId(null);
                                            const nEnd = fmt(endMin);
                                            setShifts(prev => prev.map(s => s.id === shift.id ? { ...s, endTime: nEnd } : s));
                                            const dbResize: Record<string, any> = { end_time: nEnd };
                                            if (!shift.isTemplate && (shift.status || 'pianificato') === 'effettuato') {
                                              dbResize.actual_end_time = nEnd;
                                            } else if (!shift.isTemplate) {
                                              dbResize.actual_end_time = null;
                                            }
                                            supabase.from('shifts').update(dbResize).eq('id', shift.id)
                                              .then(async ({ error }) => {
                                                if (error) {
                                                  console.error('Error resizing shift:', error);
                                                  alert('Errore ridimensionamento turno');
                                                  return;
                                                }
                                                if (shift.isTemplate) {
                                                  await syncTemplateOccurrences({ ...shift, endTime: nEnd } as Shift);
                                                }
                                              });
                                          }}
                                          onPointerCancel={(e) => {
                                            const r = resizeRef.current;
                                            if (!r || r.shiftId !== shift.id) return;
                                            try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* noop */ }
                                            resizeRef.current = null;
                                            setResizingShiftId(null);
                                          }}
                                          onClick={(e) => e.stopPropagation()}
                                          onDragStart={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                        >
                                          <div className="w-5 h-1 rounded-full bg-slate-500/80 opacity-0 group-hover/item:opacity-100 transition-opacity pointer-events-none" />
                                        </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderSummary = () => {
    // Helper to calculate hours from "HH:mm" - "HH:mm"
    const getHours = (start: string, end: string) => {
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      return ((eh * 60 + em) - (sh * 60 + sm)) / 60;
    };

    // Filter shifts based on selected date range (solo turni reali validabili, niente template)
    const filteredShifts = shifts.filter(s => {
      if (s.isTemplate || !s.date) return false;
      const d = typeof s.date === 'string' ? s.date.split('T')[0] : s.date;
      return d >= summaryStartDate && d <= summaryEndDate;
    });
    const templateShifts = shifts.filter(s => s.isTemplate && s.startTime && s.endTime);

    // Pianificato = ore del template (settimana tipo) per ogni giorno nel periodo.
    // Validato (consuntivo) = solo turni effettuati (effettivi), cancellati = 0, non ancora validati = 0.
    const buildSummary = (person: { id: string; name?: string; maxHoursPerWeek?: number; requiredHoursPerWeek?: number }, type: 'TUTOR' | 'YOUTH') => {
      const targetHours = type === 'TUTOR' ? person.maxHoursPerWeek || 0 : person.requiredHoursPerWeek || 0;
      const personShifts = filteredShifts.filter(s => s.tutorId === person.id || s.youthId === person.id);
      const personTpl = templateShifts.filter(s => s.tutorId === person.id || s.youthId === person.id);

      const monthlyHours: Record<string, number> = {};
      const weeklyHours: Record<string, number> = {};
      const plannedMonthlyHours: Record<string, number> = {};
      const plannedWeeklyHours: Record<string, number> = {};

      const startD = parseISO(summaryStartDate);
      const endD = parseISO(summaryEndDate);
      if (!isNaN(startD.getTime()) && !isNaN(endD.getTime())) {
        for (let cursor = new Date(startD); cursor <= endD; cursor = addDays(cursor, 1)) {
          const dateStr = format(cursor, 'yyyy-MM-dd');
          const monthKey = format(cursor, 'MMMM yyyy', { locale: it });
          const weekKey = `Settimana ${getISOWeek(cursor)} (${getYear(cursor)})`;
          const dow = (cursor.getDay() + 6) % 7; // 0=LUN..6=SAB

          if (dow < 6) {
            const wd = dow + 1;
            const planned = personTpl
              .filter(s => (s.templateWeekday || weekdayOf(s.date)) === wd)
              .reduce((acc, s) => acc + getHours(s.startTime, s.endTime), 0);
            if (planned > 0) {
              plannedMonthlyHours[monthKey] = (plannedMonthlyHours[monthKey] || 0) + planned;
              plannedWeeklyHours[weekKey] = (plannedWeeklyHours[weekKey] || 0) + planned;
            }
          }

          const validated = personShifts
            .filter(s => s.date === dateStr && s.startTime && s.endTime)
            .reduce((acc, s) => acc + getValidatedHours(s), 0);
          if (validated > 0) {
            monthlyHours[monthKey] = (monthlyHours[monthKey] || 0) + validated;
            weeklyHours[weekKey] = (weeklyHours[weekKey] || 0) + validated;
          }
        }
      }

      return {
        id: person.id,
        name: person.name || '?',
        targetHours,
        monthlyHours,
        weeklyHours,
        plannedMonthlyHours,
        plannedWeeklyHours,
        type
      };
    };

    const summaryData = summaryViewMode === 'TUTORS'
      ? tutors.map(t => buildSummary(t, 'TUTOR'))
      : youths.map(y => buildSummary(y, 'YOUTH'));

    return (
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-slate-800">Riepilogo Ore</h2>
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setSummaryViewMode('TUTORS')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${summaryViewMode === 'TUTORS' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Tutor
              </button>
              <button
                onClick={() => setSummaryViewMode('YOUTHS')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${summaryViewMode === 'YOUTHS' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Ragazzi
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-gray-200">
              <div className="flex flex-col">
                <label className="text-[10px] text-slate-500 font-bold uppercase ml-1">Dal</label>
                <input
                  type="date"
                  value={summaryStartDate}
                  onChange={e => setSummaryStartDate(e.target.value)}
                  className="border-none bg-transparent text-slate-700 focus:ring-0 p-0 text-sm"
                />
              </div>
              <div className="h-8 w-px bg-gray-300 mx-1"></div>
              <div className="flex flex-col">
                <label className="text-[10px] text-slate-500 font-bold uppercase ml-1">Al</label>
                <input
                  type="date"
                  value={summaryEndDate}
                  onChange={e => setSummaryEndDate(e.target.value)}
                  className="border-none bg-transparent text-slate-700 focus:ring-0 p-0 text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {summaryData.map(data => (
            <Card key={data.id} className={`p-6 ${data.type === 'YOUTH' ? 'border-l-4 border-l-amber-400' : ''}`}>
              <div className="flex items-center mb-4 border-b pb-4">
                <div className={`w-10 h-10 ${data.type === 'TUTOR' ? 'bg-teal-100 text-teal-700' : 'bg-amber-100 text-amber-700'} rounded-full flex items-center justify-center font-bold mr-3`}>
                  {data.name?.charAt(0) || '?'}
                </div>
                <h3 className="text-xl font-bold text-slate-800">{data.name}</h3>
                <span className="ml-auto text-sm text-slate-500">
                  {data.type === 'TUTOR' ? 'Max' : 'Richiesto'}: {data.targetHours}h/sett
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h4 className="font-semibold text-slate-600 mb-3 flex items-center">
                    <CalendarIcon size={16} className="mr-2" /> Per Mese
                  </h4>
                  <div className="space-y-2">
                    {(() => {
                      const keys = Array.from(new Set([...Object.keys(data.monthlyHours), ...Object.keys(data.plannedMonthlyHours)]));
                      return keys.length > 0 ? (
                        keys.map(month => {
                          const hrs = Number(data.monthlyHours[month] || 0);
                          const planned = Number(data.plannedMonthlyHours[month] || 0);
                          const delta = hrs - planned;
                          return (
                            <div key={month} className="flex justify-between items-center bg-slate-50 p-2 rounded">
                              <span className="capitalize text-slate-700">{month}</span>
                              <span className="flex items-center gap-2">
                                <span className="text-[10px] font-semibold text-slate-400 tabular-nums">Pian {planned.toFixed(1)}h</span>
                                {Math.abs(delta) > 0.01 && (
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${delta >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                                    {delta >= 0 ? '+' : ''}{delta.toFixed(1)}h
                                  </span>
                                )}
                                <span className={`font-bold ${data.type === 'TUTOR' ? 'text-teal-600' : 'text-amber-600'}`}>{hrs.toFixed(1)}h</span>
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-sm text-slate-400 italic">Nessun dato mensile</p>
                      );
                    })()}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-600 mb-3 flex items-center">
                    <Clock size={16} className="mr-2" /> Per Settimana
                  </h4>
                  <div className="space-y-2">
                    {(() => {
                      const keys = Array.from(new Set([...Object.keys(data.weeklyHours), ...Object.keys(data.plannedWeeklyHours)]));
                      return keys.length > 0 ? (
                        keys.map(week => {
                          const hrs = Number(data.weeklyHours[week] || 0);
                          const isOverLimit = data.type === 'TUTOR' && hrs > data.targetHours;
                          const isUnderTarget = data.type === 'YOUTH' && hrs < data.targetHours;
                          const planned = Number(data.plannedWeeklyHours[week] || 0);
                          const delta = hrs - planned;

                          let textColor = 'text-teal-600';
                          if (data.type === 'YOUTH') textColor = 'text-amber-600';
                          if (isOverLimit) textColor = 'text-red-500';
                          if (isUnderTarget) textColor = 'text-orange-500';

                          return (
                            <div key={week} className="flex justify-between items-center bg-slate-50 p-2 rounded">
                              <span className="text-slate-700">{week}</span>
                              <span className="flex items-center gap-2">
                                <span className="text-[10px] font-semibold text-slate-400 tabular-nums">Pian {planned.toFixed(1)}h</span>
                                {Math.abs(delta) > 0.01 && (
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${delta >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                                    {delta >= 0 ? '+' : ''}{delta.toFixed(1)}h
                                  </span>
                                )}
                                <span className={`font-bold ${textColor}`}>
                                  {hrs.toFixed(1)}h
                                  {isOverLimit && <AlertTriangle size={14} className="inline ml-1" />}
                                  {isUnderTarget && <AlertTriangle size={14} className="inline ml-1" />}
                                </span>
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-sm text-slate-400 italic">Nessun dato settimanale</p>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  // --- Main Render ---

  if (view === 'LOGIN') {
    return (
      <LoginView
        onLoginSuccess={(data) => {
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          setToken(data.token);
          setCurrentUser(data.user);
          setView('DASHBOARD');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      {renderSidebar()}

      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        {renderMobileHeader()}

        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {isLoading && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-8 shadow-xl text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-teal-600 mx-auto mb-4"></div>
                <p className="text-lg font-semibold text-slate-700">Caricamento dati...</p>
                {loadError && <p className="text-sm text-amber-600 mt-2">{loadError}</p>}
              </div>
            </div>
          )}

          {view === 'DASHBOARD' && renderCalendar('plan')}
          {view === 'VALIDATION' && renderCalendar('validate')}
          {view === 'TUTORS' && renderTutorsList()}
          {view === 'YOUTHS' && renderYouthsList()}
          {view === 'SUMMARY' && renderSummary()}
          {view === 'USER_MANAGEMENT' && <UserManagementView />}
        </main>
      </div>

      {/* --- Modals --- */}

      {/* Confirm Clear Week Modal */}
      <Modal isOpen={showConfirmClear} onClose={() => setShowConfirmClear(false)} title="Conferma generazione turni">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 rounded-full flex-shrink-0 mt-0.5">
              <AlertTriangle size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-700">
                Vuoi <strong>cancellare i turni della pianificazione</strong> prima di generare la nuova settimana tipo con l'AI?
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Verrà sostituita solo la pianificazione (settimana tipo). I turni già validati non verranno toccati.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => handleGenerateSchedule(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              No, sovrapponi
            </button>
            <button
              onClick={() => handleGenerateSchedule(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
            >
              Si, cancella e rigenera
            </button>
          </div>
        </div>
      </Modal>

      {/* Shift Modal */}
      <Modal isOpen={isShiftModalOpen} onClose={() => setIsShiftModalOpen(false)} title={editingShift?.id ? "Modifica Turno" : "Nuovo Turno"} size="lg">
        <div className="space-y-4">
          {/* Header */}
          <div className="rounded-xl overflow-hidden shadow-sm ring-1 ring-slate-200">
            <div className="h-2 bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-400"></div>
            <div className="flex items-center gap-4 px-5 py-4 bg-gradient-to-br from-slate-50 to-white">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center text-xl font-bold shadow-md shrink-0">
                {getInitials(tutors.find(t => t.id === editingShift?.tutorId)?.name)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-slate-800 truncate">
                  {editingShift?.tutorId ? (tutors.find(t => t.id === editingShift.tutorId)?.name || 'Tutor') : 'Nuovo Turno'}
                </h3>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {editingShift?.youthId && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
                      {youths.find(y => y.id === editingShift.youthId)?.name || 'Ragazzo'}
                    </span>
                  )}
                  {editingShift?.startTime && (
                    <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 text-xs font-semibold tabular-nums">
                      {editingShift.startTime}–{editingShift.endTime}
                    </span>
                  )}
                  {(editingShift?.status || 'pianificato') === 'cancellato' && (
                    <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold">Annullato</span>
                  )}
                  {(editingShift?.status || 'pianificato') === 'effettuato' && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">Effettuato</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <YouthSection icon={<CalendarIcon size={16} />} title="Programmazione" chipBg="bg-teal-500" headerBg="bg-gradient-to-r from-teal-50 to-white border-teal-100" textColor="text-teal-700">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tutor <span className="text-red-500">*</span></label>
                <select
                  className={fieldCls}
                  value={editingShift?.tutorId}
                  onChange={e => setEditingShift({ ...editingShift, tutorId: e.target.value })}
                >
                  <option value="">Seleziona Tutor</option>
                  {tutors.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ragazzo/a <span className="text-red-500">*</span></label>
                <select
                  className={fieldCls}
                  value={editingShift?.youthId}
                  onChange={e => setEditingShift({ ...editingShift, youthId: e.target.value })}
                >
                  <option value="">Seleziona Ragazzo/a</option>
                  {youths.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                </select>
              </div>
              {shiftModalMode === 'plan' ? (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Giorno <span className="text-red-500">*</span></label>
                  <select
                    className={fieldCls}
                    value={editingShift?.templateWeekday ?? weekdayOf(editingShift?.date)}
                    onChange={e => {
                      const wd = parseInt(e.target.value, 10);
                      setEditingShift({
                        ...editingShift,
                        templateWeekday: wd,
                        date: format(addDays(TEMPLATE_ANCHOR, wd - 1), 'yyyy-MM-dd'),
                      });
                    }}
                  >
                    {['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'].map((d, i) => (
                      <option key={i} value={i + 1}>{d}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Data <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    className={fieldCls}
                    value={editingShift?.date}
                    onChange={e => setEditingShift({ ...editingShift, date: e.target.value })}
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Attività</label>
                <input
                  type="text"
                  className={fieldCls}
                  placeholder="Es. Compiti"
                  value={editingShift?.activity}
                  onChange={e => setEditingShift({ ...editingShift, activity: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Inizio pianificato <span className="text-red-500">*</span></label>
                <input
                  type="time"
                  className={fieldCls + (shiftModalMode === 'validate' ? ' bg-slate-100' : '')}
                  readOnly={shiftModalMode === 'validate'}
                  value={editingShift?.startTime}
                  onChange={e => setEditingShift({ ...editingShift, startTime: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Fine pianificata <span className="text-red-500">*</span></label>
                <input
                  type="time"
                  className={fieldCls + (shiftModalMode === 'validate' ? ' bg-slate-100' : '')}
                  readOnly={shiftModalMode === 'validate'}
                  value={editingShift?.endTime}
                  onChange={e => setEditingShift({ ...editingShift, endTime: e.target.value })}
                />
              </div>
            </div>
            {shiftModalMode === 'validate' && (
              <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700 flex items-center gap-2">
                <MousePointer2 size={14} />
                Gli orari si modificano <strong>trascinando il box</strong> direttamente sul calendario.
              </div>
            )}
          </YouthSection>

          {editingShift?.id && shiftModalMode === 'validate' && (
            <YouthSection icon={<CheckCircle size={16} />} title="Consuntivo" chipBg="bg-emerald-500" headerBg="bg-gradient-to-r from-emerald-50 to-white border-emerald-100" textColor="text-emerald-700">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Esito del turno</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(() => {
                      const st = editingShift.status || 'pianificato';
                      const effOn = st === 'effettuato';
                      const cancOn = st === 'cancellato';
                      return (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              const turningOn = !effOn;
                              setEditingShift({
                                ...editingShift,
                                status: turningOn ? 'effettuato' : 'pianificato',
                                actualStartTime: turningOn ? editingShift.startTime : editingShift.actualStartTime,
                                actualEndTime: turningOn ? editingShift.endTime : editingShift.actualEndTime,
                              });
                            }}
                            className={`rounded-xl border-2 px-4 py-3 text-left transition ${
                              effOn
                                ? 'border-emerald-500 bg-emerald-500 text-white shadow-md'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:bg-emerald-50'
                            } ${cancOn ? 'opacity-40' : ''}`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold flex items-center gap-2">
                                <span className={`w-6 h-6 rounded-md flex items-center justify-center ${effOn ? 'bg-white/20' : 'bg-emerald-100 text-emerald-600'}`}>
                                  {effOn ? <Check size={14} /> : <Play size={14} />}
                                </span>
                                Effettuato
                              </span>
                              <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${effOn ? 'bg-white/25' : 'bg-slate-100 text-slate-500'}`}>
                                {effOn ? 'ON' : 'OFF'}
                              </span>
                            </div>
                            <p className={`text-xs mt-1.5 leading-snug ${effOn ? 'text-white/85' : 'text-slate-400'}`}>
                              {effOn ? (
                                <>
                                  Rapportato ed eseguito · <strong>{getValidatedHours(editingShift)}h</strong> nel monte ore
                                  <span className="block mt-1 rounded-lg bg-white/15 px-2 py-1 tabular-nums">
                                    Inizio <strong>{editingShift.actualStartTime || editingShift.startTime}</strong> · Fine <strong>{editingShift.actualEndTime || editingShift.endTime}</strong>
                                  </span>
                                </>
                              ) : (
                                'Ancora non eseguito · 0h nel monte ore'
                              )}
                            </p>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const turningOn = !cancOn;
                              setEditingShift({ ...editingShift, status: turningOn ? 'cancellato' : 'pianificato' });
                            }}
                            className={`rounded-xl border-2 px-4 py-3 text-left transition ${
                              cancOn
                                ? 'border-red-500 bg-red-500 text-white shadow-md'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-red-300 hover:bg-red-50'
                            } ${effOn ? 'opacity-40' : ''}`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold flex items-center gap-2">
                                <span className={`w-6 h-6 rounded-md flex items-center justify-center ${cancOn ? 'bg-white/20' : 'bg-red-100 text-red-600'}`}>
                                  <X size={14} />
                                </span>
                                Cancellato
                              </span>
                              <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${cancOn ? 'bg-white/25' : 'bg-slate-100 text-slate-500'}`}>
                                {cancOn ? 'ON' : 'OFF'}
                              </span>
                            </div>
                            <p className={`text-xs mt-1.5 leading-snug ${cancOn ? 'text-white/85' : 'text-slate-400'}`}>
                              {cancOn ? 'Turno saltato · non conteggiato, box in grigio' : 'Turno attivo'}
                            </p>
                          </button>
                        </>
                      );
                    })()}
                  </div>
                  {((editingShift.status || 'pianificato') === 'pianificato') && (
                    <p className="mt-2 text-xs text-slate-400">In attesa di esecuzione: non conteggiato nel monte ore finché non premi <strong>Effettuato</strong>.</p>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Note consuntivo</label>
                  <textarea
                    className={fieldCls + " min-h-[60px]"}
                    placeholder="Come è andato il turno, variazioni, note..."
                    value={editingShift.actualNotes || ''}
                    onChange={e => setEditingShift({ ...editingShift, actualNotes: e.target.value })}
                  />
                </div>
              </div>
            </YouthSection>
          )}

          <div className="flex gap-3 pt-1">
            {editingShift?.id && (
              <button onClick={() => handleDeleteShift(editingShift.id)} className="px-3 py-2.5 rounded-lg border border-red-200 bg-red-50 text-red-600 font-medium hover:bg-red-100 transition" title="Elimina definitivamente il turno">
                <Trash2 size={16} />
              </button>
            )}
            <button onClick={() => setIsShiftModalOpen(false)} className="flex-1 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium hover:bg-slate-50 transition">
              Annulla
            </button>
            <button onClick={handleSaveShift} className="flex-[2] py-2.5 rounded-lg bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-semibold shadow-md hover:from-teal-700 hover:to-emerald-700 transition flex items-center justify-center gap-2">
              <Save size={16} /> Salva Turno
            </button>
          </div>
        </div>
      </Modal>

      {/* Tutor Modal */}
      <Modal isOpen={isTutorModalOpen} onClose={() => setIsTutorModalOpen(false)} title={newTutor.id ? "Modifica Tutor" : "Nuovo Tutor"} size="lg">
        <div className="space-y-4">
          {/* Header scheda */}
          <div className="rounded-xl overflow-hidden shadow-sm ring-1 ring-slate-200">
            <div className="h-2 bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400"></div>
            <div className="flex items-center gap-4 px-5 py-4 bg-gradient-to-br from-slate-50 to-white">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold shadow-md shrink-0 ${newTutor.id ? getTutorColor(newTutor.id, tutors).bg + ' ' + getTutorColor(newTutor.id, tutors).text : 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white'}`}>
                {newTutor.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold text-slate-800 truncate">{newTutor.name || 'Nuovo Tutor'}</h3>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {newTutor.role && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border inline-flex items-center gap-1 ${((ROLE_STYLES[newTutor.role]) || ROLE_DEFAULT).badge}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${((ROLE_STYLES[newTutor.role]) || ROLE_DEFAULT).dot}`}></span>
                      {newTutor.role}
                    </span>
                  )}
                  {newTutor.city && <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">{newTutor.city}</span>}
                  {newTutor.birthDate && getAge(newTutor.birthDate) !== null && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">{getAge(newTutor.birthDate)} anni</span>
                  )}
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    newTutor.status === 'pausa' ? 'bg-amber-100 text-amber-700'
                    : newTutor.status === 'archiviato' ? 'bg-slate-200 text-slate-600'
                    : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {newTutor.status === 'pausa' ? 'In pausa' : newTutor.status === 'archiviato' ? 'Archiviato' : 'Attivo'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <YouthSection icon={<IdCard size={16} />} title="Dati Personali" chipBg="bg-blue-500" headerBg="bg-gradient-to-r from-blue-50 to-white border-blue-100" textColor="text-blue-700">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  className={fieldCls}
                  placeholder="Nome e cognome"
                  value={newTutor.name || ''}
                  onChange={e => setNewTutor({ ...newTutor, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Data di nascita</label>
                <input
                  type="date"
                  className={fieldCls}
                  value={newTutor.birthDate || ''}
                  onChange={e => setNewTutor({ ...newTutor, birthDate: e.target.value || undefined })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Città</label>
                <input
                  type="text"
                  className={fieldCls}
                  placeholder="Comune di residenza"
                  value={newTutor.city || ''}
                  onChange={e => setNewTutor({ ...newTutor, city: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Telefono</label>
                <input
                  type="tel"
                  className={fieldCls}
                  placeholder="3XX XXX XXXX"
                  value={newTutor.phone || ''}
                  onChange={e => setNewTutor({ ...newTutor, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  className={fieldCls}
                  placeholder="nome@email.it"
                  value={newTutor.email || ''}
                  onChange={e => setNewTutor({ ...newTutor, email: e.target.value })}
                />
              </div>
            </div>
          </YouthSection>

          <YouthSection icon={<UserCheck size={16} />} title="Profilo Professionale" chipBg="bg-violet-500" headerBg="bg-gradient-to-r from-violet-50 to-white border-violet-100" textColor="text-violet-700">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ruolo</label>
                <select
                  className={fieldCls}
                  value={newTutor.role || ''}
                  onChange={e => setNewTutor({ ...newTutor, role: e.target.value })}
                >
                  <option value="">—</option>
                  {TUTOR_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Anni di esperienza</label>
                <input
                  type="number"
                  className={fieldCls}
                  min={0}
                  value={newTutor.yearsExperience ?? ''}
                  onChange={e => setNewTutor({ ...newTutor, yearsExperience: e.target.value === '' ? undefined : parseInt(e.target.value) })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Qualifiche / Titoli</label>
                <input
                  type="text"
                  className={fieldCls}
                  placeholder="Laurea, corsi, abilitazioni..."
                  value={newTutor.qualifications || ''}
                  onChange={e => setNewTutor({ ...newTutor, qualifications: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Specialità (separate da virgola)</label>
                <input
                  type="text"
                  className={fieldCls}
                  placeholder="Autismo, Logopedia, DSA..."
                  value={newTutor.specialties?.join(', ') || ''}
                  onChange={e => setNewTutor({ ...newTutor, specialties: (e.target.value || '').split(',').map(s => s.trim()) })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Ore Max / Settimana</label>
                <input
                  type="number"
                  className={fieldCls}
                  min={0}
                  value={newTutor.maxHoursPerWeek ?? ''}
                  onChange={e => setNewTutor({ ...newTutor, maxHoursPerWeek: e.target.value === '' ? undefined : parseInt(e.target.value) })}
                />
              </div>
            </div>
          </YouthSection>

          <YouthSection icon={<Shield size={16} />} title="Lavoro con Minori" chipBg="bg-rose-500" headerBg="bg-gradient-to-r from-rose-50 to-white border-rose-100" textColor="text-rose-700">
            <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-rose-800 flex items-center gap-1.5">
                    <CheckCircle size={15} /> Certificato casellario giudiziale
                  </p>
                  <p className="text-xs text-rose-700/70 mt-0.5">Requisito obbligatorio per il lavoro con minori</p>
                </div>
                <input
                  type="date"
                  className={fieldCls + " sm:w-44"}
                  value={newTutor.criminalRecordExpiry || ''}
                  onChange={e => setNewTutor({ ...newTutor, criminalRecordExpiry: e.target.value || null })}
                />
              </div>
            </div>
          </YouthSection>

          <YouthSection icon={<Target size={16} />} title="Organizzazione" chipBg="bg-emerald-500" headerBg="bg-gradient-to-r from-emerald-50 to-white border-emerald-100" textColor="text-emerald-700">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Stato</label>
                <div className="flex gap-2">
                  {[
                    { v: 'attivo', label: 'Attivo', on: 'bg-emerald-500 text-white border-emerald-600 shadow-sm', off: 'bg-white text-slate-600 border-slate-300 hover:border-emerald-400' },
                    { v: 'pausa', label: 'In pausa', on: 'bg-amber-500 text-white border-amber-600 shadow-sm', off: 'bg-white text-slate-600 border-slate-300 hover:border-amber-400' },
                    { v: 'archiviato', label: 'Archiviato', on: 'bg-slate-500 text-white border-slate-600 shadow-sm', off: 'bg-white text-slate-600 border-slate-300 hover:border-slate-400' },
                  ].map(o => (
                    <button
                      key={o.v}
                      type="button"
                      onClick={() => setNewTutor({ ...newTutor, status: o.v })}
                      className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition ${(newTutor.status || 'attivo') === o.v ? o.on : o.off}`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Data ingresso</label>
                <input
                  type="date"
                  className={fieldCls}
                  value={newTutor.entryDate || ''}
                  onChange={e => setNewTutor({ ...newTutor, entryDate: e.target.value || null })}
                />
              </div>
              <div className="sm:col-span-2 rounded-lg border border-slate-200 bg-slate-50/60 p-3.5">
                <span className="text-sm font-medium text-slate-700 block mb-2">Giorni NON disponibili</span>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((day, idx) => {
                    const dayIndex = idx + 1 === 7 ? 0 : idx + 1; // Map UI (Mon-Sun) to JS Date (Sun=0)
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          const current = newTutor.unavailableDays || [];
                          const updated = current.includes(dayIndex)
                            ? current.filter(d => d !== dayIndex)
                            : [...current, dayIndex];
                          setNewTutor({ ...newTutor, unavailableDays: updated });
                        }}
                        className={`text-xs px-2.5 py-1.5 rounded-lg border transition ${newTutor.unavailableDays?.includes(dayIndex) ? 'bg-red-100 border-red-300 text-red-700 font-semibold' : 'bg-white border-slate-200 text-slate-700 hover:border-red-300'}`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Note</label>
                <textarea
                  className={fieldCls + " min-h-[70px]"}
                  placeholder="Annotazioni libere"
                  value={newTutor.notes || ''}
                  onChange={e => setNewTutor({ ...newTutor, notes: e.target.value })}
                />
              </div>
            </div>
          </YouthSection>

          <div className="flex gap-3 pt-1">
            <button onClick={() => setIsTutorModalOpen(false)} className="flex-1 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium hover:bg-slate-50 transition">
              Annulla
            </button>
            <button onClick={handleSaveTutor} className="flex-[2] py-2.5 rounded-lg bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-semibold shadow-md hover:from-teal-700 hover:to-emerald-700 transition flex items-center justify-center gap-2">
              <Save size={16} /> {newTutor.id ? "Salva Modifiche" : "Aggiungi Tutor"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Youth Modal */}
      <Modal isOpen={isYouthModalOpen} onClose={() => setIsYouthModalOpen(false)} title={newYouth.id ? "Modifica Ragazzo/a" : "Nuovo Ragazzo/a"} size="lg">
        <div className="space-y-4">
          {/* Header scheda */}
          <div className="rounded-xl overflow-hidden shadow-sm ring-1 ring-slate-200">
            <div className="h-2 bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-400"></div>
            <div className="flex items-center gap-4 px-5 py-4 bg-gradient-to-br from-slate-50 to-white">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center text-2xl font-bold shadow-md shrink-0">
                {newYouth.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold text-slate-800 truncate">{newYouth.name || 'Nuovo Ragazzo/a'}</h3>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {getAge(newYouth.birthDate) !== null && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                      {getAge(newYouth.birthDate)} anni
                    </span>
                  )}
                  {newYouth.gender && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${newYouth.gender === 'Femmina' ? 'bg-pink-100 text-pink-700' : 'bg-violet-100 text-violet-700'}`}>
                      {newYouth.gender}
                    </span>
                  )}
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    newYouth.status === 'pausa' ? 'bg-amber-100 text-amber-700'
                    : newYouth.status === 'archiviato' ? 'bg-slate-200 text-slate-600'
                    : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {newYouth.status === 'pausa' ? 'In pausa' : newYouth.status === 'archiviato' ? 'Archiviato' : 'Attivo'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <YouthSection icon={<IdCard size={16} />} title="Dati Anagrafici" chipBg="bg-blue-500" headerBg="bg-gradient-to-r from-blue-50 to-white border-blue-100" textColor="text-blue-700">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  className={fieldCls}
                  placeholder="Nome e cognome"
                  value={newYouth.name || ''}
                  onChange={e => setNewYouth({ ...newYouth, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Data di nascita</label>
                <input
                  type="date"
                  className={fieldCls}
                  value={newYouth.birthDate || ''}
                  onChange={e => setNewYouth({ ...newYouth, birthDate: e.target.value || undefined })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Sesso</label>
                <select
                  className={fieldCls}
                  value={newYouth.gender || ''}
                  onChange={e => setNewYouth({ ...newYouth, gender: e.target.value })}
                >
                  <option value="">—</option>
                  <option value="Maschio">Maschio</option>
                  <option value="Femmina">Femmina</option>
                  <option value="Altro">Altro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Luogo di nascita</label>
                <input
                  type="text"
                  className={fieldCls}
                  placeholder="Città"
                  value={newYouth.birthPlace || ''}
                  onChange={e => setNewYouth({ ...newYouth, birthPlace: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nazionalità</label>
                <input
                  type="text"
                  className={fieldCls}
                  placeholder="Italiana"
                  value={newYouth.nationality || ''}
                  onChange={e => setNewYouth({ ...newYouth, nationality: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Codice fiscale</label>
                <input
                  type="text"
                  className={`${fieldCls} uppercase`}
                  placeholder="RSSMRA10A01H501Z"
                  value={newYouth.fiscalCode || ''}
                  onChange={e => setNewYouth({ ...newYouth, fiscalCode: e.target.value.toUpperCase() })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Telefono</label>
                <input
                  type="tel"
                  className={fieldCls}
                  placeholder="3XX XXX XXXX"
                  value={newYouth.phone || ''}
                  onChange={e => setNewYouth({ ...newYouth, phone: e.target.value })}
                />
              </div>
            </div>
          </YouthSection>

          <YouthSection icon={<Phone size={16} />} title="Famiglia e Contatti" chipBg="bg-violet-500" headerBg="bg-gradient-to-r from-violet-50 to-white border-violet-100" textColor="text-violet-700">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Genitore / Tutore</label>
                <input
                  type="text"
                  className={fieldCls}
                  placeholder="Nome e cognome"
                  value={newYouth.parentName || ''}
                  onChange={e => setNewYouth({ ...newYouth, parentName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Telefono genitore</label>
                <input
                  type="tel"
                  className={fieldCls}
                  placeholder="3XX XXX XXXX"
                  value={newYouth.parentPhone || ''}
                  onChange={e => setNewYouth({ ...newYouth, parentPhone: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Email genitore</label>
                <input
                  type="email"
                  className={fieldCls}
                  placeholder="genitore@email.it"
                  value={newYouth.parentEmail || ''}
                  onChange={e => setNewYouth({ ...newYouth, parentEmail: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-emerald-800 flex items-center gap-1.5">
                      <CheckCircle size={15} /> Consenso privacy (GDPR)
                    </p>
                    <p className="text-xs text-emerald-700/70 mt-0.5">Data di firma dell'informativa per minori</p>
                  </div>
                  <input
                    type="date"
                    className={fieldCls + " sm:w-44"}
                    value={newYouth.privacyConsentDate || ''}
                    onChange={e => setNewYouth({ ...newYouth, privacyConsentDate: e.target.value || null })}
                  />
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-emerald-200/70">
                  <p className="text-sm text-slate-600">Autorizzazione uscite</p>
                  <button
                    type="button"
                    onClick={() => setNewYouth({ ...newYouth, outingsAuthorized: !(newYouth.outingsAuthorized || false) })}
                    className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${newYouth.outingsAuthorized ? 'bg-emerald-500' : 'bg-slate-300'}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${newYouth.outingsAuthorized ? 'left-[22px]' : 'left-0.5'}`} />
                  </button>
                </div>
              </div>
            </div>
          </YouthSection>

          <YouthSection icon={<HeartPulse size={16} />} title="Salute e Vulnerabilità" chipBg="bg-rose-500" headerBg="bg-gradient-to-r from-rose-50 to-white border-rose-100" textColor="text-rose-700">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Diagnosi (virgola)</label>
                <input
                  type="text"
                  className={fieldCls}
                  placeholder="DSA, ADHD, ..."
                  value={newYouth.diagnoses?.join(', ') || ''}
                  onChange={e => setNewYouth({ ...newYouth, diagnoses: (e.target.value || '').split(',').map(s => s.trim()).filter(Boolean) })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Allergie</label>
                <input
                  type="text"
                  className={fieldCls}
                  placeholder="Lattosio, pollini, ..."
                  value={newYouth.allergies || ''}
                  onChange={e => setNewYouth({ ...newYouth, allergies: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Farmaci / Terapie</label>
                <input
                  type="text"
                  className={fieldCls}
                  placeholder="Eventuali trattamenti"
                  value={newYouth.medications || ''}
                  onChange={e => setNewYouth({ ...newYouth, medications: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Medico di riferimento</label>
                <input
                  type="text"
                  className={fieldCls}
                  placeholder="Nome e specializzazione"
                  value={newYouth.doctor || ''}
                  onChange={e => setNewYouth({ ...newYouth, doctor: e.target.value })}
                />
              </div>
            </div>
          </YouthSection>

          <YouthSection icon={<Target size={16} />} title="Percorso al Centro" chipBg="bg-emerald-500" headerBg="bg-gradient-to-r from-emerald-50 to-white border-emerald-100" textColor="text-emerald-700">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tutor referente</label>
                <select
                  className={fieldCls}
                  value={newYouth.referringTutorId || ''}
                  onChange={e => setNewYouth({ ...newYouth, referringTutorId: e.target.value || null })}
                >
                  <option value="">—</option>
                  {tutors.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Data ingresso</label>
                <input
                  type="date"
                  className={fieldCls}
                  value={newYouth.entryDate || ''}
                  onChange={e => setNewYouth({ ...newYouth, entryDate: e.target.value || null })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Stato</label>
                <div className="flex gap-2">
                  {[
                    { v: 'attivo', label: 'Attivo', on: 'bg-emerald-500 text-white border-emerald-600 shadow-sm', off: 'bg-white text-slate-600 border-slate-300 hover:border-emerald-400' },
                    { v: 'pausa', label: 'In pausa', on: 'bg-amber-500 text-white border-amber-600 shadow-sm', off: 'bg-white text-slate-600 border-slate-300 hover:border-amber-400' },
                    { v: 'archiviato', label: 'Archiviato', on: 'bg-slate-500 text-white border-slate-600 shadow-sm', off: 'bg-white text-slate-600 border-slate-300 hover:border-slate-400' },
                  ].map(o => (
                    <button
                      key={o.v}
                      type="button"
                      onClick={() => setNewYouth({ ...newYouth, status: o.v })}
                      className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition ${(newYouth.status || 'attivo') === o.v ? o.on : o.off}`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Obiettivi educativi</label>
                <textarea
                  className={fieldCls + " min-h-[70px]"}
                  placeholder="Obiettivi di supporto e crescita"
                  value={newYouth.goals || ''}
                  onChange={e => setNewYouth({ ...newYouth, goals: e.target.value })}
                />
              </div>
            </div>
          </YouthSection>

          <YouthSection icon={<BookOpen size={16} />} title="Programma" chipBg="bg-amber-500" headerBg="bg-gradient-to-r from-amber-50 to-white border-amber-100" textColor="text-amber-700">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ore Richieste / Settimana</label>
                <input
                  type="number"
                  className={fieldCls}
                  value={newYouth.requiredHoursPerWeek ?? ''}
                  onChange={e => setNewYouth({ ...newYouth, requiredHoursPerWeek: e.target.value === '' ? undefined : parseInt(e.target.value) })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Bisogni/Necessità (virgola)</label>
                <input
                  type="text"
                  className={fieldCls}
                  placeholder="Supporto motorio, socializzazione, ..."
                  value={newYouth.needs?.join(', ') || ''}
                  onChange={e => setNewYouth({ ...newYouth, needs: (e.target.value || '').split(',').map(s => s.trim()) })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Note</label>
                <textarea
                  className={fieldCls + " min-h-[70px]"}
                  placeholder="Annotazioni libere"
                  value={newYouth.notes || ''}
                  onChange={e => setNewYouth({ ...newYouth, notes: e.target.value })}
                />
              </div>
            </div>
          </YouthSection>

          <div className="flex gap-3 pt-1">
            <button onClick={() => setIsYouthModalOpen(false)} className="flex-1 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium hover:bg-slate-50 transition">
              Annulla
            </button>
            <button onClick={handleSaveYouth} className="flex-[2] py-2.5 rounded-lg bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-semibold shadow-md hover:from-teal-700 hover:to-emerald-700 transition flex items-center justify-center gap-2">
              <Save size={16} /> {newYouth.id ? "Salva Modifiche" : "Aggiungi Profilo"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// --- Extracted Components ---

interface LoginViewProps {
  onLoginSuccess: (data: { token: string; user: User }) => void;
}

function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      // Fetch profile for permissions
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileError) throw profileError;

      onLoginSuccess({
        token: data.session.access_token,
        user: {
          id: data.user.id,
          username: profile.username,
          permissions: profile.permissions || [],
        },
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-blue-500 mb-2">
            CentroCare
          </h1>
          <p className="text-slate-500">Accedi per continuare</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4 text-sm flex items-center">
            <AlertTriangle size={16} className="mr-2" />
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <UserCheck size={18} className="text-slate-400" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 block w-full rounded-md border-slate-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm p-2.5 border"
                placeholder="Inserisci email"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock size={18} className="text-slate-400" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 block w-full rounded-md border-slate-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm p-2.5 border"
                placeholder="Inserisci password"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 transition-all"
          >
            {loading ? 'Accesso in corso...' : 'Accedi'}
          </button>
        </form>
      </div>
    </div>
  );
}

function UserManagementView() {
  const [users, setUsers] = useState<User[]>([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '', permissions: ['DASHBOARD'] });
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editPermissions, setEditPermissions] = useState<string[]>([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) throw error;
      setUsers(Array.isArray(data) ? data.map(p => ({
        id: p.id,
        username: p.username,
        permissions: p.permissions || [],
      })) : []);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const handleCreateUser = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            email: `${newUser.username}@centrocare.local`,
            password: newUser.password,
            username: newUser.username,
            permissions: newUser.permissions,
          }),
        }
      );

      const result = await response.json();
      if (!response.ok || result.error) throw new Error(result.error || 'Failed to create user');

      setIsUserModalOpen(false);
      setNewUser({ username: '', password: '', permissions: ['DASHBOARD'] });
      fetchUsers();
      alert("Utente creato con successo!");
    } catch (error: any) {
      console.error(error);
      alert(`Errore: ${error.message}`);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo utente?")) return;
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ userId: id }),
        }
      );

      const result = await response.json();
      if (!response.ok || result.error) throw new Error(result.error || 'Failed to delete user');
      fetchUsers();
    } catch (error: any) {
      console.error(error);
      alert(`Errore: ${error.message}`);
    }
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setEditPermissions([...user.permissions]);
    setIsEditModalOpen(true);
  };

  const handleUpdatePermissions = async () => {
    if (!editingUser) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ permissions: editPermissions })
        .eq('id', editingUser.id);

      if (error) throw error;

      setIsEditModalOpen(false);
      setEditingUser(null);
      fetchUsers();
      alert("Permessi aggiornati con successo!");
    } catch (error) {
      console.error(error);
      alert("Errore nell'aggiornamento dei permessi");
    }
  };

  const togglePermission = (perm: string) => {
    setNewUser(prev => {
      const perms = prev.permissions.includes('ALL') ? [] : prev.permissions;
      if (perms.includes(perm)) {
        return { ...prev, permissions: perms.filter(p => p !== perm) };
      } else {
        return { ...prev, permissions: [...perms, perm] };
      }
    });
  };

  const toggleEditPermission = (perm: string) => {
    setEditPermissions(prev => {
      const perms = prev.includes('ALL') ? [] : prev;
      if (perms.includes(perm)) {
        return perms.filter(p => p !== perm);
      } else {
        return [...perms, perm];
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Gestione Utenti</h2>
        <button
          onClick={() => setIsUserModalOpen(true)}
          className="bg-teal-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-teal-700 transition-colors shadow-sm"
        >
          <UserPlus size={20} className="mr-2" />
          Nuovo Utente
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map(user => (
          <Card key={user.id} className="p-6 relative">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold mr-3">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">{user.username}</h3>
                  <span className="text-xs text-slate-500">ID: {user.id}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openEditModal(user)}
                  className="text-slate-400 hover:text-teal-600 transition-colors"
                  title="Modifica permessi"
                >
                  <Edit size={18} />
                </button>
                {user.username !== 'Admin' && (
                  <button
                    onClick={() => handleDeleteUser(user.id)}
                    className="text-slate-400 hover:text-red-500 transition-colors"
                    title="Elimina utente"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-400 uppercase">Permessi</p>
              <div className="flex flex-wrap gap-2">
                {user.permissions.includes('ALL') ? (
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-bold border border-purple-200 flex items-center">
                    <Shield size={10} className="mr-1" /> ADMIN
                  </span>
                ) : (
                  user.permissions.map(p => (
                    <span key={p} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-full border border-slate-200">{p}</span>
                  ))
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Create User Modal */}
      <Modal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} title="Nuovo Utente">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
            <input
              type="text"
              value={newUser.username}
              onChange={e => setNewUser({ ...newUser, username: e.target.value })}
              className="w-full p-2 border rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              value={newUser.password}
              onChange={e => setNewUser({ ...newUser, password: e.target.value })}
              className="w-full p-2 border rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Permessi</label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={newUser.permissions.includes('ALL')}
                  onChange={() => setNewUser({ ...newUser, permissions: ['ALL'] })}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm font-bold text-purple-700">ADMIN COMPLETO (Tutto)</span>
              </label>
              <div className="border-t my-2"></div>
              {['DASHBOARD', 'TUTORS', 'YOUTHS', 'SUMMARY', 'USER_MANAGEMENT'].map(perm => (
                <label key={perm} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={newUser.permissions.includes(perm)}
                    onChange={() => togglePermission(perm)}
                    disabled={newUser.permissions.includes('ALL')}
                    className="rounded text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-sm capitalize">{perm.replace('_', ' ').toLowerCase()}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end space-x-3 mt-6">
            <button onClick={() => setIsUserModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Annulla</button>
            <button onClick={handleCreateUser} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">Crea Utente</button>
          </div>
        </div>
      </Modal>

      {/* Edit Permissions Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Modifica Permessi">
        <div className="space-y-4">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <p className="text-sm text-slate-600">
              <span className="font-semibold">Utente: </span>
              {editingUser?.username}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Permessi</label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={editPermissions.includes('ALL')}
                  onChange={() => setEditPermissions(['ALL'])}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm font-bold text-purple-700">ADMIN COMPLETO (Tutto)</span>
              </label>
              <div className="border-t my-2"></div>
              {['DASHBOARD', 'TUTORS', 'YOUTHS', 'SUMMARY', 'USER_MANAGEMENT'].map(perm => (
                <label key={perm} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={editPermissions.includes(perm)}
                    onChange={() => toggleEditPermission(perm)}
                    disabled={editPermissions.includes('ALL')}
                    className="rounded text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-sm capitalize">{perm.replace('_', ' ').toLowerCase()}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Annulla</button>
            <button onClick={handleUpdatePermissions} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">Salva Modifiche</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}