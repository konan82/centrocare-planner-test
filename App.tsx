import React, { useState, useEffect } from 'react';
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
  ChevronLeft,
  ChevronRight,
  Edit,
  Save,
  BarChart3,
  Lock,
  LogOut,
  Shield,
  UserPlus,
  Settings,
  Clock,
  Timer
} from 'lucide-react';
import { Tutor, Youth, Shift, ViewState, User } from './types';
import { INITIAL_TUTORS, INITIAL_YOUTHS, INITIAL_SHIFTS, DAYS_OF_WEEK } from './constants';
import { generateSmartSchedule, analyzeConflicts } from './services/geminiService';
import { fetchAll, postOne, deleteOne } from './src/api';
import { startOfWeek, addDays, format, parseISO, isSameDay, getISOWeek, getMonth, getYear, startOfMonth, endOfMonth, eachWeekOfInterval, endOfWeek } from 'date-fns';
import { it } from 'date-fns/locale';

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

// --- Helper Functions ---
const calculateDuration = (startTime: string, endTime: string): string => {
  if (!startTime || !endTime) return '';
  const [startH, startM] = (startTime.split(':') || [0, 0]).map(Number);
  const [endH, endM] = (endTime.split(':') || [0, 0]).map(Number);

  const startMinutes = (startH || 0) * 60 + (startM || 0);
  const endMinutes = (endH || 0) * 60 + (endM || 0);

  let diff = endMinutes - startMinutes;
  if (diff < 0) diff += 24 * 60; // Handle midnight crossing if needed

  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;

  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
};

// --- Main App ---

export default function App() {
  const [view, setView] = useState<ViewState>('LOGIN');
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [youths, setYouths] = useState<Youth[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);

  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

  // Check Auth on Mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUserStr = localStorage.getItem('user');

    if (storedToken && storedToken !== 'null' && storedToken !== 'undefined' && storedUserStr && storedUserStr !== 'null' && storedUserStr !== 'undefined') {
      try {
        const parsedUser = JSON.parse(storedUserStr);
        if (parsedUser && parsedUser.id && parsedUser.username) {
          setCurrentUser(parsedUser);
          setToken(storedToken);
          setView('DASHBOARD');
        } else {
          throw new Error('Invalid user data');
        }
      } catch (e) {
        console.error("Auth error:", e);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setCurrentUser(null);
        setView('LOGIN');
      }
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setToken(null);
      setCurrentUser(null);
      setView('LOGIN');
    }
  }, []);

  // Load data from API on mount
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        const [t, y, s] = await Promise.all([
          fetchAll<Tutor>('tutors'),
          fetchAll<Youth>('youths'),
          fetchAll<Shift>('shifts')
        ]);
        setTutors(Array.isArray(t) ? t : []);
        setYouths(Array.isArray(y) ? y : []);

        // Normalize shifts to handle potential schema mismatches (day vs date, start vs startTime)
        const normalizedShifts = (Array.isArray(s) ? s : []).map((shift: any) => ({
          ...shift,
          date: shift.date || shift.day,
          startTime: shift.startTime || shift.start,
          endTime: shift.endTime || shift.end
        }));

        console.log("RAW shifts from API:", s);
        console.log("NORMALIZED shifts:", normalizedShifts);
        console.log("Sample shift dates:", normalizedShifts.slice(0, 3).map(sh => ({ id: sh.id, date: sh.date, tutorId: sh.tutorId })));

        setShifts(normalizedShifts);

        console.log("Data loaded:", { tutors: t.length, youths: y.length, shifts: normalizedShifts.length });
        setIsLoading(false);

      } catch (error) {
        console.error('Error loading data:', error);
        setLoadError('Il backend sta riavviandosi (Render free tier). Riprovo tra 5 secondi...');

        // Retry after 5 seconds (backend might be waking up)
        setTimeout(() => {
          window.location.reload();
        }, 5000);
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
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Drag and Drop State
  const [draggedShiftId, setDraggedShiftId] = useState<string | null>(null);
  const [dragOverCoords, setDragOverCoords] = useState<{ tutorId: string, dateStr: string } | null>(null);

  // Mobile Menu State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Summary View State
  const [summaryStartDate, setSummaryStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [summaryEndDate, setSummaryEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [summaryViewMode, setSummaryViewMode] = useState<'TUTORS' | 'YOUTHS'>('TUTORS');

  // Helper: Get start of current week
  const startOfCurrentWeek = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(startOfCurrentWeek, i));

  // --- Handlers ---

  const handleSaveTutor = async () => {
    if (!newTutor.name) return;

    try {
      if (newTutor.id) {
        // Update existing
        const updatedTutor = { ...tutors.find(t => t.id === newTutor.id), ...newTutor } as Tutor;
        await postOne('tutors', updatedTutor);
        setTutors(tutors.map(t => t.id === newTutor.id ? updatedTutor : t));
      } else {
        // Create new
        const tutor: Tutor = {
          id: Math.random().toString(36).slice(2, 11),
          name: newTutor.name,
          specialties: newTutor.specialties || [],
          maxHoursPerWeek: newTutor.maxHoursPerWeek || 20,
          unavailableDays: newTutor.unavailableDays || [],
          notes: newTutor.notes || '',
        };
        await postOne('tutors', tutor);
        setTutors([...tutors, tutor]);
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
      await deleteOne('tutors', id);
      setTutors(tutors.filter(t => t.id !== id));
      setShifts(shifts.filter(s => s.tutorId !== id)); // Cascade delete shifts locally
    } catch (error) {
      console.error("Error deleting tutor:", error);
      alert("Errore nell'eliminazione del tutor");
    }
  };

  const handleSaveYouth = async () => {
    if (!newYouth.name) return;

    try {
      if (newYouth.id) {
        // Update existing
        const updatedYouth = { ...youths.find(y => y.id === newYouth.id), ...newYouth } as Youth;
        await postOne('youths', updatedYouth);
        setYouths(youths.map(y => y.id === newYouth.id ? updatedYouth : y));
      } else {
        // Create new
        const youth: Youth = {
          id: Math.random().toString(36).slice(2, 11),
          name: newYouth.name,
          needs: newYouth.needs || [],
          requiredHoursPerWeek: newYouth.requiredHoursPerWeek || 4,
          notes: newYouth.notes || '',
        };
        await postOne('youths', youth);
        setYouths([...youths, youth]);
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
      await deleteOne('youths', id);
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
      const shift: Shift = {
        id: editingShift.id || Math.random().toString(36).slice(2, 11),
        tutorId: editingShift.tutorId,
        youthId: editingShift.youthId,
        date: editingShift.date,
        startTime: editingShift.startTime,
        endTime: editingShift.endTime,
        activity: editingShift.activity || 'Attività generica',
      };

      await postOne('shifts', shift);

      if (editingShift.id) {
        setShifts(shifts.map(s => s.id === shift.id ? shift : s));
      } else {
        setShifts([...shifts, shift]);
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
      await deleteOne('shifts', id);
      setShifts(shifts.filter(s => s.id !== id));
      if (editingShift?.id === id) setIsShiftModalOpen(false);
    } catch (error) {
      console.error("Error deleting shift:", error);
      alert("Errore nell'eliminazione del turno");
    }
  };

  const openNewShiftModal = (tutorId?: string, dateStr?: string) => {
    setEditingShift({
      tutorId: tutorId || '',
      date: dateStr || format(new Date(), 'yyyy-MM-dd'),
      startTime: '15:00',
      endTime: '17:00'
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

  const handleGenerateSchedule = async () => {
    setIsGenerating(true);
    try {
      const startDateStr = format(startOfCurrentWeek, 'yyyy-MM-dd');
      const newShifts = await generateSmartSchedule(tutors, youths, startDateStr);

      // Save generated shifts to DB
      await Promise.all(newShifts.map(s => postOne('shifts', s)));

      // Remove existing shifts for this week to avoid duplication if re-generating
      const otherWeekShifts = shifts.filter(s => {
        // Safe check for date to prevent crashes
        if (!s.date) return false;
        try {
          const d = parseISO(s.date);
          return d < startOfCurrentWeek || d > addDays(startOfCurrentWeek, 6);
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

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    const report = await analyzeConflicts(tutors, shifts);
    setAnalysisResult(report);
    setIsAnalyzing(false);
  };

  // --- Drag and Drop Handlers ---
  const handleDragStart = (e: React.DragEvent, shiftId: string) => {
    e.dataTransfer.setData("text/plain", shiftId);
    e.dataTransfer.effectAllowed = "move";
    setDraggedShiftId(shiftId);
  };

  const handleDragOver = (e: React.DragEvent, tutorId: string, dateStr: string) => {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = "move";

    // Only update state if it changed to prevent excessive re-renders
    if (dragOverCoords?.tutorId !== tutorId || dragOverCoords?.dateStr !== dateStr) {
      setDragOverCoords({ tutorId, dateStr });
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Optional: could add logic to clear dragOverCoords if leaving the grid entirely,
    // but clearing it on Drop is usually sufficient.
  };

  const handleDrop = async (e: React.DragEvent, tutorId: string, dateStr: string) => {
    e.preventDefault();
    const shiftId = e.dataTransfer.getData("text/plain");

    if (shiftId) {
      const shiftToUpdate = shifts.find(s => s.id === shiftId);
      if (shiftToUpdate) {
        const updatedShift = { ...shiftToUpdate, tutorId, date: dateStr };
        try {
          await postOne('shifts', updatedShift);
          setShifts(prevShifts => prevShifts.map(s => {
            if (s.id === shiftId) {
              return updatedShift;
            }
            return s;
          }));
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

  const handleLogout = () => {
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
              <div className="w-12 h-12 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center font-bold text-lg">
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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center space-x-4 mb-4 md:mb-0">
            <button onClick={() => setCurrentDate(addDays(currentDate, -7))} className="p-2 hover:bg-gray-100 rounded-full"><ChevronLeft size={20} /></button>
            <h2 className="text-lg font-bold text-slate-700 capitalize w-48 text-center">
              {format(startOfCurrentWeek, 'MMMM yyyy', { locale: it })}
            </h2>
            <button onClick={() => setCurrentDate(addDays(currentDate, 7))} className="p-2 hover:bg-gray-100 rounded-full"><ChevronRight size={20} /></button>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={async () => {
                if (!confirm("Sei sicuro di voler cancellare TUTTI i turni? Questa azione non può essere annullata!")) return;
                try {
                  const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api/shifts-clear-all/confirm`);
                  const data = await res.json();
                  alert(`Cancellati ${data.deleted} turni!`);
                  setShifts([]);
                } catch (error) {
                  console.error(error);
                  alert("Errore durante la cancellazione");
                }
              }}
              className="px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 flex items-center border border-red-200"
            >
              <Trash2 size={18} className="mr-2" />
              Cancella Tutti
            </button>
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 flex items-center border border-indigo-200"
            >
              {isAnalyzing ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-700 mr-2"></div> : <AlertTriangle size={18} className="mr-2" />}
              Analizza Conflitti
            </button>
            <button
              onClick={handleGenerateSchedule}
              disabled={isGenerating}
              className="px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-lg hover:from-teal-600 hover:to-emerald-600 shadow-md flex items-center transition-all"
            >
              {isGenerating ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div> : <BrainCircuit size={18} className="mr-2" />}
              AI Auto-Planner
            </button>
          </div>
        </div>

        {/* AI Analysis Result */}
        {analysisResult && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md shadow-sm relative animate-fadeIn">
            <button onClick={() => setAnalysisResult(null)} className="absolute top-2 right-2 text-yellow-600 hover:text-yellow-800"><X size={16} /></button>
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Analisi AI</h3>
                <div className="mt-2 text-sm text-yellow-700 whitespace-pre-line">
                  {analysisResult}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Calendar Grid */}
        <div className="flex-1 bg-white rounded-lg shadow border border-gray-200 overflow-x-auto">
          <table className="w-full min-w-[1000px] border-collapse">
            <thead>
              <tr>
                <th className="p-4 border-b border-r bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-48 sticky left-0 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  Tutor
                </th>
                {weekDays.map((day, i) => (
                  <th key={i} className={`p-3 border-b border-r bg-gray-50 text-center min-w-[140px] ${isSameDay(day, new Date()) ? 'bg-teal-50' : ''}`}>
                    <span className="block text-xs font-bold text-gray-400 uppercase">{format(day, 'EEE', { locale: it })}</span>
                    <span className={`block text-lg font-bold ${isSameDay(day, new Date()) ? 'text-teal-600' : 'text-slate-700'}`}>
                      {format(day, 'd')}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tutors.map(tutor => (
                <tr key={tutor.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="p-4 border-b border-r font-medium text-slate-700 bg-white sticky left-0 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] group-hover:bg-slate-50 border-l-4 border-l-transparent hover:border-l-teal-500 transition-all">
                    <div className="flex flex-col">
                      <span className="text-sm">{tutor.name}</span>
                      <span className="text-xs text-slate-400">{tutor.specialties?.[0]}</span>
                    </div>
                  </td>
                  {weekDays.map((day, i) => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const dayShifts = shifts.filter(s => {
                      if (s.tutorId !== tutor.id) return false;
                      if (!s.date) return false;
                      // Robust date comparison: compare YYYY-MM-DD strings
                      // This handles both "2023-11-28" and "2023-11-28T..." formats safely
                      const shiftDate = typeof s.date === 'string' ? s.date.split('T')[0] : '';
                      const matches = shiftDate === dateStr;

                      // Debug logging (only for first tutor and first day to avoid spam)
                      if (i === 0 && tutor.id === tutors[0]?.id) {
                        console.log(`Filtering for ${tutor.name} on ${dateStr}: shift ${s.id} has date "${s.date}" -> normalized to "${shiftDate}" -> matches: ${matches}`);
                      }

                      return matches;
                    }).sort((a, b) => {
                      // Sort by start time
                      const timeA = a.startTime || '';
                      const timeB = b.startTime || '';
                      return timeA.localeCompare(timeB);
                    });

                    // Log results for first day of first tutor
                    if (i === 0 && tutor.id === tutors[0]?.id) {
                      console.log(`Found ${dayShifts.length} shifts for ${tutor.name} on ${dateStr}`);
                    }

                    const isUnavailable = tutor.unavailableDays?.includes(day.getDay());
                    const isDragOver = dragOverCoords?.tutorId === tutor.id && dragOverCoords?.dateStr === dateStr;

                    return (
                      <td
                        key={i}
                        onDragOver={(e) => handleDragOver(e, tutor.id, dateStr)}
                        onDrop={(e) => handleDrop(e, tutor.id, dateStr)}
                        className={`p-2 border-b border-r relative align-top h-32 transition-colors duration-200
                          ${isUnavailable ? 'bg-gray-100 bg-opacity-50' : ''}
                          ${isDragOver ? 'bg-teal-100 ring-2 ring-inset ring-teal-400' : ''}
                        `}
                      >
                        {isUnavailable && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
                            <span className="text-4xl font-bold text-gray-500 rotate-45">N/A</span>
                          </div>
                        )}

                        <div className="flex flex-col space-y-2 h-full">
                          {dayShifts.map(shift => {
                            const youth = youths.find(y => y.id === shift.youthId);
                            const duration = calculateDuration(shift.startTime, shift.endTime);
                            const isDragging = draggedShiftId === shift.id;

                            return (
                              <div
                                key={shift.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, shift.id)}
                                onClick={(e) => { e.stopPropagation(); setEditingShift(shift); setIsShiftModalOpen(true); }}
                                className={`bg-teal-100 hover:bg-teal-200 border border-teal-200 text-teal-800 p-2 rounded text-xs cursor-move shadow-sm transition-all flex flex-col group/item
                                  ${isDragging ? 'opacity-50 scale-95' : 'opacity-100'}
                                `}
                              >
                                <div className="flex justify-between items-start">
                                  <span className="font-bold truncate pointer-events-none">{youth?.name || 'Sconosciuto'}</span>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteShift(shift.id); }}
                                    className="opacity-0 group-hover/item:opacity-100 text-teal-600 hover:text-red-500"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                                <div className="flex items-center justify-between mt-1 pointer-events-none">
                                  <div className="flex items-center text-teal-700">
                                    <Clock size={10} className="mr-1" />
                                    <span>{shift.startTime} - {shift.endTime}</span>
                                  </div>
                                  <div className="flex items-center text-teal-600 text-[10px] bg-teal-50 px-1 rounded">
                                    <Timer size={8} className="mr-1" />
                                    <span>{duration}</span>
                                  </div>
                                </div>
                                {shift.activity && <span className="text-[10px] text-teal-600 mt-1 truncate pointer-events-none">{shift.activity}</span>}
                              </div>
                            );
                          })}

                          {/* Add button placeholder */}
                          {!isUnavailable && (
                            <button
                              onClick={() => openNewShiftModal(tutor.id, format(day, 'yyyy-MM-dd'))}
                              className="w-full py-1 text-center text-xs text-gray-300 hover:text-teal-600 hover:bg-teal-50 rounded border border-dashed border-gray-200 hover:border-teal-300 transition-colors mt-auto opacity-0 group-hover:opacity-100"
                            >
                              + Aggiungi
                            </button>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
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

  const renderLogin = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError('');

      try {
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Login fallito');

        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setToken(data.token);
        setCurrentUser(data.user);
        setView('DASHBOARD');
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
              <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserCheck size={18} className="text-slate-400" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10 block w-full rounded-md border-slate-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm p-2.5 border"
                  placeholder="Inserisci username"
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
  };

  const renderUserManagement = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [newUser, setNewUser] = useState({ username: '', password: '', permissions: ['DASHBOARD'] });

    useEffect(() => {
      fetchUsers();
    }, []);

    const fetchUsers = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api/users`);
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    const handleCreateUser = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newUser)
        });
        if (res.ok) {
          setIsUserModalOpen(false);
          setNewUser({ username: '', password: '', permissions: ['DASHBOARD'] });
          fetchUsers();
          alert("Utente creato con successo!");
        } else {
          alert("Errore nella creazione utente");
        }
      } catch (error) {
        console.error(error);
      }
    };

    const handleDeleteUser = async (id: number) => {
      if (!confirm("Sei sicuro di voler eliminare questo utente?")) return;
      try {
        await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api/users/${id}`, { method: 'DELETE' });
        fetchUsers();
      } catch (error) {
        console.error(error);
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
                {user.username !== 'Admin' && (
                  <button onClick={() => handleDeleteUser(user.id)} className="text-slate-400 hover:text-red-500">
                    <Trash2 size={18} />
                  </button>
                )}
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
                {['DASHBOARD', 'TUTORS', 'YOUTHS', 'SUMMARY'].map(perm => (
                  <label key={perm} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={newUser.permissions.includes(perm)}
                      onChange={() => togglePermission(perm)}
                      disabled={newUser.permissions.includes('ALL')}
                      className="rounded text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-sm capitalize">{perm.toLowerCase()}</span>
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
      </div>
    );
  };

  // --- Main Render ---

  if (view === 'LOGIN') {
    return renderLogin();
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
        </main>
      </div>

      {/* --- Modals --- */}

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
              value={newTutor.maxHoursPerWeek || ''}
              onChange={e => setNewTutor({ ...newTutor, maxHoursPerWeek: parseInt(e.target.value) })}
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
              value={newYouth.requiredHoursPerWeek || ''}
              onChange={e => setNewYouth({ ...newYouth, requiredHoursPerWeek: parseInt(e.target.value) })}
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