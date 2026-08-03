import React, { useState, useEffect, useMemo, useRef } from 'react';
import { RichTextEditor } from './components/RichTextEditor';
import { NewsRichTextEditor } from './components/NewsRichTextEditor';
import { FormattedText, stripHtmlTags } from './components/FormattedText';
import { exportPatientExcel } from './utils/exportPatientExcel';
import { exportHospitalIndicatorsExcel } from './utils/exportHospitalIndicatorsExcel';
import {
  Heart,
  Wind,
  Activity,
  Scissors,
  Brain,
  Sparkles,
  Smile,
  FileText,
  Lock,
  LogOut,
  User,
  Search,
  Plus,
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  AlertCircle,
  Star,
  Send,
  BookOpen,
  Download,
  Clock,
  Calendar,
  Check,
  Stethoscope,
  TrendingUp,
  ShieldCheck,
  HeartPulse,
  HeartHandshake,
  RefreshCw,
  PlusCircle,
  HelpCircle,
  UserCheck,
  CheckCircle,
  CheckCircle2,
  ShieldAlert,
  LayoutGrid,
  FileSpreadsheet,
  Users,
  ClipboardList,
  MessageSquare,
  Home,
  Trash2,
  Edit,
  Paperclip,
  Info,
  FileUp,
  Baby,
  FlaskConical,
  Camera,
  Edit3,
  ClipboardCheck,
  Building2,
  Archive,
  History,
  RotateCcw,
  X,
  Database,
  Cloud
} from 'lucide-react';
import {
  supabase,
  testSupabaseConnection,
  syncHospitalDataToSupabase,
  fetchHospitalDataFromSupabase,
  getSupabaseSetupSQL
} from './utils/supabase';
import { motion, AnimatePresence } from 'motion/react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend
} from 'recharts';
import { Department, Disease, Patient, AdminUser, Message, CustomChecklist, CustomChecklistQuestion, HospitalComplaint, DeptSatisfactionSubmission, PatientChecklistAnswer, SatisfactionSurvey, NewsBanner, AdmissionRecord, SPECIAL_DISEASES, PERSIAN_MONTHS } from './types';
import { DEPARTMENTS, DISEASES, DEFAULT_ADMINS, DEFAULT_PATIENTS, DEFAULT_MESSAGES } from './data';

import { ShamsiDatePicker } from './components/ShamsiDatePicker';
import { MultiSelectDropdown } from './components/MultiSelectDropdown';

// Custom Tooltip for Recharts Monthly Indicators Chart
const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 border border-slate-700/80 backdrop-blur-md p-3.5 rounded-2xl shadow-2xl text-right text-white space-y-2 min-w-[210px] z-50">
        <p className="text-xs font-black border-b border-white/10 pb-1.5 text-sky-400 flex items-center justify-between">
          <span>ماه: {label}</span>
          <span className="text-[10px] text-slate-400 font-normal">تحلیل شاخص‌ها</span>
        </p>
        <div className="space-y-1.5 text-xs">
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-slate-300 font-bold text-[11px]">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                <span>{entry.name}:</span>
              </span>
              <span className="font-mono font-black" style={{ color: entry.color }}>
                {entry.value}{entry.unit || '%'}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

// Helper function to format any Jalali date string into two-digit month and two-digit day (YYYY/MM/DD)
export const formatPaddedJalaliDate = (dateStr: string): string => {
  if (!dateStr) return dateStr;
  const parts = dateStr.trim().split(/[\/\-]/);
  if (parts.length === 3) {
    const y = parts[0];
    const m = String(parseInt(parts[1], 10) || parts[1]).padStart(2, '0');
    const d = String(parseInt(parts[2], 10) || parts[2]).padStart(2, '0');
    return `${y}/${m}/${d}`;
  }
  return dateStr;
};

// Helper function to get the current Persian Shamsi date string
const getPersianDateString = (date: Date = new Date()) => {
  try {
    const raw = date.toLocaleDateString('fa-IR-u-nu-latn');
    return formatPaddedJalaliDate(raw);
  } catch (e) {
    return "1405/04/28";
  }
};

// Helper function to render correct department icon dynamically
const DepartmentIcon = ({ id, emoji, className = "w-6 h-6" }: { id: string, emoji?: string, className?: string }) => {
  if (emoji) {
    return <span className={`inline-flex items-center justify-center leading-none select-none text-xl ${className}`}>{emoji}</span>;
  }
  switch (id) {
    case 'emergency':
      return <PlusCircle className={`${className} text-rose-500`} />;
    case 'pediatrics':
      return <Baby className={`${className} text-amber-500`} />;
    case 'internal_surgery':
      return <Scissors className={`${className} text-emerald-500`} />;
    case 'dialysis':
      return <Activity className={`${className} text-blue-500`} />;
    case 'ob_gyn_surgery':
      return <HeartHandshake className={`${className} text-purple-500`} />;
    case 'labor_block':
      return <Smile className={`${className} text-rose-400`} />;
    case 'thalassemia':
      return <Heart className={`${className} text-red-500`} />;
    case 'operating_room':
      return <Stethoscope className={`${className} text-indigo-500`} />;
    case 'ccu':
      return <TrendingUp className={`${className} text-purple-500`} />;
    case 'icu':
      return <ShieldCheck className={`${className} text-teal-600`} />;
    case 'radiology':
      return <Camera className={`${className} text-sky-500`} />;
    case 'laboratory':
      return <FlaskConical className={`${className} text-cyan-500`} />;
    default:
      return <Stethoscope className={`${className} text-slate-500`} />;
  }
};

// Categorized medical emojis for hospital department tiles
const DEPARTMENT_EMOJI_CATEGORIES = [
  {
    id: 'general',
    label: 'عمومی و اورژانس',
    emojis: ['🏥', '🚑', '🩺', '⚕️', '😷', '💉', '🩹', '🌡️', '💊', '📋', '🚨', '🛌', '♿', '🛡️', '⚡', '💓']
  },
  {
    id: 'organs',
    label: 'اعضا و فیزیولوژی',
    emojis: ['🫀', '🧠', '🫁', '🦴', '👁️', '🦷', '🩸', '👂', '👃', '👅', '🦵', '🦶', '🦾', '🦿', '❤️', '💖']
  },
  {
    id: 'lab',
    label: 'آزمایش و تشخیص',
    emojis: ['🧪', '🔬', '🧬', '🩻', '🧫', '📷', '📊', '📈', '☣️', '💧', '🧰', '🧼']
  },
  {
    id: 'maternity',
    label: 'مادر، کودک و زنان',
    emojis: ['👶', '🤰', '🤱', '🚼', '🍼', '🧸', '🌸', '👧', '👦', '👑', '🎀']
  },
  {
    id: 'care',
    label: 'سلامت و کادر درمان',
    emojis: ['🧑‍⚕️', '👩‍⚕️', '👨‍⚕️', '🍏', '🥗', '🧘', '🕊️', '✨', '⭐', '🤝', '🫂', '🌿', '☀️']
  }
];

// Interactive component to pick from high-variety medical & hospital emojis
const EmojiPickerGrid = ({
  selectedEmoji,
  onSelectEmoji
}: {
  selectedEmoji: string;
  onSelectEmoji: (emoji: string) => void;
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const displayedEmojis = useMemo(() => {
    if (activeCategory === 'all') {
      return DEPARTMENT_EMOJI_CATEGORIES.flatMap(c => c.emojis);
    }
    const cat = DEPARTMENT_EMOJI_CATEGORIES.find(c => c.id === activeCategory);
    return cat ? cat.emojis : [];
  }, [activeCategory]);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-3 bg-slate-950/50 p-2.5 rounded-xl border border-white/10">
        <input
          type="text"
          required
          placeholder="مثال: 🫀"
          value={selectedEmoji}
          onChange={(e) => onSelectEmoji(e.target.value)}
          className="w-16 text-center text-2xl bg-slate-900 border border-sky-500/40 text-white placeholder:text-slate-500 rounded-xl py-1.5 outline-none focus:border-sky-400 font-bold shadow-inner shrink-0"
        />
        <div className="flex flex-col">
          <span className="text-[11px] text-sky-300 font-bold flex items-center gap-1.5">
            <span>آیکون/ایموجی انتخاب شده:</span>
            <span className="text-xl bg-white/10 px-2 py-0.5 rounded-lg border border-white/10">{selectedEmoji || '🏥'}</span>
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5">می‌توانید خودتان ایموجی دستی تایپ کنید یا از دسته‌بندی‌های زبانه زیر انتخاب نمایید:</span>
        </div>
      </div>

      {/* Category filter pills */}
      <div className="flex flex-wrap gap-1 bg-slate-950/70 p-1.5 rounded-xl border border-white/10">
        <button
          type="button"
          onClick={() => setActiveCategory('all')}
          className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
            activeCategory === 'all'
              ? 'bg-sky-500 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          همه ({DEPARTMENT_EMOJI_CATEGORIES.reduce((acc, c) => acc + c.emojis.length, 0)})
        </button>
        {DEPARTMENT_EMOJI_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.id)}
            className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              activeCategory === cat.id
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Emoji Buttons Grid */}
      <div className="flex flex-wrap gap-1.5 bg-slate-950/40 p-2.5 rounded-2xl border border-white/5 max-h-44 overflow-y-auto custom-scrollbar">
        {displayedEmojis.map((em, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelectEmoji(em)}
            className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all cursor-pointer ${
              selectedEmoji === em
                ? 'bg-sky-500/40 border border-sky-400 scale-110 shadow-lg shadow-sky-500/20 ring-2 ring-sky-400/50'
                : 'bg-white/5 hover:bg-white/15 border border-white/5 hover:scale-105'
            }`}
            title={`انتخاب ایموجی ${em}`}
          >
            {em}
          </button>
        ))}
      </div>
    </div>
  );
};

// Color mapping for hospital departments (offering beautiful, glass-themed gradient options)
const COLOR_MAP: Record<string, {
  label: string;
  // Patient Portal (Light Theme)
  bg: string;
  iconBg: string;
  iconColor: string;
  textColor: string;
  // Admin Portal (Dark Theme)
  adminBg: string;
  adminBorder: string;
  adminText: string;
}> = {
  red: {
    label: 'قرمز',
    bg: 'bg-gradient-to-br from-red-500/25 via-rose-500/20 to-rose-50/70 hover:from-red-500/35 hover:via-rose-500/30 border-red-300/70 hover:border-red-400',
    iconBg: 'bg-red-100/90 border-red-200',
    iconColor: 'text-red-700',
    textColor: 'text-red-800',
    adminBg: 'from-rose-500/10 to-red-600/10',
    adminBorder: 'border-rose-400/20 hover:border-rose-400/45',
    adminText: 'text-rose-400 hover:text-rose-300'
  },
  green: {
    label: 'سبز',
    bg: 'bg-gradient-to-br from-emerald-500/25 via-green-500/20 to-emerald-50/70 hover:from-emerald-500/35 hover:via-green-500/30 border-emerald-300/70 hover:border-emerald-400',
    iconBg: 'bg-emerald-100/90 border-emerald-200',
    iconColor: 'text-emerald-700',
    textColor: 'text-emerald-800',
    adminBg: 'from-green-500/10 to-emerald-600/10',
    adminBorder: 'border-green-400/20 hover:border-green-400/45',
    adminText: 'text-green-400 hover:text-green-300'
  },
  yellow: {
    label: 'زرد',
    bg: 'bg-gradient-to-br from-amber-400/30 via-yellow-400/20 to-yellow-50/70 hover:from-amber-400/40 hover:via-yellow-400/30 border-amber-300/70 hover:border-amber-400',
    iconBg: 'bg-amber-100/90 border-amber-200',
    iconColor: 'text-amber-700',
    textColor: 'text-amber-800',
    adminBg: 'from-amber-500/10 to-yellow-600/10',
    adminBorder: 'border-amber-400/20 hover:border-amber-400/45',
    adminText: 'text-amber-400 hover:text-amber-300'
  },
  blue: {
    label: 'آبی',
    bg: 'bg-gradient-to-br from-blue-500/25 via-sky-500/20 to-sky-50/70 hover:from-blue-500/35 hover:via-sky-500/30 border-blue-300/70 hover:border-blue-400',
    iconBg: 'bg-blue-100/90 border-blue-200',
    iconColor: 'text-blue-700',
    textColor: 'text-blue-800',
    adminBg: 'from-blue-500/10 to-sky-600/10',
    adminBorder: 'border-blue-400/20 hover:border-blue-400/45',
    adminText: 'text-blue-400 hover:text-blue-300'
  },
  jade: {
    label: 'یشمی',
    bg: 'bg-gradient-to-br from-teal-500/25 via-emerald-500/20 to-teal-50/70 hover:from-teal-500/35 hover:via-emerald-500/30 border-teal-300/70 hover:border-teal-400',
    iconBg: 'bg-teal-100/90 border-teal-200',
    iconColor: 'text-teal-700',
    textColor: 'text-teal-800',
    adminBg: 'from-teal-500/10 to-emerald-600/10',
    adminBorder: 'border-teal-400/20 hover:border-teal-400/45',
    adminText: 'text-teal-400 hover:text-teal-300'
  },
  indigo: {
    label: 'نیلی',
    bg: 'bg-gradient-to-br from-indigo-500/25 via-blue-500/20 to-indigo-50/70 hover:from-indigo-500/35 hover:via-blue-500/30 border-indigo-300/70 hover:border-indigo-400',
    iconBg: 'bg-indigo-100/90 border-indigo-200',
    iconColor: 'text-indigo-700',
    textColor: 'text-indigo-800',
    adminBg: 'from-indigo-500/10 to-blue-600/10',
    adminBorder: 'border-indigo-400/20 hover:border-indigo-400/45',
    adminText: 'text-indigo-400 hover:text-indigo-300'
  },
  purple: {
    label: 'بنفش',
    bg: 'bg-gradient-to-br from-purple-500/25 via-violet-500/20 to-purple-50/70 hover:from-purple-500/35 hover:via-violet-500/30 border-purple-300/70 hover:border-purple-400',
    iconBg: 'bg-purple-100/90 border-purple-200',
    iconColor: 'text-purple-700',
    textColor: 'text-purple-800',
    adminBg: 'from-purple-500/10 to-violet-600/10',
    adminBorder: 'border-purple-400/20 hover:border-purple-400/45',
    adminText: 'text-purple-400 hover:text-purple-300'
  },
  turquoise: {
    label: 'فیروزه‌ای',
    bg: 'bg-gradient-to-br from-cyan-500/25 via-teal-500/20 to-cyan-50/70 hover:from-cyan-500/35 hover:via-teal-500/30 border-cyan-300/70 hover:border-cyan-400',
    iconBg: 'bg-cyan-100/90 border-cyan-200',
    iconColor: 'text-cyan-700',
    textColor: 'text-cyan-800',
    adminBg: 'from-cyan-500/10 to-teal-600/10',
    adminBorder: 'border-cyan-400/20 hover:border-cyan-400/45',
    adminText: 'text-cyan-400 hover:text-cyan-300'
  },
  lime: {
    label: 'فسفری',
    bg: 'bg-gradient-to-br from-lime-500/25 via-yellow-400/20 to-lime-50/70 hover:from-lime-500/35 hover:via-yellow-400/30 border-lime-300/70 hover:border-lime-400',
    iconBg: 'bg-lime-100/90 border-lime-200',
    iconColor: 'text-lime-700',
    textColor: 'text-lime-800',
    adminBg: 'from-lime-500/10 to-green-600/10',
    adminBorder: 'border-lime-400/20 hover:border-lime-400/45',
    adminText: 'text-lime-400 hover:text-lime-300'
  }
};

// Helper function to return beautiful, happy, glass-themed styles for each department card
const getDeptTileStyle = (id: string, color?: string) => {
  if (color && COLOR_MAP[color]) {
    return COLOR_MAP[color];
  }

  // Default colors assigned to initial/legacy departments
  const defaultColors: Record<string, string> = {
    emergency: 'red',
    pediatrics: 'blue',
    internal_surgery: 'purple',
    dialysis: 'jade',
    ob_gyn_surgery: 'purple',
    labor_block: 'yellow',
    thalassemia: 'red',
    operating_room: 'turquoise',
    ccu: 'indigo',
    icu: 'jade',
    radiology: 'yellow',
    laboratory: 'lime'
  };

  const mappedColor = defaultColors[id] || 'blue';
  return COLOR_MAP[mappedColor];
};

const safeLocalStorageSet = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.warn(`localStorage.setItem failed for key "${key}":`, error);
    try {
      if (value.includes('data:image/') || value.includes('data:application/')) {
        const sanitized = value.replace(/data:(image|application)\/[^;]+;base64,[A-Za-z0-9+/=]{10000,}/g, '"[فایل پیوست - ذخیره‌سازی محلی]"');
        localStorage.setItem(key, sanitized);
        return;
      }
    } catch (e2) {
      console.warn(`Sanitized storage failed for "${key}":`, e2);
    }
    try {
      localStorage.removeItem('hospital_dept_satisfaction_submissions');
      localStorage.removeItem('hospital_complaints');
      localStorage.setItem(key, value);
    } catch (e3) {
      console.warn(`Safe storage fallback exhausted for "${key}". State preserved in memory.`);
    }
  }
};

const readFileAsDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    if (file.type.startsWith('image/')) {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 1000;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height = Math.round((height * MAX_SIZE) / width);
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width = Math.round((width * MAX_SIZE) / height);
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.7));
            return;
          }
          resolve(e.target?.result as string);
        };
        img.onerror = () => resolve(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  });
};

export default function App() {
  // --- Persistent State Initialization ---
  const [departments, setDepartments] = useState<Department[]>(DEPARTMENTS);
  const [diseases, setDiseases] = useState<Disease[]>(DISEASES);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [customChecklists, setCustomChecklists] = useState<CustomChecklist[]>([]);
  const [complaints, setComplaints] = useState<HospitalComplaint[]>([]);
  const [deptSatisfactionSubmissions, setDeptSatisfactionSubmissions] = useState<DeptSatisfactionSubmission[]>([]);
  const [selectedStatsYear, setSelectedStatsYear] = useState<string>('1404');

  // Admission History States
  const [admissionHistory, setAdmissionHistory] = useState<AdmissionRecord[]>([]);
  const [viewingHistoryNationalId, setViewingHistoryNationalId] = useState<string | null>(null);
  const [historySearchQuery, setHistorySearchQuery] = useState<string>('');

  // Local storage initialization with automatic structure migration
  useEffect(() => {
    const storedPatients = localStorage.getItem('hospital_patients');
    const storedAdmins = localStorage.getItem('hospital_admins');
    const storedMessages = localStorage.getItem('hospital_messages');
    const storedDiseases = localStorage.getItem('hospital_diseases');

    let needsMigration = !storedAdmins || !storedPatients || !storedDiseases || !storedMessages;

    if (!needsMigration) {
      try {
        const parsedDiseases = JSON.parse(storedDiseases!);
        const parsedAdmins = JSON.parse(storedAdmins!);
        // If the stored data belongs to the old structure (e.g. contains 'oncology' or lacks super admin), trigger migration
        if (parsedDiseases.some((d: any) => d.departmentId === 'oncology') ||
            !parsedAdmins.some((a: any) => a.username === '5850008985')) {
          needsMigration = true;
        }
      } catch (e) {
        needsMigration = true;
      }
    }

    if (needsMigration) {
      setPatients(DEFAULT_PATIENTS);
      setAdmins(DEFAULT_ADMINS);
      setMessages(DEFAULT_MESSAGES);
      setDiseases(DISEASES);
      setDepartments(DEPARTMENTS);
      safeLocalStorageSet('hospital_patients', JSON.stringify(DEFAULT_PATIENTS));
      safeLocalStorageSet('hospital_admins', JSON.stringify(DEFAULT_ADMINS));
      safeLocalStorageSet('hospital_messages', JSON.stringify(DEFAULT_MESSAGES));
      safeLocalStorageSet('hospital_diseases', JSON.stringify(DISEASES));
      safeLocalStorageSet('hospital_departments', JSON.stringify(DEPARTMENTS));
    } else {
      const loadedPatients = JSON.parse(storedPatients!) as Patient[];
      const demoNames = ["علی علوی", "مریم سادات حسینی", "رضا احمدی", "فاطمه رضایی", "پیمان ناصری"];
      const filteredPatients = loadedPatients.filter(p => !demoNames.includes(p.name));
      setPatients(filteredPatients);
      if (filteredPatients.length !== loadedPatients.length) {
        safeLocalStorageSet('hospital_patients', JSON.stringify(filteredPatients));
      }
      setAdmins(JSON.parse(storedAdmins!));
      setMessages(JSON.parse(storedMessages!));
      setDiseases(JSON.parse(storedDiseases!));
      const storedDepts = localStorage.getItem('hospital_departments');
      if (storedDepts) {
        setDepartments(JSON.parse(storedDepts));
      } else {
        setDepartments(DEPARTMENTS);
        safeLocalStorageSet('hospital_departments', JSON.stringify(DEPARTMENTS));
      }
    }

    const storedChecklists = localStorage.getItem('hospital_custom_checklists');
    if (storedChecklists) {
      setCustomChecklists(JSON.parse(storedChecklists));
    } else {
      setCustomChecklists([]);
      safeLocalStorageSet('hospital_custom_checklists', JSON.stringify([]));
    }

    const storedComplaints = localStorage.getItem('hospital_complaints');
    if (storedComplaints) {
      setComplaints(JSON.parse(storedComplaints));
    } else {
      setComplaints([]);
    }

    const storedSubs = localStorage.getItem('hospital_dept_satisfaction_submissions');
    if (storedSubs) {
      setDeptSatisfactionSubmissions(JSON.parse(storedSubs));
    } else {
      setDeptSatisfactionSubmissions([]);
    }

    const storedHistory = localStorage.getItem('hospital_admission_history');
    if (storedHistory) {
      try {
        setAdmissionHistory(JSON.parse(storedHistory));
      } catch (e) {
        setAdmissionHistory([]);
      }
    } else {
      // Seed initial history from existing/default patients
      const initialHistory: AdmissionRecord[] = (DEFAULT_PATIENTS).map((p, idx) => ({
        id: `adm_${p.nationalId}_${idx}_${Date.now()}`,
        nationalId: p.nationalId,
        patientName: p.name,
        diseaseName: DISEASES.find(d => d.id === p.diseaseId)?.name || 'نامشخص',
        admissionDate: p.admissionDate || p.dischargeDate || getPersianDateString(),
        departmentId: p.departmentId,
        departmentName: DEPARTMENTS.find(d => d.id === p.departmentId)?.name || 'بخش درمانی',
        fileNumber: p.fileNumber,
        specialDisease: p.specialDisease,
        createdAt: new Date().toISOString()
      }));
      setAdmissionHistory(initialHistory);
      safeLocalStorageSet('hospital_admission_history', JSON.stringify(initialHistory));
    }
  }, []);

  // Sync state helpers
  const saveAdmissionHistory = (newHistory: AdmissionRecord[]) => {
    setAdmissionHistory(newHistory);
    safeLocalStorageSet('hospital_admission_history', JSON.stringify(newHistory));
  };

  const savePatients = (newPatients: Patient[]) => {
    setPatients(newPatients);
    safeLocalStorageSet('hospital_patients', JSON.stringify(newPatients));
  };

  const saveAdmins = (newAdmins: AdminUser[]) => {
    setAdmins(newAdmins);
    safeLocalStorageSet('hospital_admins', JSON.stringify(newAdmins));
  };

  const saveMessages = (newMessages: Message[]) => {
    setMessages(newMessages);
    safeLocalStorageSet('hospital_messages', JSON.stringify(newMessages));
  };

  const saveDiseases = (newDiseases: Disease[]) => {
    setDiseases(newDiseases);
    safeLocalStorageSet('hospital_diseases', JSON.stringify(newDiseases));
  };

  const saveDepartments = (newDepts: Department[]) => {
    setDepartments(newDepts);
    safeLocalStorageSet('hospital_departments', JSON.stringify(newDepts));
  };

  const saveCustomChecklists = (newChecklists: CustomChecklist[]) => {
    setCustomChecklists(newChecklists);
    safeLocalStorageSet('hospital_custom_checklists', JSON.stringify(newChecklists));
  };

  const saveComplaints = (newComplaints: HospitalComplaint[]) => {
    setComplaints(newComplaints);
    safeLocalStorageSet('hospital_complaints', JSON.stringify(newComplaints));
  };

  const saveDeptSatisfactionSubmissions = (newSubs: DeptSatisfactionSubmission[]) => {
    setDeptSatisfactionSubmissions(newSubs);
    safeLocalStorageSet('hospital_dept_satisfaction_submissions', JSON.stringify(newSubs));
  };

  // --- Premium Chat States ---
  const [activeChatPatientId, setActiveChatPatientId] = useState<string | null>(null);
  const [chatSearchQuery, setChatSearchQuery] = useState<string>('');
  const [chatFilter, setChatFilter] = useState<'all' | 'unanswered' | 'answered'>('all');
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editingMsgText, setEditingMsgText] = useState<string>('');
  const [editingMsgFile, setEditingMsgFile] = useState<{name: string, url: string} | null>(null);
  const [chatInputText, setChatInputText] = useState<string>('');
  const [chatInputFile, setChatInputFile] = useState<{name: string, url: string} | null>(null);

  // --- Tile-based Disease and Department management states ---
  const [selectedEduDeptId, setSelectedEduDeptId] = useState<string | null>(null);
  const [isAddingDept, setIsAddingDept] = useState<boolean>(false);
  const [newDeptName, setNewDeptName] = useState<string>('');
  const [newDeptEnglishId, setNewDeptEnglishId] = useState<string>('');
  const [newDeptColor, setNewDeptColor] = useState<string>('blue');
  const [newDeptEmoji, setNewDeptEmoji] = useState<string>('🏥');

  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
  const [editingDeptName, setEditingDeptName] = useState<string>('');
  const [editingDeptColor, setEditingDeptColor] = useState<string>('blue');
  const [editingDeptEmoji, setEditingDeptEmoji] = useState<string>('🏥');

  const [isAddingDisease, setIsAddingDisease] = useState<boolean>(false);
  const [editingDiseaseId, setEditingDiseaseId] = useState<string | null>(null);
  const [viewingDiseaseId, setViewingDiseaseId] = useState<string | null>(null);
  const [diseaseSearchQuery, setDiseaseSearchQuery] = useState<string>('');

  // Form states for creating/editing diseases
  const [diseaseFormName, setDiseaseFormName] = useState<string>('');
  const [diseaseFormEnglishName, setDiseaseFormEnglishName] = useState<string>('');
  const [diseaseFormDescription, setDiseaseFormDescription] = useState<string>('');
  const [diseaseFormEducational, setDiseaseFormEducational] = useState<string>('');
  const [diseaseFormGreenSymptoms, setDiseaseFormGreenSymptoms] = useState<string>('');
  const [diseaseFormGreenActions, setDiseaseFormGreenActions] = useState<string>('');
  const [diseaseFormYellowSymptoms, setDiseaseFormYellowSymptoms] = useState<string>('');
  const [diseaseFormYellowActions, setDiseaseFormYellowActions] = useState<string>('');
  const [diseaseFormRedSymptoms, setDiseaseFormRedSymptoms] = useState<string>('');
  const [diseaseFormRedActions, setDiseaseFormRedActions] = useState<string>('');
  const [diseaseFormAttachmentImages, setDiseaseFormAttachmentImages] = useState<string[]>([]);

  // --- Router & App Navigation ---
  // Screens: 'welcome' | 'hub' | 'db_departments' | 'patient_login' | 'patient_dashboard' | 'admin_dashboard'
  const [currentScreen, setCurrentScreen] = useState<string>('welcome');
  const [welcomeColor, setWelcomeColor] = useState<'red' | 'green' | 'blue' | 'purple' | 'pink'>('red');

  // Automatically cycle through the heart colors smoothly like a living heart when on welcome screen
  useEffect(() => {
    if (currentScreen !== 'welcome') return;
    const colors: ('red' | 'purple' | 'pink' | 'blue' | 'green')[] = ['red', 'purple', 'pink', 'blue', 'green'];
    const interval = setInterval(() => {
      setWelcomeColor((prev) => {
        const idx = colors.indexOf(prev);
        return colors[(idx + 1) % colors.length];
      });
    }, 2800); // Changes color every 2.8 seconds
    return () => clearInterval(interval);
  }, [currentScreen]);

  const welcomeColorStyles = {
    red: {
      gradient: "from-rose-500 to-red-600",
      glow: "rgba(239, 68, 68, 0.15)",
      ring: "rgba(239, 68, 68, 0.15)",
      iconColor: "text-red-500",
      stop1: "#ef4444",
      stop2: "#dc2626",
      accentGlow: "rgba(239, 68, 68, 0.45)",
    },
    green: {
      gradient: "from-emerald-400 to-emerald-600",
      glow: "rgba(16, 185, 129, 0.15)",
      ring: "rgba(16, 185, 129, 0.15)",
      iconColor: "text-emerald-500",
      stop1: "#10b981",
      stop2: "#059669",
      accentGlow: "rgba(16, 185, 129, 0.45)",
    },
    blue: {
      gradient: "from-blue-400 to-blue-600",
      glow: "rgba(59, 130, 246, 0.15)",
      ring: "rgba(59, 130, 246, 0.15)",
      iconColor: "text-blue-500",
      stop1: "#3b82f6",
      stop2: "#2563eb",
      accentGlow: "rgba(59, 130, 246, 0.45)",
    },
    purple: {
      gradient: "from-purple-400 to-purple-600",
      glow: "rgba(168, 85, 247, 0.15)",
      ring: "rgba(168, 85, 247, 0.15)",
      iconColor: "text-purple-500",
      stop1: "#a855f7",
      stop2: "#9333ea",
      accentGlow: "rgba(168, 85, 247, 0.45)",
    },
    pink: {
      gradient: "from-pink-400 to-pink-600",
      glow: "rgba(236, 72, 153, 0.15)",
      ring: "rgba(236, 72, 153, 0.15)",
      iconColor: "text-pink-500",
      stop1: "#ec4899",
      stop2: "#db2777",
      accentGlow: "rgba(236, 72, 153, 0.45)",
    }
  };

  // Login contexts
  const [currentUser, setCurrentUser] = useState<Patient | null>(null);
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>(null);

  // Department database state
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [selectedDisease, setSelectedDisease] = useState<Disease | null>(null);
  const [dbSearchQuery, setDbSearchQuery] = useState('');
  const [readerFontSize, setReaderFontSize] = useState<'normal' | 'large' | 'xlarge'>('large');

  // --- Feedback Hub States ---
  const [feedbackView, setFeedbackView] = useState<'grid' | 'complaint_form' | 'dept_satisfaction_select'>('grid');
  const [complaintName, setComplaintName] = useState('');
  const [complaintPhone, setComplaintPhone] = useState('');
  const [complaintAge, setComplaintAge] = useState('');
  const [complaintDate, setComplaintDate] = useState(() => getPersianDateString(new Date()));
  const [complaintDescription, setComplaintDescription] = useState('');
  const [feedbackSuccessMsg, setFeedbackSuccessMsg] = useState('');

  // --- Department Satisfaction Checklists states ---
  const [satisfactionDeptId, setSatisfactionDeptId] = useState('');
  const [showSatisfactionForm, setShowSatisfactionForm] = useState(false);
  const [satisfactionAnswers, setSatisfactionAnswers] = useState<Record<string, any>>({});

  // --- Patient Self-Care checklist filling states ---
  const [activeFillingChecklist, setActiveFillingChecklist] = useState<CustomChecklist | null>(null);
  const [patientChecklistAnswers, setPatientChecklistAnswers] = useState<Record<string, any>>({});

  // --- Hospital General Satisfaction Survey Questions ---
  const [hospitalSurveyQuestions, setHospitalSurveyQuestions] = useState<{ id: string; text: string }[]>(() => {
    const defaultQs = [
      { id: 'q1', text: 'مراقب شما (پرستار یا ماما) در هر شیفت خود را به شما معرفی می کند.' },
      { id: 'q2', text: 'در طول بستری نحوه احضار پرستار با سیستم، بالا بودن نرده های تخت، نحوه پایین آمدن از تخت و نکات ایمنی به شما آموزش داده شده است.' },
      { id: 'q3', text: 'در رابطه با دستبند شناسایی و اهمیت آن آموزش لازم به شما داده شد.' },
      { id: 'q4', text: 'مقررات بخش و بیمارستان از جمله : ساعت ملاقات، ساعت غذا، مقررات داشتن یا عدم داشتن همراه، مقررات بیمه، مدارک و لوازم مورد نیاز و ... به شما آموزش داده شد.' },
      { id: 'q5', text: 'در طول بستری مراقبت های بهداشتی و نحوه رعایت بهداشت شخصی به شما آموزش داده شده است.' },
      { id: 'q6', text: 'از نظافت بخش، تخت و ملحفه، پتو و بالشت و ... در طول بستری رضایت دارید.' },
      { id: 'q7', text: 'علت ایجاد بیماری، علائم بیماری و نحوه درمان بیماری خود را می دانید.' },
      { id: 'q8', text: 'از علائم و نشانه های خطر مربوط به عود مجدد بیماری آگاهی دارید.' },
      { id: 'q9', text: 'آموزش داروهای مصرفی خود ، نحوه مصرف صحیح ، عوارض احتمالی داروها و مراقبت های مورد نیاز در رابطه با داروها به شما داده شده است.' },
      { id: 'q10', text: 'پرسنل قبل از انجام هر اقدام و کارهای مراقبتی، اطلاعات و توضیحات لازم را به شما می دهند.' },
      { id: 'q11', text: 'نحوه دسترسی و پیگیری آزمایشات، سونوگرافی، عکس برداری ها به شما آموزش داده شد.' },
      { id: 'q12', text: 'آموزش لازم در رابطه با پیگیری وضعیت بیماری و نحوه دسترسی به پزشک معالج به شما داده شد.' },
      { id: 'q13', text: 'اطلاعات لازم در رابطه با فعالیت های روزانه زندگی (مجاز یا غیرمجاز) و نحوه استراحت در منزل به شما داده شده است.' },
      { id: 'q14', text: 'از رژیم غذایی خود و نحوه رعایت رژیم غذایی در منزل آگاهی دارید.' },
      { id: 'q15', text: 'از آموزش هایی که حین بستری در رابطه با بیماری، درمان، رژیم غذایی و مراقبت های لازم که پرسنل به شما داده است رضایت دارید.' },
      { id: 'q16', text: 'پرسنل حریم خصوصی شما را در زمان انجام خدمات بالینی رعایت می کنند.' },
      { id: 'q17', text: 'از نحوه برخورد پرسنل رضایت دارید.' }
    ];
    const stored = localStorage.getItem('hospital_satisfaction_survey_questions');
    return stored ? JSON.parse(stored) : defaultQs;
  });

  const saveHospitalSurveyQuestions = (newQuestions: { id: string; text: string }[]) => {
    setHospitalSurveyQuestions(newQuestions);
    safeLocalStorageSet('hospital_satisfaction_survey_questions', JSON.stringify(newQuestions));
  };

  // UI Modals & Inputs
  const [showAdminLoginModal, setShowAdminLoginModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const [showSupabaseModal, setShowSupabaseModal] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState<{ connected: boolean; message: string; loading: boolean }>({
    connected: true,
    message: 'اتصال به پایگاه داده ابری Supabase برقرار است',
    loading: false
  });
  const [supabaseActionMsg, setSupabaseActionMsg] = useState<string>('');
  const isInitialSupabaseLoaded = useRef(false);

  useEffect(() => {
    async function initSupabase() {
      const res = await testSupabaseConnection();
      setSupabaseStatus({
        connected: res.success,
        message: res.message,
        loading: false
      });
      if (res.success) {
        // Attempt to automatically load latest snapshot from Supabase Cloud on boot
        const fetchRes = await fetchHospitalDataFromSupabase();
        if (fetchRes.success && fetchRes.data) {
          if (fetchRes.data.patients && fetchRes.data.patients.length > 0) {
            setPatients(fetchRes.data.patients);
            safeLocalStorageSet('hospital_patients', JSON.stringify(fetchRes.data.patients));
          }
          if (fetchRes.data.messages && fetchRes.data.messages.length > 0) {
            setMessages(fetchRes.data.messages);
            safeLocalStorageSet('hospital_messages', JSON.stringify(fetchRes.data.messages));
          }
          if (fetchRes.data.complaints && fetchRes.data.complaints.length > 0) {
            setComplaints(fetchRes.data.complaints);
            safeLocalStorageSet('hospital_complaints', JSON.stringify(fetchRes.data.complaints));
          }
          if (fetchRes.data.checklists && fetchRes.data.checklists.length > 0) {
            setCustomChecklists(fetchRes.data.checklists);
            safeLocalStorageSet('hospital_custom_checklists', JSON.stringify(fetchRes.data.checklists));
          }
        }
      }
      isInitialSupabaseLoaded.current = true;
    }
    initSupabase();
  }, []);

  // Automatic background synchronization to Supabase whenever data changes
  useEffect(() => {
    if (!isInitialSupabaseLoaded.current) return;
    const timer = setTimeout(() => {
      syncHospitalDataToSupabase(patients, messages, complaints, customChecklists).catch(() => {});
    }, 2500);
    return () => clearTimeout(timer);
  }, [patients, messages, complaints, customChecklists]);

  const [showSurveySuccessNotification, setShowSurveySuccessNotification] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoginError, setAdminLoginError] = useState('');

  // Disease management extensions
  const [isCreatingDisease, setIsCreatingDisease] = useState(false);
  const [newDiseaseName, setNewDiseaseName] = useState('');
  const [newDiseaseEnglishName, setNewDiseaseEnglishName] = useState('');
  const [newDiseaseDeptId, setNewDiseaseDeptId] = useState('');

  // Admin user editing extensions
  const [editingAdminUsername, setEditingAdminUsername] = useState<string | null>(null);

  // File Transfer states
  const [patientAttachedFile, setPatientAttachedFile] = useState<{name: string, url: string} | null>(null);
  const [adminAttachedFile, setAdminAttachedFile] = useState<{name: string, url: string} | null>(null);

  // Patient Survey states
  const [surveySatisfaction, setSurveySatisfaction] = useState<number>(5);
  const [surveyFamilyHistory, setSurveyFamilyHistory] = useState<boolean>(false);
  const [surveyDietAdherence, setSurveyDietAdherence] = useState<boolean>(true);
  const [surveyMedAdherence, setSurveyMedAdherence] = useState<boolean>(true);
  const [surveyWoundPain, setSurveyWoundPain] = useState<boolean>(false);
  const [surveySuccess, setSurveySuccess] = useState(false);

  // Custom Checklist Management states for Admin
  const [editingChecklist, setEditingChecklist] = useState<CustomChecklist | null>(null);
  const [checklistFormTitle, setChecklistFormTitle] = useState('');
  const [checklistFormTargetType, setChecklistFormTargetType] = useState<'patient' | 'satisfaction'>('satisfaction');
  const [checklistFormDeptId, setChecklistFormDeptId] = useState('');
  const [checklistFormQuestions, setChecklistFormQuestions] = useState<CustomChecklistQuestion[]>([]);
  const [newQText, setNewQText] = useState('');
  const [newQType, setNewQType] = useState<CustomChecklistQuestion['type']>('qualitative');
  const [newQOptions, setNewQOptions] = useState('');

  // News Banners slideshow state
  const [newsBanners, setNewsBanners] = useState<NewsBanner[]>(() => {
    const stored = localStorage.getItem('hospital_news_banners');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {}
    }
    return [
      {
        id: 'banner_1',
        title: 'افتتاح بخش جدید مراقبت‌های ویژه قلب (CCU)',
        content: 'بخش جدید CCU با پیشرفته‌ترین تجهیزات مانیتورینگ علائم حیاتی و کادر متخصص مجرب آماده ارائه خدمات شبانه‌روزی به بیماران ارجمند می‌باشد.',
        imageUrl: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1200&q=80',
        isActive: true,
        createdAt: '1405/04/28'
      },
      {
        id: 'banner_2',
        title: 'طرح ملی واکسیناسیون و پایش سلامت خانواده',
        content: 'هموطنان گرامی می‌توانند جهت بهره‌مندی از غربالگری رایگان فشار خون و مشاوره تغذیه به کلینیک سلامت بیمارستان مراجعه فرمایند.',
        imageUrl: 'https://images.unsplash.com/photo-1584515901367-f1c2a125537d?auto=format&fit=crop&w=1200&q=80',
        isActive: true,
        createdAt: '1405/04/27'
      },
      {
        id: 'banner_3',
        title: 'راه‌اندازی نوبت‌دهی آنلاین و مشاوره از راه دور',
        content: 'از این پس امکان اخذ نوبت تخصصی و فوق‌تخصصی پزشکان و مشاوره تصویری مستقیم با پزشک معalkoz از طریق همین پرتال مهیا گردیده است.',
        imageUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=80',
        isActive: true,
        createdAt: '1405/04/26'
      }
    ];
  });

  const saveNewsBanners = (updated: NewsBanner[]) => {
    setNewsBanners(updated);
    safeLocalStorageSet('hospital_news_banners', JSON.stringify(updated));
  };

  const [currentBannerIdx, setCurrentBannerIdx] = useState<number>(0);
  const [bannerFormTitle, setBannerFormTitle] = useState('');
  const [bannerFormContent, setBannerFormContent] = useState('');
  const [bannerFormDescription, setBannerFormDescription] = useState('');
  const [bannerFormImageUrl, setBannerFormImageUrl] = useState('');
  const [bannerFormAttachmentImages, setBannerFormAttachmentImages] = useState<string[]>([]);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [selectedNewsBanner, setSelectedNewsBanner] = useState<NewsBanner | null>(null);

  // Clock
  const [currentTime, setCurrentTime] = useState<string>('');
  const [clockTime, setClockTime] = useState({
    hourMin: '',
    seconds: '',
    dayName: '',
    dayNum: '',
    monthName: '',
    yearNum: ''
  });

  useEffect(() => {
    const updateTime = () => {
      const options: Intl.DateTimeFormatOptions = {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        calendar: 'persian',
        numberingSystem: 'latn'
      };
      const formatted = new Date().toLocaleTimeString('fa-IR', options);
      const dateStr = new Date().toLocaleDateString('fa-IR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      setCurrentTime(`${dateStr} - ساعت ${formatted}`);

      // Graphical details for the widgets
      const now = new Date();
      const hmStr = now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', hour12: false, calendar: 'persian', numberingSystem: 'latn' });
      const secStr = now.toLocaleTimeString('fa-IR', { second: '2-digit', calendar: 'persian', numberingSystem: 'latn' });
      const dName = now.toLocaleDateString('fa-IR', { weekday: 'long' });
      const dNum = now.toLocaleDateString('fa-IR', { day: 'numeric', numberingSystem: 'latn' });
      const mName = now.toLocaleDateString('fa-IR', { month: 'long' });
      const yNum = now.toLocaleDateString('fa-IR', { year: 'numeric', numberingSystem: 'latn' });

      setClockTime({
        hourMin: hmStr,
        seconds: secStr,
        dayName: dName,
        dayNum: dNum,
        monthName: mName,
        yearNum: yNum
      });
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // News slideshow automatic transition (every 5 seconds)
  useEffect(() => {
    const activeBanners = newsBanners.filter(b => b.isActive);
    if (activeBanners.length <= 1) return;
    const slideshowInterval = setInterval(() => {
      setCurrentBannerIdx((prev) => (prev + 1) % activeBanners.length);
    }, 5000);
    return () => clearInterval(slideshowInterval);
  }, [newsBanners]);

  // Handle Logouts
  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentAdmin(null);
    setCurrentScreen('hub');
  };

  // --- Admin Logic ---
  const [adminTab, setAdminTab] = useState<'overview' | 'register' | 'patients' | 'qa' | 'disease_edit' | 'admins_manage' | 'stats' | 'checklists' | 'complaints' | 'banners'>('overview');
  const [complaintsSubTab, setComplaintsSubTab] = useState<'general' | 'hospital_survey' | 'dept_survey'>('general');
  const [selectedSurveyTile, setSelectedSurveyTile] = useState<'overall' | 'questions' | 'praise' | 'suggestions' | null>(null);
  const [selectedDeptFilterId, setSelectedDeptFilterId] = useState<string | null>(null);
  const [patientListPage, setPatientListPage] = useState<number>(1);

  // Register form state
  const [regNationalId, setRegNationalId] = useState('');
  const [regUserCode, setRegUserCode] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regFileNumber, setRegFileNumber] = useState('');
  const [regName, setRegName] = useState('');
  const [regAge, setRegAge] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regDiseaseName, setRegDiseaseName] = useState('');
  const [regDeptId, setRegDeptId] = useState('');
  const [regFollowupStatus, setRegFollowupStatus] = useState<'green' | 'yellow' | 'red' | 'pending'>('green');
  const [regReadmissionRecentMonth, setRegReadmissionRecentMonth] = useState(false);
  const [regIsPregnant, setRegIsPregnant] = useState(false);
  const [regIsHighRiskMother, setRegIsHighRiskMother] = useState(false);
  const [regSpecialDisease, setRegSpecialDisease] = useState<string>('سایر بیماران');
  const [regGuidanceNotes, setRegGuidanceNotes] = useState('');
  const [regHashtaggedDiseaseIds, setRegHashtaggedDiseaseIds] = useState<string[]>([]);
  const [regActiveChecklistIds, setRegActiveChecklistIds] = useState<string[]>([]);
  const [regSuccessMsg, setRegSuccessMsg] = useState('');
  const [regErrorMsg, setRegErrorMsg] = useState('');

  // Interactive Re-admission Prompt state
  const [reAdmissionPromptData, setReAdmissionPromptData] = useState<{
    existingPatient: Patient;
    regName: string;
    regAge: string;
    regPhone: string;
    regFileNumber: string;
    targetDeptId: string;
    finalDiseaseId: string;
    regSpecialDisease: string;
    regAdmissionDate: string;
    regFollowupStatus: 'pending' | 'green' | 'yellow' | 'red';
    regIsPregnant: boolean;
    regIsHighRiskMother: boolean;
    regGuidanceNotes: string;
    regHashtaggedDiseaseIds: string[];
    regActiveChecklistIds: string[];
    finalUserCode: string;
    finalPassword: string;
  } | null>(null);

  const handleConfirmReAdmission = (enableReadmissionFlag: boolean) => {
    if (!reAdmissionPromptData) return;
    const {
      existingPatient,
      regName,
      regAge,
      regPhone,
      regFileNumber,
      targetDeptId,
      finalDiseaseId,
      regSpecialDisease,
      regAdmissionDate,
      regFollowupStatus,
      regIsPregnant,
      regIsHighRiskMother,
      regGuidanceNotes,
      regHashtaggedDiseaseIds,
      regActiveChecklistIds,
      finalUserCode,
      finalPassword
    } = reAdmissionPromptData;

    const existingIndex = patients.findIndex(p => p.nationalId === existingPatient.nationalId);
    if (existingIndex === -1) return;

    const reAdmittedPatient: Patient = {
      ...existingPatient,
      name: regName || existingPatient.name,
      age: parseInt(regAge) || existingPatient.age,
      phone: regPhone || existingPatient.phone,
      fileNumber: regFileNumber || existingPatient.fileNumber,
      departmentId: targetDeptId,
      diseaseId: finalDiseaseId,
      specialDisease: regSpecialDisease || existingPatient.specialDisease || 'سایر بیماران',
      admissionDate: regAdmissionDate,
      dischargeDate: regAdmissionDate,
      followupStatus: regFollowupStatus || 'green',
      readmissionRecentMonth: enableReadmissionFlag,
      isPregnant: regIsPregnant,
      isHighRiskMother: regIsPregnant ? regIsHighRiskMother : false,
      guidanceNotes: regGuidanceNotes 
        ? `${existingPatient.guidanceNotes ? existingPatient.guidanceNotes + '\n---\n[یادداشت پذیرش مجدد]: ' : ''}${regGuidanceNotes}` 
        : existingPatient.guidanceNotes,
      hashtaggedDiseaseIds: regHashtaggedDiseaseIds.length > 0 ? regHashtaggedDiseaseIds : existingPatient.hashtaggedDiseaseIds,
      activeChecklistIds: regActiveChecklistIds.length > 0 ? regActiveChecklistIds : existingPatient.activeChecklistIds,
      userCode: finalUserCode || existingPatient.userCode,
      password: finalPassword || existingPatient.password,
    };

    const updatedPatients = [...patients];
    updatedPatients[existingIndex] = reAdmittedPatient;
    savePatients(updatedPatients);

    // Record admission history
    const targetDeptObj = departments.find(d => d.id === targetDeptId);
    const targetDiseaseObj = diseases.find(d => d.id === finalDiseaseId);
    const newAdmRecord: AdmissionRecord = {
      id: `adm_${existingPatient.nationalId}_${Date.now()}_${Math.floor(Math.random()*1000)}`,
      nationalId: existingPatient.nationalId,
      patientName: regName || existingPatient.name,
      diseaseName: targetDiseaseObj ? targetDiseaseObj.name : 'نامشخص',
      admissionDate: regAdmissionDate || getPersianDateString(),
      departmentId: targetDeptId,
      departmentName: targetDeptObj ? targetDeptObj.name : 'بخش درمانی',
      fileNumber: regFileNumber || existingPatient.fileNumber,
      specialDisease: regSpecialDisease || existingPatient.specialDisease,
      notes: enableReadmissionFlag ? 'بستری مجدد در ماه اخیر' : 'پذیرش مجدد',
      createdAt: new Date().toISOString()
    };
    saveAdmissionHistory([newAdmRecord, ...admissionHistory]);

    setRegSuccessMsg(`پرونده بیمار ${regName || existingPatient.name} بروزرسانی و پذیرش مجدد وی در بخش ثبت گردید (${enableReadmissionFlag ? 'گزینه بستری مجدد فعال شد' : 'بدون علامت بستری مجدد'}).`);

    // Reset registration form
    setRegNationalId('');
    setRegUserCode('');
    setRegPassword('');
    setRegFileNumber('');
    setRegName('');
    setRegAge('');
    setRegPhone('');
    setRegDiseaseName('');
    setRegFollowupStatus('green');
    setRegReadmissionRecentMonth(false);
    setRegIsPregnant(false);
    setRegIsHighRiskMother(false);
    setRegSpecialDisease('سایر بیماران');
    setRegGuidanceNotes('');
    setRegHashtaggedDiseaseIds([]);
    setRegActiveChecklistIds([]);
    setRegDeptId('');
    setRegAdmissionDate(getPersianDateString(new Date()));
    setRegDiseaseSearch('');
    setRegChecklistSearch('');
    setReAdmissionPromptData(null);
  };

  const handleToggleReadmission = (patientId: string) => {
    const updated = patients.map(p => {
      if (p.nationalId === patientId) {
        return { ...p, readmissionRecentMonth: !p.readmissionRecentMonth };
      }
      return p;
    });
    savePatients(updated);
    if (viewingFollowupsPatient && viewingFollowupsPatient.nationalId === patientId) {
      setViewingFollowupsPatient(prev => prev ? { ...prev, readmissionRecentMonth: !prev.readmissionRecentMonth } : null);
    }
  };

  const handleRegisterPatient = (e: React.FormEvent) => {
    e.preventDefault();
    setRegSuccessMsg('');
    setRegErrorMsg('');

    const targetDeptId = currentAdmin?.role === 'super' ? regDeptId : currentAdmin?.departmentId;

    if (!regNationalId || !regFileNumber || !regName || !regAge || !regPhone || !regDiseaseName || !targetDeptId) {
      setRegErrorMsg('لطفاً تمامی فیلدهای فرم را به دقت تکمیل فرمایید.');
      return;
    }

    // Dynamic disease lookup or creation
    const normalizedTypedName = regDiseaseName.trim();
    let matchedDisease = diseases.find(
      d => d.name.trim().toLowerCase() === normalizedTypedName.toLowerCase() && d.departmentId === targetDeptId
    );

    let finalDiseaseId = '';

    if (matchedDisease) {
      finalDiseaseId = matchedDisease.id;
    } else {
      // Create a brand new disease in this department
      const newDiseaseId = `disease_${Date.now()}`;
      const newDisease: Disease = {
        id: newDiseaseId,
        name: normalizedTypedName,
        englishName: normalizedTypedName,
        departmentId: targetDeptId,
        description: `دستورالعمل‌ها و مراقبت‌های خودمراقبتی پس از ترخیص برای بیماری ${normalizedTypedName}. رعایت دقیق مصرف داروها و پیگیری زمان مراجعه مجدد الزامی است.`,
        educationalContent: `مراقبت‌های خانگی بیماری ${normalizedTypedName} شامل استراحت، رژیم غذایی مناسب و پایش علائم هشدار دهنده است.`,
        triageGuide: {
          green: {
            symptoms: ['بهبود نسبی علائم عمومی', 'فشار خون و ضربان قلب در محدوده نرمال', 'امکان انجام فعالیت‌های سبک روزمره'],
            actions: ['ادامه درمان دارویی طبق نسخه ترخیص', 'پیگیری رژیم غذایی توصیه شده', 'مراجع به پزشک معالج در زمان مقرر']
          },
          yellow: {
            symptoms: ['تب خفیف یا بی‌حالی مداوم', 'تغییر جزئی در علائم حیاتی', 'عدم تمایل کافی به غذا'],
            actions: ['استراحت بیشتر و افزایش مصرف مایعات', 'پایش دقیق علائم هر ۴ ساعت', 'تماس با بخش یا مراجعه به درمانگاه']
          },
          red: {
            symptoms: ['تنگی نفس شدید یا درد قفسه سینه', 'کاهش سطح هوشیاری یا سرگیجه شدید', 'خونریزی یا تب بالای ۳۹ درجه'],
            actions: ['مراجعه فوری به اورژانس بیمارستان', 'تماس با اورژانس ۱۱۵', 'همراه داشتن خلاصه پرونده ترخیص']
          }
        }
      };
      saveDiseases([newDisease, ...diseases]);
      finalDiseaseId = newDiseaseId;
    }

    const finalUserCode = regUserCode.trim() || regNationalId.trim();
    const finalPassword = regPassword.trim() || regNationalId.trim();

    const existingPatientIndex = patients.findIndex(p => p.nationalId === regNationalId);

    if (existingPatientIndex !== -1) {
      // Prompt user choice for re-admission
      const existing = patients[existingPatientIndex];
      setReAdmissionPromptData({
        existingPatient: existing,
        regName,
        regAge,
        regPhone,
        regFileNumber,
        targetDeptId,
        finalDiseaseId,
        regSpecialDisease,
        regAdmissionDate,
        regFollowupStatus,
        regIsPregnant,
        regIsHighRiskMother,
        regGuidanceNotes,
        regHashtaggedDiseaseIds,
        regActiveChecklistIds,
        finalUserCode,
        finalPassword
      });
      return;
    }

    const newPatient: Patient = {
      nationalId: regNationalId,
      userCode: finalUserCode,
      password: finalPassword,
      fileNumber: regFileNumber,
      name: regName,
      age: parseInt(regAge),
      phone: regPhone,
      dischargeDate: regAdmissionDate,
      departmentId: targetDeptId,
      diseaseId: finalDiseaseId,
      specialDisease: regSpecialDisease || 'سایر بیماران',
      followupStatus: regFollowupStatus || 'green',
      readmissionRecentMonth: regReadmissionRecentMonth,
      isPregnant: regIsPregnant,
      isHighRiskMother: regIsPregnant ? regIsHighRiskMother : false,
      guidanceNotes: regGuidanceNotes,
      hashtaggedDiseaseIds: regHashtaggedDiseaseIds,
      activeChecklistIds: regActiveChecklistIds,
      registeredAt: new Date().toISOString(),
      admissionDate: regAdmissionDate
    };

    savePatients([newPatient, ...patients]);

    // Record admission history
    const regDeptObj = departments.find(d => d.id === targetDeptId);
    const regDiseaseObj = diseases.find(d => d.id === finalDiseaseId);
    const newRegAdmRecord: AdmissionRecord = {
      id: `adm_${regNationalId}_${Date.now()}_${Math.floor(Math.random()*1000)}`,
      nationalId: regNationalId,
      patientName: regName,
      diseaseName: regDiseaseObj ? regDiseaseObj.name : normalizedTypedName || 'نامشخص',
      admissionDate: regAdmissionDate || getPersianDateString(),
      departmentId: targetDeptId,
      departmentName: regDeptObj ? regDeptObj.name : 'بخش درمانی',
      fileNumber: regFileNumber,
      specialDisease: regSpecialDisease,
      createdAt: new Date().toISOString()
    };
    saveAdmissionHistory([newRegAdmRecord, ...admissionHistory]);

    setRegSuccessMsg(`بیمار گرامی ${regName} با موفقیت در سیستم ثبت شد.`);

    // Reset form
    setRegNationalId('');
    setRegUserCode('');
    setRegPassword('');
    setRegFileNumber('');
    setRegName('');
    setRegAge('');
    setRegPhone('');
    setRegDiseaseName('');
    setRegFollowupStatus('green');
    setRegReadmissionRecentMonth(false);
    setRegIsPregnant(false);
    setRegIsHighRiskMother(false);
    setRegSpecialDisease('سایر بیماران');
    setRegGuidanceNotes('');
    setRegHashtaggedDiseaseIds([]);
    setRegActiveChecklistIds([]);
    setRegDeptId('');
    setRegAdmissionDate(getPersianDateString(new Date()));
    setRegDiseaseSearch('');
    setRegChecklistSearch('');
  };

  // Patient CRUD state
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [editPatientName, setEditPatientName] = useState('');
  const [editPatientNationalId, setEditPatientNationalId] = useState('');
  const [editUserCode, setEditUserCode] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editPatientFileNumber, setEditPatientFileNumber] = useState('');
  const [editPatientAge, setEditPatientAge] = useState('');
  const [editPatientPhone, setEditPatientPhone] = useState('');
  const [editPatientDiseaseName, setEditPatientDiseaseName] = useState('');
  const [editPatientDeptId, setEditPatientDeptId] = useState('');
  const [editFollowupStatus, setEditFollowupStatus] = useState<'green' | 'yellow' | 'red' | 'pending'>('green');
  const [editReadmissionRecentMonth, setEditReadmissionRecentMonth] = useState(false);
  const [editIsPregnant, setEditIsPregnant] = useState(false);
  const [editIsHighRiskMother, setEditIsHighRiskMother] = useState(false);
  const [editSpecialDisease, setEditSpecialDisease] = useState<string>('سایر بیماران');
  const [editGuidanceNotes, setEditGuidanceNotes] = useState('');
  const [editHashtaggedDiseaseIds, setEditHashtaggedDiseaseIds] = useState<string[]>([]);
  const [editActiveChecklistIds, setEditActiveChecklistIds] = useState<string[]>([]);

  const [deletingPatientId, setDeletingPatientId] = useState<string | null>(null);
  const [deletingChecklistId, setDeletingChecklistId] = useState<string | null>(null);
  const [selectedChecklistCategory, setSelectedChecklistCategory] = useState<'satisfaction' | 'patient' | null>(null);
  const [selectedSurveyPatient, setSelectedSurveyPatient] = useState<Patient | null>(null);
  const [viewingFollowupsPatient, setViewingFollowupsPatient] = useState<Patient | null>(null);
  const [patientCrudError, setPatientCrudError] = useState('');

  // Additional registration/editing & navigation states
  const [diseaseBackScreen, setDiseaseBackScreen] = useState<string>('hub');
  const [regAdmissionDate, setRegAdmissionDate] = useState(() => getPersianDateString(new Date()));
  const [editAdmissionDate, setEditAdmissionDate] = useState('');
  const [regDiseaseSearch, setRegDiseaseSearch] = useState('');
  const [editDiseaseSearch, setEditDiseaseSearch] = useState('');
  const [regChecklistSearch, setRegChecklistSearch] = useState('');
  const [editChecklistSearch, setEditChecklistSearch] = useState('');
  const [adminPatientSearch, setAdminPatientSearch] = useState('');
  const [selectedStatsMonth, setSelectedStatsMonth] = useState<string>('all');
  const [selectedChartMode, setSelectedChartMode] = useState<'all' | 'followup' | 'satisfaction' | 'readmission' | 'screening' | 'volume'>('all');

  const handleUpdatePatientFollowupStatus = (patientId: string, newStatus: 'green' | 'yellow' | 'red' | 'pending') => {
    const updatedPatients = patients.map(p => {
      if (p.nationalId === patientId) {
        return { ...p, followupStatus: newStatus };
      }
      return p;
    });
    savePatients(updatedPatients);
    if (viewingFollowupsPatient && viewingFollowupsPatient.nationalId === patientId) {
      setViewingFollowupsPatient({ ...viewingFollowupsPatient, followupStatus: newStatus });
    }
  };

  const handleStartEditPatient = (p: Patient) => {
    setEditingPatient(p);
    setEditPatientName(p.name);
    setEditPatientNationalId(p.nationalId);
    setEditUserCode(p.userCode || p.nationalId);
    setEditPassword(p.password || p.nationalId);
    setEditPatientFileNumber(p.fileNumber);
    setEditPatientAge(p.age.toString());
    setEditPatientPhone(p.phone);
    const diseaseName = diseases.find(d => d.id === p.diseaseId)?.name || '';
    setEditPatientDiseaseName(diseaseName);
    setEditPatientDeptId(p.departmentId);
    setEditFollowupStatus(p.followupStatus || 'green');
    setEditReadmissionRecentMonth(!!p.readmissionRecentMonth);
    setEditIsPregnant(!!p.isPregnant);
    setEditIsHighRiskMother(!!p.isHighRiskMother);
    setEditSpecialDisease(p.specialDisease || 'سایر بیماران');
    setEditGuidanceNotes(p.guidanceNotes || '');
    setEditHashtaggedDiseaseIds(p.hashtaggedDiseaseIds || []);
    setEditActiveChecklistIds(p.activeChecklistIds || []);
    setEditAdmissionDate(p.admissionDate || getPersianDateString(p.registeredAt ? new Date(p.registeredAt) : new Date()));
    setEditDiseaseSearch('');
    setEditChecklistSearch('');
    setPatientCrudError('');
    setCurrentScreen('admin_edit_patient');
  };

  const handleCancelEditPatient = () => {
    setEditingPatient(null);
    setCurrentScreen('admin_dashboard');
    setAdminTab('patients');
  };

  const handleUpdatePatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPatient) return;
    setPatientCrudError('');

    if (currentAdmin?.role !== 'super') {
      if (editingPatient.departmentId !== currentAdmin?.departmentId) {
        setPatientCrudError('شما مجاز به ویرایش اطلاعات بیماران سایر بخش‌ها نیستید.');
        return;
      }
    }

    if (!editPatientNationalId || !editPatientFileNumber || !editPatientName || !editPatientAge || !editPatientPhone || !editPatientDiseaseName || !editPatientDeptId) {
      setPatientCrudError('لطفاً تمامی فیلدها را تکمیل فرمایید.');
      return;
    }

    if (editPatientNationalId !== editingPatient.nationalId && patients.some(p => p.nationalId === editPatientNationalId)) {
      setPatientCrudError('پرونده بیمار دیگری با این کد ملی در سیستم وجود دارد. تخصیص کد ملی تکراری مجاز نیست.');
      return;
    }

    const targetDeptId = currentAdmin?.role === 'super' ? editPatientDeptId : currentAdmin?.departmentId;

    // Dynamic disease lookup or creation
    const normalizedTypedName = editPatientDiseaseName.trim();
    let matchedDisease = diseases.find(
      d => d.name.trim().toLowerCase() === normalizedTypedName.toLowerCase() && d.departmentId === targetDeptId
    );

    let finalDiseaseId = '';

    if (matchedDisease) {
      finalDiseaseId = matchedDisease.id;
    } else {
      const newDiseaseId = `disease_${Date.now()}`;
      const newDisease: Disease = {
        id: newDiseaseId,
        name: normalizedTypedName,
        englishName: normalizedTypedName,
        departmentId: targetDeptId,
        description: `دستورالعمل‌ها و مراقبت‌های خودمراقبتی پس از ترخیص برای بیماری ${normalizedTypedName}. رعایت دقیق مصرف داروها و پیگیری زمان مراجعه مجدد الزامی است.`,
        educationalContent: `مراقبت‌های خانگی بیماری ${normalizedTypedName} شامل استراحت، رژیم غذایی مناسب و پایش علائم هشدار دهنده است.`,
        triageGuide: {
          green: {
            symptoms: ['بهبود نسبی علائم عمومی', 'فشار خون و ضربان قلب در محدوده نرمال', 'امکان انجام فعالیت‌های سبک روزمره'],
            actions: ['ادامه درمان دارویی طبق نسخه ترخیص', 'پیگیری رژیم غذایی توصیه شده', 'مراجعه به پزشک معالج در زمان مقرر']
          },
          yellow: {
            symptoms: ['تب خفیف یا بی‌حالی مداوم', 'تغییر جزئی در علائم حیاتی', 'عدم تمایل کافی به غذا'],
            actions: ['استراحت بیشتر و افزایش مصرف مایعات', 'پایش دقیق علائم هر ۴ ساعت', 'تماس با بخش یا مراجعه به درمانگاه']
          },
          red: {
            symptoms: ['تنگی نفس شدید یا درد قفسه سینه', 'کاهش سطح هوشیاری یا سرگیجه شدید', 'خونریزی یا تب بالای ۳۹ درجه'],
            actions: ['مراجعه فوری به اورژانس بیمارستان', 'تماس با اورژانس ۱۱۵', 'همراه داشتن خلاصه پرونده ترخیص']
          }
        }
      };
      saveDiseases([newDisease, ...diseases]);
      finalDiseaseId = newDiseaseId;
    }

    const updatedPatients = patients.map(p => {
      if (p.nationalId === editingPatient.nationalId) {
        return {
          ...p,
          nationalId: editPatientNationalId,
          userCode: editUserCode.trim() || editPatientNationalId.trim(),
          password: editPassword.trim() || editPatientNationalId.trim(),
          fileNumber: editPatientFileNumber,
          name: editPatientName,
          age: parseInt(editPatientAge),
          phone: editPatientPhone,
          departmentId: targetDeptId,
          diseaseId: finalDiseaseId,
          readmissionRecentMonth: editReadmissionRecentMonth,
          isPregnant: editIsPregnant,
          isHighRiskMother: editIsPregnant ? editIsHighRiskMother : false,
          specialDisease: editSpecialDisease || 'سایر بیماران',
          followupStatus: editFollowupStatus || 'green',
          guidanceNotes: editGuidanceNotes,
          hashtaggedDiseaseIds: editHashtaggedDiseaseIds,
          activeChecklistIds: editActiveChecklistIds,
          admissionDate: editAdmissionDate,
          dischargeDate: editAdmissionDate || p.dischargeDate,
        };
      }
      return p;
    });

    savePatients(updatedPatients);
    setEditingPatient(null);
    setCurrentScreen('admin_dashboard');
    setAdminTab('patients');
  };

  const handleConfirmDeletePatient = () => {
    if (deletingPatientId) {
      const target = patients.find(p => p.nationalId === deletingPatientId);
      if (!target) return;
      if (currentAdmin?.role !== 'super' && target.departmentId !== currentAdmin?.departmentId) {
        alert('شما مجاز به حذف بیمار سایر بخش‌ها نیستید.');
        return;
      }
      const updated = patients.filter(p => p.nationalId !== deletingPatientId);
      savePatients(updated);
      setDeletingPatientId(null);
    }
  };

  // Admin Manage users state
  const [newAdminUser, setNewAdminUser] = useState('');
  const [newAdminPass, setNewAdminPass] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminDept, setNewAdminDept] = useState('');
  const [adminManageMsg, setAdminManageMsg] = useState('');

  const handleCreateOrUpdateAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminManageMsg('');

    if (!newAdminUser || !newAdminName || !newAdminDept) {
      setAdminManageMsg('لطفاً تمامی فیلدهای فرم ادمین را تکمیل کنید.');
      return;
    }

    if (editingAdminUsername) {
      // Update Mode
      const updated = admins.map(a => {
        if (a.username === editingAdminUsername) {
          return {
            ...a,
            username: newAdminUser,
            name: newAdminName,
            passwordHash: newAdminPass ? newAdminPass : a.passwordHash,
            departmentId: newAdminDept
          };
        }
        return a;
      });
      saveAdmins(updated);
      setAdminManageMsg(`اطلاعات مسئول بخش (${newAdminName}) با موفقیت بروزرسانی شد.`);
      setEditingAdminUsername(null);
    } else {
      // Create Mode
      if (!newAdminPass) {
        setAdminManageMsg('لطفاً کلمه عبور را وارد کنید.');
        return;
      }
      if (admins.some(a => a.username === newAdminUser)) {
        setAdminManageMsg('این نام کاربری از قبل در سیستم تعریف شده است.');
        return;
      }

      const created: AdminUser = {
        username: newAdminUser,
        name: newAdminName,
        passwordHash: newAdminPass,
        role: 'department',
        departmentId: newAdminDept
      };

      saveAdmins([...admins, created]);
      setAdminManageMsg(`مسئول جدید بخش (${newAdminName}) با موفقیت معرفی شد.`);
    }

    setNewAdminUser('');
    setNewAdminPass('');
    setNewAdminName('');
    setNewAdminDept('');
  };

  const handleDeleteAdmin = (username: string) => {
    if (username === currentAdmin?.username) {
      setAdminManageMsg('شما نمی‌توانید حساب کاربری فعال خودتان را حذف کنید.');
      return;
    }
    if (window.confirm('آیا از حذف این مسئول بخش اطمینان دارید؟')) {
      const updated = admins.filter(a => a.username !== username);
      saveAdmins(updated);
      setAdminManageMsg('مسئول بخش مورد نظر با موفقیت حذف شد.');
      if (editingAdminUsername === username) {
        setEditingAdminUsername(null);
        setNewAdminUser('');
        setNewAdminPass('');
        setNewAdminName('');
        setNewAdminDept('');
      }
    }
  };

  const handleStartEditAdmin = (admin: AdminUser) => {
    setEditingAdminUsername(admin.username);
    setNewAdminUser(admin.username);
    setNewAdminName(admin.name);
    setNewAdminDept(admin.departmentId || '');
    setNewAdminPass('');
  };

  // Disease Edit State
  const [editDiseaseId, setEditDiseaseId] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editEducational, setEditEducational] = useState('');
  const [diseaseEditSuccess, setDiseaseEditSuccess] = useState('');

  useEffect(() => {
    if (editDiseaseId) {
      const d = diseases.find(dis => dis.id === editDiseaseId);
      if (d) {
        setEditDescription(d.description);
        setEditEducational(d.educationalContent);
      }
    }
  }, [editDiseaseId, diseases]);

  const handleCreateDisease = (e: React.FormEvent) => {
    e.preventDefault();
    setDiseaseEditSuccess('');
    if (!newDiseaseName || !newDiseaseDeptId || !editDescription || !editEducational) {
      setDiseaseEditSuccess('خطا: لطفا تمامی فیلدها را پر کنید.');
      return;
    }
    const newId = 'dis_' + Date.now();
    const newDisease: Disease = {
      id: newId,
      name: newDiseaseName,
      englishName: newDiseaseEnglishName || newDiseaseName,
      departmentId: newDiseaseDeptId,
      description: editDescription,
      educationalContent: editEducational,
      triageGuide: {
        green: {
          symptoms: ['علائم عمومی مساعد', 'تنفس راحت و بدون تنگی نفس'],
          actions: ['مصرف منظم داروهای تجویزشده', 'کنترل دوره ای علائم حیاتی']
        },
        yellow: {
          symptoms: ['تب خفیف یا لرزش خفیف', 'ضعف یا بی حالی غیر عادی'],
          actions: ['تماس با واحد پیگیری بیمارستان جهت راهنمایی', 'استراحت بیشتر و کنترل دما']
        },
        red: {
          symptoms: ['تنگی نفس شدید', 'درد شدید قفسه سینه', 'خونریزی غیرعادی'],
          actions: ['تماس فوری با اورژانس ۱۱۵', 'مراجعه سریع به اورژانس بیمارستان']
        }
      }
    };
    const updated = [...diseases, newDisease];
    saveDiseases(updated);
    setDiseaseEditSuccess(`بیماری "${newDiseaseName}" با موفقیت اضافه شد.`);
    setIsCreatingDisease(false);
    setNewDiseaseName('');
    setNewDiseaseEnglishName('');
    setNewDiseaseDeptId('');
    setEditDescription('');
    setEditEducational('');
  };

  const handleDeleteDisease = (id: string) => {
    if (window.confirm('آیا از حذف این بیماری اطمینان دارید؟')) {
      const updated = diseases.filter(d => d.id !== id);
      saveDiseases(updated);
      setDiseaseEditSuccess('بیماری مورد نظر با موفقیت حذف شد.');
      if (editDiseaseId === id) {
        setEditDiseaseId('');
        setEditDescription('');
        setEditEducational('');
      }
    }
  };

  const handleSaveDiseaseEdit = (e: React.FormEvent) => {
    e.preventDefault();
    setDiseaseEditSuccess('');

    if (!editDiseaseId) return;

    const updated = diseases.map(d => {
      if (d.id === editDiseaseId) {
        return {
          ...d,
          description: editDescription,
          educationalContent: editEducational
        };
      }
      return d;
    });

    saveDiseases(updated);
    setDiseaseEditSuccess('توضیحات و آموزش‌های بیماری با موفقیت بروزرسانی شد.');
  };

  const handleSumbitSurvey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const riskFactors: string[] = [];
    if (surveyFamilyHistory) riskFactors.push('سابقه خانوادگی ریسک قلبی عروقی/سرطان');
    if (!surveyDietAdherence) riskFactors.push('عدم انطباق با رژیم غذایی توصیه‌شده');
    if (!surveyMedAdherence) riskFactors.push('مشکل در مصرف منظم و دقیق داروها');
    if (surveyWoundPain) riskFactors.push('علائم التهاب، درد فزاینده یا عفونت موضعی زخم');

    const updatedPatients = patients.map(p => {
      if (p.nationalId === currentUser.nationalId) {
        return {
          ...p,
          satisfactionRate: surveySatisfaction,
          surveySubmitted: true,
          surveyHospitalizationSatisfaction: surveySatisfaction,
          surveyScreeningRiskFactors: riskFactors,
          surveyScreeningReferralNeeded: surveyFamilyHistory || surveyWoundPain,
          surveyCompletedAt: new Date().toISOString()
        };
      }
      return p;
    });

    savePatients(updatedPatients);

    // Update current user context
    setCurrentUser({
      ...currentUser,
      satisfactionRate: surveySatisfaction,
      surveySubmitted: true,
      surveyHospitalizationSatisfaction: surveySatisfaction,
      surveyScreeningRiskFactors: riskFactors,
      surveyScreeningReferralNeeded: surveyFamilyHistory || surveyWoundPain,
      surveyCompletedAt: new Date().toISOString()
    });

    setSurveySuccess(true);
    setTimeout(() => {
      setSurveySuccess(false);
      setShowSurveyModal(false);
    }, 3000);
  };

  // Answer Questions State
  const [replyTextMap, setReplyTextMap] = useState<{[key: string]: string}>({});
  const handleAnswerQuestion = (messageId: string) => {
    const text = replyTextMap[messageId];
    if (!text) return;

    const attachedFile = replyFileMap[messageId];

    const updated = messages.map(m => {
      if (m.id === messageId) {
        return {
          ...m,
          answer: text,
          answeredAt: new Date().toISOString(),
          answeredBy: currentAdmin?.name || 'کادر مدیریت بیمارستان',
          adminFileName: attachedFile?.name || undefined,
          adminFileUrl: attachedFile?.url || undefined
        };
      }
      return m;
    });

    saveMessages(updated);
    setReplyTextMap({
      ...replyTextMap,
      [messageId]: ''
    });

    // Clear file entry
    const updatedFileMap = { ...replyFileMap };
    delete updatedFileMap[messageId];
    setReplyFileMap(updatedFileMap);
  };

  // --- Patient Logic ---
  const [patientTab, setPatientTab] = useState<'grid' | 'education' | 'qa' | 'satisfaction'>('grid');

  // Patient symptoms checkboxes (Dynamic per disease checklists)
  const [patientAnswers, setPatientAnswers] = useState<{[key: string]: boolean}>({});
  const [patientSatisfaction, setPatientSatisfaction] = useState<number>(5);
  const [patientReadmission, setPatientReadmission] = useState<boolean>(false);
  const [patientEmergencyVisit, setPatientEmergencyVisit] = useState<boolean>(false);
  const [evaluationResult, setEvaluationResult] = useState<{
    status: 'green' | 'yellow' | 'red';
    title: string;
    description: string;
    actions: string[];
  } | null>(null);

  // Satisfaction survey form state
  const [satisfactionSurveyForm, setSatisfactionSurveyForm] = useState<Record<string, string>>({});
  const [surveySuccessMsg, setSurveySuccessMsg] = useState('');
  const [surveyErrorMsg, setSurveyErrorMsg] = useState('');

  // Reset checkboxes on patient dashboard entry
  useEffect(() => {
    setPatientAnswers({});
    setEvaluationResult(null);
    setSurveySuccessMsg('');
    setSurveyErrorMsg('');
    if (currentUser && currentUser.satisfactionSurvey) {
      setSatisfactionSurveyForm({
        ...currentUser.satisfactionSurvey
      });
    } else {
      const initialForm: Record<string, string> = { q18: '', q19: '', q20: '' };
      hospitalSurveyQuestions.forEach(q => {
        initialForm[q.id] = '';
      });
      setSatisfactionSurveyForm(initialForm);
    }
  }, [currentUser, hospitalSurveyQuestions]);

  // Scroll to top of the page on screen, sub-tab, or checklist transitions
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentScreen, patientTab, adminTab, feedbackView, activeFillingChecklist, selectedDept, selectedDisease]);

  // Submit patient checkup form
  const handlePatientSelfEvaluation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const userDisease = diseases.find(d => d.id === currentUser.diseaseId);
    if (!userDisease) return;

    // We check how many selected symptoms are red, yellow or green.
    // To make it extremely elegant, we map checkboxes to specific conditions:
    // We'll present the user with standard symptom checkboxes:
    // 1. علائم اورژانسی شدید (تنگی نفس شدید، درد شدید قفسه سینه، تب بالای ۳۸، تاری دید، تشنج، خونریزی شدید)
    // 2. علائم هشدار متوسط (تب خفیف، ورم متوسط پاها، تنگی نفس خفیف، نوسان قند یا فشار خون، سوزش زخم)
    // 3. علائم عمومی و خودمراقبتی (مصرف منظم داروها، رعایت رژیم غذایی، پوزیشن‌دهی مناسب)

    let computedStatus: 'green' | 'yellow' | 'red' = 'green';

    if (patientAnswers['red_1'] || patientAnswers['red_2'] || patientAnswers['red_3']) {
      computedStatus = 'red';
    } else if (patientAnswers['yellow_1'] || patientAnswers['yellow_2'] || patientAnswers['yellow_3']) {
      computedStatus = 'yellow';
    }

    // Update patient record in state
    const updatedPatients = patients.map(p => {
      if (p.nationalId === currentUser.nationalId) {
        return {
          ...p,
          followupStatus: computedStatus,
          satisfactionRate: patientSatisfaction,
          readmitted: patientReadmission,
          unplannedEmergencyVisit: patientEmergencyVisit
        };
      }
      return p;
    });

    savePatients(updatedPatients);

    // Update currentUser context too so changes are local
    setCurrentUser({
      ...currentUser,
      followupStatus: computedStatus,
      satisfactionRate: patientSatisfaction,
      readmitted: patientReadmission,
      unplannedEmergencyVisit: patientEmergencyVisit
    });

    const guide = userDisease.triageGuide[computedStatus];
    setEvaluationResult({
      status: computedStatus,
      title: computedStatus === 'red' ? 'منطقه قرمز (اورژانس فوری!)' : computedStatus === 'yellow' ? 'منطقه زرد (هشدار و تماس با کادر درمان)' : 'منطقه سبز (وضعیت ایمن و پایدار)',
      description: computedStatus === 'red'
        ? 'بیمار عزیز، علائم شما بسیار جدی و بحرانی است. لطفاً اقدامات زیر را فوراً انجام دهید.'
        : computedStatus === 'yellow'
        ? 'علائم شما در محدوده هشدار قرار دارد. برای جلوگیری از عوارض جدی‌تر اقدامات توصیه‌شده را دنبال کنید.'
        : 'خوشبختانه وضعیت درمانی شما پایدار، کنترل‌شده و ایمن است. به رعایت آموزش‌های خود‌مراقبتی ادامه دهید.',
      actions: guide.actions
    });
  };

  const handleSatisfactionSurveySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const ratingKeys = [...hospitalSurveyQuestions.map(q => q.id), 'q18'];
    const unanswered = ratingKeys.filter(k => !satisfactionSurveyForm[k]);
    if (unanswered.length > 0) {
      setSurveyErrorMsg('لطفاً به تمامی سوالات گزینه‌ای پاسخ دهید.');
      return;
    }

    setSurveyErrorMsg('');
    const newSurvey = {
      ...satisfactionSurveyForm,
      submittedAt: new Date().toISOString()
    };

    const updatedPatients = patients.map(p => {
      if (p.nationalId === currentUser.nationalId) {
        return {
          ...p,
          satisfactionSurvey: newSurvey
        };
      }
      return p;
    });

    savePatients(updatedPatients);
    setCurrentUser({
      ...currentUser,
      satisfactionSurvey: newSurvey
    });
    setSurveySuccessMsg('ارزیابی رضایت‌مندی شما با موفقیت ثبت شد. از همکاری شما سپاسگزاریم.');
    setShowSurveySuccessNotification(true);
    setPatientTab('grid');
  };

  // Submit patient question
  const [newQuestionText, setNewQuestionText] = useState('');
  const [questionSubmitSuccess, setQuestionSubmitSuccess] = useState(false);
  const [newQuestionFileName, setNewQuestionFileName] = useState('');
  const [newQuestionFileUrl, setNewQuestionFileUrl] = useState('');

  const handlePatientFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setNewQuestionFileName(file.name);
    const dataUrl = await readFileAsDataUrl(file);
    setNewQuestionFileUrl(dataUrl);
  };

  const handleAskQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newQuestionText.trim()) return;

    const newMsg: Message = {
      id: 'msg_' + Date.now(),
      patientId: currentUser.nationalId,
      patientName: currentUser.name,
      departmentId: currentUser.departmentId,
      question: newQuestionText,
      askedAt: new Date().toISOString(),
      patientFileName: newQuestionFileName || undefined,
      patientFileUrl: newQuestionFileUrl || undefined
    };

    saveMessages([newMsg, ...messages]);
    setNewQuestionText('');
    setNewQuestionFileName('');
    setNewQuestionFileUrl('');
    setQuestionSubmitSuccess(true);
    setTimeout(() => setQuestionSubmitSuccess(false), 4000);
  };

  // --- Checklist Management Handlers ---
  const handleEditChecklistInit = (chk: CustomChecklist | 'new') => {
    if (chk === 'new') {
      const defaultTarget = selectedChecklistCategory || 'satisfaction';
      setEditingChecklist({
        id: 'new_checklist_' + Date.now(),
        title: '',
        targetType: defaultTarget,
        questions: [],
        createdAt: new Date().toISOString()
      });
      setChecklistFormTitle('');
      setChecklistFormTargetType(defaultTarget);
      setChecklistFormDeptId(departments[0]?.id || 'emergency');
      setChecklistFormQuestions([]);
    } else {
      setEditingChecklist(chk);
      setChecklistFormTitle(chk.title);
      setChecklistFormTargetType(chk.targetType);
      setChecklistFormDeptId(chk.departmentId || departments[0]?.id || 'emergency');
      setChecklistFormQuestions(chk.questions);
    }
    setNewQText('');
    setNewQType('qualitative');
    setNewQOptions('');
  };

  const handleAddQuestionToForm = () => {
    if (!newQText.trim()) return;
    const opts = newQOptions.trim() ? newQOptions.split(',').map(o => o.trim()).filter(Boolean) : undefined;
    const newQuestion: CustomChecklistQuestion = {
      id: 'q_' + Date.now(),
      text: newQText.trim(),
      type: newQType,
      options: opts
    };
    setChecklistFormQuestions([...checklistFormQuestions, newQuestion]);
    setNewQText('');
    setNewQOptions('');
  };

  const handleRemoveQuestionFromForm = (qId: string) => {
    setChecklistFormQuestions(checklistFormQuestions.filter(q => q.id !== qId));
  };

  const handleSaveChecklist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChecklist || !checklistFormTitle.trim()) return;

    const savedChecklist: CustomChecklist = {
      ...editingChecklist,
      title: checklistFormTitle.trim(),
      targetType: checklistFormTargetType,
      departmentId: checklistFormTargetType === 'satisfaction' ? checklistFormDeptId : undefined,
      questions: checklistFormQuestions,
      createdAt: editingChecklist.createdAt || new Date().toISOString()
    };

    let updatedChecklists: CustomChecklist[];
    const exists = customChecklists.some(c => c.id === editingChecklist.id);
    if (exists) {
      updatedChecklists = customChecklists.map(c => c.id === editingChecklist.id ? savedChecklist : c);
    } else {
      updatedChecklists = [...customChecklists, savedChecklist];
    }

    saveCustomChecklists(updatedChecklists);
    setEditingChecklist(null);
  };

  const handleDeleteChecklist = (chkId: string) => {
    setDeletingChecklistId(chkId);
  };

  const handleConfirmDeleteChecklist = () => {
    if (deletingChecklistId) {
      const updated = customChecklists.filter(c => c.id !== deletingChecklistId);
      saveCustomChecklists(updated);
      setDeletingChecklistId(null);
    }
  };

  // Doctor Reply File Attachment State
  const [replyFileMap, setReplyFileMap] = useState<{[key: string]: {name: string, url: string}}>({});

  const handleDoctorFileChange = async (e: React.ChangeEvent<HTMLInputElement>, messageId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const dataUrl = await readFileAsDataUrl(file);
    setReplyFileMap({
      ...replyFileMap,
      [messageId]: { name: file.name, url: dataUrl }
    });
  };

  // --- Premium Chat Handlers ---
  const handleChatFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const dataUrl = await readFileAsDataUrl(file);
    setChatInputFile({
      name: file.name,
      url: dataUrl
    });
  };

  const handleChatEditFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const dataUrl = await readFileAsDataUrl(file);
    setEditingMsgFile({
      name: file.name,
      url: dataUrl
    });
  };

  const handleSendChatMessage = () => {
    if (!activeChatPatientId || !chatInputText.trim()) return;

    // Get messages for this patient in this department
    const patientMsgs = messages.filter(
      m => m.patientId === activeChatPatientId &&
      (currentAdmin?.role === 'super' ? true : m.departmentId === currentAdmin?.departmentId)
    );

    // Find first unanswered message
    const unansweredMsg = patientMsgs.find(m => !m.answer);

    if (unansweredMsg) {
      // Answer the unanswered question
      const updated = messages.map(m => {
        if (m.id === unansweredMsg.id) {
          return {
            ...m,
            answer: chatInputText,
            answeredAt: new Date().toISOString(),
            answeredBy: currentAdmin?.name || 'کادر درمان',
            adminFileName: chatInputFile?.name || undefined,
            adminFileUrl: chatInputFile?.url || undefined
          };
        }
        return m;
      });
      saveMessages(updated);
    } else {
      // Create a brand-new follow-up note
      const sampleMsg = patientMsgs[0];
      const deptId = sampleMsg?.departmentId || currentAdmin?.departmentId || 'emergency';
      const patientName = sampleMsg?.patientName || 'بیمار پیگیری';

      const newFollowup: Message = {
        id: 'msg_' + Date.now(),
        patientId: activeChatPatientId,
        patientName: patientName,
        departmentId: deptId,
        question: 'پیگیری روند درمان توسط پزشک',
        askedAt: new Date().toISOString(),
        answer: chatInputText,
        answeredAt: new Date().toISOString(),
        answeredBy: currentAdmin?.name || 'کادر درمان',
        adminFileName: chatInputFile?.name || undefined,
        adminFileUrl: chatInputFile?.url || undefined
      };
      saveMessages([newFollowup, ...messages]);
    }

    setChatInputText('');
    setChatInputFile(null);
  };

  const handleSaveEditedMessage = (messageId: string) => {
    if (!editingMsgText.trim()) return;

    const updated = messages.map(m => {
      if (m.id === messageId) {
        return {
          ...m,
          answer: editingMsgText,
          adminFileName: editingMsgFile?.name || m.adminFileName,
          adminFileUrl: editingMsgFile?.url || m.adminFileUrl
        };
      }
      return m;
    });

    saveMessages(updated);
    setEditingMsgId(null);
    setEditingMsgText('');
    setEditingMsgFile(null);
  };

  // --- Helper to calculate indicators for any subset of patients ---
  const computeStatsForPatientList = (patientList: Patient[]) => {
    const completedSurvey = patientList.filter(p => p.satisfactionSurvey !== undefined && p.satisfactionSurvey !== null);
    const totalCount = patientList.length;
    const evaluatedCount = completedSurvey.length;

    // 1. Follow-up rate
    const followupRate = totalCount > 0 ? Math.round((evaluatedCount / totalCount) * 100) : 0;

    // 2. Satisfaction rate
    const satisfiedCount = completedSurvey.filter(p => p.satisfactionSurvey && (p.satisfactionSurvey.q18 === 'excellent' || p.satisfactionSurvey.q18 === 'good')).length;
    const satisfactionRate = evaluatedCount > 0 ? Math.round((satisfiedCount / evaluatedCount) * 100) : 0;

    // 3. Readmission rate
    const readmittedCount = patientList.filter(p => p.readmissionRecentMonth === true).length;
    const readmissionRate = totalCount > 0 ? Math.round((readmittedCount / totalCount) * 100) : 0;

    // 4. Screening & special follow-up rate for pregnant & high-risk mothers
    const totalPregnantCount = patientList.filter(p => p.isPregnant === true).length;
    const highRiskPregnantCount = patientList.filter(p => p.isPregnant === true && p.isHighRiskMother === true).length;
    const obGynPatients = patientList.filter(p => p.departmentId === 'ob_gyn_surgery' || p.departmentId === 'labor_block' || p.isPregnant === true);
    const obGynEvaluated = obGynPatients.filter(p => p.satisfactionSurvey !== undefined && p.satisfactionSurvey !== null);
    const obGynReferrals = obGynPatients.filter(p => p.followupStatus === 'yellow' || p.followupStatus === 'red').length;

    const screeningRate = totalPregnantCount > 0
      ? Math.round((highRiskPregnantCount / totalPregnantCount) * 100)
      : (obGynEvaluated.length > 0 ? Math.round((obGynReferrals / obGynEvaluated.length) * 100) : 0);

    return {
      totalCount,
      evaluatedCount,
      followupRate,
      satisfactionRate,
      readmissionRate,
      screeningRate,
      totalPregnantCount,
      highRiskPregnantCount,
      readmittedCount,
      cancerScreeningReferrals: obGynReferrals
    };
  };

  // --- Helper to resolve a patient's Persian year ('1402', '1403', '1404', etc.) ---
  const getPatientYear = (p: Patient): string => {
    const rawDate = p.admissionDate || p.dischargeDate || p.registeredAt || '';
    if (!rawDate) return '1404';

    const dateStr = rawDate
      .replace(/[۰-۹]/g, d => String.fromCharCode(d.charCodeAt(0) - 1776))
      .replace(/[٠-٩]/g, d => String.fromCharCode(d.charCodeAt(0) - 1632))
      .trim();

    const parts = dateStr.split(/[\/\-\s]/).filter(Boolean);
    if (parts.length >= 1) {
      const p0 = parseInt(parts[0], 10);
      if (!isNaN(p0) && p0 >= 1300 && p0 <= 1500) {
        return String(p0);
      } else if (!isNaN(p0) && p0 >= 1900 && p0 <= 2100) {
        try {
          const d = new Date(dateStr);
          if (!isNaN(d.getTime())) {
            const faDate = d.toLocaleDateString('fa-IR-u-nu-latn');
            const faParts = faDate.split('/');
            if (faParts.length >= 1) {
              const faYear = parseInt(faParts[0], 10);
              if (!isNaN(faYear) && faYear >= 1300 && faYear <= 1500) {
                return String(faYear);
              }
            }
          }
        } catch {
          // ignore
        }
      }
    }
    return '1404';
  };

  // --- Helper to resolve a patient's month ID ('01' to '12') ---
  const getPatientMonthId = (p: Patient): string => {
    const rawDate = p.admissionDate || p.dischargeDate || p.registeredAt || '';
    if (!rawDate) return '01';

    // Convert Persian / Arabic digits to English digits
    const dateStr = rawDate
      .replace(/[۰-۹]/g, d => String.fromCharCode(d.charCodeAt(0) - 1776))
      .replace(/[٠-٩]/g, d => String.fromCharCode(d.charCodeAt(0) - 1632))
      .trim();

    // Check if string contains Persian month name directly
    for (const m of PERSIAN_MONTHS) {
      if (m.id !== 'all' && dateStr.includes(m.name)) {
        return m.id;
      }
    }

    // Split by / or - or space
    const parts = dateStr.split(/[\/\-\s]/).filter(Boolean);
    if (parts.length >= 2) {
      const p0 = parseInt(parts[0], 10);
      const p1 = parseInt(parts[1], 10);

      // Standard Jalali format YYYY/MM/DD (e.g. 1404/05/15)
      if (!isNaN(p0) && p0 >= 1300 && p0 <= 1500) {
        if (!isNaN(p1) && p1 >= 1 && p1 <= 12) {
          return String(p1).padStart(2, '0');
        }
      } else if (!isNaN(p0) && p0 >= 1900 && p0 <= 2100) {
        // ISO Gregorian format YYYY-MM-DD -> Convert to Jalali to get accurate Shamsi month
        try {
          const d = new Date(dateStr);
          if (!isNaN(d.getTime())) {
            const faDate = d.toLocaleDateString('fa-IR-u-nu-latn');
            const faParts = faDate.split('/');
            if (faParts.length >= 2) {
              const faMonth = parseInt(faParts[1], 10);
              if (!isNaN(faMonth) && faMonth >= 1 && faMonth <= 12) {
                return String(faMonth).padStart(2, '0');
              }
            }
          }
        } catch {
          // ignore
        }
      } else {
        // Fallback where p1 is month 1..12
        if (!isNaN(p1) && p1 >= 1 && p1 <= 12) {
          return String(p1).padStart(2, '0');
        }
      }
    }

    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        const faDate = d.toLocaleDateString('fa-IR-u-nu-latn');
        const faParts = faDate.split('/');
        if (faParts.length >= 2) {
          const faMonth = parseInt(faParts[1], 10);
          if (!isNaN(faMonth) && faMonth >= 1 && faMonth <= 12) {
            return String(faMonth).padStart(2, '0');
          }
        }
      }
    } catch {
      // ignore
    }

    return '01';
  };

  // Dynamic list of available stats years from patient data without any hypothetical years
  const availableStatsYears = useMemo(() => {
    const yearSet = new Set<string>();
    yearSet.add('1404'); // default active year
    patients.forEach(p => {
      const y = getPatientYear(p);
      if (y && y.trim() && y.length === 4) {
        yearSet.add(y.trim());
      }
    });
    return Array.from(yearSet).sort().reverse();
  }, [patients]);

  // Automatically switch to new year when data from a newer year appears
  useEffect(() => {
    if (availableStatsYears.length > 0) {
      const latestYear = availableStatsYears[0];
      if (latestYear > selectedStatsYear && !localStorage.getItem('user_picked_stats_year')) {
        setSelectedStatsYear(latestYear);
      }
    }
  }, [availableStatsYears, selectedStatsYear]);

  // --- Statistics & Indicators Calculations (Appendix 21) ---
  const getStatistics = (targetYear: string = selectedStatsYear) => {
    // Filter patients by department role
    const deptPatients = currentAdmin && currentAdmin.role !== 'super'
      ? patients.filter(p => p.departmentId === currentAdmin.departmentId)
      : patients;

    // Filter patients by computational year so each year has its own indicators and resets automatically
    const activePatients = deptPatients.filter(p => getPatientYear(p) === targetYear);

    // Monthly patient counts
    const monthCounts: Record<string, number> = { all: activePatients.length };
    PERSIAN_MONTHS.forEach(m => {
      if (m.id !== 'all') monthCounts[m.id] = 0;
    });
    activePatients.forEach(p => {
      const mId = getPatientMonthId(p);
      if (monthCounts[mId] !== undefined) {
        monthCounts[mId]++;
      }
    });

    // Filter patients by selected month
    const filteredPatients = selectedStatsMonth === 'all'
      ? activePatients
      : activePatients.filter(p => getPatientMonthId(p) === selectedStatsMonth);

    const mainStats = computeStatsForPatientList(filteredPatients);

    // Triage counts for current selection
    const redCount = filteredPatients.filter(p => p.followupStatus === 'red').length;
    const yellowCount = filteredPatients.filter(p => p.followupStatus === 'yellow').length;
    const greenCount = filteredPatients.filter(p => p.followupStatus === 'green' || (!p.followupStatus && p.followupStatus !== 'pending')).length;
    const pendingCount = filteredPatients.filter(p => p.followupStatus === 'pending').length;

    const triageCounts = {
      red: redCount,
      yellow: yellowCount,
      green: greenCount,
      pending: pendingCount
    };

    // Monthly triage breakdown for all 12 Persian months
    const monthlyTriageSeries = PERSIAN_MONTHS.filter(m => m.id !== 'all').map(m => {
      const mPatients = activePatients.filter(p => getPatientMonthId(p) === m.id);
      return {
        monthId: m.id,
        monthName: m.name,
        redCount: mPatients.filter(p => p.followupStatus === 'red').length,
        yellowCount: mPatients.filter(p => p.followupStatus === 'yellow').length,
        greenCount: mPatients.filter(p => p.followupStatus === 'green' || (!p.followupStatus && p.followupStatus !== 'pending')).length,
        pendingCount: mPatients.filter(p => p.followupStatus === 'pending').length,
        totalCount: mPatients.length
      };
    });

    // Department triage breakdown for current selection
    const departmentTriageSeries = departments.map(dept => {
      const dPatients = filteredPatients.filter(p => p.departmentId === dept.id);
      return {
        departmentId: dept.id,
        departmentName: dept.name,
        redCount: dPatients.filter(p => p.followupStatus === 'red').length,
        yellowCount: dPatients.filter(p => p.followupStatus === 'yellow').length,
        greenCount: dPatients.filter(p => p.followupStatus === 'green' || (!p.followupStatus && p.followupStatus !== 'pending')).length,
        pendingCount: dPatients.filter(p => p.followupStatus === 'pending').length,
        totalCount: dPatients.length
      };
    });

    // Tally of patients by Special Disease with monthly breakdown
    const specialDiseaseCounts = SPECIAL_DISEASES.map(diseaseName => {
      const diseasePatients = activePatients.filter(p => (p.specialDisease || 'سایر بیماران') === diseaseName);
      const count = diseasePatients.length;
      const readmissionCount = diseasePatients.filter(p => p.readmissionRecentMonth === true).length;

      const monthlyCounts: Record<string, number> = {};
      const monthlyReadmissionCounts: Record<string, number> = {};
      PERSIAN_MONTHS.forEach(m => {
        if (m.id !== 'all') {
          monthlyCounts[m.id] = 0;
          monthlyReadmissionCounts[m.id] = 0;
        }
      });

      diseasePatients.forEach(p => {
        const mId = getPatientMonthId(p);
        if (monthlyCounts[mId] !== undefined) {
          monthlyCounts[mId]++;
          if (p.readmissionRecentMonth) {
            monthlyReadmissionCounts[mId]++;
          }
        }
      });

      return {
        diseaseName,
        count,
        readmissionCount,
        monthlyCounts,
        monthlyReadmissionCounts
      };
    });

    // Compute monthly indicators series for all 12 Persian months (for stepped charts)
    const monthlyIndicatorsSeries = PERSIAN_MONTHS.filter(m => m.id !== 'all').map(m => {
      const mPatients = activePatients.filter(p => getPatientMonthId(p) === m.id);
      const mStats = computeStatsForPatientList(mPatients);
      return {
        monthId: m.id,
        monthName: m.name,
        shortName: m.shortName,
        totalCount: mStats.totalCount,
        evaluatedCount: mStats.evaluatedCount,
        followupRate: mStats.followupRate,
        satisfactionRate: mStats.satisfactionRate, // Question 18
        readmissionRate: mStats.readmissionRate,
        screeningRate: mStats.screeningRate,
        readmittedCount: mStats.readmittedCount,
      };
    });

    // Compute department indicators breakdown for current month/filter
    const departmentIndicatorsSeries = departments.map(dept => {
      const dPatients = filteredPatients.filter(p => p.departmentId === dept.id);
      const dStats = computeStatsForPatientList(dPatients);
      return {
        departmentId: dept.id,
        departmentName: dept.name,
        totalCount: dStats.totalCount,
        evaluatedCount: dStats.evaluatedCount,
        followupRate: dStats.followupRate,
        satisfactionRate: dStats.satisfactionRate,
        readmissionRate: dStats.readmissionRate,
        screeningRate: dStats.screeningRate,
        readmittedCount: dStats.readmittedCount,
      };
    });

    return {
      ...mainStats,
      monthCounts,
      specialDiseaseCounts,
      monthlyIndicatorsSeries,
      departmentIndicatorsSeries,
      triageCounts,
      monthlyTriageSeries,
      departmentTriageSeries,
      totalActivePatientsCount: activePatients.length
    };
  };

  const stats = getStatistics(selectedStatsYear);

  // Handle Admin Logins
  const handleAdminLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoginError('');

    if (!adminUsername || !adminPassword) {
      setAdminLoginError('نام کاربری و رمز عبور را وارد نمایید.');
      return;
    }

    const matchedAdmin = admins.find(
      a => a.username === adminUsername && a.passwordHash === adminPassword
    );

    if (matchedAdmin) {
      setCurrentAdmin(matchedAdmin);
      setShowAdminLoginModal(false);

      // Auto assign suitable first tab
      setAdminTab('overview');
      if (matchedAdmin.role !== 'super') {
        setSelectedDeptFilterId(matchedAdmin.departmentId);
      } else {
        setSelectedDeptFilterId(null);
      }

      setCurrentScreen('admin_dashboard');
      // clear inputs
      setAdminUsername('');
      setAdminPassword('');
    } else {
      setAdminLoginError('نام کاربری یا کلمه عبور وارد شده صحیح نمی‌باشد.');
    }
  };

  // Patient Login logic
  const [patientLoginUserCode, setPatientLoginUserCode] = useState('');
  const [patientLoginPassword, setPatientLoginPassword] = useState('');
  const [patientLoginDept, setPatientLoginDept] = useState('');
  const [patientLoginAdmissionDate, setPatientLoginAdmissionDate] = useState('');
  const [patientLoginError, setPatientLoginError] = useState('');

  const handlePatientLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPatientLoginError('');

    if (!patientLoginUserCode.trim() || !patientLoginPassword.trim() || !patientLoginDept || !patientLoginAdmissionDate) {
      setPatientLoginError('لطفاً تمامی موارد (کد کاربری، رمز ورود، بخش بستری و تاریخ بستری) را وارد فرمایید.');
      return;
    }

    const uCode = patientLoginUserCode.trim();
    const uPass = patientLoginPassword.trim();
    const admDate = patientLoginAdmissionDate.trim();

    // Check if patient exists with this user code, password, department, and admissionDate
    const matchedPatient = patients.find(p => {
      const rawAdmission = p.admissionDate || getPersianDateString(new Date(p.registeredAt || Date.now()));
      const pAdmission = formatPaddedJalaliDate(rawAdmission);

      const pUserCode = (p.userCode || p.nationalId || '').trim();
      const pUserPass = (p.password || p.nationalId || '').trim();

      const codeMatches = pUserCode === uCode || (p.nationalId && p.nationalId.trim() === uCode) || (p.fileNumber && p.fileNumber.trim() === uCode);
      const passMatches = pUserPass === uPass || (p.nationalId && p.nationalId.trim() === uPass) || (p.fileNumber && p.fileNumber.trim() === uPass);
      const deptMatches = p.departmentId === patientLoginDept;
      const dateMatches = pAdmission.trim() === admDate || rawAdmission.trim() === admDate;

      return codeMatches && passMatches && deptMatches && dateMatches;
    });

    if (matchedPatient) {
      setCurrentUser(matchedPatient);
      setPatientTab('grid');
      setCurrentScreen('patient_dashboard');
      setPatientLoginUserCode('');
      setPatientLoginPassword('');
      setPatientLoginDept('');
      setPatientLoginAdmissionDate('');
    } else {
      setPatientLoginError('پرونده ترخیصی با این اطلاعات ورود یافت نشد. لطفاً کد کاربری، رمز ورود، بخش و تاریخ بستری را مجدداً بررسی فرمایید.');
    }
  };

  return (
    <div className="min-h-screen bg-transparent flex flex-col justify-between selection:bg-sky-500 selection:text-white relative overflow-hidden" dir="rtl">

      {/* GLOWING ORBS IN THE BACKGROUND (Vibrant Blue, Purple, Green, and Indigo combo) */}
      <div className="absolute top-[-10%] left-[-15%] w-[600px] h-[600px] bg-sky-400/30 rounded-full blur-[150px] pointer-events-none -z-10 animate-float" />
      <div className="absolute bottom-[-10%] right-[-15%] w-[650px] h-[650px] bg-purple-400/25 rounded-full blur-[160px] pointer-events-none -z-10 animate-float-delayed" />
      <div className="absolute top-[35%] right-[20%] w-[450px] h-[450px] bg-purple-400/25 rounded-full blur-[130px] pointer-events-none -z-10" />
      <div className="absolute bottom-[30%] left-[10%] w-[500px] h-[500px] bg-emerald-400/20 rounded-full blur-[140px] pointer-events-none -z-10 animate-float" />

      {/* HEADER BAR (Visible after Welcome Screen) */}
      {currentScreen !== 'welcome' && (
        <header className="sticky top-0 z-40 w-full bg-gradient-to-r from-sky-500 via-sky-700 to-indigo-950/95 border-b border-sky-400/40 shadow-xl shadow-indigo-950/25 backdrop-blur-xl">
          {/* Top aesthetic gradient ribbon */}
          <div className="h-1 w-full bg-gradient-to-r from-sky-300 via-sky-200 to-sky-400" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 flex flex-col md:flex-row items-center justify-between gap-4 w-full">

            {/* Branding / Home Button */}
            <div className="flex flex-col items-center md:items-start gap-1 cursor-pointer group select-none shrink-0" onClick={() => setCurrentScreen('hub')}>
              <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white drop-shadow-lg leading-none">
                بیمارستان من
              </h1>
              <p className="text-xs md:text-lg text-sky-50 font-black mt-2 drop-shadow">
                سامانه هوشمند پیگیری درمان و آموزش خودمراقبتی بیمار
              </p>
            </div>



            {/* Top Navigation / Controls */}
            <div className="flex items-center gap-1.5 xs:gap-2 sm:gap-3 flex-nowrap py-1 select-none shrink-0">

              {/* Home (Welcome) Button */}
              <button
                onClick={() => setCurrentScreen('welcome')}
                className="flex items-center justify-center bg-gradient-to-b from-sky-450 to-sky-600 hover:from-sky-500 hover:to-sky-700 text-white p-2.5 rounded-full border-2 border-sky-300 shadow-[0_0_15px_rgba(14,165,233,0.4)] hover:scale-110 active:scale-90 transition-all duration-300 cursor-pointer shrink-0"
                title="بازگشت به صفحه خوشامدگویی"
              >
                <Home className="w-5 h-5 text-white transition-transform duration-300 hover:rotate-12 filter drop-shadow" />
              </button>

              {/* About App Button */}
              <button
                onClick={() => setShowAboutModal(true)}
                className="flex items-center justify-center bg-gradient-to-b from-teal-400 to-teal-600 hover:from-teal-500 hover:to-teal-700 text-white p-2.5 rounded-full border-2 border-teal-300 shadow-[0_0_15px_rgba(20,184,166,0.4)] hover:scale-110 active:scale-90 transition-all duration-300 cursor-pointer shrink-0"
                title="درباره نرم‌افزار"
              >
                <Info className="w-5 h-5 text-white transition-transform duration-300 hover:scale-110 filter drop-shadow" />
              </button>

              {/* Admin Panel Access Button - Satisfying user's request */}
              {!currentAdmin && !currentUser && (
                <button
                  onClick={() => setShowAdminLoginModal(true)}
                  className="flex items-center justify-center bg-gradient-to-b from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-white p-2.5 rounded-full border-2 border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.4)] hover:scale-110 active:scale-90 transition-all duration-300 cursor-pointer shrink-0"
                  title="ورود کادر درمان"
                >
                  <Lock className="w-5 h-5 text-white animate-pulse transition-transform duration-300 hover:scale-110 filter drop-shadow" />
                </button>
              )}

              {currentAdmin && currentScreen !== 'admin_dashboard' && (
                <button
                  onClick={() => setCurrentScreen('admin_dashboard')}
                  className="flex items-center justify-center bg-gradient-to-b from-emerald-400 to-emerald-650 hover:from-emerald-500 hover:to-emerald-750 text-white p-2.5 rounded-full border-2 border-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.4)] hover:scale-110 active:scale-90 transition-all duration-300 cursor-pointer shrink-0"
                  title="میزکار مدیریت بخش"
                >
                  <ShieldCheck className="w-5 h-5 text-white transition-transform duration-300 hover:-translate-y-0.5 filter drop-shadow" />
                </button>
              )}

              {currentAdmin ? (
                // Admin Logged In Status
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <span className="text-xs bg-gradient-to-b from-indigo-900 to-indigo-950 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-full border-2 border-indigo-700 font-black flex items-center gap-1.5 shadow-lg shrink-0" title={`مدیر: ${currentAdmin.name}`}>
                    <ShieldCheck className="w-5 h-5 text-sky-400 filter drop-shadow" />
                    <span className="hidden md:inline text-xs sm:text-sm">{currentAdmin.name}</span>
                  </span>
                  <button
                    onClick={handleLogout}
                    className="flex items-center justify-center p-2.5 rounded-full bg-gradient-to-b from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white border-2 border-rose-450 shadow-[0_0_15px_rgba(244,63,94,0.4)] transition-all duration-300 cursor-pointer active:scale-90 hover:scale-110 shrink-0"
                    title="خروج از سیستم"
                  >
                    <LogOut className="w-5 h-5 text-white transition-transform duration-300 hover:translate-x-0.5" />
                  </button>
                </div>
              ) : currentUser ? (
                // Patient Logged In Status
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <span className="text-xs bg-gradient-to-b from-indigo-900 to-indigo-950 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-full border-2 border-indigo-700 font-black flex items-center gap-1.5 shadow-lg shrink-0" title={`بیمار: ${currentUser.name}`}>
                    <User className="w-5 h-5 text-sky-450 filter drop-shadow" />
                    <span className="hidden md:inline text-xs sm:text-sm">{currentUser.name}</span>
                  </span>
                  <button
                    onClick={handleLogout}
                    className="flex items-center justify-center p-2.5 rounded-full bg-gradient-to-b from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white border-2 border-rose-450 shadow-[0_0_15px_rgba(244,63,94,0.4)] transition-all duration-300 cursor-pointer active:scale-90 hover:scale-110 shrink-0"
                    title="خروج از سیستم"
                  >
                    <LogOut className="w-5 h-5 text-white transition-transform duration-300 hover:translate-x-0.5" />
                  </button>
                </div>
              ) : null}

            </div>

          </div>
        </header>
      )}

      {/* MAIN CONTAINER */}
      <main className="flex-grow w-full flex flex-col min-h-[calc(100vh-160px)]">
        <AnimatePresence mode="wait">

          {/* 1. WELCOME SCREEN */}
          {currentScreen === 'welcome' && (() => {
            const currentStyle = welcomeColorStyles[welcomeColor];
            return (
              <motion.div
                key="welcome"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                className="min-h-screen bg-slate-50/50 text-slate-800 flex flex-col justify-center items-center px-4 relative overflow-hidden"
              >
                {/* Static, high-performance clinical glowing background gradients */}
                <div className="absolute top-[12%] left-[8%] w-[380px] h-[380px] bg-sky-400/15 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute bottom-[10%] right-[8%] w-[420px] h-[420px] bg-purple-400/12 rounded-full blur-[110px] pointer-events-none" />

                {/* Modern dotted medical grid background */}
                <div className="absolute inset-0 bg-[radial-gradient(rgba(79,70,229,0.06)_1.5px,transparent_1.5px)] [background-size:24px_24px] opacity-70 pointer-events-none" />

                {/* Central Premium Dual-Border Glass Card */}
                <div className="z-10 text-center max-w-md w-full flex flex-col items-center bg-white/75 backdrop-blur-xl p-6 md:p-8 rounded-[2rem] border border-white/80 shadow-2xl shadow-indigo-500/5 relative overflow-hidden">
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-indigo-500/8 to-transparent rounded-full pointer-events-none blur-lg" />
                  <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-gradient-to-tr from-purple-500/8 to-transparent rounded-full pointer-events-none blur-lg" />

                  {/* Concentric Modern Rings & Beautiful Premium Larger Clinical Emblem */}
                  <div className="relative mb-4 mt-6 flex items-center justify-center">
                    {/* Glowing backdrops with smooth transitions - smaller, softer footprint */}
                    <div
                      className="absolute w-36 h-36 rounded-full blur-xl pointer-events-none opacity-60"
                      style={{
                        backgroundColor: currentStyle.glow,
                        transition: 'background-color 1.5s ease-in-out'
                      }}
                    />
                    <div className="absolute w-32 h-32 rounded-full bg-indigo-500/5 blur-md pointer-events-none" />

                    {/* Decorative orbital thin borders - smaller footprint */}
                    <div className="absolute w-44 h-44 rounded-full border border-dashed border-slate-200/30 animate-spin [animation-duration:80s] pointer-events-none" />
                    <div
                      className="absolute w-38 h-38 rounded-full border pointer-events-none opacity-40 animate-pulse"
                      style={{
                        borderColor: currentStyle.ring,
                        transition: 'border-color 1.5s ease-in-out'
                      }}
                    />

                    {/* Smoothly scaling heartbeat container */}
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{
                        scale: [0.96, 1.05, 0.96, 1.05, 0.96],
                        opacity: 1
                      }}
                      transition={{
                        scale: {
                          repeat: Infinity,
                          duration: 2.2,
                          ease: "easeInOut"
                        },
                        opacity: { duration: 0.5 }
                      }}
                      className="relative hover:scale-110 transition-all duration-300 cursor-pointer flex items-center justify-center w-40 h-40 md:w-44 md:h-44"
                    >
                      {/* Custom Exquisite Graphical Medical Heart & Lifeline SVG with dynamic auto color mapping */}
                      <svg className="w-32 h-32 md:w-36 md:h-36 fill-none" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          <linearGradient id="dynamicHeartGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor={currentStyle.stop1} style={{ transition: 'stop-color 1.5s ease-in-out' }} />
                            <stop offset="100%" stopColor={currentStyle.stop2} style={{ transition: 'stop-color 1.5s ease-in-out' }} />
                          </linearGradient>
                          <linearGradient id="glassReflection" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
                            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
                          </linearGradient>
                          <linearGradient id="dynamicPulseGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.3" />
                            <stop offset="40%" stopColor="#ffffff" stopOpacity="0.95" />
                            <stop offset="60%" stopColor="#ffffff" stopOpacity="0.95" />
                            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.3" />
                          </linearGradient>
                          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="1.5" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                          </filter>
                        </defs>

                        {/* Stylized Modern Heart Vector - smaller drop-shadow glow */}
                        <path
                          d="M50 83C50 83 15 53 15 31C15 17 24.5 8 37.5 8C44.5 8 48 11.5 50 14.5C52 11.5 55.5 8 62.5 8C75.5 8 85 17 85 31C85 53 50 83 50 83Z"
                          fill="url(#dynamicHeartGrad)"
                          style={{
                            filter: `drop-shadow(0 6px 12px ${currentStyle.accentGlow})`,
                            transition: 'filter 1.5s ease-in-out'
                          }}
                        />

                        {/* Exquisite Highlight/Reflection Overlay for high-end glassmorphic clinical feel */}
                        <path
                          d="M37.5 10C26.5 10 18 18 18 31C18 38 22 47 28 54C25 46 21 38 21 31C21 19.5 28.5 12 37.5 12C41.5 12 45 14 47 17.5C45.5 14 42 10 37.5 10Z"
                          fill="url(#glassReflection)"
                        />

                        {/* Beautifully aligned dynamic medical pulse lifeline that has smooth organic curves */}
                        <path
                          d="M20 33 H34 L40 18 L46 48 L51 26 L55 36 H80"
                          stroke="url(#dynamicPulseGrad)"
                          strokeWidth="3.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          filter="url(#glow)"
                          className="animate-pulse"
                        />

                        {/* Micro sparkles on the side for high-quality graphic finish */}
                        <circle cx="28" cy="22" r="1.5" fill="#ffffff" opacity="0.7" className="animate-ping [animation-duration:3s]" />
                        <circle cx="72" cy="45" r="1.2" fill="#ffffff" opacity="0.5" className="animate-ping [animation-duration:2s]" />

                        {/* Health Sparkle Accent */}
                        <path
                          d="M72 18 L74 21 L77 22 L74 23 L72 26 L70 23 L67 22 L70 21 Z"
                          fill="#ffffff"
                          className="animate-ping [animation-duration:2.5s]"
                        />
                      </svg>
                    </motion.div>
                  </div>

                  {/* Requested Arabic & Persian Welcome Wording with Large typography */}
                  <motion.div
                    initial={{ y: 8, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
                    className="mb-3 max-w-md text-center flex flex-col items-center gap-2"
                  >
                    <p className="text-3xl md:text-4xl font-black text-indigo-950 font-sans tracking-wide leading-relaxed">
                      بسم اللَّه الرحمن الرحیم
                    </p>
                  </motion.div>

                  {/* Welcome Message in larger, highly elegant and beautiful typography */}
                  <motion.div
                    initial={{ y: 8, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
                    className="mb-6 max-w-md text-center flex flex-col items-center gap-4"
                  >
                    <p className="text-2xl md:text-3xl font-black text-slate-800 leading-relaxed filter drop-shadow-sm">
                      به سامانه آموزش و پیگیری بیمارستان من خوش آمدید
                    </p>
                    <p className="text-lg md:text-xl font-black text-indigo-600 leading-relaxed">
                      سلامتی خود را با ما تضمین کنید
                    </p>
                    <div className="mt-1 bg-gradient-to-r from-slate-50 via-slate-100/70 to-slate-50 px-6 py-2 rounded-xl border border-slate-200/50 shadow-sm">
                      <p className="text-base md:text-lg font-extrabold text-slate-600 tracking-wide">
                        بیمارستان امام رضا (ع)
                      </p>
                    </div>
                  </motion.div>

                  {/* Entry Action Button */}
                  <motion.button
                    initial={{ y: 8, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.4, ease: "easeOut", delay: 0.4 }}
                    onClick={() => setCurrentScreen('hub')}
                    className="group bg-gradient-to-r from-sky-400 via-indigo-500 to-purple-500 hover:from-sky-500 hover:via-indigo-600 hover:to-purple-600 text-white font-black text-lg md:text-xl px-10 py-5 rounded-2xl shadow-xl shadow-indigo-500/10 hover:shadow-indigo-500/25 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 cursor-pointer flex items-center justify-center gap-3 relative overflow-hidden w-full"
                  >
                    <span className="relative z-10">ورود به پرتال هوشمند بیمارستان</span>
                    <ChevronLeft className="w-5 h-5 text-white group-hover:-translate-x-1.5 transition-transform relative z-10" />
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </motion.button>
                </div>
              </motion.div>
            );
          })()}

          {/* 2. CORE HUB SCREEN */}
          {currentScreen === 'hub' && (
            <motion.div
              key="hub"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="max-w-6xl mx-auto px-4 py-12 md:py-16"
            >
              {/* Nice Header / Greeting */}
              <div className="text-center mb-10 space-y-3">
                <h2 className="text-3xl md:text-5xl font-black text-slate-800 tracking-tight leading-tight select-none bg-clip-text bg-gradient-to-r from-indigo-900 via-sky-750 to-indigo-800">
                  به پرتال هوشمند بیمارستان من خوش آمدید
                </h2>
                <p className="text-slate-600 text-xs md:text-sm leading-relaxed max-w-2xl mx-auto font-black">
                  کادر درمان و پزشکان شما تا زمان بهبودی کامل در خانه همراه شما هستند؛ علائم خود را ثبت کنید و آموزش‌ها را دنبال فرمایید.
                </p>
              </div>

              {/* GRAPHICAL SLIDING NEWS BANNER SLIDESHOW */}
              {(() => {
                const activeBanners = newsBanners.filter(b => b.isActive);
                if (activeBanners.length === 0) return null;
                const currentBanner = activeBanners[currentBannerIdx % activeBanners.length] || activeBanners[0];
                return (
                  <div className="max-w-4xl mx-auto mb-10 relative group rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-200/50 bg-slate-950 text-right font-sans flex flex-col">
                    {/* Top Slide Container: Image/GFX only */}
                    <div
                      onClick={() => {
                        setSelectedNewsBanner(currentBanner);
                        setCurrentScreen('news_detail');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="relative h-64 sm:h-80 md:h-[26rem] w-full overflow-hidden bg-slate-900 flex items-center justify-center cursor-pointer"
                    >

                      {/* 1. Blurred background matching the image colors for dynamic padding */}
                      {currentBanner.imageUrl ? (
                        <div
                          className="absolute inset-0 w-full h-full bg-cover bg-center filter blur-2xl opacity-40 scale-110 pointer-events-none"
                          style={{ backgroundImage: `url(${currentBanner.imageUrl})` }}
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-950 via-slate-900 to-indigo-900 opacity-80" />
                      )}

                      {/* 2. Soft vignettes & lighting */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/20 z-10 pointer-events-none" />
                      <div className="absolute -top-12 -right-12 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
                      <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

                      {/* 3. Main Image - fits perfectly in any resolution & aspect-ratio */}
                      {currentBanner.imageUrl ? (
                        <img
                          src={currentBanner.imageUrl}
                          alt={currentBanner.title}
                          className="relative z-10 max-w-full max-h-full object-contain mx-auto"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="relative z-10 flex flex-col items-center justify-center text-white/40 space-y-3">
                          <Sparkles className="w-16 h-16 animate-pulse text-indigo-400" />
                          <span className="text-xs font-bold">بیمارستان هوشمند من</span>
                        </div>
                      )}

                      {/* Navigation Arrows (inside the image container) */}
                      {activeBanners.length > 1 && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setCurrentBannerIdx((prev) => (prev - 1 + activeBanners.length) % activeBanners.length);
                            }}
                            className="absolute left-4 top-1/2 -translate-y-1/2 z-30 bg-black/45 hover:bg-black/70 text-white p-2.5 sm:p-3 rounded-full backdrop-blur-md border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setCurrentBannerIdx((prev) => (prev + 1) % activeBanners.length);
                            }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 z-30 bg-black/45 hover:bg-black/70 text-white p-2.5 sm:p-3 rounded-full backdrop-blur-md border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer"
                          >
                            <ChevronLeft className="w-4 h-4 rotate-180" />
                          </button>
                        </>
                      )}

                      {/* Pagination Indicator Dots */}
                      {activeBanners.length > 1 && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex gap-2">
                          {activeBanners.map((_, idx) => (
                            <button
                              key={idx}
                              onClick={(e) => {
                                e.stopPropagation();
                                setCurrentBannerIdx(idx);
                              }}
                              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                                idx === (currentBannerIdx % activeBanners.length)
                                  ? 'bg-teal-400 w-6'
                                  : 'bg-white/40 hover:bg-white/60'
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Bottom Content Area: Title & Description below the image */}
                    <div
                      onClick={() => {
                        setSelectedNewsBanner(currentBanner);
                        setCurrentScreen('news_detail');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="bg-white hover:bg-slate-50/80 border-t border-slate-100 p-6 sm:p-8 text-right space-y-4 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[10px] sm:text-xs text-slate-400 font-mono font-bold">
                          تاریخ انتشار: {currentBanner.createdAt}
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-xs font-black text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/60 px-3.5 py-1.5 rounded-xl transition-all shadow-sm">
                          <span>مشاهده کامل خبر</span>
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </span>
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-lg sm:text-2xl font-black text-slate-900 leading-tight">
                          {currentBanner.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-bold">
                          {currentBanner.content}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* METRO-STYLE BENTO GRID OF COLORFUL GLASSY GRAPHICAL TILES */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">

                {/* TILE 1: HOSPITAL DEPARTMENTS DATABASE (Diseases Tile) */}
                <div
                  onClick={() => {
                    setDiseaseBackScreen('hub');
                    setCurrentScreen('db_departments');
                  }}
                  className="group relative flex flex-col justify-between bg-gradient-to-br from-sky-600 via-sky-700 to-teal-600 text-white hover:from-sky-500 hover:via-sky-600 hover:to-teal-500 rounded-[2.5rem] p-7 md:p-10 shadow-2xl border-4 border-sky-300 hover:border-white hover:scale-[1.03] active:scale-[0.97] transition-all duration-300 cursor-pointer overflow-hidden min-h-[280px]"
                  id="tile_department_db"
                >
                  <div className="z-10 mt-4">
                    {/* Glassy Icon Container */}
                    <div className="w-14 h-14 bg-white/20 border-2 border-white/30 rounded-2xl flex items-center justify-center mb-6 shadow-lg relative overflow-hidden transition-all duration-300 group-hover:bg-white/30 group-hover:rotate-6">
                      <BookOpen className="w-8 h-8 text-white filter drop-shadow-md animate-bounce-slow" />
                    </div>
                    <h3 className="text-2xl md:text-3xl font-black text-white mb-3 group-hover:text-sky-100 transition-colors leading-tight">
                      بانک اطلاعاتی بخش‌ها و بیماری‌ها
                    </h3>
                    <p className="text-sky-50 text-xs md:text-sm leading-relaxed mb-4 font-black text-justify opacity-95">
                      مشاهده اطلاعات تخصصی بیماری‌های شایع هر بخش، دستورالعمل‌های مراقبت علمی در منزل، رژیم‌های غذایی، توصیه‌های ورزشی و دارویی و سطح‌بندی علائم و شرایط پس از ترخیص بیمار.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-white font-black text-sm z-10 mt-2 border-t border-white/20 pt-4">
                    <span>مشاهده اطلاعات بخش‌ها و خودمراقبتی</span>
                    <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1.5 transition-transform" />
                  </div>
                </div>

                {/* TILE 2: TREATMENT FOLLOW-UP LOGIN (Follow-up Tile) */}
                <div
                  onClick={() => setCurrentScreen('patient_login')}
                  className="group relative flex flex-col justify-between bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-600 text-white hover:from-indigo-500 hover:via-indigo-600 hover:to-purple-500 rounded-[2.5rem] p-7 md:p-10 shadow-2xl border-4 border-indigo-300 hover:border-white hover:scale-[1.03] active:scale-[0.97] transition-all duration-300 cursor-pointer overflow-hidden min-h-[280px]"
                  id="tile_followup"
                >
                  <div className="z-10 mt-4">
                    {/* Glassy Icon Container */}
                    <div className="w-14 h-14 bg-white/20 border-2 border-white/30 rounded-2xl flex items-center justify-center mb-6 shadow-lg relative overflow-hidden transition-all duration-300 group-hover:bg-white/30 group-hover:rotate-6">
                      <Stethoscope className="w-8 h-8 text-white filter drop-shadow-md" />
                    </div>
                    <h3 className="text-2xl md:text-3xl font-black text-white mb-3 group-hover:text-indigo-100 transition-colors leading-tight">
                      پیگیری درمانی و کارتابل بیمار
                    </h3>
                    <p className="text-indigo-50 text-xs md:text-sm leading-relaxed mb-4 font-black text-justify opacity-95">
                      ورود به کارتابل شخصی با کد کاربری و رمز ورود جهت پایش مستمر وضعیت سلامت، ثبت روزانه علائم و معیارهای حیاتی، تکمیل پرسشنامه‌ها، بارگذاری مدارک و گفتگو و مشاوره آنلاین مستقیم با کادر درمانی بخش.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-white font-black text-sm z-10 mt-2 border-t border-white/20 pt-4">
                    <span>ورود به سامانه پیگیری بیمار</span>
                    <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1.5 transition-transform" />
                  </div>
                </div>

                {/* TILE 3: COMPLAINTS, SUGGESTIONS & DEPARTMENT SATISFACTION SURVEY */}
                <div
                  onClick={() => {
                    setCurrentScreen('feedback_hub');
                    setFeedbackView('grid');
                    setFeedbackSuccessMsg('');
                    setSatisfactionDeptId('');
                    setShowSatisfactionForm(false);
                    setSatisfactionAnswers({});
                  }}
                  className="group relative flex flex-col justify-between bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-800 text-white hover:from-emerald-500 hover:via-emerald-600 hover:to-emerald-700 rounded-[2.5rem] p-7 md:p-10 shadow-2xl border-4 border-emerald-300 hover:border-white hover:scale-[1.03] active:scale-[0.97] transition-all duration-300 cursor-pointer overflow-hidden min-h-[220px] md:col-span-2"
                  id="tile_feedback"
                >
                  <div className="z-10 mt-4">
                    {/* Glassy Icon Container */}
                    <div className="w-14 h-14 bg-white/20 border-2 border-white/30 rounded-2xl flex items-center justify-center mb-6 shadow-lg relative overflow-hidden transition-all duration-300 group-hover:bg-white/30 group-hover:rotate-6">
                      <HeartHandshake className="w-8 h-8 text-white filter drop-shadow-md animate-pulse" />
                    </div>
                    <h3 className="text-2xl md:text-3xl font-black text-white mb-3 group-hover:text-emerald-100 transition-colors leading-tight">
                      صدای شما (ثبت شکایات، پیشنهادات و رضایت‌سنجی بخش‌ها)
                    </h3>
                    <p className="text-emerald-50 text-xs md:text-sm leading-relaxed mb-4 font-black text-justify opacity-95">
                      انتقادات و پیشنهادات خود را مستقیماً به مدیریت بیمارستان ارسال کنید و یا با پر کردن چک‌لیست‌های اختصاصی هر بخش، ما را در ارزیابی و بهبود کیفیت خدمات درمانی یاری فرمایید.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-white font-black text-sm z-10 mt-2 border-t border-white/20 pt-4">
                    <span>ثبت شکایت، پیشنهاد یا نظرسنجی بخش‌های بیمارستان</span>
                    <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1.5 transition-transform" />
                  </div>
                </div>

              </div>

            </motion.div>
          )}

          {/* 2.4 FULL NEWS ARTICLE DETAIL SCREEN */}
          {currentScreen === 'news_detail' && selectedNewsBanner && (
            <motion.div
              key="news_detail"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="max-w-4xl mx-auto px-4 py-8 md:py-12 text-right font-sans"
            >
              {/* Back breadcrumb & Date Badge */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentScreen('hub');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 text-xs font-bold px-4 py-2.5 rounded-full transition-all duration-300 cursor-pointer shadow-sm w-fit"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>بازگشت به صفحه اصلی بیمارستان</span>
                </button>

                <div className="flex items-center gap-2">
                  <span className="bg-indigo-50 text-indigo-700 border border-indigo-200/60 text-xs font-black px-3.5 py-1.5 rounded-xl">
                    اطلاعیه و اخبار بیمارستان
                  </span>
                  <span className="text-xs text-slate-400 font-mono font-bold">
                    تاریخ انتشار: {selectedNewsBanner.createdAt}
                  </span>
                </div>
              </div>

              {/* Main Article Container */}
              <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200/80 overflow-hidden p-6 sm:p-10 space-y-8">
                {/* Hero Title */}
                <h1 className="text-2xl sm:text-4xl font-black text-slate-900 leading-tight">
                  {selectedNewsBanner.title}
                </h1>

                {/* Main Image if present */}
                {selectedNewsBanner.imageUrl && (
                  <div className="rounded-3xl overflow-hidden border border-slate-200/80 shadow-md bg-slate-900 flex flex-col">
                    <div className="relative flex items-center justify-center max-h-[28rem] overflow-hidden">
                      <img
                        src={selectedNewsBanner.imageUrl}
                        alt={selectedNewsBanner.title}
                        className="max-h-[28rem] w-auto object-contain mx-auto"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="bg-slate-900/95 border-t border-slate-800 p-3.5 flex items-center justify-between gap-3">
                      <span className="text-xs text-slate-300 font-bold">تصویر اصلی خبر</span>
                      <button
                        type="button"
                        onClick={() => {
                          const a = document.createElement('a');
                          a.href = selectedNewsBanner.imageUrl!;
                          a.download = `news-main-image.png`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md active:scale-95"
                      >
                        <Download className="w-4 h-4" />
                        <span>دانلود تصویر</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Short Summary Highlight Box */}
                <div className="bg-gradient-to-r from-indigo-50/80 to-sky-50/80 border border-indigo-100 p-5 sm:p-7 rounded-2xl space-y-2">
                  <span className="text-[11px] font-black text-indigo-700 uppercase tracking-wider block">
                    خلاصه و چکیده خبر
                  </span>
                  <p className="text-sm sm:text-base text-indigo-950 font-bold leading-relaxed">
                    {selectedNewsBanner.content}
                  </p>
                </div>

                {/* Full Customizable Description */}
                <div className="space-y-4">
                  <h3 className="text-base sm:text-lg font-black text-slate-800 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-500" />
                    <span>شرح کامل و جزئیات اطلاعیه</span>
                  </h3>
                  <div className="bg-slate-50/80 border border-slate-200/60 p-6 sm:p-8 rounded-3xl">
                    <div
                      className="text-sm sm:text-base text-slate-800 leading-9 font-bold whitespace-pre-wrap prose prose-indigo max-w-none [&_a]:text-indigo-600 [&_a]:underline [&_a]:font-extrabold"
                      dangerouslySetInnerHTML={{ __html: selectedNewsBanner.description || selectedNewsBanner.content }}
                    />
                  </div>
                </div>

                {/* Attachment Images Section */}
                {selectedNewsBanner.attachmentImages && selectedNewsBanner.attachmentImages.length > 0 && (
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <h3 className="text-base sm:text-lg font-black text-slate-800 flex items-center gap-2">
                      <FileUp className="w-5 h-5 text-indigo-500" />
                      <span>تصاویر و مستندات ضمیمه خبر ({selectedNewsBanner.attachmentImages.length} تصویر)</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {selectedNewsBanner.attachmentImages.map((imgUrl, idx) => (
                        <div
                          key={idx}
                          className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 shadow-md group relative flex flex-col"
                        >
                          <div className="relative flex-1 flex items-center justify-center overflow-hidden min-h-[14rem]">
                            <img
                              src={imgUrl}
                              alt={`ضمیمه ${idx + 1}`}
                              className="w-full h-auto max-h-[32rem] object-contain mx-auto transition-transform duration-300 group-hover:scale-[1.02]"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <div className="bg-slate-900/95 border-t border-slate-800 p-3.5 flex items-center justify-between gap-3">
                            <span className="text-xs text-slate-300 font-bold">تصویر ضمیمه {idx + 1}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const a = document.createElement('a');
                                a.href = imgUrl;
                                a.download = `news-attachment-${idx + 1}.png`;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                              }}
                              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md active:scale-95"
                              title="دانلود تصویر ضمیمه"
                            >
                              <Download className="w-4 h-4" />
                              <span>دانلود تصویر</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bottom Back Button */}
                <div className="pt-6 border-t border-slate-100 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentScreen('hub');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-black px-8 py-3.5 rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-2"
                  >
                    <span>بازگشت به صفحه اصلی بیمارستان</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* 2.5 FEEDBACK HUB SCREEN */}
          {currentScreen === 'feedback_hub' && (
            <motion.div
              key="feedback_hub"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="max-w-4xl mx-auto px-4 py-8 text-right"
            >
              {/* Back breadcrumb */}
              <button
                onClick={() => {
                  setCurrentScreen('hub');
                }}
                className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 text-xs font-bold px-4 py-2.5 rounded-full transition-all duration-300 cursor-pointer shadow-sm mb-8"
              >
                <ArrowRight className="w-4 h-4 text-emerald-600" />
                <span>بازگشت به صفحه اصلی</span>
              </button>

              <div className="bg-white border border-slate-200 shadow-2xl rounded-[2.5rem] p-6 md:p-10 relative">

                {/* A. GRID SELECTION */}
                {feedbackView === 'grid' && (
                  <div className="space-y-8">
                    <div className="text-center pb-4 border-b border-slate-100">
                      <div className="bg-emerald-50 text-emerald-600 p-4 rounded-3xl w-fit mx-auto mb-3">
                        <HeartHandshake className="w-10 h-10 animate-pulse" />
                      </div>
                      <h3 className="text-2xl font-black text-slate-900">صدای شما</h3>
                      <p className="text-xs text-slate-500 mt-1">نظرات، شکایات و پیشنهادات شما ارزشمندترین راهنما برای ارتقای خدمات بیمارستان ماست.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Option 1: Complaint & Suggestion */}
                      <div
                        onClick={() => {
                          setFeedbackView('complaint_form');
                          setComplaintName('');
                          setComplaintPhone('');
                          setComplaintAge('');
                          setComplaintDate(new Date().toISOString().split('T')[0]);
                          setComplaintDescription('');
                          setFeedbackSuccessMsg('');
                        }}
                        className="group bg-gradient-to-br from-amber-500 to-orange-600 text-white p-6 rounded-[2rem] transition-all duration-300 cursor-pointer text-center flex flex-col justify-between hover:scale-[1.02] shadow-lg hover:shadow-xl hover:shadow-amber-500/20 border-0"
                      >
                        <div className="space-y-4">
                          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mx-auto text-white transition-colors border border-white/15">
                            <ClipboardCheck className="w-6 h-6" />
                          </div>
                          <h4 className="text-lg font-black text-white">ثبت شکایت و پیشنهاد جدید</h4>
                          <p className="text-xs text-amber-50 font-bold leading-relaxed">
                            اگر در فرآیند بستری، ترخیص یا دریافت خدمات با مشکلی مواجه شده‌اید یا پیشنهادی دارید، مستقیماً به واحد بازرسی و مدیریت بیمارستان ارسال فرمایید.
                          </p>
                        </div>
                        <div className="inline-flex items-center gap-1.5 text-xs font-black text-white hover:text-amber-100 mt-6 justify-center">
                          <span>ورود به فرم ثبت شکایت و پیشنهاد</span>
                          <ChevronLeft className="w-4 h-4" />
                        </div>
                      </div>

                      {/* Option 2: Department Satisfaction Survey */}
                      <div
                        onClick={() => {
                          setFeedbackView('dept_satisfaction_select');
                          setSatisfactionDeptId('');
                          setShowSatisfactionForm(false);
                          setSatisfactionAnswers({});
                          setFeedbackSuccessMsg('');
                        }}
                        className="group bg-gradient-to-br from-teal-500 to-emerald-600 text-white p-6 rounded-[2rem] transition-all duration-300 cursor-pointer text-center flex flex-col justify-between hover:scale-[1.02] shadow-lg hover:shadow-xl hover:shadow-teal-500/20 border-0"
                      >
                        <div className="space-y-4">
                          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mx-auto text-white transition-colors border border-white/15">
                            <Activity className="w-6 h-6" />
                          </div>
                          <h4 className="text-lg font-black text-white">نظرسنجی رضایت‌مندی از بخش‌ها</h4>
                          <p className="text-xs text-teal-50 font-bold leading-relaxed">
                            با تکمیل فرم سنجش رضایت اختصاصی هریک از بخش‌های بیمارستان، ما را در نظارت مستقیم و ارتقای زنده فرآیندهای بالینی یاری فرمایید.
                          </p>
                        </div>
                        <div className="inline-flex items-center gap-1.5 text-xs font-black text-white hover:text-teal-100 mt-6 justify-center">
                          <span>ورود به سامانه رضایت‌سنجی بخش‌ها</span>
                          <ChevronLeft className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* B. COMPLAINT & SUGGESTION FORM */}
                {feedbackView === 'complaint_form' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <h4 className="text-lg font-black text-slate-900 flex items-center gap-2">
                        <ClipboardCheck className="w-6 h-6 text-emerald-600 animate-pulse" />
                        <span>فرم ثبت شکایت، انتقاد یا پیشنهاد جدید</span>
                      </h4>
                      <button
                        onClick={() => setFeedbackView('grid')}
                        className="text-xs font-black text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                      >
                        بازگشت
                      </button>
                    </div>

                    {feedbackSuccessMsg ? (
                      <div className="text-center py-10 space-y-4">
                        <div className="bg-emerald-100 text-emerald-600 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto shadow-md">
                          <Check className="w-10 h-10" />
                        </div>
                        <h4 className="text-xl font-black text-slate-900">سپاسگزاریم!</h4>
                        <p className="text-sm text-slate-600 font-bold leading-relaxed">
                          {feedbackSuccessMsg}
                        </p>
                        <button
                          onClick={() => setFeedbackView('grid')}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-6 py-2.5 rounded-xl transition-all cursor-pointer mt-2"
                        >
                          بازگشت به منوی صدای شما
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        if (!complaintName.trim() || !complaintPhone.trim() || !complaintDescription.trim()) {
                          return;
                        }

                        const newComplaint: HospitalComplaint = {
                          id: `comp_${Date.now()}`,
                          name: complaintName,
                          phone: complaintPhone,
                          age: Number(complaintAge) || 0,
                          date: complaintDate,
                          description: complaintDescription,
                          submittedAt: new Date().toISOString()
                        };

                        saveComplaints([...complaints, newComplaint]);
                        setFeedbackSuccessMsg("شکایت یا پیشنهاد شما با موفقیت در دبیرخانه مدیریت ثبت شد. کارشناسان ما در سریع‌ترین زمان ممکن برای بررسی موضوع با شما تماس خواهند گرفت.");
                      }} className="space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-2">نام و نام خانوادگی:</label>
                            <input
                              type="text"
                              required
                              placeholder="مثال: زهرا محمدی"
                              value={complaintName}
                              onChange={(e) => setComplaintName(e.target.value)}
                              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400 font-bold text-slate-800"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-2">شماره تلفن همراه:</label>
                            <input
                              type="tel"
                              required
                              placeholder="مثال: 09123456789"
                              value={complaintPhone}
                              onChange={(e) => setComplaintPhone(e.target.value)}
                              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400 font-bold text-slate-800 text-left"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-2">سن شما (اختیاری):</label>
                            <input
                              type="number"
                              placeholder="مثال: ۳۴"
                              value={complaintAge}
                              onChange={(e) => setComplaintAge(e.target.value)}
                              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400 font-bold text-slate-800 text-left"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-2">تاریخ رخداد / ثبت (هجری شمسی):</label>
                          <ShamsiDatePicker
                            value={complaintDate}
                            onChange={(val) => setComplaintDate(val)}
                            placeholder="انتخاب تاریخ رخداد یا ثبت..."
                            isDark={false}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-2">شرح کامل موضوع (شکایت، پیشنهاد یا تقدیر):</label>
                          <textarea
                            required
                            placeholder="لطفاً جزئیات موضوع، نام بخش و ساعت یا تاریخ رخداد را با دقت شرح دهید..."
                            value={complaintDescription}
                            onChange={(e) => setComplaintDescription(e.target.value)}
                            rows={5}
                            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400 font-bold text-slate-800 leading-relaxed"
                          />
                        </div>

                        <div className="flex gap-3 pt-2">
                          <button
                            type="submit"
                            className="flex-grow bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3.5 rounded-xl text-xs shadow-md transition-colors cursor-pointer"
                          >
                            ثبت و ارسال نهایی پیام
                          </button>
                          <button
                            type="button"
                            onClick={() => setFeedbackView('grid')}
                            className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-6 py-3.5 rounded-xl text-xs transition-colors cursor-pointer"
                          >
                            انصراف
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {/* C. DEPARTMENT SATISFACTION SURVEY COMPONENT */}
                {feedbackView === 'dept_satisfaction_select' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <h4 className="text-lg font-black text-slate-900 flex items-center gap-2">
                        <Activity className="w-6 h-6 text-emerald-600 animate-pulse" />
                        <span>فرم سنجش رضایت بر اساس بخش‌های تخصصی</span>
                      </h4>
                      <button
                        onClick={() => setFeedbackView('grid')}
                        className="text-xs font-black text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                      >
                        بازگشت
                      </button>
                    </div>

                    {feedbackSuccessMsg ? (
                      <div className="text-center py-10 space-y-4">
                        <div className="bg-emerald-100 text-emerald-600 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto shadow-md">
                          <Check className="w-10 h-10 animate-bounce" />
                        </div>
                        <h4 className="text-xl font-black text-slate-900">ثبت با موفقیت انجام شد!</h4>
                        <p className="text-sm text-slate-600 font-bold leading-relaxed">
                          {feedbackSuccessMsg}
                        </p>
                        <button
                          onClick={() => setFeedbackView('grid')}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-6 py-2.5 rounded-xl transition-all cursor-pointer mt-2"
                        >
                          بازگشت به منوی صدای شما
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* 1. Select Department */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-2">لطفاً بخش تخصصی مورد نظر جهت ثبت رضایت‌سنجی را انتخاب کنید:</label>
                          <select
                            value={satisfactionDeptId}
                            onChange={(e) => {
                              const deptId = e.target.value;
                              setSatisfactionDeptId(deptId);
                              setSatisfactionAnswers({});
                              if (deptId) {
                                setShowSatisfactionForm(true);
                              } else {
                                setShowSatisfactionForm(false);
                              }
                            }}
                            className="w-full text-xs bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400 font-bold cursor-pointer"
                          >
                            <option value="">-- انتخاب بخش مورد نظر --</option>
                            {departments.map(d => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                          </select>
                        </div>

                        {/* 2. Show dynamically loaded Satisfaction Checklist of that Department */}
                        {showSatisfactionForm && (
                          <div className="space-y-6 border-t border-slate-100 pt-6">
                            {(() => {
                              const deptChecklist = customChecklists.find(c => c.targetType === 'satisfaction' && c.departmentId === satisfactionDeptId);
                              if (!deptChecklist) {
                                return (
                                  <div className="bg-amber-50 border border-amber-200 text-amber-850 p-5 rounded-2xl text-center space-y-2">
                                    <ClipboardCheck className="w-8 h-8 text-amber-500 mx-auto" />
                                    <h5 className="text-sm font-black">چک‌لیست رضایت‌سنجی فعال یافت نشد</h5>
                                    <p className="text-xs font-medium leading-relaxed">در حال حاضر هیچ چک‌لیست رضایت‌سنجی اختصاصی توسط ادمین کل برای بخش انتخابی ثبت و فعال نگردیده است.</p>
                                  </div>
                                );
                              }

                              return (
                                <form onSubmit={(e) => {
                                  e.preventDefault();
                                  if (!satisfactionDeptId || !deptChecklist) return;

                                  const submission: DeptSatisfactionSubmission = {
                                    id: `sub_${Date.now()}`,
                                    departmentId: satisfactionDeptId,
                                    answers: satisfactionAnswers,
                                    submittedAt: new Date().toISOString()
                                  };

                                  saveDeptSatisfactionSubmissions([...deptSatisfactionSubmissions, submission]);
                                  setFeedbackSuccessMsg("نظرات و پاسخ‌های رضایت‌سنجی گران‌بهای شما با موفقیت برای بخش انتخابی به ثبت رسید. سپاس از مشارکت شما در بهبود مستمر فرآیندها.");
                                }} className="space-y-6">
                                  <div className="bg-emerald-50/55 p-4 rounded-2xl border border-emerald-100">
                                    <h5 className="text-xs font-black text-emerald-900 leading-relaxed">
                                      چک‌لیست رضایت‌سنجی بخش: {departments.find(d => d.id === satisfactionDeptId)?.name}
                                    </h5>
                                    <p className="text-[11px] text-slate-500 font-bold mt-1">تکمیل تمامی فیلدها اختیاری بوده و پاسخ‌های شما به ارتقای خدمات این بخش کمک بزرگی خواهد کرد.</p>
                                  </div>

                                  <div className="space-y-5">
                                    {deptChecklist.questions.map((q, idx) => {
                                      const answer = satisfactionAnswers[q.id] || '';
                                      const setAnswer = (val: any) => {
                                        setSatisfactionAnswers(prev => ({ ...prev, [q.id]: val }));
                                      };

                                      return (
                                        <div key={q.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-150 space-y-3">
                                          <label className="block text-xs font-black text-slate-800 leading-relaxed">
                                            {idx + 1}. {q.text}
                                          </label>

                                          {/* Render input based on question type */}
                                          {q.type === 'qualitative' && (
                                            <div className="grid grid-cols-3 gap-2">
                                              {(q.options && q.options.length > 0 ? q.options : ['خوب', 'متوسط', 'ضعیف']).map(opt => (
                                                <button
                                                  key={opt}
                                                  type="button"
                                                  onClick={() => setAnswer(opt)}
                                                  className={`py-2 px-3 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                                                    answer === opt
                                                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-md'
                                                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                                  }`}
                                                >
                                                  {opt}
                                                </button>
                                              ))}
                                            </div>
                                          )}

                                          {q.type === 'quantitative' && (
                                            <input
                                              type="number"
                                              placeholder="مقدار عددی وارد نمایید..."
                                              value={answer}
                                              onChange={(e) => setAnswer(e.target.value)}
                                              className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400 font-bold text-slate-800"
                                            />
                                          )}

                                          {q.type === 'multiple_choice' && (
                                            <div className="grid grid-cols-2 gap-2">
                                              {(q.options || []).map(opt => (
                                                <button
                                                  key={opt}
                                                  type="button"
                                                  onClick={() => setAnswer(opt)}
                                                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer truncate ${
                                                    answer === opt
                                                      ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                                                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                                  }`}
                                                  title={opt}
                                                >
                                                  {opt}
                                                </button>
                                              ))}
                                            </div>
                                          )}

                                          {q.type === 'emoji' && (
                                            <div className="flex justify-around py-1 bg-white border border-slate-200 rounded-xl">
                                              {['😞', '😐', '🙂', '😊', '🤩'].map(emoji => (
                                                <button
                                                  key={emoji}
                                                  type="button"
                                                  onClick={() => setAnswer(emoji)}
                                                  className={`text-2xl p-2 rounded-full transition-transform hover:scale-125 cursor-pointer ${
                                                    answer === emoji ? 'bg-amber-100 scale-110' : ''
                                                  }`}
                                                >
                                                  {emoji}
                                                </button>
                                              ))}
                                            </div>
                                          )}

                                          {q.type === 'descriptive' && (
                                            <textarea
                                              placeholder="شرح پاسخ یا پیشنهاد تکمیلی..."
                                              value={answer}
                                              onChange={(e) => setAnswer(e.target.value)}
                                              rows={2}
                                              className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400 font-bold resize-none text-slate-800"
                                            />
                                          )}

                                          {q.type === 'hybrid' && (
                                            <div className="space-y-3">
                                              {/* Part 1 */}
                                              {q.hybridType1 === 'qualitative' && (
                                                <div className="grid grid-cols-3 gap-2">
                                                  {(q.options || ['خوب', 'متوسط', 'ضعیف']).map(opt => {
                                                    const part1Val = answer.part1 || '';
                                                    return (
                                                      <button
                                                        key={opt}
                                                        type="button"
                                                        onClick={() => setAnswer({ ...answer, part1: opt })}
                                                        className={`py-1.5 px-2 rounded-xl text-[10px] font-black border transition-all cursor-pointer ${
                                                          part1Val === opt
                                                            ? 'bg-emerald-600 border-emerald-600 text-white'
                                                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                                        }`}
                                                      >
                                                        {opt}
                                                      </button>
                                                    );
                                                  })}
                                                </div>
                                              )}
                                              {q.hybridType1 === 'quantitative' && (
                                                <input
                                                  type="number"
                                                  placeholder="مقدار عددی..."
                                                  value={answer.part1 || ''}
                                                  onChange={(e) => setAnswer({ ...answer, part1: e.target.value })}
                                                  className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400 font-bold text-slate-800"
                                                />
                                              )}
                                              {q.hybridType1 === 'multiple_choice' && (
                                                <div className="grid grid-cols-2 gap-2">
                                                  {(q.options || []).map(opt => {
                                                    const part1Val = answer.part1 || '';
                                                    return (
                                                      <button
                                                        key={opt}
                                                        type="button"
                                                        onClick={() => setAnswer({ ...answer, part1: opt })}
                                                        className={`py-1.5 px-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer truncate ${
                                                          part1Val === opt
                                                            ? 'bg-blue-600 border-blue-600 text-white'
                                                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                                        }`}
                                                        title={opt}
                                                      >
                                                        {opt}
                                                      </button>
                                                    );
                                                  })}
                                                </div>
                                              )}
                                              {q.hybridType1 === 'emoji' && (
                                                <div className="flex justify-around py-1 bg-white border border-slate-200 rounded-xl">
                                                  {['😞', '😐', '🙂', '😊', '🤩'].map(emoji => {
                                                    const part1Val = answer.part1 || '';
                                                    return (
                                                      <button
                                                        key={emoji}
                                                        type="button"
                                                        onClick={() => setAnswer({ ...answer, part1: emoji })}
                                                        className={`text-xl p-1 rounded-full transition-transform hover:scale-125 cursor-pointer ${
                                                          part1Val === emoji ? 'bg-amber-100 scale-110' : ''
                                                        }`}
                                                      >
                                                        {emoji}
                                                      </button>
                                                    );
                                                  })}
                                                </div>
                                              )}

                                              {/* Part 2: Descriptive */}
                                              <textarea
                                                placeholder="توضیحات تکمیلی (اختیاری)..."
                                                value={answer.part2 || ''}
                                                onChange={(e) => setAnswer({ ...answer, part2: e.target.value })}
                                                rows={1.5}
                                                className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-1.5 outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400 font-bold resize-none text-slate-800"
                                              />
                                            </div>
                                          )}

                                        </div>
                                      );
                                    })}
                                  </div>

                                  <div className="flex gap-3">
                                    <button
                                      type="submit"
                                      className="flex-grow bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3.5 rounded-xl text-xs shadow-md transition-colors cursor-pointer animate-pulse"
                                    >
                                      ارسال نهایی پاسخ‌های رضایت‌سنجی بخش
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSatisfactionDeptId('');
                                        setShowSatisfactionForm(false);
                                      }}
                                      className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-6 py-3.5 rounded-xl text-xs transition-colors cursor-pointer"
                                    >
                                      انصراف از ثبت
                                    </button>
                                  </div>
                                </form>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

              </div>
            </motion.div>
          )}

          {/* 3. HOSPITAL DEPARTMENTS DATABASE */}
          {currentScreen === 'db_departments' && (
            <motion.div
              key="db_departments"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="max-w-7xl mx-auto px-4 py-8"
            >
              {/* Back breadcrumb */}
              <button
                onClick={() => {
                  setSelectedDept(null);
                  setSelectedDisease(null);
                  setCurrentScreen(diseaseBackScreen || 'hub');
                }}
                className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200/85 border border-slate-200 text-slate-800 text-xs font-bold px-4 py-2 rounded-full transition-all duration-300 cursor-pointer shadow-sm mb-8"
              >
                <ArrowRight className="w-4 h-4 text-indigo-600" />
                <span>{diseaseBackScreen === 'patient_dashboard' ? 'بازگشت به پنل کاربری بیمار' : 'بازگشت به صفحه اصلی'}</span>
              </button>

              {!selectedDept ? (
                // A. Render Grid of Departments
                <div>
                  <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-right">
                    <div>
                      <h2 className="text-3xl font-black text-slate-800 mb-2">بانک اطلاعاتی بخش‌های بیمارستان</h2>
                      <p className="text-slate-600 text-xs md:text-sm font-bold">بخش مربوطه را جهت مشاهده اطلاعات و آموزش بیماری‌ها انتخاب فرمایید.</p>
                    </div>

                    {/* Search Bar */}
                    <div className="relative w-full md:w-96">
                      <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="جستجوی بیماری، دارو یا بخش..."
                        value={dbSearchQuery}
                        onChange={(e) => setDbSearchQuery(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-200 text-slate-800 placeholder:text-slate-400 rounded-2xl pr-11 pl-4 py-3.5 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 font-bold shadow-sm text-right"
                      />
                      {dbSearchQuery && (
                        <button
                          onClick={() => setDbSearchQuery('')}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-500 px-2 py-1 rounded font-bold cursor-pointer"
                        >
                          پاک کردن
                        </button>
                      )}
                    </div>
                  </div>

                  {dbSearchQuery.trim() ? (
                    /* Search Results View */
                    <div className="space-y-6 text-right">
                      <h3 className="text-sm font-black text-slate-500">نتایج جستجو برای «{dbSearchQuery}» ({
                        diseases.filter(d =>
                          d.name.toLowerCase().includes(dbSearchQuery.toLowerCase()) ||
                          d.englishName.toLowerCase().includes(dbSearchQuery.toLowerCase()) ||
                          d.description.toLowerCase().includes(dbSearchQuery.toLowerCase()) ||
                          d.educationalContent.toLowerCase().includes(dbSearchQuery.toLowerCase())
                        ).length +
                        departments.filter(dept => dept.name.toLowerCase().includes(dbSearchQuery.toLowerCase())).length
                      } مورد یافت شد)</h3>

                      {/* Matching Departments */}
                      {departments.filter(dept => dept.name.toLowerCase().includes(dbSearchQuery.toLowerCase())).length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-xs font-black text-indigo-600">بخش‌های درمانی منطبق:</h4>
                          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {departments.filter(dept => dept.name.toLowerCase().includes(dbSearchQuery.toLowerCase())).map(dept => {
                              const deptDiseases = diseases.filter(d => d.departmentId === dept.id);
                              const style = getDeptTileStyle(dept.id, dept.color);
                              return (
                                <div
                                  key={dept.id}
                                  onClick={() => {
                                    setSelectedDept(dept);
                                    setDbSearchQuery(''); // clear query on selection
                                  }}
                                  className={`${style.bg} backdrop-blur-xl rounded-[2rem] p-6 shadow-xl border hover:scale-[1.03] active:scale-[0.97] transition-all duration-300 cursor-pointer flex flex-col justify-between`}
                                >
                                  <div>
                                    <div className={`${style.iconBg} p-3 rounded-2xl w-fit border`}>
                                      <DepartmentIcon id={dept.id} emoji={dept.emoji} className="w-6 h-6" />
                                    </div>
                                    <h3 className={`text-lg font-black ${style.textColor} mt-4`}>{dept.name}</h3>
                                  </div>
                                  <div className="mt-6 flex justify-between items-center">
                                    <span className="text-[10px] bg-white/60 text-slate-600 px-2.5 py-1 rounded-lg border border-slate-200/50 font-black">
                                      {deptDiseases.length} بیماری آموزش‌داده شده
                                    </span>
                                    <ChevronLeft className={`w-4 h-4 ${style.textColor}`} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Matching Diseases */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-black text-indigo-600">بیماری‌ها و دستورالعمل‌های آموزشی منطبق:</h4>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                          {diseases.filter(d =>
                            d.name.toLowerCase().includes(dbSearchQuery.toLowerCase()) ||
                            d.englishName.toLowerCase().includes(dbSearchQuery.toLowerCase()) ||
                            d.description.toLowerCase().includes(dbSearchQuery.toLowerCase()) ||
                            d.educationalContent.toLowerCase().includes(dbSearchQuery.toLowerCase())
                          ).map(d => {
                            const dept = departments.find(dep => dep.id === d.departmentId);
                            return (
                              <div
                                key={d.id}
                                onClick={() => {
                                  setSelectedDept(dept || null);
                                  setSelectedDisease(d);
                                  setDbSearchQuery(''); // clear query on selection
                                }}
                                className="bg-white border border-slate-200 hover:border-indigo-400 p-6 rounded-[2rem] shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col justify-between"
                              >
                                <div>
                                  <div className="flex justify-between items-center mb-4">
                                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2.5 py-1 rounded-md font-mono font-bold">
                                      {d.englishName}
                                    </span>
                                    {dept && (
                                      <span className="text-[9px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100 font-black font-sans">
                                        بخش: {dept.name}
                                      </span>
                                    )}
                                  </div>
                                  <h4 className="text-base font-black text-slate-800 mb-2">{d.name}</h4>
                                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{stripHtmlTags(d.description)}</p>
                                </div>
                                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end text-[10px] text-indigo-600 font-bold">
                                  <span>مشاهده جزئیات بیماری و راهنمای ترخیص ←</span>
                                </div>
                              </div>
                            );
                          })}
                          {diseases.filter(d =>
                            d.name.toLowerCase().includes(dbSearchQuery.toLowerCase()) ||
                            d.englishName.toLowerCase().includes(dbSearchQuery.toLowerCase()) ||
                            d.description.toLowerCase().includes(dbSearchQuery.toLowerCase()) ||
                            d.educationalContent.toLowerCase().includes(dbSearchQuery.toLowerCase())
                          ).length === 0 && (
                            <p className="text-xs text-slate-500 font-bold py-6 text-center sm:col-span-2 lg:col-span-3">هیچ بیماری یا مطلبی یافت نشد.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Original Grid of Departments */
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {departments.map(dept => {
                      const deptDiseases = diseases.filter(d => d.departmentId === dept.id);
                      const style = getDeptTileStyle(dept.id, dept.color);
                      return (
                        <div
                          key={dept.id}
                          onClick={() => setSelectedDept(dept)}
                          className={`${style.bg} backdrop-blur-xl rounded-[2rem] p-6 shadow-xl border hover:scale-[1.03] active:scale-[0.97] transition-all duration-300 cursor-pointer flex flex-col justify-between`}
                        >
                          <div>
                            {/* Glassy icon container */}
                            <div className={`mb-4 ${style.iconBg} p-3 rounded-2xl w-fit shadow-md glassy-icon-container`}>
                              <DepartmentIcon id={dept.id} emoji={dept.emoji} className={`w-8 h-8 ${style.iconColor}`} />
                            </div>
                            <h3 className="text-lg font-black text-slate-850 mb-1">{dept.name}</h3>
                            <p className="text-xs text-slate-500 font-bold mb-4">آرشیو بیماری‌های شایع</p>
                          </div>

                          <div className="border-t border-slate-200/50 pt-3 flex items-center justify-between">
                            <span className={`text-xs ${style.textColor} font-black`}>{deptDiseases.length} بیماری ثبت شده</span>
                            <ChevronLeft className={`w-4 h-4 ${style.textColor}`} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  )}
                </div>
              ) : !selectedDisease ? (
                // B. Render Diseases in Selected Department
                <div>
                  <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        {/* Glassy icon container */}
                        <div className="bg-slate-50 border border-slate-200 p-2 rounded-xl shadow-sm">
                          <DepartmentIcon id={selectedDept.id} emoji={selectedDept.emoji} className="w-6 h-6 text-indigo-600" />
                        </div>
                        <h2 className="text-2xl md:text-3xl font-black text-slate-800">{selectedDept.name}</h2>
                      </div>
                      <p className="text-slate-600 text-xs md:text-sm font-bold">لیست بیماری‌های تحت پوشش این بخش را برای مشاهده اطلاعات انتخاب کنید.</p>
                    </div>
                    <button
                      onClick={() => {
                        if (diseaseBackScreen === 'patient_dashboard') {
                          setSelectedDept(null);
                          setSelectedDisease(null);
                          setCurrentScreen('patient_dashboard');
                        } else {
                          setSelectedDept(null);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200/85 border border-slate-200 text-slate-800 text-xs font-bold px-4 py-2.5 rounded-full transition-all duration-300 cursor-pointer shadow-sm self-start"
                    >
                      <ArrowRight className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{diseaseBackScreen === 'patient_dashboard' ? 'بازگشت به پنل کاربری بیمار' : 'بازگشت به لیست بخش‌ها'}</span>
                    </button>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    {diseases.filter(d => d.departmentId === selectedDept.id).map(disease => (
                      <div
                        key={disease.id}
                        onClick={() => setSelectedDisease(disease)}
                        className="glass-card rounded-[2rem] p-6 shadow-md border border-slate-200 hover:border-indigo-400 hover:scale-[1.02] transition-all duration-300 cursor-pointer flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <h3 className="text-lg font-black text-slate-800">{disease.name}</h3>
                            <span className="text-xs font-mono text-indigo-600 font-black uppercase">{disease.englishName}</span>
                          </div>
                          <p className="text-slate-600 text-xs leading-relaxed mb-4 line-clamp-2 font-semibold">
                            {stripHtmlTags(disease.description)}
                          </p>
                        </div>
                        <div className="border-t border-slate-150 pt-3 flex items-center justify-between text-xs text-indigo-600 font-extrabold">
                          <span>مشاهده توضیحات، رژیم و سطح‌بندی درمان</span>
                          <ChevronLeft className="w-4 h-4" />
                        </div>
                      </div>
                    ))}
                    {diseases.filter(d => d.departmentId === selectedDept.id).length === 0 && (
                      <div className="col-span-2 text-center py-12 bg-slate-50 rounded-3xl border border-slate-200 text-slate-500 text-xs font-semibold">
                        مطلبی در این بخش هنوز بارگذاری نشده است.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                // C. Render Selected Disease Details & Education
                <div className="glass-panel rounded-[2.5rem] p-6 md:p-10 shadow-2xl border border-slate-200 bg-white text-right space-y-6">

                  {/* Subheader */}
                  <div className="border-b border-slate-200 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-xs md:text-sm text-slate-500 font-bold mb-1">
                        <span>{selectedDept?.name}</span>
                        <ChevronLeft className="w-4 h-4 text-indigo-500" />
                        <span className="text-indigo-600 font-black">{selectedDisease.name}</span>
                      </div>
                      <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 leading-tight">
                        {selectedDisease.name}
                      </h2>
                      <p className="text-xs font-mono text-indigo-600 font-bold uppercase mt-1">{selectedDisease.englishName}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (diseaseBackScreen === 'patient_dashboard') {
                          setSelectedDept(null);
                          setSelectedDisease(null);
                          setCurrentScreen('patient_dashboard');
                        } else {
                          setSelectedDisease(null);
                        }
                      }}
                      className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 text-xs md:text-sm font-bold px-5 py-3 rounded-2xl transition-all cursor-pointer shadow-sm self-start"
                    >
                      <ArrowRight className="w-4 h-4 text-indigo-600" />
                      <span>{diseaseBackScreen === 'patient_dashboard' ? 'بازگشت به پنل کاربری بیمار' : 'بازگشت به لیست بیماری‌ها'}</span>
                    </button>
                  </div>

                  {/* Body Content - Spacious full-width container for comfortable reading */}
                  <div className="w-full space-y-6">
                    <section className="bg-slate-50/90 rounded-3xl p-6 md:p-10 border border-slate-200/80 shadow-sm w-full">
                      <FormattedText
                        content={selectedDisease.description}
                        className="text-slate-800 text-base md:text-lg lg:text-xl leading-relaxed md:leading-loose text-justify font-bold"
                      />

                      {selectedDisease.educationalContent && (
                        <div className="mt-6 pt-6 border-t border-slate-200">
                          <FormattedText
                            content={selectedDisease.educationalContent}
                            className="text-slate-800 text-base md:text-lg lg:text-xl leading-relaxed md:leading-loose text-justify font-bold"
                          />
                        </div>
                      )}

                      {selectedDisease.attachmentImages && selectedDisease.attachmentImages.length > 0 && (
                        <div className="mt-8 pt-6 border-t border-slate-200 space-y-4">
                          <h4 className="text-xs sm:text-sm font-black text-slate-700 uppercase tracking-wider">
                            <span>تصاویر ضمیمه و مستندات آموزشی بیماری:</span>
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {selectedDisease.attachmentImages.map((imgUrl, idx) => (
                              <div
                                key={idx}
                                className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 shadow-md group relative flex flex-col"
                              >
                                <div className="relative flex-1 flex items-center justify-center overflow-hidden min-h-[14rem]">
                                  <img
                                    src={imgUrl}
                                    alt={`ضمیمه بیماری ${idx + 1}`}
                                    className="w-full h-auto max-h-[28rem] object-contain mx-auto"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                                <div className="bg-slate-900/95 border-t border-slate-800 p-3.5 flex items-center justify-between gap-3">
                                  <span className="text-xs text-slate-300 font-bold">تصویر ضمیمه {idx + 1}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const a = document.createElement('a');
                                      a.href = imgUrl;
                                      a.download = `${selectedDisease.id}-attachment-${idx + 1}.png`;
                                      document.body.appendChild(a);
                                      a.click();
                                      document.body.removeChild(a);
                                    }}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md active:scale-95"
                                    title="دانلود تصویر ضمیمه"
                                  >
                                    <Download className="w-4 h-4" />
                                    <span>دانلود تصویر</span>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </section>
                  </div>

                </div>
              )}

            </motion.div>
          )}

          {/* 4. PATIENT LOGIN SCREEN */}
          {currentScreen === 'patient_login' && (
            <motion.div
              key="patient_login"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-md mx-auto px-4 py-12 animate-fade-in"
            >
              <button
                onClick={() => setCurrentScreen('hub')}
                className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200/80 border border-slate-250 text-slate-800 text-xs font-bold px-4 py-2 rounded-full transition-all duration-300 cursor-pointer shadow-sm mb-6"
              >
                <ArrowRight className="w-4 h-4 text-indigo-600" />
                <span>بازگشت به صفحه اصلی</span>
              </button>

              <div className="glass-panel rounded-[2.5rem] p-8 shadow-2xl border border-slate-200">
                <div className="text-center mb-6">
                  {/* Glassy icon container */}
                  <div className="bg-slate-100 border border-slate-200 text-indigo-600 p-4 rounded-2xl w-fit mx-auto mb-4 shadow-sm">
                    <User className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-black text-slate-800">سامانه پیگیری وضعیت درمانی بیمار</h3>
                  <p className="text-xs text-slate-600 mt-1">لطفاً کد کاربری، رمز ورود، بخش و تاریخ بستری را وارد فرمایید.</p>
                </div>

                <form onSubmit={handlePatientLoginSubmit} className="space-y-4">
                  {patientLoginError && (
                    <div className="bg-rose-50 text-rose-800 text-xs font-medium p-3 rounded-xl border border-rose-200 leading-relaxed text-justify flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                      <span>{patientLoginError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">کد کاربری بیمار:</label>
                    <input
                      type="text"
                      placeholder="کد کاربری خود را وارد کنید"
                      value={patientLoginUserCode}
                      onChange={(e) => setPatientLoginUserCode(e.target.value)}
                      className="w-full text-sm bg-white border border-slate-300 text-slate-850 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400/50 transition-all duration-200 placeholder:text-slate-400 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">رمز ورود:</label>
                    <input
                      type="password"
                      placeholder="رمز ورود خود را وارد فرمایید"
                      value={patientLoginPassword}
                      onChange={(e) => setPatientLoginPassword(e.target.value)}
                      className="w-full text-sm bg-white border border-slate-300 text-slate-850 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400/50 transition-all duration-200 placeholder:text-slate-400 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">بخش بستری شده:</label>
                    <select
                      value={patientLoginDept}
                      onChange={(e) => setPatientLoginDept(e.target.value)}
                      className="w-full text-sm bg-white border border-slate-300 text-slate-850 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400/50 transition-all duration-200 font-bold cursor-pointer"
                    >
                      <option value="" className="text-slate-400">-- انتخاب بخش بیمارستان --</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id} className="text-slate-850">{d.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">تاریخ بستری (هجری شمسی):</label>
                    <ShamsiDatePicker
                      value={patientLoginAdmissionDate}
                      onChange={(val) => setPatientLoginAdmissionDate(val)}
                      placeholder="انتخاب تاریخ بستری..."
                      isDark={false}
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-600 hover:via-blue-700 hover:to-indigo-700 text-white font-black py-3 rounded-xl text-sm shadow-xl shadow-blue-500/10 hover:shadow-blue-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 cursor-pointer mt-3"
                  >
                    ورود به کارتابل درمانی
                  </button>
                </form>



              </div>
            </motion.div>
          )}

          {/* 5. PATIENT DASHBOARD */}
          {currentScreen === 'patient_dashboard' && currentUser && (
            <motion.div
              key="patient_dashboard"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="max-w-7xl mx-auto px-4 py-8 animate-fade-in"
            >
              {/* Profile Card Summary */}
              <div className="bg-slate-900 border border-slate-800 text-white rounded-[2.5rem] p-6 md:p-8 shadow-2xl mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-sky-400/10 to-transparent rounded-bl-full pointer-events-none" />

                <div className="z-10 text-right">
                  <div className="flex items-center gap-2 text-sky-300 text-xs font-bold mb-2">
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                    <span>پورتال بیمار • پرونده درمانی فعال</span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-black mb-3 text-white">بیمار گرامی: {currentUser.name}</h2>
                  <div className="flex flex-wrap gap-x-6 gap-y-3.5 text-xs md:text-sm text-slate-200 font-medium">
                    <span><strong>شماره پرونده:</strong> <span className="text-sky-300 font-bold">{currentUser.fileNumber}</span></span>
                    <span><strong>کد ملی:</strong> <span className="text-sky-300 font-bold">{currentUser.nationalId}</span></span>
                    <span><strong>بخش بستری:</strong> <span className="text-indigo-300 font-bold">{departments.find(d => d.id === currentUser.departmentId)?.name}</span></span>
                    <span><strong>نوع بیماری:</strong> <span className="text-indigo-300 font-bold">{diseases.find(d => d.id === currentUser.diseaseId)?.name}</span></span>
                  </div>
                </div>

                {/* Logout and Status Box */}
                <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-stretch sm:items-center md:items-stretch lg:items-center gap-4 self-stretch md:self-auto shrink-0 z-10">
                  <button
                    onClick={() => {
                      setCurrentUser(null);
                      setCurrentScreen('hub');
                    }}
                    className="inline-flex items-center justify-center gap-2 bg-rose-600/95 hover:bg-rose-700 text-white text-xs font-bold px-4 py-3 rounded-xl transition-all duration-300 cursor-pointer shadow-md hover:scale-[1.02] active:scale-100"
                  >
                    <ArrowRight className="w-4 h-4" />
                    <span>خروج از کارتابل بیمار</span>
                  </button>

                  <div className={`border rounded-2xl p-4 flex flex-col justify-center items-center shadow-inner transition-all duration-300 ${currentUser.satisfactionSurvey ? 'bg-emerald-500/20 border-emerald-500/40 shadow-emerald-950/20' : 'bg-white/10 border-white/20'}`}>
                    <span className="text-[11px] text-slate-300 mb-1.5 font-bold">آخرین وضعیت ارزیابی شما:</span>
                    {currentUser.satisfactionSurvey ? (
                      <span className="text-xs font-black bg-emerald-500 text-white px-3 py-1 rounded-full border border-emerald-400 shadow-md">ثبت رضایت‌سنجی (سبز)</span>
                    ) : currentUser.followupStatus === 'pending' ? (
                      <span className="text-xs font-black bg-slate-800/80 text-slate-300 px-3 py-1 rounded-full border border-white/10">ثبت نشده</span>
                    ) : currentUser.followupStatus === 'green' ? (
                      <span className="text-xs font-black bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full border border-emerald-500/30 shadow-md">منطقه سبز (ایمن)</span>
                    ) : currentUser.followupStatus === 'yellow' ? (
                      <span className="text-xs font-black bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full border border-amber-500/30 shadow-md">منطقه زرد (هشدار)</span>
                    ) : (
                      <span className="text-xs font-black bg-rose-500/20 text-rose-300 px-3 py-1 rounded-full border border-rose-500/30 shadow-md animate-pulse">منطقه قرمز (اورژانس)</span>
                    )}
                  </div>
                </div>
              </div>

              {/* TRIAGE STATUS COLOR BOX AT TOP OF PATIENT PANEL */}
              <div className="mb-8">
                {currentUser.followupStatus === 'red' ? (
                  <div className="bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 border-2 border-rose-400 text-white rounded-[2rem] p-5 sm:p-6 shadow-xl shadow-rose-950/30 relative overflow-hidden">
                    <div className="flex items-center gap-4">
                      <div className="bg-white/20 p-3 sm:p-4 rounded-2xl border border-white/30 shrink-0">
                        <AlertTriangle className="w-7 h-7 sm:w-8 sm:h-8 text-white animate-bounce" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="bg-white text-rose-700 text-xs font-black px-3 py-1 rounded-full shadow">
                            وضعیت تریاژ بیمار: سطح قرمز
                          </span>
                          <span className="text-[11px] font-bold text-rose-100">وضعیت کنترل‌نشده</span>
                        </div>
                        <h4 className="text-base sm:text-lg font-black text-white">وضعیت بیماری شما هنوز کنترل نشده است</h4>
                        <p className="text-xs text-rose-100 mt-1 font-bold leading-relaxed">
                          در صورت بروز علائم حاد یا شدیدتر شدن بیماری، سریعاً به اورژانس بیمارستان مراجعه کرده یا با شماره ۱۱۵ تماس بگیرید.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : currentUser.followupStatus === 'yellow' ? (
                  <div className="bg-gradient-to-r from-amber-500 via-yellow-600 to-amber-600 border-2 border-amber-400 text-white rounded-[2rem] p-5 sm:p-6 shadow-xl shadow-amber-950/30 relative overflow-hidden">
                    <div className="flex items-center gap-4">
                      <div className="bg-white/20 p-3 sm:p-4 rounded-2xl border border-white/30 shrink-0">
                        <AlertCircle className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="bg-white text-amber-800 text-xs font-black px-3 py-1 rounded-full shadow">
                            وضعیت تریاژ بیمار: سطح زرد
                          </span>
                          <span className="text-[11px] font-bold text-amber-100">کنترل ناکافی</span>
                        </div>
                        <h4 className="text-base sm:text-lg font-black text-white">وضعیت بیماری شما به‌صورت ناکافی کنترل شده است</h4>
                        <p className="text-xs text-amber-100 mt-1 font-bold leading-relaxed">
                          لطفاً پایش روزانه علائم و مصرف دقیق داروها را ادامه دهید و جهت مشاوره با کادر درمان از بخش پرسش و پاسخ پیام بفرستید.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : currentUser.followupStatus === 'green' ? (
                  <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 border-2 border-emerald-400 text-white rounded-[2rem] p-5 sm:p-6 shadow-xl shadow-emerald-950/30 relative overflow-hidden">
                    <div className="flex items-center gap-4">
                      <div className="bg-white/20 p-3 sm:p-4 rounded-2xl border border-white/30 shrink-0">
                        <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="bg-white text-emerald-800 text-xs font-black px-3 py-1 rounded-full shadow">
                            وضعیت تریاژ بیمار: سطح سبز
                          </span>
                          <span className="text-[11px] font-bold text-emerald-100">وضعیت ایمن</span>
                        </div>
                        <h4 className="text-base sm:text-lg font-black text-white">وضعیت بیماری شما کنترل و در محدوده ایمن است</h4>
                        <p className="text-xs text-emerald-100 mt-1 font-bold leading-relaxed">
                          شرایط درمانی شما مطلوب می‌باشد. رعایت توصیه‌های خودمراقبتی و ادامه رژیم درمانی ابلاغ‌شده الزامی است.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900 border-2 border-slate-600 text-white rounded-[2rem] p-5 sm:p-6 shadow-xl relative overflow-hidden">
                    <div className="flex items-center gap-4">
                      <div className="bg-white/10 p-3 sm:p-4 rounded-2xl border border-white/20 shrink-0">
                        <Clock className="w-7 h-7 sm:w-8 sm:h-8 text-slate-300" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="bg-slate-600 text-white text-xs font-black px-3 py-1 rounded-full">
                            وضعیت تریاژ بیمار: در انتظار ارزیابی
                          </span>
                        </div>
                        <h4 className="text-base sm:text-lg font-black text-white">ارزیابی اولیه‌ی سطح تریاژ انجام نشده است</h4>
                        <p className="text-xs text-slate-300 mt-1 font-bold leading-relaxed">
                          کادر درمان بخش پس از بررسی گزارش‌های شما سطح تریاژ را به‌روزرسانی خواهند کرد.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SURVEY SUCCESS NOTIFICATION ALERT */}
              {showSurveySuccessNotification && (
                <div className="bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-600 border-2 border-emerald-400 text-white rounded-[2rem] p-6 shadow-xl mb-8 relative overflow-hidden animate-fade-in text-right">
                  <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full pointer-events-none" />
                  <div className="flex items-start justify-between gap-4 relative z-10">
                    <div className="flex items-center gap-4">
                      <div className="bg-white/20 p-3.5 rounded-2xl border border-white/20 shrink-0">
                        <Smile className="w-8 h-8 text-white animate-bounce-slow" />
                      </div>
                      <div>
                        <h4 className="text-lg font-black mb-1.5">ارزیابی رضایت‌مندی شما با موفقیت ثبت شد!</h4>
                        <p className="text-xs text-emerald-50/90 leading-relaxed font-semibold">
                          بیمار گرامی؛ نظرات ارزشمند شما با موفقیت در سامانه بیمارستان ثبت گردید. کادر درمانی از پاسخ‌دهی شما کمال تشکر را دارد. آخرین وضعیت ارزیابی شما هم‌اکنون به حالت ایمن و ثبت رضایت‌مندی (سبز) تغییر یافته است.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowSurveySuccessNotification(false)}
                      className="text-white bg-black/20 hover:bg-black/35 px-4 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap self-center shrink-0 cursor-pointer"
                    >
                      بستن اعلان
                    </button>
                  </div>
                </div>
              )}

              {/* TILE NAVIGATION FOR MAIN PATIENT DASHBOARD */}
              {patientTab === 'grid' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-black text-slate-800 mb-1 flex items-center gap-2">
                      <LayoutGrid className="w-5 h-5 text-sky-500 animate-pulse" />
                      <span>پنل کاربری بیمار و خدمات خودمراقبتی</span>
                    </h3>
                    <p className="text-xs text-slate-500 font-bold">بخش‌های زیر جهت فرآیند مراقبت و آموزش برای شما فعال گردیده است:</p>
                  </div>

                  <div className="grid md:grid-cols-3 gap-6">
                    {/* Tile 1: Education */}
                    <div
                      onClick={() => setPatientTab('education')}
                      className="group bg-gradient-to-br from-cyan-500 to-blue-600 p-6 sm:p-8 rounded-[2rem] cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:shadow-xl hover:shadow-cyan-500/20 flex flex-col justify-between min-h-[190px] shadow-lg border-0 text-right text-white"
                    >
                      <div className="flex justify-between items-center w-full">
                        <div className="bg-white/20 text-white p-4 rounded-2xl border border-white/20 group-hover:bg-white group-hover:text-cyan-600 transition-all duration-300 w-fit">
                          <BookOpen className="w-6 h-6" />
                        </div>
                        <span className="text-[10px] bg-white/20 text-white px-2.5 py-1 rounded-lg border border-white/20 font-black">آموزش مستقیم</span>
                      </div>
                      <div className="mt-4 flex-1 flex flex-col justify-between">
                        <div>
                          <h3 className="text-base font-black text-white mb-1.5">آموزش و راهنمای خود مراقبتی</h3>
                          <p className="text-[10px] text-cyan-100 bg-white/10 px-2.5 py-1 rounded-md w-fit font-black mb-3 border border-white/10">موضوع: {diseases.find(d => d.id === currentUser.diseaseId)?.name}</p>
                        </div>
                        <p className="text-[10px] text-cyan-100 font-bold mt-3 text-left group-hover:text-white transition-colors">مشاهده کتابچه کامل و فایل‌های پیوست ←</p>
                      </div>
                    </div>

                    {/* Tile 2: Q&A */}
                    <div
                      onClick={() => setPatientTab('qa')}
                      className="group bg-gradient-to-br from-indigo-500 to-purple-600 p-6 sm:p-8 rounded-[2rem] cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:shadow-xl hover:shadow-indigo-500/20 flex flex-col justify-between min-h-[190px] shadow-lg border-0 text-right text-white"
                    >
                      <div className="flex justify-between items-center w-full">
                        <div className="bg-white/20 text-white p-4 rounded-2xl border border-white/20 group-hover:bg-white group-hover:text-indigo-600 transition-all duration-300 w-fit">
                          <MessageSquare className="w-6 h-6" />
                        </div>
                        <span className="text-[10px] bg-white/20 text-white px-2.5 py-1 rounded-lg border border-white/20 font-black">گفتگو و پشتیبانی</span>
                      </div>
                      <div className="mt-4">
                        <h3 className="text-base font-black text-white mb-1.5">پرسش و پاسخ با کادر درمان</h3>
                        <p className="text-[11px] text-indigo-100 font-medium leading-relaxed">ارتباط مستقیم با پزشکان و پرستاران بخش جهت مشاوره عوارض دارویی، علائم هشدار دهنده و سوالات درمانی</p>
                      </div>
                    </div>

                    {/* Tile 3: Satisfaction */}
                    <div
                      onClick={() => setPatientTab('satisfaction')}
                      className="group bg-gradient-to-br from-emerald-500 to-teal-600 p-6 sm:p-8 rounded-[2rem] cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:shadow-xl hover:shadow-emerald-500/20 flex flex-col justify-between min-h-[190px] shadow-lg border-0 text-right text-white"
                    >
                      <div className="flex justify-between items-center w-full">
                        <div className="bg-white/20 text-white p-4 rounded-2xl border border-white/20 group-hover:bg-white group-hover:text-emerald-600 transition-all duration-300 w-fit">
                          <HeartHandshake className="w-6 h-6" />
                        </div>
                        <span className="text-[10px] bg-white/20 text-white px-2.5 py-1 rounded-lg border border-white/20 font-black">نظرسنجی</span>
                      </div>
                      <div className="mt-4">
                        <h3 className="text-base font-black text-white mb-1.5">ارزیابی رضایت‌مندی از بیمارستان</h3>
                        <p className="text-[11px] text-emerald-100 font-medium leading-relaxed">تکمیل فرم استاندارد سنجش رضایت بیماران بستری بیمارستان امام رضا (ع) جهت پایش زنده و ارتقای کیفیت مراقبت</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ACTIVE TAB CONTENT */}
              {patientTab !== 'grid' && (
                <div className="bg-white border border-slate-200 shadow-xl rounded-[2.5rem] p-6 md:p-8 relative text-right">

                  {/* A. Education material tab */}
                  {patientTab === 'education' && (
                    <div className="space-y-6">
                      <button
                        onClick={() => setPatientTab('grid')}
                        className="inline-flex items-center gap-2 text-xs font-black text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 px-4 py-2.5 rounded-xl transition-all duration-300 cursor-pointer mb-2"
                      >
                        <ArrowRight className="w-4 h-4" />
                        <span>بازگشت به پنل کاربری</span>
                      </button>

                      {currentUser.guidanceNotes && (
                        <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
                          <h4 className="text-sm font-black text-emerald-800 flex items-center gap-2">
                            <UserCheck className="w-5 h-5 text-emerald-600" />
                            <span>توضیح پزشک معالج جهت راهنمایی بیمار:</span>
                          </h4>
                          <p className="text-xs text-slate-750 leading-relaxed font-bold whitespace-pre-line text-justify">
                            {currentUser.guidanceNotes}
                          </p>
                        </div>
                      )}

                      <div className="p-5 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-3">
                        <h4 className="text-xs font-black text-amber-800 leading-relaxed flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-amber-600 animate-pulse" />
                          <span>مددجوی گرامی پزشک معالج شما مطالعه دقیق بیماری‌های زیر را به شما توصیه می‌کند:</span>
                        </h4>

                        <p className="text-[11px] text-slate-500 font-bold mb-3">
                          با کلیک روی هرکدام از بیماری‌های زیر، به صفحه راهنما و آموزش اختصاصی خودمراقبتی آن ارجاع داده می‌شوید:
                        </p>

                        <div className="flex flex-wrap gap-3">
                          {(() => {
                            const primaryDis = diseases.find(d => d.id === currentUser.diseaseId);
                            const recDiseases: Disease[] = [];
                            if (primaryDis) recDiseases.push(primaryDis);
                            (currentUser.hashtaggedDiseaseIds || []).forEach(id => {
                              const d = diseases.find(dis => dis.id === id);
                              if (d && !recDiseases.some(x => x.id === d.id)) {
                                recDiseases.push(d);
                              }
                            });

                            if (recDiseases.length === 0) {
                              return <p className="text-[11px] text-slate-400 font-bold">هیچ بیماری توصیه‌شده‌ای ثبت نشده است.</p>;
                            }

                            return recDiseases.map(d => {
                              const dept = departments.find(dep => dep.id === d.departmentId);
                              const isPrimary = d.id === currentUser.diseaseId;
                              return (
                                <button
                                  key={d.id}
                                  onClick={() => {
                                    setSelectedDept(dept || null);
                                    setSelectedDisease(d);
                                    setDiseaseBackScreen('patient_dashboard');
                                    setCurrentScreen('db_departments');
                                  }}
                                  className={`px-4 py-3 rounded-xl text-xs font-black shadow-sm transition-all duration-300 flex items-center gap-2 hover:scale-[1.02] cursor-pointer border ${
                                    isPrimary
                                      ? 'bg-blue-50 hover:bg-blue-100/80 border-blue-200 text-blue-900'
                                      : 'bg-white hover:bg-amber-50/55 border-amber-200 text-slate-800'
                                  }`}
                                >
                                  <span className={isPrimary ? 'text-blue-500 font-black' : 'text-amber-500 font-black'}>#</span>
                                  <span>{d.name} {dept ? `(${dept.name})` : ''}</span>
                                  {isPrimary && <span className="bg-blue-500/10 text-blue-600 text-[9px] px-2 py-0.5 rounded-full font-black">بیماری ترخیصی شما</span>}
                                  <ChevronLeft className={`w-4 h-4 mr-1 ${isPrimary ? 'text-blue-500' : 'text-amber-500'}`} />
                                </button>
                              );
                            });
                          })()}
                        </div>
                      </div>

                      {/* ACTIVE CUSTOM SELF-CARE CHECKLISTS */}
                      {currentUser.activeChecklistIds && currentUser.activeChecklistIds.length > 0 && (
                        <div className="p-5 bg-emerald-50/40 border border-emerald-200 rounded-2xl space-y-3">
                          <h4 className="text-sm font-black text-emerald-800 flex items-center gap-2">
                            <ClipboardCheck className="w-5 h-5 text-emerald-600" />
                            <span>چک‌لیست‌های فعال خودارزیابی و مراقبت در منزل شما:</span>
                          </h4>
                          <p className="text-xs text-slate-600 font-bold leading-relaxed mb-3">
                            با کلیک روی هرکدام از چک‌لیست‌های زیر، فرم ارزیابی روزانه مربوطه را پر کنید تا کادر درمان از وضعیت پایش شما آگاه شوند:
                          </p>
                          <div className="flex flex-wrap gap-3">
                            {currentUser.activeChecklistIds.map(checklistId => {
                              const chk = customChecklists.find(c => c.id === checklistId);
                              if (!chk) return null;
                              return (
                                <button
                                  key={checklistId}
                                  onClick={() => {
                                    setActiveFillingChecklist(chk);
                                    setPatientChecklistAnswers({});
                                  }}
                                  className="bg-white hover:bg-emerald-50 border border-emerald-200 hover:border-emerald-400 rounded-xl px-4 py-3 text-xs font-black text-slate-800 shadow-sm transition-all duration-300 flex items-center gap-2 hover:scale-[1.02] cursor-pointer"
                                >
                                  <HeartHandshake className="w-4 h-4 text-emerald-500 animate-pulse" />
                                  <span>{chk.title}</span>
                                  <ChevronLeft className="w-4 h-4 text-emerald-500 mr-1" />
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* C. Chat and Q&A page */}
                  {patientTab === 'qa' && (
                    <div className="space-y-4">
                      <button
                        onClick={() => setPatientTab('grid')}
                        className="inline-flex items-center gap-2 text-xs font-black text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 px-4 py-2.5 rounded-xl transition-all duration-300 cursor-pointer mb-2"
                      >
                        <ArrowRight className="w-4 h-4" />
                        <span>بازگشت به پنل کاربری</span>
                      </button>

                      <div className="flex flex-col h-[600px] bg-slate-50 rounded-[2rem] border border-slate-200 overflow-hidden relative shadow-md">
                    {/* Chat Header */}
                    <div className="bg-slate-100 p-4 border-b border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center">
                          <MessageSquare className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-slate-800">گفتگو با کادر درمان بیمارستان</h4>
                          <span className="text-[10px] text-emerald-600 flex items-center gap-1 font-bold mt-0.5">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                            <span>مسئولین بخش آنلاین هستند</span>
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] bg-white border border-slate-200 text-slate-700 px-3 py-1 rounded-full font-mono font-black">
                        تعداد پیام‌ها: {messages.filter(m => m.patientId === currentUser.nationalId).length}
                      </span>
                    </div>

                    {/* Chat Messages Stream */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 flex flex-col-reverse bg-white">
                      {/* Sort messages from newest to oldest since flex-col-reverse will render them correctly from bottom to top */}
                      {[...messages]
                        .filter(m => m.patientId === currentUser.nationalId)
                        .sort((a, b) => new Date(b.askedAt).getTime() - new Date(a.askedAt).getTime())
                        .map((msg) => (
                          <div key={msg.id} className="space-y-4">
                            {/* Patient Message (On Right) */}
                            <div className="flex justify-end">
                              <div className="max-w-[85%] md:max-w-[70%] space-y-1.5">
                                <div className="bg-indigo-600 text-white rounded-3xl rounded-tr-none px-4 py-3 shadow-md border border-indigo-750">
                                  <p className="text-xs md:text-sm font-semibold leading-relaxed whitespace-pre-wrap text-justify">
                                    {msg.question}
                                  </p>

                                  {/* Attached file (Patient) */}
                                  {msg.patientFileName && msg.patientFileUrl && (
                                    <div className="mt-2.5 flex items-center justify-between gap-3 bg-black/20 p-2 rounded-xl border border-white/10">
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <Paperclip className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
                                        <span className="text-[10px] text-slate-200 font-bold truncate max-w-[120px]">{msg.patientFileName}</span>
                                      </div>
                                      <a
                                        href={msg.patientFileUrl}
                                        download={msg.patientFileName}
                                        className="bg-indigo-500 hover:bg-indigo-600 text-white text-[9px] px-2.5 py-1 rounded-lg font-black cursor-pointer transition-colors shrink-0"
                                      >
                                        دانلود فایل
                                      </a>
                                    </div>
                                  )}
                                </div>
                                <div className="text-[9px] text-slate-400 font-mono text-left px-2">
                                  {new Date(msg.askedAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                            </div>

                            {/* Doctor Response (On Left) */}
                            {msg.answer ? (
                              <div className="flex justify-start">
                                <div className="max-w-[85%] md:max-w-[70%] space-y-1.5">
                                  <div className="bg-slate-100 text-slate-800 rounded-3xl rounded-tl-none px-4 py-3 shadow-sm border border-slate-200">
                                    <div className="text-[10px] text-indigo-600 font-black mb-1">
                                      {msg.answeredBy || 'کادر درمان'}
                                    </div>
                                    <p className="text-xs md:text-sm font-semibold leading-relaxed whitespace-pre-wrap text-justify">
                                      {msg.answer}
                                    </p>

                                    {/* Attached file (Admin) */}
                                    {msg.adminFileName && msg.adminFileUrl && (
                                      <div className="mt-2.5 flex items-center justify-between gap-3 bg-slate-200 p-2 rounded-xl border border-slate-300">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                          <Paperclip className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                          <span className="text-[10px] text-slate-700 font-bold truncate max-w-[120px]">{msg.adminFileName}</span>
                                        </div>
                                        <a
                                          href={msg.adminFileUrl}
                                          download={msg.adminFileName}
                                          className="bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] px-2.5 py-1 rounded-lg font-black cursor-pointer transition-colors shrink-0"
                                        >
                                          دانلود فایل
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-[9px] text-slate-400 font-mono text-right px-2">
                                    {msg.answeredAt ? new Date(msg.answeredAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }) : ''}
                                  </div>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        ))}

                      {messages.filter(m => m.patientId === currentUser.nationalId).length === 0 && (
                        <div className="text-center py-20 text-slate-400 flex flex-col items-center justify-center gap-3">
                          <MessageSquare className="w-12 h-12 text-slate-300" />
                          <div className="space-y-1">
                            <p className="text-sm font-black text-slate-700">هنوز گفتگویی آغاز نشده است.</p>
                            <p className="text-[11px] text-slate-500 font-semibold">سوال خود را در فیلد زیر تایپ و ارسال کنید تا کادر درمان بخش پاسخ دهد.</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Chat Input Bar */}
                    <form onSubmit={handleAskQuestion} className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
                      {/* Attachment Status Indicator */}
                      {newQuestionFileName && (
                        <div className="flex items-center gap-2.5 bg-indigo-50 border border-indigo-200 px-3 py-2 rounded-xl text-xs text-indigo-700 w-fit">
                          <Paperclip className="w-3.5 h-3.5" />
                          <span className="font-bold truncate max-w-[200px]">{newQuestionFileName}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setNewQuestionFileName('');
                              setNewQuestionFileUrl('');
                            }}
                            className="text-rose-600 hover:text-rose-700 font-black cursor-pointer text-[10px]"
                          >
                            ✖ حذف فایل
                          </button>
                        </div>
                      )}

                      <div className="flex items-center gap-2.5">
                        {/* Hidden File Input */}
                        <label className="flex items-center justify-center p-3 rounded-xl bg-white hover:bg-slate-100 text-slate-600 cursor-pointer border border-slate-200 transition-colors shrink-0 shadow-sm">
                          <input
                            type="file"
                            className="hidden"
                            onChange={handlePatientFileChange}
                          />
                          <Paperclip className="w-5 h-5 text-indigo-600" />
                        </label>

                        {/* Input Field */}
                        <input
                          type="text"
                          value={newQuestionText}
                          onChange={(e) => setNewQuestionText(e.target.value)}
                          placeholder="پیام خود را به کادر درمان بنویسید..."
                          className="flex-1 min-w-0 bg-white text-slate-800 rounded-xl px-4 py-3 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 border border-slate-200 font-bold placeholder:text-slate-400 shadow-sm"
                        />

                        {/* Send Button */}
                        <button
                          type="submit"
                          disabled={!newQuestionText.trim()}
                          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white font-black px-4 md:px-5 py-3 rounded-xl text-xs md:text-sm flex items-center gap-1.5 md:gap-2 transition-all cursor-pointer shadow-md active:scale-95 shrink-0"
                        >
                          <span className="hidden sm:inline">ارسال پیام</span>
                          <span className="sm:hidden">ارسال</span>
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
                )}

                {/* D. Patient Satisfaction Survey Tab */}
                {patientTab === 'satisfaction' && (
                  <div className="space-y-6">
                    <button
                      onClick={() => setPatientTab('grid')}
                      className="inline-flex items-center gap-2 text-xs font-black text-teal-600 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-100 px-4 py-2.5 rounded-xl transition-all duration-300 cursor-pointer mb-2"
                    >
                      <ArrowRight className="w-4 h-4" />
                      <span>بازگشت به پنل کاربری</span>
                    </button>

                    <div className="bg-gradient-to-r from-teal-500/10 via-emerald-500/5 to-sky-500/10 p-6 rounded-3xl border border-teal-500/20 mb-8">
                      <div className="flex items-center gap-3 mb-2">
                        <HeartHandshake className="w-6 h-6 text-teal-600 animate-pulse" />
                        <h3 className="text-xl font-black text-slate-800">چک لیست ارزیابی رضایت‌مندی بیماران</h3>
                      </div>
                      <p className="text-xs text-slate-600 font-black leading-relaxed">
                        بیمار/مددجوی محترم؛ لطفاً با پاسخ دقیق به سوالات زیر، میزان رضایتمندی خود را از خدمات درمانی و رفاهی بیمارستان امام رضا (ع) اعلام فرمایید. بازخورد ارزشمند شما کادر بیمارستان را در ارتقای مستمر کیفیت خدمات یاری خواهد کرد.
                      </p>
                    </div>

                    {surveySuccessMsg && (
                      <div className="bg-emerald-50 border border-emerald-200 text-emerald-950 p-4 rounded-2xl text-xs font-black mb-6 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                        <span>{surveySuccessMsg}</span>
                      </div>
                    )}

                    {surveyErrorMsg && (
                      <div className="bg-rose-50 border border-rose-200 text-rose-950 p-4 rounded-2xl text-xs font-black mb-6 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-rose-600" />
                        <span>{surveyErrorMsg}</span>
                      </div>
                    )}

                    <form onSubmit={handleSatisfactionSurveySubmit} className="space-y-6">
                      {/* Q1-Q17 List */}
                      <div className="bg-white rounded-3xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-sm">
                        {hospitalSurveyQuestions.map((q, index) => (
                          <div key={q.id} className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                            <div className="flex gap-2.5 items-start">
                              <span className="bg-slate-100 text-slate-700 text-xs font-black px-2.5 py-1 rounded-lg shrink-0 mt-0.5">{index + 1}</span>
                              <p className="text-xs sm:text-sm font-bold text-slate-800 leading-relaxed text-justify">{q.text}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 justify-end">
                              {[
                                { val: 'yes', label: 'بله', color: 'peer-checked:bg-emerald-500 peer-checked:text-white hover:bg-emerald-50' },
                                { val: 'partial', label: 'تا حدودی', color: 'peer-checked:bg-amber-500 peer-checked:text-white hover:bg-amber-50' },
                                { val: 'no', label: 'خیر', color: 'peer-checked:bg-rose-500 peer-checked:text-white hover:bg-rose-50' }
                              ].map((opt) => (
                                <label key={opt.val} className="relative cursor-pointer select-none">
                                  <input
                                    type="radio"
                                    name={q.id}
                                    checked={satisfactionSurveyForm[q.id as keyof typeof satisfactionSurveyForm] === opt.val}
                                    onChange={() => setSatisfactionSurveyForm({ ...satisfactionSurveyForm, [q.id]: opt.val })}
                                    className="peer sr-only"
                                  />
                                  <span className={`inline-block text-xs font-black border border-slate-200 rounded-xl px-4 py-2 transition-all duration-200 text-slate-600 bg-white ${opt.color}`}>
                                    {opt.label}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Q18: Overall Satisfaction Rating */}
                      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                        <div className="flex gap-2.5 items-start">
                          <span className="bg-slate-100 text-slate-700 text-xs font-black px-2.5 py-1 rounded-lg shrink-0 mt-0.5">۱۸</span>
                          <h4 className="text-sm font-black text-slate-800">رضایت کلی شما از خدمت‌رسانی بیمارستان چه میزان است؟</h4>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {[
                            { val: 'excellent', label: 'عالی 😍', color: 'peer-checked:bg-indigo-600 peer-checked:text-white hover:bg-indigo-50' },
                            { val: 'good', label: 'خوب 🙂', color: 'peer-checked:bg-emerald-500 peer-checked:text-white hover:bg-emerald-50' },
                            { val: 'average', label: 'متوسط 😐', color: 'peer-checked:bg-amber-500 peer-checked:text-white hover:bg-amber-50' },
                            { val: 'poor', label: 'ضعیف 😞', color: 'peer-checked:bg-rose-500 peer-checked:text-white hover:bg-rose-50' }
                          ].map((opt) => (
                            <label key={opt.val} className="relative cursor-pointer select-none">
                              <input
                                type="radio"
                                name="q18"
                                checked={satisfactionSurveyForm.q18 === opt.val}
                                onChange={() => setSatisfactionSurveyForm({ ...satisfactionSurveyForm, q18: opt.val })}
                                className="peer sr-only"
                              />
                              <span className={`inline-block text-xs font-black border border-slate-200 rounded-2xl px-5 py-3 transition-all duration-200 text-slate-600 bg-white ${opt.color}`}>
                                {opt.label}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Q19-Q20 Text Inputs */}
                      <div className="grid md:grid-cols-2 gap-6">
                        {/* Q19: Praised Staff */}
                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                          <div className="flex gap-2.5 items-start">
                            <span className="bg-slate-100 text-slate-700 text-xs font-black px-2.5 py-1 rounded-lg shrink-0 mt-0.5">۱۹</span>
                            <label className="text-sm font-black text-slate-800">از عملکرد کدام‌یک از پرسنل بخش رضایت کامل دارید؟</label>
                          </div>
                          <input
                            type="text"
                            placeholder="مثال: سرکار خانم محمدی (پرستار بخش)"
                            value={satisfactionSurveyForm.q19}
                            onChange={(e) => setSatisfactionSurveyForm({ ...satisfactionSurveyForm, q19: e.target.value })}
                            className="w-full text-xs bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400/50 font-bold"
                          />
                        </div>

                        {/* Q20: Comments & Suggestions */}
                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                          <div className="flex gap-2.5 items-start">
                            <span className="bg-slate-100 text-slate-700 text-xs font-black px-2.5 py-1 rounded-lg shrink-0 mt-0.5">۲۰</span>
                            <label className="text-sm font-black text-slate-800">در صورتی که پیشنهاد یا انتقادی دارید در این قسمت ذکر کنید:</label>
                          </div>
                          <textarea
                            rows={2}
                            placeholder="انتقادات و پیشنهادات خود را در اینجا بنویسید..."
                            value={satisfactionSurveyForm.q20}
                            onChange={(e) => setSatisfactionSurveyForm({ ...satisfactionSurveyForm, q20: e.target.value })}
                            className="w-full text-xs bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400/50 font-bold resize-none"
                          />
                        </div>
                      </div>

                      {/* Submit Button */}
                      <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-teal-500 via-emerald-500 to-sky-500 hover:from-teal-600 hover:via-emerald-600 hover:to-sky-600 text-white font-black px-8 py-3.5 rounded-2xl text-xs shadow-xl shadow-teal-500/10 hover:shadow-teal-500/30 transition-all duration-300 cursor-pointer hover:scale-[1.01]"
                      >
                        ارسال پاسخنامه رضایت‌مندی بیمار
                      </button>
                    </form>
                  </div>
                )}

                </div>
              )}
            </motion.div>
          )}

          {/* 6. ADMIN DASHBOARD */}
          {currentScreen === 'admin_dashboard' && currentAdmin && (
            <motion.div
              key="admin_dashboard"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-8 overflow-x-hidden"
            >
              {adminTab === 'overview' ? (
                /* Beautiful Tiles Grid Menu */
                <div className="space-y-8 select-none">
                  {/* Dashboard Header Profile */}
                  <div className="bg-white/80 backdrop-blur-md text-slate-800 border border-slate-200 rounded-[2.5rem] p-6 sm:p-8 shadow-xl flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-sky-500/10 via-indigo-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
                    <div className="flex flex-col sm:flex-row items-center gap-5 relative z-10 text-center sm:text-right">
                      <div className="w-16 h-16 bg-gradient-to-tr from-sky-400 via-sky-500 to-indigo-600 rounded-2xl flex items-center justify-center font-black text-2xl text-white shadow-xl border-2 border-sky-300 hover:rotate-6 transition-transform duration-300 shrink-0">
                        {currentAdmin.name.charAt(0)}
                      </div>
                      <div>
                        <span className="block text-[11px] text-sky-600 font-extrabold uppercase tracking-widest">پنل کاربری مدیریت درمان بیمارستان من</span>
                        <h2 className="text-2xl font-black mt-1 text-slate-800">{currentAdmin.name}</h2>
                        <span className="inline-block mt-2 bg-sky-50 text-sky-700 text-xs px-3 py-1.5 rounded-full border border-sky-200 font-black">
                          {currentAdmin.role === 'super' ? '👑 مدیر کل بیمارستان' : `مسئول بخش: ${departments.find(d => d.id === currentAdmin.departmentId)?.name}`}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setCurrentAdmin(null);
                        setCurrentScreen('hub');
                      }}
                      className="bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-black px-6 py-3 rounded-2xl text-xs flex items-center gap-2 border border-rose-400/30 hover:scale-105 active:scale-95 transition-all duration-300 shadow-xl shadow-rose-500/20 cursor-pointer relative z-10 shrink-0"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>خروج از پنل مدیریت</span>
                    </button>
                  </div>

                  {/* Tiles Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {currentAdmin.role === 'super' ? (
                      <>
                        {/* Tile 1: Stats */}
                        <div
                          onClick={() => setAdminTab('stats')}
                          className="group bg-gradient-to-br from-sky-600 via-blue-700 to-indigo-800 text-white border border-sky-400/30 p-6 sm:p-8 rounded-[2.5rem] cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl hover:shadow-sky-500/30 flex flex-col justify-between min-h-[220px] relative overflow-hidden"
                        >
                          <div className="absolute -left-10 -bottom-10 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-500" />
                          <div className="flex justify-between items-start relative z-10">
                            <div className="bg-white/20 backdrop-blur-md text-white p-4 rounded-2xl border border-white/30 group-hover:bg-white group-hover:text-sky-700 transition-all duration-300 shadow-lg">
                              <TrendingUp className="w-6 h-6" />
                            </div>
                            <span className="text-[10px] bg-white/20 text-white backdrop-blur-md px-3 py-1 rounded-xl font-black font-mono border border-white/30">LIVE</span>
                          </div>
                          <div className="relative z-10">
                            <h3 className="text-lg font-black text-white mt-4 group-hover:translate-x-1 transition-transform">آمار و شاخص‌های بیمارستان</h3>
                            <p className="text-xs text-sky-100 font-medium mt-2 leading-relaxed">بررسی شاخص‌های کیفیت درمان، رضایتمندی ترخیص و پیگیری‌های آماری زنده وزارت بهداشت</p>
                          </div>
                        </div>

                        {/* Tile 2: Register */}
                        <div
                          onClick={() => {
                            setAdminTab('register');
                            setRegSuccessMsg('');
                            setRegErrorMsg('');
                          }}
                          className="group bg-gradient-to-br from-emerald-600 via-teal-700 to-cyan-800 text-white border border-emerald-400/30 p-6 sm:p-8 rounded-[2.5rem] cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl hover:shadow-emerald-500/30 flex flex-col justify-between min-h-[220px] relative overflow-hidden"
                        >
                          <div className="absolute -left-10 -bottom-10 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-500" />
                          <div className="bg-white/20 backdrop-blur-md text-white p-4 rounded-2xl border border-white/30 group-hover:bg-white group-hover:text-emerald-700 transition-all duration-300 w-fit relative z-10 shadow-lg">
                            <PlusCircle className="w-6 h-6" />
                          </div>
                          <div className="relative z-10">
                            <h3 className="text-lg font-black text-white mt-4 group-hover:translate-x-1 transition-transform">ثبت بیمار/مددجوی جدید</h3>
                            <p className="text-xs text-emerald-100 font-medium mt-2 leading-relaxed">ورود اطلاعات بیمار جهت اعطای دسترسی به سامانه آموزش بیمار از بدو بستری تا بعد ترخیص و کارتابل پیگیری</p>
                          </div>
                        </div>

                        {/* Tile 3: Patients */}
                        <div
                          onClick={() => setAdminTab('patients')}
                          className="group bg-gradient-to-br from-indigo-600 via-purple-700 to-fuchsia-800 text-white border border-indigo-400/30 p-6 sm:p-8 rounded-[2.5rem] cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl hover:shadow-indigo-500/30 flex flex-col justify-between min-h-[220px] relative overflow-hidden"
                        >
                          <div className="absolute -left-10 -bottom-10 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-500" />
                          <div className="flex justify-between items-start relative z-10">
                            <div className="bg-white/20 backdrop-blur-md text-white p-4 rounded-2xl border border-white/30 group-hover:bg-white group-hover:text-indigo-700 transition-all duration-300 shadow-lg">
                              <ClipboardList className="w-6 h-6" />
                            </div>
                            <span className="text-[10px] bg-white/20 text-white backdrop-blur-md px-3 py-1 rounded-xl font-black font-mono border border-white/30">{patients.length} بیمار</span>
                          </div>
                          <div className="relative z-10">
                            <h3 className="text-lg font-black text-white mt-4 group-hover:translate-x-1 transition-transform">لیست بیماران و پیگیری‌ها</h3>
                            <p className="text-xs text-indigo-100 font-medium mt-2 leading-relaxed">مشاهده وضعیت روزانه بیماران، زمان پاسخ‌دهی خودارزیابی‌ها و آلارم‌های اورژانسی کدهای ترخیص</p>
                          </div>
                        </div>

                        {/* Tile 4: QA */}
                        <div
                          onClick={() => setAdminTab('qa')}
                          className="group bg-gradient-to-br from-amber-500 via-orange-600 to-rose-700 text-white border border-amber-400/30 p-6 sm:p-8 rounded-[2.5rem] cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl hover:shadow-amber-500/30 flex flex-col justify-between min-h-[220px] relative overflow-hidden"
                        >
                          <div className="absolute -left-10 -bottom-10 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-500" />
                          <div className="flex justify-between items-start relative z-10">
                            <div className="bg-white/20 backdrop-blur-md text-white p-4 rounded-2xl border border-white/30 group-hover:bg-white group-hover:text-amber-700 transition-all duration-300 shadow-lg">
                              <MessageSquare className="w-6 h-6" />
                            </div>
                            {messages.filter(m => !m.answer).length > 0 && (
                              <span className="text-[10px] bg-white text-rose-600 px-3 py-1 rounded-xl font-black font-mono shadow-md animate-pulse">{messages.filter(m => !m.answer).length} جدید</span>
                            )}
                          </div>
                          <div className="relative z-10">
                            <h3 className="text-lg font-black text-white mt-4 group-hover:translate-x-1 transition-transform">پاسخ به سوالات بیماران</h3>
                            <p className="text-xs text-amber-100 font-medium mt-2 leading-relaxed">پاسخگویی سریع پزشکان بخش به دغدغه‌های درمانی، عوارض دارویی و سوالات متداول بیماران ترخیصی</p>
                          </div>
                        </div>

                        {/* Tile 5: Disease Edit */}
                        <div
                          onClick={() => {
                            setAdminTab('disease_edit');
                            setDiseaseEditSuccess('');
                          }}
                          className="group bg-gradient-to-br from-fuchsia-600 via-pink-600 to-rose-700 text-white border border-fuchsia-400/30 p-6 sm:p-8 rounded-[2.5rem] cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl hover:shadow-fuchsia-500/30 flex flex-col justify-between min-h-[220px] relative overflow-hidden"
                        >
                          <div className="absolute -left-10 -bottom-10 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-500" />
                          <div className="bg-white/20 backdrop-blur-md text-white p-4 rounded-2xl border border-white/30 group-hover:bg-white group-hover:text-fuchsia-700 transition-all duration-300 w-fit relative z-10 shadow-lg">
                            <BookOpen className="w-6 h-6" />
                          </div>
                          <div className="relative z-10">
                            <h3 className="text-lg font-black text-white mt-4 group-hover:translate-x-1 transition-transform">مدیریت مطالب آموزشی</h3>
                            <p className="text-xs text-fuchsia-100 font-medium mt-2 leading-relaxed">بارگذاری بروشورهای رژیم‌های درمانی، خودمراقبتی پاتوفیزیولوژی بیماری‌ها و دستورالعمل‌های ترخیص بیمار</p>
                          </div>
                        </div>

                        {/* Tile 6: Admins Manage */}
                        <div
                          onClick={() => {
                            setAdminTab('admins_manage');
                            setAdminManageMsg('');
                          }}
                          className="group bg-gradient-to-br from-rose-600 via-red-700 to-amber-800 text-white border border-rose-400/30 p-6 sm:p-8 rounded-[2.5rem] cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl hover:shadow-rose-500/30 flex flex-col justify-between min-h-[220px] relative overflow-hidden"
                        >
                          <div className="absolute -left-10 -bottom-10 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-500" />
                          <div className="bg-white/20 backdrop-blur-md text-white p-4 rounded-2xl border border-white/30 group-hover:bg-white group-hover:text-rose-700 transition-all duration-300 w-fit relative z-10 shadow-lg">
                            <Users className="w-6 h-6" />
                          </div>
                          <div className="relative z-10">
                            <h3 className="text-lg font-black text-white mt-4 group-hover:translate-x-1 transition-transform">معرفی مسئولین بخش‌ها</h3>
                            <p className="text-xs text-rose-100 font-medium mt-2 leading-relaxed">مدیریت کادر درمان، اختصاص دادن نقش مسئول بخش به پزشکان و پرستاران و نظارت بر دسترسی بخش‌ها</p>
                          </div>
                        </div>

                        {/* Tile 7: Checklists Manage */}
                        <div
                          onClick={() => {
                            setAdminTab('checklists');
                            setSelectedChecklistCategory(null);
                          }}
                          className="group bg-gradient-to-br from-teal-600 via-cyan-700 to-sky-800 text-white border border-teal-400/30 p-6 sm:p-8 rounded-[2.5rem] cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl hover:shadow-teal-500/30 flex flex-col justify-between min-h-[220px] relative overflow-hidden"
                        >
                          <div className="absolute -left-10 -bottom-10 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-500" />
                          <div className="bg-white/20 backdrop-blur-md text-white p-4 rounded-2xl border border-white/30 group-hover:bg-white group-hover:text-teal-700 transition-all duration-300 w-fit relative z-10 shadow-lg">
                            <ClipboardList className="w-6 h-6" />
                          </div>
                          <div className="relative z-10">
                            <h3 className="text-lg font-black text-white mt-4 group-hover:translate-x-1 transition-transform">مدیریت چک‌لیست‌های بیمارستان</h3>
                            <p className="text-xs text-teal-100 font-medium mt-2 leading-relaxed">ویرایش و مدیریت چک‌لیست‌های رضایت‌سنجی ترخیص و چک‌لیست‌های خودارزیابی پیگیری بیمار</p>
                          </div>
                        </div>

                        {/* Tile 8: Complaints and Suggestions */}
                        <div
                          onClick={() => {
                            setAdminTab('complaints');
                          }}
                          className="group bg-gradient-to-br from-blue-600 via-indigo-700 to-violet-800 text-white border border-blue-400/30 p-6 sm:p-8 rounded-[2.5rem] cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl hover:shadow-blue-500/30 flex flex-col justify-between min-h-[220px] relative overflow-hidden"
                        >
                          <div className="absolute -left-10 -bottom-10 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-500" />
                          <div className="flex justify-between items-start relative z-10">
                            <div className="bg-white/20 backdrop-blur-md text-white p-4 rounded-2xl border border-white/30 group-hover:bg-white group-hover:text-blue-700 transition-all duration-300 shadow-lg">
                              <HeartHandshake className="w-6 h-6" />
                            </div>
                            <span className="text-[10px] bg-white/20 text-white backdrop-blur-md px-3 py-1 rounded-xl font-black font-mono border border-white/30">
                              {complaints.length + deptSatisfactionSubmissions.length} مورد
                            </span>
                          </div>
                          <div className="relative z-10">
                            <h3 className="text-lg font-black text-white mt-4 group-hover:translate-x-1 transition-transform">شکایت‌ها و پیشنهادها</h3>
                            <p className="text-xs text-blue-100 font-medium mt-2 leading-relaxed">مشاهده کل نظرات، پیشنهادها، شکایت‌های عمومی و فرم‌های ارزیابی رضایتمندی بخش‌های بیمارستان</p>
                          </div>
                        </div>

                        {/* Tile 9: Hospital News Banners (Only Super Admin) */}
                        <div
                          onClick={() => {
                            setAdminTab('banners');
                            setBannerFormTitle('');
                            setBannerFormContent('');
                            setBannerFormImageUrl('');
                            setEditingBannerId(null);
                          }}
                          className="group bg-gradient-to-br from-purple-600 via-violet-700 to-indigo-900 text-white border border-purple-400/30 p-6 sm:p-8 rounded-[2.5rem] cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl hover:shadow-purple-500/30 flex flex-col justify-between min-h-[220px] relative overflow-hidden"
                        >
                          <div className="absolute -left-10 -bottom-10 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-500" />
                          <div className="flex justify-between items-start relative z-10">
                            <div className="bg-white/20 backdrop-blur-md text-white p-4 rounded-2xl border border-white/30 group-hover:bg-white group-hover:text-purple-700 transition-all duration-300 shadow-lg">
                              <Sparkles className="w-6 h-6" />
                            </div>
                            <span className="text-[10px] bg-white/20 text-white backdrop-blur-md px-3 py-1 rounded-xl font-black font-mono border border-white/30">
                              {newsBanners.length} بنر
                            </span>
                          </div>
                          <div className="relative z-10">
                            <h3 className="text-lg font-black text-white mt-4 group-hover:translate-x-1 transition-transform">مدیریت بنرهای اسلایدشو</h3>
                            <p className="text-xs text-purple-100 font-medium mt-2 leading-relaxed">افزودن، حذف، ویرایش و مدیریت بنرهای خبری و آموزشی اسلایدر صفحه اصلی پرتال بیماران</p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Department Admin Tiles */}
                        {/* Tile 1: Register for Section */}
                        <div
                          onClick={() => {
                            setAdminTab('register');
                            setRegSuccessMsg('');
                            setRegErrorMsg('');
                          }}
                          className="group bg-gradient-to-br from-emerald-600 via-teal-700 to-cyan-800 text-white border border-emerald-400/30 p-6 sm:p-8 rounded-[2.5rem] cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl hover:shadow-emerald-500/30 flex flex-col justify-between min-h-[220px] relative overflow-hidden"
                        >
                          <div className="absolute -left-10 -bottom-10 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-500" />
                          <div className="bg-white/20 backdrop-blur-md text-white p-4 rounded-2xl border border-white/30 group-hover:bg-white group-hover:text-emerald-700 transition-all duration-300 w-fit relative z-10 shadow-lg">
                            <PlusCircle className="w-6 h-6" />
                          </div>
                          <div className="relative z-10">
                            <h3 className="text-lg font-black text-white mt-4 group-hover:translate-x-1 transition-transform">ثبت بیمار/مددجوی جدید برای بخش خود</h3>
                            <p className="text-xs text-emerald-100 font-medium mt-2 leading-relaxed">ثبت سریع بیمار جهت فعال‌سازی حساب کاربری آموزش از بدو بستری تا بعد ترخیص و پیگیری در بخش خود</p>
                          </div>
                        </div>

                        {/* Tile 2: Patients of Section */}
                        <div
                          onClick={() => setAdminTab('patients')}
                          className="group bg-gradient-to-br from-indigo-600 via-purple-700 to-fuchsia-800 text-white border border-indigo-400/30 p-6 sm:p-8 rounded-[2.5rem] cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl hover:shadow-indigo-500/30 flex flex-col justify-between min-h-[220px] relative overflow-hidden"
                        >
                          <div className="absolute -left-10 -bottom-10 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-500" />
                          <div className="flex justify-between items-start relative z-10">
                            <div className="bg-white/20 backdrop-blur-md text-white p-4 rounded-2xl border border-white/30 group-hover:bg-white group-hover:text-indigo-700 transition-all duration-300 shadow-lg">
                              <ClipboardList className="w-6 h-6" />
                            </div>
                            <span className="text-[10px] bg-white/20 text-white backdrop-blur-md px-3 py-1 rounded-xl font-black font-mono border border-white/30">
                              {patients.filter(p => p.departmentId === currentAdmin.departmentId).length} بیمار
                            </span>
                          </div>
                          <div className="relative z-10">
                            <h3 className="text-lg font-black text-white mt-4 group-hover:translate-x-1 transition-transform">لیست بیماران و پیگیری‌ها</h3>
                            <p className="text-xs text-indigo-100 font-medium mt-2 leading-relaxed">پایش مستمر وضعیت سلامت بیماران بخش و پاسخ‌های خودارزیابی بر اساس سیستم طبقه‌بندی تریاژ رنگی</p>
                          </div>
                        </div>

                        {/* Tile 3: QA of Section */}
                        <div
                          onClick={() => setAdminTab('qa')}
                          className="group bg-gradient-to-br from-amber-500 via-orange-600 to-rose-700 text-white border border-amber-400/30 p-6 sm:p-8 rounded-[2.5rem] cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl hover:shadow-amber-500/30 flex flex-col justify-between min-h-[220px] relative overflow-hidden"
                        >
                          <div className="absolute -left-10 -bottom-10 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-500" />
                          <div className="flex justify-between items-start relative z-10">
                            <div className="bg-white/20 backdrop-blur-md text-white p-4 rounded-2xl border border-white/30 group-hover:bg-white group-hover:text-amber-700 transition-all duration-300 shadow-lg">
                              <MessageSquare className="w-6 h-6" />
                            </div>
                            {messages.filter(m => m.departmentId === currentAdmin.departmentId && !m.answer).length > 0 && (
                              <span className="text-[10px] bg-white text-rose-600 px-3 py-1 rounded-xl font-black font-mono shadow-md animate-pulse">
                                {messages.filter(m => m.departmentId === currentAdmin.departmentId && !m.answer).length} جدید
                              </span>
                            )}
                          </div>
                          <div className="relative z-10">
                            <h3 className="text-lg font-black text-white mt-4 group-hover:translate-x-1 transition-transform">پاسخ به سوالات بیماران بخش خود</h3>
                            <p className="text-xs text-amber-100 font-medium mt-2 leading-relaxed">رسیدگی به استعلام‌ها و ابهام‌های ارسالی بیماران بخش در راستای بهبود مستمر کیفیت خودمراقبتی در منزل</p>
                          </div>
                        </div>

                        {/* Tile 4: Department Indicators */}
                        <div
                          onClick={() => {
                            setAdminTab('stats');
                          }}
                          className="group bg-gradient-to-br from-sky-600 via-blue-700 to-indigo-800 text-white border border-sky-400/30 p-6 sm:p-8 rounded-[2.5rem] cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl hover:shadow-sky-500/30 flex flex-col justify-between min-h-[220px] relative overflow-hidden"
                        >
                          <div className="absolute -left-10 -bottom-10 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-500" />
                          <div className="flex justify-between items-start relative z-10">
                            <div className="bg-white/20 backdrop-blur-md text-white p-4 rounded-2xl border border-white/30 group-hover:bg-white group-hover:text-sky-700 transition-all duration-300 shadow-lg">
                              <TrendingUp className="w-6 h-6" />
                            </div>
                            <span className="text-[10px] bg-white/20 text-white backdrop-blur-md px-3 py-1 rounded-xl font-black font-mono border border-white/30">
                              {patients.filter(p => p.departmentId === currentAdmin.departmentId).length} بیمار
                            </span>
                          </div>
                          <div className="relative z-10">
                            <h3 className="text-lg font-black text-white mt-4 group-hover:translate-x-1 transition-transform">شاخص‌های بخش</h3>
                            <p className="text-xs text-sky-100 font-medium mt-2 leading-relaxed">مشاهده کلیه شاخص‌های عملکردی و ارزیابی پیگیری بیماران، نمودارها و آمار ماهانه فقط مربوط به بخش خود</p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                /* Inside a specific workstation page with complete dark, high-contrast, premium styling */
                <div className="bg-slate-900/95 text-white border border-slate-700/50 rounded-2xl sm:rounded-[2.5rem] p-3 sm:p-8 shadow-2xl space-y-6 sm:space-y-8 relative overflow-x-hidden w-full max-w-full">
                  {/* Decorative backdrop container safely masked to card borders */}
                  <div className="absolute inset-0 rounded-[2.5rem] overflow-hidden pointer-events-none z-0">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-500/5 via-sky-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
                  </div>

                  {/* Beautiful top navigation header inside subpages */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5 relative z-10">
                    <button
                      onClick={() => setAdminTab('overview')}
                      className="bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-slate-700/50 rounded-2xl px-5 py-2.5 text-xs font-black flex items-center gap-2 cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg shadow-black/10 shrink-0"
                    >
                      <ArrowRight className="w-4 h-4" />
                      <span>برگشت به منوی اصلی بخش‌ها</span>
                    </button>
                    <div className="text-right">
                      <span className="text-[10px] text-sky-400 font-extrabold uppercase tracking-widest">سامانه یکپارچه مدیریت بیمارستان من</span>
                      <h3 className="text-sm font-black text-slate-300 mt-1">
                        {currentAdmin.name} • {currentAdmin.role === 'super' ? 'مدیریت کل سیستم' : `بخش ${departments.find(d => d.id === currentAdmin.departmentId)?.name}`}
                      </h3>
                    </div>
                  </div>

                  <div className="relative z-10">

                  {/* TAB 1: STATISTICS & COMPUTED INDICATORS */}
                  {adminTab === 'stats' && (
                    <div className="space-y-5 sm:space-y-8 w-full max-w-full overflow-hidden">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
                        <div className="min-w-0">
                          <h3 className="text-base sm:text-xl font-black text-white mb-1 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-sky-400 animate-pulse shrink-0" />
                            <span className="truncate">
                              {currentAdmin?.role === 'super' ? 'داشبورد آماری و شاخص‌های بیمارستان' : `داشبورد آماری و شاخص‌های بخش ${departments.find(d => d.id === currentAdmin?.departmentId)?.name || ''}`}
                            </span>
                          </h3>
                          <p className="text-xs text-slate-300 font-medium">
                            {currentAdmin?.role === 'super' ? 'آمار عملکردی، شاخص‌های ارزیابی و پیگیری بیماران ترخیصی به تفکیک ماه و سال' : 'آمار عملکردی، شاخص‌های ارزیابی و پیگیری بیماران ترخیصی بخش به تفکیک ماه و سال'}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => exportHospitalIndicatorsExcel(stats, currentAdmin, selectedStatsMonth, selectedStatsYear)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2.5 sm:py-2 rounded-xl text-xs font-black flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer shrink-0 border border-emerald-400/30 active:scale-95"
                          >
                            <FileSpreadsheet className="w-4 h-4" />
                            <span>دانلود فایل اکسل شاخص‌ها</span>
                          </button>
                        </div>
                      </div>

                      {/* STATS YEAR SELECTOR BAR (AUTOMATIC YEAR SWITCHING WITHOUT DELETING DATA) */}
                      <div className="bg-slate-800/80 border border-slate-700/80 p-3 sm:p-4 rounded-2xl space-y-2.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <h4 className="text-xs sm:text-sm font-black text-slate-200 flex items-center gap-2">
                            <History className="w-4 h-4 text-purple-400 shrink-0" />
                            <span>انتخاب سال آماری شاخص‌ها (تعویض سال):</span>
                          </h4>
                          <span className="text-[11px] text-slate-400">
                            در حال مشاهده آمار و شاخص‌های سال {selectedStatsYear} • بدون حذف بیماران
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {availableStatsYears.map((year) => (
                            <button
                              key={year}
                              type="button"
                              onClick={() => {
                                setSelectedStatsYear(year);
                                localStorage.setItem('user_picked_stats_year', year);
                              }}
                              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer border flex items-center gap-1.5 ${
                                selectedStatsYear === year
                                  ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-600/30 ring-2 ring-purple-400/40'
                                  : 'bg-slate-700/50 hover:bg-slate-700 text-slate-300 border-slate-600'
                              }`}
                            >
                              <Calendar className="w-3.5 h-3.5 text-purple-300" />
                              <span>سال {year}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* MONTH SELECTION TILES BAR */}
                      <div className="space-y-3 min-w-0 w-full">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 min-w-0">
                          <h4 className="text-xs sm:text-sm font-black text-slate-200 flex items-center gap-2 min-w-0">
                            <Calendar className="w-4 h-4 text-sky-400 shrink-0" />
                            <span className="truncate">{currentAdmin?.role === 'super' ? 'انتخاب ماه جهت دریافت شاخص‌های تفکیکی بیمارستان:' : 'انتخاب ماه جهت دریافت شاخص‌های تفکیکی بخش:'}</span>
                          </h4>
                          {selectedStatsMonth !== 'all' && (
                            <button
                              type="button"
                              onClick={() => setSelectedStatsMonth('all')}
                              className="text-[11px] font-bold text-sky-400 hover:text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 px-2.5 py-1 rounded-lg transition-all cursor-pointer shrink-0 self-start sm:self-auto"
                            >
                              مشاهده کل سال
                            </button>
                          )}
                        </div>

                        {/* MONTH TILES GRID */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-1.5 sm:gap-2.5 w-full">
                          {PERSIAN_MONTHS.map(m => {
                            const isSelected = selectedStatsMonth === m.id;
                            const count = stats.monthCounts[m.id] || 0;
                            return (
                              <div
                                key={m.id}
                                onClick={() => setSelectedStatsMonth(m.id)}
                                className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[68px] sm:min-h-[84px] relative overflow-hidden min-w-0 w-full ${
                                  isSelected
                                    ? 'bg-gradient-to-br from-sky-500/25 via-blue-600/20 to-indigo-900/40 border-sky-400 shadow-lg shadow-sky-500/20 text-white ring-2 ring-sky-400/50 scale-[1.01]'
                                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white hover:border-white/20'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1 min-w-0">
                                  <span className="text-[11px] sm:text-xs font-black truncate">{m.name}</span>
                                  <span className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? 'bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.9)]' : count > 0 ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                                </div>
                                <div className="mt-1.5 flex items-baseline justify-between gap-1 min-w-0">
                                  <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium truncate">آمار:</span>
                                  <span className={`text-[11px] sm:text-xs font-black font-mono ${isSelected ? 'text-sky-300' : 'text-slate-200'}`}>
                                    {count} نفر
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* CURRENT SELECTION BADGE HEADER */}
                      <div className="bg-[#111625] border border-sky-500/30 p-3 sm:p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-md min-w-0 w-full">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-2 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-xl shrink-0">
                            <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-black text-white block truncate">
                              شاخص‌های فعال برای: {PERSIAN_MONTHS.find(m => m.id === selectedStatsMonth)?.name}
                            </span>
                            <span className="text-[11px] text-slate-400 font-medium block truncate">
                              {selectedStatsMonth === 'all'
                                ? 'نمایش شاخص‌های جامع و تجمع داده‌های کل سال بیمارستان'
                                : `نمایش دقیق شاخص‌های قانونی وزارت بهداشت برای ماه ${PERSIAN_MONTHS.find(m => m.id === selectedStatsMonth)?.name}`
                              }
                            </span>
                          </div>
                        </div>
                        <span className="bg-sky-500/20 text-sky-300 border border-sky-400/30 px-3 py-1.5 rounded-xl text-xs font-black font-mono shrink-0 self-start sm:self-auto">
                          {stats.totalCount} بیمار در این بازه
                        </span>
                      </div>

                      {/* STAT CARDS GRID */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
                        <div className="bg-white/5 border border-white/10 p-4 sm:p-5 rounded-2xl flex items-center gap-3.5 shadow-inner min-w-0">
                          <div className="bg-sky-500/10 text-sky-300 p-3 rounded-xl border border-sky-400/20 shrink-0">
                            <Users className="w-5 h-5 sm:w-6 sm:h-6" />
                          </div>
                          <div className="min-w-0">
                            <span className="block text-[10px] text-slate-400 font-black uppercase tracking-wider truncate">
                              کل بیماران ترخیص‌شده
                            </span>
                            <span className="text-2xl sm:text-3xl font-black font-mono text-white mt-0.5 block">{stats.totalCount}</span>
                          </div>
                        </div>

                        <div className="bg-white/5 border border-white/10 p-4 sm:p-5 rounded-2xl flex items-center gap-3.5 shadow-inner min-w-0">
                          <div className="bg-emerald-500/10 text-emerald-300 p-3 rounded-xl border border-emerald-400/20 shrink-0">
                            <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                          </div>
                          <div className="min-w-0">
                            <span className="block text-[10px] text-slate-400 font-black uppercase tracking-wider truncate">پیگیری‌شده (پاسخ داده)</span>
                            <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-300 mt-0.5 block">{stats.evaluatedCount}</span>
                          </div>
                        </div>

                        <div className="bg-white/5 border border-white/10 p-4 sm:p-5 rounded-2xl flex items-center gap-3.5 shadow-inner min-w-0">
                          <div className="bg-amber-500/10 text-amber-300 p-3 rounded-xl border border-amber-400/20 shrink-0">
                            <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
                          </div>
                          <div className="min-w-0">
                            <span className="block text-[10px] text-slate-400 font-black uppercase tracking-wider truncate">در انتظار پیگیری اول</span>
                            <span className="text-2xl sm:text-3xl font-black font-mono text-amber-300 mt-0.5 block">{stats.totalCount - stats.evaluatedCount}</span>
                          </div>
                        </div>
                      </div>

                      {/* TRIAGE STATUS SUMMARY CARDS */}
                      {stats.triageCounts && (
                        <div className="bg-white/5 border border-white/10 p-4 sm:p-5 rounded-2xl space-y-3 shadow-inner">
                          <h4 className="text-xs sm:text-sm font-black text-white flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 text-amber-400" />
                              <span>آمار تفکیکی وضعیت تریاژ بیماران (سطح قرمز، زرد و سبز):</span>
                            </span>
                            <span className="text-[10px] text-slate-400 font-normal">
                              اطلاعات خروجی اکسل در شیت «آمار تریاژ بیماران» درج می‌گردد
                            </span>
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="bg-rose-500/10 border border-rose-500/30 p-3.5 rounded-xl flex items-center justify-between">
                              <div>
                                <span className="block text-[11px] text-rose-300 font-black">سطح قرمز (کنترل‌نشده)</span>
                                <span className="text-[10px] text-rose-200/70 font-medium">وضعیت هنوز کنترل نشده است</span>
                              </div>
                              <span className="text-2xl font-black font-mono text-rose-400">{stats.triageCounts.red} نفر</span>
                            </div>

                            <div className="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-xl flex items-center justify-between">
                              <div>
                                <span className="block text-[11px] text-amber-300 font-black">سطح زرد (کنترل ناکافی)</span>
                                <span className="text-[10px] text-amber-200/70 font-medium">وضعیت بصورت ناکافی کنترل شده</span>
                              </div>
                              <span className="text-2xl font-black font-mono text-amber-400">{stats.triageCounts.yellow} نفر</span>
                            </div>

                            <div className="bg-emerald-500/10 border border-emerald-500/30 p-3.5 rounded-xl flex items-center justify-between">
                              <div>
                                <span className="block text-[11px] text-emerald-300 font-black">سطح سبز (محدوده ایمن)</span>
                                <span className="text-[10px] text-emerald-200/70 font-medium">وضعیت کنترل و در محدوده ایمن</span>
                              </div>
                              <span className="text-2xl font-black font-mono text-emerald-400">{stats.triageCounts.green} نفر</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 4 OFFICIAL INDICATORS (Appendix 21) */}
                      <div className="border-t border-white/10 pt-6 space-y-5">
                        <h4 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                          <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5 text-sky-400 shrink-0" />
                          <span>شاخص‌های عملکردی واحد (دستورالعمل وزارت بهداشت - پیوست ۲۱):</span>
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-6">

                          {/* 1. Follow-up Success rate */}
                          <div className="bg-white/5 border border-white/10 p-4 sm:p-5 rounded-2xl space-y-2.5 shadow-md min-w-0">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-black text-slate-200">۱. درصد بیماران پیگیری‌شده توسط واحد:</span>
                              <span className="font-black font-mono text-sky-400 text-sm">{stats.followupRate}%</span>
                            </div>
                            <div className="w-full bg-slate-900/50 h-2.5 rounded-full overflow-hidden border border-white/5 p-[1px]">
                              <div className="bg-gradient-to-r from-sky-500 to-blue-500 h-full rounded-full shadow-[0_0_8px_rgba(56,189,248,0.5)] transition-all duration-500" style={{ width: `${stats.followupRate}%` }} />
                            </div>
                            <p className="text-[10px] text-slate-400 font-medium">فرمول: (بیماران دارای خودارزیابی / کل بیماران ترخیصی) × ۱۰۰</p>
                          </div>

                          {/* 2. Patient satisfaction rate (Derived from Q18) */}
                          <div className="bg-white/5 border border-white/10 p-4 sm:p-5 rounded-2xl space-y-2.5 shadow-md min-w-0">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-black text-slate-200">۲. درصد رضایتمندی بیماران ترخیصی از واحد (سوال ۱۸):</span>
                              <span className="font-black font-mono text-emerald-400 text-sm">{stats.satisfactionRate}%</span>
                            </div>
                            <div className="w-full bg-slate-900/50 h-2.5 rounded-full overflow-hidden border border-white/5 p-[1px]">
                              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)] transition-all duration-500" style={{ width: `${stats.satisfactionRate}%` }} />
                            </div>
                            <p className="text-[10px] text-slate-400 font-medium">فرمول: (بیماران با پاسخ «عالی» یا «خوب» در سوال ۱۸ رضایتمندی / کل ارزیابی‌شدگان) × ۱۰۰</p>
                          </div>

                          {/* 3. Readmission rate */}
                          <div className="bg-white/5 border border-white/10 p-4 sm:p-5 rounded-2xl space-y-2.5 shadow-md min-w-0">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-black text-slate-200">۳. درصد بستری مجدد مرتبط با بیماری (در بازه یک‌ماهه):</span>
                              <span className="font-black font-mono text-rose-400 text-sm">{stats.readmissionRate}%</span>
                            </div>
                            <div className="w-full bg-slate-900/50 h-2.5 rounded-full overflow-hidden border border-white/5 p-[1px]">
                              <div className="bg-gradient-to-r from-rose-500 to-red-500 h-full rounded-full shadow-[0_0_8px_rgba(244,63,94,0.5)] transition-all duration-500" style={{ width: `${stats.readmissionRate}%` }} />
                            </div>
                            <p className="text-[10px] text-slate-400 font-medium">فرمول: (بیماران بستری مجدد / کل بیماران پیگیری‌شده) × ۱۰۰</p>
                          </div>

                          {/* 4. Postpartum & Women's special follow-up indicator */}
                          <div className="bg-white/5 border border-white/10 p-4 sm:p-5 rounded-2xl space-y-3 shadow-md min-w-0 col-span-1 md:col-span-1">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                              <span className="font-black text-slate-200">۴. درصد پیگیری ویژه و غربالگری مادران باردار و پرخطر:</span>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="bg-pink-500/10 text-pink-300 border border-pink-500/20 px-2 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-bold">
                                  بارداران: {stats.totalPregnantCount} نفر
                                </span>
                                <span className="bg-rose-500/10 text-rose-300 border border-rose-500/20 px-2 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-bold">
                                  پرخطر: {stats.highRiskPregnantCount} نفر
                                </span>
                                <span className="font-black font-mono text-indigo-400 text-sm">{stats.screeningRate}%</span>
                              </div>
                            </div>
                            <div className="w-full bg-slate-900/50 h-2.5 rounded-full overflow-hidden border border-white/5 p-[1px]">
                              <div className="bg-gradient-to-r from-pink-500 via-indigo-500 to-purple-500 h-full rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)] transition-all duration-500" style={{ width: `${stats.screeningRate}%` }} />
                            </div>
                            <p className="text-[10px] text-slate-400 font-medium">فرمول: (مادران باردار پرخطر شناسایی‌شده جهت پیگیری ویژه / کل بیماران باردار ثبت‌شده) × ۱۰۰</p>
                          </div>

                        </div>
                      </div>

                      {/* STEPPED CHARTS SECTION FOR MONTHLY INDICATORS */}
                      <div className="border-t border-white/10 pt-6 sm:pt-8 space-y-5">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div>
                            <h4 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                              <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 shrink-0" />
                              <span>نمودارهای پلکانی روند شاخص‌های اصلی بیمارستان (تفکیک ۱۲ ماه سال):</span>
                            </h4>
                            <p className="text-xs text-slate-300 mt-1">
                              تحلیل دیداری و پلکانی روند نوسانات ۴ شاخص اصلی بیمارستان از فروردین تا اسفند
                            </p>
                          </div>

                          {/* Chart Mode Switcher Buttons */}
                          <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 bg-slate-950/80 p-1.5 rounded-2xl border border-white/10 self-start md:self-auto max-w-full">
                            <button
                              type="button"
                              onClick={() => setSelectedChartMode('all')}
                              className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
                                selectedChartMode === 'all'
                                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              کلیه ۴ شاخص
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedChartMode('followup')}
                              className={`px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
                                selectedChartMode === 'followup'
                                  ? 'bg-sky-500 text-white shadow-md'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              % پیگیری
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedChartMode('satisfaction')}
                              className={`px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
                                selectedChartMode === 'satisfaction'
                                  ? 'bg-emerald-500 text-white shadow-md'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              % رضایتمندی (سوال ۱۸)
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedChartMode('readmission')}
                              className={`px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
                                selectedChartMode === 'readmission'
                                  ? 'bg-rose-500 text-white shadow-md'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              % بستری مجدد
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedChartMode('screening')}
                              className={`px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
                                selectedChartMode === 'screening'
                                  ? 'bg-purple-500 text-white shadow-md'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              % بارداران
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedChartMode('volume')}
                              className={`px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
                                selectedChartMode === 'volume'
                                  ? 'bg-indigo-500 text-white shadow-md'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              حجم بیماران
                            </button>
                          </div>
                        </div>

                        {/* Chart Container Card */}
                        <div className="bg-[#111625] border border-white/10 p-3 sm:p-6 rounded-3xl space-y-4 shadow-xl relative overflow-hidden min-w-0 max-w-full">

                          {/* Chart Title & Explanation Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                              <span className="text-xs font-black text-slate-200">
                                {selectedChartMode === 'all' && 'نمودار پلکانی مقایسه‌ای ۴ شاخص اصلی بیمارستان'}
                                {selectedChartMode === 'followup' && 'نمودار پلکانی ۱. درصد پیگیری بیمار (ماهانه)'}
                                {selectedChartMode === 'satisfaction' && 'نمودار پلکانی ۲. درصد رضایتمندی ترخیصی - سوال ۱۸ (ماهانه)'}
                                {selectedChartMode === 'readmission' && 'نمودار پلکانی ۳. درصد بستری مجدد بیمار (ماهانه)'}
                                {selectedChartMode === 'screening' && 'نمودار پلکانی ۴. درصد پیگیری ویژه بارداران و مادران پرخطر (ماهانه)'}
                                {selectedChartMode === 'volume' && 'نمودار میله‌ای حجم پذیرش و ارزیابی بیماران در هر ماه'}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-bold bg-white/5 px-2.5 py-1 rounded-lg border border-white/5 self-start sm:self-auto">
                              نوع نمودار: {selectedChartMode === 'volume' ? 'میله‌ای (Bar Chart)' : 'پلکانی (Step-After Line Chart)'}
                            </span>
                          </div>

                          {/* Recharts Chart View */}
                          <div className="w-full h-[280px] sm:h-[360px] pt-2 min-w-0 overflow-hidden" dir="ltr">
                            <ResponsiveContainer width="100%" height="100%">
                              {selectedChartMode === 'volume' ? (
                                <BarChart data={stats.monthlyIndicatorsSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                                  <XAxis dataKey="shortName" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                  <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                  <RechartsTooltip content={<CustomChartTooltip />} />
                                  <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '11px', color: '#cbd5e1' }} />
                                  <Bar dataKey="totalCount" name="کل بیماران ترخیص‌شده" fill="#38bdf8" radius={[6, 6, 0, 0]} />
                                  <Bar dataKey="evaluatedCount" name="ارزیابی‌شده (پیگیری‌شده)" fill="#34d399" radius={[6, 6, 0, 0]} />
                                </BarChart>
                              ) : (
                                <LineChart data={stats.monthlyIndicatorsSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                                  <XAxis dataKey="shortName" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                  <YAxis domain={[0, 100]} stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 11 }} unit="%" />
                                  <RechartsTooltip content={<CustomChartTooltip />} />
                                  <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '11px', color: '#cbd5e1' }} />

                                  {(selectedChartMode === 'all' || selectedChartMode === 'followup') && (
                                    <Line
                                      type="stepAfter"
                                      dataKey="followupRate"
                                      name="۱. % پیگیری"
                                      stroke="#38bdf8"
                                      strokeWidth={3}
                                      dot={{ r: 4, fill: '#38bdf8' }}
                                      activeDot={{ r: 7 }}
                                    />
                                  )}

                                  {(selectedChartMode === 'all' || selectedChartMode === 'satisfaction') && (
                                    <Line
                                      type="stepAfter"
                                      dataKey="satisfactionRate"
                                      name="۲. % رضایتمندی (سوال ۱۸)"
                                      stroke="#34d399"
                                      strokeWidth={3}
                                      dot={{ r: 4, fill: '#34d399' }}
                                      activeDot={{ r: 7 }}
                                    />
                                  )}

                                  {(selectedChartMode === 'all' || selectedChartMode === 'readmission') && (
                                    <Line
                                      type="stepAfter"
                                      dataKey="readmissionRate"
                                      name="۳. % بستری مجدد"
                                      stroke="#fb7185"
                                      strokeWidth={3}
                                      dot={{ r: 4, fill: '#fb7185' }}
                                      activeDot={{ r: 7 }}
                                    />
                                  )}

                                  {(selectedChartMode === 'all' || selectedChartMode === 'screening') && (
                                    <Line
                                      type="stepAfter"
                                      dataKey="screeningRate"
                                      name="۴. % بارداران"
                                      stroke="#c084fc"
                                      strokeWidth={3}
                                      dot={{ r: 4, fill: '#c084fc' }}
                                      activeDot={{ r: 7 }}
                                    />
                                  )}
                                </LineChart>
                              )}
                            </ResponsiveContainer>
                          </div>

                          {/* MONTHLY COMPARISON DATA TABLE */}
                          <div className="pt-4 border-t border-white/10 space-y-3 min-w-0 max-w-full">
                            <h5 className="text-xs font-black text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                              <span>جدول داده‌های مقایسه‌ای ماهانه (فروردین تا اسفند):</span>
                              <span className="text-[10px] text-slate-400 font-normal">تمام اعداد به درصد هستند</span>
                            </h5>
                            <div className="overflow-x-auto max-w-full rounded-2xl border border-white/10 scrollbar-thin">
                              <table className="w-full text-right text-[11px] min-w-[500px]">
                                <thead className="bg-slate-950/80 text-slate-300 border-b border-white/10 font-bold">
                                  <tr>
                                    <th className="p-2.5">ماه</th>
                                    <th className="p-2.5">کل بیمار</th>
                                    <th className="p-2.5">ارزیابی‌شده</th>
                                    <th className="p-2.5 text-sky-400">۱. % پیگیری</th>
                                    <th className="p-2.5 text-emerald-400">۲. % رضایت (Q18)</th>
                                    <th className="p-2.5 text-rose-400">۳. % بستری مجدد</th>
                                    <th className="p-2.5 text-purple-400">۴. % بارداران</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 font-mono">
                                  {stats.monthlyIndicatorsSeries.map((m) => (
                                    <tr key={m.monthId} className="hover:bg-white/5 transition-colors">
                                      <td className="p-2.5 font-sans font-bold text-slate-200">{m.monthName}</td>
                                      <td className="p-2.5 text-slate-300">{m.totalCount}</td>
                                      <td className="p-2.5 text-slate-300">{m.evaluatedCount}</td>
                                      <td className="p-2.5 font-black text-sky-400">{m.followupRate}%</td>
                                      <td className="p-2.5 font-black text-emerald-400">{m.satisfactionRate}%</td>
                                      <td className="p-2.5 font-black text-rose-400">{m.readmissionRate}%</td>
                                      <td className="p-2.5 font-black text-purple-400">{m.screeningRate}%</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                        </div>
                      </div>

                      {/* SPECIAL DISEASES TALLY SECTION */}
                      <div className="border-t border-white/10 pt-6 sm:pt-8 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <h4 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                              <FlaskConical className="w-4 h-4 sm:w-5 sm:h-5 text-sky-400 shrink-0" />
                              <span>آمار بیماران و بستری مجدد به تفکیک بیماری‌های ویژه:</span>
                            </h4>
                            <p className="text-xs text-slate-400 mt-0.5">
                              تعداد بیماران ثبت‌شده و تعداد بستری مجدد در هر یک از ۱۷ گروه بیماری‌های ویژه بیمارستان
                            </p>
                          </div>
                          <span className="bg-sky-500/10 text-sky-300 border border-sky-500/20 px-3 py-1 rounded-xl text-xs font-bold self-start sm:self-auto font-mono shrink-0">
                            مجموع کل: {stats.totalActivePatientsCount} نفر
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                          {stats.specialDiseaseCounts.map((item) => (
                            <div
                              key={item.diseaseName}
                              className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-2.5 sm:p-3.5 flex items-center justify-between gap-2 transition-all duration-200 min-w-0"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${item.count > 0 ? 'bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.8)]' : 'bg-slate-600'}`} />
                                <span className="text-xs font-bold text-slate-200 truncate" title={item.diseaseName}>{item.diseaseName}</span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className={`px-2 py-0.5 rounded-xl text-xs font-black font-mono ${item.count > 0 ? 'bg-sky-500/20 text-sky-300 border border-sky-400/30' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                                  {item.count} نفر
                                </span>
                                {item.readmissionCount > 0 && (
                                  <span className="px-2 py-0.5 rounded-xl text-[10px] sm:text-[11px] font-black font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1" title="تعداد بستری مجدد">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                                    <span>بستری مجدد: {item.readmissionCount}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* DEPARTMENT INDICATORS TILE SECTION (شاخص‌های بیمارستان به تفکیک بخش‌ها - فقط برای مدیریت کل) */}
                      {currentAdmin?.role === 'super' && (
                        <div className="border-t border-white/10 pt-6 sm:pt-8 space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <h4 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                                <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 shrink-0" />
                                <span>شاخص‌های بیمارستان به تفکیک بخش‌ها:</span>
                              </h4>
                              <p className="text-xs text-slate-400 mt-0.5">
                                تحلیل و مقایسه تفکیکی عملکرد و ۴ شاخص اصلی ارزیابی بیماران در کلیه بخش‌های بستری و تخصصی بیمارستان
                              </p>
                            </div>
                            <span className="bg-amber-500/10 text-amber-300 border border-amber-500/20 px-3 py-1 rounded-xl text-xs font-bold self-start sm:self-auto font-mono shrink-0">
                              تعداد بخش‌ها: {departments.length} بخش
                            </span>
                          </div>

                          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#111625] shadow-xl">
                            <table className="w-full text-right text-xs min-w-[650px]">
                              <thead className="bg-slate-900/90 text-slate-300 border-b border-white/10 font-bold">
                                <tr>
                                  <th className="py-3 px-4">نام بخش بیمارستان</th>
                                  <th className="py-3 px-4">کل بیماران ترخیصی</th>
                                  <th className="py-3 px-4">ارزیابی‌شده (پاسخ‌داده)</th>
                                  <th className="py-3 px-4 text-sky-400">۱. % پیگیری</th>
                                  <th className="py-3 px-4 text-emerald-400">۲. % رضایت (Q18)</th>
                                  <th className="py-3 px-4 text-rose-400">۳. % بستری مجدد</th>
                                  <th className="py-3 px-4 text-purple-400">۴. % پیگیری ویژه</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/5 font-mono">
                                {stats.departmentIndicatorsSeries.map((d) => (
                                  <tr key={d.departmentId} className="hover:bg-white/5 transition-colors">
                                    <td className="py-3.5 px-4 font-sans font-black text-white flex items-center gap-2">
                                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                                      <span>{d.departmentName}</span>
                                    </td>
                                    <td className="py-3.5 px-4 font-bold text-slate-200">{d.totalCount} نفر</td>
                                    <td className="py-3.5 px-4 font-bold text-slate-300">{d.evaluatedCount} نفر</td>
                                    <td className="py-3.5 px-4 font-black text-sky-400">{d.followupRate}%</td>
                                    <td className="py-3.5 px-4 font-black text-emerald-400">{d.satisfactionRate}%</td>
                                    <td className="py-3.5 px-4 font-black text-rose-400">{d.readmissionRate}%</td>
                                    <td className="py-3.5 px-4 font-black text-purple-400">{d.screeningRate}%</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* SATISFACTION SURVEY STATISTICS SECTION (For Super Admin) */}
                      {currentAdmin?.role === 'super' && (() => {
                        const surveyedPatients = patients.filter(p => p.satisfactionSurvey);
                        const totalSurveys = surveyedPatients.length;

                        const surveyQuestions = hospitalSurveyQuestions;

                        const questionStats = surveyQuestions.map(q => {
                          let yesCount = 0;
                          let partialCount = 0;
                          let noCount = 0;

                          surveyedPatients.forEach(p => {
                            const ans = p.satisfactionSurvey?.[q.id as keyof typeof p.satisfactionSurvey];
                            if (ans === 'yes') yesCount++;
                            else if (ans === 'partial') partialCount++;
                            else if (ans === 'no') noCount++;
                          });

                          return {
                            id: q.id,
                            text: q.text,
                            yes: totalSurveys > 0 ? Math.round((yesCount / totalSurveys) * 100) : 0,
                            partial: totalSurveys > 0 ? Math.round((partialCount / totalSurveys) * 100) : 0,
                            no: totalSurveys > 0 ? Math.round((noCount / totalSurveys) * 100) : 0,
                            yesCount,
                            partialCount,
                            noCount
                          };
                        });

                        let excCount = 0, goodCount = 0, avgCount = 0, poorCount = 0;
                        surveyedPatients.forEach(p => {
                          const ans = p.satisfactionSurvey?.q18;
                          if (ans === 'excellent') excCount++;
                          else if (ans === 'good') goodCount++;
                          else if (ans === 'average') avgCount++;
                          else if (ans === 'poor') poorCount++;
                        });

                        const q18Stats = {
                          excellent: totalSurveys > 0 ? Math.round((excCount / totalSurveys) * 100) : 0,
                          good: totalSurveys > 0 ? Math.round((goodCount / totalSurveys) * 100) : 0,
                          average: totalSurveys > 0 ? Math.round((avgCount / totalSurveys) * 100) : 0,
                          poor: totalSurveys > 0 ? Math.round((poorCount / totalSurveys) * 100) : 0,
                          excCount,
                          goodCount,
                          avgCount,
                          poorCount
                        };

                        return (
                          <div className="border-t border-white/5 pt-8 mt-8 space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div>
                                <h4 className="text-lg font-black text-white flex items-center gap-2 text-right">
                                  <HeartHandshake className="w-5.5 h-5.5 text-teal-400 animate-pulse" />
                                  <span>نتایج ارزیابی رضایت‌مندی جامع بیماران بیمارستان امام رضا (ع)</span>
                                </h4>
                                <p className="text-xs text-slate-300 font-medium mt-1 text-right">این اطلاعات از پاسخنامه‌های ثبت‌شده توسط بیماران در کارتابل اختصاصی آن‌ها استخراج شده است.</p>
                              </div>
                              <div className="bg-teal-500/10 border border-teal-500/20 px-4 py-2 rounded-xl text-xs font-black text-teal-300 flex items-center gap-2 self-start sm:self-center">
                                <span>کل پاسخنامه‌ها:</span>
                                <span className="font-mono text-sm">{totalSurveys} عدد</span>
                              </div>
                            </div>

                            {totalSurveys === 0 ? (
                              <div className="bg-white/5 border border-white/10 p-12 rounded-2xl text-center">
                                <HeartHandshake className="w-12 h-12 text-slate-500 mx-auto mb-3 opacity-60 animate-bounce" />
                                <p className="text-slate-400 font-bold text-xs text-center">هنوز هیچ پاسخنامه‌ای جهت ارزیابی رضایت‌مندی بیماران در سیستم ثبت نشده است.</p>
                              </div>
                            ) : (
                              <div className="space-y-6 text-right">
                                {selectedSurveyTile === null ? (
                                  /* SECTIONS OVERVIEW GRID */
                                  <div className="space-y-4">
                                    <div className="bg-sky-500/10 border border-sky-500/20 p-4 rounded-2xl flex items-center justify-between">
                                      <p className="text-xs text-sky-200 font-bold">
                                        💡 جهت مشاهده شاخص‌ها و اطلاعات تفکیکی هر بخش، روی کارت مورد نظر کلیک کنید:
                                      </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                      {/* TILE 1: Overall Satisfaction */}
                                      <div
                                        onClick={() => setSelectedSurveyTile('overall')}
                                        className="bg-[#111625] hover:bg-[#182035] border border-white/10 hover:border-sky-500/50 p-6 rounded-3xl space-y-4 shadow-xl cursor-pointer transition-all duration-300 group relative overflow-hidden"
                                      >
                                        <div className="absolute top-0 right-0 w-2 h-full bg-sky-500 group-hover:w-3 transition-all" />
                                        <div className="flex items-center justify-between">
                                          <div className="bg-sky-500/10 p-3 rounded-2xl border border-sky-500/20 text-sky-400 group-hover:scale-110 transition-transform">
                                            <Star className="w-6 h-6 fill-sky-400/30" />
                                          </div>
                                          <span className="bg-sky-500/15 text-sky-300 border border-sky-500/30 text-[11px] font-black px-3 py-1 rounded-xl">
                                            {totalSurveys} پاسخ ثبت‌شده
                                          </span>
                                        </div>

                                        <div>
                                          <h5 className="text-base font-black text-white group-hover:text-sky-300 transition-colors">
                                            بخش ۱: شاخص کلی رضایتمندی بیمارستان (سوال ۱۸)
                                          </h5>
                                          <p className="text-xs text-slate-400 font-medium mt-1 leading-relaxed">
                                            سنجش و تحلیل آماری میزان رضایت کلی بیماران از مجموعه خدمات درمانی، اداری و رفاهی بیمارستان
                                          </p>
                                        </div>

                                        <div className="flex items-center justify-between pt-3 border-t border-white/10">
                                          <div className="flex gap-2 text-[10px] font-bold">
                                            <span className="text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded">عالی: {q18Stats.excellent}%</span>
                                            <span className="text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded">خوب: {q18Stats.good}%</span>
                                          </div>
                                          <span className="text-xs font-black text-sky-400 flex items-center gap-1 group-hover:translate-x-[-4px] transition-transform">
                                            <span>مشاهده شاخص و نمودار</span>
                                            <ArrowLeft className="w-4 h-4" />
                                          </span>
                                        </div>
                                      </div>

                                      {/* TILE 2: Questions Q1-Q17 */}
                                      <div
                                        onClick={() => setSelectedSurveyTile('questions')}
                                        className="bg-[#111625] hover:bg-[#182035] border border-white/10 hover:border-teal-500/50 p-6 rounded-3xl space-y-4 shadow-xl cursor-pointer transition-all duration-300 group relative overflow-hidden"
                                      >
                                        <div className="absolute top-0 right-0 w-2 h-full bg-teal-500 group-hover:w-3 transition-all" />
                                        <div className="flex items-center justify-between">
                                          <div className="bg-teal-500/10 p-3 rounded-2xl border border-teal-500/20 text-teal-400 group-hover:scale-110 transition-transform">
                                            <ClipboardList className="w-6 h-6" />
                                          </div>
                                          <span className="bg-teal-500/15 text-teal-300 border border-teal-500/30 text-[11px] font-black px-3 py-1 rounded-xl">
                                            ۱۷ سوال تخصصی
                                          </span>
                                        </div>

                                        <div>
                                          <h5 className="text-base font-black text-white group-hover:text-teal-300 transition-colors">
                                            بخش ۲: شاخص تفکیک رضایت‌مندی بر اساس سوالات (سوال ۱ تا ۱۷)
                                          </h5>
                                          <p className="text-xs text-slate-400 font-medium mt-1 leading-relaxed">
                                            ارزیابی جزیی به تفکیک سوالات هفده‌گانه تکریم، بهداشت، کادر پزشکی، نحوه پاسخگویی و رسیدگی
                                          </p>
                                        </div>

                                        <div className="flex items-center justify-between pt-3 border-t border-white/10">
                                          <span className="text-[10px] font-bold text-teal-200 bg-teal-500/10 px-2.5 py-0.5 rounded">
                                            تحلیل درصدی (بله / تاحدودی / خیر)
                                          </span>
                                          <span className="text-xs font-black text-teal-400 flex items-center gap-1 group-hover:translate-x-[-4px] transition-transform">
                                            <span>مشاهده تحلیل ۱۷ سوال</span>
                                            <ArrowLeft className="w-4 h-4" />
                                          </span>
                                        </div>
                                      </div>

                                      {/* TILE 3: Exemplary Staff */}
                                      <div
                                        onClick={() => setSelectedSurveyTile('praise')}
                                        className="bg-[#111625] hover:bg-[#182035] border border-white/10 hover:border-emerald-500/50 p-6 rounded-3xl space-y-4 shadow-xl cursor-pointer transition-all duration-300 group relative overflow-hidden"
                                      >
                                        <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500 group-hover:w-3 transition-all" />
                                        <div className="flex items-center justify-between">
                                          <div className="bg-emerald-500/10 p-3 rounded-2xl border border-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
                                            <UserCheck className="w-6 h-6" />
                                          </div>
                                          <span className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[11px] font-black px-3 py-1 rounded-xl">
                                            {surveyedPatients.filter(p => p.satisfactionSurvey?.q19.trim()).length} قدردانی ثبت‌شده
                                          </span>
                                        </div>

                                        <div>
                                          <h5 className="text-base font-black text-white group-hover:text-emerald-300 transition-colors">
                                            بخش ۳: پرسنل نمونه و قدردانی‌شده توسط بیماران (سوال ۱۹)
                                          </h5>
                                          <p className="text-xs text-slate-400 font-medium mt-1 leading-relaxed">
                                            لیست اسامی پزشکان، پرستاران و کادر اداری و خدماتی مورد تقدیر مستقیم بیماران
                                          </p>
                                        </div>

                                        <div className="flex items-center justify-between pt-3 border-t border-white/10">
                                          <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/10 px-2.5 py-0.5 rounded">
                                            بازخوردهای تشویقی مستقیم
                                          </span>
                                          <span className="text-xs font-black text-emerald-400 flex items-center gap-1 group-hover:translate-x-[-4px] transition-transform">
                                            <span>مشاهده لیست پرسنل نمونه</span>
                                            <ArrowLeft className="w-4 h-4" />
                                          </span>
                                        </div>
                                      </div>

                                      {/* TILE 4: Critiques & Suggestions */}
                                      <div
                                        onClick={() => setSelectedSurveyTile('suggestions')}
                                        className="bg-[#111625] hover:bg-[#182035] border border-white/10 hover:border-amber-500/50 p-6 rounded-3xl space-y-4 shadow-xl cursor-pointer transition-all duration-300 group relative overflow-hidden"
                                      >
                                        <div className="absolute top-0 right-0 w-2 h-full bg-amber-500 group-hover:w-3 transition-all" />
                                        <div className="flex items-center justify-between">
                                          <div className="bg-amber-500/10 p-3 rounded-2xl border border-amber-500/20 text-amber-400 group-hover:scale-110 transition-transform">
                                            <MessageSquare className="w-6 h-6" />
                                          </div>
                                          <span className="bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[11px] font-black px-3 py-1 rounded-xl">
                                            {surveyedPatients.filter(p => p.satisfactionSurvey?.q20.trim()).length} بازخورد اصلاحی
                                          </span>
                                        </div>

                                        <div>
                                          <h5 className="text-base font-black text-white group-hover:text-amber-300 transition-colors">
                                            بخش ۴: انتقادات و پیشنهادات جهت بهبود خدمات (سوال ۲۰)
                                          </h5>
                                          <p className="text-xs text-slate-400 font-medium mt-1 leading-relaxed">
                                            مجموعه نظرات، پیشنهادات سازنده و انتقادات ثبت‌شده جهت اصلاح فرآیندها و ارتقای خدمات
                                          </p>
                                        </div>

                                        <div className="flex items-center justify-between pt-3 border-t border-white/10">
                                          <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded">
                                            پیشنهادات بهبود کیفیت
                                          </span>
                                          <span className="text-xs font-black text-amber-400 flex items-center gap-1 group-hover:translate-x-[-4px] transition-transform">
                                            <span>مشاهده پیشنهادات و انتقادات</span>
                                            <ArrowLeft className="w-4 h-4" />
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  /* DETAILED PAGE FOR SELECTED SECTION */
                                  <div className="space-y-6">
                                    {/* Back Button & Tile Header */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/5 border border-white/10 p-4 rounded-2xl">
                                      <button
                                        onClick={() => setSelectedSurveyTile(null)}
                                        className="inline-flex items-center gap-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-black px-4 py-2.5 rounded-xl shadow-lg transition cursor-pointer self-start sm:self-auto"
                                      >
                                        <ArrowRight className="w-4 h-4" />
                                        <span>بازگشت به کارت‌های اصلی شاخص‌های رضایتمندی</span>
                                      </button>

                                      <span className="text-xs font-black text-slate-300">
                                        در حال مشاهده صفحه: {
                                          selectedSurveyTile === 'overall' ? 'بخش ۱ (شاخص کلی رضایتمندی)' :
                                          selectedSurveyTile === 'questions' ? 'بخش ۲ (شاخص تفکیکی ۱۷ سوال)' :
                                          selectedSurveyTile === 'praise' ? 'بخش ۳ (پرسنل نمونه)' :
                                          'بخش ۴ (انتقادات و پیشنهادات)'
                                        }
                                      </span>
                                    </div>

                                    {/* TILE 1 PAGE: Q18 Overall Satisfaction Card */}
                                    {selectedSurveyTile === 'overall' && (
                                      <div className="bg-[#111625] border border-white/10 p-6 sm:p-7 rounded-3xl space-y-6 shadow-2xl relative overflow-hidden">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                                          <div className="flex items-center gap-2.5">
                                            <div className="bg-sky-500/10 p-2.5 rounded-2xl border border-sky-500/20 text-sky-400">
                                              <Star className="w-5 h-5 fill-sky-400/30" />
                                            </div>
                                            <div>
                                              <h5 className="text-sm font-black text-white">شاخص کلی رضایتمندی بیمارستان (سوال ۱۸)</h5>
                                              <p className="text-[11px] text-slate-400 font-bold mt-0.5">ارزیابی کلی بیماران از مجموع خدمات ارائه شده</p>
                                            </div>
                                          </div>
                                          <span className="bg-sky-500/15 border border-sky-500/30 text-sky-300 text-xs font-black px-3.5 py-1.5 rounded-xl self-start sm:self-auto">
                                            {totalSurveys} پاسخ ثبت‌شده
                                          </span>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-right">
                                          {/* Excellent */}
                                          <div className="bg-white/5 border border-white/5 p-4 rounded-2xl flex flex-col justify-between h-24 hover:bg-white/10 transition-all">
                                            <span className="text-xs font-black text-slate-300 flex items-center gap-1.5">
                                              <span>عالی</span>
                                              <span>😍</span>
                                            </span>
                                            <div>
                                              <span className="text-2xl font-black font-mono text-indigo-300">{q18Stats.excellent}%</span>
                                              <span className="text-[10px] text-slate-400 block mt-0.5 font-bold">{q18Stats.excCount} بیمار</span>
                                            </div>
                                          </div>

                                          {/* Good */}
                                          <div className="bg-white/5 border border-white/5 p-4 rounded-2xl flex flex-col justify-between h-24 hover:bg-white/10 transition-all">
                                            <span className="text-xs font-black text-slate-300 flex items-center gap-1.5">
                                              <span>خوب</span>
                                              <span>🙂</span>
                                            </span>
                                            <div>
                                              <span className="text-2xl font-black font-mono text-emerald-300">{q18Stats.good}%</span>
                                              <span className="text-[10px] text-slate-400 block mt-0.5 font-bold">{q18Stats.goodCount} بیمار</span>
                                            </div>
                                          </div>

                                          {/* Average */}
                                          <div className="bg-white/5 border border-white/5 p-4 rounded-2xl flex flex-col justify-between h-24 hover:bg-white/10 transition-all">
                                            <span className="text-xs font-black text-slate-300 flex items-center gap-1.5">
                                              <span>متوسط</span>
                                              <span>😐</span>
                                            </span>
                                            <div>
                                              <span className="text-2xl font-black font-mono text-amber-300">{q18Stats.average}%</span>
                                              <span className="text-[10px] text-slate-400 block mt-0.5 font-bold">{q18Stats.avgCount} بیمار</span>
                                            </div>
                                          </div>

                                          {/* Poor */}
                                          <div className="bg-white/5 border border-white/5 p-4 rounded-2xl flex flex-col justify-between h-24 hover:bg-white/10 transition-all">
                                            <span className="text-xs font-black text-slate-300 flex items-center gap-1.5">
                                              <span>ضعیف</span>
                                              <span>😞</span>
                                            </span>
                                            <div>
                                              <span className="text-2xl font-black font-mono text-rose-300">{q18Stats.poor}%</span>
                                              <span className="text-[10px] text-slate-400 block mt-0.5 font-bold">{q18Stats.poorCount} بیمار</span>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Visual Bar */}
                                        <div className="space-y-1.5">
                                          <div className="w-full h-4 rounded-full overflow-hidden flex border border-white/5">
                                            <div className="bg-indigo-500" style={{ width: `${q18Stats.excellent}%` }} title={`عالی: ${q18Stats.excellent}%`} />
                                            <div className="bg-emerald-500" style={{ width: `${q18Stats.good}%` }} title={`خوب: ${q18Stats.good}%`} />
                                            <div className="bg-amber-500" style={{ width: `${q18Stats.average}%` }} title={`متوسط: ${q18Stats.average}%`} />
                                            <div className="bg-rose-500" style={{ width: `${q18Stats.poor}%` }} title={`ضعیف: ${q18Stats.poor}%`} />
                                          </div>
                                          <div className="flex justify-between text-[11px] text-slate-400 font-bold px-1">
                                            <span className="text-indigo-300">عالی: {q18Stats.excellent}%</span>
                                            <span className="text-emerald-300">خوب: {q18Stats.good}%</span>
                                            <span className="text-amber-300">متوسط: {q18Stats.average}%</span>
                                            <span className="text-rose-300">ضعیف: {q18Stats.poor}%</span>
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {/* TILE 2 PAGE: Q1-Q17 Detailed Breakdown */}
                                    {selectedSurveyTile === 'questions' && (
                                      <div className="bg-[#111625] border border-white/10 p-6 sm:p-7 rounded-3xl space-y-5 shadow-2xl relative">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                                          <div className="flex items-center gap-2.5">
                                            <div className="bg-teal-500/10 p-2.5 rounded-2xl border border-teal-500/20 text-teal-400">
                                              <ClipboardList className="w-5 h-5" />
                                            </div>
                                            <div>
                                              <h5 className="text-sm font-black text-white">شاخص تفکیک رضایت‌مندی بر اساس سوالات (سوال ۱ تا ۱۷)</h5>
                                              <p className="text-[11px] text-slate-400 font-bold mt-0.5">تحلیل آماری به تفکیک سوالات هفده‌گانه سنجش کیفیت خدمات بیمارستان</p>
                                            </div>
                                          </div>
                                          <span className="bg-teal-500/15 border border-teal-500/30 text-teal-300 text-xs font-black px-3.5 py-1.5 rounded-xl self-start sm:self-auto">
                                            ۱۷ سوال ارزیابی
                                          </span>
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-4">
                                          {questionStats.map((q, idx) => (
                                            <div key={q.id} className="bg-white/5 border border-white/10 p-4.5 rounded-2xl space-y-3 shadow-inner hover:border-teal-500/30 transition-all">
                                              <div className="flex items-start gap-2.5 text-xs text-right">
                                                <span className="bg-teal-500/15 text-teal-300 font-mono font-black px-2.5 py-0.5 rounded-lg shrink-0 border border-teal-500/30">{idx + 1}</span>
                                                <p className="font-bold text-slate-200 leading-relaxed text-justify">{q.text}</p>
                                              </div>

                                              <div className="space-y-1.5">
                                                <div className="w-full bg-slate-900/60 h-2.5 rounded-full overflow-hidden flex border border-white/5">
                                                  <div className="bg-emerald-500" style={{ width: `${q.yes}%` }} title={`بله: ${q.yes}%`} />
                                                  <div className="bg-amber-500" style={{ width: `${q.partial}%` }} title={`تا حدودی: ${q.partial}%`} />
                                                  <div className="bg-rose-500" style={{ width: `${q.no}%` }} title={`خیر: ${q.no}%`} />
                                                </div>
                                                <div className="flex justify-between text-[10px] text-slate-400 font-bold px-1">
                                                  <span className="text-emerald-300">بله: {q.yes}% ({q.yesCount})</span>
                                                  <span className="text-amber-300">تاحدودی: {q.partial}% ({q.partialCount})</span>
                                                  <span className="text-rose-300">خیر: {q.no}% ({q.noCount})</span>
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* TILE 3 PAGE: Praised Staff / Exemplary Staff (Q19) */}
                                    {selectedSurveyTile === 'praise' && (
                                      <div className="bg-[#111625] border border-white/10 p-6 sm:p-7 rounded-3xl space-y-5 shadow-2xl relative">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                                          <div className="flex items-center gap-2.5">
                                            <div className="bg-emerald-500/10 p-2.5 rounded-2xl border border-emerald-500/20 text-emerald-400">
                                              <UserCheck className="w-5 h-5" />
                                            </div>
                                            <div>
                                              <h5 className="text-sm font-black text-white">پرسنل نمونه و قدردانی‌شده توسط بیماران (سوال ۱۹)</h5>
                                              <p className="text-[11px] text-slate-400 font-bold mt-0.5">اسامی پزشکان، پرستاران و کادری که مورد رضایت ویژه بیماران قرار گرفته‌اند</p>
                                            </div>
                                          </div>
                                          <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-black px-3.5 py-1.5 rounded-xl self-start sm:self-auto">
                                            {surveyedPatients.filter(p => p.satisfactionSurvey?.q19.trim()).length} مورد قدردانی ثبت‌شده
                                          </span>
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-4">
                                          {surveyedPatients.filter(p => p.satisfactionSurvey?.q19.trim()).map(p => (
                                            <div key={p.nationalId} className="bg-white/5 border border-white/10 p-4.5 rounded-2xl space-y-2.5 text-right hover:border-emerald-500/30 transition-all">
                                              <div className="flex justify-between items-center text-xs font-bold border-b border-white/5 pb-2">
                                                <span className="text-white font-black">{p.name} (پرونده: {p.fileNumber})</span>
                                                <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-lg text-[10px]">
                                                  بخش {departments.find(d => d.id === p.departmentId)?.name || 'نامشخص'}
                                                </span>
                                              </div>
                                              <div className="bg-emerald-950/20 border border-emerald-500/20 p-3 rounded-xl text-xs text-emerald-200 font-semibold leading-relaxed whitespace-pre-wrap">
                                                <span className="text-emerald-400 font-bold ml-1">🩺 پرسنل مورد رضایت:</span>
                                                {p.satisfactionSurvey?.q19}
                                              </div>
                                            </div>
                                          ))}
                                          {surveyedPatients.filter(p => p.satisfactionSurvey?.q19.trim()).length === 0 && (
                                            <div className="col-span-2 bg-white/5 border border-white/5 p-8 rounded-2xl text-center">
                                              <p className="text-xs text-slate-400 font-bold">هیچ نام پرسنلی هنوز توسط بیماران در سوال ۱۹ ثبت نشده است.</p>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}

                                    {/* TILE 4 PAGE: Critiques & Suggestions (Q20) */}
                                    {selectedSurveyTile === 'suggestions' && (
                                      <div className="bg-[#111625] border border-white/10 p-6 sm:p-7 rounded-3xl space-y-5 shadow-2xl relative">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                                          <div className="flex items-center gap-2.5">
                                            <div className="bg-amber-500/10 p-2.5 rounded-2xl border border-amber-500/20 text-amber-400">
                                              <MessageSquare className="w-5 h-5" />
                                            </div>
                                            <div>
                                              <h5 className="text-sm font-black text-white">انتقادات و پیشنهادات جهت بهبود خدمات (سوال ۲۰)</h5>
                                              <p className="text-[11px] text-slate-400 font-bold mt-0.5">نظرات، پیشنهادات سازنده و موارد نیازمند اصلاح ثبت‌شده توسط بیماران</p>
                                            </div>
                                          </div>
                                          <span className="bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-black px-3.5 py-1.5 rounded-xl self-start sm:self-auto">
                                            {surveyedPatients.filter(p => p.satisfactionSurvey?.q20.trim()).length} مورد بازخورد اصلاحی
                                          </span>
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-4">
                                          {surveyedPatients.filter(p => p.satisfactionSurvey?.q20.trim()).map(p => (
                                            <div key={p.nationalId} className="bg-white/5 border border-white/10 p-4.5 rounded-2xl space-y-2.5 text-right hover:border-amber-500/30 transition-all">
                                              <div className="flex justify-between items-center text-xs font-bold border-b border-white/5 pb-2">
                                                <span className="text-white font-black">{p.name} (پرونده: {p.fileNumber})</span>
                                                <span className="text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-lg text-[10px]">
                                                  بخش {departments.find(d => d.id === p.departmentId)?.name || 'نامشخص'}
                                                </span>
                                              </div>
                                              <div className="bg-amber-950/20 border border-amber-500/20 p-3 rounded-xl text-xs text-amber-200 font-semibold leading-relaxed whitespace-pre-wrap">
                                                <span className="text-amber-400 font-bold ml-1">💡 متن پیشنهاد/انتقاد:</span>
                                                {p.satisfactionSurvey?.q20}
                                              </div>
                                            </div>
                                          ))}
                                          {surveyedPatients.filter(p => p.satisfactionSurvey?.q20.trim()).length === 0 && (
                                            <div className="col-span-2 bg-white/5 border border-white/5 p-8 rounded-2xl text-center">
                                              <p className="text-xs text-slate-400 font-bold">هیچ انتقاد یا پیشنهادی هنوز توسط بیماران در سوال ۲۰ ثبت نشده است.</p>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                    </div>
                  )}

                  {/* TAB 2: REGISTER NEW DISCHARGED PATIENT */}
                  {adminTab === 'register' && (
                    <div>
                      <div className="mb-6">
                        <h3 className="text-xl font-black text-white mb-1.5 flex items-center gap-2">
                          <Plus className="w-6 h-6 text-sky-400 animate-pulse" />
                          <span>ثبت و ترخیص بیمار جدید در سامانه پیگیری</span>
                        </h3>
                        <p className="text-xs text-slate-300 font-medium">مشخصات بیمار را جهت اعطای دسترسی به کارتابل پیگیری وارد نمایید.</p>
                      </div>

                      <form onSubmit={handleRegisterPatient} className="space-y-5 max-w-2xl">
                        {regSuccessMsg && (
                          <div className="bg-emerald-950/30 border border-emerald-500/30 text-emerald-200 text-xs font-black p-4 rounded-xl">
                            {regSuccessMsg}
                          </div>
                        )}
                        {regErrorMsg && (
                          <div className="bg-rose-950/30 border border-rose-500/30 text-rose-200 text-xs font-black p-4 rounded-xl">
                            {regErrorMsg}
                          </div>
                        )}

                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-300 mb-2">کد ملی بیمار:</label>
                            <input
                              type="text"
                              placeholder="کد ملی ده رقمی"
                              value={regNationalId}
                              onChange={(e) => setRegNationalId(e.target.value)}
                              className="w-full text-xs bg-white/5 border border-white/10 text-white placeholder:text-slate-500 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-400/50 font-bold"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-300 mb-2">کد کاربری جهت ورود بیمار (اختیاری):</label>
                            <input
                              type="text"
                              placeholder="در صورت خالی بودن، کد ملی قرار می‌گیرد"
                              value={regUserCode}
                              onChange={(e) => setRegUserCode(e.target.value)}
                              className="w-full text-xs bg-white/5 border border-white/10 text-white placeholder:text-slate-500 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-400/50 font-bold font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-300 mb-2">رمز ورود بیمار به سامانه (اختیاری):</label>
                            <input
                              type="text"
                              placeholder="در صورت خالی بودن، کد ملی قرار می‌گیرد"
                              value={regPassword}
                              onChange={(e) => setRegPassword(e.target.value)}
                              className="w-full text-xs bg-white/5 border border-white/10 text-white placeholder:text-slate-500 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-400/50 font-bold font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-300 mb-2">شماره پرونده بیمارستانی:</label>
                            <input
                              type="text"
                              placeholder="مثال: ۹۹۰۱۲۳"
                              value={regFileNumber}
                              onChange={(e) => setRegFileNumber(e.target.value)}
                              className="w-full text-xs bg-white/5 border border-white/10 text-white placeholder:text-slate-500 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-400/50 font-bold"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-300 mb-2">نام و نام خانوادگی بیمار:</label>
                            <input
                              type="text"
                              placeholder="مثال: محمد احمدی"
                              value={regName}
                              onChange={(e) => setRegName(e.target.value)}
                              className="w-full text-xs bg-white/5 border border-white/10 text-white placeholder:text-slate-500 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-400/50 font-bold"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-300 mb-2">سن بیمار:</label>
                            <input
                              type="number"
                              placeholder="مثال: ۵۸"
                              value={regAge}
                              onChange={(e) => setRegAge(e.target.value)}
                              className="w-full text-xs bg-white/5 border border-white/10 text-white placeholder:text-slate-500 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-400/50 font-bold"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-300 mb-2">شماره تماس بیمار:</label>
                            <input
                              type="text"
                              placeholder="مثال: ۰۹۱۲..."
                              value={regPhone}
                              onChange={(e) => setRegPhone(e.target.value)}
                              className="w-full text-xs bg-white/5 border border-white/10 text-white placeholder:text-slate-500 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-400/50 font-bold"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-300 mb-2">تاریخ بستری (هجری شمسی):</label>
                            <ShamsiDatePicker
                              value={regAdmissionDate}
                              onChange={(val) => setRegAdmissionDate(val)}
                              placeholder="انتخاب تاریخ بستری..."
                              isDark={true}
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-300 mb-2">بیماری ترخیص شده (تایپ کنید):</label>
                            <input
                              type="text"
                              placeholder="مثال: دیابت، نارسایی قلبی، تالاسمی"
                              value={regDiseaseName}
                              onChange={(e) => setRegDiseaseName(e.target.value)}
                              className="w-full text-xs bg-[#111625] border border-white/10 text-white placeholder:text-slate-500 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-400/50 font-bold"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-300 mb-2">بخش بیمارستان:</label>
                            <select
                              value={currentAdmin?.role === 'super' ? regDeptId : currentAdmin?.departmentId}
                              onChange={(e) => setRegDeptId(e.target.value)}
                              disabled={currentAdmin?.role !== 'super'}
                              className="w-full text-xs bg-[#111625] border border-white/10 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-400/50 font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <option value="" className="bg-[#111625] text-slate-400">-- انتخاب بخش --</option>
                              {departments
                                .filter(d => currentAdmin?.role === 'super' ? true : d.id === currentAdmin?.departmentId)
                                .map(d => (
                                  <option key={d.id} value={d.id} className="bg-[#111625] text-white font-bold">{d.name}</option>
                                ))}
                            </select>
                          </div>

                          <div className="sm:col-span-2 bg-[#111625]/60 border border-sky-500/30 p-4 rounded-2xl space-y-2.5">
                            <label className="block text-xs font-bold text-sky-300 flex items-center gap-2">
                              <FlaskConical className="w-4 h-4 text-sky-400" />
                              <span>دسته‌بندی بیماری‌های ویژه (جهت شاخص‌گیری بیمارستان):</span>
                            </label>
                            <select
                              value={regSpecialDisease}
                              onChange={(e) => setRegSpecialDisease(e.target.value)}
                              className="w-full text-xs bg-[#111625] border border-sky-500/40 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-sky-500/50 font-bold cursor-pointer"
                            >
                              {SPECIAL_DISEASES.map(d => (
                                <option key={d} value={d} className="bg-[#111625] text-white font-bold">{d}</option>
                              ))}
                            </select>
                            <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                              * در صورتی که بیمار جزو لیست بیماری‌های ویژه بیمارستان باشد آن را انتخاب کنید؛ در غیر این صورت گزینه «سایر بیماران» انتخاب شده می‌ماند. این انتخاب صرفاً جهت استخراج شاخص‌های بیمارستانی است و در پنل بیمار نمایش داده نمی‌شود.
                            </p>
                          </div>

                          {/* TRIAGE LEVEL INITIAL SELECTION */}
                          <div className="sm:col-span-2 bg-[#111625]/80 border border-emerald-500/30 p-4 rounded-2xl space-y-3">
                            <label className="block text-xs font-bold text-emerald-300 flex items-center gap-2">
                              <Activity className="w-4 h-4 text-emerald-400" />
                              <span>تعیین وضعیت تریاژ اولیه بیمار (سطح قرمز، زرد و سبز):</span>
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <label className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${regFollowupStatus === 'red' ? 'bg-rose-500/20 border-rose-500 text-rose-200' : 'bg-[#111625] border-white/10 text-slate-300 hover:bg-white/5'}`}>
                                <input
                                  type="radio"
                                  name="regTriageStatus"
                                  value="red"
                                  checked={regFollowupStatus === 'red'}
                                  onChange={() => setRegFollowupStatus('red')}
                                  className="accent-rose-500 w-4 h-4"
                                />
                                <div>
                                  <span className="block text-xs font-black text-rose-300">سطح قرمز</span>
                                  <span className="text-[10px] text-slate-400">وضعیت هنوز کنترل نشده</span>
                                </div>
                              </label>

                              <label className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${regFollowupStatus === 'yellow' ? 'bg-amber-500/20 border-amber-500 text-amber-200' : 'bg-[#111625] border-white/10 text-slate-300 hover:bg-white/5'}`}>
                                <input
                                  type="radio"
                                  name="regTriageStatus"
                                  value="yellow"
                                  checked={regFollowupStatus === 'yellow'}
                                  onChange={() => setRegFollowupStatus('yellow')}
                                  className="accent-amber-500 w-4 h-4"
                                />
                                <div>
                                  <span className="block text-xs font-black text-amber-300">سطح زرد</span>
                                  <span className="text-[10px] text-slate-400">وضعیت به صورت ناکافی کنترل شده</span>
                                </div>
                              </label>

                              <label className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${regFollowupStatus === 'green' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-200' : 'bg-[#111625] border-white/10 text-slate-300 hover:bg-white/5'}`}>
                                <input
                                  type="radio"
                                  name="regTriageStatus"
                                  value="green"
                                  checked={regFollowupStatus === 'green'}
                                  onChange={() => setRegFollowupStatus('green')}
                                  className="accent-emerald-500 w-4 h-4"
                                />
                                <div>
                                  <span className="block text-xs font-black text-emerald-300">سطح سبز</span>
                                  <span className="text-[10px] text-slate-400">وضعیت کنترل و در محدوده ایمن</span>
                                </div>
                              </label>
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-300 mb-2.5">آیا بیمار بستری مجدد در ماه اخیر می‌باشد؟</label>
                            <div className="flex gap-6 items-center h-12 bg-[#111625]/50 border border-white/10 rounded-xl px-4">
                              <label className="flex items-center gap-2 text-xs text-white font-bold cursor-pointer">
                                <input
                                  type="radio"
                                  name="regReadmission"
                                  checked={regReadmissionRecentMonth === true}
                                  onChange={() => setRegReadmissionRecentMonth(true)}
                                  className="accent-sky-500 w-4 h-4"
                                />
                                <span>بله</span>
                              </label>
                              <label className="flex items-center gap-2 text-xs text-white font-bold cursor-pointer">
                                <input
                                  type="radio"
                                  name="regReadmission"
                                  checked={regReadmissionRecentMonth === false}
                                  onChange={() => setRegReadmissionRecentMonth(false)}
                                  className="accent-sky-500 w-4 h-4"
                                />
                                <span>خیر</span>
                              </label>
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-300 mb-2.5">آیا بیمار باردار است؟</label>
                            <div className="flex gap-6 items-center h-12 bg-[#111625]/50 border border-white/10 rounded-xl px-4">
                              <label className="flex items-center gap-2 text-xs text-white font-bold cursor-pointer">
                                <input
                                  type="radio"
                                  name="regIsPregnant"
                                  checked={regIsPregnant === true}
                                  onChange={() => setRegIsPregnant(true)}
                                  className="accent-pink-500 w-4 h-4"
                                />
                                <span className="text-pink-300">بله (باردار)</span>
                              </label>
                              <label className="flex items-center gap-2 text-xs text-white font-bold cursor-pointer">
                                <input
                                  type="radio"
                                  name="regIsPregnant"
                                  checked={regIsPregnant === false}
                                  onChange={() => {
                                    setRegIsPregnant(false);
                                    setRegIsHighRiskMother(false);
                                  }}
                                  className="accent-pink-500 w-4 h-4"
                                />
                                <span>خیر</span>
                              </label>
                            </div>
                          </div>

                          {regIsPregnant && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="sm:col-span-2 bg-pink-950/20 border border-pink-500/30 p-4 rounded-2xl"
                            >
                              <label className="block text-xs font-bold text-pink-200 mb-2.5 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse" />
                                <span>آیا بیمار مادر پرخطر است؟</span>
                              </label>
                              <div className="flex gap-6 items-center h-12 bg-[#111625]/80 border border-pink-500/20 rounded-xl px-4">
                                <label className="flex items-center gap-2 text-xs text-white font-bold cursor-pointer">
                                  <input
                                    type="radio"
                                    name="regHighRisk"
                                    checked={regIsHighRiskMother === true}
                                    onChange={() => setRegIsHighRiskMother(true)}
                                    className="accent-rose-500 w-4 h-4"
                                  />
                                  <span className="text-rose-300">بله (مادر پرخطر)</span>
                                </label>
                                <label className="flex items-center gap-2 text-xs text-white font-bold cursor-pointer">
                                  <input
                                    type="radio"
                                    name="regHighRisk"
                                    checked={regIsHighRiskMother === false}
                                    onChange={() => setRegIsHighRiskMother(false)}
                                    className="accent-rose-500 w-4 h-4"
                                  />
                                  <span>خیر</span>
                                </label>
                              </div>
                              <p className="text-[10px] text-pink-300/80 mt-2">
                                * بیماران مادر پرخطر به طور ویژه در شاخص پیگیری ویژه و غربالگری مادران باردار بیمارستان لحاظ خواهد شد.
                              </p>
                            </motion.div>
                          )}

                          <div className="sm:col-span-2">
                            <label className="block text-xs font-bold text-slate-300 mb-2">توضیح جهت راهنمایی بیمار:</label>
                            <textarea
                              placeholder="مثال: بیمار نیاز به بررسی روزانه تب دارد و باید در صورت تهوع شدید به درمانگاه مراجعه کند."
                              value={regGuidanceNotes}
                              onChange={(e) => setRegGuidanceNotes(e.target.value)}
                              rows={3}
                              className="w-full text-xs bg-[#111625] border border-white/10 text-white placeholder:text-slate-500 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-400/50 font-bold resize-none"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            {(() => {
                              if (diseases.length === 0) {
                                return <p className="text-[11px] text-slate-500 font-bold bg-white/5 p-3 rounded-xl">هیچ محتوای آموزشی در بیمارستان ثبت نشده است.</p>;
                              }
                              const filtered = diseases.filter(d => {
                                const dept = departments.find(dep => dep.id === d.departmentId);
                                const q = regDiseaseSearch.toLowerCase();
                                return d.name.toLowerCase().includes(q) || (dept?.name || '').toLowerCase().includes(q);
                              });
                              const dropdownItems = filtered.map(d => ({
                                id: d.id,
                                name: d.name,
                                subtext: departments.find(dep => dep.id === d.departmentId)?.name || ''
                              }));
                              return (
                                <MultiSelectDropdown
                                  label="بیماری‌های هشتگ شده جهت توصیه به مطالعه دقیق (امکان انتخاب از تمام بخش‌های بیمارستان):"
                                  placeholder="🔍 جستجو در نام بیماری یا بخش..."
                                  searchValue={regDiseaseSearch}
                                  onSearchChange={setRegDiseaseSearch}
                                  items={dropdownItems}
                                  selectedIds={regHashtaggedDiseaseIds}
                                  onToggle={(id) => {
                                    if (regHashtaggedDiseaseIds.includes(id)) {
                                      setRegHashtaggedDiseaseIds(regHashtaggedDiseaseIds.filter(x => x !== id));
                                    } else {
                                      setRegHashtaggedDiseaseIds([...regHashtaggedDiseaseIds, id]);
                                    }
                                  }}
                                  accentColor="sky"
                                />
                              );
                            })()}
                          </div>

                          <div className="sm:col-span-2">
                            {(() => {
                              const patientChecklists = customChecklists.filter(c => c.targetType === 'patient');
                              if (patientChecklists.length === 0) {
                                return <p className="text-[11px] text-slate-500 font-bold bg-white/5 p-3 rounded-xl">هیچ چک‌لیست خودارزیابی فعال وجود ندارد.</p>;
                              }
                              const filtered = patientChecklists.filter(c => c.title.toLowerCase().includes(regChecklistSearch.toLowerCase()));
                              const dropdownItems = filtered.map(c => ({
                                id: c.id,
                                name: c.title,
                                subtext: 'چک‌لیست خودارزیابی و مراقبت در منزل'
                              }));
                              return (
                                <MultiSelectDropdown
                                  label="فعال‌سازی چک‌لیست‌های خودارزیابی و مراقبت در منزل برای این بیمار:"
                                  placeholder="🔍 جستجو در نام چک‌لیست‌ها..."
                                  searchValue={regChecklistSearch}
                                  onSearchChange={setRegChecklistSearch}
                                  items={dropdownItems}
                                  selectedIds={regActiveChecklistIds}
                                  onToggle={(id) => {
                                    if (regActiveChecklistIds.includes(id)) {
                                      setRegActiveChecklistIds(regActiveChecklistIds.filter(x => x !== id));
                                    } else {
                                      setRegActiveChecklistIds([...regActiveChecklistIds, id]);
                                    }
                                  }}
                                  accentColor="emerald"
                                />
                              );
                            })()}
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 hover:from-sky-500 hover:via-blue-600 hover:to-indigo-600 text-white font-black px-8 py-3 rounded-xl text-xs shadow-xl shadow-blue-500/10 hover:shadow-blue-500/30 transition-all duration-300 cursor-pointer hover:scale-[1.01] mt-2"
                        >
                          ثبت پرونده ترخیص بیمار
                        </button>
                      </form>
                    </div>
                  )}

                  {/* TAB 3: PATIENTS LIST & FOLLOWUPS */}
                  {adminTab === 'patients' && (
                    <div>
                      {(selectedDeptFilterId === null && currentAdmin.role === 'super') ? (
                        /* Render Grid of Departments */
                        <div>
                          <div className="mb-6">
                            <h3 className="text-xl font-black text-white mb-1.5 flex items-center gap-2">
                              <ClipboardList className="w-6 h-6 text-sky-400 animate-pulse" />
                              <span>لیست بخش‌های بیمارستان جهت مشاهده بیماران</span>
                            </h3>
                            <p className="text-xs text-slate-300 font-medium">لطفاً جهت مشاهده لیست بیماران ترخیص شده و وضعیت خودارزیابی‌ها، بخش مورد نظر را انتخاب فرمایید.</p>
                          </div>

                          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {departments
                              .filter(dept => currentAdmin.role === 'super' ? true : dept.id === currentAdmin.departmentId)
                              .map(dept => {
                                const deptPatients = patients.filter(p => p.departmentId === dept.id);
                                const style = getDeptTileStyle(dept.id, dept.color);
                                  return (
                                    <div
                                      key={dept.id}
                                      onClick={() => setSelectedDeptFilterId(dept.id)}
                                      className={`group rounded-[2rem] border bg-gradient-to-br p-6 shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between hover:scale-[1.03] active:scale-[0.97] ${style.adminBg} ${style.adminBorder} ${style.adminText} overflow-hidden`}
                                    >
                                    <div>
                                      <div className="flex justify-between items-start">
                                        <div className={`mb-4 ${style.iconBg} p-3 rounded-2xl w-fit shadow-md flex items-center justify-center`}>
                                          <DepartmentIcon id={dept.id} className={`w-8 h-8 ${style.iconColor}`} />
                                        </div>
                                        <span className="text-[10px] bg-white/5 text-slate-300 border border-white/10 px-2.5 py-1 rounded-lg font-black font-mono">
                                          {deptPatients.length} بیمار
                                        </span>
                                      </div>
                                      <h3 className="text-base font-black text-white mt-2 mb-1 group-hover:text-sky-300 transition-colors">{dept.name}</h3>
                                      <p className="text-[11px] text-slate-400 font-bold">جهت ورود به کارتابل بیماران و پیگیری علائم کلیک کنید</p>
                                    </div>

                                    <div className="border-t border-white/5 pt-4 mt-6 flex items-center justify-between text-xs font-bold text-sky-400 group-hover:text-sky-300">
                                      <span>ورود به کارتابل</span>
                                      <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      ) : (
                        /* Render Patients list for selected department */
                        (() => {
                          const deptFilteredPatients = patients.filter(
                            p => p.departmentId === selectedDeptFilterId && (currentAdmin.role === 'super' || p.departmentId === currentAdmin.departmentId)
                          );
                          const PATIENTS_PER_PAGE = 15;
                          const totalPages = Math.max(1, Math.ceil(deptFilteredPatients.length / PATIENTS_PER_PAGE));
                          const currentPage = Math.min(patientListPage, totalPages);
                          const paginatedPatients = deptFilteredPatients.slice(
                            (currentPage - 1) * PATIENTS_PER_PAGE,
                            currentPage * PATIENTS_PER_PAGE
                          );

                          return (
                            <div>
                              <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex flex-wrap items-center gap-2">
                                  {currentAdmin.role === 'super' && (
                                    <button
                                      onClick={() => {
                                        setSelectedDeptFilterId(null);
                                        setPatientListPage(1);
                                      }}
                                      className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold px-4 py-2.5 rounded-full transition-all duration-300 cursor-pointer shadow-sm"
                                    >
                                      <ArrowRight className="w-4 h-4 text-sky-400" />
                                      <span>بازگشت به لیست بخش‌ها</span>
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setViewingHistoryNationalId('');
                                      setHistorySearchQuery('');
                                    }}
                                    className="inline-flex items-center gap-2 bg-purple-500/20 hover:bg-purple-500/35 text-purple-200 border border-purple-500/40 px-4 py-2.5 rounded-full text-xs font-black transition-all cursor-pointer shadow-lg shadow-purple-500/10"
                                    title="جستجو و بررسی کلیه سوابق بستری در سیستم بر اساس کد ملی"
                                  >
                                    <History className="w-4 h-4 text-purple-300 animate-spin-slow" />
                                    <span>🔍 استعلام سابقه بستری با کد ملی</span>
                                  </button>
                                </div>
                                <div className="text-right">
                                  <h3 className="text-xl font-black text-white mb-1.5 flex items-center gap-2 justify-end">
                                    <ClipboardList className="w-6 h-6 text-sky-400 animate-pulse" />
                                    <span>بیماران بستری بخش {departments.find(d => d.id === selectedDeptFilterId)?.name}</span>
                                  </h3>
                                  <p className="text-xs text-slate-300 font-medium">لیست بیماران ثبت شده در کارتابل بخش درمانی (صفحه‌بندی هر ۱۵ بیمار) و خروجی کامل سوابق به اکسل.</p>
                                </div>
                              </div>

                              <div className="hidden md:block overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/20 shadow-xl">
                                <table className="w-full text-xs text-right border-collapse">
                                  <thead>
                                    <tr className="bg-white/5 text-slate-300 border-b border-white/10">
                                      <th className="py-4 px-5 font-black">نام بیمار / دانلود اکسل</th>
                                      <th className="py-4 px-5 font-black">کد ملی / کد کاربری</th>
                                      <th className="py-4 px-5 font-black">رمز ورود</th>
                                      <th className="py-4 px-5 font-black">شماره پرونده</th>
                                      <th className="py-4 px-5 font-black">سن</th>
                                      <th className="py-4 px-5 font-black">بیماری</th>
                                      <th className="py-4 px-5 font-black">آخرین وضعیت پیگیری</th>
                                      <th className="py-4 px-5 font-black text-center">عملیات مدیریت</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-white/5">
                                    {paginatedPatients.map(p => (
                                      <tr key={p.nationalId} className="hover:bg-white/5 transition-colors">
                                        <td className="py-4 px-5 font-black text-white">
                                          <div className="flex items-center justify-between gap-2">
                                            <div className="flex flex-col gap-1">
                                              <div className="flex items-center gap-1.5">
                                                <span>{p.name}</span>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setViewingHistoryNationalId(p.nationalId);
                                                    setHistorySearchQuery(p.nationalId);
                                                  }}
                                                  className="bg-purple-500/20 hover:bg-purple-500/35 text-purple-200 border border-purple-500/30 px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0 shadow-sm"
                                                  title="مشاهده سابقه بستری بر اساس کد ملی"
                                                >
                                                  <History className="w-3 h-3 text-purple-300" />
                                                  <span>سابقه بستری</span>
                                                </button>
                                              </div>
                                              {p.isPregnant && (
                                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border w-fit ${p.isHighRiskMother ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-pink-500/20 text-pink-300 border-pink-500/30'}`}>
                                                  {p.isHighRiskMother ? '🤰⚠️ مادر پرخطر' : '🤰 باردار'}
                                                </span>
                                              )}
                                            </div>
                                            <button
                                              type="button"
                                              onClick={() => exportPatientExcel(p, diseases, departments, messages, customChecklists)}
                                              className="bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 px-2 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer shadow-sm shrink-0"
                                              title="دانلود خروجی کامل ارتباطات بیمار در ۳ شیت اکسل (آموزش، پرسش و پاسخ، رضایتمندی)"
                                            >
                                              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                                              <span>دانلود اکسل</span>
                                            </button>
                                          </div>
                                        </td>
                                        <td className="py-4 px-5">
                                          <div className="flex flex-col gap-0.5 font-mono text-[11px]">
                                            <span className="font-bold text-slate-300">{p.nationalId.substring(0, 3) + '***' + p.nationalId.substring(7)}</span>
                                            <span className="text-sky-300 font-black text-[10px]" title="کد کاربری جهت ورود">کد: {p.userCode || p.nationalId}</span>
                                          </div>
                                        </td>
                                        <td className="py-4 px-5 font-mono font-bold text-amber-300 text-[11px]">{p.password || p.nationalId}</td>
                                        <td className="py-4 px-5 font-mono font-bold text-slate-400">{p.fileNumber}</td>
                                        <td className="py-4 px-5 text-slate-300 font-bold">{p.age} سال</td>
                                        <td className="py-4 px-5 font-black text-sky-300">
                                          {diseases.find(d => d.id === p.diseaseId)?.name}
                                        </td>
                                        <td className="py-4 px-5">
                                          <div className="flex flex-col gap-1.5 items-start">
                                            {p.followupStatus === 'pending' ? (
                                              <span className="bg-slate-500/10 text-slate-300 px-2.5 py-1 rounded-full border border-slate-400/20 font-black text-[10px]">در انتظار پاسخ</span>
                                            ) : p.followupStatus === 'green' ? (
                                              <span className="bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-400/20 font-black text-[10px] shadow-[0_0_10px_rgba(16,185,129,0.1)]">سبز (ایمن)</span>
                                            ) : p.followupStatus === 'yellow' ? (
                                              <span className="bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-full border border-amber-400/20 font-black text-[10px] shadow-[0_0_10px_rgba(245,158,11,0.1)]">زرد (هشدار)</span>
                                            ) : (
                                              <span className="bg-rose-500/20 text-rose-300 px-2.5 py-1 rounded-full border border-rose-400/20 font-black text-[10px] animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.2)]">قرمز (اورژانس!)</span>
                                            )}
                                            <div className="flex items-center gap-1 mt-0.5" title="تغییر مستقیم سطح تریاژ بیمار">
                                              <button
                                                type="button"
                                                onClick={() => handleUpdatePatientFollowupStatus(p.nationalId, 'red')}
                                                className={`px-1.5 py-0.5 rounded text-[9px] font-black border transition-all cursor-pointer ${p.followupStatus === 'red' ? 'bg-rose-500 text-white border-rose-400 shadow-sm' : 'bg-white/5 text-rose-400/60 border-white/10 hover:bg-rose-500/20 hover:text-rose-300'}`}
                                                title="سطح قرمز (کنترل‌نشده)"
                                              >
                                                قرمز
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleUpdatePatientFollowupStatus(p.nationalId, 'yellow')}
                                                className={`px-1.5 py-0.5 rounded text-[9px] font-black border transition-all cursor-pointer ${p.followupStatus === 'yellow' ? 'bg-amber-500 text-white border-amber-400 shadow-sm' : 'bg-white/5 text-amber-400/60 border-white/10 hover:bg-amber-500/20 hover:text-amber-300'}`}
                                                title="سطح زرد (کنترل ناکافی)"
                                              >
                                                زرد
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleUpdatePatientFollowupStatus(p.nationalId, 'green')}
                                                className={`px-1.5 py-0.5 rounded text-[9px] font-black border transition-all cursor-pointer ${p.followupStatus === 'green' || (!p.followupStatus && p.followupStatus !== 'pending') ? 'bg-emerald-500 text-white border-emerald-400 shadow-sm' : 'bg-white/5 text-emerald-400/60 border-white/10 hover:bg-emerald-500/20 hover:text-emerald-300'}`}
                                                title="سطح سبز (محدوده ایمن)"
                                              >
                                                سبز
                                              </button>
                                            </div>
                                          </div>
                                        </td>
                                        <td className="py-4 px-5 text-center">
                                          <div className="flex items-center justify-center gap-2">
                                            <button
                                              type="button"
                                              onClick={() => setViewingFollowupsPatient(p)}
                                              className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg font-bold text-[10px] transition-all flex items-center gap-1 cursor-pointer"
                                              title="مشاهده گزارش‌های روزانه و خودارزیابی‌های بیمار"
                                            >
                                              <ClipboardCheck className="w-3.5 h-3.5" />
                                              <span>پیگیری علائم</span>
                                            </button>
                                            {p.satisfactionSurvey ? (
                                              <button
                                                type="button"
                                                onClick={() => setSelectedSurveyPatient(p)}
                                                className="bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/20 px-2.5 py-1.5 rounded-lg font-bold text-[10px] transition-all flex items-center gap-1 cursor-pointer"
                                                title="مشاهده پاسخنامه رضایت‌مندی"
                                              >
                                                <HeartHandshake className="w-3.5 h-3.5" />
                                                <span>فرم رضایت</span>
                                              </button>
                                            ) : (
                                              <span className="text-[10px] text-slate-500 font-bold px-2 py-1.5">فاقد فرم</span>
                                            )}
                                            <button
                                              type="button"
                                              onClick={() => handleStartEditPatient(p)}
                                              className="bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 px-2.5 py-1.5 rounded-lg font-bold text-[10px] transition-all flex items-center gap-1 cursor-pointer"
                                            >
                                              <Edit className="w-3.5 h-3.5" />
                                              <span>ویرایش</span>
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => setDeletingPatientId(p.nationalId)}
                                              className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 px-2.5 py-1.5 rounded-lg font-bold text-[10px] transition-all flex items-center gap-1 cursor-pointer"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                              <span>حذف</span>
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                    {deptFilteredPatients.length === 0 && (
                                      <tr>
                                        <td colSpan={7} className="text-center py-12 text-slate-500 font-bold">
                                          بیماری یافت نشد.
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>

                              {/* Mobile View: High-Contrast Grid Cards */}
                              <div className="block md:hidden space-y-4">
                                {paginatedPatients.map(p => (
                                  <div key={p.nationalId} className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3 shadow-lg relative overflow-hidden">
                                    <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="font-black text-white text-sm">{p.name}</span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setViewingHistoryNationalId(p.nationalId);
                                            setHistorySearchQuery(p.nationalId);
                                          }}
                                          className="bg-purple-500/20 hover:bg-purple-500/35 text-purple-200 border border-purple-500/30 px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0 shadow-sm"
                                          title="مشاهده سابقه بستری بر اساس کد ملی"
                                        >
                                          <History className="w-3 h-3 text-purple-300" />
                                          <span>سابقه بستری</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => exportPatientExcel(p, diseases, departments, messages, customChecklists)}
                                          className="bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0"
                                          title="دانلود خروجی اکسل ۳ شیت"
                                        >
                                          <FileSpreadsheet className="w-3 h-3 text-emerald-400" />
                                          <span>اکسل</span>
                                        </button>
                                      </div>
                                      {p.followupStatus === 'pending' ? (
                                        <span className="bg-slate-500/10 text-slate-300 px-2.5 py-1 rounded-full border border-slate-400/20 font-black text-[10px]">انتظار پاسخ</span>
                                      ) : p.followupStatus === 'green' ? (
                                        <span className="bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-400/20 font-black text-[10px]">ایمن (سبز)</span>
                                      ) : p.followupStatus === 'yellow' ? (
                                        <span className="bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-full border border-amber-400/20 font-black text-[10px]">هشدار (زرد)</span>
                                      ) : (
                                        <span className="bg-rose-500/20 text-rose-300 px-2.5 py-1 rounded-full border border-rose-400/20 font-black text-[10px] animate-pulse">اورژانس (قرمز!)</span>
                                      )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
                                      <div>
                                        <span className="text-slate-400 block mb-0.5">کد ملی بیمار:</span>
                                        <span className="font-mono font-bold text-slate-300">{p.nationalId.substring(0, 3) + '***' + p.nationalId.substring(7)}</span>
                                      </div>
                                      <div>
                                        <span className="text-slate-400 block mb-0.5">کد کاربری جهت ورود:</span>
                                        <span className="font-mono font-bold text-sky-300">{p.userCode || p.nationalId}</span>
                                      </div>
                                      <div>
                                        <span className="text-slate-400 block mb-0.5">رمز ورود:</span>
                                        <span className="font-mono font-bold text-amber-300">{p.password || p.nationalId}</span>
                                      </div>
                                      <div>
                                        <span className="text-slate-400 block mb-0.5">شماره پرونده:</span>
                                        <span className="font-mono font-bold text-slate-300">{p.fileNumber}</span>
                                      </div>
                                      <div>
                                        <span className="text-slate-400 block mb-0.5">تشخیص بیماری:</span>
                                        <span className="font-black text-sky-300">{diseases.find(d => d.id === p.diseaseId)?.name}</span>
                                      </div>
                                      <div>
                                        <span className="text-slate-400 block mb-0.5">سن بیمار:</span>
                                        <span className="font-bold text-slate-300">{p.age} سال</span>
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-end gap-2 border-t border-white/5 pt-2.5 mt-2">
                                      <button
                                        type="button"
                                        onClick={() => setViewingFollowupsPatient(p)}
                                        className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1 cursor-pointer"
                                      >
                                        <ClipboardCheck className="w-3.5 h-3.5" />
                                        <span>پیگیری علائم</span>
                                      </button>
                                      {p.satisfactionSurvey && (
                                        <button
                                          type="button"
                                          onClick={() => setSelectedSurveyPatient(p)}
                                          className="bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/20 px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1 cursor-pointer"
                                        >
                                          <HeartHandshake className="w-3.5 h-3.5" />
                                          <span>فرم رضایت</span>
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleStartEditPatient(p)}
                                        className="bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1 cursor-pointer"
                                      >
                                        <Edit className="w-3.5 h-3.5" />
                                        <span>ویرایش مشخصات</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setDeletingPatientId(p.nationalId)}
                                        className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1 cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>حذف پرونده</span>
                                      </button>
                                    </div>
                                  </div>
                                ))}
                                {deptFilteredPatients.length === 0 && (
                                  <div className="text-center py-12 text-slate-500 font-bold text-xs bg-white/5 border border-white/10 rounded-2xl">
                                    بیماری یافت نشد.
                                  </div>
                                )}
                              </div>

                              {/* Pagination Controls */}
                              {totalPages > 1 && (
                                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/5 border border-white/10 rounded-2xl p-4 shadow-lg">
                                  <div className="text-xs text-slate-300 font-bold">
                                    نمایش <span className="text-sky-400 font-mono">{(currentPage - 1) * PATIENTS_PER_PAGE + 1}</span> تا{' '}
                                    <span className="text-sky-400 font-mono">{Math.min(currentPage * PATIENTS_PER_PAGE, deptFilteredPatients.length)}</span> از کل{' '}
                                    <span className="text-sky-400 font-mono">{deptFilteredPatients.length}</span> بیمار ثبت شده (صفحه {currentPage} از {totalPages})
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      disabled={currentPage === 1}
                                      onClick={() => setPatientListPage(prev => Math.max(1, prev - 1))}
                                      className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-slate-200 text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-all flex items-center gap-1 cursor-pointer"
                                    >
                                      <ChevronRight className="w-4 h-4" />
                                      <span>صفحه قبل</span>
                                    </button>

                                    <div className="flex items-center gap-1 mx-1 overflow-x-auto max-w-[240px] py-1">
                                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                                        <button
                                          key={pageNum}
                                          type="button"
                                          onClick={() => setPatientListPage(pageNum)}
                                          className={`w-8 h-8 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                                            pageNum === currentPage
                                              ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30 scale-105 border border-sky-400'
                                              : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10'
                                          }`}
                                        >
                                          {pageNum}
                                        </button>
                                      ))}
                                    </div>

                                    <button
                                      type="button"
                                      disabled={currentPage === totalPages}
                                      onClick={() => setPatientListPage(prev => Math.min(totalPages, prev + 1))}
                                      className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-slate-200 text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-all flex items-center gap-1 cursor-pointer"
                                    >
                                      <span>صفحه بعد</span>
                                      <ChevronLeft className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()
                      )}

                      {/* CUSTOM MODALS FOR PATIENT CRUD */}
                      {/* Patient edit is now handled on a dedicated full-page screen 'admin_edit_patient' */}

                      {/* 1.5 VIEW CHECKLIST SUBMISSIONS / TIMELINE OF SYMPTOM MONITORING */}
                      {viewingFollowupsPatient && (() => {
                        const subs = viewingFollowupsPatient.checklistSubmissions || [];
                        return (
                          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md animate-fade-in text-right flex justify-center items-start p-4 scrollbar-thin">
                            <div className="bg-[#111625] border border-white/10 rounded-[2rem] w-full max-w-2xl my-8 p-6 md:p-8 shadow-2xl relative text-right">
                              <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-5">
                                <div className="flex items-center gap-2">
                                  <ClipboardCheck className="w-6 h-6 text-emerald-400" />
                                  <h3 className="text-sm font-black text-white">تاریخچه خودارزیابی‌ها و گزارش‌های روزانه بیمار: {viewingFollowupsPatient.name}</h3>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setViewingFollowupsPatient(null)}
                                  className="text-slate-400 hover:text-white transition-colors cursor-pointer text-[10px] font-black flex items-center gap-1 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5"
                                >
                                  ✕ بستن پنجره
                                </button>
                              </div>

                              <div className="bg-[#111625]/90 border border-emerald-500/30 p-4 rounded-2xl mb-6 space-y-3">
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-bold text-white border-b border-white/10 pb-3">
                                  <div>
                                    <span className="text-slate-400 block mb-1">نام و فامیلی:</span>
                                    <span className="text-white">{viewingFollowupsPatient.name}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block mb-1">کد ملی:</span>
                                    <span className="text-slate-300">{viewingFollowupsPatient.nationalId}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block mb-1">شماره پرونده:</span>
                                    <span className="text-teal-300 font-mono">{viewingFollowupsPatient.fileNumber}</span>
                                  </div>
                                </div>

                                <div className="pt-1">
                                  <label className="block text-xs font-black text-emerald-300 mb-2 flex items-center justify-between">
                                    <span className="flex items-center gap-1.5">
                                      <Activity className="w-4 h-4 text-emerald-400" />
                                      <span>ویرایش و تعیین وضعیت تریاژ بیمار:</span>
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-normal">
                                      (تغییرات بلافاصله ذخیره و در شاخص‌ها و لیست بیمارستان اعمال می‌شود)
                                    </span>
                                  </label>

                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                    <button
                                      type="button"
                                      onClick={() => handleUpdatePatientFollowupStatus(viewingFollowupsPatient.nationalId, 'red')}
                                      className={`p-2.5 rounded-xl border flex items-center justify-between text-right transition-all cursor-pointer ${
                                        viewingFollowupsPatient.followupStatus === 'red'
                                          ? 'bg-rose-500/25 border-rose-500 text-rose-200 ring-2 ring-rose-500/40 shadow-lg'
                                          : 'bg-white/5 border-white/10 text-slate-400 hover:bg-rose-500/10 hover:text-rose-300'
                                      }`}
                                    >
                                      <div>
                                        <span className="block text-xs font-black text-rose-300">سطح قرمز</span>
                                        <span className="text-[9px] text-rose-200/70">کنترل‌نشده (اورژانس)</span>
                                      </div>
                                      {viewingFollowupsPatient.followupStatus === 'red' && <CheckCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleUpdatePatientFollowupStatus(viewingFollowupsPatient.nationalId, 'yellow')}
                                      className={`p-2.5 rounded-xl border flex items-center justify-between text-right transition-all cursor-pointer ${
                                        viewingFollowupsPatient.followupStatus === 'yellow'
                                          ? 'bg-amber-500/25 border-amber-500 text-amber-200 ring-2 ring-amber-500/40 shadow-lg'
                                          : 'bg-white/5 border-white/10 text-slate-400 hover:bg-amber-500/10 hover:text-amber-300'
                                      }`}
                                    >
                                      <div>
                                        <span className="block text-xs font-black text-amber-300">سطح زرد</span>
                                        <span className="text-[9px] text-amber-200/70">کنترل ناکافی (هشدار)</span>
                                      </div>
                                      {viewingFollowupsPatient.followupStatus === 'yellow' && <CheckCircle className="w-4 h-4 text-amber-400 shrink-0" />}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleUpdatePatientFollowupStatus(viewingFollowupsPatient.nationalId, 'green')}
                                      className={`p-2.5 rounded-xl border flex items-center justify-between text-right transition-all cursor-pointer ${
                                        viewingFollowupsPatient.followupStatus === 'green' || !viewingFollowupsPatient.followupStatus
                                          ? 'bg-emerald-500/25 border-emerald-500 text-emerald-200 ring-2 ring-emerald-500/40 shadow-lg'
                                          : 'bg-white/5 border-white/10 text-slate-400 hover:bg-emerald-500/10 hover:text-emerald-300'
                                      }`}
                                    >
                                      <div>
                                        <span className="block text-xs font-black text-emerald-300">سطح سبز</span>
                                        <span className="text-[9px] text-emerald-200/70">محدوده ایمن</span>
                                      </div>
                                      {(viewingFollowupsPatient.followupStatus === 'green' || !viewingFollowupsPatient.followupStatus) && (
                                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </div>

                              <div className="flex-1 overflow-y-auto space-y-4 pr-1 pl-1 min-h-0 scrollbar-thin">
                                {subs.length === 0 ? (
                                  <div className="text-center py-12 text-slate-500 font-bold bg-white/5 rounded-2xl border border-white/5">
                                    هنوز هیچ گزارش خودارزیابی یا پیگیری روزانه توسط این بیمار در سامانه ثبت نشده است.
                                  </div>
                                ) : (
                                  [...subs].reverse().map((sub, sIdx) => {
                                    const checklist = customChecklists.find(c => c.id === sub.checklistId);
                                    return (
                                      <div key={sIdx} className="bg-slate-900/50 border border-white/10 p-5 rounded-2xl space-y-3.5">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                                          <div className="flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
                                            <span className="text-xs font-black text-emerald-400">
                                              {checklist?.title || 'چک‌لیست خودارزیابی ترخیص'}
                                            </span>
                                          </div>
                                          <span className="text-[11px] font-mono font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
                                            زمان ثبت: {new Date(sub.submittedAt).toLocaleString('fa-IR')}
                                          </span>
                                        </div>

                                        <div className="space-y-3.5 text-xs">
                                          {checklist?.questions.map((q) => {
                                            const ans = sub.answers[q.id];
                                            let displayAns = ans;
                                            let ansColor = 'text-slate-200';

                                            if (q.type === 'qualitative' || q.type === 'multiple_choice' || q.type === 'emoji') {
                                              if (ans === 'yes' || ans === 'perfect' || ans === 'true' || ans === true) {
                                                displayAns = 'بله / خوب / مناسب';
                                                ansColor = 'text-emerald-400 font-black';
                                              } else if (ans === 'no' || ans === 'bad' || ans === 'false' || ans === false) {
                                                displayAns = 'خیر / نامناسب / بحرانی';
                                                ansColor = 'text-rose-400 font-black';
                                              } else if (ans === 'partial' || ans === 'medium') {
                                                displayAns = 'تا حدودی / متوسط';
                                                ansColor = 'text-amber-400 font-black';
                                              }
                                            } else if (q.type === 'descriptive') {
                                              displayAns = ans || '(پاسخ خالی)';
                                              ansColor = 'text-sky-300 font-medium whitespace-pre-wrap leading-relaxed';
                                            } else if (q.type === 'quantitative') {
                                              displayAns = ans ? `${ans}` : '(ثبت نشده)';
                                              const numVal = parseFloat(ans);
                                              if (!isNaN(numVal)) {
                                                if (q.text.includes('تب') || q.text.includes('درجه')) {
                                                  if (numVal >= 38) {
                                                    ansColor = 'text-rose-400 font-black bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20';
                                                  } else if (numVal >= 37.5) {
                                                    ansColor = 'text-amber-400 font-black bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20';
                                                  } else {
                                                    ansColor = 'text-emerald-400 font-black';
                                                  }
                                                } else {
                                                  ansColor = 'text-emerald-400 font-black';
                                                }
                                              }
                                            }

                                            return (
                                              <div key={q.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#111625]/60 border border-white/5 p-3 rounded-xl hover:bg-[#111625] transition-all">
                                                <span className="font-bold text-slate-300 leading-relaxed max-w-md">{q.text}</span>
                                                <div className={`shrink-0 text-left sm:text-right ${ansColor}`}>
                                                  {displayAns}
                                                </div>
                                              </div>
                                            );
                                          })}

                                          {/* Standard fallback symptoms if it's the default symptom checklist */}
                                          {(!checklist || checklist.questions.length === 0) && (
                                            <div className="space-y-2">
                                              {Object.entries(sub.answers).map(([key, val]) => {
                                                let displayKey = key;
                                                let displayVal = val === true ? 'دارد' : val === false ? 'ندارد' : String(val);
                                                let valColor = val === true ? 'text-rose-400 font-black' : 'text-emerald-400';

                                                if (key === 'red_1') displayKey = 'تنگی نفس شدید، درد شدید قفسه سینه، تب بالای ۳۸، تاری دید، تشنج، خونریزی شدید';
                                                if (key === 'yellow_1') displayKey = 'تب خفیف، ورم متوسط پاها، تنگی نفس خفیف، نوسان قند یا فشار خون، سوزش زخم';
                                                if (key === 'green_1') displayKey = 'مصرف منظم داروها، رعایت رژیم غذایی، پوزیشن‌دهی مناسب';

                                                return (
                                                  <div key={key} className="flex items-center justify-between bg-[#111625]/60 border border-white/5 p-2.5 rounded-xl">
                                                    <span className="font-bold text-slate-300">{displayKey}</span>
                                                    <span className={valColor}>{displayVal}</span>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* 2. DELETE CONFIRMATION MODAL */}
                      {deletingPatientId && (() => {
                        const targetPat = patients.find(p => p.nationalId === deletingPatientId);
                        return (
                          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
                            <div className="bg-[#111625] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-center text-right">
                              <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="w-6 h-6 text-rose-400" />
                              </div>
                              <h3 className="text-base font-black text-white mb-2 text-center">حذف پرونده بیمار</h3>
                              <p className="text-xs text-slate-300 font-medium leading-relaxed mb-6 text-center">
                                آیا از حذف پرونده بیمار <span className="text-rose-400 font-black">«{targetPat?.name}»</span> با کد ملی {deletingPatientId} اطمینان کامل دارید؟ این اقدام غیرقابل بازگشت است و دسترسی بیمار قطع خواهد شد.
                              </p>
                              <div className="flex items-center justify-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => setDeletingPatientId(null)}
                                  className="bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer w-24"
                                >
                                  انصراف
                                </button>
                                <button
                                  type="button"
                                  onClick={handleConfirmDeletePatient}
                                  className="bg-rose-500 hover:bg-rose-600 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-lg shadow-rose-500/10 transition-all cursor-pointer w-24"
                                >
                                  تایید حذف
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* RE-ADMISSION PROMPT MODAL */}
                      {reAdmissionPromptData && (
                        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in text-right">
                          <div className="bg-[#111625] border border-purple-500/30 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative space-y-6">
                            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                              <div className="p-3 bg-purple-500/20 text-purple-300 rounded-2xl border border-purple-500/30">
                                <AlertTriangle className="w-6 h-6" />
                              </div>
                              <div>
                                <h3 className="text-base font-black text-white">اعلان سابقه بستری مجدد بیمار</h3>
                                <p className="text-xs text-purple-300 font-bold mt-0.5">شناسایی کد ملی {reAdmissionPromptData.existingPatient.nationalId}</p>
                              </div>
                            </div>

                            <div className="bg-purple-950/30 border border-purple-500/20 rounded-2xl p-4 text-xs leading-relaxed text-slate-200 space-y-2">
                              <p className="font-black text-purple-200 text-sm">
                                این بیمار ({reAdmissionPromptData.existingPatient.name}) دارای سابقه ثبت در سیستم می‌باشد.
                              </p>
                              <p>
                                آیا تمایل دارید گزینه <strong className="text-purple-300">«بستری مجدد در ماه اخیر»</strong> برای این بیمار فعال گردد تا در شاخص‌های کلیدی بیمارستان و تمام شیت‌های اکسل به عنوان بستری مجدد محاسبه شود؟
                              </p>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
                              <button
                                type="button"
                                onClick={() => setReAdmissionPromptData(null)}
                                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:bg-white/5 border border-white/10 transition-all cursor-pointer"
                              >
                                انصراف
                              </button>
                              <button
                                type="button"
                                onClick={() => handleConfirmReAdmission(false)}
                                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-black text-slate-200 bg-white/10 hover:bg-white/15 border border-white/20 transition-all cursor-pointer"
                              >
                                خیر (پذیرش عادی)
                              </button>
                              <button
                                type="button"
                                onClick={() => handleConfirmReAdmission(true)}
                                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
                              >
                                بلی (فعالسازی بستری مجدد)
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ADMISSION HISTORY MODAL (QUERY BY NATIONAL ID) */}
                      {viewingHistoryNationalId !== null && (
                        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in text-right">
                          <div className="bg-[#111625] border border-purple-500/30 rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl relative space-y-5 max-h-[85vh] flex flex-col">
                            <div className="flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
                              <div className="flex items-center gap-3">
                                <div className="p-3 bg-purple-500/20 text-purple-300 rounded-2xl border border-purple-500/30">
                                  <History className="w-6 h-6" />
                                </div>
                                <div>
                                  <h3 className="text-base font-black text-white">سابقه بستری و پذیرش‌های بیمار</h3>
                                  <p className="text-xs text-purple-300 font-bold mt-0.5">
                                    استعلام جامع کلیه سوابق بستری در سیستم بر اساس کد ملی (حتی در صورت حذف از لیست فعلی)
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setViewingHistoryNationalId(null)}
                                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
                              >
                                ✕
                              </button>
                            </div>

                            {/* Search input by national ID */}
                            <div className="shrink-0 space-y-2">
                              <label className="block text-xs font-black text-slate-300">
                                جستجوی سوابق بر اساس کد ملی بیمار:
                              </label>
                              <div className="relative">
                                <input
                                  type="text"
                                  value={historySearchQuery}
                                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                                  placeholder="کد ملی بیمار را وارد کنید (مثال: 1234567890)..."
                                  className="w-full text-sm bg-slate-900/80 border border-purple-500/30 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500 font-mono font-bold"
                                />
                                {historySearchQuery && (
                                  <button
                                    type="button"
                                    onClick={() => setHistorySearchQuery('')}
                                    className="absolute left-3 top-3.5 text-xs text-slate-400 hover:text-white"
                                  >
                                    پاک کردن
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Results list */}
                            <div className="flex-1 overflow-y-auto space-y-3 pr-1 pl-1 min-h-0 scrollbar-thin">
                              {(() => {
                                const q = historySearchQuery.trim();
                                const filtered = q
                                  ? admissionHistory.filter(h => h.nationalId.includes(q))
                                  : admissionHistory;

                                if (filtered.length === 0) {
                                  return (
                                    <div className="text-center py-12 text-slate-400 font-bold bg-white/5 rounded-2xl border border-white/5">
                                      <History className="w-10 h-10 text-purple-400/40 mx-auto mb-3" />
                                      {q
                                        ? `هیچ سابقه بستری برای کد ملی «${q}» در سیستم یافت نشد.`
                                        : 'کد ملی بیمار را در کادر بالا وارد کنید تا سوابق بستری نمایش داده شود.'}
                                    </div>
                                  );
                                }

                                return (
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-bold">
                                      <span>تعداد کل سوابق یافت‌شده:</span>
                                      <span className="bg-purple-500/20 text-purple-300 px-2.5 py-0.5 rounded-full font-mono">
                                        {filtered.length} مورد
                                      </span>
                                    </div>
                                    {filtered.map((rec, idx) => (
                                      <div
                                        key={rec.id || idx}
                                        className="bg-slate-900/80 border border-white/10 hover:border-purple-500/40 rounded-2xl p-4 transition-all space-y-3 shadow-md"
                                      >
                                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2">
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs font-black text-purple-300 bg-purple-500/15 border border-purple-500/30 px-2.5 py-1 rounded-lg">
                                              #{filtered.length - idx}
                                            </span>
                                            <span className="text-sm font-black text-white">
                                              {rec.patientName || 'بیمار'}
                                            </span>
                                            <span className="text-xs font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded-md">
                                              کد ملی: {rec.nationalId}
                                            </span>
                                          </div>
                                          <div className="text-xs font-bold text-slate-300 bg-white/5 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                                            <span>📅 تاریخ بستری:</span>
                                            <span className="text-emerald-300 font-mono">{rec.admissionDate || 'نامشخص'}</span>
                                          </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                                          <div className="bg-white/5 rounded-xl p-2.5">
                                            <span className="text-slate-400 block text-[10px] mb-1">تشخیص پزشکی:</span>
                                            <span className="font-black text-sky-300">{rec.diseaseName || 'نامشخص'}</span>
                                          </div>
                                          <div className="bg-white/5 rounded-xl p-2.5">
                                            <span className="text-slate-400 block text-[10px] mb-1">بخش بستری:</span>
                                            <span className="font-black text-amber-300">{rec.departmentName || 'نامشخص'}</span>
                                          </div>
                                          <div className="bg-white/5 rounded-xl p-2.5">
                                            <span className="text-slate-400 block text-[10px] mb-1">شماره پرونده:</span>
                                            <span className="font-mono font-bold text-slate-200">{rec.fileNumber || '---'}</span>
                                          </div>
                                        </div>

                                        {rec.notes && (
                                          <div className="text-[11px] text-purple-200 bg-purple-500/10 border border-purple-500/20 px-3 py-1.5 rounded-xl font-bold">
                                            یادداشت: {rec.notes}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                );
                              })()}
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10 shrink-0">
                              <button
                                type="button"
                                onClick={() => setViewingHistoryNationalId(null)}
                                className="bg-white/10 hover:bg-white/15 text-white px-6 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer"
                              >
                                بستن پنجره
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 3. PATIENT SATISFACTION SURVEY VIEW MODAL */}
                      {selectedSurveyPatient && selectedSurveyPatient.satisfactionSurvey && (() => {
                        const survey = selectedSurveyPatient.satisfactionSurvey;
                        const ratingQuestions = hospitalSurveyQuestions;

                        const renderBadge = (val: string) => {
                          if (val === 'yes') return <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full text-[10px] font-black">بله</span>;
                          if (val === 'partial') return <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1 rounded-full text-[10px] font-black">تا حدودی</span>;
                          if (val === 'no') return <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 px-3 py-1 rounded-full text-[10px] font-black">خیر</span>;
                          return <span className="bg-slate-500/20 text-slate-300 border border-slate-500/30 px-3 py-1 rounded-full text-[10px] font-black">پاسخ داده نشده</span>;
                        };

                        const renderQ18Badge = (val: string) => {
                          if (val === 'excellent') return <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3.5 py-1.5 rounded-full text-xs font-black">عالی 😍</span>;
                          if (val === 'good') return <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3.5 py-1.5 rounded-full text-xs font-black">خوب 🙂</span>;
                          if (val === 'average') return <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3.5 py-1.5 rounded-full text-xs font-black">متوسط 😐</span>;
                          if (val === 'poor') return <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 px-3.5 py-1.5 rounded-full text-xs font-black">ضعیف 😞</span>;
                          return <span className="bg-slate-500/20 text-slate-300 border border-slate-500/30 px-3.5 py-1.5 rounded-full text-xs font-black">نامشخص</span>;
                        };

                        return (
                          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md animate-fade-in text-right flex justify-center items-start p-4 scrollbar-thin">
                            <div className="bg-[#111625] border border-white/10 rounded-3xl w-full max-w-4xl my-8 p-6 md:p-8 shadow-2xl relative text-right">
                              {/* Header */}
                              <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-5">
                                <div className="flex items-center gap-2">
                                  <HeartHandshake className="w-6 h-6 text-teal-400" />
                                  <h3 className="text-lg font-black text-white">پاسخنامه ارزیابی رضایت‌مندی بیمار: {selectedSurveyPatient.name}</h3>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setSelectedSurveyPatient(null)}
                                  className="text-slate-400 hover:text-white transition-colors cursor-pointer text-xs font-black flex items-center gap-1 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5"
                                >
                                  ✕ بستن پنجره
                                </button>
                              </div>

                              {/* Patient Context Cards */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white/5 border border-white/10 p-4 rounded-2xl mb-6 text-xs shrink-0 font-bold text-white">
                                <div>
                                  <span className="text-slate-400 block mb-1">نام بیمار:</span>
                                  <span className="text-white">{selectedSurveyPatient.name}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block mb-1">شماره پرونده:</span>
                                  <span className="text-teal-300 font-mono">{selectedSurveyPatient.fileNumber}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block mb-1">بخش بیمارستان:</span>
                                  <span className="text-sky-300">{departments.find(d => d.id === selectedSurveyPatient.departmentId)?.name}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block mb-1">تاریخ ثبت نظرسنجی:</span>
                                  <span className="text-amber-300 font-mono">{new Date(survey.submittedAt).toLocaleDateString('fa-IR')}</span>
                                </div>
                              </div>

                              {/* Question List */}
                              <div className="flex-1 overflow-y-auto space-y-3.5 pr-2 pl-2">
                                <div className="bg-slate-900/50 border border-white/10 rounded-2xl divide-y divide-white/5 overflow-hidden">
                                  {ratingQuestions.map((q, idx) => (
                                    <div key={q.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                                      <div className="flex gap-2.5 items-start">
                                        <span className="bg-white/5 text-slate-300 font-mono font-black px-2 py-0.5 rounded-md shrink-0">{idx + 1}</span>
                                        <p className="font-semibold text-slate-200 leading-relaxed text-justify">{q.text}</p>
                                      </div>
                                      <div className="shrink-0 self-end sm:self-center">
                                        {renderBadge(survey[q.id as keyof typeof survey])}
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                {/* Rating 18 & Text Qs */}
                                <div className="space-y-4 pt-2">
                                  {/* Q18 */}
                                  <div className="bg-slate-900/50 border border-white/10 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                    <div className="flex gap-2.5 items-center text-xs">
                                      <span className="bg-white/5 text-slate-300 font-mono font-black px-2 py-0.5 rounded-md shrink-0">۱۸</span>
                                      <span className="font-black text-slate-200">میزان رضایت کلی از خدمت‌رسانی بیمارستان:</span>
                                    </div>
                                    <div>
                                      {renderQ18Badge(survey.q18)}
                                    </div>
                                  </div>

                                  <div className="grid md:grid-cols-2 gap-4">
                                    {/* Q19 */}
                                    <div className="bg-slate-900/50 border border-white/10 p-5 rounded-2xl space-y-2">
                                      <div className="flex gap-2.5 items-center text-xs">
                                        <span className="bg-white/5 text-slate-300 font-mono font-black px-2 py-0.5 rounded-md shrink-0">۱۹</span>
                                        <span className="font-black text-slate-200">پرسنل مورد رضایت کامل بیمار:</span>
                                      </div>
                                      <p className="bg-[#111625] border border-white/5 p-3 rounded-xl text-xs text-emerald-300 font-black leading-relaxed whitespace-pre-wrap">
                                        {survey.q19.trim() || 'موردی ذکر نشده است.'}
                                      </p>
                                    </div>

                                    {/* Q20 */}
                                    <div className="bg-slate-900/50 border border-white/10 p-5 rounded-2xl space-y-2">
                                      <div className="flex gap-2.5 items-center text-xs">
                                        <span className="bg-white/5 text-slate-300 font-mono font-black px-2 py-0.5 rounded-md shrink-0">۲۰</span>
                                        <span className="font-black text-slate-200">پیشنهادات یا انتقادات جهت بهبود وضعیت:</span>
                                      </div>
                                      <p className="bg-[#111625] border border-white/5 p-3 rounded-xl text-xs text-teal-300 font-bold leading-relaxed whitespace-pre-wrap">
                                        {survey.q20.trim() || 'موردی ذکر نشده است.'}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* TAB 4: ANSWER QUESTIONS (MEDICAL CHAT WORKSPACE) */}
                  {adminTab === 'qa' && (() => {
                    const adminFilteredMessages = messages.filter(m =>
                      currentAdmin.role === 'super' ? true : m.departmentId === currentAdmin.departmentId
                    );

                    // Group messages by patient to form active conversations
                    const patientConversations = adminFilteredMessages.reduce((acc: any[], msg) => {
                      let convo = acc.find(c => c.patientId === msg.patientId);
                      if (!convo) {
                        convo = {
                          patientId: msg.patientId,
                          patientName: msg.patientName,
                          departmentId: msg.departmentId,
                          messages: [],
                          unansweredCount: 0,
                          lastAskedAt: msg.askedAt
                        };
                        acc.push(convo);
                      }
                      convo.messages.push(msg);
                      if (!msg.answer) {
                        convo.unansweredCount++;
                      }
                      if (new Date(msg.askedAt) > new Date(convo.lastAskedAt)) {
                        convo.lastAskedAt = msg.askedAt;
                      }
                      return acc;
                    }, []);

                    // Sort conversations so the latest message is first
                    patientConversations.sort((a: any, b: any) =>
                      new Date(b.lastAskedAt).getTime() - new Date(a.lastAskedAt).getTime()
                    );

                    // Filter conversations based on query and tabs
                    const filteredConvos = patientConversations.filter((c: any) => {
                      const matchesQuery = c.patientName.includes(chatSearchQuery) || c.patientId.includes(chatSearchQuery);
                      if (!matchesQuery) return false;

                      if (chatFilter === 'unanswered') return c.unansweredCount > 0;
                      if (chatFilter === 'answered') return c.unansweredCount === 0;
                      return true;
                    });

                    const activeConvo = patientConversations.find((c: any) => c.patientId === activeChatPatientId);
                    const sortedChatMessages = activeConvo
                      ? [...activeConvo.messages].sort((a: any, b: any) => new Date(a.askedAt).getTime() - new Date(b.askedAt).getTime())
                      : [];

                    const activePatientInfo = patients.find(p => p.nationalId === activeChatPatientId);
                    const activePatientDisease = activePatientInfo ? diseases.find(d => d.id === activePatientInfo.diseaseId) : null;

                    return (
                      <div className="h-[620px] rounded-3xl border border-white/10 overflow-hidden bg-[#0d121f]/90 flex flex-col md:flex-row shadow-2xl">

                        {/* Right / List Column: Patients Thread List */}
                        <div className={`w-full md:w-80 border-l border-white/10 flex flex-col bg-slate-900/40 shrink-0 ${activeChatPatientId ? 'hidden md:flex' : 'flex'}`}>
                          {/* Search & Header */}
                          <div className="p-4 border-b border-white/5 space-y-3">
                            <h3 className="text-sm font-black text-white flex items-center gap-2">
                              <MessageSquare className="w-4 h-4 text-sky-400" />
                              <span>گفتگوهای پزشکی بیماران</span>
                              {messages.filter(m => !m.answer && (currentAdmin.role === 'super' ? true : m.departmentId === currentAdmin.departmentId)).length > 0 && (
                                <span className="bg-rose-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full animate-pulse">
                                  {messages.filter(m => !m.answer && (currentAdmin.role === 'super' ? true : m.departmentId === currentAdmin.departmentId)).length} جدید
                                </span>
                              )}
                            </h3>

                            <div className="relative">
                              <Search className="absolute right-3 top-3 w-3.5 h-3.5 text-slate-500" />
                              <input
                                type="text"
                                placeholder="جستجوی نام یا کدملی..."
                                value={chatSearchQuery}
                                onChange={(e) => setChatSearchQuery(e.target.value)}
                                className="w-full text-[11px] bg-slate-950/60 border border-white/5 text-white placeholder:text-slate-500 rounded-xl pr-9 pl-3 py-2 outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20 font-bold"
                              />
                            </div>

                            {/* Filter Tabs */}
                            <div className="flex gap-1 bg-slate-950/40 p-1 rounded-xl border border-white/5">
                              <button
                                onClick={() => setChatFilter('all')}
                                className={`flex-1 text-[10px] py-1.5 rounded-lg font-black transition-all ${chatFilter === 'all' ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20' : 'text-slate-400 hover:text-white'}`}
                              >
                                همه ({patientConversations.length})
                              </button>
                              <button
                                onClick={() => setChatFilter('unanswered')}
                                className={`flex-1 text-[10px] py-1.5 rounded-lg font-black transition-all ${chatFilter === 'unanswered' ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20' : 'text-slate-400 hover:text-rose-400'}`}
                              >
                                بدون پاسخ ({patientConversations.filter((c: any) => c.unansweredCount > 0).length})
                              </button>
                              <button
                                onClick={() => setChatFilter('answered')}
                                className={`flex-1 text-[10px] py-1.5 rounded-lg font-black transition-all ${chatFilter === 'answered' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' : 'text-slate-400 hover:text-emerald-400'}`}
                              >
                                پاسخ‌شده ({patientConversations.filter((c: any) => c.unansweredCount === 0).length})
                              </button>
                            </div>
                          </div>

                          {/* List of Threads */}
                          <div className="flex-1 overflow-y-auto divide-y divide-white/5">
                            {filteredConvos.map((convo: any) => {
                              const isSelected = convo.patientId === activeChatPatientId;
                              const lastMsg = convo.messages[convo.messages.length - 1];
                              const dept = departments.find(d => d.id === convo.departmentId);

                              return (
                                <button
                                  key={convo.patientId}
                                  onClick={() => {
                                    setActiveChatPatientId(convo.patientId);
                                    setEditingMsgId(null);
                                  }}
                                  className={`w-full text-right p-4 transition-all flex flex-col gap-1.5 relative hover:bg-white/5 ${isSelected ? 'bg-sky-500/10 border-r-4 border-sky-400' : ''}`}
                                >
                                  <div className="flex justify-between items-center w-full">
                                    <span className="font-black text-xs text-white block">{convo.patientName}</span>
                                    <span className="text-[9px] text-slate-500 font-mono font-bold">
                                      {new Date(convo.lastAskedAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>

                                  <div className="text-[10px] text-slate-400 line-clamp-1 flex justify-between items-center w-full gap-2">
                                    <span className="truncate">{lastMsg?.answer || lastMsg?.question}</span>
                                    {convo.unansweredCount > 0 ? (
                                      <span className="bg-rose-500 text-white font-black text-[9px] px-2 py-0.5 rounded-full shrink-0 animate-pulse">
                                        {convo.unansweredCount} جدید
                                      </span>
                                    ) : (
                                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="text-[9px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-black">
                                      بخش {dept?.name || 'نامشخص'}
                                    </span>
                                    <span className="text-[9px] font-mono text-slate-500">
                                      کدملی: {convo.patientId.substring(0, 3) + '***' + convo.patientId.substring(7)}
                                    </span>
                                  </div>
                                </button>
                              );
                            })}

                            {filteredConvos.length === 0 && (
                              <div className="text-center py-16 px-4 text-slate-500 text-xs font-bold space-y-1">
                                <p>موردی یافت نشد.</p>
                                <p className="text-[10px] text-slate-600 font-medium">گفتگوی فعالی با شرایط فیلتر شما وجود ندارد.</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Left / Active Chat Conversation Window */}
                        <div className={`flex-1 flex flex-col bg-[#0b0e17] ${!activeChatPatientId ? 'hidden md:flex items-center justify-center' : 'flex'}`}>
                          {activeChatPatientId && activeConvo ? (
                            <>
                              {/* Active Chat Header */}
                              <div className="px-5 py-4 border-b border-white/10 bg-slate-900/20 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                  <button
                                    onClick={() => setActiveChatPatientId(null)}
                                    className="md:hidden text-slate-400 hover:text-white bg-white/5 border border-white/10 p-2 rounded-xl"
                                  >
                                    <ArrowRight className="w-4 h-4" />
                                  </button>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h4 className="font-black text-white text-sm">{activeConvo.patientName}</h4>
                                      <span className="text-[10px] font-mono bg-sky-500/10 text-sky-300 border border-sky-500/20 px-2.5 py-0.5 rounded-full font-black">
                                        پرونده {activePatientInfo?.fileNumber || 'نامشخص'}
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-slate-400 flex items-center gap-2.5 mt-1 font-bold">
                                      <span>سن: {activePatientInfo?.age} سال</span>
                                      <span className="text-slate-600">|</span>
                                      <span>بیماری: <span className="text-sky-300">{activePatientDisease?.name || 'نامشخص'}</span></span>
                                    </div>
                                  </div>
                                </div>

                                <div className="hidden sm:flex items-center gap-2 text-xs">
                                  <span className="text-slate-400">آخرین بروزرسانی:</span>
                                  <span className="text-slate-200 font-mono font-black">
                                    {new Date(activeConvo.lastAskedAt).toLocaleDateString('fa-IR')}
                                  </span>
                                </div>
                              </div>

                              {/* Chat Scrollable Message Body */}
                              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                                {sortedChatMessages.map((msg: Message) => {
                                  const isPatientMsg = !msg.answer || msg.question !== 'پیگیری روند درمان توسط پزشک';

                                  return (
                                    <div key={msg.id} className="space-y-3">
                                      {/* Patient Message (Question Bubble) */}
                                      {isPatientMsg && (
                                        <div className="flex items-start gap-2.5 max-w-[85%] md:max-w-[70%]">
                                          <div className="bg-slate-850 border border-white/10 p-4 rounded-2xl rounded-tr-none text-slate-100 shadow-lg space-y-2.5 w-full">
                                            <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold border-b border-white/5 pb-1.5 mb-1">
                                              <span>{msg.patientName} (بیمار)</span>
                                              <span className="font-mono">{new Date(msg.askedAt).toLocaleDateString('fa-IR')} | {new Date(msg.askedAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                            <p className="text-xs font-bold leading-relaxed whitespace-pre-wrap text-justify">{msg.question}</p>

                                            {msg.patientFileName && msg.patientFileUrl && (
                                              <div className="flex items-center gap-2 bg-slate-900 border border-white/5 p-2 rounded-xl mt-2 w-full">
                                                <Paperclip className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                                                <span className="text-[10px] text-slate-300 font-black truncate flex-1">{msg.patientFileName}</span>
                                                <a
                                                  href={msg.patientFileUrl}
                                                  download={msg.patientFileName}
                                                  className="bg-sky-500/20 hover:bg-sky-500/35 border border-sky-400/30 text-sky-300 text-[9px] px-2.5 py-1.5 rounded-lg font-black transition-all"
                                                >
                                                  دانلود
                                                </a>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )}

                                      {/* Doctor Answer Bubble */}
                                      {msg.answer ? (
                                        <div className="flex items-start gap-2.5 max-w-[85%] md:max-w-[70%] mr-auto justify-end">
                                          <div className="bg-gradient-to-br from-[#1a3a30] to-[#0c221a] border border-emerald-500/30 p-4 rounded-2xl rounded-tl-none text-emerald-100 shadow-xl space-y-2.5 w-full">

                                            {/* Edit view inside message bubble */}
                                            {editingMsgId === msg.id ? (
                                              <div className="space-y-3">
                                                <span className="text-[10px] text-emerald-300 font-black block">ویرایش پاسخ پزشک:</span>
                                                <textarea
                                                  rows={3}
                                                  value={editingMsgText}
                                                  onChange={(e) => setEditingMsgText(e.target.value)}
                                                  className="w-full text-xs bg-slate-900/80 border border-emerald-500/30 rounded-xl p-2.5 text-white outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
                                                />

                                                <div className="flex flex-wrap items-center gap-3">
                                                  <label className="flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 px-3 py-1.5 rounded-lg text-[9px] font-black text-emerald-200 cursor-pointer transition-all">
                                                    <Paperclip className="w-3.5 h-3.5" />
                                                    <span>ویرایش فایل ضمیمه</span>
                                                    <input
                                                      type="file"
                                                      className="hidden"
                                                      onChange={handleChatEditFileChange}
                                                    />
                                                  </label>

                                                  {editingMsgFile ? (
                                                    <div className="flex items-center gap-1 bg-slate-950/50 text-emerald-300 text-[9px] px-2 py-1 rounded-md border border-emerald-500/20">
                                                      <span className="font-bold max-w-[120px] truncate">{editingMsgFile.name}</span>
                                                      <button
                                                        onClick={() => setEditingMsgFile(null)}
                                                        className="text-rose-400 hover:text-rose-300 font-black px-1"
                                                      >
                                                        ✕
                                                      </button>
                                                    </div>
                                                  ) : msg.adminFileName ? (
                                                    <div className="flex items-center gap-1 bg-slate-950/30 text-emerald-300/80 text-[9px] px-2 py-1 rounded-md">
                                                      <span className="max-w-[120px] truncate">{msg.adminFileName}</span>
                                                    </div>
                                                  ) : null}
                                                </div>

                                                <div className="flex gap-2 justify-end pt-1">
                                                  <button
                                                    onClick={() => setEditingMsgId(null)}
                                                    className="px-3 py-1.5 rounded-lg text-[10px] bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 font-bold cursor-pointer"
                                                  >
                                                    انصراف
                                                  </button>
                                                  <button
                                                    onClick={() => handleSaveEditedMessage(msg.id)}
                                                    className="px-4 py-1.5 rounded-lg text-[10px] bg-emerald-500 text-white font-black cursor-pointer shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all"
                                                  >
                                                    ذخیره تغییرات
                                                  </button>
                                                </div>
                                              </div>
                                            ) : (
                                              <>
                                                <div className="flex justify-between items-center text-[10px] text-emerald-300/80 font-bold border-b border-emerald-500/10 pb-1.5 mb-1">
                                                  <span>{msg.answeredBy} (پاسخ دهنده)</span>
                                                  <div className="flex items-center gap-2">
                                                    <button
                                                      onClick={() => {
                                                        setEditingMsgId(msg.id);
                                                        setEditingMsgText(msg.answer || '');
                                                        setEditingMsgFile(msg.adminFileName && msg.adminFileUrl ? { name: msg.adminFileName, url: msg.adminFileUrl } : null);
                                                      }}
                                                      className="text-sky-300 hover:text-sky-200 bg-white/5 px-2 py-0.5 rounded border border-white/5 text-[9px] cursor-pointer"
                                                    >
                                                      ویرایش
                                                    </button>
                                                    <span className="font-mono">{msg.answeredAt ? new Date(msg.answeredAt).toLocaleDateString('fa-IR') : ''}</span>
                                                  </div>
                                                </div>

                                                <p className="text-xs font-bold leading-relaxed whitespace-pre-wrap text-justify">{msg.answer}</p>

                                                {msg.adminFileName && msg.adminFileUrl && (
                                                  <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-500/20 p-2 rounded-xl mt-2 w-full">
                                                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                                    <span className="text-[10px] text-emerald-300 font-black truncate flex-1">{msg.adminFileName}</span>
                                                    <a
                                                      href={msg.adminFileUrl}
                                                      download={msg.adminFileName}
                                                      className="bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-400/30 text-emerald-200 text-[9px] px-2.5 py-1.5 rounded-lg font-black transition-all"
                                                    >
                                                      دانلود پیوست
                                                    </a>
                                                  </div>
                                                )}
                                              </>
                                            )}

                                          </div>
                                        </div>
                                      ) : null}
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Active Chat Input Composer */}
                              <div className="p-4 border-t border-white/10 bg-slate-900/30 space-y-3">

                                {/* Replying state alert indicator */}
                                {(() => {
                                  const unanswered = sortedChatMessages.find(m => !m.answer);
                                  return unanswered ? (
                                    <div className="bg-amber-500/10 border border-amber-500/20 text-amber-200 rounded-xl px-3 py-2 text-[10px] font-black flex items-center justify-between">
                                      <span>پاسخ به سوال بیمار: "{unanswered.question.substring(0, 50)}..."</span>
                                      <span className="text-amber-400">بخش: {departments.find(d => d.id === unanswered.departmentId)?.name}</span>
                                    </div>
                                  ) : (
                                    <div className="bg-sky-500/10 border border-sky-500/20 text-sky-200 rounded-xl px-3 py-2 text-[10px] font-black">
                                      بیمار سوال بدون پاسخی ندارد. در صورت تمایل می‌توانید یادداشت جدیدی جهت پیگیری روند درمان ارسال کنید.
                                    </div>
                                  );
                                })()}

                                {/* Attached composer file preview */}
                                {chatInputFile && (
                                  <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-300 text-[10px] px-3.5 py-2 rounded-xl border border-emerald-500/20 w-fit">
                                    <FileSpreadsheet className="w-4 h-4 shrink-0" />
                                    <span className="font-bold max-w-[200px] truncate">{chatInputFile.name}</span>
                                    <button
                                      type="button"
                                      onClick={() => setChatInputFile(null)}
                                      className="text-rose-400 hover:text-rose-300 font-black cursor-pointer px-1"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                )}

                                {/* Main Text Input Bar */}
                                <div className="flex gap-3 items-end">
                                  <div className="flex-1 bg-slate-950/80 border border-white/10 rounded-2xl p-2 focus-within:border-sky-500/50 flex flex-col gap-1">
                                    <textarea
                                      rows={2}
                                      value={chatInputText}
                                      onChange={(e) => setChatInputText(e.target.value)}
                                      placeholder="پیام یا دستورالعمل مراقبتی خود را بنویسید..."
                                      className="w-full text-xs bg-transparent border-none text-white placeholder:text-slate-500 resize-none outline-none font-bold p-1 leading-relaxed"
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                          e.preventDefault();
                                          handleSendChatMessage();
                                        }
                                      }}
                                    />

                                    <div className="flex justify-between items-center pt-1 border-t border-white/5">
                                      {/* File Attachment Trigger Button */}
                                      <label className="flex items-center gap-1.5 hover:bg-white/5 px-2.5 py-1.5 rounded-lg text-[10px] font-black text-slate-400 hover:text-slate-200 cursor-pointer transition-all">
                                        <Paperclip className="w-3.5 h-3.5" />
                                        <span>افزودن فایل / دستورالعمل</span>
                                        <input
                                          type="file"
                                          className="hidden"
                                          onChange={handleChatFileChange}
                                        />
                                      </label>

                                      <span className="text-[9px] text-slate-600 font-mono">Shift+Enter برای خط جدید</span>
                                    </div>
                                  </div>

                                  <button
                                    onClick={handleSendChatMessage}
                                    className="bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-500 hover:to-blue-600 text-white font-black text-xs px-5 py-3.5 rounded-2xl shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer h-[50px]"
                                  >
                                    <span>ارسال</span>
                                    <Send className="w-4 h-4 transform rotate-180 shrink-0" />
                                  </button>
                                </div>

                              </div>
                            </>
                          ) : (
                            /* Chat Welcome / Empty State Placeholder */
                            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                              <div className="w-20 h-20 bg-sky-500/5 border border-sky-500/10 rounded-full flex items-center justify-center text-sky-400 animate-bounce">
                                <MessageSquare className="w-10 h-10" />
                              </div>
                              <div className="max-w-md space-y-2">
                                <h4 className="text-base font-black text-white">انتخاب پزشک پیگیری کننده</h4>
                                <p className="text-xs text-slate-400 leading-relaxed font-medium">
                                  برای نمایش پیام‌ها، فایل‌های پیوستی ارسالی بیماران، و ثبت دستورالعمل‌های درمانی و پمفلت‌ها، لطفاً یک بیمار را از لیست سمت راست انتخاب نمایید.
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                      </div>
                    );
                  })()}

                  {/* TAB 5: MANAGE/EDIT EDUCATIONAL MATERIAL (TILE-BASED DEPARTMENT & DISEASE WORKSPACE) */}
                  {adminTab === 'disease_edit' && (() => {
                    // Filter departments depending on admin role
                    const visibleDepts = departments.filter(d =>
                      currentAdmin.role === 'super' ? true : d.id === currentAdmin.departmentId
                    );

                    // Form handlers
                    const handleCreateDepartmentSubmit = (e: React.FormEvent) => {
                      e.preventDefault();
                      if (!newDeptName.trim() || !newDeptEnglishId.trim()) return;

                      const deptIdClean = newDeptEnglishId.trim().toLowerCase().replace(/\s+/g, '_');
                      if (departments.some(d => d.id === deptIdClean)) {
                        alert('بخش با این شناسه انگلیسی قبلاً تعریف شده است.');
                        return;
                      }

                      const newDept: Department = {
                        id: deptIdClean,
                        name: newDeptName.trim(),
                        icon: 'Stethoscope',
                        color: newDeptColor,
                        emoji: newDeptEmoji.trim() || '🏥'
                      };

                      saveDepartments([...departments, newDept]);
                      setNewDeptName('');
                      setNewDeptEnglishId('');
                      setNewDeptColor('blue');
                      setNewDeptEmoji('🏥');
                      setIsAddingDept(false);
                    };

                    const handleUpdateDepartmentSubmit = (e: React.FormEvent) => {
                      e.preventDefault();
                      if (!editingDeptId) return;

                      const updatedDepartments = departments.map(d => {
                        if (d.id === editingDeptId) {
                          return {
                            ...d,
                            name: editingDeptName.trim() || d.name,
                            color: editingDeptColor,
                            emoji: editingDeptEmoji.trim() || d.emoji || '🏥',
                          };
                        }
                        return d;
                      });

                      saveDepartments(updatedDepartments);
                      setEditingDeptId(null);
                    };

                    const handleDeleteDepartmentClick = (deptId: string, deptName: string) => {
                      if (!window.confirm(`آیا از حذف کامل بخش "${deptName}" به همراه تمامی آموزش‌های مرتبط با آن اطمینان دارید؟`)) {
                        return;
                      }

                      const updatedDepts = departments.filter(d => d.id !== deptId);
                      const updatedDiseases = diseases.filter(d => d.departmentId !== deptId);

                      saveDepartments(updatedDepts);
                      saveDiseases(updatedDiseases);

                      if (selectedEduDeptId === deptId) {
                        setSelectedEduDeptId(null);
                      }
                    };

                    const handleCreateOrUpdateDiseaseSubmit = (e: React.FormEvent) => {
                      e.preventDefault();
                      if (!diseaseFormName.trim() || !diseaseFormEnglishName.trim()) {
                        alert('لطفا نام فارسی و شناسه انگلیسی بیماری را وارد نمایید.');
                        return;
                      }

                      const cleanDiseaseId = diseaseFormEnglishName.trim().toLowerCase().replace(/\s+/g, '_');

                      if (editingDiseaseId) {
                        // Update
                        const updated = diseases.map(d => {
                          if (d.id === editingDiseaseId) {
                            return {
                              ...d,
                              name: diseaseFormName.trim(),
                              description: diseaseFormDescription.trim(),
                              educationalContent: diseaseFormEducational.trim() || d.educationalContent || '',
                              attachmentImages: diseaseFormAttachmentImages.length > 0 ? diseaseFormAttachmentImages : undefined,
                              triageGuide: d.triageGuide || {
                                green: { symptoms: [], actions: [] },
                                yellow: { symptoms: [], actions: [] },
                                red: { symptoms: [], actions: [] }
                              }
                            };
                          }
                          return d;
                        });
                        saveDiseases(updated);
                        setEditingDiseaseId(null);
                      } else {
                        // Create
                        if (diseases.some(d => d.id === cleanDiseaseId)) {
                          alert('بیماری با این شناسه انگلیسی قبلاً تعریف شده است.');
                          return;
                        }

                        const newDisease: Disease = {
                          id: cleanDiseaseId,
                          name: diseaseFormName.trim(),
                          englishName: cleanDiseaseId,
                          departmentId: selectedEduDeptId!,
                          description: diseaseFormDescription.trim(),
                          educationalContent: diseaseFormEducational.trim() || '',
                          attachmentImages: diseaseFormAttachmentImages.length > 0 ? diseaseFormAttachmentImages : undefined,
                          triageGuide: {
                            green: { symptoms: [], actions: [] },
                            yellow: { symptoms: [], actions: [] },
                            red: { symptoms: [], actions: [] }
                          }
                        };
                        saveDiseases([...diseases, newDisease]);
                        setIsAddingDisease(false);
                      }

                      // Automatically set viewing to the created or edited disease
                      setViewingDiseaseId(cleanDiseaseId);

                      // Reset form
                      setDiseaseFormName('');
                      setDiseaseFormEnglishName('');
                      setDiseaseFormDescription('');
                      setDiseaseFormEducational('');
                      setDiseaseFormAttachmentImages([]);
                      setDiseaseFormGreenSymptoms('');
                      setDiseaseFormGreenActions('');
                      setDiseaseFormYellowSymptoms('');
                      setDiseaseFormYellowActions('');
                      setDiseaseFormRedSymptoms('');
                      setDiseaseFormRedActions('');
                    };

                    const handleEditDiseaseClick = (disease: Disease) => {
                      setEditingDiseaseId(disease.id);
                      setDiseaseFormName(disease.name);
                      setDiseaseFormEnglishName(disease.id);
                      setDiseaseFormDescription(disease.description);
                      setDiseaseFormEducational(disease.educationalContent || '');
                      setDiseaseFormAttachmentImages(disease.attachmentImages || []);
                    };

                    const handleDeleteDiseaseClick = (diseaseId: string, diseaseName: string) => {
                      if (!window.confirm(`آیا از حذف بیماری "${diseaseName}" و مطالب آموزشی مرتبط با آن اطمینان دارید؟`)) {
                        return;
                      }
                      const updated = diseases.filter(d => d.id !== diseaseId);
                      saveDiseases(updated);
                      if (viewingDiseaseId === diseaseId) {
                        setViewingDiseaseId(null);
                      }
                    };

                    // Render Department selection screen
                    if (!selectedEduDeptId) {
                      return (
                        <div className="space-y-6">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                              <h3 className="text-xl font-black text-white mb-1.5 flex items-center gap-2">
                                <BookOpen className="w-6 h-6 text-sky-400 animate-pulse" />
                                <span>مدیریت مطالب آموزشی و بخش‌های بیمارستان</span>
                              </h3>
                              <p className="text-xs text-slate-300 font-medium">بخش مورد نظر خود را جهت حذف، اضافه و ویرایش بیماری‌ها و راهنماهای ترخیص انتخاب نمایید.</p>
                            </div>

                            {currentAdmin.role === 'super' && (
                              <button
                                onClick={() => setIsAddingDept(!isAddingDept)}
                                className="bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-500 hover:to-blue-600 text-white font-black text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all cursor-pointer shrink-0"
                              >
                                <Plus className="w-4 h-4" />
                                <span>افزودن بخش جدید</span>
                              </button>
                            )}
                          </div>

                          {/* Add Department Form Panel */}
                          {isAddingDept && currentAdmin.role === 'super' && (
                            <form onSubmit={handleCreateDepartmentSubmit} className="bg-white/5 border border-white/10 p-5 rounded-2xl max-w-xl space-y-4 shadow-xl">
                              <h4 className="text-xs font-black text-slate-200 border-b border-white/5 pb-2">ثبت مشخصات بخش درمانی جدید</h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-[10px] text-slate-400 font-bold mb-1.5">نام فارسی بخش:</label>
                                  <input
                                    type="text"
                                    required
                                    placeholder="مثال: جراحی قلب"
                                    value={newDeptName}
                                    onChange={(e) => setNewDeptName(e.target.value)}
                                    className="w-full text-xs bg-slate-950/60 border border-white/10 text-white placeholder:text-slate-500 rounded-xl px-3 py-2.5 outline-none focus:border-sky-500/50 font-bold"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] text-slate-400 font-bold mb-1.5">شناسه انگلیسی (کد بخش):</label>
                                  <input
                                    type="text"
                                    required
                                    placeholder="مثال: cardiology"
                                    value={newDeptEnglishId}
                                    onChange={(e) => setNewDeptEnglishId(e.target.value)}
                                    className="w-full text-xs bg-slate-950/60 border border-white/10 text-white placeholder:text-slate-500 rounded-xl px-3 py-2.5 outline-none focus:border-sky-500/50 font-bold font-mono"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="block text-[10px] text-slate-400 font-bold mb-1.5">ایموجی / آیکون کاشی بخش درمانی:</label>
                                <EmojiPickerGrid selectedEmoji={newDeptEmoji} onSelectEmoji={setNewDeptEmoji} />
                              </div>
                              <div>
                                <label className="block text-[10px] text-slate-400 font-bold mb-2">رنگ کارت بخش درمانی:</label>
                                <div className="grid grid-cols-5 gap-2 sm:grid-cols-9">
                                  {Object.entries(COLOR_MAP).map(([key, value]) => {
                                    const isSelected = newDeptColor === key;
                                    return (
                                      <button
                                        key={key}
                                        type="button"
                                        onClick={() => setNewDeptColor(key)}
                                        className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all cursor-pointer ${
                                          isSelected
                                            ? 'bg-white/10 border-sky-400 text-sky-400 font-black shadow-lg shadow-sky-500/10'
                                            : 'bg-transparent border-white/5 text-slate-400 hover:bg-white/5 hover:border-white/15'
                                        }`}
                                      >
                                        <span className={`w-3.5 h-3.5 rounded-full bg-gradient-to-br ${
                                          key === 'red' ? 'from-rose-500 to-red-600' :
                                          key === 'green' ? 'from-green-500 to-emerald-600' :
                                          key === 'yellow' ? 'from-amber-500 to-yellow-600' :
                                          key === 'blue' ? 'from-blue-500 to-sky-600' :
                                          key === 'jade' ? 'from-teal-500 to-emerald-600' :
                                          key === 'indigo' ? 'from-indigo-500 to-blue-600' :
                                          key === 'purple' ? 'from-purple-500 to-violet-600' :
                                          key === 'turquoise' ? 'from-cyan-500 to-teal-600' :
                                          'from-lime-500 to-green-600'
                                        }`} />
                                        <span className="text-[9px] font-black">{value.label}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                              <div className="flex gap-2 justify-end pt-2">
                                <button
                                  type="button"
                                  onClick={() => setIsAddingDept(false)}
                                  className="text-xs text-slate-400 bg-white/5 border border-white/10 hover:bg-white/10 px-4 py-2 rounded-xl font-bold cursor-pointer"
                                >
                                  انصراف
                                </button>
                                <button
                                  type="submit"
                                  className="text-xs text-white bg-sky-500 hover:bg-sky-600 px-5 py-2 rounded-xl font-black cursor-pointer shadow-lg shadow-sky-500/15"
                                >
                                  ثبت بخش جدید
                                </button>
                              </div>
                            </form>
                          )}

                          {/* Edit Department Form Panel */}
                          {editingDeptId && (
                            <form onSubmit={handleUpdateDepartmentSubmit} className="bg-slate-900/90 border border-sky-500/40 p-5 rounded-2xl max-w-xl space-y-4 shadow-2xl backdrop-blur-md relative">
                              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                                <h4 className="text-xs font-black text-sky-400 flex items-center gap-2">
                                  <Edit3 className="w-4 h-4" />
                                  <span>ویرایش کاشی و مشخصات بخش: {editingDeptName}</span>
                                </h4>
                                <button
                                  type="button"
                                  onClick={() => setEditingDeptId(null)}
                                  className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1 rounded-lg hover:bg-white/10 cursor-pointer"
                                >
                                  انصراف
                                </button>
                              </div>

                              <div>
                                <label className="block text-[10px] text-slate-400 font-bold mb-1.5">نام فارسی بخش:</label>
                                <input
                                  type="text"
                                  required
                                  placeholder="مثال: جراحی قلب"
                                  value={editingDeptName}
                                  onChange={(e) => setEditingDeptName(e.target.value)}
                                  className="w-full text-xs bg-slate-950/60 border border-white/10 text-white placeholder:text-slate-500 rounded-xl px-3 py-2.5 outline-none focus:border-sky-500/50 font-bold"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] text-slate-400 font-bold mb-1.5">ایموجی / آیکون کاشی بخش درمانی:</label>
                                <EmojiPickerGrid selectedEmoji={editingDeptEmoji} onSelectEmoji={setEditingDeptEmoji} />
                              </div>

                              <div>
                                <label className="block text-[10px] text-slate-400 font-bold mb-2">رنگ کارت/کاشی بخش درمانی:</label>
                                <div className="grid grid-cols-5 gap-2 sm:grid-cols-9">
                                  {Object.entries(COLOR_MAP).map(([key, value]) => {
                                    const isSelected = editingDeptColor === key;
                                    return (
                                      <button
                                        key={key}
                                        type="button"
                                        onClick={() => setEditingDeptColor(key)}
                                        className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all cursor-pointer ${
                                          isSelected
                                            ? 'bg-white/10 border-sky-400 text-sky-400 font-black shadow-lg shadow-sky-500/10'
                                            : 'bg-transparent border-white/5 text-slate-400 hover:bg-white/5 hover:border-white/15'
                                        }`}
                                      >
                                        <span className={`w-3.5 h-3.5 rounded-full bg-gradient-to-br ${
                                          key === 'red' ? 'from-rose-500 to-red-600' :
                                          key === 'green' ? 'from-green-500 to-emerald-600' :
                                          key === 'yellow' ? 'from-amber-500 to-yellow-600' :
                                          key === 'blue' ? 'from-blue-500 to-sky-600' :
                                          key === 'jade' ? 'from-teal-500 to-emerald-600' :
                                          key === 'indigo' ? 'from-indigo-500 to-blue-600' :
                                          key === 'purple' ? 'from-purple-500 to-violet-600' :
                                          key === 'turquoise' ? 'from-cyan-500 to-teal-600' :
                                          'from-lime-500 to-green-600'
                                        }`} />
                                        <span className="text-[9px] font-black">{value.label}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              <div className="flex gap-2 justify-end pt-2">
                                <button
                                  type="button"
                                  onClick={() => setEditingDeptId(null)}
                                  className="text-xs text-slate-400 bg-white/5 border border-white/10 hover:bg-white/10 px-4 py-2 rounded-xl font-bold cursor-pointer"
                                >
                                  انصراف
                                </button>
                                <button
                                  type="submit"
                                  className="text-xs text-white bg-sky-500 hover:bg-sky-600 px-5 py-2 rounded-xl font-black cursor-pointer shadow-lg shadow-sky-500/15 flex items-center gap-1.5"
                                >
                                  <Check className="w-4 h-4" />
                                  <span>ذخیره تغییرات بخش</span>
                                </button>
                              </div>
                            </form>
                          )}

                          {/* Departments Grid Tiles */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {visibleDepts.map((dept, index) => {
                              const deptDiseasesCount = diseases.filter(d => d.departmentId === dept.id).length;
                              const style = getDeptTileStyle(dept.id, dept.color);

                              return (
                                <div
                                  key={dept.id}
                                  className={`relative group rounded-3xl border bg-gradient-to-br p-6 shadow-xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${style.adminBg} ${style.adminBorder} ${style.adminText} overflow-hidden`}
                                >
                                  <div className="flex justify-between items-start">
                                    <div className="space-y-1.5 flex-1">
                                      <div className="flex items-center gap-2">
                                        <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                                          <DepartmentIcon id={dept.id} emoji={dept.emoji} className="w-5 h-5 shrink-0" />
                                        </div>
                                        <span className="font-mono text-[10px] uppercase text-slate-500 tracking-wider">{dept.id}</span>
                                      </div>
                                      <h4 className="text-base font-black text-white group-hover:text-sky-300 transition-colors pt-1">{dept.name}</h4>
                                    </div>
                                    {/* Action buttons (Edit & Delete department) */}
                                    <div className="flex items-center gap-1">
                                      {(currentAdmin.role === 'super' || currentAdmin.departmentId === dept.id) && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingDeptId(dept.id);
                                            setEditingDeptName(dept.name);
                                            setEditingDeptColor(dept.color || 'blue');
                                            setEditingDeptEmoji(dept.emoji || '🏥');
                                          }}
                                          className="p-2 rounded-xl text-sky-400 hover:text-white hover:bg-sky-500/20 border border-white/5 cursor-pointer transition-colors"
                                          title="ویرایش کاشی، ایموجی و رنگ بخش"
                                        >
                                          <Edit3 className="w-4 h-4" />
                                        </button>
                                      )}
                                      {currentAdmin.role === 'super' && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteDepartmentClick(dept.id, dept.name);
                                          }}
                                          className="p-2 rounded-xl text-rose-400 hover:text-white hover:bg-rose-500/20 border border-white/5 cursor-pointer transition-colors"
                                          title="حذف کامل این بخش درمانی"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex justify-between items-center mt-6 border-t border-white/5 pt-4">
                                    <span className="text-[10px] text-slate-400 font-bold">{deptDiseasesCount} بیماری ثبت شده</span>

                                    <button
                                      onClick={() => setSelectedEduDeptId(dept.id)}
                                      className="flex items-center gap-1.5 text-xs font-black bg-white/5 border border-white/10 px-4 py-2 rounded-xl hover:bg-white/15 text-slate-200 cursor-pointer transition-all"
                                    >
                                      <span>مدیریت بیماری‌ها</span>
                                      <ArrowRight className="w-3.5 h-3.5 transform rotate-180" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }

                    // Render Inside Department view
                    const deptObj = departments.find(d => d.id === selectedEduDeptId);
                    const deptDiseasesList = diseases.filter(d => d.departmentId === selectedEduDeptId);
                    const currentViewingDisease = viewingDiseaseId ? diseases.find(d => d.id === viewingDiseaseId) : null;

                    return (
                      <div className="space-y-6 w-full max-w-full overflow-hidden">
                        {/* Header & Back Breadcrumb */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
                          <div className="space-y-2">
                            <button
                              type="button"
                              onClick={() => {
                                if (viewingDiseaseId) {
                                  setViewingDiseaseId(null);
                                } else {
                                  setSelectedEduDeptId(null);
                                  setIsAddingDisease(false);
                                  setEditingDiseaseId(null);
                                }
                              }}
                              className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 font-black cursor-pointer bg-sky-500/10 hover:bg-sky-500/15 border border-sky-400/20 px-3.5 py-2 rounded-xl transition-all"
                            >
                              <ArrowRight className="w-4 h-4" />
                              <span>{viewingDiseaseId ? `بازگشت به لیست بیماری‌های بخش ${deptObj?.name}` : 'بازگشت به لیست تمامی بخش‌ها'}</span>
                            </button>

                            <div className="flex items-center gap-2.5 pt-1 flex-wrap">
                              <h3 className="text-lg md:text-xl font-black text-white flex items-center gap-2">
                                <span>آموزش‌های بخش {deptObj?.name}</span>
                              </h3>
                              <span className="bg-slate-800 text-slate-300 border border-white/10 text-[10px] px-2.5 py-1 rounded-md font-mono">{selectedEduDeptId}</span>
                            </div>
                          </div>

                          {!isAddingDisease && !editingDiseaseId && !viewingDiseaseId && (
                            <button
                              type="button"
                              onClick={() => {
                                setDiseaseFormName('');
                                setDiseaseFormEnglishName('');
                                setDiseaseFormDescription('');
                                setDiseaseFormEducational('');
                                setDiseaseFormAttachmentImages([]);
                                setIsAddingDisease(true);
                              }}
                              className="bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all cursor-pointer shrink-0 shadow-lg shadow-emerald-500/15"
                            >
                              <Plus className="w-4 h-4" />
                              <span>افزودن بیماری جدید به این بخش</span>
                            </button>
                          )}
                        </div>

                        {/* CASE 1: READING / VIEWING A DISEASE IN DEDICATED NEW PAGE VIEW */}
                        {currentViewingDisease ? (
                          <div className="space-y-6 animate-fadeIn">
                            {/* Disease Title Header Banner */}
                            <div className="bg-[#111625] border border-white/10 p-6 md:p-8 rounded-3xl space-y-4 shadow-xl text-right relative overflow-hidden">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                                <div className="space-y-2 min-w-0">
                                  <div className="flex items-center gap-2.5 flex-wrap">
                                    <span className="bg-sky-500/15 border border-sky-400/30 text-sky-400 text-xs px-3 py-1 rounded-lg font-black">
                                      بخش {deptObj?.name}
                                    </span>
                                    <span className="bg-slate-900 border border-white/10 text-slate-400 font-mono text-xs px-3 py-1 rounded-lg">
                                      کد بیماری: {currentViewingDisease.id}
                                    </span>
                                  </div>
                                  <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white leading-tight break-words">
                                    {currentViewingDisease.name}
                                  </h2>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setViewingDiseaseId(null);
                                      handleEditDiseaseClick(currentViewingDisease);
                                    }}
                                    className="bg-sky-500/10 hover:bg-sky-500 text-sky-400 hover:text-white border border-sky-500/20 px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                    <span>ویرایش</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleDeleteDiseaseClick(currentViewingDisease.id, currentViewingDisease.name);
                                    }}
                                    className="bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20 px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    <span>حذف</span>
                                  </button>
                                </div>
                              </div>

                              <p className="text-xs text-slate-400 font-medium">
                                برای بازگشت به لیست کلی بیماری‌های این بخش یا ویرایش مطالب بالا، از دکمه‌های راهنما استفاده نمایید.
                              </p>
                            </div>

                            {/* Educational Text Display */}
                            <div className="bg-[#111625] border border-white/10 p-6 md:p-8 rounded-3xl space-y-6 shadow-xl text-right">
                              <div className="bg-white/5 border border-white/10 p-6 md:p-8 rounded-2xl">
                                <FormattedText
                                  content={currentViewingDisease.description}
                                  className="text-base sm:text-lg md:text-xl text-slate-100 font-medium leading-[2.2rem] md:leading-[2.5rem] text-justify break-words"
                                />
                              </div>

                              {currentViewingDisease.educationalContent && (
                                <div className="bg-white/5 border border-white/10 p-6 md:p-8 rounded-2xl">
                                  <FormattedText
                                    content={currentViewingDisease.educationalContent}
                                    className="text-base sm:text-lg md:text-xl text-slate-100 font-medium leading-[2.2rem] md:leading-[2.5rem] text-justify break-words"
                                  />
                                </div>
                              )}

                              {currentViewingDisease.attachmentImages && currentViewingDisease.attachmentImages.length > 0 && (
                                <div className="space-y-4 pt-2">
                                  <h4 className="text-xs sm:text-sm font-black text-slate-300 uppercase tracking-wider">
                                    <span>تصاویر ضمیمه و مستندات آموزشی بیماری:</span>
                                  </h4>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {currentViewingDisease.attachmentImages.map((imgUrl, idx) => (
                                      <div
                                        key={idx}
                                        className="rounded-2xl overflow-hidden border border-white/10 bg-black/40 shadow-md group relative flex flex-col"
                                      >
                                        <div className="relative flex-1 flex items-center justify-center overflow-hidden min-h-[14rem]">
                                          <img
                                            src={imgUrl}
                                            alt={`ضمیمه بیماری ${idx + 1}`}
                                            className="w-full h-auto max-h-[28rem] object-contain mx-auto"
                                            referrerPolicy="no-referrer"
                                          />
                                        </div>
                                        <div className="bg-slate-900/95 border-t border-white/10 p-3.5 flex items-center justify-between gap-3">
                                          <span className="text-xs text-slate-300 font-bold">تصویر ضمیمه {idx + 1}</span>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const a = document.createElement('a');
                                              a.href = imgUrl;
                                              a.download = `${currentViewingDisease.id}-attachment-${idx + 1}.png`;
                                              document.body.appendChild(a);
                                              a.click();
                                              document.body.removeChild(a);
                                            }}
                                            className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-black px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md active:scale-95"
                                            title="دانلود تصویر ضمیمه"
                                          >
                                            <Download className="w-4 h-4" />
                                            <span>دانلود تصویر</span>
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Back Action Bar */}
                            <div className="flex justify-between items-center pt-2">
                              <button
                                type="button"
                                onClick={() => setViewingDiseaseId(null)}
                                className="bg-white/10 hover:bg-white/15 text-white border border-white/10 font-black text-xs px-6 py-3 rounded-xl flex items-center gap-2 transition-all cursor-pointer"
                              >
                                <ArrowRight className="w-4 h-4" />
                                <span>بازگشت به لیست تمامی بیماری‌های بخش {deptObj?.name}</span>
                              </button>
                            </div>
                          </div>
                        ) : (isAddingDisease || editingDiseaseId) ? (
                          /* CASE 2: ADD OR EDIT DISEASE FORM WITH WORD RICH TEXT EDITOR */
                          <form onSubmit={handleCreateOrUpdateDiseaseSubmit} className="bg-[#111625] border border-white/10 p-6 md:p-8 rounded-3xl space-y-6 w-full max-w-full shadow-xl">
                            <h4 className="text-sm font-black text-white border-b border-white/10 pb-3 text-right flex items-center justify-between">
                              <span>{editingDiseaseId ? `ویرایش بیماری: "${diseaseFormName}"` : 'افزودن بیماری جدید به بخش'}</span>
                              <span className="text-[11px] text-sky-400 font-normal">امکانات ویرایشگر متنی پیشرفته Word فعال است</span>
                            </h4>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-right">
                              <div>
                                <label className="block text-[10px] text-slate-300 font-bold mb-1.5">نام بیماری (فارسی):</label>
                                <input
                                  type="text"
                                  required
                                  placeholder="مثال: نارسایی احتقانی قلب"
                                  value={diseaseFormName}
                                  onChange={(e) => setDiseaseFormName(e.target.value)}
                                  className="w-full text-xs bg-white/5 border border-white/10 text-white placeholder:text-slate-500 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-400/50 font-bold"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-slate-300 font-bold mb-1.5">شناسه انگلیسی (یکتا و بدون فاصله):</label>
                                <input
                                  type="text"
                                  required
                                  disabled={!!editingDiseaseId}
                                  placeholder="مثال: heart_failure"
                                  value={diseaseFormEnglishName}
                                  onChange={(e) => setDiseaseFormEnglishName(e.target.value)}
                                  className="w-full text-xs bg-white/5 border border-white/10 text-white placeholder:text-slate-500 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-400/50 font-bold font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                              </div>
                            </div>

                            <RichTextEditor
                              label="توضیح و آموزش بیماری (جهت مطالعه و آشنایی بیمار) - فرمت مانند Word (درشت، رنگ، سایز متن و...):"
                              value={diseaseFormDescription}
                              onChange={setDiseaseFormDescription}
                              placeholder="خلاصه‌ای از ماهیت بیماری، علل ایجاد کننده، علائم کلی و آموزش‌های لازم جهت معرفی..."
                              minHeight="220px"
                              theme="dark"
                            />

                            <div>
                              <label className="block text-[10px] text-slate-300 font-bold mb-1.5">تصاویر ضمیمه و مستندات آموزشی بیماری (نمایش در صفحه اختصاصی بیماری):</label>
                              <div className="relative border-2 border-dashed border-white/15 hover:border-sky-400 rounded-2xl p-4 transition-all text-center bg-white/5 group">
                                <input
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  onChange={async (e) => {
                                    const files = e.target.files ? (Array.from(e.target.files) as File[]) : [];
                                    if (files.length === 0) return;
                                    const base64List: string[] = [];
                                    for (const file of files) {
                                      if (file.type.startsWith('image/')) {
                                        const b64 = await readFileAsDataUrl(file);
                                        base64List.push(b64);
                                      }
                                    }
                                    setDiseaseFormAttachmentImages(prev => [...prev, ...base64List]);
                                  }}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                <div className="space-y-2 py-2">
                                  <div className="bg-sky-500/10 text-sky-400 p-2.5 rounded-xl inline-block group-hover:bg-sky-500 group-hover:text-white transition-all">
                                    <FileUp className="w-5 h-5" />
                                  </div>
                                  <p className="text-[11px] text-slate-300 font-bold">برای انتخاب یا افزودن تصاویر ضمیمه بیماری کلیک کنید (امکان انتخاب چند عکس)</p>
                                  <p className="text-[9px] text-slate-500">فرمت‌های JPG, PNG, WEBP</p>
                                </div>
                              </div>
                              {diseaseFormAttachmentImages.length > 0 && (
                                <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                                  {diseaseFormAttachmentImages.map((imgUrl, idx) => (
                                    <div key={idx} className="relative group/thumb rounded-xl overflow-hidden border border-white/10 bg-black/40">
                                      <img
                                        src={imgUrl}
                                        alt={`ضمیمه بیماری ${idx + 1}`}
                                        className="h-28 w-full object-cover"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setDiseaseFormAttachmentImages(prev => prev.filter((_, i) => i !== idx));
                                        }}
                                        className="absolute top-1.5 right-1.5 bg-rose-600/90 hover:bg-rose-600 text-white p-1.5 rounded-lg transition-all cursor-pointer shadow-md"
                                        title="حذف این تصویر"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="flex gap-2.5 justify-end pt-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setIsAddingDisease(false);
                                  setEditingDiseaseId(null);
                                  setDiseaseFormAttachmentImages([]);
                                }}
                                className="text-xs text-slate-400 bg-white/5 border border-white/10 hover:bg-white/10 px-5 py-2.5 rounded-xl font-bold cursor-pointer"
                              >
                                انصراف
                              </button>
                              <button
                                type="submit"
                                className="text-xs text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 px-6 py-2.5 rounded-xl font-black cursor-pointer shadow-lg shadow-emerald-500/15"
                              >
                                {editingDiseaseId ? 'ذخیره تغییرات بیماری' : 'افزودن و ثبت بیماری'}
                              </button>
                            </div>
                          </form>
                        ) : (
                          /* CASE 3: LIST OF DISEASES AS CLEAN CARDS */
                          <div className="space-y-4 text-right w-full max-w-full overflow-hidden">
                            {/* Toolbar & Search */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/5 border border-white/10 p-3.5 rounded-2xl shadow-sm">
                              <div className="relative flex-1">
                                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                                <input
                                  type="text"
                                  placeholder="جستجوی سریع در لیست بیماری‌های این بخش..."
                                  value={diseaseSearchQuery}
                                  onChange={(e) => setDiseaseSearchQuery(e.target.value)}
                                  className="w-full text-xs bg-slate-950/60 border border-white/10 text-white placeholder:text-slate-500 rounded-xl pr-9 pl-3 py-2 outline-none focus:border-sky-500/50 font-bold"
                                />
                              </div>

                              <div className="flex items-center gap-2 justify-between sm:justify-end shrink-0">
                                <span className="text-[11px] text-slate-300 font-bold">
                                  تعداد بیماری‌های ثبت‌شده: <span className="font-mono text-sky-400">{deptDiseasesList.length}</span>
                                </span>
                              </div>
                            </div>

                            {/* List of Disease Items */}
                            <div className="grid grid-cols-1 gap-3.5">
                              {deptDiseasesList
                                .filter(d =>
                                  d.name.toLowerCase().includes(diseaseSearchQuery.toLowerCase()) ||
                                  d.id.toLowerCase().includes(diseaseSearchQuery.toLowerCase())
                                )
                                .map(disease => (
                                  <div
                                    key={disease.id}
                                    onClick={() => setViewingDiseaseId(disease.id)}
                                    className="bg-white/5 hover:bg-sky-500/[0.04] border border-white/10 hover:border-sky-500/40 p-5 rounded-2xl transition-all duration-200 cursor-pointer group space-y-3"
                                  >
                                    <div className="flex items-center justify-between gap-3 flex-wrap">
                                      <div className="flex items-center gap-3 min-w-0">
                                        <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 shrink-0">
                                          <BookOpen className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-2.5 flex-wrap">
                                            <h4 className="text-sm md:text-base font-black text-white group-hover:text-sky-300 transition-colors">
                                              {disease.name}
                                            </h4>
                                            <span className="font-mono text-[9px] bg-slate-900 text-slate-400 border border-white/10 px-2 py-0.5 rounded-md uppercase">
                                              کد: {disease.id}
                                            </span>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Action Buttons */}
                                      <div className="flex items-center gap-2 shrink-0 mr-auto sm:mr-0">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setViewingDiseaseId(disease.id);
                                          }}
                                          className="text-[11px] font-black text-sky-400 bg-sky-500/10 hover:bg-sky-500 hover:text-white border border-sky-500/20 px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                                        >
                                          <span>مطالعه کامل</span>
                                          <ArrowLeft className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleEditDiseaseClick(disease);
                                          }}
                                          className="p-2 text-xs font-black bg-white/5 hover:bg-sky-500 text-slate-300 hover:text-white border border-white/10 rounded-xl cursor-pointer transition-all"
                                          title="ویرایش بیماری"
                                        >
                                          <Edit3 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteDiseaseClick(disease.id, disease.name);
                                          }}
                                          className="p-2 text-xs font-black bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20 rounded-xl cursor-pointer transition-all"
                                          title="حذف بیماری"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>

                                    {/* Brief description snippet */}
                                    <p className="text-xs text-slate-300 font-medium leading-relaxed line-clamp-2 text-justify">
                                      {stripHtmlTags(disease.description)}
                                    </p>
                                  </div>
                                ))
                              }
                            </div>

                            {deptDiseasesList.length === 0 && (
                              <div className="text-center py-16 bg-white/5 border border-white/10 rounded-3xl space-y-3 shadow-sm">
                                <BookOpen className="w-10 h-10 text-slate-500 mx-auto" />
                                <div className="space-y-1">
                                  <p className="text-xs text-slate-300 font-bold">هیچ بیماری به این بخش اضافه نشده است.</p>
                                  <p className="text-[10px] text-slate-400 font-medium">می‌توانید با کلیک بر روی دکمه فوق اولین بیماری را ثبت کنید.</p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* TAB 6: INTRODUCE DEPARTMENT ADMINS (Super Admin only) */}
                  {adminTab === 'admins_manage' && currentAdmin.role === 'super' && (
                    <div className="space-y-8 text-right font-sans">
                      <div>
                        <h3 className="text-xl font-black text-white mb-1.5 flex items-center gap-2">
                          <Users className="w-6 h-6 text-sky-400 animate-pulse" />
                          <span>معرفی و مدیریت مسئولین بخش‌ها</span>
                        </h3>
                        <p className="text-xs text-slate-300 font-medium">ادمین کل می‌تواند کاربران مسئول هر بخش را تعریف و حقوق دسترسی آنان را مشخص کند.</p>
                      </div>

                      <div className="grid md:grid-cols-2 gap-8">

                        {/* Introduce Form */}
                        <form onSubmit={handleCreateOrUpdateAdmin} className="space-y-4 bg-white/5 p-6 rounded-3xl border border-white/10 shadow-2xl">
                          <h4 className="text-xs font-black text-slate-300 border-b border-white/5 pb-2 mb-4">ایجاد حساب کاربری مسئول بخش جدید</h4>

                          {adminManageMsg && (
                            <div className="bg-emerald-950/30 border border-emerald-500/30 text-emerald-200 text-xs font-black p-3 rounded-xl">
                              {adminManageMsg}
                            </div>
                          )}

                          <div>
                            <label className="block text-xs font-bold text-slate-300 mb-2">نام و نام خانوادگی پزشک/پرستار:</label>
                            <input
                              type="text"
                              placeholder="مثال: دکتر صادقی"
                              value={newAdminName}
                              onChange={(e) => setNewAdminName(e.target.value)}
                              className="w-full text-xs bg-white/5 border border-white/10 text-white placeholder:text-slate-500 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-400/50 font-bold"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-300 mb-2">نام کاربری ورود:</label>
                            <input
                              type="text"
                              placeholder="مثال: admin_sadeghi"
                              value={newAdminUser}
                              onChange={(e) => setNewAdminUser(e.target.value)}
                              className="w-full text-xs bg-white/5 border border-white/10 text-white placeholder:text-slate-500 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-400/50 font-bold"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-300 mb-2">کلمه عبور:</label>
                            <input
                              type="password"
                              placeholder="حداقل ۶ کاراکتر"
                              value={newAdminPass}
                              onChange={(e) => setNewAdminPass(e.target.value)}
                              className="w-full text-xs bg-white/5 border border-white/10 text-white placeholder:text-slate-500 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-400/50 font-bold"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-300 mb-2">بخش تحت مدیریت:</label>
                            <select
                              value={newAdminDept}
                              onChange={(e) => setNewAdminDept(e.target.value)}
                              className="w-full text-xs bg-[#111625] border border-white/10 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-400/50 font-bold cursor-pointer"
                            >
                              <option value="" className="bg-[#111625] text-slate-400">-- انتخاب بخش --</option>
                              {departments.map(d => (
                                <option key={d.id} value={d.id} className="bg-[#111625] text-white font-bold">
                                  {d.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="pt-4 flex gap-2">
                            {editingAdminUsername && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingAdminUsername(null);
                                  setNewAdminUser('');
                                  setNewAdminPass('');
                                  setNewAdminName('');
                                  setNewAdminDept('');
                                }}
                                className="text-xs text-slate-400 bg-white/5 border border-white/10 hover:bg-white/10 px-5 py-2.5 rounded-xl font-bold cursor-pointer"
                              >
                                انصراف
                              </button>
                            )}
                            <button
                              type="submit"
                              className="text-xs text-white bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 px-6 py-2.5 rounded-xl font-black cursor-pointer shadow-lg shadow-sky-500/15"
                            >
                              {editingAdminUsername ? 'ویرایش اطلاعات مسئول' : 'معرفی مسئول جدید'}
                            </button>
                          </div>
                        </form>

                        {/* List of Admins */}
                        <div className="bg-white/5 p-6 rounded-3xl border border-white/10 shadow-2xl text-right">
                          <h4 className="text-xs font-black text-slate-300 border-b border-white/5 pb-2 mb-4">لیست مدیران و مسئولین تعریف شده</h4>
                          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                            {admins.map(admin => {
                              const deptName = departments.find(d => d.id === admin.departmentId)?.name || 'ادمین کل / تمامی بخش‌ها';
                              return (
                                <div key={admin.username} className="bg-[#111625] border border-white/5 p-4 rounded-2xl flex justify-between items-center gap-4 transition-all hover:bg-white/5">
                                  <div>
                                    <h5 className="text-xs font-black text-white">{admin.fullName}</h5>
                                    <p className="text-[10px] text-slate-400 font-bold mt-1">نام کاربری: {admin.username} | بخش: <span className="text-sky-400 font-black">{deptName}</span></p>
                                  </div>
                                  <div className="flex gap-1.5 font-sans">
                                    <button
                                      type="button"
                                      onClick={() => handleStartEditAdmin(admin)}
                                      className="p-2 text-[10px] text-sky-400 hover:text-white bg-sky-500/10 hover:bg-sky-500 rounded-lg transition-all cursor-pointer"
                                      title="ویرایش"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteAdmin(admin.username)}
                                      className="p-2 text-[10px] text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-500 rounded-lg transition-all cursor-pointer"
                                      title="حذف"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                      </div>
                    </div>
                  )}

                  {/* TAB 7: CHECKLIST MANAGEMENT */}
                  {adminTab === 'checklists' && currentAdmin.role === 'super' && (
                    <div className="space-y-6 text-right">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/5 border border-white/10 rounded-[2.5rem] p-6 sm:p-8">
                        <div>
                          <h3 className="text-xl font-black text-white mb-1.5 flex items-center gap-2">
                            <ClipboardList className="w-6 h-6 text-teal-400 animate-pulse" />
                            <span>مدیریت چک‌لیست‌های ارزیابی و پیگیری بیمارستان</span>
                          </h3>
                          <p className="text-xs text-slate-300 font-medium leading-relaxed">
                            تعریف، ویرایش و پایش انواع چک‌لیست‌های رضایت‌سنجی ترخیص و چک‌لیست‌های خودارزیابی و پایش سلامتی در منزل.
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {editingChecklist === null && (
                            <button
                              onClick={() => handleEditChecklistInit('new')}
                              className="bg-gradient-to-r from-teal-400 to-emerald-500 hover:from-teal-500 hover:to-emerald-600 text-white font-black px-5 py-3 rounded-2xl text-xs flex items-center gap-1.5 shadow-lg shadow-teal-500/15 transition-all cursor-pointer"
                            >
                              <Plus className="w-4 h-4" />
                              <span>تعریف چک‌لیست جدید</span>
                            </button>
                          )}
                          <button
                            onClick={() => setAdminTab('overview')}
                            className="bg-slate-800 hover:bg-slate-700 text-white border border-white/15 font-black px-5 py-3 rounded-2xl text-xs flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer"
                          >
                            <ArrowRight className="w-4 h-4" />
                            <span>بازگشت به منوی ادمین</span>
                          </button>
                        </div>
                      </div>

                      {editingChecklist !== null ? (
                        /* Editing Checklist Form */
                        <form onSubmit={handleSaveChecklist} className="space-y-6 bg-white/5 border border-white/10 p-6 sm:p-8 rounded-[2.5rem] shadow-2xl relative">
                          <div className="border-b border-white/10 pb-4">
                            <h4 className="text-base font-black text-teal-400">
                              {editingChecklist.id.startsWith('new_checklist_') ? 'تعریف چک‌لیست جدید ارزیابی' : 'ویرایش چک‌لیست ارزیابی'}
                            </h4>
                          </div>

                          <div className="grid sm:grid-cols-2 gap-6">
                            <div>
                              <label className="block text-xs font-bold text-slate-300 mb-2">عنوان چک‌لیست:</label>
                              <input
                                type="text"
                                value={checklistFormTitle}
                                onChange={(e) => setChecklistFormTitle(e.target.value)}
                                placeholder="مثال: چک‌لیست رضایت‌سنجی ترخیص بخش جراحی"
                                className="w-full text-xs bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-teal-500/40 font-bold text-right"
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-300 mb-2">نوع چک‌لیست:</label>
                              <select
                                value={checklistFormTargetType}
                                onChange={(e) => setChecklistFormTargetType(e.target.value as any)}
                                className="w-full text-xs bg-[#111625] border border-white/10 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-teal-500/40 font-bold cursor-pointer text-right"
                              >
                                <option value="satisfaction" className="bg-[#111625]">نظرسنجی رضایت بیمار (ترخیص)</option>
                                <option value="patient" className="bg-[#111625]">خودارزیابی خودمراقبتی بیمار (منزل)</option>
                              </select>
                            </div>

                            {checklistFormTargetType === 'satisfaction' && (
                              <div className="sm:col-span-2">
                                <label className="block text-xs font-bold text-slate-300 mb-2">اختصاص به بخش درمانی:</label>
                                <select
                                  value={checklistFormDeptId}
                                  onChange={(e) => setChecklistFormDeptId(e.target.value)}
                                  className="w-full text-xs bg-[#111625] border border-white/10 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-teal-500/40 font-bold cursor-pointer text-right"
                                >
                                  {departments.map(d => (
                                    <option key={d.id} value={d.id} className="bg-[#111625]">{d.name}</option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>

                          {/* Questions Form Area */}
                          <div className="bg-[#111625]/60 border border-white/5 p-6 rounded-[2rem] space-y-4">
                            <h5 className="text-xs font-black text-slate-300 border-b border-white/5 pb-2">سوالات چک‌لیست ({checklistFormQuestions.length} سوال ثبت شده)</h5>

                            {/* Current checklistFormQuestions list */}
                            <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1 text-right">
                              {checklistFormQuestions.map((q, idx) => (
                                <div key={q.id} className="bg-white/5 border border-white/5 p-4 rounded-xl flex justify-between items-center gap-4">
                                  <div className="flex gap-2 items-center flex-grow">
                                    <span className="bg-teal-500/10 text-teal-300 border border-teal-500/20 text-xs font-black px-2.5 py-1 rounded-lg">
                                      {idx + 1}
                                    </span>
                                    <div>
                                      <p className="text-xs text-white font-bold">{q.text}</p>
                                      <p className="text-[9px] text-slate-400 mt-1 font-bold">
                                        نوع پاسخ: {
                                          q.type === 'qualitative' ? 'کیفی' :
                                          q.type === 'quantitative' ? 'عددی' :
                                          q.type === 'multiple_choice' ? 'چند گزینه‌ای' :
                                          q.type === 'emoji' ? 'ایموجی' : 'تشریحی'
                                        } {q.options && `(${q.options.join(', ')})`}
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveQuestionFromForm(q.id)}
                                    className="text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-500 p-2 rounded-xl transition-all cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                              {checklistFormQuestions.length === 0 && (
                                <p className="text-center text-[11px] text-slate-400 py-4">هنوز سوالی برای این چک‌لیست تعریف نشده است. از فرم زیر برای افزودن سوال استفاده کنید.</p>
                              )}
                            </div>

                            {/* Add Question Subform */}
                            <div className="border-t border-white/5 pt-4 grid gap-4">
                              <h6 className="text-[11px] font-black text-teal-400">افزودن سوال جدید به چک‌لیست:</h6>
                              <div className="grid sm:grid-cols-3 gap-4 items-end">
                                <div className="sm:col-span-2">
                                  <label className="block text-[10px] font-bold text-slate-400 mb-1">متن سوال ارزیابی:</label>
                                  <input
                                    type="text"
                                    placeholder="مثال: میزان درد خود را از ۱ تا ۱۰ توصیف کنید"
                                    value={newQText}
                                    onChange={(e) => setNewQText(e.target.value)}
                                    className="w-full text-xs bg-[#121826] border border-white/10 text-white placeholder:text-slate-500 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-teal-500/40 font-bold"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-400 mb-1">نوع پاسخ سوال:</label>
                                  <select
                                    value={newQType}
                                    onChange={(e) => setNewQType(e.target.value as any)}
                                    className="w-full text-xs bg-[#121826] border border-white/10 text-white rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-teal-500/40 font-bold cursor-pointer"
                                  >
                                    <option value="qualitative">کیفی (عالی، خوب، متوسط، ضعیف)</option>
                                    <option value="quantitative">عددی / مقداری (مانند فشار خون یا قند خون)</option>
                                    <option value="multiple_choice">چند گزینه‌ای سفارشی</option>
                                    <option value="emoji">ایموجی / رضایت‌مندی با شکلک</option>
                                    <option value="descriptive">تشریحی / توضیحی آزاد</option>
                                  </select>
                                </div>
                              </div>

                              {(newQType === 'multiple_choice' || newQType === 'qualitative') && (
                                <div className="animate-fade-in text-right">
                                  <label className="block text-[10px] font-bold text-slate-400 mb-1">گزینه‌های پاسخ (با ویرگول انگلیسی یا فارسی جدا کنید):</label>
                                  <input
                                    type="text"
                                    placeholder="مثال: بسیار عالی, رضایت‌بخش, نیاز به بهبود, ضعیف"
                                    value={newQOptions}
                                    onChange={(e) => setNewQOptions(e.target.value)}
                                    className="w-full text-xs bg-[#121826] border border-white/10 text-white placeholder:text-slate-500 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-teal-500/40 font-bold"
                                  />
                                </div>
                              )}

                              <button
                                type="button"
                                onClick={handleAddQuestionToForm}
                                className="bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-black px-4 py-2.5 rounded-xl border border-white/10 transition-all cursor-pointer flex items-center gap-1"
                              >
                                <Plus className="w-4 h-4 text-teal-400" />
                                <span>ثبت و درج سوال به لیست موقت</span>
                              </button>
                            </div>
                          </div>

                          {/* Submit Actions */}
                          <div className="flex justify-end gap-3 border-t border-white/10 pt-6">
                            <button
                              type="button"
                              onClick={() => setEditingChecklist(null)}
                              className="text-slate-400 hover:text-white bg-transparent hover:bg-white/5 border border-white/10 px-5 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer"
                            >
                              انصراف
                            </button>
                            <button
                              type="submit"
                              disabled={checklistFormQuestions.length === 0}
                              className={`font-black px-6 py-3 rounded-2xl text-xs flex items-center gap-2 border shadow-lg transition-all cursor-pointer ${
                                checklistFormQuestions.length === 0
                                  ? 'bg-slate-800 text-slate-500 border-white/5 cursor-not-allowed shadow-none'
                                  : 'bg-gradient-to-r from-teal-400 to-emerald-500 hover:from-teal-500 hover:to-emerald-600 border-teal-400/30 text-white shadow-teal-500/15'
                              }`}
                            >
                              <Check className="w-4 h-4" />
                              <span>ذخیره نهایی و فعال‌سازی چک‌لیست ارزیابی</span>
                            </button>
                          </div>
                        </form>
                      ) : selectedChecklistCategory === null ? (
                        /* Two beautiful category tile cards initially displayed */
                        <div className="grid sm:grid-cols-2 gap-8 text-right font-sans">
                          {/* Card 1: Satisfaction Checklists */}
                          <div
                            onClick={() => setSelectedChecklistCategory('satisfaction')}
                            className="group bg-gradient-to-br from-[#1b223c] to-[#121629] border border-white/10 hover:border-amber-400 p-8 rounded-[2.5rem] cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-amber-500/10 flex flex-col justify-between min-h-[260px] relative overflow-hidden"
                          >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-500/10 to-transparent rounded-full blur-2xl pointer-events-none" />
                            <div className="flex justify-between items-start relative z-10">
                              <div className="bg-amber-500/10 text-amber-400 p-5 rounded-2xl border border-amber-400/20 group-hover:bg-amber-500 group-hover:text-white transition-all duration-300">
                                <HeartHandshake className="w-8 h-8" />
                              </div>
                              <span className="text-xs bg-amber-500/15 text-amber-300 px-4 py-1.5 rounded-full font-black border border-amber-500/20 shadow-md">
                                {customChecklists.filter(c => c.targetType === 'satisfaction').length} چک‌لیست فعال
                              </span>
                            </div>
                            <div className="mt-8 relative z-10">
                              <h3 className="text-lg sm:text-xl font-black text-white group-hover:text-amber-300 transition-colors">چک‌لیست‌های ارزیابی رضایت‌مندی</h3>
                              <p className="text-xs text-slate-300 font-bold mt-3 leading-relaxed">
                                نظرسنجی‌ها و ارزیابی‌های پیشرفته مربوط به سنجش رضایت بیماران ترخیص‌شده از ابعاد مختلف هتلینگ، خدمات درمانی و بهداشت بخش‌ها.
                              </p>
                              <div className="mt-5 flex items-center gap-1.5 text-xs text-amber-400 font-black group-hover:translate-x-1 transition-transform duration-300">
                                <span>ورود و مدیریت چک‌لیست‌ها</span>
                                <ChevronLeft className="w-4 h-4" />
                              </div>
                            </div>
                          </div>

                          {/* Card 2: Patient Follow-up Checklists */}
                          <div
                            onClick={() => setSelectedChecklistCategory('patient')}
                            className="group bg-gradient-to-br from-[#1b223c] to-[#121629] border border-white/10 hover:border-indigo-400 p-8 rounded-[2.5rem] cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-indigo-500/10 flex flex-col justify-between min-h-[260px] relative overflow-hidden"
                          >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-transparent rounded-full blur-2xl pointer-events-none" />
                            <div className="flex justify-between items-start relative z-10">
                              <div className="bg-indigo-500/10 text-indigo-400 p-5 rounded-2xl border border-indigo-400/20 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-300">
                                <ClipboardList className="w-8 h-8" />
                              </div>
                              <span className="text-xs bg-indigo-500/15 text-indigo-300 px-4 py-1.5 rounded-full font-black border border-indigo-500/20 shadow-md">
                                {customChecklists.filter(c => c.targetType === 'patient').length} چک‌لیست فعال
                              </span>
                            </div>
                            <div className="mt-8 relative z-10">
                              <h3 className="text-lg sm:text-xl font-black text-white group-hover:text-indigo-300 transition-colors">چک‌لیست‌های خودارزیابی و پیگیری بیمار</h3>
                              <p className="text-xs text-slate-300 font-bold mt-3 leading-relaxed">
                                چک‌لیست‌های خودمراقبتی هوشمند در منزل جهت ارزیابی علائم حیاتی، پایش روزانه وضعیت عمومی و هشدارهای سلامتی پس از ترخیص.
                              </p>
                              <div className="mt-5 flex items-center gap-1.5 text-xs text-indigo-400 font-black group-hover:translate-x-1 transition-transform duration-300">
                                <span>ورود و مدیریت چک‌لیست‌ها</span>
                                <ChevronLeft className="w-4 h-4" />
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Listing View of Filtered Custom Checklists */
                        <div className="space-y-6 text-right font-sans">
                          {/* Subcategory selection header */}
                          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-white/5 border border-white/10 p-5 rounded-2xl">
                            <div className="flex items-center gap-2">
                              <span className={`w-3.5 h-3.5 rounded-full animate-pulse ${selectedChecklistCategory === 'satisfaction' ? 'bg-amber-400' : 'bg-indigo-400'}`} />
                              <span className="text-xs font-black text-white">
                                دسته‌بندی فعال: {selectedChecklistCategory === 'satisfaction' ? 'چک‌لیست‌های رضایت‌مندی بیمار' : 'چک‌لیست‌های خودمراقبتی و پیگیری بیمار'}
                              </span>
                            </div>
                            <button
                              onClick={() => setSelectedChecklistCategory(null)}
                              className="bg-white/10 hover:bg-white/15 text-slate-200 hover:text-white border border-white/10 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5"
                            >
                              <span>بازگشت به دسته‌بندی‌ها</span>
                              <ChevronLeft className="w-4 h-4 rotate-180" />
                            </button>
                          </div>

                          <div className="grid md:grid-cols-2 gap-6 text-right">
                            {/* Left Column: List */}
                            <div className="space-y-4 md:col-span-2">
                              <h4 className="text-xs font-black text-slate-300 font-black">
                                لیست فعال در این گروه ({customChecklists.filter(c => c.targetType === selectedChecklistCategory).length} چک‌لیست)
                              </h4>
                              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {customChecklists.filter(c => c.targetType === selectedChecklistCategory).map(c => {
                                  const deptName = c.departmentId ? departments.find(d => d.id === c.departmentId)?.name : null;
                                  return (
                                    <div key={c.id} className="bg-white/5 border border-white/10 hover:border-teal-500/30 rounded-[2rem] p-6 flex flex-col justify-between hover:bg-white/10 transition-all duration-300 shadow-xl group">
                                      <div className="space-y-4">
                                        <div className="flex justify-between items-start gap-2">
                                          <span className={`text-[9px] px-2 py-1 rounded-md font-black border ${
                                            c.targetType === 'satisfaction'
                                              ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                                              : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
                                          }`}>
                                            {c.targetType === 'satisfaction' ? 'نظرسنجی رضایت بیمار' : 'خودارزیابی خودمراقبتی بیمار'}
                                          </span>
                                          <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-1 rounded-md font-mono font-bold shrink-0">
                                            {c.questions.length} سوال
                                          </span>
                                        </div>

                                        <div>
                                          <h5 className="text-sm font-black text-white group-hover:text-teal-300 transition-colors leading-relaxed">{c.title}</h5>
                                          {deptName && (
                                            <p className="text-[10px] text-teal-400 font-bold mt-1.5 flex items-center gap-1">
                                              <span>• اختصاصی بخش:</span>
                                              <span className="underline">{deptName}</span>
                                            </p>
                                          )}
                                        </div>

                                        {/* Questions Preview */}
                                        <div className="bg-black/10 border border-white/5 p-3 rounded-xl max-h-[120px] overflow-y-auto space-y-1 text-right">
                                          {c.questions.map((q, qidx) => (
                                            <p key={q.id} className="text-[10px] text-slate-300 font-medium truncate">
                                              {qidx + 1}. {q.text}
                                            </p>
                                          ))}
                                        </div>
                                      </div>

                                      <div className="flex gap-2 mt-6 pt-4 border-t border-white/5 justify-end">
                                        <button
                                          onClick={() => handleDeleteChecklist(c.id)}
                                          className="text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-500 px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                          <span>حذف</span>
                                        </button>
                                        <button
                                          onClick={() => handleEditChecklistInit(c)}
                                          className="text-teal-400 hover:text-white bg-teal-500/10 hover:bg-teal-500 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1"
                                        >
                                          <Edit3 className="w-3.5 h-3.5" />
                                          <span>ویرایش سوالات</span>
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                                {customChecklists.filter(c => c.targetType === selectedChecklistCategory).length === 0 && (
                                  <div className="col-span-full bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
                                    <ClipboardList className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                                    <p className="text-sm font-black text-slate-300">هنوز هیچ چک‌لیستی در این دسته‌بندی ایجاد نشده است.</p>
                                    <p className="text-xs text-slate-400 mt-1">با کلیک روی دکمه بالای صفحه، اولین چک‌لیست را اضافه نمایید.</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* HOSPITAL GENERAL SATISFACTION SURVEY EDITOR */}
                      {currentAdmin.role === 'super' && selectedChecklistCategory === 'satisfaction' && (
                        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6 sm:p-8 shadow-2xl relative mt-8 space-y-6 text-right">
                          <div className="border-b border-white/10 pb-4">
                            <h4 className="text-base font-black text-white flex items-center gap-2">
                              <HeartHandshake className="w-5 h-5 text-teal-400 animate-pulse" />
                              <span>مدیریت چک‌لیست رضایت‌سنجی جامع بیمارستان (صفحه ارزیابی بیمار)</span>
                            </h4>
                            <p className="text-xs text-slate-300 font-medium mt-1">
                              در این بخش ادمین کل می‌تواند سوالات مربوط به «چک‌لیست ارزیابی رضایت‌مندی بیمار» را به صورت پویا ویرایش، حذف و اضافه نماید.
                            </p>
                          </div>

                          {/* Form to Add New Question to General Satisfaction Survey */}
                          <div className="bg-[#121826] border border-white/5 p-4 rounded-2xl flex flex-col sm:flex-row gap-3 items-end">
                            <div className="flex-grow w-full text-right">
                              <label className="block text-[11px] font-bold text-slate-300 mb-2">افزودن سوال جدید به چک‌لیست رضایت‌سنجی جامع:</label>
                              <input
                                type="text"
                                placeholder="مثال: از نحوه پاسخ‌دهی کادر درمان به درخواست‌های شبانه رضایت کامل دارید."
                                id="new_general_survey_question"
                                className="w-full text-xs bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400/50 font-bold text-right"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const input = document.getElementById('new_general_survey_question') as HTMLInputElement;
                                if (!input || !input.value.trim()) return;
                                const text = input.value.trim();
                                const newQ = { id: `q_gen_${Date.now()}`, text };
                                const updated = [...hospitalSurveyQuestions, newQ];
                                saveHospitalSurveyQuestions(updated);
                                input.value = '';
                              }}
                              className="bg-teal-500 hover:bg-teal-600 text-white font-black px-5 py-3 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                            >
                              <Plus className="w-4 h-4" />
                              <span>افزودن سوال</span>
                            </button>
                          </div>

                          {/* Questions List */}
                          <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                            {hospitalSurveyQuestions.map((q, qidx) => (
                              <div key={q.id} className="bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl p-4 flex justify-between items-center gap-4 transition-all">
                                <div className="flex gap-3 items-center flex-grow">
                                  <span className="bg-teal-500/10 text-teal-300 border border-teal-500/20 text-xs font-black px-2.5 py-1 rounded-lg">
                                    {qidx + 1}
                                  </span>
                                  <input
                                    type="text"
                                    value={q.text}
                                    onChange={(e) => {
                                      const updated = hospitalSurveyQuestions.map(item => item.id === q.id ? { ...item, text: e.target.value } : item);
                                      saveHospitalSurveyQuestions(updated);
                                    }}
                                    className="bg-transparent border-b border-transparent hover:border-white/20 focus:border-teal-400 text-xs text-white font-semibold flex-grow py-1 outline-none transition-colors text-right"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = hospitalSurveyQuestions.filter(item => item.id !== q.id);
                                    saveHospitalSurveyQuestions(updated);
                                  }}
                                  className="text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-500 p-2 rounded-xl transition-all cursor-pointer"
                                  title="حذف سوال"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Delete Checklist Confirmation Modal */}
                      {deletingChecklistId && (() => {
                        const targetChk = customChecklists.find(c => c.id === deletingChecklistId);
                        return (
                          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
                            <div className="bg-[#111625] border border-white/10 rounded-[2rem] w-full max-w-md p-6 shadow-2xl relative text-right">
                              <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="w-6 h-6 text-rose-400" />
                              </div>
                              <h3 className="text-base font-black text-white mb-2 text-center">حذف چک‌لیست</h3>
                              <p className="text-xs text-slate-300 font-medium leading-relaxed mb-6 text-center">
                                آیا از حذف چک‌لیست <span className="text-rose-400 font-black">«{targetChk?.title}»</span> اطمینان کامل دارید؟ این اقدام غیرقابل بازگشت است.
                              </p>
                              <div className="flex items-center justify-center gap-3 font-sans">
                                <button
                                  type="button"
                                  onClick={() => setDeletingChecklistId(null)}
                                  className="bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer w-24"
                                >
                                  انصراف
                                </button>
                                <button
                                  type="button"
                                  onClick={handleConfirmDeleteChecklist}
                                  className="bg-rose-50 hover:bg-rose-600 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-lg shadow-rose-500/10 transition-all cursor-pointer w-24"
                                >
                                  تایید حذف
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                    </div>
                  )}

                  {/* TAB 8: COMPLAINTS & SUGGESTIONS */}
                  {adminTab === 'complaints' && (
                    <div className="space-y-6 text-right">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/5 border border-white/10 rounded-[2.5rem] p-6 sm:p-8">
                        <div>
                          <h3 className="text-xl font-black text-white mb-1.5 flex items-center gap-2">
                            <HeartHandshake className="w-6 h-6 text-emerald-400 animate-pulse" />
                            <span>سامانه شکایت‌ها، پیشنهادها و رضایت‌سنجی</span>
                          </h3>
                          <p className="text-xs text-slate-300 font-medium leading-relaxed">
                            {currentAdmin.role === 'super'
                              ? 'نمایش جامع شکایات عمومی، نظرسنجی ترخیص بیمارستان و نظرسنجی‌های اختصاصی بخش‌های مختلف.'
                              : `نمایش شکایات عمومی بیمارستان و نظرسنجی‌های اختصاصی بخش ${departments.find(d => d.id === currentAdmin.departmentId)?.name || ''}`}
                          </p>
                        </div>
                        <button
                          onClick={() => setAdminTab('overview')}
                          className="bg-slate-800 hover:bg-slate-700 text-white border border-white/15 font-black px-5 py-3 rounded-2xl text-xs flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer"
                        >
                          <ArrowRight className="w-4 h-4" />
                          <span>بازگشت به منوی ادمین</span>
                        </button>
                      </div>

                      {/* Sub-Tabs Switcher */}
                      <div className="flex flex-wrap gap-2.5 bg-white/5 p-2 rounded-2xl border border-white/10">
                        <button
                          onClick={() => setComplaintsSubTab('general')}
                          className={`flex-grow sm:flex-none text-xs font-black px-5 py-3 rounded-xl transition-all duration-300 cursor-pointer ${
                            complaintsSubTab === 'general'
                              ? 'bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-900 shadow-lg shadow-emerald-500/20 scale-[1.02]'
                              : 'text-slate-300 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          📋 شکایت‌ها و پیشنهادهای ثبت‌شده ({complaints.length})
                        </button>

                        <button
                          onClick={() => setComplaintsSubTab('hospital_survey')}
                          className={`flex-grow sm:flex-none text-xs font-black px-5 py-3 rounded-xl transition-all duration-300 cursor-pointer ${
                            complaintsSubTab === 'hospital_survey'
                              ? 'bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-900 shadow-lg shadow-emerald-500/20 scale-[1.02]'
                              : 'text-slate-300 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          🏥 نظرسنجی رضایت ترخیص بیمارستان ({patients.filter(p => p.satisfactionSurvey).length})
                        </button>

                        <button
                          onClick={() => setComplaintsSubTab('dept_survey')}
                          className={`flex-grow sm:flex-none text-xs font-black px-5 py-3 rounded-xl transition-all duration-300 cursor-pointer ${
                            complaintsSubTab === 'dept_survey'
                              ? 'bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-900 shadow-lg shadow-emerald-500/20 scale-[1.02]'
                              : 'text-slate-300 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          🩺 نظرسنجی اختصاصی بخش‌ها ({
                            currentAdmin.role === 'super'
                              ? deptSatisfactionSubmissions.length
                              : deptSatisfactionSubmissions.filter(s => s.departmentId === currentAdmin.departmentId).length
                          })
                        </button>
                      </div>

                      {/* SUB TAB 1: GENERAL COMPLAINTS */}
                      {complaintsSubTab === 'general' && (
                        <div className="space-y-4">
                          {complaints.length === 0 ? (
                            <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center">
                              <p className="text-sm text-slate-400 font-bold">هیچ شکایت یا پیشنهادی ثبت نشده است.</p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {[...complaints].reverse().map(comp => (
                                <div key={comp.id} className="bg-white/5 border border-white/10 rounded-3xl p-6 hover:border-emerald-500/50 transition-all flex flex-col justify-between">
                                  <div className="space-y-3">
                                    <div className="flex justify-between items-start gap-2">
                                      <h4 className="text-sm font-black text-white">{comp.name || 'بیمار ناشناس'}</h4>
                                      <span className="text-[10px] bg-white/5 text-slate-300 px-2 py-1 rounded-lg font-bold">
                                        🗓️ {comp.date || 'نامشخص'}
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-300 bg-[#111625] p-3 rounded-2xl border border-white/5">
                                      <span>📞 تلفن: {comp.phone || 'ثبت‌نشده'}</span>
                                      <span>🎂 سن: {comp.age ? `${comp.age} سال` : 'ثبت‌نشده'}</span>
                                    </div>
                                    <p className="text-xs text-slate-200 leading-relaxed bg-white/5 p-4 rounded-2xl border border-white/5 text-justify">
                                      {comp.description}
                                    </p>
                                  </div>
                                  <div className="mt-4 pt-3 border-t border-white/5 text-[9px] text-slate-400 font-mono text-left">
                                    Submitted at: {new Date(comp.submittedAt).toLocaleString('fa-IR')}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* SUB TAB 2: HOSPITALIZATION SURVEYS */}
                      {complaintsSubTab === 'hospital_survey' && (
                        <div className="space-y-4">
                          {(() => {
                            const surveyedPatients = patients.filter(p => p.satisfactionSurvey);
                            if (surveyedPatients.length === 0) {
                              return (
                                <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center">
                                  <p className="text-sm text-slate-400 font-bold">هیچ نظرسنجی رضایت از خدماتی ثبت نشده است.</p>
                                </div>
                              );
                            }
                            return (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[...surveyedPatients].reverse().map(p => {
                                  const survey = p.satisfactionSurvey!;
                                  const dept = departments.find(d => d.id === p.departmentId);
                                  return (
                                    <div key={p.nationalId} className="bg-white/5 border border-white/10 rounded-3xl p-6 hover:border-sky-500/50 transition-all flex flex-col justify-between">
                                      <div className="space-y-3">
                                        <div className="flex justify-between items-start">
                                          <div>
                                            <h4 className="text-sm font-black text-white">{p.name}</h4>
                                            <span className="text-[10px] text-slate-400 font-bold">بخش: {dept?.name || 'نامشخص'}</span>
                                          </div>
                                          <div className="flex flex-col items-end">
                                            <span className="text-[10px] bg-white/5 text-slate-300 px-2.5 py-1 rounded-lg font-bold">
                                              ⭐ رضایت کلی: {survey.q18 || 'نامشخص'}
                                            </span>
                                          </div>
                                        </div>

                                        <div className="grid grid-cols-1 gap-2 bg-[#111625] p-3 rounded-2xl border border-white/5 text-xs font-bold text-slate-300">
                                          <p>🩺 کادر مورد رضایت: <span className="text-emerald-400">{survey.q19 || 'ثبت‌نشده'}</span></p>
                                          <p className="truncate" title={survey.q20}>💡 پیشنهاد/انتقاد: <span className="text-slate-200">{survey.q20 || 'ثبت‌نشده'}</span></p>
                                        </div>
                                      </div>

                                      <div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center">
                                        <button
                                          onClick={() => setSelectedSurveyPatient(p)}
                                          className="text-[10px] bg-sky-500 hover:bg-sky-600 text-white font-black px-3 py-1.5 rounded-xl transition cursor-pointer"
                                        >
                                          📋 مشاهده تمام ۱۷ پاسخ
                                        </button>
                                        <span className="text-[9px] text-slate-400 font-mono">
                                          {new Date(survey.submittedAt).toLocaleString('fa-IR')}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {/* SUB TAB 3: DEPARTMENT-SPECIFIC SURVEYS */}
                      {complaintsSubTab === 'dept_survey' && (
                        <div className="space-y-4">
                          {(() => {
                            const filteredSubmissions = currentAdmin.role === 'super'
                              ? deptSatisfactionSubmissions
                              : deptSatisfactionSubmissions.filter(s => s.departmentId === currentAdmin.departmentId);

                            if (filteredSubmissions.length === 0) {
                              return (
                                <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center">
                                  <p className="text-sm text-slate-400 font-bold">هیچ ارزیابی رضایتمندی بخشی ثبت نشده است.</p>
                                </div>
                              );
                            }
                            return (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[...filteredSubmissions].reverse().map(sub => {
                                  const dept = departments.find(d => d.id === sub.departmentId);
                                  // Let's find the checklist template used for this department to match question texts
                                  const checklist = customChecklists.find(c => c.targetType === 'satisfaction' && c.departmentId === sub.departmentId);
                                  return (
                                    <div key={sub.id} className="bg-white/5 border border-white/10 rounded-3xl p-6 hover:border-emerald-500/50 transition-all flex flex-col justify-between">
                                      <div className="space-y-4">
                                        <div className="flex justify-between items-center border-b border-white/5 pb-2">
                                          <div>
                                            <h4 className="text-sm font-black text-white">ارزیابی رضایتمندی {dept?.name || 'بخش نامشخص'}</h4>
                                            <span className="text-[10px] text-slate-400 font-bold">کد ارزیابی: {sub.id}</span>
                                          </div>
                                          <span className="text-[9px] text-slate-300 bg-white/5 px-2 py-1 rounded-lg font-mono">
                                            {new Date(sub.submittedAt).toLocaleDateString('fa-IR')}
                                          </span>
                                        </div>

                                        <div className="space-y-2.5">
                                          {checklist ? (
                                            checklist.questions.map(q => {
                                              const ans = sub.answers[q.id];
                                              return (
                                                <div key={q.id} className="text-xs bg-[#111625] p-3 rounded-xl border border-white/5 space-y-1 text-right">
                                                  <p className="text-slate-400 font-bold">{q.text}</p>
                                                  <p className="text-emerald-400 font-black">
                                                    {ans === 'yes' ? '💚 بله' : ans === 'no' ? '❤️ خیر' : ans === 'partial' ? '💛 تا حدودی' : (ans || 'پاسخ داده نشده')}
                                                  </p>
                                                </div>
                                              );
                                            })
                                          ) : (
                                            <div className="space-y-1.5">
                                              {Object.entries(sub.answers).map(([qid, val]) => (
                                                <div key={qid} className="text-xs bg-[#111625] p-2.5 rounded-xl border border-white/5 text-right">
                                                  <span className="text-slate-400 font-bold">سوال {qid}: </span>
                                                  <span className="text-emerald-400 font-black">{(val as string) === 'yes' ? 'بله' : (val as string) === 'no' ? 'خیر' : (val as string) === 'partial' ? 'تا حدودی' : String(val)}</span>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {/* Survey All Answers Modal */}
                      {selectedSurveyPatient && (
                        <div className="fixed inset-0 z-50 bg-slate-900/85 backdrop-blur-md flex justify-center items-center p-4">
                          <div className="bg-[#111625] border border-white/15 rounded-[2.5rem] p-6 sm:p-8 max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl relative text-right">
                            <button
                              onClick={() => setSelectedSurveyPatient(null)}
                              className="absolute top-5 left-5 text-slate-400 hover:text-white font-bold bg-white/5 hover:bg-white/10 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
                            >
                              ✕
                            </button>

                            <div className="border-b border-white/10 pb-4 mb-6">
                              <h3 className="text-lg font-black text-white">پاسخ‌های تفصیلی نظرسنجی ترخیص</h3>
                              <p className="text-xs text-slate-400 font-bold mt-1">بیمار: {selectedSurveyPatient.name} | کدملی: {selectedSurveyPatient.nationalId}</p>
                            </div>

                            <div className="space-y-3.5">
                              {hospitalSurveyQuestions.map((q, idx) => {
                                const ans = selectedSurveyPatient.satisfactionSurvey?.[q.id as keyof SatisfactionSurvey];
                                return (
                                  <div key={q.id} className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                    <div className="flex gap-2.5 items-start">
                                      <span className="bg-sky-500/10 text-sky-400 border border-sky-500/25 text-xs font-black px-2.5 py-1 rounded-lg shrink-0">
                                        {idx + 1}
                                      </span>
                                      <p className="text-xs font-bold text-slate-200 leading-relaxed text-justify">{q.text}</p>
                                    </div>
                                    <span className={`text-xs font-black px-3.5 py-1.5 rounded-xl shrink-0 self-end sm:self-auto ${
                                      ans === 'yes' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                      ans === 'partial' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                      ans === 'no' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-white/5 text-slate-400'
                                    }`}>
                                      {ans === 'yes' ? 'بله' : ans === 'partial' ? 'تا حدودی' : ans === 'no' ? 'خیر' : 'پاسخ داده نشده'}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 9: HOSPITAL NEWS BANNERS */}
                  {adminTab === 'banners' && currentAdmin.role === 'super' && (
                    <div className="space-y-6 text-right font-sans">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/5 border border-white/10 rounded-[2.5rem] p-6 sm:p-8">
                        <div>
                          <h3 className="text-xl font-black text-white mb-1.5 flex items-center gap-2">
                            <Sparkles className="w-6 h-6 text-indigo-400 animate-pulse" />
                            <span>سامانه مدیریت بنرهای اسلایدشو بیمارستان</span>
                          </h3>
                          <p className="text-xs text-slate-300 font-medium leading-relaxed">
                            در این بخش می‌توانید بنرهای خبری، اطلاعیه‌ها و برنامه‌ها را جهت نمایش اسلایدی در صفحه اول بیماران مدیریت کنید.
                          </p>
                        </div>
                        <button
                          onClick={() => setAdminTab('overview')}
                          className="bg-slate-800 hover:bg-slate-700 text-white border border-white/15 font-black px-5 py-3 rounded-2xl text-xs flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer shrink-0"
                        >
                          <ArrowRight className="w-4 h-4" />
                          <span>بازگشت به پنل اصلی</span>
                        </button>
                      </div>

                      <div className="grid lg:grid-cols-3 gap-8">
                        {/* Right Form: Add/Edit Banner */}
                        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6 sm:p-8 shadow-2xl relative space-y-6 lg:col-span-1">
                          <div className="border-b border-white/10 pb-4">
                            <h4 className="text-sm font-black text-white flex items-center gap-2">
                              <Plus className="w-4 h-4 text-indigo-400" />
                              <span>{editingBannerId ? 'ویرایش بنر موجود' : 'افزودن بنر خبری جدید'}</span>
                            </h4>
                          </div>

                          <form onSubmit={(e) => {
                            e.preventDefault();
                            if (!bannerFormTitle.trim() || !bannerFormContent.trim()) return;
                            if (editingBannerId) {
                              // Edit existing
                              const updated = newsBanners.map(b => b.id === editingBannerId ? {
                                ...b,
                                title: bannerFormTitle.trim(),
                                content: bannerFormContent.trim(),
                                description: bannerFormDescription.trim() || undefined,
                                attachmentImages: bannerFormAttachmentImages.length > 0 ? bannerFormAttachmentImages : undefined,
                                imageUrl: bannerFormImageUrl.trim() || undefined
                              } : b);
                              saveNewsBanners(updated);
                              setEditingBannerId(null);
                            } else {
                              // Add new
                              const newB: NewsBanner = {
                                id: `banner_${Date.now()}`,
                                title: bannerFormTitle.trim(),
                                content: bannerFormContent.trim(),
                                description: bannerFormDescription.trim() || undefined,
                                attachmentImages: bannerFormAttachmentImages.length > 0 ? bannerFormAttachmentImages : undefined,
                                imageUrl: bannerFormImageUrl.trim() || undefined,
                                isActive: true,
                                createdAt: getPersianDateString(new Date())
                              };
                              saveNewsBanners([...newsBanners, newB]);
                            }
                            setBannerFormTitle('');
                            setBannerFormContent('');
                            setBannerFormDescription('');
                            setBannerFormImageUrl('');
                            setBannerFormAttachmentImages([]);
                          }} className="space-y-4">
                            <div>
                              <label className="block text-[10px] text-slate-300 font-bold mb-1.5">عنوان بنر خبر:</label>
                              <input
                                type="text"
                                required
                                placeholder="مثال: راه‌اندازی بخش جدید دندان‌پزشکی"
                                value={bannerFormTitle}
                                onChange={(e) => setBannerFormTitle(e.target.value)}
                                className="w-full text-xs bg-white/5 border border-white/10 text-white placeholder:text-slate-500 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400/50 font-bold"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] text-slate-300 font-bold mb-1.5">خلاصه خبر (نمایش روی اسلایدر بنر):</label>
                              <textarea
                                rows={2}
                                required
                                placeholder="خلاصه کوتاه خبر جهت نمایش روی بنر..."
                                value={bannerFormContent}
                                onChange={(e) => setBannerFormContent(e.target.value)}
                                className="w-full text-xs bg-white/5 border border-white/10 text-white placeholder:text-slate-500 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400/50 font-bold leading-relaxed"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] text-slate-300 font-bold mb-1.5">شرح کامل و شخصی‌سازی صفحه خبر (نمایش پس از کلیک روی بنر):</label>
                              <NewsRichTextEditor
                                value={bannerFormDescription}
                                onChange={setBannerFormDescription}
                                placeholder="متن کامل و توضیحات مشروح خبر یا اطلاعیه (با امکان بولد کردن، لینک‌دهی، تغییر رنگ و سایز نوشته)..."
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] text-slate-300 font-bold mb-1.5">تصاویر ضمیمه و مستندات شرح خبر (نمایش در صفحه اختصاصی خبر):</label>
                              <div className="relative border-2 border-dashed border-white/15 hover:border-indigo-400 rounded-2xl p-4 transition-all text-center bg-white/5 group">
                                <input
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  onChange={async (e) => {
                                    const files = e.target.files ? (Array.from(e.target.files) as File[]) : [];
                                    if (files.length === 0) return;
                                    const base64List: string[] = [];
                                    for (const file of files) {
                                      if (file.type.startsWith('image/')) {
                                        const b64 = await readFileAsDataUrl(file);
                                        base64List.push(b64);
                                      }
                                    }
                                    setBannerFormAttachmentImages(prev => [...prev, ...base64List]);
                                  }}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                <div className="space-y-2 py-2">
                                  <div className="bg-indigo-500/10 text-indigo-400 p-2.5 rounded-xl inline-block group-hover:bg-indigo-500 group-hover:text-white transition-all">
                                    <FileUp className="w-5 h-5" />
                                  </div>
                                  <p className="text-[11px] text-slate-300 font-bold">برای انتخاب یا افزودن تصاویر ضمیمه خبر کلیک کنید (امکان انتخاب چند عکس)</p>
                                  <p className="text-[9px] text-slate-500">فرمت‌های JPG, PNG, WEBP</p>
                                </div>
                              </div>
                              {bannerFormAttachmentImages.length > 0 && (
                                <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                                  {bannerFormAttachmentImages.map((imgUrl, idx) => (
                                    <div key={idx} className="relative group/thumb rounded-xl overflow-hidden border border-white/10 bg-black/40">
                                      <img
                                        src={imgUrl}
                                        alt={`ضمیمه ${idx + 1}`}
                                        className="h-24 w-full object-cover"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setBannerFormAttachmentImages(prev => prev.filter((_, i) => i !== idx));
                                        }}
                                        className="absolute top-1 right-1 bg-rose-600/80 hover:bg-rose-600 text-white p-1 rounded-lg transition-all cursor-pointer shadow"
                                        title="حذف این تصویر"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div>
                              <label className="block text-[10px] text-slate-300 font-bold mb-1.5">بارگذاری تصویر بنر:</label>
                              <div className="relative border-2 border-dashed border-white/15 hover:border-indigo-450 rounded-2xl p-4 transition-all text-center bg-white/5 group">
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    if (!file.type.startsWith('image/')) return;
                                    const base64Url = await readFileAsDataUrl(file);
                                    setBannerFormImageUrl(base64Url);
                                  }}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                {bannerFormImageUrl ? (
                                  <div className="space-y-3">
                                    <img
                                      src={bannerFormImageUrl}
                                      alt="Preview"
                                      className="max-h-32 object-contain mx-auto rounded-xl border border-white/10"
                                    />
                                    <div className="flex items-center justify-center gap-2">
                                      <span className="text-[10px] text-teal-400 font-bold">تصویر با موفقیت انتخاب شد</span>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setBannerFormImageUrl('');
                                        }}
                                        className="text-[10px] bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-lg hover:bg-rose-500 hover:text-white transition-all cursor-pointer relative z-20"
                                      >
                                        حذف تصویر
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-2 py-2">
                                    <div className="bg-indigo-500/10 text-indigo-400 p-2.5 rounded-xl inline-block group-hover:bg-indigo-500 group-hover:text-white transition-all">
                                      <FileUp className="w-5 h-5" />
                                    </div>
                                    <p className="text-[11px] text-slate-300 font-bold">برای انتخاب یا رها کردن تصویر کلیک کنید</p>
                                    <p className="text-[9px] text-slate-500">فرمت‌های JPG, PNG, WEBP</p>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex gap-2.5 pt-2">
                              {editingBannerId && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingBannerId(null);
                                    setBannerFormTitle('');
                                    setBannerFormContent('');
                                    setBannerFormDescription('');
                                    setBannerFormImageUrl('');
                                    setBannerFormAttachmentImages([]);
                                  }}
                                  className="w-1/3 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-black py-3 rounded-xl transition-all cursor-pointer"
                                >
                                  انصراف
                                </button>
                              )}
                              <button
                                type="submit"
                                className={`font-black text-xs py-3 rounded-xl transition-all shadow-lg hover:shadow-indigo-500/10 cursor-pointer ${
                                  editingBannerId ? 'w-2/3 bg-indigo-500 hover:bg-indigo-600 text-white' : 'w-full bg-teal-500 hover:bg-teal-600 text-white'
                                }`}
                              >
                                {editingBannerId ? 'بروزرسانی بنر' : 'ثبت بنر جدید'}
                              </button>
                            </div>
                          </form>
                        </div>

                        {/* Left List: Active & Inactive Banners */}
                        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6 sm:p-8 shadow-2xl relative space-y-6 lg:col-span-2">
                          <div className="border-b border-white/10 pb-4">
                            <h4 className="text-sm font-black text-white flex items-center gap-2">
                              <ClipboardCheck className="w-4 h-4 text-teal-400" />
                              <span>لیست کل بنرهای تعریف شده ({newsBanners.length} بنر)</span>
                            </h4>
                          </div>

                          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                            {newsBanners.map((b) => (
                              <div key={b.id} className="bg-white/5 border border-white/5 hover:border-indigo-500/20 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all">
                                <div className="flex gap-4 items-center text-right flex-grow">
                                  {b.imageUrl && (
                                    <img
                                      src={b.imageUrl}
                                      alt={b.title}
                                      className="w-16 h-16 rounded-xl object-cover border border-white/10 shrink-0 hidden sm:block"
                                      referrerPolicy="no-referrer"
                                    />
                                  )}
                                  <div className="space-y-1">
                                    <h5 className="text-sm font-black text-white flex items-center gap-2">
                                      <span>{b.title}</span>
                                      {!b.isActive && (
                                        <span className="bg-rose-500/15 text-rose-400 text-[9px] px-2 py-0.5 rounded-full font-black border border-rose-500/10">غیرفعال</span>
                                      )}
                                    </h5>
                                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed font-medium">{b.content}</p>
                                    <span className="block text-[9px] text-slate-500 font-mono font-bold">تاریخ ایجاد: {b.createdAt}</span>
                                  </div>
                                </div>

                                <div className="flex gap-2 shrink-0 w-full sm:w-auto justify-end border-t border-white/5 sm:border-0 pt-3 sm:pt-0">
                                  <button
                                    onClick={() => {
                                      const updated = newsBanners.map(item => item.id === b.id ? { ...item, isActive: !item.isActive } : item);
                                      saveNewsBanners(updated);
                                    }}
                                    className={`px-3 py-2 rounded-xl text-[10px] font-black transition-all cursor-pointer ${
                                      b.isActive
                                        ? 'text-amber-400 bg-amber-500/10 hover:bg-amber-500 hover:text-white'
                                        : 'text-teal-400 bg-teal-500/10 hover:bg-teal-500 hover:text-white'
                                    }`}
                                  >
                                    {b.isActive ? 'غیرفعال‌سازی' : 'فعال‌سازی'}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingBannerId(b.id);
                                      setBannerFormTitle(b.title);
                                      setBannerFormContent(b.content);
                                      setBannerFormDescription(b.description || '');
                                      setBannerFormImageUrl(b.imageUrl || '');
                                      setBannerFormAttachmentImages(b.attachmentImages || []);
                                    }}
                                    className="text-indigo-400 hover:text-white bg-indigo-500/10 hover:bg-indigo-500 p-2.5 rounded-xl transition-all cursor-pointer"
                                    title="ویرایش خبر"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      const updated = newsBanners.filter(item => item.id !== b.id);
                                      saveNewsBanners(updated);
                                      if (editingBannerId === b.id) {
                                        setEditingBannerId(null);
                                        setBannerFormTitle('');
                                        setBannerFormContent('');
                                        setBannerFormDescription('');
                                        setBannerFormImageUrl('');
                                        setBannerFormAttachmentImages([]);
                                      }
                                    }}
                                    className="text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-500 p-2.5 rounded-xl transition-all cursor-pointer"
                                    title="حذف خبر"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}

                            {newsBanners.length === 0 && (
                              <div className="bg-white/5 border border-white/5 rounded-2xl p-12 text-center">
                                <Sparkles className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                                <p className="text-sm font-black text-slate-300">هیچ بنر اسلایدشویی تعریف نشده است.</p>
                                <p className="text-xs text-slate-500 mt-1">با پر کردن فرم سمت راست، نخستین بنر خبری را ثبت کنید.</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  </div>
                </div>
              )}

            </motion.div>
          )}

          {/* 7. ADMIN EDIT PATIENT (DEDICATED SCREEN) */}
          {currentScreen === 'admin_edit_patient' && editingPatient && (
            <motion.div
              key="admin_edit_patient"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-4xl mx-auto px-4 py-8 text-right font-sans"
            >
              {/* Back to Dashboard Button */}
              <button
                type="button"
                onClick={handleCancelEditPatient}
                className="inline-flex items-center gap-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-black px-5 py-2.5 rounded-full transition-all duration-300 cursor-pointer shadow-sm mb-6"
              >
                <ArrowRight className="w-4 h-4 text-sky-600" />
                <span>بازگشت به لیست بیماران</span>
              </button>

              <div className="bg-[#111625] border border-white/10 rounded-[2.5rem] p-6 md:p-10 shadow-2xl relative">
                <div className="flex justify-between items-center border-b border-white/10 pb-5 mb-6">
                  <div className="flex items-center gap-3">
                    <Edit className="w-6 h-6 text-sky-400 animate-pulse" />
                    <h2 className="text-xl font-black text-white">ویرایش پرونده بیمار: {editingPatient.name}</h2>
                  </div>
                  <span className="text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/20 px-3 py-1.5 rounded-full font-bold">
                    شماره پرونده: {editingPatient.fileNumber}
                  </span>
                </div>

                <form onSubmit={handleUpdatePatient} className="space-y-6">
                  {patientCrudError && (
                    <div className="bg-rose-950/30 border border-rose-500/30 text-rose-200 text-xs font-black p-4 rounded-2xl">
                      {patientCrudError}
                    </div>
                  )}

                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1.5 font-sans">نام و نام خانوادگی بیمار:</label>
                      <input
                        type="text"
                        value={editPatientName}
                        onChange={(e) => setEditPatientName(e.target.value)}
                        className="w-full text-xs bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-400/50 font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1.5">کد ملی بیمار:</label>
                      <input
                        type="text"
                        value={editPatientNationalId}
                        onChange={(e) => setEditPatientNationalId(e.target.value)}
                        className="w-full text-xs bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-400/50 font-bold font-mono text-left"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1.5">کد کاربری جهت ورود بیمار:</label>
                      <input
                        type="text"
                        value={editUserCode}
                        onChange={(e) => setEditUserCode(e.target.value)}
                        className="w-full text-xs bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-400/50 font-bold font-mono text-left"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1.5">رمز ورود بیمار به سامانه:</label>
                      <input
                        type="text"
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                        className="w-full text-xs bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-400/50 font-bold font-mono text-left"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1.5">شماره پرونده بیمارستانی:</label>
                      <input
                        type="text"
                        value={editPatientFileNumber}
                        onChange={(e) => setEditPatientFileNumber(e.target.value)}
                        className="w-full text-xs bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-400/50 font-bold font-mono text-left"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1.5">سن بیمار:</label>
                      <input
                        type="number"
                        value={editPatientAge}
                        onChange={(e) => setEditPatientAge(e.target.value)}
                        className="w-full text-xs bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-400/50 font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1.5">شماره تماس بیمار:</label>
                      <input
                        type="text"
                        value={editPatientPhone}
                        onChange={(e) => setEditPatientPhone(e.target.value)}
                        className="w-full text-xs bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-400/50 font-bold text-left"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1.5">تاریخ بستری (هجری شمسی):</label>
                      <ShamsiDatePicker
                        value={editAdmissionDate}
                        onChange={(val) => setEditAdmissionDate(val)}
                        placeholder="انتخاب تاریخ بستری..."
                        isDark={true}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1.5">بیماری ترخیص شده:</label>
                      <input
                        type="text"
                        value={editPatientDiseaseName}
                        onChange={(e) => setEditPatientDiseaseName(e.target.value)}
                        className="w-full text-xs bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-400/50 font-bold"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-300 mb-1.5">بخش بیمارستان:</label>
                      <select
                        value={editPatientDeptId}
                        onChange={(e) => setEditPatientDeptId(e.target.value)}
                        disabled={currentAdmin?.role !== 'super'}
                        className="w-full text-xs bg-[#111625] border border-white/10 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-400/50 font-bold cursor-pointer text-right disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="" className="bg-[#111625] text-slate-400">-- انتخاب بخش --</option>
                        {departments
                          .filter(d => currentAdmin?.role === 'super' ? true : d.id === currentAdmin?.departmentId)
                          .map(d => (
                            <option key={d.id} value={d.id} className="bg-[#111625] text-white font-bold">{d.name}</option>
                          ))}
                      </select>
                    </div>

                    <div className="sm:col-span-2 bg-[#111625]/60 border border-sky-500/30 p-4 rounded-2xl space-y-2.5">
                      <label className="block text-xs font-bold text-sky-300 flex items-center gap-2">
                        <FlaskConical className="w-4 h-4 text-sky-400" />
                        <span>دسته‌بندی بیماری‌های ویژه (جهت شاخص‌گیری بیمارستان):</span>
                      </label>
                      <select
                        value={editSpecialDisease}
                        onChange={(e) => setEditSpecialDisease(e.target.value)}
                        className="w-full text-xs bg-[#111625] border border-sky-500/40 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-sky-500/50 font-bold cursor-pointer"
                      >
                        {SPECIAL_DISEASES.map(d => (
                          <option key={d} value={d} className="bg-[#111625] text-white font-bold">{d}</option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                        * این فیلد جهت شاخص‌گیری بیمارستان استفاده می‌شود و در پنل بیمار نمایش داده نمی‌شود.
                      </p>
                    </div>

                    {/* EDIT TRIAGE LEVEL SELECTION */}
                    <div className="sm:col-span-2 bg-[#111625]/80 border border-emerald-500/30 p-4 rounded-2xl space-y-3">
                      <label className="block text-xs font-bold text-emerald-300 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-emerald-400" />
                        <span>ویرایش و تعیین وضعیت تریاژ بیمار (سطح قرمز، زرد و سبز):</span>
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <label className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${editFollowupStatus === 'red' ? 'bg-rose-500/20 border-rose-500 text-rose-200' : 'bg-[#111625] border-white/10 text-slate-300 hover:bg-white/5'}`}>
                          <input
                            type="radio"
                            name="editTriageStatus"
                            value="red"
                            checked={editFollowupStatus === 'red'}
                            onChange={() => setEditFollowupStatus('red')}
                            className="accent-rose-500 w-4 h-4"
                          />
                          <div>
                            <span className="block text-xs font-black text-rose-300">سطح قرمز</span>
                            <span className="text-[10px] text-slate-400">وضعیت هنوز کنترل نشده</span>
                          </div>
                        </label>

                        <label className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${editFollowupStatus === 'yellow' ? 'bg-amber-500/20 border-amber-500 text-amber-200' : 'bg-[#111625] border-white/10 text-slate-300 hover:bg-white/5'}`}>
                          <input
                            type="radio"
                            name="editTriageStatus"
                            value="yellow"
                            checked={editFollowupStatus === 'yellow'}
                            onChange={() => setEditFollowupStatus('yellow')}
                            className="accent-amber-500 w-4 h-4"
                          />
                          <div>
                            <span className="block text-xs font-black text-amber-300">سطح زرد</span>
                            <span className="text-[10px] text-slate-400">وضعیت به صورت ناکافی کنترل شده</span>
                          </div>
                        </label>

                        <label className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${editFollowupStatus === 'green' || (!editFollowupStatus && editFollowupStatus !== 'pending') ? 'bg-emerald-500/20 border-emerald-500 text-emerald-200' : 'bg-[#111625] border-white/10 text-slate-300 hover:bg-white/5'}`}>
                          <input
                            type="radio"
                            name="editTriageStatus"
                            value="green"
                            checked={editFollowupStatus === 'green' || (!editFollowupStatus && editFollowupStatus !== 'pending')}
                            onChange={() => setEditFollowupStatus('green')}
                            className="accent-emerald-500 w-4 h-4"
                          />
                          <div>
                            <span className="block text-xs font-black text-emerald-300">سطح سبز</span>
                            <span className="text-[10px] text-slate-400">وضعیت کنترل و در محدوده ایمن</span>
                          </div>
                        </label>
                      </div>
                    </div>

                    <div className="sm:col-span-2 grid sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1.5">آیا بیمار بستری مجدد در ماه اخیر می‌باشد؟</label>
                        <div className="flex gap-6 items-center h-12 bg-[#111625]/50 border border-white/10 rounded-xl px-4">
                          <label className="flex items-center gap-2 text-xs text-white font-bold cursor-pointer">
                            <input
                              type="radio"
                              name="editReadmission"
                              checked={editReadmissionRecentMonth === true}
                              onChange={() => setEditReadmissionRecentMonth(true)}
                              className="accent-sky-500 w-4 h-4"
                            />
                            <span>بله</span>
                          </label>
                          <label className="flex items-center gap-2 text-xs text-white font-bold cursor-pointer">
                            <input
                              type="radio"
                              name="editReadmission"
                              checked={editReadmissionRecentMonth === false}
                              onChange={() => setEditReadmissionRecentMonth(false)}
                              className="accent-sky-500 w-4 h-4"
                            />
                            <span>خیر</span>
                          </label>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1.5">آیا بیمار باردار است؟</label>
                        <div className="flex gap-6 items-center h-12 bg-[#111625]/50 border border-white/10 rounded-xl px-4">
                          <label className="flex items-center gap-2 text-xs text-white font-bold cursor-pointer">
                            <input
                              type="radio"
                              name="editIsPregnant"
                              checked={editIsPregnant === true}
                              onChange={() => setEditIsPregnant(true)}
                              className="accent-pink-500 w-4 h-4"
                            />
                            <span className="text-pink-300">بله (باردار)</span>
                          </label>
                          <label className="flex items-center gap-2 text-xs text-white font-bold cursor-pointer">
                            <input
                              type="radio"
                              name="editIsPregnant"
                              checked={editIsPregnant === false}
                              onChange={() => {
                                setEditIsPregnant(false);
                                setEditIsHighRiskMother(false);
                              }}
                              className="accent-pink-500 w-4 h-4"
                            />
                            <span>خیر</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    {editIsPregnant && (
                      <div className="sm:col-span-2 bg-pink-950/20 border border-pink-500/30 p-4 rounded-2xl">
                        <label className="block text-xs font-bold text-pink-200 mb-2 flex items-center gap-2 font-sans">
                          <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse" />
                          <span>آیا بیمار مادر پرخطر است؟</span>
                        </label>
                        <div className="flex gap-6 items-center h-12 bg-[#111625]/80 border border-pink-500/20 rounded-xl px-4">
                          <label className="flex items-center gap-2 text-xs text-white font-bold cursor-pointer">
                            <input
                              type="radio"
                              name="editIsHighRiskMother"
                              checked={editIsHighRiskMother === true}
                              onChange={() => setEditIsHighRiskMother(true)}
                              className="accent-rose-500 w-4 h-4"
                            />
                            <span className="text-rose-300">بله (مادر پرخطر - پیگیری ویژه)</span>
                          </label>
                          <label className="flex items-center gap-2 text-xs text-white font-bold cursor-pointer">
                            <input
                              type="radio"
                              name="editIsHighRiskMother"
                              checked={editIsHighRiskMother === false}
                              onChange={() => setEditIsHighRiskMother(false)}
                              className="accent-rose-500 w-4 h-4"
                            />
                            <span>خیر</span>
                          </label>
                        </div>
                        <p className="text-[10px] text-pink-300/80 mt-2 font-medium">
                          تغییر این وضعیت شاخص‌های غربالگری و پیگیری ویژه مادران باردار بیمارستان را به‌روزرسانی می‌کند.
                        </p>
                      </div>
                    )}

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-300 mb-1.5">توضیح جهت راهنمایی بیمار:</label>
                      <textarea
                        placeholder="توضیحات راهنمایی بیمار جهت نمایش در پورتال..."
                        value={editGuidanceNotes}
                        onChange={(e) => setEditGuidanceNotes(e.target.value)}
                        rows={4}
                        className="w-full text-xs bg-[#111625] border border-white/10 text-white placeholder:text-slate-500 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-400/50 font-bold resize-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      {(() => {
                        if (diseases.length === 0) {
                          return <p className="text-[11px] text-slate-500 font-bold bg-white/5 p-2 rounded-xl">هیچ محتوای آموزشی در بیمارستان ثبت نشده است.</p>;
                        }
                        const filtered = diseases.filter(d => {
                          const dept = departments.find(dep => dep.id === d.departmentId);
                          const q = editDiseaseSearch.toLowerCase();
                          return d.name.toLowerCase().includes(q) || (dept?.name || '').toLowerCase().includes(q);
                        });
                        const dropdownItems = filtered.map(d => ({
                          id: d.id,
                          name: d.name,
                          subtext: departments.find(dep => dep.id === d.departmentId)?.name || ''
                        }));
                        return (
                          <MultiSelectDropdown
                            label="بیماری‌های هشتگ شده جهت توصیه به مطالعه دقیق (امکان انتخاب از تمام بخش‌های بیمارستان):"
                            placeholder="🔍 جستجو در نام بیماری یا بخش..."
                            searchValue={editDiseaseSearch}
                            onSearchChange={setEditDiseaseSearch}
                            items={dropdownItems}
                            selectedIds={editHashtaggedDiseaseIds}
                            onToggle={(id) => {
                              if (editHashtaggedDiseaseIds.includes(id)) {
                                setEditHashtaggedDiseaseIds(editHashtaggedDiseaseIds.filter(x => x !== id));
                              } else {
                                setEditHashtaggedDiseaseIds([...editHashtaggedDiseaseIds, id]);
                              }
                            }}
                            accentColor="sky"
                          />
                        );
                      })()}
                    </div>

                    <div className="sm:col-span-2">
                      {(() => {
                        const patientChecklists = customChecklists.filter(c => c.targetType === 'patient');
                        if (patientChecklists.length === 0) {
                          return <p className="text-[11px] text-slate-500 font-bold bg-white/5 p-2 rounded-xl">هیچ چک‌لیست خودارزیابی فعال وجود ندارد.</p>;
                        }
                        const filtered = patientChecklists.filter(c => c.title.toLowerCase().includes(editChecklistSearch.toLowerCase()));
                        const dropdownItems = filtered.map(c => ({
                          id: c.id,
                          name: c.title,
                          subtext: 'چک‌لیست خودارزیابی و مراقبت در منزل'
                        }));
                        return (
                          <MultiSelectDropdown
                            label="فعال‌سازی چک‌لیست‌های خودارزیابی و مراقبت در منزل برای این بیمار:"
                            placeholder="🔍 جستجو در نام چک‌لیست‌ها..."
                            searchValue={editChecklistSearch}
                            onSearchChange={setEditChecklistSearch}
                            items={dropdownItems}
                            selectedIds={editActiveChecklistIds}
                            onToggle={(id) => {
                              if (editActiveChecklistIds.includes(id)) {
                                setEditActiveChecklistIds(editActiveChecklistIds.filter(x => x !== id));
                              } else {
                                setEditActiveChecklistIds([...editActiveChecklistIds, id]);
                              }
                            }}
                            accentColor="emerald"
                          />
                        );
                      })()}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-5 mt-8 font-sans">
                    <button
                      type="button"
                      onClick={handleCancelEditPatient}
                      className="bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 px-6 py-3 rounded-xl text-xs font-black transition-all cursor-pointer"
                    >
                      انصراف
                    </button>
                    <button
                      type="submit"
                      className="bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-500 hover:to-blue-600 text-white px-8 py-3 rounded-xl text-xs font-black shadow-lg transition-all cursor-pointer"
                    >
                      ذخیره تغییرات
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* PREMIUM GRAPHICAL GLASS FOOTER */}
      {currentScreen !== 'welcome' && (
        <footer className="w-full relative mt-auto bg-gradient-to-r from-sky-500 via-sky-700 to-indigo-950/95 border-t border-sky-400/40 backdrop-blur-xl py-4 text-sky-100 shadow-xl overflow-hidden">
          {/* Subtle, beautiful color glow indicators in the corner */}
          <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-sky-400/20 via-indigo-400/10 to-transparent rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-indigo-400/20 via-sky-400/10 to-transparent rounded-full blur-2xl pointer-events-none" />

          <div className="max-w-7xl mx-auto px-6 relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">

            {/* Graphical HUD Clock & Date widget */}
            {currentScreen !== 'admin_dashboard' && (
              <div className="flex items-center gap-4 bg-white border-2 border-sky-300 p-3 rounded-2xl shadow-xl select-none font-sans text-indigo-950">

                {/* Persian Date Widget */}
                <div className="flex items-center gap-2.5 border-l border-sky-200 pl-4">
                  <div className="bg-sky-100 text-sky-800 p-2 rounded-xl border border-sky-200 shadow-sm">
                    <Calendar className="w-5 h-5 text-sky-600" />
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] text-sky-700 font-extrabold uppercase">امروز</span>
                    <span className="block text-xs md:text-sm font-black text-indigo-950">
                      {clockTime.dayName}، {clockTime.dayNum} {clockTime.monthName} {clockTime.yearNum}
                    </span>
                  </div>
                </div>

                {/* Graphical Live Digital Clock */}
                <div className="flex items-center gap-2.5">
                  <div className="bg-indigo-950 text-white px-3 py-1.5 rounded-xl font-mono flex items-baseline gap-1.5 shadow-md border-2 border-sky-400">
                    <span className="text-sm md:text-base font-black tracking-tight">{clockTime.hourMin}</span>
                    <span className="text-[10px] font-black text-emerald-400 w-5 text-center animate-pulse">{clockTime.seconds}</span>
                  </div>
                  <div className="text-right hidden sm:block">
                    <span className="block text-[8px] text-emerald-600 font-black flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                      آنلاین
                    </span>
                    <span className="block text-[10px] text-indigo-950/80 font-black">زمان سیستم</span>
                  </div>
                </div>

              </div>
            )}

            {/* Designer Credits */}
            <div className="text-center md:text-left">
              <p className="text-white font-black text-sm md:text-base mt-0.5 tracking-wide drop-shadow-sm">طراحی و توسعه : حسین نصاری</p>
            </div>

          </div>
        </footer>
      )}

      {/* ADMIN LOGIN MODAL */}
      {showAdminLoginModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center px-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white border border-slate-200 rounded-3xl p-8 max-w-sm w-full shadow-2xl relative"
          >
            {/* Close button */}
            <button
              onClick={() => setShowAdminLoginModal(false)}
              className="absolute top-4 left-4 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              ✕
            </button>

            <div className="text-center mb-6">
              <div className="bg-slate-100 text-slate-800 p-3 rounded-2xl w-fit mx-auto mb-3">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">ورود مسئولین بخش‌ها و پزشکان</h3>
              <p className="text-xs text-slate-500 mt-1">اطلاعات ورود امن کادر درمان را وارد کنید.</p>
            </div>

            <form onSubmit={handleAdminLoginSubmit} className="space-y-4">
              {adminLoginError && (
                <div className="bg-rose-50 text-rose-700 text-xs font-semibold p-2.5 rounded-lg border border-rose-200">
                  {adminLoginError}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">نام کاربری:</label>
                <input
                  type="text"
                  placeholder="نام کاربری"
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">رمز عبور ورود:</label>
                <input
                  type="password"
                  placeholder="کلمه عبور"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2.5 rounded-xl shadow transition-colors cursor-pointer"
              >
                تایید و ورود به پنل ادمین
              </button>
            </form>

            <div className="mt-6 border-t border-slate-100 pt-4 text-[10px] text-slate-500 text-justify bg-slate-50 p-3 rounded-xl border border-slate-150 space-y-1.5">
              <p className="font-bold text-slate-700 text-center text-[11px]">سیستم امنیتی ورود کادر درمان بیمارستان</p>
              <p className="text-slate-400">ورود به این بخش تنها با شناسه فعال پرسنلی امکان‌پذیر است. کلیه تراکنش‌ها و فعالیت‌های کادر درمان در این سامانه ثبت و مانیتور می‌شود.</p>
            </div>

          </motion.div>
        </div>
      )}

      {/* ABOUT APP MODAL */}
      {showAboutModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center px-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white border border-slate-200 rounded-3xl p-8 max-w-lg w-full shadow-2xl relative"
          >
            {/* Close button */}
            <button
              onClick={() => setShowAboutModal(false)}
              className="absolute top-4 left-4 text-slate-400 hover:text-slate-700 cursor-pointer text-lg font-bold"
            >
              ✕
            </button>

            <div className="text-center mb-6">
              <div className="bg-blue-50 text-blue-600 p-4 rounded-2xl w-fit mx-auto mb-3">
                <Heart className="w-8 h-8 animate-pulse" />
              </div>
              <h3 className="text-xl font-black text-slate-900">درباره سامانه بیمارستان من</h3>
              <p className="text-xs text-blue-600 font-bold mt-1">تسهیل پیگیری درمان و خودمراقبتی پس از ترخیص</p>
            </div>

            <div className="space-y-4 text-slate-700 text-sm leading-relaxed text-justify mb-6">
              <p>
                این سامانه هوشمند بر اساس آخرین دستورالعمل‌های مراقبتی و خودمراقبتی مصوب تدوین شده است تا ارتباط مستمر میان بیماران ترخیصی و تیم درمانی بخش‌های مختلف بیمارستان را برقرار سازد.
              </p>
              <p>
                <strong>قابلیت‌های کلیدی سامانه:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 text-xs pr-2 text-slate-600">
                <li>دسترسی به بانک جامع اطلاعات بیماری‌ها و آموزش خودمراقبتی تخصصی بخش‌ها</li>
                <li>کارتابل اختصاصی بیمار جهت پیگیری فعال درمان، ثبت خودارزیابی و دریافت هشدار تریاژ</li>
                <li>گفتگوی مستقیم با کادر درمان بخش همراه با قابلیت ارسال و دریافت مدارک پزشکی</li>
                <li>نظرسنجی هوشمند از فرآیند بستری و غربالگری ریسک فاکتورهای سلامتی</li>
              </ul>

              <div className="border-t border-slate-100 pt-4 text-center">
                <p className="text-sm font-black text-slate-800">طراحی و توسعه : حسین نصاری</p>
                <p className="text-xs text-slate-400 mt-1">ارتباط مستقیم با طراح در تلگرام:</p>

                <a
                  href="https://t.me/ho3in925"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-[#229ED9] hover:bg-[#1d82b3] text-white font-bold px-4 py-2 rounded-xl text-xs mt-3 transition-colors shadow-sm cursor-pointer"
                >
                  <Send className="w-4 h-4 text-white" />
                  <span>پشتیبانی تلگرام: ho3in925@</span>
                </a>
              </div>
            </div>

            <button
              onClick={() => setShowAboutModal(false)}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold py-3 rounded-xl transition-colors cursor-pointer"
            >
              بستن پنجره راهنما
            </button>
          </motion.div>
        </div>
      )}

      {/* SUPABASE CLOUD DATABASE MANAGEMENT MODAL */}
      {showSupabaseModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center px-4 overflow-y-auto py-10">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white border border-slate-200 rounded-3xl p-8 max-w-2xl w-full shadow-2xl relative my-auto space-y-6"
          >
            <button
              onClick={() => setShowSupabaseModal(false)}
              className="absolute top-4 left-4 text-slate-400 hover:text-slate-700 cursor-pointer text-lg font-bold"
            >
              ✕
            </button>

            <div className="text-center">
              <div className="bg-indigo-50 text-indigo-600 p-4 rounded-2xl w-fit mx-auto mb-3">
                <Database className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-900">مدیریت پایگاه داده ابری Supabase</h3>
              <p className="text-xs text-slate-500 mt-1">
                اتصال مستقیم به پروژه ابری جهت پشتیبان‌گیری، همگام‌سازی و دسترسی همزمان از تمامی دستگاه‌ها
              </p>
            </div>

            {/* Connection Status Badge */}
            <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
              supabaseStatus.connected
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{supabaseStatus.connected ? '🟢' : '🟡'}</span>
                <div>
                  <h4 className="text-xs font-black">وضعیت اتصال پایگاه داده:</h4>
                  <p className="text-[11px] mt-0.5 opacity-90 font-mono">{supabaseStatus.message}</p>
                </div>
              </div>
              <button
                onClick={async () => {
                  setSupabaseStatus(prev => ({ ...prev, loading: true }));
                  const res = await testSupabaseConnection();
                  setSupabaseStatus({
                    connected: res.success,
                    message: res.message,
                    loading: false
                  });
                  setSupabaseActionMsg('تست اتصال انجام شد.');
                }}
                disabled={supabaseStatus.loading}
                className="bg-white/80 hover:bg-white text-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 text-[11px] font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {supabaseStatus.loading ? 'در حال بررسی...' : 'بررسی مجدد اتصال'}
              </button>
            </div>

            {/* Config details */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-600">آدرس سرور ابری (Supabase URL):</span>
                <span className="font-mono font-bold text-indigo-600 dir-ltr text-right">
                  https://fsuycchgujsdvdxjvumg.supabase.co
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-600">تعداد پرونده‌های بیماران:</span>
                <span className="font-mono font-bold text-slate-800">{patients.length} بیمار</span>
              </div>
            </div>

            {/* Action Feedback Message */}
            {supabaseActionMsg && (
              <div className="p-3 bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-xl text-xs font-bold text-center">
                {supabaseActionMsg}
              </div>
            )}

            {/* Sync / Restore Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={async () => {
                  setSupabaseActionMsg('در حال ارسال اطلاعات به سرور ابری Supabase...');
                  const res = await syncHospitalDataToSupabase(patients, messages, complaints, customChecklists);
                  setSupabaseActionMsg(res.message);
                }}
                className="flex items-center justify-center gap-2 bg-gradient-to-b from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-indigo-500/20 text-xs transition-all cursor-pointer"
              >
                <Cloud className="w-4 h-4" />
                <span>پشتیبان‌گیری و ذخیره در ابری Supabase</span>
              </button>

              <button
                onClick={async () => {
                  setSupabaseActionMsg('در حال بارگذاری اطلاعات از سرور ابری...');
                  const res = await fetchHospitalDataFromSupabase();
                  if (res.success && res.data) {
                    if (res.data.patients) {
                      setPatients(res.data.patients);
                      safeLocalStorageSet('hospital_patients', JSON.stringify(res.data.patients));
                    }
                    if (res.data.messages) {
                      setMessages(res.data.messages);
                      safeLocalStorageSet('hospital_messages', JSON.stringify(res.data.messages));
                    }
                    if (res.data.complaints) {
                      setComplaints(res.data.complaints);
                      safeLocalStorageSet('hospital_complaints', JSON.stringify(res.data.complaints));
                    }
                    if (res.data.checklists) {
                      setCustomChecklists(res.data.checklists);
                      safeLocalStorageSet('hospital_custom_checklists', JSON.stringify(res.data.checklists));
                    }
                  }
                  setSupabaseActionMsg(res.message);
                }}
                className="flex items-center justify-center gap-2 bg-gradient-to-b from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-emerald-500/20 text-xs transition-all cursor-pointer"
              >
                <Database className="w-4 h-4" />
                <span>بازیابی اطلاعات از Supabase</span>
              </button>
            </div>

            {/* SQL Setup instructions */}
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">اسکریپت SQL جهت ایجاد جدول در Supabase (در صورت نیاز):</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(getSupabaseSetupSQL());
                    setSupabaseActionMsg('کد SQL با موفقیت در کلیپ‌بورد کپی شد.');
                  }}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
                >
                  کپی کردن کد SQL
                </button>
              </div>
              <pre className="bg-slate-900 text-sky-300 p-3 rounded-xl text-[10px] font-mono overflow-x-auto max-h-32 text-left dir-ltr">
                {getSupabaseSetupSQL()}
              </pre>
            </div>

            <button
              onClick={() => setShowSupabaseModal(false)}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold py-3 rounded-xl transition-colors cursor-pointer"
            >
              بستن پنجره مدیریت Supabase
            </button>
          </motion.div>
        </div>
      )}

      {/* SURVEY & SCREENING MODAL */}
      {showSurveyModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center px-4 overflow-y-auto py-10">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white border border-slate-200 rounded-3xl p-8 max-w-xl w-full shadow-2xl relative my-auto"
          >
            {/* Close button */}
            <button
              onClick={() => setShowSurveyModal(false)}
              className="absolute top-4 left-4 text-slate-400 hover:text-slate-700 cursor-pointer text-lg font-bold"
            >
              ✕
            </button>

            <div className="text-center mb-6">
              <div className="bg-emerald-50 text-emerald-600 p-4 rounded-2xl w-fit mx-auto mb-3">
                <ClipboardList className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-900">نظرسنجی و غربالگری هوشمند ترخیص</h3>
              <p className="text-xs text-slate-500 mt-1">لطفا با تکمیل این فرم، کادر درمان را در ارزیابی و بهبود سطح مراقبت‌ها یاری رسانید.</p>
            </div>

            {surveySuccess ? (
              <div className="text-center py-10 space-y-4">
                <div className="bg-emerald-100 text-emerald-600 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto shadow-md">
                  <Check className="w-10 h-10" />
                </div>
                <h4 className="text-lg font-bold text-slate-900">سپاسگزاریم!</h4>
                <p className="text-sm text-slate-500">نظرات و پاسخ‌های غربالگری شما با موفقیت ثبت شد و در کارتابل بخش قرار گرفت.</p>
              </div>
            ) : (
              <form onSubmit={handleSumbitSurvey} className="space-y-6">

                {/* 1. Hospitalization Duration Satisfaction */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-150 space-y-3">
                  <label className="block text-sm font-bold text-slate-800">
                    ۱. میزان رضایت شما از «مدت زمان بستری» در بیمارستان چقدر است؟
                  </label>
                  <p className="text-xs text-slate-400 font-medium">آیا زمان بستری جهت بهبودی نسبی و شروع خودمراقبتی مناسب بود؟</p>
                  <div className="flex gap-2 justify-center py-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setSurveySatisfaction(star)}
                        className="p-1 hover:scale-110 transition-transform cursor-pointer"
                      >
                        <Star
                          className={`w-8 h-8 ${star <= surveySatisfaction ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`}
                        />
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 px-4">
                    <span>بسیار ناراضی</span>
                    <span>بسیار راضی</span>
                  </div>
                </div>

                {/* 2. Screening Risk Factors */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-150 space-y-4">
                  <h4 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2">
                    ۲. غربالگری ریسک‌فاکتورها و علائم هشدار (واحد پیگیری)
                  </h4>
                  <p className="text-xs text-slate-500 font-medium">لطفا سوالات زیر را جهت غربالگری شرایط فعلی سلامتی خود علامت بزنید:</p>

                  <div className="space-y-3">
                    <label className="flex items-start gap-3 p-2 bg-white rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer">
                      <input
                        type="checkbox"
                        checked={surveyFamilyHistory}
                        onChange={(e) => setSurveyFamilyHistory(e.target.checked)}
                        className="mt-1 w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-xs text-slate-700 leading-relaxed font-medium">
                        آیا در خانواده درجه یک خود سابقه بیماری‌های قلبی عروقی، چربی خون بالا یا سرطان دارید؟
                      </span>
                    </label>

                    <label className="flex items-start gap-3 p-2 bg-white rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!surveyDietAdherence}
                        onChange={(e) => setSurveyDietAdherence(!e.target.checked)}
                        className="mt-1 w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-xs text-slate-700 leading-relaxed font-medium">
                        آیا در رعایت رژیم‌های غذایی توصیه‌شده (کم‌نمک، کم‌چرب، رژیم دیابتی و...) مشکل دارید؟
                      </span>
                    </label>

                    <label className="flex items-start gap-3 p-2 bg-white rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!surveyMedAdherence}
                        onChange={(e) => setSurveyMedAdherence(!e.target.checked)}
                        className="mt-1 w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-xs text-slate-700 leading-relaxed font-medium">
                        آیا فراموشی یا عدم دسترسی به داروها مانع از مصرف دقیق و منظم نسخه ترخیص شما می‌شود؟
                      </span>
                    </label>

                    <label className="flex items-start gap-3 p-2 bg-white rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer">
                      <input
                        type="checkbox"
                        checked={surveyWoundPain}
                        onChange={(e) => setSurveyWoundPain(e.target.checked)}
                        className="mt-1 w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-xs text-slate-700 leading-relaxed text-rose-600 font-bold">
                        آیا در محل زخم، جراحی یا بخیه‌ها احساس درد فزاینده، تورم، قرمزی شدید یا ترشح دارید؟
                      </span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex-grow bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-xs shadow-md transition-colors cursor-pointer"
                  >
                    ثبت و ارسال نهایی پاسخ‌ها
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSurveyModal(false)}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-5 py-3 rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    انصراف
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}

      {/* 2. PATIENT CUSTOM SELF-CARE CHECKLIST FILLING MODAL */}
      {activeFillingChecklist && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center px-4 overflow-y-auto py-10 text-right">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white border border-slate-200 rounded-3xl p-6 max-w-xl w-full shadow-2xl relative my-auto max-h-[90vh] overflow-y-auto custom-scrollbar"
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => {
                setActiveFillingChecklist(null);
                setPatientChecklistAnswers({});
              }}
              className="absolute top-4 left-4 text-slate-400 hover:text-slate-700 cursor-pointer text-lg font-bold"
            >
              ✕
            </button>

            <div className="text-center mb-6">
              <div className="bg-emerald-50 text-emerald-600 p-3.5 rounded-2xl w-fit mx-auto mb-3">
                <HeartHandshake className="w-8 h-8 mx-auto" />
              </div>
              <h3 className="text-base font-black text-slate-900">{activeFillingChecklist.title}</h3>
              <p className="text-xs text-slate-500 mt-1">مددجوی گرامی، لطفاً جهت پایش وضعیت سلامت خود در منزل، به سوالات زیر پاسخ دهید:</p>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (!currentUser || !activeFillingChecklist) return;

              const submission: PatientChecklistAnswer = {
                checklistId: activeFillingChecklist.id,
                answers: patientChecklistAnswers,
                submittedAt: new Date().toISOString()
              };

              const updatedPatients = patients.map(p => {
                if (p.nationalId === currentUser.nationalId) {
                  const oldSubs = p.checklistSubmissions || [];
                  return {
                    ...p,
                    checklistSubmissions: [...oldSubs, submission]
                  };
                }
                return p;
              });

              savePatients(updatedPatients);
              const updatedUser = updatedPatients.find(p => p.nationalId === currentUser.nationalId);
              if (updatedUser) {
                setCurrentUser(updatedUser);
              }

              setFeedbackSuccessMsg("پاسخ‌های چک‌لیست خودمراقبتی شما با موفقیت ثبت شد.");
              setTimeout(() => {
                setFeedbackSuccessMsg("");
                setActiveFillingChecklist(null);
                setPatientChecklistAnswers({});
              }, 2000);
            }} className="space-y-6">
              {feedbackSuccessMsg ? (
                <div className="text-center py-8 space-y-3">
                  <div className="bg-emerald-100 text-emerald-600 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto shadow-sm">
                    <Check className="w-8 h-8 animate-pulse" />
                  </div>
                  <h4 className="text-base font-bold text-slate-900">ثبت موفقیت‌آمیز!</h4>
                  <p className="text-xs text-slate-500">{feedbackSuccessMsg}</p>
                </div>
              ) : (
                <>
                  <div className="space-y-5">
                    {activeFillingChecklist.questions.map((q, idx) => {
                      const answer = patientChecklistAnswers[q.id] || '';
                      const setAnswer = (val: any) => {
                        setPatientChecklistAnswers(prev => ({ ...prev, [q.id]: val }));
                      };

                      return (
                        <div key={q.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-150 space-y-3">
                          <label className="block text-xs font-black text-slate-800 leading-relaxed">
                            {idx + 1}. {q.text}
                          </label>

                          {/* Render input based on question type */}
                          {q.type === 'qualitative' && (
                            <div className="grid grid-cols-3 gap-2">
                              {(q.options && q.options.length > 0 ? q.options : ['خوب', 'متوسط', 'ضعیف']).map(opt => (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => setAnswer(opt)}
                                  className={`py-2 px-3 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                                    answer === opt
                                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-md'
                                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                  }`}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          )}

                          {q.type === 'quantitative' && (
                            <input
                              type="number"
                              required
                              placeholder="مقدار عددی را وارد نمایید (مثال: ۳۷.۵)"
                              value={answer}
                              onChange={(e) => setAnswer(e.target.value)}
                              className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400 font-bold"
                            />
                          )}

                          {q.type === 'multiple_choice' && (
                            <div className="grid grid-cols-2 gap-2">
                              {(q.options || []).map(opt => (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => setAnswer(opt)}
                                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer truncate ${
                                    answer === opt
                                      ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                  }`}
                                  title={opt}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          )}

                          {q.type === 'emoji' && (
                            <div className="flex justify-around py-1 bg-white border border-slate-200 rounded-xl">
                              {['😞', '😐', '🙂', '😊', '🤩'].map(emoji => (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() => setAnswer(emoji)}
                                  className={`text-2xl p-2 rounded-full transition-transform hover:scale-125 cursor-pointer ${
                                    answer === emoji ? 'bg-amber-100 scale-110' : ''
                                  }`}
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          )}

                          {q.type === 'descriptive' && (
                            <textarea
                              placeholder="توضیحات خود را بنویسید..."
                              value={answer}
                              onChange={(e) => setAnswer(e.target.value)}
                              rows={2}
                              className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400 font-bold resize-none"
                            />
                          )}

                          {q.type === 'hybrid' && (
                            <div className="space-y-3">
                              {/* Part 1 */}
                              {q.hybridType1 === 'qualitative' && (
                                <div className="grid grid-cols-3 gap-2">
                                  {(q.options || ['خوب', 'متوسط', 'ضعیف']).map(opt => {
                                    const part1Val = answer.part1 || '';
                                    return (
                                      <button
                                        key={opt}
                                        type="button"
                                        onClick={() => setAnswer({ ...answer, part1: opt })}
                                        className={`py-1.5 px-2 rounded-xl text-[10px] font-black border transition-all cursor-pointer ${
                                          part1Val === opt
                                            ? 'bg-emerald-600 border-emerald-600 text-white'
                                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                        }`}
                                      >
                                        {opt}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                              {q.hybridType1 === 'quantitative' && (
                                <input
                                  type="number"
                                  placeholder="مقدار عددی..."
                                  value={answer.part1 || ''}
                                  onChange={(e) => setAnswer({ ...answer, part1: e.target.value })}
                                  className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400 font-bold"
                                />
                              )}
                              {q.hybridType1 === 'multiple_choice' && (
                                <div className="grid grid-cols-2 gap-2">
                                  {(q.options || []).map(opt => {
                                    const part1Val = answer.part1 || '';
                                    return (
                                      <button
                                        key={opt}
                                        type="button"
                                        onClick={() => setAnswer({ ...answer, part1: opt })}
                                        className={`py-1.5 px-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer truncate ${
                                          part1Val === opt
                                            ? 'bg-blue-600 border-blue-600 text-white'
                                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                        }`}
                                        title={opt}
                                      >
                                        {opt}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                              {q.hybridType1 === 'emoji' && (
                                <div className="flex justify-around py-1 bg-white border border-slate-200 rounded-xl">
                                  {['😞', '😐', '🙂', '😊', '🤩'].map(emoji => {
                                    const part1Val = answer.part1 || '';
                                    return (
                                      <button
                                        key={emoji}
                                        type="button"
                                        onClick={() => setAnswer({ ...answer, part1: emoji })}
                                        className={`text-xl p-1 rounded-full transition-transform hover:scale-125 cursor-pointer ${
                                          part1Val === emoji ? 'bg-amber-100 scale-110' : ''
                                        }`}
                                      >
                                        {emoji}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Part 2: Descriptive */}
                              <textarea
                                placeholder="توضیحات تکمیلی (اختیاری)..."
                                value={answer.part2 || ''}
                                onChange={(e) => setAnswer({ ...answer, part2: e.target.value })}
                                rows={1.5}
                                className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-1.5 outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400 font-bold resize-none"
                              />
                            </div>
                          )}

                        </div>
                      );
                    })}
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      className="flex-grow bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-xl text-xs shadow-md transition-colors cursor-pointer"
                    >
                      ثبت و ارسال نهایی خودارزیابی
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveFillingChecklist(null);
                        setPatientChecklistAnswers({});
                      }}
                      className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-5 py-3 rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      انصراف
                    </button>
                  </div>
                </>
              )}
            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
}

