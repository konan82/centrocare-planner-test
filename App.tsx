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
  TrendingUp
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

// --- Components defined within App to share state easily for this demo ---

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fadeIn">
        <div className="flex justify-between items-center p-4 border-b bg-teal-600 text-white">
          <h3 className="font-semibold text-lg">{title}</h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <div className="p-6 text-slate-900">
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
          maxHoursPerWeek: tutor.max_hours_per_week
        }));

        const normalizedYouths = (y.data || []).map((youth: any) => ({
          ...youth,
          needs: youth.needs || [],
          requiredHoursPerWeek: youth.required_hours_per_week
        }));

        const normalizedShifts = (s.data || []).map((shift: any) => ({
          ...shift,
          tutorId: shift.tutor_id,
          youthId: shift.youth_id,
          startTime: shift.start_time,
          endTime: shift.end_time
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

  const [isTutorModalOpen, setIsTutorModalOpen] = useState(false);
  const [newTutor, setNewTutor] = useState<Partial<Tutor>>({});

  const [isYouthModalOpen, setIsYouthModalOpen] = useState(false);
  const [newYouth, setNewYouth] = useState<Partial<Youth>>({});

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

  // Mobile Menu State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Summary View State
  const [summaryStartDate, setSummaryStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [summaryEndDate, setSummaryEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [summaryViewMode, setSummaryViewMode] = useState<'TUTORS' | 'YOUTHS'>('TUTORS');

  // Helper: Get start of current week (Monday)
  const startOfCurrentWeek = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 6 }).map((_, i) => addDays(startOfCurrentWeek, i)); // LUN-SAB

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
      };

      const { error } = await supabase.from('tutors').upsert(tutorData);
      if (error) throw error;

      if (newTutor.id) {
        setTutors(tutors.map(t => t.id === newTutor.id ? { ...t, ...tutorData, maxHoursPerWeek: tutorData.max_hours_per_week, unavailableDays: tutorData.unavailable_days } : t));
      } else {
        setTutors([...tutors, { ...tutorData, maxHoursPerWeek: tutorData.max_hours_per_week, unavailableDays: tutorData.unavailable_days }]);
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

    try {
      const shiftData = {
        id: editingShift.id || Math.random().toString(36).slice(2, 11),
        tutor_id: editingShift.tutorId,
        youth_id: editingShift.youthId,
        date: editingShift.date,
        start_time: editingShift.startTime,
        end_time: editingShift.endTime,
        activity: editingShift.activity || 'Attività generica',
      };

      const { error } = await supabase.from('shifts').upsert(shiftData);
      if (error) throw error;

      const normalizedShift = {
        ...shiftData,
        tutorId: shiftData.tutor_id,
        youthId: shiftData.youth_id,
        startTime: shiftData.start_time,
        endTime: shiftData.end_time,
      };

      if (editingShift.id) {
        setShifts(shifts.map(s => s.id === normalizedShift.id ? normalizedShift : s));
      } else {
        setShifts([...shifts, normalizedShift]);
      }
      setIsShiftModalOpen(false);
      setEditingShift(null);
    } catch (error) {
      console.error("Error saving shift:", error);
      alert("Errore nel salvataggio del turno");
    }
  };

  const handleDeleteShift = async (id: string) => {
    if (!confirm("Eliminare questo turno?")) return;
    try {
      const { error } = await supabase.from('shifts').delete().eq('id', id);
      if (error) throw error;
      setShifts(shifts.filter(s => s.id !== id));
      if (editingShift?.id === id) setIsShiftModalOpen(false);
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
      endTime: startTime ? `${String((parseInt(startTime.split(':')[0]) + 2) % 24).padStart(2, '0')}:00` : '17:00'
    });
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
      const startDateStr = format(startOfCurrentWeek, 'yyyy-MM-dd');

      if (clearWeek) {
        const weekEnd = format(addDays(startOfCurrentWeek, 5), 'yyyy-MM-dd');
        const weekDates: string[] = [];
        for (let i = 0; i < 6; i++) {
          weekDates.push(format(addDays(startOfCurrentWeek, i), 'yyyy-MM-dd'));
        }
        const { error: delErr } = await supabase
          .from('shifts')
          .delete()
          .in('date', weekDates);
        if (delErr) throw delErr;
        setShifts(prev => prev.filter(s => {
          if (!s.date) return false;
          try {
            const d = s.date;
            return d < startDateStr || d > weekEnd;
          } catch { return true; }
        }));
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
      }));

      const { error } = await supabase.from('shifts').upsert(shiftsToSave);
      if (error) throw error;

      const otherWeekShifts = shifts.filter(s => {
        if (!s.date) return false;
        try {
          const d = parseISO(s.date);
          return d < startOfCurrentWeek || d > addDays(startOfCurrentWeek, 5);
        } catch (e) {
          return false;
        }
      });
      setShifts([...otherWeekShifts, ...newShifts]);
    } catch (error) {
      console.error(error);
      alert("Errore durante la generazione dei turni. Verifica la chiave API.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    const report = analyzeConflicts(tutors, shifts);
    setAnalysisResult(report);
    setIsAnalyzing(false);
  };

  // --- Drag and Drop Handlers ---
  const handleDragStart = (e: React.DragEvent, shiftId: string) => {
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
        try {
          const { error } = await supabase.from('shifts').update({
            date: dateStr,
            start_time: newStartTime,
            end_time: newEndTime,
          }).eq('id', shiftId);
          if (error) throw error;
          setShifts(prevShifts => prevShifts.map(s => s.id === shiftId ? updatedShift : s));
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
              <span>Dashboard & Turni</span>
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
                  <span>Dashboard & Turni</span>
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

  const renderTutorsList = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Elenco Tutor</h2>
        <button onClick={openNewTutorModal} className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg flex items-center shadow-sm">
          <Plus size={18} className="mr-2" /> Nuovo Tutor
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.isArray(tutors) && tutors.map(tutor => (
          <Card key={tutor.id} className="p-6 relative hover:shadow-lg transition-shadow">
            <div className="absolute top-4 right-4 flex space-x-2">
              <button onClick={() => openEditTutorModal(tutor)} className="text-gray-300 hover:text-blue-500 transition-colors">
                <Edit size={18} />
              </button>
              <button onClick={() => handleDeleteTutor(tutor.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                <Trash2 size={18} />
              </button>
            </div>
            <div className="flex items-center mb-4">
              <div className={`w-12 h-12 ${getTutorColor(tutor.id, tutors).bg} ${getTutorColor(tutor.id, tutors).text} rounded-full flex items-center justify-center font-bold text-lg`}>
                {tutor.name?.charAt(0) || '?'}
              </div>
              <div className="ml-4">
                <h3 className="font-bold text-lg text-slate-800">{tutor.name}</h3>
                <p className="text-sm text-slate-500">Max {tutor.maxHoursPerWeek}h / settimana</p>
              </div>
            </div>
            <div className="mb-3">
              <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Specialità</p>
              <div className="flex flex-wrap gap-2">
                {tutor.specialties?.map(s => (
                  <span key={s} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-100">{s}</span>
                ))}
              </div>
            </div>
            {tutor.unavailableDays?.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Non disponibile</p>
                <p className="text-sm text-slate-600">
                  {tutor.unavailableDays?.map(d => DAYS_OF_WEEK[d === 0 ? 6 : d - 1]).join(', ')}
                </p>
              </div>
            )}
            {tutor.notes && <p className="text-sm text-slate-500 italic mt-4 border-t pt-3">"{tutor.notes}"</p>}
          </Card>
        ))}
      </div>
    </div>
  );

  const renderYouthsList = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Elenco Ragazzi</h2>
        <button onClick={openNewYouthModal} className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg flex items-center shadow-sm">
          <Plus size={18} className="mr-2" /> Nuovo Profilo
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.isArray(youths) && youths.map(youth => (
          <Card key={youth.id} className="p-6 relative hover:shadow-lg transition-shadow border-l-4 border-l-amber-400">
            <div className="absolute top-4 right-4 flex space-x-2">
              <button onClick={() => openEditYouthModal(youth)} className="text-gray-300 hover:text-blue-500 transition-colors">
                <Edit size={18} />
              </button>
              <button onClick={() => handleDeleteYouth(youth.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                <Trash2 size={18} />
              </button>
            </div>
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center font-bold text-lg">
                {youth.name?.charAt(0) || '?'}
              </div>
              <div className="ml-4">
                <h3 className="font-bold text-lg text-slate-800">{youth.name}</h3>
                <p className="text-sm text-slate-500">Richiede {youth.requiredHoursPerWeek}h / settimana</p>
              </div>
            </div>
            <div className="mb-3">
              <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Esigenze</p>
              <div className="flex flex-wrap gap-2">
                {youth.needs?.map(n => (
                  <span key={n} className="px-2 py-1 bg-amber-50 text-amber-700 text-xs rounded-full border border-amber-100">{n}</span>
                ))}
              </div>
            </div>
            {youth.notes && <p className="text-sm text-slate-500 italic mt-4 border-t pt-3">"{youth.notes}"</p>}
          </Card>
        ))}
      </div>
    </div>
  );

  const renderCalendar = () => {
    return (
      <div className="space-y-6 h-full flex flex-col">
        {/* Calendar Header Controls */}
        <div className="relative overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-slate-200">
          <div className="h-1.5 bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-400"></div>
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center px-5 py-4 gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-md shadow-teal-200">
                <CalendarIcon size={20} />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-800 tracking-tight leading-tight">Turni settimanali</h2>
                <p className="text-xs text-slate-400 font-medium">Fascia oraria LUN-SAB · 07:00 – 20:00</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={async () => {
                  if (!confirm("Sei sicuro di voler cancellare TUTTI i turni? Questa azione non può essere annullata!")) return;
                  try {
                    const { error, count } = await supabase.from('shifts').delete().neq('id', '');
                    if (error) throw error;
                    alert(`Turni cancellati con successo!`);
                    setShifts([]);
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
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="px-4 py-2.5 bg-white text-indigo-600 rounded-xl hover:bg-indigo-50 flex items-center gap-2 border border-indigo-200 shadow-sm hover:shadow transition-all font-semibold text-sm"
              >
                {isAnalyzing ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div> : <AlertTriangle size={16} />}
                Analizza Conflitti
              </button>
              <button
                onClick={() => setShowConfirmClear(true)}
                disabled={isGenerating}
                className="px-4 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl hover:from-teal-600 hover:to-emerald-600 shadow-md shadow-teal-200/60 flex items-center gap-2 transition-all font-semibold text-sm hover:shadow-lg"
              >
                {isGenerating ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <BrainCircuit size={16} />}
                AI Auto-Planner
              </button>
            </div>
          </div>
        </div>

        {/* AI Analysis Result */}
        {analysisResult && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden animate-fadeIn">
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
        <div className="flex-1 rounded-2xl bg-white shadow-md ring-1 ring-slate-200 overflow-hidden flex flex-col">
          <div className="overflow-x-auto flex-1">
            <table className="w-full min-w-[1000px] border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="sticky left-0 z-30 border-b border-r border-slate-200 bg-slate-50/80 backdrop-blur p-2 w-14">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Orario</span>
                  </th>
                  {['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB'].map((label, i) => {
                    const isToday = isSameDay(weekDays[i], new Date());
                    return (
                      <th key={i} className={`sticky top-0 z-10 border-b border-r border-slate-200 p-3 text-center min-w-[138px] ${
                        isToday ? 'bg-gradient-to-b from-teal-50 to-white' : 'bg-slate-50/80'
                      }`}>
                        <div className="flex flex-col items-center gap-1">
                          <span className={`text-sm font-extrabold tracking-widest ${
                            isToday ? 'text-teal-600' : 'text-slate-600'
                          }`}>
                            {label}
                          </span>
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
                  const DAY_START = 7 * 60; // 07:00
                  const DAY_END = 20 * 60; // 20:00
                  const SLOT = 15; // granularità 15 min
                  const ROW_COUNT = (DAY_END - DAY_START) / SLOT; // 52
                  const ROW_H = 28; // altezza riga (h-7) in px
                  const fmt = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

                  // Per-day layout: card positions (slot index, span, column) per shift.
                  // Overlapping shifts are placed side by side via greedy interval coloring.
                  const dayLayouts = weekDays.map(day => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const dayShifts = shifts.filter(s => {
                      if (!s.date) return false;
                      const shiftDate = typeof s.date === 'string' ? s.date.split('T')[0] : '';
                      return shiftDate === dateStr;
                    });

                    const placed = dayShifts
                      .map(s => {
                        const [sh, sm] = (s.startTime || '0:0').split(':').map(Number);
                        const [eh, em] = (s.endTime || '0:0').split(':').map(Number);
                        const startMin = sh * 60 + sm;
                        const endMin = Math.max(startMin + SLOT, eh * 60 + em);
                        const slotIdx = Math.round((startMin - DAY_START) / SLOT);
                        const span = Math.max(1, Math.ceil((endMin - startMin) / SLOT));
                        return { shift: s, slotIdx, span };
                      })
                      .filter(p => p.slotIdx >= 0 && p.slotIdx < ROW_COUNT)
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
                      <tr key={rowIdx} className="h-7">
                        <td className={`sticky left-0 z-20 border-r border-slate-200 w-14 text-center align-top ${
                          isBand ? 'bg-slate-100/70' : 'bg-white'
                        } ${topBorderCls}`}>
                          <span className={`inline-flex items-center px-0.5 py-px text-[10px] tabular-nums ${
                            isHour ? 'font-bold text-slate-600' : 'text-slate-400'
                          }`}>
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
                              onClick={() => openNewShiftModal('', layout.dateStr, slotLabel)}
                              className={`relative border-r border-slate-200 align-top transition-all duration-150 group/slot ${topBorderCls} ${
                                isBand ? 'bg-slate-50/40' : 'bg-white'
                              } ${
                                isDragOver
                                  ? 'bg-teal-50 ring-2 ring-inset ring-teal-400 rounded-lg shadow-inner'
                                  : 'hover:bg-teal-50/30'
                              }`}
                            >
                              <button
                                onClick={(e) => { e.stopPropagation(); openNewShiftModal('', layout.dateStr, slotLabel); }}
                                className="absolute top-0.5 right-0.5 z-20 w-5 h-5 rounded-md bg-white/95 border border-slate-200 text-slate-400 hover:text-teal-600 hover:border-teal-300 shadow-sm flex items-center justify-center opacity-0 group-hover/slot:opacity-100 transition-opacity"
                              >
                                <Plus size={12} />
                              </button>

                              {rowIdx === 0 && (
                                <div
                                  className="absolute z-10 pointer-events-none"
                                  style={{ top: -2, right: -1, left: 0, height: ROW_COUNT * ROW_H }}
                                >
                                  {layout.placed.map((p, idx) => {
                                    const shift = p.shift;
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
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, shift.id)}
                                        onClick={(e) => { e.stopPropagation(); setEditingShift(shift); setIsShiftModalOpen(true); }}
                                        className={`absolute pointer-events-auto rounded-md ${yColor.bg} border ${yColor.border} border-l-4 ${tColor.border} p-1.5 text-[10px] cursor-move shadow-sm hover:shadow-md overflow-hidden group/item
                                          ${resizingShiftId === shift.id ? 'transition-none cursor-ns-resize' : 'transition-all duration-150'}
                                          ${isDragging ? 'opacity-40 scale-95' : 'opacity-100'}
                                        `}
                                        style={{
                                          top: p.slotIdx * ROW_H + 1,
                                          height: p.span * ROW_H - 2,
                                          left: `${col * wPct}%`,
                                          width: `calc(${wPct}% - 2px)`,
                                        }}
                                      >
                                        <div className="flex h-full flex-col min-w-0">
                                          <div className="flex items-center gap-1.5 shrink-0">
                                            <span className={`h-4 w-4 shrink-0 rounded-full ${tColor.bg} ${tColor.text} text-[8px] font-bold flex items-center justify-center shadow-sm`}>
                                              {getInitials(tutor?.name)}
                                            </span>
                                            <span className="truncate font-bold text-slate-800 pointer-events-none text-[11px] leading-tight">
                                              {tutor?.name || 'Sconosciuto'}
                                            </span>
                                            <button
                                              onClick={(e) => { e.stopPropagation(); handleDeleteShift(shift.id); }}
                                              className="ml-auto opacity-0 group-hover/item:opacity-100 text-red-400 hover:text-red-600 shrink-0"
                                            >
                                              <Trash2 size={11} />
                                            </button>
                                          </div>

                                          <div className="my-1 h-px bg-white/70 shrink-0" />

                                          <div className="min-w-0 flex flex-col gap-1">
                                            <div className="flex items-center gap-1 min-w-0">
                                              <Clock size={9} className="text-slate-400 shrink-0" />
                                              <span className="rounded bg-white/80 px-1 py-px text-[9.5px] font-bold text-slate-700 tabular-nums pointer-events-none truncate">
                                                {shift.startTime}–{shift.endTime}
                                              </span>
                                            </div>

                                            <div className="flex items-center gap-1.5 min-w-0">
                                              <span className={`h-1.5 w-1.5 rounded-full ${yColor.badge} shrink-0`}></span>
                                              <span className="truncate font-semibold text-slate-600 pointer-events-none">
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
                                            supabase.from('shifts').update({ end_time: nEnd }).eq('id', shift.id)
                                              .then(({ error }) => {
                                                if (error) {
                                                  console.error('Error resizing shift:', error);
                                                  alert('Errore ridimensionamento turno');
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

    // Filter shifts based on selected date range
    const filteredShifts = shifts.filter(s => {
      if (!s.date) return false;
      const d = typeof s.date === 'string' ? s.date.split('T')[0] : s.date;
      return d >= summaryStartDate && d <= summaryEndDate;
    });

    // Group shifts by month and week based on view mode
    const summaryData = summaryViewMode === 'TUTORS'
      ? tutors.map(tutor => {
        const tutorShifts = filteredShifts.filter(s => s.tutorId === tutor.id);

        const monthlyHours: Record<string, number> = {};
        const weeklyHours: Record<string, number> = {};

        tutorShifts.forEach(shift => {
          if (!shift.date || !shift.startTime || !shift.endTime) return;

          // Use robust date parsing
          const dateStr = typeof shift.date === 'string' ? shift.date.split('T')[0] : shift.date;
          const date = parseISO(dateStr);

          const monthKey = format(date, 'MMMM yyyy', { locale: it });
          const weekKey = `Settimana ${getISOWeek(date)} (${getYear(date)})`;

          const hours = getHours(shift.startTime, shift.endTime);

          monthlyHours[monthKey] = (monthlyHours[monthKey] || 0) + hours;
          weeklyHours[weekKey] = (weeklyHours[weekKey] || 0) + hours;
        });

        return {
          id: tutor.id,
          name: tutor.name,
          targetHours: tutor.maxHoursPerWeek,
          monthlyHours,
          weeklyHours,
          type: 'TUTOR'
        };
      })
      : youths.map(youth => {
        const youthShifts = filteredShifts.filter(s => s.youthId === youth.id);

        const monthlyHours: Record<string, number> = {};
        const weeklyHours: Record<string, number> = {};

        youthShifts.forEach(shift => {
          if (!shift.date || !shift.startTime || !shift.endTime) return;

          // Use robust date parsing
          const dateStr = typeof shift.date === 'string' ? shift.date.split('T')[0] : shift.date;
          const date = parseISO(dateStr);

          const monthKey = format(date, 'MMMM yyyy', { locale: it });
          const weekKey = `Settimana ${getISOWeek(date)} (${getYear(date)})`;

          const hours = getHours(shift.startTime, shift.endTime);

          monthlyHours[monthKey] = (monthlyHours[monthKey] || 0) + hours;
          weeklyHours[weekKey] = (weeklyHours[weekKey] || 0) + hours;
        });

        return {
          id: youth.id,
          name: youth.name,
          targetHours: youth.requiredHoursPerWeek,
          monthlyHours,
          weeklyHours,
          type: 'YOUTH'
        };
      });

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
                    {Object.entries(data.monthlyHours).length > 0 ? (
                      Object.entries(data.monthlyHours).map(([month, hours]) => (
                        <div key={month} className="flex justify-between items-center bg-slate-50 p-2 rounded">
                          <span className="capitalize text-slate-700">{month}</span>
                          <span className={`font-bold ${data.type === 'TUTOR' ? 'text-teal-600' : 'text-amber-600'}`}>{hours.toFixed(1)}h</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-400 italic">Nessun dato mensile</p>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-600 mb-3 flex items-center">
                    <Clock size={16} className="mr-2" /> Per Settimana
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(data.weeklyHours).length > 0 ? (
                      Object.entries(data.weeklyHours).map(([week, hours]) => {
                        const isOverLimit = data.type === 'TUTOR' && hours > data.targetHours;
                        const isUnderTarget = data.type === 'YOUTH' && hours < data.targetHours;

                        let textColor = 'text-teal-600';
                        if (data.type === 'YOUTH') textColor = 'text-amber-600';
                        if (isOverLimit) textColor = 'text-red-500';
                        if (isUnderTarget) textColor = 'text-orange-500';

                        return (
                          <div key={week} className="flex justify-between items-center bg-slate-50 p-2 rounded">
                            <span className="text-slate-700">{week}</span>
                            <span className={`font-bold ${textColor}`}>
                              {hours.toFixed(1)}h
                              {isOverLimit && <AlertTriangle size={14} className="inline ml-1" />}
                              {isUnderTarget && <AlertTriangle size={14} className="inline ml-1" />}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-sm text-slate-400 italic">Nessun dato settimanale</p>
                    )}
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

          {view === 'DASHBOARD' && renderCalendar()}
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
                Vuoi <strong>cancellare i turni della settimana corrente</strong> prima di generare nuovi turni con l'AI?
              </p>
              <p className="text-xs text-slate-500 mt-1">
                I turni di altre settimane non verranno toccati.
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
      <Modal isOpen={isShiftModalOpen} onClose={() => setIsShiftModalOpen(false)} title={editingShift?.id ? "Modifica Turno" : "Nuovo Turno"}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tutor</label>
            <select
              className="w-full p-2 border border-gray-300 rounded-lg bg-white text-slate-900 focus:ring-teal-500 focus:border-teal-500"
              value={editingShift?.tutorId}
              onChange={e => setEditingShift({ ...editingShift, tutorId: e.target.value })}
            >
              <option value="">Seleziona Tutor</option>
              {tutors.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Ragazzo/a</label>
            <select
              className="w-full p-2 border border-gray-300 rounded-lg bg-white text-slate-900 focus:ring-teal-500 focus:border-teal-500"
              value={editingShift?.youthId}
              onChange={e => setEditingShift({ ...editingShift, youthId: e.target.value })}
            >
              <option value="">Seleziona Ragazzo/a</option>
              {youths.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
              <input
                type="date"
                className="w-full p-2 border border-gray-300 rounded-lg bg-white text-slate-900 focus:ring-teal-500 focus:border-teal-500"
                value={editingShift?.date}
                onChange={e => setEditingShift({ ...editingShift, date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Attività</label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded-lg bg-white text-slate-900 focus:ring-teal-500 focus:border-teal-500"
                placeholder="Es. Compiti"
                value={editingShift?.activity}
                onChange={e => setEditingShift({ ...editingShift, activity: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Inizio</label>
              <input
                type="time"
                className="w-full p-2 border border-gray-300 rounded-lg bg-white text-slate-900 focus:ring-teal-500 focus:border-teal-500"
                value={editingShift?.startTime}
                onChange={e => setEditingShift({ ...editingShift, startTime: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fine</label>
              <input
                type="time"
                className="w-full p-2 border border-gray-300 rounded-lg bg-white text-slate-900 focus:ring-teal-500 focus:border-teal-500"
                value={editingShift?.endTime}
                onChange={e => setEditingShift({ ...editingShift, endTime: e.target.value })}
              />
            </div>
          </div>
          <button onClick={handleSaveShift} className="w-full bg-teal-600 text-white py-3 rounded-lg font-medium hover:bg-teal-700 mt-2 shadow-sm">
            Salva Turno
          </button>
        </div>
      </Modal>

      {/* Tutor Modal */}
      <Modal isOpen={isTutorModalOpen} onClose={() => setIsTutorModalOpen(false)} title={newTutor.id ? "Modifica Tutor" : "Nuovo Tutor"}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
            <input
              type="text"
              className="w-full p-2 border border-gray-300 rounded bg-white text-slate-900"
              value={newTutor.name || ''}
              onChange={e => setNewTutor({ ...newTutor, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Ore Max / Settimana</label>
            <input
              type="number"
              className="w-full p-2 border border-gray-300 rounded bg-white text-slate-900"
              value={newTutor.maxHoursPerWeek ?? ''}
              onChange={e => setNewTutor({ ...newTutor, maxHoursPerWeek: e.target.value === '' ? undefined : parseInt(e.target.value) })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Specialità (separate da virgola)</label>
            <input
              type="text"
              className="w-full p-2 border border-gray-300 rounded bg-white text-slate-900"
              value={newTutor.specialties?.join(', ') || ''}
              onChange={e => setNewTutor({ ...newTutor, specialties: (e.target.value || '').split(',').map(s => s.trim()) })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Note</label>
            <textarea
              className="w-full p-2 border border-gray-300 rounded bg-white text-slate-900"
              value={newTutor.notes || ''}
              onChange={e => setNewTutor({ ...newTutor, notes: e.target.value })}
            />
          </div>
          <div className="bg-gray-50 p-3 rounded border border-gray-200">
            <span className="text-sm font-medium text-gray-700 block mb-2">Giorni NON disponibili:</span>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map((day, idx) => {
                const dayIndex = idx + 1 === 7 ? 0 : idx + 1; // Map UI (Mon-Sun) to JS Date (Sun=0)
                return (
                  <button
                    key={day}
                    onClick={() => {
                      const current = newTutor.unavailableDays || [];
                      const updated = current.includes(dayIndex)
                        ? current.filter(d => d !== dayIndex)
                        : [...current, dayIndex];
                      setNewTutor({ ...newTutor, unavailableDays: updated });
                    }}
                    className={`text-xs px-2 py-1 rounded border ${newTutor.unavailableDays?.includes(dayIndex) ? 'bg-red-100 border-red-300 text-red-700' : 'bg-white border-gray-200 text-slate-700'}`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
          <button onClick={handleSaveTutor} className="w-full bg-teal-600 text-white py-2 rounded font-medium hover:bg-teal-700 shadow-sm">
            {newTutor.id ? "Salva Modifiche" : "Aggiungi Tutor"}
          </button>
        </div>
      </Modal>

      {/* Youth Modal */}
      <Modal isOpen={isYouthModalOpen} onClose={() => setIsYouthModalOpen(false)} title={newYouth.id ? "Modifica Ragazzo/a" : "Nuovo Ragazzo/a"}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
            <input
              type="text"
              className="w-full p-2 border border-gray-300 rounded bg-white text-slate-900"
              value={newYouth.name || ''}
              onChange={e => setNewYouth({ ...newYouth, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Ore Richieste / Settimana</label>
            <input
              type="number"
              className="w-full p-2 border border-gray-300 rounded bg-white text-slate-900"
              value={newYouth.requiredHoursPerWeek ?? ''}
              onChange={e => setNewYouth({ ...newYouth, requiredHoursPerWeek: e.target.value === '' ? undefined : parseInt(e.target.value) })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Bisogni/Necessità (virgola)</label>
            <input
              type="text"
              className="w-full p-2 border border-gray-300 rounded bg-white text-slate-900"
              value={newYouth.needs?.join(', ') || ''}
              onChange={e => setNewYouth({ ...newYouth, needs: (e.target.value || '').split(',').map(s => s.trim()) })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Note</label>
            <textarea
              className="w-full p-2 border border-gray-300 rounded bg-white text-slate-900"
              value={newYouth.notes || ''}
              onChange={e => setNewYouth({ ...newYouth, notes: e.target.value })}
            />
          </div>
          <button onClick={handleSaveYouth} className="w-full bg-teal-600 text-white py-2 rounded font-medium hover:bg-teal-700 shadow-sm">
            {newYouth.id ? "Salva Modifiche" : "Aggiungi Profilo"}
          </button>
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