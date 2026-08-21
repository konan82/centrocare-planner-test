import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  Calendar as CalendarIcon,
  UserCheck,
  Plus,
  Trash2,
  CalendarPlus,
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
  CheckCircle2,
  XCircle,
  AlertCircle,
  Info,
  TrendingUp,
  TrendingDown,
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
  MessageCircle,
  Play,
  Wallet,
  Repeat
} from 'lucide-react';
import { Tutor, Youth, Shift, ViewState, User, PaySettings } from './types';
import { toPng } from 'html-to-image';
import { INITIAL_TUTORS, INITIAL_YOUTHS, INITIAL_SHIFTS, DAYS_OF_WEEK } from './constants';
import { analyzeConflicts, ConflictAnalysis } from './lib/geminiService';
import { supabase } from './src/supabaseClient';
import { startOfWeek, addDays, addMonths, format, parseISO, isSameDay, isSameMonth, getISOWeek, getMonth, getYear, startOfMonth, endOfMonth, eachWeekOfInterval, endOfWeek, getDay } from 'date-fns';
import { it } from 'date-fns/locale';

const waHref = (phone: string) => {
  let digits = (phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (!digits.startsWith('39')) digits = '39' + digits;
  return `https://wa.me/${digits}`;
};

const shiftYouthIds = (s: Shift | null | undefined): string[] => {
  if (!s) return [];
  return s.youthIds && s.youthIds.length > 0 ? s.youthIds : (s.youthId ? [s.youthId] : []);
};

const WhatsAppIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

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

const TUTOR_ROLES = ['Educatore', 'Psicologo', 'Tutor DSA', 'Operatore', 'Volontario', 'Coordinatore', 'Amministrativo', 'Presidente', 'Vice Presidente'];

// Settimana tipo: date di riferimento LUN-SAB (2026-08-03 era un Lunedì)
const TEMPLATE_ANCHOR = parseISO('2026-08-03');

// Giorno della settimana 1=LUN..6=SAB da una data ISO
const weekdayOf = (dateStr?: string | null) => {
  if (!dateStr) return 1;
  const d = parseISO(dateStr.split('T')[0]);
  if (isNaN(d.getTime())) return 1;
  return ((d.getDay() + 6) % 7) + 1;
};

// Ore consuntivo: ogni turno copiato dalla pianificazione vale come svolto (orari effettivi se presenti); solo i cancellati valgono 0
const getValidatedHours = (s: { status?: string; actualStartTime?: string | null; actualEndTime?: string | null; startTime: string; endTime: string }) => {
  if ((s.status || 'pianificato') === 'cancellato') return 0;
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

const colorIndexForId = (id: string, len: number) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % len;
};

const getTutorColor = (tutorId: string, tutors: Tutor[]) => {
  const idx = tutors.findIndex(t => t.id === tutorId);
  const i = idx >= 0 ? idx : colorIndexForId(tutorId, TUTOR_COLORS.length);
  return TUTOR_COLORS[i % TUTOR_COLORS.length];
};

const getYouthColor = (youthId: string, youths: Youth[]) => {
  const idx = youths.findIndex(y => y.id === youthId);
  const i = idx >= 0 ? idx : colorIndexForId(youthId, YOUTH_COLORS.length);
  return YOUTH_COLORS[i % YOUTH_COLORS.length];
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black bg-opacity-50 p-0 sm:p-4">
      <div className={`bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full ${size === 'lg' ? 'max-w-2xl' : 'max-w-md'} overflow-hidden animate-fadeIn sm:max-h-[90vh] max-h-[92dvh]`}>
        <div className="flex justify-between items-center px-4 sm:px-5 py-3 sm:py-4 border-b bg-teal-600 text-white">
          <h3 className="font-semibold text-base sm:text-lg leading-tight">{title}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"><X size={20} /></button>
        </div>
        <div className="p-4 sm:p-6 text-slate-900 max-h-[calc(92dvh-4rem)] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({ children, className = "", onClick }) => (
  <div
    className={`bg-white rounded-lg shadow-md border border-gray-100 ${className}${onClick ? ' hover:border-teal-300' : ''}`}
    onClick={onClick}
  >
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

// --- PersonCombo: combo box cercabile con avatar colorati ---
interface PersonComboProps {
  options: { id: string; name?: string }[];
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
  colorOf: (id: string) => { bg: string; text: string };
  allowAll?: boolean;
  allLabel?: string;
  allValue?: string;
  className?: string;
}

const PersonCombo: React.FC<PersonComboProps> = ({ options, value, onChange, placeholder, colorOf, allowAll = false, allLabel = 'Tutti', allValue = 'all', className = '' }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selected = value !== allValue ? options.find(o => o.id === value) : null;
  const q = search.trim().toLowerCase();
  const filtered = options.filter(o => !q || (o.name || '').toLowerCase().includes(q));

  return (
    <div className={`relative ${className}`} ref={ref}>
      <div className={`flex items-center gap-2 px-3 py-2.5 bg-white rounded-xl border shadow-sm transition-all ${
        selected ? 'border-teal-200' : 'border-slate-200'
      }`}>
        <Users size={16} className="shrink-0 text-slate-400" />
        <input
          type="text"
          value={open ? search : (selected?.name || '')}
          placeholder={selected ? '' : placeholder}
          onFocus={() => { setOpen(true); setSearch(selected?.name || ''); }}
          onChange={e => { setOpen(true); setSearch(e.target.value); }}
          onKeyDown={e => {
            if (e.key === 'Escape') { setOpen(false); setSearch(selected?.name || ''); }
            if (e.key === 'Enter') setOpen(false);
          }}
          className="w-full min-w-0 outline-none bg-transparent text-sm font-medium text-slate-700 placeholder:text-slate-400"
        />
        <ChevronDown size={14} className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>

      {open && (
        <div className="absolute left-0 right-0 mt-2 bg-white rounded-xl border border-slate-200 shadow-xl z-50 overflow-hidden py-1 max-h-72 overflow-y-auto">
          {allowAll && (
            <>
              <button
                type="button"
                onClick={() => { onChange(allValue); setSearch(''); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm text-left hover:bg-slate-50 ${
                  value === allValue ? 'text-teal-600 font-bold' : 'text-slate-700 font-medium'
                }`}
              >
                <span className="h-6 w-6 shrink-0 rounded-full bg-slate-100 text-slate-500 text-[11px] font-bold flex items-center justify-center">
                  <Users size={12} />
                </span>
                <span className="flex-1 truncate">{allLabel}</span>
                {value === allValue && <Check size={14} className="shrink-0 text-teal-600" />}
              </button>
              <div className="my-1 h-px bg-slate-100" />
            </>
          )}
          {filtered.length > 0 ? (
            filtered.map(o => {
              const c = colorOf(o.id);
              const active = value === o.id;
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => { onChange(o.id); setSearch(o.name || ''); setOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm text-left hover:bg-slate-50 ${
                    active ? 'text-teal-600 font-bold' : 'text-slate-700 font-medium'
                  }`}
                >
                  <span className={`h-6 w-6 shrink-0 rounded-full ${c.bg} ${c.text} text-[11px] font-bold flex items-center justify-center`}>
                    {getInitials(o.name)}
                  </span>
                  <span className="flex-1 truncate">{o.name || '?'}</span>
                  {active && <Check size={14} className="shrink-0 text-teal-600" />}
                </button>
              );
            })
          ) : (
            <p className="px-4 py-2 text-sm text-slate-400 italic">Nessun risultato</p>
          )}
        </div>
      )}
    </div>
  );
};

// --- PersonMultiCombo: combo box cercabile con selezione multipla ---
interface PersonMultiComboProps {
  options: { id: string; name?: string }[];
  values: string[];
  onChange: (ids: string[]) => void;
  placeholder: string;
  colorOf: (id: string) => { bg: string; text: string };
  className?: string;
}

const PersonMultiCombo: React.FC<PersonMultiComboProps> = ({ options, values, onChange, placeholder, colorOf, className = '' }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selected = options.filter(o => values.includes(o.id));
  const q = search.trim().toLowerCase();
  const filtered = options.filter(o => !q || (o.name || '').toLowerCase().includes(q));

  const toggle = (id: string) => {
    onChange(values.includes(id) ? values.filter(v => v !== id) : [...values, id]);
  };

  return (
    <div className={`relative ${className}`} ref={ref}>
      <div
        className="flex flex-wrap items-center gap-1.5 px-3 py-2 bg-white rounded-xl border border-slate-200 shadow-sm transition-all min-h-[44px] cursor-text"
        onClick={() => { setOpen(!open); setSearch(''); }}
      >
        {selected.map(o => {
          const c = colorOf(o.id);
          return (
            <span key={o.id} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>
              {o.name || '?'}
              <button type="button" onClick={e => { e.stopPropagation(); toggle(o.id); }} className="hover:opacity-70">
                <X size={12} />
              </button>
            </span>
          );
        })}
        <input
          type="text"
          value={open ? search : ''}
          placeholder={selected.length === 0 ? placeholder : ''}
          onFocus={() => setOpen(true)}
          onChange={e => { setOpen(true); setSearch(e.target.value); }}
          onKeyDown={e => { if (e.key === 'Escape') setOpen(false); if (e.key === 'Enter') setOpen(false); }}
          onClick={e => e.stopPropagation()}
          className="flex-1 min-w-[100px] outline-none bg-transparent text-sm font-medium text-slate-700 placeholder:text-slate-400"
        />
      </div>

      {open && (
        <div className="absolute left-0 right-0 mt-2 bg-white rounded-xl border border-slate-200 shadow-xl z-50 overflow-hidden py-1 max-h-72 overflow-y-auto">
          {filtered.length > 0 ? (
            filtered.map(o => {
              const c = colorOf(o.id);
              const active = values.includes(o.id);
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => toggle(o.id)}
                  className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm text-left hover:bg-slate-50 ${active ? 'text-teal-700 font-semibold' : 'text-slate-700 font-medium'}`}
                >
                  <span className={`h-6 w-6 shrink-0 rounded-full ${c.bg} ${c.text} text-[11px] font-bold flex items-center justify-center`}>
                    {getInitials(o.name)}
                  </span>
                  <span className="flex-1 truncate">{o.name || '?'}</span>
                  {active && <Check size={14} className="shrink-0 text-teal-600" />}
                </button>
              );
            })
          ) : (
            <p className="px-4 py-2 text-sm text-slate-400 italic">Nessun risultato</p>
          )}
        </div>
      )}
    </div>
  );
};

// --- DualRangeSlider: slider a doppia impugnatura (min/max) ---
const DualRangeSlider: React.FC<{
  min: number;
  max: number;
  valueMin: number;
  valueMax: number;
  onChange: (vmin: number, vmax: number) => void;
}> = ({ min, max, valueMin, valueMax, onChange }) => {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [drag, setDrag] = useState<'min' | 'max' | null>(null);

  const pct = (v: number) => ((v - min) / (max - min)) * 100;

  const valueFromClientX = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return min;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return Math.round(min + ratio * (max - min));
  };

  React.useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => {
      const v = valueFromClientX(e.clientX);
      if (drag === 'min') onChange(Math.min(Math.max(v, min), valueMax), valueMax);
      else onChange(valueMin, Math.max(Math.min(v, max), valueMin));
    };
    const up = () => setDrag(null);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [drag, valueMin, valueMax, min, max]);

  const startDrag = (which: 'min' | 'max') => (e: React.PointerEvent) => {
    e.preventDefault();
    setDrag(which);
  };

  const onTrackPointerDown = (e: React.PointerEvent) => {
    const v = valueFromClientX(e.clientX);
    const which = Math.abs(v - valueMin) <= Math.abs(v - valueMax) ? 'min' : 'max';
    if (which === 'min') onChange(Math.min(Math.max(v, min), valueMax), valueMax);
    else onChange(valueMin, Math.max(Math.min(v, max), valueMin));
    setDrag(which);
  };

  const handleCls = "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-5 w-5 rounded-full bg-white border-2 border-teal-600 shadow-md cursor-grab active:cursor-grabbing hover:scale-110 transition-transform touch-none";

  return (
    <div className="pt-7 pb-6 select-none">
      <div ref={trackRef} className="relative h-2 rounded-full bg-slate-200 cursor-pointer touch-none" onPointerDown={onTrackPointerDown}>
        <div
          className="absolute h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500"
          style={{ left: `${pct(valueMin)}%`, width: `${pct(valueMax) - pct(valueMin)}%` }}
        ></div>
        <div
          className={handleCls}
          style={{ left: `${pct(valueMin)}%` }}
          onPointerDown={startDrag('min')}
        >
          {drag === 'min' && (
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-slate-800 text-white text-[11px] font-bold tabular-nums whitespace-nowrap">
              Min {valueMin}h
            </span>
          )}
        </div>
        <div
          className={handleCls}
          style={{ left: `${pct(valueMax)}%` }}
          onPointerDown={startDrag('max')}
        >
          {drag === 'max' && (
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-slate-800 text-white text-[11px] font-bold tabular-nums whitespace-nowrap">
              Max {valueMax}h
            </span>
          )}
        </div>
      </div>
      <div className="flex justify-between items-center mt-2 text-[11px] font-semibold tabular-nums">
        <span className="text-teal-700">Min: {valueMin}h</span>
        <span className="text-slate-400 font-medium">scala {min}–{max} h</span>
        <span className="text-emerald-700">Max: {valueMax}h</span>
      </div>
    </div>
  );
};

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
            tutorId: profile.tutor_id || null,
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
        const [t, y, s, yt, ps, cm] = await Promise.all([
          supabase.from('tutors').select('*'),
          supabase.from('youths').select('*'),
          supabase.from('shifts').select('*'),
          supabase.from('youth_tutors').select('*'),
          supabase.from('pay_settings').select('*').eq('id', 'global').maybeSingle(),
          supabase.from('cleared_months').select('month')
        ]);

        if (t.error) throw t.error;
        if (y.error) throw y.error;
        if (s.error) throw s.error;
        if (yt.error) throw yt.error;
        if (ps.error) console.warn('pay_settings non disponibile:', ps.error.message);
        if (cm.error) console.warn('cleared_months non disponibile:', cm.error.message);

        setClearedMonths(new Set((cm.data || []).map((r: any) => r.month as string)));

        if (ps?.data) {
          const rates = {
            rateSingle: Number(ps.data.rate_single) || 0,
            rateDouble: Number(ps.data.rate_double) || 0,
            weeksPerMonth: Number(ps.data.weeks_per_month) || 4,
          };
          setPayRates(rates);
          setPayRatesDraft(rates);
        }

        const tutorsByYouth: Record<string, string[]> = {};
        (yt.data || []).forEach((row: any) => {
          if (!tutorsByYouth[row.youth_id]) tutorsByYouth[row.youth_id] = [];
          tutorsByYouth[row.youth_id].push(row.tutor_id);
        });

        const normalizedTutors = (t.data || []).map((tutor: any) => ({
          ...tutor,
          specialties: tutor.specialties || [],
          unavailableDays: tutor.unavailable_days || [],
          maxHoursPerWeek: tutor.max_hours_per_week,
          minHoursPerWeek: tutor.min_hours_per_week ?? null,
          phone: tutor.phone || '',
          email: tutor.email || '',
          birthDate: tutor.birth_date || undefined,
          city: tutor.city || '',
          role: tutor.role || '',
          qualifications: tutor.qualifications || '',
          yearsExperience: tutor.years_experience || undefined,
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
          fiscalCode: youth.fiscal_code || '',
          phone: youth.phone || '',
          school: youth.school || '',
          contacts: (Array.isArray(youth.contacts) && youth.contacts.length > 0)
            ? youth.contacts
            : [
                ...(youth.parent1_name || youth.parent1_phone || youth.parent1_email
                  ? [{ id: 'p1', label: 'Genitore 1', name: youth.parent1_name || '', phone: youth.parent1_phone || '', email: youth.parent1_email || '' }]
                  : []),
                ...(youth.parent2_name || youth.parent2_phone || youth.parent2_email
                  ? [{ id: 'p2', label: 'Genitore 2', name: youth.parent2_name || '', phone: youth.parent2_phone || '', email: youth.parent2_email || '' }]
                  : []),
              ],
          privacyConsentDate: youth.privacy_consent_date || null,
          outingsAuthorized: youth.outings_authorized || false,
          allergies: youth.allergies || '',
          medications: youth.medications || '',
          contractStartDate: youth.contract_start_date || null,
          contractEndDate: youth.contract_end_date || null,
          entryDate: youth.entry_date || null,
          status: youth.status || 'attivo',
          goals: youth.goals || '',
          tutorIds: tutorsByYouth[youth.id] || [],
        }));

        const normalizedShifts = (s.data || []).map((shift: any) => ({
          ...shift,
          tutorId: shift.tutor_id,
          youthId: shift.youth_id,
          youthIds: Array.isArray(shift.youth_ids) && shift.youth_ids.length > 0 ? shift.youth_ids : (shift.youth_id ? [shift.youth_id] : []),
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
  const [tutorToDelete, setTutorToDelete] = useState<Tutor | null>(null);

  const [isYouthModalOpen, setIsYouthModalOpen] = useState(false);
  const [newYouth, setNewYouth] = useState<Partial<Youth>>({});
  const [youthToDelete, setYouthToDelete] = useState<Youth | null>(null);
  const [youthSearch, setYouthSearch] = useState('');
  const [youthSort, setYouthSort] = useState<'asc' | 'desc'>('asc');
  const [youthStatusFilter, setYouthStatusFilter] = useState<'tutti' | 'attivo' | 'pausa' | 'archiviato'>('tutti');
  const [youthTutorFilter, setYouthTutorFilter] = useState('tutti');

  // AI State
  const [analysisResult, setAnalysisResult] = useState<ConflictAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Copia pianificazione su mese
  const [replicateMonth, setReplicateMonth] = useState(() => format(new Date(), 'yyyy-MM'));

  // Cancella turni consuntivo per mese
  const [clearMonth, setClearMonth] = useState(() => format(new Date(), 'yyyy-MM'));

  // Mesi del consuntivo cancellati: la copia automatica della settimana tipo salta questi mesi
  const [clearedMonths, setClearedMonths] = useState<Set<string>>(new Set());

  // Drag and Drop State
  const [draggedShiftId, setDraggedShiftId] = useState<string | null>(null);
  const [dragOverCoords, setDragOverCoords] = useState<{ dateStr: string, minutes: number } | null>(null);

  // Resize State (Google Calendar style: drag the bottom edge to change duration)
  const [resizingShiftId, setResizingShiftId] = useState<string | null>(null);
  const resizeRef = useRef<{ shiftId: string; startEndMin: number; startY: number; endMin: number | null } | null>(null);

  // Tutor Filter State ('all' or a tutor id)
  const [tutorFilter, setTutorFilter] = useState<string>('all');
  const [tutorSearch, setTutorSearch] = useState('');
  const [tutorSort, setTutorSort] = useState<'asc' | 'desc'>('asc');
  const [tutorStatusFilter, setTutorStatusFilter] = useState<'tutti' | 'attivo' | 'pausa' | 'archiviato'>('tutti');
  const [tutorRoleFilter, setTutorRoleFilter] = useState('tutti');

  // Calendar view state: vista per tutor oppure per ragazzo
  const [calendarView, setCalendarView] = useState<'tutor' | 'youth'>('tutor');
  const [youthFilter, setYouthFilter] = useState<string>('all');

  // WhatsApp share state
  const [isWhatsAppSending, setIsWhatsAppSending] = useState(false);

  // Mobile Menu State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Desktop Sidebar State: nascosta di default, appare al mouse over
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  // Summary View State
  const [summaryStartDate, setSummaryStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [summaryEndDate, setSummaryEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [summaryTutorFilter, setSummaryTutorFilter] = useState<string>('all');
  const [summaryYouthFilter, setSummaryYouthFilter] = useState<string>('all');
  const [summaryMonth, setSummaryMonth] = useState(() => startOfMonth(new Date()));

  // Payroll (Calcolo Paga) State
  const [payRates, setPayRates] = useState<PaySettings>({ rateSingle: 0, rateDouble: 0, weeksPerMonth: 4 });
  const [payRatesDraft, setPayRatesDraft] = useState<PaySettings>({ rateSingle: 0, rateDouble: 0, weeksPerMonth: 4 });
  const [payMonth, setPayMonth] = useState(() => startOfMonth(new Date()));
  const [paySaving, setPaySaving] = useState(false);
  const [paySavedFlash, setPaySavedFlash] = useState(false);
  const [paySort, setPaySort] = useState<{ key: 'tutor' | 'wSingle' | 'wDouble' | 'base' | 'total' | null; dir: 'asc' | 'desc' }>({ key: null, dir: 'asc' });

  // Recuperi & Monte Ore State
  const [recMonth, setRecMonth] = useState(() => startOfMonth(new Date()));

  // Helper: Get start of current week (Monday)
  const startOfCurrentWeek = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 6 }).map((_, i) => addDays(startOfCurrentWeek, i)); // LUN-SAB
  const templateWeekDays = Array.from({ length: 6 }).map((_, i) => addDays(TEMPLATE_ANCHOR, i)); // settimana tipo LUN-SAB

  // Sposta il periodo del Riepilogo Ore al mese indicato (intervallo = intero mese)
  const setSummaryMonthRange = (m: Date) => {
    setSummaryMonth(m);
    setSummaryStartDate(format(startOfMonth(m), 'yyyy-MM-dd'));
    setSummaryEndDate(format(endOfMonth(m), 'yyyy-MM-dd'));
  };

  // --- Handlers ---

  const handleSaveTutor = async () => {
    if (!newTutor.name) return;

    try {
      const tutorData = {
        id: newTutor.id || Math.random().toString(36).slice(2, 11),
        name: newTutor.name,
        specialties: newTutor.specialties || [],
        max_hours_per_week: newTutor.maxHoursPerWeek ?? 20,
        min_hours_per_week: newTutor.minHoursPerWeek ?? 1,
        unavailable_days: newTutor.unavailableDays || [],
        notes: newTutor.notes || '',
        phone: newTutor.phone || '',
        email: newTutor.email || '',
        birth_date: newTutor.birthDate || null,
        city: newTutor.city || '',
        role: newTutor.role || '',
        qualifications: newTutor.qualifications || '',
        years_experience: newTutor.yearsExperience || null,
        status: newTutor.status || 'attivo',
        entry_date: newTutor.entryDate || null,
      };

      const { error } = await supabase.from('tutors').upsert(tutorData);
      if (error) throw error;

      if (newTutor.id) {
        setTutors(tutors.map(t => t.id === newTutor.id ? { ...t, ...tutorData, maxHoursPerWeek: tutorData.max_hours_per_week, minHoursPerWeek: tutorData.min_hours_per_week, unavailableDays: tutorData.unavailable_days, birthDate: tutorData.birth_date, entryDate: tutorData.entry_date, yearsExperience: tutorData.years_experience } : t));
      } else {
        setTutors([...tutors, { ...tutorData, maxHoursPerWeek: tutorData.max_hours_per_week, minHoursPerWeek: tutorData.min_hours_per_week, unavailableDays: tutorData.unavailable_days, birthDate: tutorData.birth_date, entryDate: tutorData.entry_date, yearsExperience: tutorData.years_experience }]);
      }
      setIsTutorModalOpen(false);
      setNewTutor({});
    } catch (error) {
      console.error("Error saving tutor:", error);
      alert("Errore nel salvataggio del tutor");
    }
  };

  const handleDeleteTutor = async (id: string) => {
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
      const youthId = newYouth.id || Math.random().toString(36).slice(2, 11);
      const youthData = {
        id: youthId,
        name: newYouth.name,
        needs: newYouth.needs || [],
        required_hours_per_week: newYouth.requiredHoursPerWeek ?? 4,
        notes: newYouth.notes || '',
        birth_date: newYouth.birthDate || null,
        birth_place: newYouth.birthPlace || '',
        fiscal_code: newYouth.fiscalCode || '',
        phone: newYouth.phone || '',
        school: newYouth.school || '',
        contacts: (newYouth.contacts || []).map(c => ({ ...c, name: c.name || '', phone: c.phone || '', email: c.email || '' })),
        privacy_consent_date: newYouth.privacyConsentDate || null,
        outings_authorized: newYouth.outingsAuthorized || false,
        diagnoses: newYouth.diagnoses || [],
        allergies: newYouth.allergies || '',
        medications: newYouth.medications || '',
        contract_start_date: newYouth.contractStartDate || null,
        contract_end_date: newYouth.contractEndDate || null,
        entry_date: newYouth.entryDate || null,
        status: newYouth.status || 'attivo',
        goals: newYouth.goals || '',
      };

      const { error } = await supabase.from('youths').upsert(youthData);
      if (error) throw error;

      const tutorIds = newYouth.tutorIds || [];
      await supabase.from('youth_tutors').delete().eq('youth_id', youthId);
      if (tutorIds.length > 0) {
        const { error: linkError } = await supabase.from('youth_tutors').insert(
          tutorIds.map(tutorId => ({ youth_id: youthId, tutor_id: tutorId }))
        );
        if (linkError) throw linkError;
      }

      const normalized = {
        ...youthData,
        requiredHoursPerWeek: youthData.required_hours_per_week,
        birthDate: youthData.birth_date,
        birthPlace: youthData.birth_place,
        fiscalCode: youthData.fiscal_code,
        contacts: youthData.contacts,
        privacyConsentDate: youthData.privacy_consent_date,
        outingsAuthorized: youthData.outings_authorized,
        allergies: youthData.allergies,
        medications: youthData.medications,
        contractStartDate: youthData.contract_start_date,
        contractEndDate: youthData.contract_end_date,
        entryDate: youthData.entry_date,
        goals: youthData.goals,
        tutorIds,
      };

      if (newYouth.id) {
        setYouths(youths.map(y => y.id === youthId ? { ...y, ...normalized } : y));
      } else {
        setYouths([...youths, { ...normalized }]);
      }
      setIsYouthModalOpen(false);
      setNewYouth({});
    } catch (error) {
      console.error("Error saving youth:", error);
      alert("Errore nel salvataggio del ragazzo");
    }
  };

  const handleDeleteYouth = async (id: string) => {
    try {
      const { error } = await supabase.from('youths').delete().eq('id', id);
      if (error) throw error;
      setYouths(youths.filter(y => y.id !== id));
      setShifts(shifts.filter(s => shiftYouthIds(s).every(sid => sid !== id)));
    } catch (error) {
      console.error("Error deleting youth:", error);
      alert("Errore nell'eliminazione del ragazzo");
    }
  };

  const updateContact = (cid: string, field: 'label' | 'name' | 'phone' | 'email', value: string) => {
    setNewYouth({ ...newYouth, contacts: (newYouth.contacts || []).map(c => c.id === cid ? { ...c, [field]: value } : c) });
  };

  const addContact = () => {
    setNewYouth({ ...newYouth, contacts: [...(newYouth.contacts || []), { id: `c${Date.now()}${Math.random().toString(36).slice(2, 6)}`, label: 'Genitore', name: '', phone: '', email: '' }] });
  };

  const removeContact = (cid: string) => {
    setNewYouth({ ...newYouth, contacts: (newYouth.contacts || []).filter(c => c.id !== cid) });
  };

  const addEditingYouth = (youthId: string) => {
    if (!youthId) return;
    const current = editingShift?.youthIds && editingShift.youthIds.length > 0
      ? editingShift.youthIds
      : (editingShift?.youthId ? [editingShift.youthId] : []);
    if (current.includes(youthId)) return;
    const next = [...current, youthId];
    setEditingShift({ ...editingShift, youthId: next[0], youthIds: next });
  };

  const removeEditingYouth = (youthId: string) => {
    const current = editingShift?.youthIds && editingShift.youthIds.length > 0
      ? editingShift.youthIds
      : (editingShift?.youthId ? [editingShift.youthId] : []);
    const next = current.filter(id => id !== youthId);
    setEditingShift({ ...editingShift, youthId: next[0] || '', youthIds: next });
  };

  const handleSaveShift = async () => {
    const youthIds = editingShift?.youthIds && editingShift.youthIds.length > 0
      ? editingShift.youthIds
      : (editingShift?.youthId ? [editingShift.youthId] : []);
    if (!editingShift?.tutorId || youthIds.length === 0 || !editingShift?.startTime || !editingShift?.endTime || !editingShift?.date) return;

    const isPlan = shiftModalMode === 'plan';
    const templateWeekday = isPlan
      ? (editingShift.templateWeekday ?? weekdayOf(editingShift.date))
      : null;

    try {
      const shiftData = {
        id: editingShift.id || Math.random().toString(36).slice(2, 11),
        tutor_id: editingShift.tutorId,
        youth_id: youthIds[0] || null,
        youth_ids: youthIds,
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
        youthIds: shiftData.youth_ids,
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

  const openNewShiftModal = (tutorId?: string, dateStr?: string, startTime?: string, youthId?: string) => {
    setEditingShift({
      tutorId: tutorId || '',
      youthId: youthId || '',
      youthIds: youthId ? [youthId] : [],
      date: dateStr || format(new Date(), 'yyyy-MM-dd'),
      startTime: startTime || '15:00',
      endTime: startTime ? `${String((parseInt(startTime.split(':')[0]) + 2) % 24).padStart(2, '0')}:00` : '17:00',
      isTemplate: false,
      templateShiftId: null,
    });
    setShiftModalMode('validate');
    setIsShiftModalOpen(true);
  };

  const openNewTemplateShiftModal = (weekday: number, startTime?: string, youthId?: string) => {
    setEditingShift({
      tutorId: '',
      youthId: youthId || '',
      youthIds: youthId ? [youthId] : [],
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

  // Riepilogo testuale dei turni visibili (per WhatsApp)
  const buildWeeklySummary = () => {
    const isPlan = view === 'DASHBOARD';
    const days = isPlan ? templateWeekDays : weekDays;
    const labels = ['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB'];
    const lines: string[] = [];
    days.forEach((day, idx) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayShifts = visibleShifts.filter(s => {
        if (calendarView === 'youth') {
          if (youthFilter !== 'all' && !shiftYouthIds(s).includes(youthFilter)) return false;
        } else if (tutorFilter !== 'all' && s.tutorId !== tutorFilter) return false;
        if (isPlan) return s.isTemplate && (s.templateWeekday || weekdayOf(s.date)) === idx + 1;
        if (!s.date || s.isTemplate) return false;
        return (typeof s.date === 'string' ? s.date.split('T')[0] : '') === dateStr;
      });
      const sorted = [...dayShifts].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
      if (sorted.length === 0) return;
      const items = sorted.map(s => {
        const tutor = tutors.find(t => t.id === s.tutorId);
        const shiftYouths = shiftYouthIds(s).map(id => youths.find(y => y.id === id)).filter(Boolean) as Youth[];
        return `${s.startTime}-${s.endTime} ${tutor?.name || '?'}${shiftYouths.length > 0 ? ` (${shiftYouths.map(y => y.name).join(', ')})` : ''}`;
      });
      lines.push(`${isPlan ? labels[idx] : `${labels[idx]} ${format(day, 'dd/MM')}`}: ${items.join(' · ')}`);
    });
    const selectedName = calendarView === 'youth'
      ? (youths.find(y => y.id === youthFilter)?.name || 'il ragazzo')
      : (tutors.find(t => t.id === tutorFilter)?.name || 'Tutti');
    const header = `Turni settimanali - ${selectedName}${isPlan ? ' (settimana tipo)' : ` (${format(days[0], 'dd/MM')} - ${format(days[5], 'dd/MM')})`}`;
    return [header, ...lines].join('\n');
  };

  const handleWhatsAppSend = async () => {
    setIsWhatsAppSending(true);
    try {
      const node = document.getElementById('weekly-matrix');
      if (!node) throw new Error('Matrice non trovata');
      const dataUrl = await toPng(node, { pixelRatio: 2, backgroundColor: '#ffffff', cacheBust: true });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], 'turni_settimanali.png', { type: 'image/png' });
      const text = buildWeeklySummary();
      const isMobile = /Android|iPhone|iPad|iPod|Mobile|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

      if (isMobile && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Turni settimanali', text });
      } else {
        let copied = false;
        if (navigator.clipboard && (navigator.clipboard as any).write) {
          try {
            await (navigator.clipboard as any).write([new ClipboardItem({ 'image/png': blob })]);
            copied = true;
          } catch {
            copied = false;
          }
        }
        if (!copied) {
          const link = document.createElement('a');
          link.href = dataUrl;
          link.download = 'turni_settimanali.png';
          link.click();
        }
        window.open(`https://web.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
        alert(copied
          ? 'Screenshot copiato negli appunti: in WhatsApp Web scegli la chat e premi Ctrl+V per incollare e inviare.'
          : 'Il file turni_settimanali.png è stato scaricato: in WhatsApp Web scegli la chat e allega il file.');
      }
    } catch (error) {
      console.error("Errore invio WhatsApp:", error);
      alert("Errore durante la generazione dell'immagine. Riprova.");
    } finally {
      setIsWhatsAppSending(false);
    }
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

  // Copia i turni della pianificazione (settimana tipo) su tutti i giorni del mese scelto (idempotente)
  const handleReplicateMonth = async () => {
    if (!replicateMonth) return;
    const templateShifts = shifts.filter(s => s.isTemplate);
    if (templateShifts.length === 0) {
      alert("Nessuna pianificazione settimanale da copiare: crea prima i turni nella settimana tipo.");
      return;
    }

    const monthStart = `${replicateMonth}-01`;
    const monthEnd = format(endOfMonth(parseISO(monthStart)), 'yyyy-MM-dd');

    // Giorni del mese
    const days: string[] = [];
    for (let d = parseISO(monthStart); format(d, 'yyyy-MM-dd') <= monthEnd; d = addDays(d, 1)) {
      const wd = getDay(d); // 0=dom ... 6=sab
      if (wd >= 1 && wd <= 6) days.push(format(d, 'yyyy-MM-dd'));
    }
    if (days.length === 0) {
      alert("Nessun giorno valido nel mese selezionato.");
      return;
    }

    // Escludi occorrenze già presenti (stesso template + data)
    const existingKeys = new Set(
      shifts.filter(s => !s.isTemplate).map(s => `${s.templateShiftId}|${s.date}`)
    );

    const rows = templateShifts.flatMap(t => (
      days
        .filter(date => {
          const wd = getDay(parseISO(date));
          return Math.min(Math.max(((t.templateWeekday || weekdayOf(t.date)) - 1), 0), 5) + 1 === wd;
        })
        .filter(date => !existingKeys.has(`${t.id}|${date}`))
        .map(date => ({
          id: Math.random().toString(36).slice(2, 11),
          tutor_id: t.tutorId,
          youth_id: t.youthId,
          youth_ids: shiftYouthIds(t),
          date,
          start_time: t.startTime,
          end_time: t.endTime,
          activity: t.activity || '',
          status: 'pianificato',
          is_template: false,
          template_weekday: null,
          template_shift_id: t.id,
        }))
    ));

    if (rows.length === 0) {
      alert("Tutti i turni di questo mese sono già stati copiati dalla pianificazione.");
      return;
    }

    if (!confirm(`Copiare ${rows.length} turni della settimana tipo nel mese selezionato?`)) return;

    try {
      const { error } = await supabase.from('shifts').insert(rows);
      if (error) throw error;
      const normalized = rows.map(r => ({
        id: r.id,
        tutorId: r.tutor_id,
        youthId: r.youth_id,
        youthIds: r.youth_ids,
        date: r.date,
        startTime: r.start_time,
        endTime: r.end_time,
        activity: r.activity,
        status: r.status,
        isTemplate: r.is_template,
        templateWeekday: null as unknown as number,
        templateShiftId: r.template_shift_id,
      }));
      setShifts(prev => [...prev, ...normalized]);
      alert(`Fatto: ${rows.length} turni copiati nel mese selezionato.`);
    } catch (error) {
      console.error("Error replicating month:", error);
      alert("Errore durante la copia della pianificazione sul mese");
    }
  };

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    const report = analyzeConflicts(tutors, shifts.filter(s => s.isTemplate));
    setAnalysisResult(report);
    setIsAnalyzing(false);
  };

  // Cancella TUTTI i turni di consuntivo (non template) in tutto il DB, indipendentemente dal mese
  const handleClearAllConsuntivo = async () => {
    const count = shifts.filter(s => !s.isTemplate).length;
    if (count === 0) {
      alert("Nessun turno di consuntivo da cancellare.");
      return;
    }
    if (!confirm(`ATTENZIONE: cancellare TUTTI i ${count} turni del consuntivo in tutto il database, indipendentemente dal mese? L'azione non può essere annullata.`)) return;
    try {
      const { error } = await supabase.from('shifts').delete().eq('is_template', false);
      if (error) throw error;
      setShifts(prev => prev.filter(s => s.isTemplate));
      alert(`Fatto: tutti i ${count} turni del consuntivo sono stati cancellati.`);
    } catch (error) {
      console.error("Error clearing all consuntivo shifts:", error);
      alert("Errore durante la cancellazione di tutti i turni del consuntivo");
    }
  };

  // Cancella tutti i turni di consuntivo (non template) del mese scelto
  const handleClearMonthShifts = async () => {
    if (!clearMonth) return;
    const monthStart = `${clearMonth}-01`;
    const monthEnd = format(endOfMonth(parseISO(monthStart)), 'yyyy-MM-dd');
    const toDelete = shifts.filter(s => !s.isTemplate && s.date && s.date >= monthStart && s.date <= monthEnd);
    if (toDelete.length === 0) {
      alert("Nessun turno da cancellare nel mese selezionato.");
      return;
    }
    if (!confirm(`Cancellare ${toDelete.length} turni del mese selezionato dal consuntivo? L'azione non può essere annullata.`)) return;
    try {
      const ids = toDelete.map(s => s.id);
      const { error } = await supabase.from('shifts').delete().in('id', ids);
      if (error) throw error;
      // Registra il mese come cancellato: la copia automatica della settimana tipo lo salterà
      const { error: cmErr } = await supabase.from('cleared_months').upsert({ month: clearMonth });
      if (cmErr) console.warn('cleared_months non aggiornabile:', cmErr.message);
      setClearedMonths(prev => new Set(prev).add(clearMonth));
      const idSet = new Set(ids);
      setShifts(prev => prev.filter(s => !idSet.has(s.id)));
      alert(`Fatto: ${ids.length} turni cancellati dal consuntivo del mese selezionato.`);
    } catch (error) {
      console.error("Error clearing month shifts:", error);
      alert("Errore durante la cancellazione dei turni del mese");
    }
  };

  // Copia i turni della pianificazione (template) nella settimana reale indicata (idempotente)
  const materializeWeek = async (weekStart: Date) => {
    const templateShifts = shifts.filter(s => s.isTemplate);
    if (templateShifts.length === 0) return;

    const weekDateStrs = Array.from({ length: 6 }).map((_, i) => format(addDays(weekStart, i), 'yyyy-MM-dd'))
      .filter(date => !clearedMonths.has(date.slice(0, 7)));
    const existing = shifts.filter(s => !s.isTemplate && weekDateStrs.includes(s.date));
    const existingTemplateIds = new Set(existing.map(s => s.templateShiftId).filter(Boolean) as string[]);

    const toCreate = templateShifts.filter(t => !existingTemplateIds.has(t.id));
    if (toCreate.length === 0) return;

    const rows = toCreate.map(t => ({
      id: Math.random().toString(36).slice(2, 11),
      tutor_id: t.tutorId,
      youth_id: t.youthId,
      youth_ids: shiftYouthIds(t),
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
        youthIds: r.youth_ids,
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
  // ma SOLO per i giorni da oggi in poi, non cancellati e senza modifiche manuali al consuntivo.
  const syncTemplateOccurrences = async (template: Shift) => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const occurrences = shifts.filter(s =>
      !s.isTemplate &&
      s.templateShiftId === template.id &&
      s.date >= todayStr &&
      (s.status || 'pianificato') === 'pianificato' &&
      !s.actualStartTime && !s.actualEndTime
    );
    if (occurrences.length === 0) return;

    const wd = Math.min(Math.max((template.templateWeekday || weekdayOf(template.date)) - 1, 0), 5);
    const byId: Record<string, { date: string; start_time: string; end_time: string; activity: string; tutor_id: string; youth_id: string; youth_ids: string[] }> = {};
    for (const s of occurrences) {
      const weekStart = startOfWeek(parseISO(s.date), { weekStartsOn: 1 });
      byId[s.id] = {
        date: format(addDays(weekStart, wd), 'yyyy-MM-dd'),
        start_time: template.startTime,
        end_time: template.endTime,
        activity: template.activity || '',
        tutor_id: template.tutorId,
        youth_id: template.youthId,
        youth_ids: shiftYouthIds(template),
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
          youth_ids: u.youth_ids,
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
          youthIds: u.youth_ids,
        };
      }));
    } catch (error) {
      console.error("Error syncing template occurrences:", error);
      alert("Errore nell'aggiornamento dei turni futuri in validazione");
    }
  };

  // Rimuove da validazione i turni futuri (non cancellati e senza modifiche manuali) quando un template viene eliminato
  const deleteTemplateOccurrences = async (templateId: string) => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const toDelete = shifts.filter(s =>
      !s.isTemplate &&
      s.templateShiftId === templateId &&
      s.date >= todayStr &&
      (s.status || 'pianificato') === 'pianificato' &&
      !s.actualStartTime && !s.actualEndTime
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
      if (clearedMonths.has(date.slice(0, 7))) continue;
      const exists = shifts.some(s => !s.isTemplate && s.templateShiftId === template.id && s.date === date);
      if (exists) continue;
      const row = {
        id: Math.random().toString(36).slice(2, 11),
        tutor_id: template.tutorId,
        youth_id: template.youthId,
        youth_ids: shiftYouthIds(template),
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
          youthIds: row.youth_ids,
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
    if (s && s.status === 'cancellato') {
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
        const effS = !shiftToUpdate.isTemplate && shiftToUpdate.actualStartTime ? shiftToUpdate.actualStartTime : shiftToUpdate.startTime;
        const effE = !shiftToUpdate.isTemplate && shiftToUpdate.actualEndTime ? shiftToUpdate.actualEndTime : shiftToUpdate.endTime;
        const [sh, sm] = (effS || '15:00').split(':').map(Number);
        const [eh, em] = (effE || '17:00').split(':').map(Number);
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
        } else {
          // Consuntivo: si spostano data e orari effettivi, il pianificato resta come riferimento per il delta
          delete dbUpdate.start_time;
          delete dbUpdate.end_time;
          dbUpdate.actual_start_time = newStartTime;
          dbUpdate.actual_end_time = newEndTime;
          updatedShift.actualStartTime = newStartTime;
          updatedShift.actualEndTime = newEndTime;
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

  // Utente "limitato": ha un tutor associato ma NON è ADMIN COMPLETO (ALL).
  // In Pianificazione e Consuntivo vede solo i propri turni.
  const restrictedUserTutorId =
    currentUser && !(Array.isArray(currentUser.permissions) && currentUser.permissions.includes('ALL'))
      ? (currentUser.tutorId || null)
      : null;
  const visibleShifts = restrictedUserTutorId
    ? shifts.filter(s => s.tutorId === restrictedUserTutorId)
    : shifts;

  useEffect(() => {
    if (restrictedUserTutorId) {
      setCalendarView('tutor');
      setTutorFilter(restrictedUserTutorId);
    }
  }, [restrictedUserTutorId]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setCurrentUser(null);
    setView('LOGIN');
  };

  const renderSidebar = () => {
    const navItems: { view: ViewState; perm: string; label: string; icon: React.ElementType; chipText: string }[] = [
      { view: 'DASHBOARD', perm: 'DASHBOARD', label: 'Pianificazione Turni', icon: CalendarIcon, chipText: 'text-teal-600' },
      { view: 'VALIDATION', perm: 'DASHBOARD', label: 'Consuntivo Turni', icon: ClipboardCheck, chipText: 'text-indigo-600' },
      { view: 'TUTORS', perm: 'TUTORS', label: 'Gestione Tutor', icon: UserCheck, chipText: 'text-sky-600' },
      { view: 'YOUTHS', perm: 'YOUTHS', label: 'Anagrafica Ragazzi', icon: Users, chipText: 'text-amber-600' },
      { view: 'SUMMARY', perm: 'SUMMARY', label: 'Riepilogo Ore', icon: BarChart3, chipText: 'text-rose-600' },
      { view: 'RECOVERY', perm: 'SUMMARY', label: 'Recuperi & Monte Ore', icon: Repeat, chipText: 'text-orange-600' },
      { view: 'PAYROLL', perm: 'SUMMARY', label: 'Calcolo Paga', icon: Wallet, chipText: 'text-lime-600' },
    ];
    const adminItem = { view: 'USER_MANAGEMENT' as ViewState, perm: 'ALL', label: 'Gestione Utenti', icon: Settings, chipText: 'text-cyan-600' };

    const sidebarDecor = (
      <>
        <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.045) 0px, rgba(255,255,255,0.045) 1px, transparent 1px, transparent 7px)' }}></div>
        <div className="pointer-events-none absolute -top-24 -right-20 w-72 h-72 rounded-full bg-teal-500/15 blur-3xl"></div>
        <div className="pointer-events-none absolute top-1/3 -left-24 w-80 h-80 rounded-full bg-violet-500/10 blur-3xl"></div>
        <div className="pointer-events-none absolute -bottom-16 -right-10 w-72 h-72 rounded-full bg-emerald-400/15 blur-3xl"></div>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-cyan-400/60 via-white/20 to-emerald-400/60"></div>
      </>
    );

    const renderNavItem = (item: { view: ViewState; label: string; icon: React.ElementType; chipText: string }, onNavigate: () => void, showLabels: boolean) => {
      const active = view === item.view;
      const Icon = item.icon;
      return (
        <button
          key={item.view}
          onClick={onNavigate}
          title={showLabels ? undefined : item.label}
          className={`group relative flex items-center w-full rounded-xl transition-all duration-200 active:scale-[0.98] ${
            showLabels ? 'p-2.5' : 'justify-center p-2'
          } ${
            active
              ? 'bg-white/15 ring-1 ring-white/25 shadow-lg shadow-black/40'
              : 'hover:bg-white/10 hover:ring-1 hover:ring-white/15'
          }`}
        >
          <span className={`flex items-center justify-center w-9 h-9 rounded-lg bg-white shadow-md ring-1 ring-white/50 ${item.chipText} shrink-0 transition-transform duration-200 group-hover:scale-105 ${active ? 'scale-105' : ''}`}>
            <Icon size={17} strokeWidth={2.2} />
          </span>
          {showLabels && (
            <>
              <span className={`ml-3 flex-1 text-sm font-semibold truncate text-left ${active ? 'text-white' : 'text-white/85 group-hover:text-white'}`}>
                {item.label}
              </span>
              {active && <span className="w-1.5 h-7 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.9)]" />}
            </>
          )}
        </button>
      );
    };

    return (
      <>
      {/* Desktop Sidebar (auto-hide: appare al mouse over) */}
      <div
        onMouseEnter={() => setSidebarExpanded(true)}
        onMouseLeave={() => setSidebarExpanded(false)}
        className={`hidden md:flex fixed inset-y-0 left-0 z-50 bg-gradient-to-b from-zinc-900 via-slate-900 to-black text-white shadow-2xl shadow-black/60 flex-col overflow-hidden transition-all duration-300 ${sidebarExpanded ? 'w-64' : 'w-16'}`}
      >
        {sidebarDecor}
        <div className={`relative border-b border-white/10 shrink-0 ${sidebarExpanded ? 'p-6' : 'p-3'}`}>
          <div className={`flex items-center gap-3 min-w-0 ${sidebarExpanded ? '' : 'justify-center'}`}>
            <img src="/logo.png" alt="CentroCare" className="h-10 w-10 rounded-xl shadow-lg ring-2 ring-white/30 shrink-0" />
            {sidebarExpanded && (
              <div className="min-w-0">
                <h1 className="text-xl font-black tracking-tight text-white drop-shadow-md">CentroCare</h1>
                <p className="text-[11px] text-white/70 mt-0.5 font-medium">Gestione Pianificazione</p>
              </div>
            )}
          </div>
          {sidebarExpanded && (
            <div className="mt-4 flex items-center gap-2.5 text-xs text-white bg-white/15 ring-1 ring-white/25 backdrop-blur px-3 py-2 rounded-xl">
              <div className="w-7 h-7 bg-white/95 text-teal-700 rounded-full flex items-center justify-center font-bold shadow-md shrink-0">
                {currentUser?.username?.charAt(0).toUpperCase() || '?'}
              </div>
              <div className="min-w-0">
                <span className="block font-bold truncate">{currentUser?.username || 'Utente'}</span>
                <span className="block text-[10px] text-white/60 uppercase tracking-wider">Area riservata</span>
              </div>
            </div>
          )}
        </div>

        <nav className="relative flex-1 p-4 space-y-1.5 overflow-y-auto">
          {navItems.filter(i => hasPermission(i.perm)).map(i => renderNavItem(i, () => setView(i.view), sidebarExpanded))}
          {hasPermission('ALL') && (
            <>
              {sidebarExpanded && (
                <div className="flex items-center gap-3 my-3 px-1">
                  <div className="h-px flex-1 bg-white/15"></div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">Amministrazione</span>
                  <div className="h-px flex-1 bg-white/15"></div>
                </div>
              )}
              {renderNavItem(adminItem, () => setView(adminItem.view), sidebarExpanded)}
            </>
          )}
        </nav>

        <div className={`relative border-t border-white/10 bg-black/30 shrink-0 ${sidebarExpanded ? 'p-4' : 'p-2'}`}>
          <button onClick={handleLogout} title={sidebarExpanded ? undefined : 'Disconnetti'} className={`group flex items-center w-full rounded-xl text-white/85 hover:text-white hover:bg-red-500/25 ring-1 ring-transparent hover:ring-red-400/40 transition-all active:scale-[0.98] ${sidebarExpanded ? 'p-2.5' : 'justify-center p-2'}`}>
            <span className={`flex items-center justify-center w-9 h-9 rounded-lg bg-white/95 text-red-600 shadow-md ring-1 ring-white/50 shrink-0 transition-transform group-hover:scale-105 ${sidebarExpanded ? 'mr-3' : ''}`}>
              <LogOut size={17} strokeWidth={2.2} />
            </span>
            {sidebarExpanded && <span className="text-sm font-semibold">Disconnetti</span>}
          </button>
        </div>
      </div>

      {/* Mobile Sidebar */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-gradient-to-b from-zinc-900 via-slate-900 to-black text-white flex flex-col shadow-2xl animate-slide-in-left overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {sidebarDecor}
            <div className="relative p-5 border-b border-white/10">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3 min-w-0">
                  <img src="/logo.png" alt="CentroCare" className="h-10 w-10 rounded-xl shadow-lg ring-2 ring-white/30 shrink-0" />
                  <div className="min-w-0">
                    <h1 className="text-xl font-black tracking-tight text-white drop-shadow-md">CentroCare</h1>
                    <p className="text-[11px] text-white/70 font-medium">Gestione Pianificazione</p>
                  </div>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 rounded-xl bg-white/10 text-white/80 hover:text-white hover:bg-white/20 transition-colors shrink-0" aria-label="Chiudi menu">
                  <X size={22} />
                </button>
              </div>
              <div className="mt-4 flex items-center gap-2.5 text-xs text-white bg-white/15 ring-1 ring-white/25 backdrop-blur px-3 py-2 rounded-xl">
                <div className="w-7 h-7 bg-white/95 text-teal-700 rounded-full flex items-center justify-center font-bold shadow-md shrink-0">
                  {currentUser?.username?.charAt(0).toUpperCase() || '?'}
                </div>
                <div className="min-w-0">
                  <span className="block font-bold truncate">{currentUser?.username || 'Utente'}</span>
                  <span className="block text-[10px] text-white/60 uppercase tracking-wider">Area riservata</span>
                </div>
              </div>
            </div>
            <nav className="relative flex-1 p-4 space-y-1.5 overflow-y-auto">
              {navItems.filter(i => hasPermission(i.perm)).map(i => renderNavItem(i, () => { setView(i.view); setIsMobileMenuOpen(false); }, true))}
              {hasPermission('ALL') && (
                <>
                  <div className="flex items-center gap-3 my-3 px-1">
                    <div className="h-px flex-1 bg-white/15"></div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">Amministrazione</span>
                    <div className="h-px flex-1 bg-white/15"></div>
                  </div>
                  {renderNavItem(adminItem, () => { setView(adminItem.view); setIsMobileMenuOpen(false); }, true)}
                </>
              )}
            </nav>
            <div className="relative p-4 border-t border-white/10 bg-black/30">
              <button onClick={handleLogout} className="group flex items-center w-full p-2.5 rounded-xl text-white/85 hover:text-white hover:bg-red-500/25 ring-1 ring-transparent hover:ring-red-400/40 transition-all active:scale-[0.98]">
                <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/95 text-red-600 shadow-md ring-1 ring-white/50 shrink-0 mr-3 transition-transform group-hover:scale-105">
                  <LogOut size={17} strokeWidth={2.2} />
                </span>
                <span className="text-sm font-semibold">Disconnetti</span>
              </button>
            </div>
          </div>
        </div>
      )}
      </>
    );
  };

  const renderMobileHeader = () => {
    const viewLabel = view === 'DASHBOARD' ? 'Pianificazione Turni'
      : view === 'VALIDATION' ? 'Consuntivo Turni'
      : view === 'TUTORS' ? 'Gestione Tutor'
      : view === 'YOUTHS' ? 'Anagrafica Ragazzi'
      : view === 'SUMMARY' ? 'Riepilogo Ore'
      : view === 'RECOVERY' ? 'Recuperi & Monte Ore'
      : view === 'PAYROLL' ? 'Calcolo Paga'
      : view === 'USER_MANAGEMENT' ? 'Gestione Utenti'
      : 'CentroCare';
    return (
      <div className="md:hidden bg-gradient-to-r from-zinc-900 via-slate-900 to-black text-white px-3 py-2.5 flex items-center gap-2 sticky top-0 z-30 shadow-lg shadow-black/40">
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all shrink-0"
          aria-label="Apri menu"
        >
          <Menu size={24} />
        </button>
        <div className="flex items-center gap-2.5 min-w-0 flex-1 justify-center">
          <img src="/logo.png" alt="" className="h-8 w-auto rounded-lg shrink-0" />
          <div className="leading-tight min-w-0 text-center">
            <span className="block font-bold text-sm">CentroCare</span>
            <span className="block text-[11px] text-teal-300 font-medium truncate">{viewLabel}</span>
          </div>
        </div>
        <span className="w-10 shrink-0"></span>
      </div>
    );
  };

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

    return (
      <div className="space-y-6">
        <div className="md:sticky md:top-0 md:z-20 bg-slate-50 pt-1 pb-2 space-y-4 md:space-y-6">
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
          {statusCounters.map(c => (
            <button
              key={c.key}
              onClick={() => setTutorStatusFilter(c.key)}
              className={`flex items-center gap-3 rounded-xl border bg-white p-3 md:p-4 text-left transition-all ring-2 ring-transparent ${tutorStatusFilter === c.key ? c.active : c.idle}`}
            >
              <span className={`w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0 ${c.iconCls}`}>
                <c.icon size={18} />
              </span>
              <span>
                <span className="block text-xl md:text-2xl font-extrabold text-slate-800 leading-none">{c.count}</span>
                <span className="block text-[11px] md:text-xs font-medium text-slate-500 mt-1">{c.label}</span>
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
                <Card key={tutor.id} className="overflow-hidden hover:shadow-xl transition-shadow group cursor-pointer" onClick={() => openEditTutorModal(tutor)}>
                  <div className={`h-1.5 bg-gradient-to-r ${
                    tutor.status === 'pausa' ? 'from-amber-400 to-orange-500'
                    : tutor.status === 'archiviato' ? 'from-slate-300 to-slate-400'
                    : 'from-blue-400 to-cyan-500'
                  }`}></div>
                  <div className="p-5 relative">
                    <div className="absolute top-4 right-4 flex space-x-2 items-center">
                      {tutor.status === 'pausa' && <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-amber-100 text-amber-700 border border-amber-200">Pausa</span>}
                      {tutor.status === 'archiviato' && <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-slate-200 text-slate-600 border border-slate-300">Archiviato</span>}
                      <button onClick={e => { e.stopPropagation(); setTutorToDelete(tutor); }} className="text-gray-300 hover:text-red-500 transition-colors" title="Elimina">
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
                          <>
                            <a href={`tel:${tutor.phone.replace(/\s+/g, '')}`} onClick={e => e.stopPropagation()} className="inline-flex items-center gap-1 text-teal-700 hover:underline font-medium">
                              <Phone size={13} /> {tutor.phone}
                            </a>
                            {waHref(tutor.phone) && (
                              <a href={waHref(tutor.phone)} onClick={e => e.stopPropagation()} target="_blank" rel="noopener noreferrer" title={`Chat WhatsApp con ${tutor.name}`} className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#25D366] text-white hover:bg-[#1eb457] transition-colors">
                                <WhatsAppIcon size={13} />
                              </a>
                            )}
                          </>
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
      const matchTutor = youthTutorFilter === 'tutti' || (y.tutorIds || []).includes(youthTutorFilter);
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
        <div className="md:sticky md:top-0 md:z-20 bg-slate-50 pt-1 pb-2 space-y-4 md:space-y-6">
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
          {statusCounters.map(c => (
            <button
              key={c.key}
              onClick={() => setYouthStatusFilter(c.key)}
              className={`flex items-center gap-3 rounded-xl border bg-white p-3 md:p-4 text-left transition-all ring-2 ring-transparent ${youthStatusFilter === c.key ? c.active : c.idle}`}
            >
              <span className={`w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0 ${c.iconCls}`}>
                <c.icon size={18} />
              </span>
              <span>
                <span className="block text-xl md:text-2xl font-extrabold text-slate-800 leading-none">{c.count}</span>
                <span className="block text-[11px] md:text-xs font-medium text-slate-500 mt-1">{c.label}</span>
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
          <PersonCombo
            options={tutors}
            value={youthTutorFilter}
            onChange={setYouthTutorFilter}
            placeholder="Tutti i referenti"
            colorOf={id => getTutorColor(id, tutors)}
            allowAll
            allLabel="Tutti i referenti"
            allValue="tutti"
            className="w-64"
          />
          <span className="px-3.5 py-2 rounded-full bg-slate-100 text-slate-600 text-sm font-semibold">
            {filtered.length} su {allYouths.length} profili
          </span>
        </div>
        </div>

        {/* Griglia card */}
        {sorted.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sorted.map(youth => {
              const theme = cardTheme(youth.status);
              const youthColor = getYouthColor(youth.id, youths);
              const assignedTutors = (youth.tutorIds || []).map(id => tutors.find(t => t.id === id)).filter((t): t is Tutor => !!t);
              return (
                <Card key={youth.id} className="overflow-hidden hover:shadow-xl transition-shadow group cursor-pointer" onClick={() => openEditYouthModal(youth)}>
                  <div className={`h-1.5 bg-gradient-to-r ${theme.strip}`}></div>
                  <div className="p-5 relative">
                    <div className="absolute top-4 right-4 flex space-x-2 items-center">
                      {youth.status === 'pausa' && <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-amber-100 text-amber-700 border border-amber-200">Pausa</span>}
                      {youth.status === 'archiviato' && <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-slate-200 text-slate-600 border border-slate-300">Archiviato</span>}
                      <button
                        onClick={e => { e.stopPropagation(); setYouthToDelete(youth); }}
                        className="text-gray-300 hover:text-red-500 transition-colors"
                        title="Elimina"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <div className="flex items-center mb-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shadow-sm ${youthColor.bg} ${youthColor.text}`}>
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
                      {assignedTutors.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Tutor assegnati</p>
                          <div className="flex flex-wrap gap-1.5">
                            {assignedTutors.map(t => (
                              <span key={t.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-teal-700 border border-teal-100">
                                <UserCheck size={12} className="shrink-0" />
                                {t.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    {(youth.contacts && youth.contacts.some(c => c.name || c.phone || c.email)) && (
                      <div className="text-sm text-slate-600 bg-slate-50 rounded-lg p-2.5 border border-slate-100 space-y-2">
                        {youth.contacts.filter(c => c.name || c.phone || c.email).map(contact => (
                          <div key={contact.id}>
                            <p className="text-[11px] font-semibold text-slate-400 uppercase mb-0.5">{contact.label || 'Contatto'}</p>
                            {contact.name && <p className="font-medium text-slate-700">{contact.name}</p>}
                            {contact.phone && (
                              <p className="flex items-center gap-1.5">
                                <a href={`tel:${contact.phone.replace(/\s+/g, '')}`} className="text-teal-700 hover:underline font-medium inline-flex items-center gap-1">
                                  <Phone size={13} /> {contact.phone}
                                </a>
                                {waHref(contact.phone) && (
                                  <a href={waHref(contact.phone)} target="_blank" rel="noopener noreferrer" title={`Chat WhatsApp con ${contact.name || contact.label || 'Contatto'}`} className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#25D366] text-white hover:bg-[#1eb457] transition-colors">
                                    <WhatsAppIcon size={13} />
                                  </a>
                                )}
                              </p>
                            )}
                            {contact.email && (
                              <a href={`mailto:${contact.email}`} className="text-teal-700 hover:underline font-medium inline-flex items-center gap-1">
                                <span className="text-slate-500"><UserCheck size={13} /></span> {contact.email}
                              </a>
                            )}
                          </div>
                        ))}
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
      <div className="space-y-3 md:space-y-6 h-[calc(100dvh-6rem)] md:h-[calc(100dvh-5rem)] flex flex-col">
        {/* Calendar Header Controls */}
        <div className="relative rounded-2xl bg-white shadow-md ring-1 ring-slate-200 shrink-0">
          <div className={`h-1.5 rounded-t-2xl ${isPlan ? 'bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-400' : 'bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-400'}`}></div>
          <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center px-4 sm:px-5 py-3 sm:py-4 gap-3">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div className={`p-2 sm:p-2.5 rounded-xl text-white shadow-md shrink-0 ${isPlan ? 'bg-gradient-to-br from-teal-500 to-emerald-600 shadow-teal-200' : 'bg-gradient-to-br from-indigo-500 to-violet-600 shadow-indigo-200'}`}>
                {isPlan ? <CalendarIcon size={18} /> : <ClipboardCheck size={18} />}
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-800 tracking-tight leading-tight">
                  {isPlan ? 'Pianificazione Turni' : 'Consuntivo Turni'}
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-400 font-medium leading-snug">
                  {isPlan
                    ? 'Settimana tipo LUN-SAB · 08:00 – 19:00 · ripetuta ogni settimana'
                    : `Fascia oraria LUN-SAB · 08:00 – 19:00 · copia della pianificazione`}
                </p>
              </div>
              {!isPlan && (
                <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto ml-0 lg:ml-3">
                  <button
                    onClick={() => setCurrentDate(d => addDays(d, -7))}
                    title="Settimana precedente"
                    className="p-3 md:p-3.5 rounded-xl md:rounded-2xl border-2 border-slate-200 bg-white shadow-sm md:shadow-md hover:bg-teal-50 hover:border-teal-400 hover:text-teal-700 hover:shadow-lg active:scale-95 transition-all text-slate-600"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={() => setCurrentDate(new Date())}
                    title="Torna alla settimana corrente"
                    className={`flex-1 sm:flex-none px-3 py-2 md:px-5 md:py-3 rounded-xl md:rounded-2xl text-xs md:text-sm font-bold shadow-sm md:shadow-md transition-all ${
                      isSameDay(calendarDays[0], startOfWeek(new Date(), { weekStartsOn: 1 }))
                        ? 'text-teal-700 bg-gradient-to-br from-teal-50 to-white border-2 border-teal-400 shadow-teal-100'
                        : 'text-slate-700 border-2 border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 md:gap-2">
                      <CalendarIcon size={14} className="text-teal-600 shrink-0" />
                      <span className="tracking-tight whitespace-nowrap">
                        <span className="sm:hidden">{format(calendarDays[0], 'dd MMM')} – {format(calendarDays[5], 'dd MMM')}</span>
                        <span className="hidden sm:inline">{format(calendarDays[0], 'dd MMM')} – {format(calendarDays[5], 'dd MMM yyyy')}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-md md:rounded-lg bg-gradient-to-r from-teal-500 to-emerald-500 text-white px-2 py-0.5 md:px-2.5 md:py-1 text-[10px] md:text-xs font-bold tabular-nums shadow-sm shrink-0">
                        Sett. {getISOWeek(calendarDays[0])}
                      </span>
                    </span>
                  </button>
                  <button
                    onClick={() => setCurrentDate(d => addDays(d, 7))}
                    title="Settimana successiva"
                    className="p-3 md:p-3.5 rounded-xl md:rounded-2xl border-2 border-slate-200 bg-white shadow-sm md:shadow-md hover:bg-teal-50 hover:border-teal-400 hover:text-teal-700 hover:shadow-lg active:scale-95 transition-all text-slate-600"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
              <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200 shrink-0 self-start sm:self-auto">
                <button
                  onClick={() => setCalendarView('tutor')}
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                    calendarView === 'tutor'
                      ? 'bg-white text-teal-700 shadow-sm ring-1 ring-slate-200'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Users size={14} /> Tutor
                  </span>
                </button>
                <button
                  onClick={() => setCalendarView('youth')}
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                    calendarView === 'youth'
                      ? 'bg-white text-teal-700 shadow-sm ring-1 ring-slate-200'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <UserCheck size={14} /> Ragazzo
                  </span>
                </button>
              </div>
              {restrictedUserTutorId ? (
                <span className="w-full sm:w-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 font-semibold text-sm">
                  <UserCheck size={15} />
                  Solo i tuoi turni
                </span>
              ) : calendarView === 'youth' ? (
                <PersonCombo
                  options={youths}
                  value={youthFilter}
                  onChange={setYouthFilter}
                  placeholder="Tutti i ragazzi"
                  colorOf={id => getYouthColor(id, youths)}
                  allowAll
                  allLabel="Tutti i ragazzi"
                  allValue="all"
                  className="w-full sm:w-56"
                />
              ) : (
                <PersonCombo
                  options={tutors}
                  value={tutorFilter}
                  onChange={setTutorFilter}
                  placeholder="Tutti"
                  colorOf={id => getTutorColor(id, tutors)}
                  allowAll
                  allLabel="Tutti"
                  allValue="all"
                  className="w-full sm:w-56"
                />
              )}
              <button
                onClick={handleWhatsAppSend}
                disabled={isWhatsAppSending}
                title="Cattura lo screenshot dei turni e invialo via WhatsApp"
                className="w-full sm:w-auto justify-center px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 shadow-md shadow-green-200/60 flex items-center gap-2 transition-all font-semibold text-sm hover:shadow-lg disabled:opacity-50"
              >
                {isWhatsAppSending ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <MessageCircle size={16} />}
                {isWhatsAppSending ? 'Genero immagine...' : 'Invia su WhatsApp'}
              </button>
              {!isPlan && tutorFilter !== 'all' && tutorFilter && (
                <div className="hidden sm:block w-full sm:w-auto text-xs text-slate-400 italic">
                  Trascina o apri un turno per registrare il consuntivo
                </div>
              )}
              {!isPlan && (
                <div className="flex w-full sm:w-auto items-center gap-2 rounded-xl border border-red-200 bg-white p-1 shadow-sm">
                  <input
                    type="month"
                    value={clearMonth}
                    onChange={e => setClearMonth(e.target.value)}
                    title="Mese di cui cancellare tutti i turni del consuntivo"
                    className="px-2 py-1.5 text-sm font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300"
                  />
                  <button
                    onClick={handleClearMonthShifts}
                    title="Cancella tutti i turni del consuntivo nel mese selezionato"
                    className="w-full sm:w-auto justify-center px-4 py-2 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-lg hover:from-red-600 hover:to-rose-600 shadow-sm flex items-center gap-2 transition-all font-semibold text-sm hover:shadow-md"
                  >
                    <Trash2 size={16} />
                    Cancella tutto il mese
                  </button>
                </div>
              )}
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
                  className="w-full sm:w-auto justify-center px-4 py-2.5 bg-white text-red-600 rounded-xl hover:bg-red-50 flex items-center gap-2 border border-red-200 shadow-sm hover:shadow transition-all font-semibold text-sm"
                >
                  <Trash2 size={16} />
                  Cancella Tutti
                </button>
              )}
              {isPlan && (
                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="w-full sm:w-auto justify-center px-4 py-2.5 bg-white text-indigo-600 rounded-xl hover:bg-indigo-50 flex items-center gap-2 border border-indigo-200 shadow-sm hover:shadow transition-all font-semibold text-sm"
                >
                  {isAnalyzing ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div> : <AlertTriangle size={16} />}
                  Analizza Conflitti
                </button>
              )}
              {isPlan && (
                <div className="flex w-full sm:w-auto items-center gap-2 rounded-xl border border-teal-200 bg-white p-1 shadow-sm">
                  <input
                    type="month"
                    value={replicateMonth}
                    onChange={e => setReplicateMonth(e.target.value)}
                    title="Mese su cui copiare la pianificazione settimanale"
                    className="px-2 py-1.5 text-sm font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-300"
                  />
                  <button
                    onClick={handleReplicateMonth}
                    title="Copia i turni della settimana tipo in tutte le settimane del mese selezionato"
                    className="w-full sm:w-auto justify-center px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-lg hover:from-teal-600 hover:to-emerald-600 shadow-sm flex items-center gap-2 transition-all font-semibold text-sm hover:shadow-md"
                  >
                    <CalendarPlus size={16} />
                    Copia su tutto il mese
                  </button>
                </div>
              )}
              {!isPlan && (
                <button
                  onClick={handleClearAllConsuntivo}
                  title="Cancella TUTTI i turni del consuntivo in tutto il database (reset)"
                  className="w-full sm:w-auto justify-center px-4 py-2.5 bg-gradient-to-r from-rose-600 to-red-700 text-white rounded-xl hover:from-rose-700 hover:to-red-800 shadow-md shadow-rose-300/60 flex items-center gap-2 transition-all font-semibold text-sm hover:shadow-lg"
                >
                  <Trash2 size={16} />
                  Reset consuntivo
                </button>
              )}
            </div>
          </div>
        </div>

        {/* AI Analysis Result */}
        {analysisResult && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-auto animate-fadeIn shrink-0 max-h-[40%]">
            {/* Header with score */}
            <div className={`px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between ${
              analysisResult.score >= 80 ? 'bg-emerald-50 border-b border-emerald-200' :
              analysisResult.score >= 50 ? 'bg-amber-50 border-b border-amber-200' :
              'bg-red-50 border-b border-red-200'
            }`}>
              <div className="flex items-center gap-3 min-w-0">
                <div className={`p-2 rounded-full shrink-0 ${
                  analysisResult.score >= 80 ? 'bg-emerald-100' :
                  analysisResult.score >= 50 ? 'bg-amber-100' :
                  'bg-red-100'
                }`}>
                  {analysisResult.score >= 80 ? <CheckCircle className="h-6 w-6 text-emerald-600" /> :
                   analysisResult.score >= 50 ? <AlertTriangle className="h-6 w-6 text-amber-600" /> :
                   <XCircle className="h-6 w-6 text-red-600" />}
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-gray-900">Analisi AI Conflitti</h3>
                  <p className="text-sm text-gray-600">{analysisResult.summary}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 sm:self-auto">
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
            <div className="px-4 sm:px-6 pt-3">
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
            <div className="px-4 sm:px-6 py-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
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
              <div className="px-4 sm:px-6 pb-4 space-y-2">
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
                      <div className="flex flex-wrap items-center gap-2">
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
        <div className="flex-1 min-h-[240px] md:min-h-0 rounded-2xl bg-white shadow-md ring-1 ring-slate-200 overflow-hidden flex flex-col">
          <div className="overflow-auto flex-1 min-h-0">
            <table id="weekly-matrix" className="w-full min-w-[1000px] border-separate border-spacing-0">
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
                    const dayShifts = visibleShifts.filter(s => {
                      if (calendarView === 'youth') {
                        if (youthFilter !== 'all' && !shiftYouthIds(s).includes(youthFilter)) return false;
                      } else if (tutorFilter !== 'all' && s.tutorId !== tutorFilter) return false;
                      if (isPlan) {
                        return s.isTemplate && (s.templateWeekday || weekdayOf(s.date)) === dayIdx + 1;
                      }
                      if (!s.date || s.isTemplate) return false;
                      const shiftDate = typeof s.date === 'string' ? s.date.split('T')[0] : '';
                      return shiftDate === dateStr;
                    });

                    const placed = dayShifts
                      .map(s => {
                        const effStart = !isPlan && !s.isTemplate && s.actualStartTime ? s.actualStartTime : s.startTime;
                        const effEnd = !isPlan && !s.isTemplate && s.actualEndTime ? s.actualEndTime : s.endTime;
                        const [sh, sm] = (effStart || '0:0').split(':').map(Number);
                        const [eh, em] = (effEnd || '0:0').split(':').map(Number);
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
                                ? openNewTemplateShiftModal(i + 1, slotLabel, calendarView === 'youth' && youthFilter !== 'all' ? youthFilter : '')
                                : openNewShiftModal(
                                    calendarView === 'tutor' && tutorFilter !== 'all' ? tutorFilter : '',
                                    layout.dateStr,
                                    slotLabel,
                                    calendarView === 'youth' && youthFilter !== 'all' ? youthFilter : ''
                                  )}
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
                                    ? openNewTemplateShiftModal(i + 1, slotLabel, calendarView === 'youth' && youthFilter !== 'all' ? youthFilter : '')
                                    : openNewShiftModal(
                                        calendarView === 'tutor' && tutorFilter !== 'all' ? tutorFilter : '',
                                        layout.dateStr,
                                        slotLabel,
                                        calendarView === 'youth' && youthFilter !== 'all' ? youthFilter : ''
                                      ); }}
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
                                    const shiftLocked = shiftStatus === 'cancellato';
                                    const tutor = tutors.find(t => t.id === shift.tutorId);
                                    const isDragging = draggedShiftId === shift.id;
                                    const tColor = getTutorColor(shift.tutorId, tutors);
                                    const yColor = getYouthColor(shift.youthId, youths);
                                    const col = layout.colOf[idx];
                                    const wPct = 100 / (layout.clusterMaxCol[layout.clusterOf[idx]] + 1);

                                    const isValidate = mode === 'validate';
                                    const hasVariazione = !shift.isTemplate &&
                                      ((shift.actualStartTime && shift.actualStartTime !== shift.startTime) ||
                                       (shift.actualEndTime && shift.actualEndTime !== shift.endTime));
                                    const chipBg = yColor.bg;
                                    const chipBorder = `${yColor.border} border-l-4 ${tColor.border}`;

                                    return (
                                      <div
                                        key={shift.id}
                                        draggable={!shiftLocked}
                                        onDragStart={(e) => handleDragStart(e, shift.id)}
                                        onClick={(e) => { e.stopPropagation(); openShiftModal(shift, isPlan ? 'plan' : 'validate'); }}
                                        className={`absolute pointer-events-auto rounded-md ${chipBg} border ${chipBorder} p-2 text-[13px] ${shiftLocked ? 'cursor-default' : 'cursor-move'} shadow-sm hover:shadow-md overflow-hidden group/item
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

                                            {isValidate && hasVariazione && (
                                              <div className="flex items-center gap-1 min-w-0">
                                                <span className="shrink-0 rounded bg-emerald-200/90 border border-emerald-400 px-1 py-px text-[9px] font-bold uppercase tracking-wide text-emerald-800 leading-tight">
                                                  Effett.
                                                </span>
                                                <span className="rounded bg-white/70 px-1.5 py-px text-[13px] font-bold text-emerald-800 tabular-nums pointer-events-none truncate">
                                                  {shift.actualStartTime || shift.startTime}–{shift.actualEndTime || shift.endTime}
                                                </span>
                                              </div>
                                            )}

                                            <div className="flex flex-col gap-1 min-w-0">
                                              {shiftYouthIds(shift).map(yid => {
                                                const yy = youths.find(y => y.id === yid);
                                                const yc = getYouthColor(yid, youths);
                                                return (
                                                  <div key={yid} className="flex items-center gap-1.5 min-w-0">
                                                    <span className={`h-2 w-2 rounded-full ${yc.badge} shrink-0`}></span>
                                                    <span className={`truncate font-semibold text-slate-600 pointer-events-none ${shiftStatus === 'cancellato' ? 'line-through' : ''}`}>
                                                      {yy?.name || 'Sconosciuto'}
                                                    </span>
                                                  </div>
                                                );
                                              })}
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
                                            const effE = !shift.isTemplate && shift.actualEndTime ? shift.actualEndTime : shift.endTime;
                                            const [eh, em] = (effE || '0:0').split(':').map(Number);
                                            resizeRef.current = { shiftId: shift.id, startEndMin: eh * 60 + em, startY: e.clientY, endMin: null };
                                            setResizingShiftId(shift.id);
                                          }}
                                          onPointerMove={(e) => {
                                            const r = resizeRef.current;
                                            if (!r || r.shiftId !== shift.id) return;
                                            e.preventDefault();
                                            const deltaSlots = Math.round((e.clientY - r.startY) / ROW_H);
                                            const effS = !shift.isTemplate && shift.actualStartTime ? shift.actualStartTime : shift.startTime;
                                            const [sh, sm] = (effS || '0:0').split(':').map(Number);
                                            const startMin = sh * 60 + sm;
                                            const newEndMin = Math.max(startMin + SLOT, Math.min(r.startEndMin + deltaSlots * SLOT, DAY_END));
                                            if (r.endMin !== newEndMin) {
                                              r.endMin = newEndMin;
                                              const nEnd = fmt(newEndMin);
                                              setShifts(prev => prev.map(s => s.id === shift.id ? (!shift.isTemplate ? { ...s, actualEndTime: nEnd } : { ...s, endTime: nEnd }) : s));
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
                                            setShifts(prev => prev.map(s => s.id === shift.id ? (!shift.isTemplate ? { ...s, actualEndTime: nEnd } : { ...s, endTime: nEnd }) : s));
                                            const dbResize: Record<string, any> = shift.isTemplate
                                              ? { end_time: nEnd }
                                              : { actual_end_time: nEnd };
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

  const handleSavePayRates = async () => {
    setPaySaving(true);
    try {
      const { error } = await supabase
        .from('pay_settings')
        .upsert({
          id: 'global',
          rate_single: payRatesDraft.rateSingle || 0,
          rate_double: payRatesDraft.rateDouble || 0,
          weeks_per_month: payRatesDraft.weeksPerMonth || 4,
          updated_at: new Date().toISOString(),
        });
      if (error) throw error;
      const saved = {
        rateSingle: payRatesDraft.rateSingle || 0,
        rateDouble: payRatesDraft.rateDouble || 0,
        weeksPerMonth: payRatesDraft.weeksPerMonth || 4,
      };
      setPayRates(saved);
      setPaySavedFlash(true);
      setTimeout(() => setPaySavedFlash(false), 2000);
    } catch (error) {
      console.error("Error saving pay rates:", error);
      alert("Errore nel salvataggio delle tariffe orarie");
    } finally {
      setPaySaving(false);
    }
  };

  const renderRecovery = () => {
    const getH = (start: string, end: string) => {
      const [sh, sm] = (start || '0:00').split(':').map(Number);
      const [eh, em] = (end || '0:0').split(':').map(Number);
      return ((eh * 60 + em) - (sh * 60 + sm)) / 60;
    };

    const monthStart = format(recMonth, 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(recMonth), 'yyyy-MM-dd');

    type RecDetail = {
      youthId: string;
      date: string;
      tutorName: string;
      planned: number;
      actual: number | null;
      delta: number;
      kind: 'Annullato' | 'Allungato' | 'Ridotto';
    };

    const perYouth: Record<string, { erogate: number; recuperi: number; extra: number }> = {};
    youths.forEach(y => { perYouth[y.id] = { erogate: 0, recuperi: 0, extra: 0 }; });
    const details: RecDetail[] = [];

    shifts.forEach(s => {
      if (s.isTemplate || !s.date) return;
      const d = typeof s.date === 'string' ? s.date.split('T')[0] : s.date;
      if (d < monthStart || d > monthEnd) return;
      const status = s.status || 'pianificato';
      const plannedH = getH(s.startTime, s.endTime);
      const tutorName = tutors.find(t => t.id === s.tutorId)?.name || '?';

      shiftYouthIds(s).forEach(yid => {
        if (!perYouth[yid]) return;

        if (status === 'cancellato') {
          if (plannedH > 0) {
            perYouth[yid].recuperi += plannedH;
            details.push({ youthId: yid, date: d, tutorName, planned: plannedH, actual: null, delta: plannedH, kind: 'Annullato' });
          }
          return;
        }

        const actualH = getEffectiveHours(s);
        if (actualH > 0) perYouth[yid].erogate += actualH;
        const delta = actualH - plannedH;
        if (delta > 0.005) {
          perYouth[yid].extra += delta;
          details.push({ youthId: yid, date: d, tutorName, planned: plannedH, actual: actualH, delta, kind: 'Allungato' });
        } else if (delta < -0.005) {
          perYouth[yid].recuperi += -delta;
          details.push({ youthId: yid, date: d, tutorName, planned: plannedH, actual: actualH, delta, kind: 'Ridotto' });
        }
      });
    });

    const rows = youths
      .map(y => {
        const v = perYouth[y.id] || { erogate: 0, recuperi: 0, extra: 0 };
        return { youth: y, ...v, saldo: v.recuperi - v.extra };
      })
      .sort((a, b) => (a.youth.name || '').localeCompare(b.youth.name || '', 'it'));

    const totErogate = rows.reduce((a, r) => a + r.erogate, 0);
    const totRecuperi = rows.reduce((a, r) => a + r.recuperi, 0);
    const totExtra = rows.reduce((a, r) => a + r.extra, 0);
    const totSaldo = totRecuperi - totExtra;

    details.sort((a, b) => a.date.localeCompare(b.date));

    const saldoBadge = (v: number) => Math.abs(v) < 0.005
      ? 'bg-slate-200/70 text-slate-600'
      : v > 0
        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
        : 'bg-red-50 text-red-600 ring-1 ring-red-200';

    return (
      <div className="space-y-8">
        <div className="sticky top-0 z-20 bg-white p-4 rounded-lg shadow-md border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-slate-800">Recuperi &amp; Monte Ore</h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => setRecMonth(addMonths(recMonth, -1))}
                title="Mese precedente"
                className="p-3 md:p-3.5 rounded-xl md:rounded-2xl border-2 border-slate-200 bg-white shadow-sm md:shadow-md hover:bg-teal-50 hover:border-teal-400 hover:text-teal-700 hover:shadow-lg active:scale-95 transition-all text-slate-600"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={() => setRecMonth(startOfMonth(new Date()))}
                title="Torna al mese corrente"
                className={`flex-1 sm:flex-none px-3 py-2 md:px-5 md:py-3 rounded-xl md:rounded-2xl text-xs md:text-sm font-bold shadow-sm md:shadow-md transition-all ${
                  isSameMonth(recMonth, new Date())
                    ? 'text-teal-700 bg-gradient-to-br from-teal-50 to-white border-2 border-teal-400 shadow-teal-100'
                    : 'text-slate-700 border-2 border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <span className="flex items-center gap-1.5 md:gap-2">
                  <CalendarIcon size={14} className="text-teal-600 shrink-0" />
                  <span className="tracking-tight whitespace-nowrap capitalize">
                    {format(recMonth, 'MMMM yyyy', { locale: it })}
                  </span>
                </span>
              </button>
              <button
                onClick={() => setRecMonth(addMonths(recMonth, 1))}
                title="Mese successivo"
                className="p-3 md:p-3.5 rounded-xl md:rounded-2xl border-2 border-slate-200 bg-white shadow-sm md:shadow-md hover:bg-teal-50 hover:border-teal-400 hover:text-teal-700 hover:shadow-lg active:scale-95 transition-all text-slate-600"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>

        <Card className="p-6">
          <h3 className="font-semibold text-slate-700 mb-4">Saldo monte ore per ragazzo</h3>
          <div className="overflow-x-auto max-h-[65vh] overflow-y-auto rounded-lg border border-slate-100">
            <table className="w-auto max-w-full text-sm whitespace-nowrap">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-50 border-b-2 border-slate-200 text-[10px] uppercase tracking-wide text-slate-500">
                  <th className="text-left py-2.5 pr-3 font-bold">Ragazzo/a</th>
                  <th className="text-right py-2.5 px-3 font-bold">Ore Erogate</th>
                  <th className="text-right py-2.5 px-3 font-bold">Recuperi</th>
                  <th className="text-right py-2.5 px-3 font-bold">Ore Extra</th>
                  <th className="text-right py-2.5 pl-3 font-bold">Saldo Monte Ore</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(r => (
                  <tr key={r.youth.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 pr-3">
                      <span className="flex items-center gap-2.5 min-w-0">
                        <span className={`h-7 w-7 shrink-0 rounded-full ${getYouthColor(r.youth.id, youths).bg} ${getYouthColor(r.youth.id, youths).text} text-[11px] font-bold flex items-center justify-center`}>
                          {getInitials(r.youth.name)}
                        </span>
                        <span className="font-semibold text-slate-700 truncate">{r.youth.name}</span>
                      </span>
                    </td>
                    <td className="text-right py-2.5 px-3 tabular-nums text-slate-600">{r.erogate.toFixed(1)}h</td>
                    <td className="text-right py-2.5 px-3 tabular-nums text-emerald-700">{r.recuperi.toFixed(1)}h</td>
                    <td className="text-right py-2.5 px-3 tabular-nums text-violet-600">{r.extra.toFixed(1)}h</td>
                    <td className="text-right py-2.5 pl-3">
                      <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full tabular-nums ${saldoBadge(r.saldo)}`}>
                        {r.saldo > 0 ? '+' : ''}{r.saldo.toFixed(1)}h
                      </span>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={5} className="py-6 text-center text-slate-400 italic">Nessun ragazzo in anagrafica</td></tr>
                )}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-gradient-to-r from-slate-50 to-white font-bold">
                    <td className="py-3 pr-3 text-slate-700">Totale</td>
                    <td className="text-right py-3 px-3 tabular-nums text-slate-600">{totErogate.toFixed(1)}h</td>
                    <td className="text-right py-3 px-3 tabular-nums text-emerald-700">{totRecuperi.toFixed(1)}h</td>
                    <td className="text-right py-3 px-3 tabular-nums text-violet-600">{totExtra.toFixed(1)}h</td>
                    <td className="text-right py-3 pl-3">
                      <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full tabular-nums ${saldoBadge(totSaldo)}`}>
                        {totSaldo > 0 ? '+' : ''}{totSaldo.toFixed(1)}h
                      </span>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          <p className="mt-3 text-[11px] text-slate-400">
            Saldo positivo = ore da recuperare al ragazzo (turni annullati o ridotti) · Saldo negativo = ore extra fatte in più del pianificato (da scalare dal monte ore)
          </p>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-slate-700 mb-4">Dettaglio variazioni del mese</h3>
          {details.length === 0 ? (
            <p className="text-sm text-slate-400 italic">Nessuna variazione: tutti i turni svolti corrispondono al pianificato.</p>
          ) : (
            <div className="overflow-x-auto max-h-[50vh] overflow-y-auto rounded-lg border border-slate-100">
              <table className="w-auto max-w-full text-sm whitespace-nowrap">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-50 border-b-2 border-slate-200 text-[10px] uppercase tracking-wide text-slate-500">
                    <th className="text-left py-2.5 pr-3 font-bold">Data</th>
                    <th className="text-left py-2.5 px-3 font-bold">Ragazzo/a</th>
                    <th className="text-left py-2.5 px-3 font-bold">Tutor</th>
                    <th className="text-center py-2.5 px-3 font-bold">Tipo</th>
                    <th className="text-right py-2.5 px-3 font-bold">Pianificato</th>
                    <th className="text-right py-2.5 px-3 font-bold">Svolto</th>
                    <th className="text-right py-2.5 pl-3 font-bold">Delta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {details.map((d, i) => {
                    const kindCls = d.kind === 'Annullato'
                      ? 'bg-red-100 text-red-700'
                      : d.kind === 'Allungato'
                        ? 'bg-violet-100 text-violet-700'
                        : 'bg-amber-100 text-amber-700';
                    return (
                      <tr key={`${d.youthId}-${d.date}-${i}`} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 pr-3 capitalize text-slate-600">{format(parseISO(d.date), 'EEE dd/MM', { locale: it })}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-700">{youths.find(y => y.id === d.youthId)?.name || '?'}</td>
                        <td className="py-2.5 px-3 text-slate-600">{d.tutorName}</td>
                        <td className="text-center py-2.5 px-3">
                          <span className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${kindCls}`}>{d.kind}</span>
                        </td>
                        <td className="text-right py-2.5 px-3 tabular-nums text-slate-500">{d.planned.toFixed(1)}h</td>
                        <td className="text-right py-2.5 px-3 tabular-nums text-slate-600">{d.actual === null ? '—' : `${d.actual.toFixed(1)}h`}</td>
                        <td className={`text-right py-2.5 pl-3 tabular-nums font-bold ${d.delta > 0 ? 'text-violet-600' : 'text-emerald-700'}`}>
                          {d.delta > 0 ? '+' : ''}{d.delta.toFixed(1)}h
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    );
  };

  const renderPayroll = () => {
    const getH = (start: string, end: string) => {
      const [sh, sm] = (start || '0:00').split(':').map(Number);
      const [eh, em] = (end || '0:0').split(':').map(Number);
      return ((eh * 60 + em) - (sh * 60 + sm)) / 60;
    };

    const monthStart = format(payMonth, 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(payMonth), 'yyyy-MM-dd');
    const weeks = payRates.weeksPerMonth || 4;
    const rs = payRates.rateSingle || 0;
    const rd = payRates.rateDouble || 0;

    const rows = tutors.map(t => {
      // Ore settimanali pianificate (settimana tipo), distinte per turno singolo/doppio
      let wSingle = 0;
      let wDouble = 0;
      shifts.forEach(s => {
        if (!s.isTemplate || s.tutorId !== t.id) return;
        const h = getH(s.startTime, s.endTime);
        if (h <= 0) return;
        if (shiftYouthIds(s).length >= 2) wDouble += h;
        else wSingle += h;
      });

      const base = (wSingle * rs + wDouble * rd) * weeks;
      return { tutor: t, wSingle, wDouble, base, total: base };
    });

    const totWSingle = rows.reduce((a, r) => a + r.wSingle, 0);
    const totWDouble = rows.reduce((a, r) => a + r.wDouble, 0);
    const totBase = rows.reduce((a, r) => a + r.base, 0);
    const totTotal = rows.reduce((a, r) => a + r.total, 0);

    const eur = (v: number) => `€ ${v.toFixed(2)}`;
    const ratesDirty =
      payRatesDraft.rateSingle !== payRates.rateSingle ||
      payRatesDraft.rateDouble !== payRates.rateDouble ||
      payRatesDraft.weeksPerMonth !== payRates.weeksPerMonth;

    const normName = (s?: string) => (s || '').replace(/[\u200B-\u200D\uFEFF\u00A0]/g, ' ').trim().toLowerCase();
    const sortedRows = !paySort.key ? rows : [...rows].sort((a, b) => {
      const dir = paySort.dir === 'asc' ? 1 : -1;
      if (paySort.key === 'tutor') return dir * normName(a.tutor.name).localeCompare(normName(b.tutor.name), 'it');
      return dir * ((a as any)[paySort.key] - (b as any)[paySort.key]);
    });

    const togglePaySort = (key: typeof paySort.key) =>
      setPaySort(prev => prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });

    const renderPayTh = (key: typeof paySort.key, label: string, align: 'left' | 'right') => {
      const active = paySort.key === key;
      const Arrow = paySort.dir === 'asc' ? ArrowUp : ArrowDown;
      return (
        <th className={`${align === 'left' ? 'text-left py-2.5 pr-3' : 'text-right py-2.5 px-3'} font-bold`}>
          <button
            type="button"
            onClick={() => togglePaySort(key)}
            className={`inline-flex items-center gap-1 uppercase tracking-wide transition-colors ${active ? 'text-teal-700' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {label}
            <Arrow size={12} className={active ? 'opacity-100' : 'opacity-0'} />
          </button>
        </th>
      );
    };

    return (
      <div className="space-y-8">
        <div className="sticky top-0 z-20 bg-white p-4 rounded-lg shadow-md border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-slate-800">Calcolo Paga</h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => setPayMonth(addMonths(payMonth, -1))}
                title="Mese precedente"
                className="p-3 md:p-3.5 rounded-xl md:rounded-2xl border-2 border-slate-200 bg-white shadow-sm md:shadow-md hover:bg-teal-50 hover:border-teal-400 hover:text-teal-700 hover:shadow-lg active:scale-95 transition-all text-slate-600"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={() => setPayMonth(startOfMonth(new Date()))}
                title="Torna al mese corrente"
                className={`flex-1 sm:flex-none px-3 py-2 md:px-5 md:py-3 rounded-xl md:rounded-2xl text-xs md:text-sm font-bold shadow-sm md:shadow-md transition-all ${
                  isSameMonth(payMonth, new Date())
                    ? 'text-teal-700 bg-gradient-to-br from-teal-50 to-white border-2 border-teal-400 shadow-teal-100'
                    : 'text-slate-700 border-2 border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <span className="flex items-center gap-1.5 md:gap-2">
                  <CalendarIcon size={14} className="text-teal-600 shrink-0" />
                  <span className="tracking-tight whitespace-nowrap capitalize">
                    {format(payMonth, 'MMMM yyyy', { locale: it })}
                  </span>
                </span>
              </button>
              <button
                onClick={() => setPayMonth(addMonths(payMonth, 1))}
                title="Mese successivo"
                className="p-3 md:p-3.5 rounded-xl md:rounded-2xl border-2 border-slate-200 bg-white shadow-sm md:shadow-md hover:bg-teal-50 hover:border-teal-400 hover:text-teal-700 hover:shadow-lg active:scale-95 transition-all text-slate-600"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>

        <Card className="p-6">
          <h3 className="font-semibold text-slate-700 mb-4 flex items-center">
            <Wallet size={16} className="mr-2 text-lime-600" /> Parametri di calcolo
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Paga oraria Turno Singolo (€/h)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                className="w-full px-3 py-2.5 bg-white rounded-xl border border-slate-200 shadow-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition text-sm font-medium text-slate-700 tabular-nums"
                value={payRatesDraft.rateSingle || ''}
                onChange={e => setPayRatesDraft({ ...payRatesDraft, rateSingle: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Paga oraria Turno Doppio (€/h)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                className="w-full px-3 py-2.5 bg-white rounded-xl border border-slate-200 shadow-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition text-sm font-medium text-slate-700 tabular-nums"
                value={payRatesDraft.rateDouble || ''}
                onChange={e => setPayRatesDraft({ ...payRatesDraft, rateDouble: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Settimane per mese</label>
              <input
                type="number"
                min={1}
                max={5}
                step={0.01}
                className="w-full px-3 py-2.5 bg-white rounded-xl border border-slate-200 shadow-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition text-sm font-medium text-slate-700 tabular-nums"
                value={payRatesDraft.weeksPerMonth || ''}
                onChange={e => setPayRatesDraft({ ...payRatesDraft, weeksPerMonth: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSavePayRates}
                disabled={paySaving || !ratesDirty}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-lime-600 text-white text-sm font-bold shadow-md hover:bg-lime-700 disabled:opacity-40 active:scale-95 transition-all"
              >
                <Save size={15} /> {paySaving ? 'Salvo…' : 'Salva parametri'}
              </button>
              {paySavedFlash && (
                <span className="inline-flex items-center gap-1 text-emerald-600 text-sm font-semibold">
                  <CheckCircle2 size={15} /> Salvate
                </span>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-slate-700 mb-4">Compenso mensile · base pianificata × {weeks} settimane</h3>
          <div className="overflow-x-auto max-h-[65vh] overflow-y-auto rounded-lg border border-slate-100">
            <table className="w-auto max-w-full text-sm whitespace-nowrap">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-50 border-b-2 border-slate-200 text-[10px] uppercase tracking-wide text-slate-500">
                  {renderPayTh('tutor', 'Tutor', 'left')}
                  {renderPayTh('wSingle', 'Ore Sett. Singolo', 'right')}
                  {renderPayTh('wDouble', 'Ore Sett. Doppio', 'right')}
                  {renderPayTh('base', 'Compenso Mensile', 'right')}
                  {renderPayTh('total', 'Totale', 'right')}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedRows.map(r => (
                    <tr key={r.tutor.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 pr-3">
                        <span className="flex items-center gap-2.5 min-w-0">
                          <span className={`h-7 w-7 shrink-0 rounded-full ${getTutorColor(r.tutor.id, tutors).bg} ${getTutorColor(r.tutor.id, tutors).text} text-[11px] font-bold flex items-center justify-center`}>
                            {getInitials(r.tutor.name)}
                          </span>
                          <span className="font-semibold text-slate-700 truncate">{r.tutor.name}</span>
                        </span>
                      </td>
                      <td className="text-right py-2.5 px-3 tabular-nums text-slate-600">{r.wSingle.toFixed(1)}h</td>
                      <td className="text-right py-2.5 px-3 tabular-nums text-violet-600">{r.wDouble.toFixed(1)}h</td>
                      <td className="text-right py-2.5 px-3 tabular-nums text-slate-700">{eur(r.base)}</td>
                      <td className="text-right py-2.5 pl-3 tabular-nums font-bold text-teal-700">{eur(r.total)}</td>
                    </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={5} className="py-6 text-center text-slate-400 italic">Nessun tutor in anagrafica</td></tr>
                )}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-gradient-to-r from-slate-50 to-white font-bold">
                    <td className="py-3 pr-3 text-slate-700">Totale compenso</td>
                    <td className="text-right py-3 px-3 tabular-nums text-slate-600">{totWSingle.toFixed(1)}h</td>
                    <td className="text-right py-3 px-3 tabular-nums text-violet-600">{totWDouble.toFixed(1)}h</td>
                    <td className="text-right py-3 px-3 tabular-nums text-slate-700">{eur(totBase)}</td>
                    <td className="text-right py-3 pl-3 tabular-nums text-teal-700">{eur(totTotal)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          <p className="mt-3 text-[11px] text-slate-400">
            Base = ore settimanali della settimana tipo (Pianificazione Turni) × {weeks} settimane × paga oraria · Le differenze del consuntivo sono gestite nella sezione Recuperi &amp; Monte Ore
          </p>
        </Card>
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

    // Pianificato = ore del template (settimana tipo) per ogni giorno nel periodo.
    // Validato (consuntivo) = tutti i turni non annullati (orari effettivi se presenti), cancellati = 0.
    const monthStart = format(startOfMonth(summaryMonth), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(summaryMonth), 'yyyy-MM-dd');

    // Occorrenze del mese (consuntivo), non i template
    const monthShifts = shifts.filter(s => {
      if (s.isTemplate || !s.date) return false;
      const d = typeof s.date === 'string' ? s.date.split('T')[0] : s.date;
      return d >= monthStart && d <= monthEnd;
    });

    // Tutor e ragazzi da mostrare (dalla matrice o filtrati)
    const presentTutors = new Set<string>();
    const presentYouths = new Set<string>();
    monthShifts.forEach(s => {
      presentTutors.add(s.tutorId);
      shiftYouthIds(s).forEach(yid => presentYouths.add(yid));
    });
    const rows = summaryTutorFilter === 'all' ? tutors.filter(t => presentTutors.has(t.id)) : tutors.filter(t => t.id === summaryTutorFilter);
    const cols = summaryYouthFilter === 'all' ? youths.filter(y => presentYouths.has(y.id)) : youths.filter(y => y.id === summaryYouthFilter);

    // Matrice: cell[tutorId][youthId] = { planned, executed }
    const cell: Record<string, Record<string, { planned: number; executed: number }>> = {};
    rows.forEach(t => { cell[t.id] = {}; cols.forEach(y => { cell[t.id][y.id] = { planned: 0, executed: 0 }; }); });
    monthShifts.forEach(s => {
      const tId = s.tutorId;
      if (summaryTutorFilter !== 'all' && tId !== summaryTutorFilter) return;
      const planned = getHours(s.startTime, s.endTime);
      const executed = getEffectiveHours(s); // 0 se annullato, effettivo/altrimenti pianificato
      shiftYouthIds(s).forEach(yId => {
        if (summaryYouthFilter !== 'all' && yId !== summaryYouthFilter) return;
        if (!cell[tId]) cell[tId] = {};
        if (!cell[tId][yId]) cell[tId][yId] = { planned: 0, executed: 0 };
        cell[tId][yId].planned += planned;
        cell[tId][yId].executed += executed;
      });
    });

    const rowTot = rows.map(t => {
      let p = 0, e = 0;
      cols.forEach(y => { p += cell[t.id][y.id].planned; e += cell[t.id][y.id].executed; });
      return { id: t.id, planned: p, executed: e };
    });
    const colTot = cols.map(y => {
      let p = 0, e = 0;
      rows.forEach(t => { p += cell[t.id][y.id].planned; e += cell[t.id][y.id].executed; });
      return { id: y.id, planned: p, executed: e };
    });
    const grandPlan = rowTot.reduce((a, r) => a + r.planned, 0);
    const grandExec = rowTot.reduce((a, r) => a + r.executed, 0);

    return (
      <div className="space-y-8">
        <div className="sticky top-0 z-20 bg-white p-4 rounded-lg shadow-md border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-slate-800">Riepilogo Ore</h2>
            <span className="hidden sm:block text-xs text-slate-400">Matrice Tutor × Ragazzo · pianificate vs eseguite (consuntivo)</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <PersonCombo
              options={tutors}
              value={summaryTutorFilter}
              onChange={setSummaryTutorFilter}
              placeholder="Tutti i tutor"
              colorOf={id => getTutorColor(id, tutors)}
              allowAll
              allLabel="Tutti i tutor"
              allValue="all"
              className="w-full sm:w-48"
            />
            <PersonCombo
              options={youths}
              value={summaryYouthFilter}
              onChange={setSummaryYouthFilter}
              placeholder="Tutti i ragazzi"
              colorOf={id => getYouthColor(id, youths)}
              allowAll
              allLabel="Tutti i ragazzi"
              allValue="all"
              className="w-full sm:w-48"
            />
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => setSummaryMonthRange(addMonths(summaryMonth, -1))}
                title="Mese precedente"
                className="p-3 md:p-3.5 rounded-xl md:rounded-2xl border-2 border-slate-200 bg-white shadow-sm md:shadow-md hover:bg-teal-50 hover:border-teal-400 hover:text-teal-700 hover:shadow-lg active:scale-95 transition-all text-slate-600"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={() => setSummaryMonthRange(new Date())}
                title="Torna al mese corrente"
                className={`flex-1 sm:flex-none px-3 py-2 md:px-5 md:py-3 rounded-xl md:rounded-2xl text-xs md:text-sm font-bold shadow-sm md:shadow-md transition-all ${
                  isSameMonth(summaryMonth, new Date())
                    ? 'text-teal-700 bg-gradient-to-br from-teal-50 to-white border-2 border-teal-400 shadow-teal-100'
                    : 'text-slate-700 border-2 border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <span className="flex items-center gap-1.5 md:gap-2">
                  <CalendarIcon size={14} className="text-teal-600 shrink-0" />
                  <span className="tracking-tight whitespace-nowrap capitalize">
                    {format(summaryMonth, 'MMMM yyyy', { locale: it })}
                  </span>
                </span>
              </button>
              <button
                onClick={() => setSummaryMonthRange(addMonths(summaryMonth, 1))}
                title="Mese successivo"
                className="p-3 md:p-3.5 rounded-xl md:rounded-2xl border-2 border-slate-200 bg-white shadow-sm md:shadow-md hover:bg-teal-50 hover:border-teal-400 hover:text-teal-700 hover:shadow-lg active:scale-95 transition-all text-slate-600"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>

        <Card className="p-0 sm:p-4 overflow-hidden">
          {rows.length === 0 || cols.length === 0 ? (
            <div className="p-10 text-center text-slate-400 italic">
              Nessun turno nel mese selezionato{summaryTutorFilter !== 'all' || summaryYouthFilter !== 'all' ? ' per i filtri scelti' : ''}.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[68vh] overflow-y-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-50 border-b-2 border-slate-200 text-[10px] uppercase tracking-wide text-slate-500">
                    <th className="text-left py-2.5 pr-3 font-bold sticky left-0 bg-slate-50 z-20" rowSpan={2}>Ragazzo \ Tutor</th>
                    {rows.map(t => (
                      <th key={t.id} colSpan={2} className="px-2 py-1.5 font-bold text-center border-l-2 border-slate-200">
                        <span className="flex items-center justify-center gap-1.5 min-w-0">
                          <span className={`h-4 w-4 rounded-full ${getTutorColor(t.id, tutors).bg} ${getTutorColor(t.id, tutors).text} text-[9px] font-bold flex items-center justify-center`}>{getInitials(t.name)}</span>
                          <span className="truncate max-w-[8rem]">{t.name}</span>
                        </span>
                      </th>
                    ))}
                    <th colSpan={2} className="px-3 py-1.5 font-bold text-center text-slate-600 border-l-2 border-slate-200">Totale</th>
                  </tr>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-wide text-slate-400">
                    {rows.map(t => (
                      <React.Fragment key={t.id}>
                        <th className="px-1 py-1 font-semibold text-center text-slate-400 border-l-2 border-slate-200">Pian</th>
                        <th className="px-1 py-1 font-semibold text-center text-slate-400">Eseg</th>
                      </React.Fragment>
                    ))}
                    <th className="px-2 py-1 font-semibold text-center text-slate-500 border-l-2 border-slate-200">Pian</th>
                    <th className="px-2 py-1 font-semibold text-center text-slate-500">Eseg</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cols.map((y, ri) => {
                    const rtPlanned = rows.reduce((a, t) => a + cell[t.id][y.id].planned, 0);
                    const rtExecuted = rows.reduce((a, t) => a + cell[t.id][y.id].executed, 0);
                    return (
                      <tr key={y.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 pr-3 sticky left-0 bg-white z-10">
                          <span className="flex items-center gap-2.5 min-w-0">
                            <span className={`h-7 w-7 shrink-0 rounded-full ${getYouthColor(y.id, youths).bg} ${getYouthColor(y.id, youths).text} text-[11px] font-bold flex items-center justify-center`}>{getInitials(y.name)}</span>
                            <span className="font-semibold text-slate-700 truncate">{y.name}</span>
                          </span>
                        </td>
                        {rows.map(t => {
                          const c = cell[t.id][y.id];
                          const delta = c.executed - c.planned;
                          const execColor = delta > 0.005 ? 'text-emerald-600' : delta < -0.005 ? 'text-red-500' : 'text-slate-700';
                          return (
                            <React.Fragment key={t.id}>
                              <td className="text-center px-1 py-2 tabular-nums text-slate-400 border-l-2 border-slate-200">{c.planned.toFixed(1)}h</td>
                              <td className={`text-center px-1 py-2 tabular-nums font-semibold ${execColor}`}>{c.executed.toFixed(1)}h</td>
                            </React.Fragment>
                          );
                        })}
                        <td className="text-center px-2 py-2 tabular-nums text-slate-500 font-semibold border-l-2 border-slate-200">{rtPlanned.toFixed(1)}h</td>
                        <td className="text-center px-2 py-2 tabular-nums text-teal-700 font-bold">{rtExecuted.toFixed(1)}h</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-gradient-to-r from-slate-50 to-white font-bold">
                    <td className="py-3 pr-3 text-slate-700 sticky left-0 bg-gradient-to-r from-slate-50 to-white z-10">Totale</td>
                    {rows.map((t, ti) => (
                      <React.Fragment key={t.id}>
                        <td className="text-center px-1 py-3 tabular-nums text-slate-500 border-l-2 border-slate-200">{rowTot[ti].planned.toFixed(1)}h</td>
                        <td className="text-center px-1 py-3 tabular-nums text-teal-700">{rowTot[ti].executed.toFixed(1)}h</td>
                      </React.Fragment>
                    ))}
                    <td className="text-center px-2 py-3 tabular-nums text-slate-500 border-l-2 border-slate-200">{grandPlan.toFixed(1)}h</td>
                    <td className="text-center px-2 py-3 tabular-nums text-teal-700">{grandExec.toFixed(1)}h</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
          <p className="mt-3 px-4 pb-4 text-[11px] text-slate-400">
            <span className="text-slate-400 font-semibold">Pian</span> = ore pianificate (Pianificazione Turni) · <span className="text-teal-700 font-semibold">Eseg</span> = ore effettivamente eseguite dal Consuntivo Turni (assenze a 0, variazioni di durata incluse) · <span className="text-red-500 font-semibold">rosso</span> = ore in meno rispetto al pianificato (assenze/riduzioni) · <span className="text-emerald-600 font-semibold">verde</span> = ore in più
          </p>
        </Card>
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
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900 overflow-x-clip">
      {renderSidebar()}

      <div className={`flex-1 flex flex-col h-dvh min-w-0 transition-all duration-300 ${sidebarExpanded ? 'md:ml-64' : 'md:ml-16'}`}>
        {renderMobileHeader()}

        <main className="flex-1 min-h-0 overflow-y-auto min-w-0">
          {isLoading && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-8 shadow-xl text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-teal-600 mx-auto mb-4"></div>
                <p className="text-lg font-semibold text-slate-700">Caricamento dati...</p>
                {loadError && <p className="text-sm text-amber-600 mt-2">{loadError}</p>}
              </div>
            </div>
          )}

          <div className="p-3 sm:p-4 md:p-8">
            {view === 'DASHBOARD' && renderCalendar('plan')}
            {view === 'VALIDATION' && renderCalendar('validate')}
            {view === 'TUTORS' && renderTutorsList()}
            {view === 'YOUTHS' && renderYouthsList()}
            {view === 'SUMMARY' && renderSummary()}
            {view === 'RECOVERY' && renderRecovery()}
            {view === 'PAYROLL' && renderPayroll()}
            {view === 'USER_MANAGEMENT' && <UserManagementView tutors={tutors} />}
          </div>
        </main>
      </div>

      {/* --- Modals --- */}

      {/* Confirm Delete Tutor Modal */}
      <Modal isOpen={!!tutorToDelete} onClose={() => setTutorToDelete(null)} title="Elimina scheda tutor">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-100 rounded-full flex-shrink-0 mt-0.5">
              <AlertTriangle size={20} className="text-red-600" />
            </div>
            <div>
              <p className="text-sm text-slate-700">
                Sei sicuro di voler cancellare la scheda di <strong>{tutorToDelete?.name}</strong>?
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Verranno eliminati anche tutti i turni associati. L'operazione non può essere annullata.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setTutorToDelete(null)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Annulla
            </button>
            <button
              onClick={() => { const id = tutorToDelete?.id; setTutorToDelete(null); if (id) handleDeleteTutor(id); }}
              className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
            >
              Si, elimina
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirm Delete Youth Modal */}
      <Modal isOpen={!!youthToDelete} onClose={() => setYouthToDelete(null)} title="Elimina scheda ragazzo">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-100 rounded-full flex-shrink-0 mt-0.5">
              <AlertTriangle size={20} className="text-red-600" />
            </div>
            <div>
              <p className="text-sm text-slate-700">
                Sei sicuro di voler cancellare la scheda di <strong>{youthToDelete?.name}</strong>?
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Verranno eliminati anche tutti i turni associati. L'operazione non può essere annullata.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setYouthToDelete(null)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Annulla
            </button>
            <button
              onClick={() => { const id = youthToDelete?.id; setYouthToDelete(null); if (id) handleDeleteYouth(id); }}
              className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
            >
              Si, elimina
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
                  {(editingShift?.youthIds && editingShift.youthIds.length > 0 ? editingShift.youthIds : (editingShift?.youthId ? [editingShift.youthId] : [])).map(yid => {
                    const hc = getYouthColor(yid, youths);
                    return (
                      <span key={yid} className={`px-2 py-0.5 rounded-full ${hc.bg} ${hc.text} text-xs font-semibold`}>
                        {youths.find(y => y.id === yid)?.name || 'Ragazzo'}
                      </span>
                    );
                  })}
                  {editingShift?.startTime && (
                    <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 text-xs font-semibold tabular-nums">
                      {editingShift.startTime}–{editingShift.endTime}
                    </span>
                  )}
                  {(editingShift?.status || 'pianificato') === 'cancellato' && (
                    <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold">Annullato</span>
                  )}
                  {shiftModalMode === 'validate' && editingShift?.id && (editingShift?.status || 'pianificato') !== 'cancellato' && (
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">Svolto come pianificato</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <YouthSection icon={<CalendarIcon size={16} />} title="Programmazione" chipBg="bg-teal-500" headerBg="bg-gradient-to-r from-teal-50 to-white border-teal-100" textColor="text-teal-700">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tutor <span className="text-red-500">*</span></label>
                <PersonCombo
                  options={tutors}
                  value={editingShift?.tutorId || ''}
                  onChange={id => setEditingShift({ ...editingShift, tutorId: id })}
                  placeholder="Seleziona Tutor"
                  colorOf={id => getTutorColor(id, tutors)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ragazzi/e <span className="text-red-500">*</span></label>
                <div className="space-y-2">
                  {(editingShift?.youthIds && editingShift.youthIds.length > 0 ? editingShift.youthIds : (editingShift?.youthId ? [editingShift.youthId] : [])).map((yid, yi) => {
                    const y = youths.find(yy => yy.id === yid);
                    return (
                      <div key={yid} className="flex items-center gap-2">
                        <div className="flex-1">
                          <PersonCombo
                            options={youths}
                            value={yid}
                            onChange={id => {
                              const current = editingShift?.youthIds && editingShift.youthIds.length > 0
                                ? editingShift.youthIds
                                : (editingShift?.youthId ? [editingShift.youthId] : []);
                              const next = current.map((cid, i) => i === yi ? id : cid);
                              setEditingShift({ ...editingShift, youthId: next[0], youthIds: next });
                            }}
                            placeholder="Seleziona Ragazzo/a"
                            colorOf={id => getYouthColor(id, youths)}
                          />
                        </div>
                        {yi === 0 && (
                          <span className="shrink-0 rounded bg-teal-100 text-teal-700 px-1.5 py-0.5 text-[10px] font-bold uppercase">Principale</span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeEditingYouth(yid)}
                          className="shrink-0 p-1.5 rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Rimuovi ragazzo/a"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                  {youths.some(y => !shiftYouthIds(editingShift as Shift).includes(y.id)) && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <PersonCombo
                          options={youths.filter(y => !shiftYouthIds(editingShift as Shift).includes(y.id))}
                          value=""
                          onChange={id => addEditingYouth(id)}
                          placeholder="Aggiungi un altro ragazzo/a…"
                          colorOf={id => getYouthColor(id, youths)}
                        />
                      </div>
                      <span className="shrink-0 text-[11px] text-slate-400 italic">si aggiunge alla selezione</span>
                    </div>
                  )}
                </div>
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
                Orari pianificati di riferimento: modifica gli orari effettivi qui o <strong>trascinando il box</strong> sul calendario · le differenze finiscono in Recuperi &amp; Monte Ore
              </div>
            )}
          </YouthSection>

          {editingShift?.id && shiftModalMode === 'validate' && (
            <YouthSection icon={<CheckCircle size={16} />} title="Consuntivo" chipBg="bg-emerald-500" headerBg="bg-gradient-to-r from-emerald-50 to-white border-emerald-100" textColor="text-emerald-700">
              {(() => {
                const st = editingShift.status || 'pianificato';
                const cancOn = st === 'cancellato';
                const effStart = editingShift.actualStartTime || editingShift.startTime;
                const effEnd = editingShift.actualEndTime || editingShift.endTime;
                const plannedMin = (() => {
                  const [sh, sm] = (editingShift.startTime || '0:0').split(':').map(Number);
                  const [eh, em] = (editingShift.endTime || '0:0').split(':').map(Number);
                  return (eh * 60 + em) - (sh * 60 + sm);
                })();
                const effMin = (() => {
                  const [sh, sm] = (effStart || '0:0').split(':').map(Number);
                  const [eh, em] = (effEnd || '0:0').split(':').map(Number);
                  return (eh * 60 + em) - (sh * 60 + sm);
                })();
                const deltaH = cancOn ? -plannedMin / 60 : (effMin - plannedMin) / 60;
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Inizio effettivo</label>
                      <input
                        type="time"
                        className={fieldCls}
                        value={effStart}
                        onChange={e => setEditingShift({ ...editingShift, actualStartTime: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Fine effettiva</label>
                      <input
                        type="time"
                        className={fieldCls}
                        value={effEnd}
                        onChange={e => setEditingShift({ ...editingShift, actualEndTime: e.target.value })}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <button
                        type="button"
                        onClick={() => {
                          const turningOn = !cancOn;
                          setEditingShift({
                            ...editingShift,
                            status: turningOn ? 'cancellato' : 'pianificato',
                            actualStartTime: turningOn ? null : (editingShift.actualStartTime ?? editingShift.startTime),
                            actualEndTime: turningOn ? null : (editingShift.actualEndTime ?? editingShift.endTime),
                          });
                        }}
                        className={`w-full rounded-xl border-2 px-4 py-3 text-left transition ${
                          cancOn
                            ? 'border-red-500 bg-red-500 text-white shadow-md'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-red-300 hover:bg-red-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold flex items-center gap-2">
                            <span className={`w-6 h-6 rounded-md flex items-center justify-center ${cancOn ? 'bg-white/20' : 'bg-red-100 text-red-600'}`}>
                              <X size={14} />
                            </span>
                            Annulla turno
                          </span>
                          <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${cancOn ? 'bg-white/25' : 'bg-slate-100 text-slate-500'}`}>
                            {cancOn ? 'ON' : 'OFF'}
                          </span>
                        </div>
                        <p className={`text-xs mt-1.5 leading-snug ${cancOn ? 'text-white/85' : 'text-slate-400'}`}>
                          {cancOn
                            ? 'Turno annullato · le ore pianificate vanno in Recuperi del ragazzo'
                            : 'Es. mancanza tutor · il turno non è svolto e genera ore da recuperare'}
                        </p>
                      </button>
                    </div>
                    {!cancOn && Math.abs(deltaH) > 0.005 && (
                      <div className={`sm:col-span-2 rounded-lg border px-3 py-2 text-xs flex items-center gap-2 ${
                        deltaH > 0
                          ? 'bg-violet-50 border-violet-200 text-violet-700'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      }`}>
                        {deltaH > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        Delta vs pianificato: <strong>{deltaH > 0 ? '+' : ''}{deltaH.toFixed(1)}h</strong>
                        {deltaH > 0 ? ' → ore extra scalate dal monte ore' : ' → ore da recuperare per il ragazzo'}
                      </div>
                    )}
                  </div>
                );
              })()}
              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Note consuntivo</label>
                <textarea
                  className={fieldCls + " min-h-[60px]"}
                  placeholder="Come è andato il turno, variazioni, note..."
                  value={editingShift.actualNotes || ''}
                  onChange={e => setEditingShift({ ...editingShift, actualNotes: e.target.value })}
                />
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
                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">Telefono
                  {waHref(newTutor.phone || '') && (
                    <a href={waHref(newTutor.phone || '')} target="_blank" rel="noopener noreferrer" title="Chat WhatsApp con il tutor" className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#25D366] text-white hover:bg-[#1eb457] transition-colors">
                      <WhatsAppIcon size={12} />
                    </a>
                  )}
                </label>
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Ore Settimanali (min – max)</label>
                <DualRangeSlider
                  min={1}
                  max={60}
                  valueMin={newTutor.minHoursPerWeek ?? 1}
                  valueMax={newTutor.maxHoursPerWeek ?? 20}
                  onChange={(vmin, vmax) => setNewTutor({ ...newTutor, minHoursPerWeek: vmin, maxHoursPerWeek: vmax })}
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Scuola / Istituto</label>
                <input
                  type="text"
                  className={fieldCls}
                  placeholder="Istituto frequentato"
                  value={newYouth.school || ''}
                  onChange={e => setNewYouth({ ...newYouth, school: e.target.value })}
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
                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">Telefono
                  {waHref(newYouth.phone || '') && (
                    <a href={waHref(newYouth.phone || '')} target="_blank" rel="noopener noreferrer" title="Chat WhatsApp con il ragazzo" className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#25D366] text-white hover:bg-[#1eb457] transition-colors">
                      <WhatsAppIcon size={12} />
                    </a>
                  )}
                </label>
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

          <YouthSection icon={<Phone size={16} />} title="Contatti di riferimento" chipBg="bg-violet-500" headerBg="bg-gradient-to-r from-violet-50 to-white border-violet-100" textColor="text-violet-700">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-4">
                {(newYouth.contacts || []).map((contact, idx) => (
                  <div key={contact.id} className="rounded-xl border border-slate-200 bg-white p-3.5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                        <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 text-xs font-bold flex items-center justify-center">{idx + 1}</span>
                        Contatto {idx + 1}
                      </p>
                      <button type="button" onClick={() => removeContact(contact.id)} className="text-gray-300 hover:text-red-500 transition-colors" title="Rimuovi contatto">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Etichetta (es. Genitore, Zia, Assistente)</label>
                        <input
                          type="text"
                          className={fieldCls}
                          placeholder="Es. Genitore, Zia"
                          value={contact.label || ''}
                          onChange={e => updateContact(contact.id, 'label', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nome e cognome</label>
                        <input
                          type="text"
                          className={fieldCls}
                          placeholder="Nome e cognome"
                          value={contact.name || ''}
                          onChange={e => updateContact(contact.id, 'name', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">Telefono
                          {waHref(contact.phone || '') && (
                            <a href={waHref(contact.phone || '')} target="_blank" rel="noopener noreferrer" title={`Chat WhatsApp con ${contact.name || contact.label || 'il contatto'}`} className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#25D366] text-white hover:bg-[#1eb457] transition-colors">
                              <WhatsAppIcon size={12} />
                            </a>
                          )}
                        </label>
                        <input
                          type="tel"
                          className={fieldCls}
                          placeholder="3XX XXX XXXX"
                          value={contact.phone || ''}
                          onChange={e => updateContact(contact.id, 'phone', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                        <input
                          type="email"
                          className={fieldCls}
                          placeholder="contatto@email.it"
                          value={contact.email || ''}
                          onChange={e => updateContact(contact.id, 'email', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addContact}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-violet-300 text-violet-600 hover:bg-violet-50 transition-colors text-sm font-semibold"
                >
                  <Plus size={16} /> Aggiungi contatto di riferimento
                </button>
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
            </div>
          </YouthSection>

          <YouthSection icon={<Target size={16} />} title="Percorso al Centro" chipBg="bg-emerald-500" headerBg="bg-gradient-to-r from-emerald-50 to-white border-emerald-100" textColor="text-emerald-700">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Tutor assegnati</label>
                <PersonMultiCombo
                  options={tutors}
                  values={newYouth.tutorIds || []}
                  onChange={ids => setNewYouth({ ...newYouth, tutorIds: ids })}
                  placeholder="Seleziona uno o più tutor..."
                  colorOf={id => getTutorColor(id, tutors)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Inizio contratto</label>
                <input
                  type="date"
                  className={fieldCls}
                  value={newYouth.contractStartDate || ''}
                  onChange={e => setNewYouth({ ...newYouth, contractStartDate: e.target.value || null })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Fine contratto</label>
                <input
                  type="date"
                  className={fieldCls}
                  value={newYouth.contractEndDate || ''}
                  onChange={e => setNewYouth({ ...newYouth, contractEndDate: e.target.value || null })}
                />
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
          tutorId: profile.tutor_id || null,
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
          <img src="/logo.png" alt="CentroCare" className="h-16 w-auto mx-auto mb-4 rounded-xl shadow-lg" />
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

function UserManagementView({ tutors }: { tutors: Tutor[] }) {
  const [users, setUsers] = useState<User[]>([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '', permissions: ['DASHBOARD'], tutorId: '' });
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [editTutorId, setEditTutorId] = useState('');
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

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
        tutorId: p.tutor_id || null,
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
            tutorId: newUser.tutorId || null,
          }),
        }
      );

      const result = await response.json();
      if (!response.ok || result.error) throw new Error(result.error || 'Failed to create user');

      setIsUserModalOpen(false);
      setNewUser({ username: '', password: '', permissions: ['DASHBOARD'], tutorId: '' });
      fetchUsers();
      alert("Utente creato con successo!");
    } catch (error: any) {
      console.error(error);
      alert(`Errore: ${error.message}`);
    }
  };

  const handleDeleteUser = async (id: string) => {
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
    setEditTutorId(user.tutorId || '');
    setIsEditModalOpen(true);
  };

  const handleUpdatePermissions = async () => {
    if (!editingUser) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ permissions: editPermissions, tutor_id: editTutorId || null })
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
        {users.map(user => {
          const linkedTutor = tutors.find(t => t.id === user.tutorId);
          return (
          <Card key={user.id} className="p-6 relative cursor-pointer hover:shadow-xl transition-shadow" onClick={() => openEditModal(user)}>
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
                <button
                  onClick={e => { e.stopPropagation(); setUserToDelete(user); }}
                  className="text-slate-400 hover:text-red-500 transition-colors"
                  title="Elimina utente"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Permessi</p>
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
              <div className="border-t pt-2 flex items-center gap-2 text-sm">
                <UserCheck size={14} className={user.tutorId ? 'text-teal-600 shrink-0' : 'text-slate-300 shrink-0'} />
                {user.tutorId ? (
                  <span className="text-slate-700">
                    Tutor associato: <span className="font-semibold">{linkedTutor ? linkedTutor.name : 'non trovato'}</span>
                  </span>
                ) : (
                  <span className="text-slate-400 italic">Nessun tutor associato</span>
                )}
              </div>
            </div>
          </Card>
          );
        })}
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
            <label className="block text-sm font-medium text-slate-700 mb-1">Tutor associato</label>
            <select
              value={newUser.tutorId}
              onChange={e => setNewUser({ ...newUser, tutorId: e.target.value })}
              className="w-full p-2 border rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
            >
              <option value="">Nessun tutor associato</option>
              {tutors.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <p className="text-xs text-slate-400 mt-1">
              Se associ un tutor, l'utente (senza permesso "ADMIN COMPLETO") vedrà solo i propri turni in Pianificazione e Consuntivo.
            </p>
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
            <label className="block text-sm font-medium text-slate-700 mb-1">Tutor associato</label>
            <select
              value={editTutorId}
              onChange={e => setEditTutorId(e.target.value)}
              className="w-full p-2 border rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
            >
              <option value="">Nessun tutor associato</option>
              {tutors.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <p className="text-xs text-slate-400 mt-1">
              Se associ un tutor, l'utente (senza permesso "ADMIN COMPLETO") vedrà solo i propri turni in Pianificazione e Consuntivo.
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

      {/* Confirm Delete User Modal */}
      <Modal isOpen={!!userToDelete} onClose={() => setUserToDelete(null)} title="Elimina utente">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-100 rounded-full flex-shrink-0 mt-0.5">
              <AlertTriangle size={20} className="text-red-600" />
            </div>
            <div>
              <p className="text-sm text-slate-700">
                Sei sicuro di voler eliminare l'utente <strong>{userToDelete?.username}</strong>?
              </p>
              <p className="text-xs text-slate-500 mt-1">
                L'utente non potrà più accedere al sistema. L'operazione non può essere annullata.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setUserToDelete(null)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Annulla
            </button>
            <button
              onClick={() => { const id = userToDelete?.id; setUserToDelete(null); if (id) handleDeleteUser(id); }}
              className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
            >
              Si, elimina
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}