import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp, Check, Search } from 'lucide-react';

interface DropdownItem {
  id: string;
  name: string;
  subtext?: string;
}

interface MultiSelectDropdownProps {
  label: string;
  placeholder: string;
  searchValue: string;
  onSearchChange: (val: string) => void;
  items: DropdownItem[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  accentColor?: 'sky' | 'emerald';
}

export const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  label,
  placeholder,
  searchValue,
  onSearchChange,
  items,
  selectedIds,
  onToggle,
  accentColor = 'sky'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [openUpward, setOpenUpward] = useState(false);

  // Click away listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Dynamically calculate opening direction based on space below
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      // If remaining vertical space below is less than 260px, open upwards
      if (spaceBelow < 260 && rect.top > spaceBelow) {
        setOpenUpward(true);
      } else {
        setOpenUpward(false);
      }
    }
  }, [isOpen]);

  const isAccentSky = accentColor === 'sky';

  return (
    <div className="relative w-full text-right" ref={containerRef} dir="rtl">
      <label className="block text-xs font-black text-slate-300 mb-2">{label}</label>
      
      {/* Search and Toggle Bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-grow flex items-center">
          <input
            type="text"
            placeholder={placeholder}
            value={searchValue}
            onChange={(e) => {
              onSearchChange(e.target.value);
              setIsOpen(true); // Auto open on search
            }}
            className="w-full text-xs bg-[#111625] border border-white/15 text-white placeholder:text-slate-500 rounded-xl pl-4 pr-10 py-2.5 outline-none focus:ring-1 focus:ring-sky-500/50 font-bold text-right"
          />
          <Search className="w-4 h-4 text-slate-500 absolute right-3 pointer-events-none" />
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`shrink-0 flex items-center justify-between gap-3 text-xs font-black px-4 py-2.5 rounded-xl border border-white/10 transition-all cursor-pointer ${
            isAccentSky 
              ? 'bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 hover:text-sky-300' 
              : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300'
          }`}
        >
          <span>
            {selectedIds.length === 0 
              ? 'هیچکدام انتخاب نشده' 
              : `${selectedIds.length} مورد انتخاب شده`}
          </span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Dropdown List */}
      {isOpen && (
        <div className={`absolute z-40 w-full bg-[#111625] border border-white/15 rounded-2xl p-2 shadow-2xl max-h-56 overflow-y-auto animate-fade-in divide-y divide-white/5 scrollbar-thin ${
          openUpward ? 'bottom-full mb-2' : 'top-full mt-1.5'
        }`}>
          {items.map(item => {
            const isChecked = selectedIds.includes(item.id);
            return (
              <button
                type="button"
                key={item.id}
                onClick={() => onToggle(item.id)}
                className="w-full flex items-center justify-between text-right px-3 py-2.5 hover:bg-white/5 rounded-xl transition-all text-xs font-bold text-slate-300 hover:text-white cursor-pointer"
              >
                <div className="flex flex-col">
                  <span className="font-bold">{item.name}</span>
                  {item.subtext && (
                    <span className="text-[10px] text-slate-400 font-normal mt-0.5">{item.subtext}</span>
                  )}
                </div>

                <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                  isChecked 
                    ? isAccentSky
                      ? 'bg-sky-500 border-sky-400 text-white'
                      : 'bg-emerald-500 border-emerald-400 text-white'
                    : 'border-white/20 bg-transparent'
                }`}>
                  {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </button>
            );
          })}

          {items.length === 0 && (
            <p className="text-center text-xs text-slate-500 font-bold py-4">موردی یافت نشد.</p>
          )}
        </div>
      )}
    </div>
  );
};
