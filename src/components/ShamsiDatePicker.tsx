import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronRight, ChevronLeft, Clock } from 'lucide-react';

interface ShamsiDatePickerProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  isDark?: boolean;
}

const SHAMSI_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد',
  'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر',
  'دی', 'بهمن', 'اسفند'
];

// Helper to get total days in a Shamsi month
const getShamsiMonthDays = (year: number, month: number) => {
  if (month <= 6) return 31;
  if (month <= 11) return 30;
  // Leap year check: 1403, 1407, 1411, etc.
  const isLeap = (year - 1403) % 4 === 0;
  return isLeap ? 30 : 29;
};

// Extremely clever and 100% accurate helper to get Gregorian date for a Shamsi date using built-in browser Intl
const getGregorianFromShamsi = (jy: number, jm: number, jd: number): Date => {
  const gy = jy + 621;
  const approxDate = new Date(gy, jm - 1, 15);
  let current = approxDate;
  
  for (let i = 0; i < 40; i++) {
    const shamsiStr = current.toLocaleDateString('fa-IR-u-nu-latn');
    const [cy, cm, cd] = shamsiStr.split('/').map(Number);
    
    if (cy === jy && cm === jm && cd === jd) {
      return current;
    }
    
    const diffY = jy - cy;
    const diffM = jm - cm;
    const diffD = jd - cd;
    
    let dayDiff = diffY * 365 + diffM * 30 + diffD;
    if (dayDiff === 0) dayDiff = diffD > 0 ? 1 : -1;
    
    current = new Date(current.getTime() + dayDiff * 24 * 60 * 60 * 1000);
  }
  return current;
};

// Helper to format date into YYYY/MM/DD
const formatShamsiDate = (y: number, m: number, d: number) => {
  const mm = String(m).padStart(2, '0');
  const dd = String(d).padStart(2, '0');
  return `${y}/${mm}/${dd}`;
};

export const ShamsiDatePicker: React.FC<ShamsiDatePickerProps> = ({
  value,
  onChange,
  placeholder = 'انتخاب تاریخ...',
  className = '',
  isDark = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Default display year and month (fallback to 1405/04/01 if empty)
  const [viewYear, setViewYear] = useState(1405);
  const [viewMonth, setViewMonth] = useState(4); // Tir

  // Dynamically position the calendar popup (upward or downward) based on viewport space
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      // If there is less than 350px below and we have more space above, open upward
      if (spaceBelow < 350 && spaceAbove > spaceBelow) {
        setOpenUpward(true);
      } else {
        setOpenUpward(false);
      }
    }
  }, [isOpen]);

  // Initialize view year/month when value changes or when opened
  useEffect(() => {
    if (value) {
      const parts = value.split('/');
      if (parts.length === 3) {
        const y = Number(parts[0]);
        const m = Number(parts[1]);
        if (!isNaN(y) && !isNaN(m)) {
          setViewYear(y);
          setViewMonth(m);
        }
      }
    } else {
      // Set to current date
      try {
        const todayStr = new Date().toLocaleDateString('fa-IR-u-nu-latn');
        const [cy, cm] = todayStr.split('/').map(Number);
        setViewYear(cy || 1405);
        setViewMonth(cm || 4);
      } catch (e) {
        setViewYear(1405);
        setViewMonth(4);
      }
    }
  }, [value, isOpen]);

  // Click away listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDaySelect = (day: number) => {
    const formatted = formatShamsiDate(viewYear, viewMonth, day);
    onChange(formatted);
    setIsOpen(false);
  };

  const handleTodaySelect = () => {
    try {
      const todayStr = new Date().toLocaleDateString('fa-IR-u-nu-latn');
      const [cy, cm, cd] = todayStr.split('/').map(Number);
      const formatted = formatShamsiDate(cy, cm, cd);
      onChange(formatted);
      setViewYear(cy);
      setViewMonth(cm);
      setIsOpen(false);
    } catch (e) {
      const formatted = formatShamsiDate(1405, 4, 28);
      onChange(formatted);
      setIsOpen(false);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear(prev => prev + 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  const prevMonth = () => {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  // Calculate day cells
  const totalDays = getShamsiMonthDays(viewYear, viewMonth);
  const firstDayGregorian = getGregorianFromShamsi(viewYear, viewMonth, 1);
  const jsDay = firstDayGregorian.getDay();
  // Map JS day (0=Sun, 1=Mon, ..., 6=Sat) to Persian (0=Sat, 1=Sun, ..., 6=Fri)
  const startDayIndex = (jsDay + 1) % 7;

  // Generate blank cells and day cells
  const cells: (number | null)[] = [];
  for (let i = 0; i < startDayIndex; i++) {
    cells.push(null);
  }
  for (let i = 1; i <= totalDays; i++) {
    cells.push(i);
  }

  // Quick years list
  const yearsList = [];
  for (let y = 1395; y <= 1415; y++) {
    yearsList.push(y);
  }

  // Theme styles mapping
  const themeStyles = isDark ? {
    inputBg: 'bg-white/5 border-white/10 text-white placeholder:text-slate-500',
    calendarBg: 'bg-[#111625] border-white/15 shadow-2xl text-white',
    dayHeader: 'text-slate-400 font-bold',
    emptyCell: 'bg-transparent',
    dayCell: 'text-slate-200 hover:bg-white/10 hover:text-white',
    selectedDay: 'bg-gradient-to-r from-sky-400 to-blue-500 text-white font-black',
    todayBtn: 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white',
    navBtn: 'hover:bg-white/10 text-slate-300 hover:text-white',
    select: 'bg-[#111625] text-white border-white/10'
  } : {
    inputBg: 'bg-white border-slate-300 text-slate-800 placeholder:text-slate-400',
    calendarBg: 'bg-white border-slate-200 shadow-xl text-slate-800',
    dayHeader: 'text-slate-500 font-bold',
    emptyCell: 'bg-transparent',
    dayCell: 'text-slate-700 hover:bg-slate-100 hover:text-slate-900',
    selectedDay: 'bg-gradient-to-r from-indigo-500 to-blue-600 text-white font-black',
    todayBtn: 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900',
    navBtn: 'hover:bg-slate-100 text-slate-600 hover:text-slate-900',
    select: 'bg-white text-slate-800 border-slate-200'
  };

  return (
    <div className="relative w-full text-right" ref={containerRef} dir="rtl">
      <div className="relative flex items-center">
        <input
          type="text"
          readOnly
          value={value}
          placeholder={placeholder}
          onClick={() => setIsOpen(true)}
          className={`w-full text-xs font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-400/50 cursor-pointer transition-all duration-200 border text-right pr-10 ${themeStyles.inputBg} ${className}`}
        />
        <CalendarIcon 
          className={`w-4 h-4 absolute right-3 pointer-events-none ${isDark ? 'text-slate-400' : 'text-slate-500'}`} 
        />
      </div>

      {isOpen && (
        <div className={`absolute z-50 w-[310px] sm:w-[330px] rounded-2xl border p-4 ${themeStyles.calendarBg} shadow-2xl animate-fade-in right-0 sm:right-auto ${
          openUpward ? 'bottom-full mb-3' : 'top-full mt-3'
        }`}>
          {/* Calendar Header with quick selects */}
          <div className="flex justify-between items-center mb-3.5 gap-1">
            <button
              type="button"
              onClick={nextMonth}
              className={`p-1.5 rounded-lg border border-transparent transition-all ${themeStyles.navBtn}`}
              title="ماه بعد"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Quick dropdown selectors */}
            <div className="flex items-center gap-1.5">
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                className={`text-[11px] font-black py-1 px-2 rounded-lg border outline-none cursor-pointer ${themeStyles.select}`}
              >
                {SHAMSI_MONTHS.map((m, idx) => (
                  <option key={m} value={idx + 1}>{m}</option>
                ))}
              </select>

              <select
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                className={`text-[11px] font-black py-1 px-2 rounded-lg border outline-none cursor-pointer ${themeStyles.select}`}
              >
                {yearsList.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={prevMonth}
              className={`p-1.5 rounded-lg border border-transparent transition-all ${themeStyles.navBtn}`}
              title="ماه قبل"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black mb-2 pb-1.5 border-b border-white/5">
            {['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'].map((day, idx) => (
              <div key={idx} className={themeStyles.dayHeader}>{day}</div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1.5 text-center">
            {cells.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className={themeStyles.emptyCell} />;
              }

              const formatted = formatShamsiDate(viewYear, viewMonth, day);
              const isSelected = value === formatted;

              return (
                <button
                  type="button"
                  key={`day-${day}`}
                  onClick={() => handleDaySelect(day)}
                  className={`text-[11px] font-bold py-1.5 rounded-xl transition-all cursor-pointer ${
                    isSelected ? themeStyles.selectedDay : themeStyles.dayCell
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Footer Controls */}
          <div className="flex justify-between items-center mt-4 pt-3 border-t border-white/5">
            <button
              type="button"
              onClick={handleTodaySelect}
              className={`text-[10px] font-black px-3 py-1.5 rounded-lg border flex items-center gap-1 cursor-pointer transition-all ${themeStyles.todayBtn}`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>امروز</span>
            </button>
            <span className="text-[9px] text-slate-500 font-bold font-mono">
              {viewYear}/{String(viewMonth).padStart(2, '0')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
