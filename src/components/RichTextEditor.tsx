import React, { useRef, useEffect, useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  AlignRight,
  AlignCenter,
  AlignLeft,
  AlignJustify,
  Palette,
  Highlighter,
  Type,
  RemoveFormatting,
  AlertCircle,
  ChevronDown,
  Check
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  theme?: 'dark' | 'light';
  label?: string;
}

const PRESET_COLORS = [
  { name: 'سفید / روشن', value: '#ffffff' },
  { name: 'مشکی / تیره', value: '#0f172a' },
  { name: 'آبی آسمانی', value: '#38bdf8' },
  { name: 'آبی سرمه‌ای', value: '#2563eb' },
  { name: 'سبز زمردی', value: '#10b981' },
  { name: 'قرمز هشدار', value: '#ef4444' },
  { name: 'زرد طلایی', value: '#f59e0b' },
  { name: 'بنفش ارغوانی', value: '#a855f7' },
  { name: 'صورتی', value: '#ec4899' },
  { name: 'نارنجی', value: '#f97316' },
  { name: 'خاکستری', value: '#94a3b8' },
  { name: 'فیروزه‌ای', value: '#14b8a6' },
];

const PRESET_HIGHLIGHTS = [
  { name: 'بدون هایلایت (حذف)', value: 'transparent' },
  { name: 'زرد فسفری', value: '#fef08a' },
  { name: 'سبز روشن', value: '#bbf7d0' },
  { name: 'آبی روشن', value: '#bfdbfe' },
  { name: 'قرمز صورتی', value: '#fecdd3' },
  { name: 'بنفش روشن', value: '#e9d5ff' },
  { name: 'نارنجی روشن', value: '#fed7aa' },
];

const PRESET_SIZES = [
  { label: 'متن کوچک (12px)', command: '1' },
  { label: 'متن معمولی (16px)', command: '3' },
  { label: 'متن بزرگ (18px)', command: '4' },
  { label: 'خیلی بزرگ (24px)', command: '5' },
  { label: 'عنوان / برجسته (32px)', command: '6' },
];

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'متن خود را وارد کنید...',
  minHeight = '180px',
  theme = 'dark',
  label
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showSizePicker, setShowSizePicker] = useState(false);
  const [customColor, setCustomColor] = useState('#38bdf8');
  const isInternalChange = useRef(false);

  // Sync external value changes into contentEditable div
  useEffect(() => {
    if (editorRef.current && !isInternalChange.current) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || '';
      }
    }
    isInternalChange.current = false;
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      isInternalChange.current = true;
      onChange(editorRef.current.innerHTML);
    }
  };

  const execCmd = (command: string, arg: string | undefined = undefined) => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand(command, false, arg);
    handleInput();
  };

  const applyTextColor = (color: string) => {
    execCmd('foreColor', color);
    setShowColorPicker(false);
  };

  const applyHighlightColor = (color: string) => {
    execCmd('hiliteColor', color);
    setShowHighlightPicker(false);
  };

  const applyFontSize = (sizeCmd: string) => {
    execCmd('fontSize', sizeCmd);
    setShowSizePicker(false);
  };

  const insertCustomAlertBox = () => {
    const alertHtml = `<div style="padding: 12px 16px; margin: 10px 0; background-color: rgba(245, 158, 11, 0.15); border-right: 4px solid #f59e0b; border-radius: 12px; font-weight: bold; color: inherit;">⚠️ نکته مهم: متن راهنما یا هشدار را در این قسمت وارد کنید</div>&nbsp;`;
    execCmd('insertHTML', alertHtml);
  };

  const closeAllPopups = () => {
    setShowColorPicker(false);
    setShowHighlightPicker(false);
    setShowSizePicker(false);
  };

  const isDark = theme === 'dark';

  return (
    <div className="w-full text-right space-y-1.5 font-sans relative">
      {label && (
        <label className={`block text-[11px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          {label}
        </label>
      )}

      {/* Backdrop overlay for closing dropdown popups cleanly */}
      {(showColorPicker || showHighlightPicker || showSizePicker) && (
        <div 
          className="fixed inset-0 z-40 bg-black/5" 
          onClick={closeAllPopups} 
        />
      )}

      <div
        className={`rounded-2xl border transition-all relative z-10 ${
          isDark
            ? 'bg-[#0f1422] border-white/15 focus-within:border-sky-400/60 shadow-lg'
            : 'bg-white border-slate-300 focus-within:border-indigo-500 shadow-sm'
        }`}
      >
        {/* Toolbar - Relative & Overflow Visible so dropdowns pop out smoothly */}
        <div
          className={`flex items-center gap-1.5 p-2 rounded-t-2xl border-b flex-wrap select-none text-xs relative z-50 ${
            isDark ? 'bg-slate-900 border-white/10 text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-700'
          }`}
        >
          {/* Bold */}
          <button
            type="button"
            title="درشت (Bold)"
            onClick={() => execCmd('bold')}
            className={`p-2 rounded-xl transition-all cursor-pointer font-bold ${
              isDark ? 'hover:bg-white/15 text-white' : 'hover:bg-slate-200 text-slate-900'
            }`}
          >
            <Bold className="w-4 h-4" />
          </button>

          {/* Italic */}
          <button
            type="button"
            title="مورب (Italic)"
            onClick={() => execCmd('italic')}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              isDark ? 'hover:bg-white/15 text-white' : 'hover:bg-slate-200 text-slate-900'
            }`}
          >
            <Italic className="w-4 h-4" />
          </button>

          {/* Underline */}
          <button
            type="button"
            title="زیرخط (Underline)"
            onClick={() => execCmd('underline')}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              isDark ? 'hover:bg-white/15 text-white' : 'hover:bg-slate-200 text-slate-900'
            }`}
          >
            <Underline className="w-4 h-4" />
          </button>

          {/* Strikethrough */}
          <button
            type="button"
            title="خط خورده (Strikethrough)"
            onClick={() => execCmd('strikeThrough')}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              isDark ? 'hover:bg-white/15 text-white' : 'hover:bg-slate-200 text-slate-900'
            }`}
          >
            <Strikethrough className="w-4 h-4" />
          </button>

          <span className={`h-5 w-[1px] mx-0.5 ${isDark ? 'bg-white/15' : 'bg-slate-300'}`} />

          {/* Font Size Dropdown */}
          <div className="relative">
            <button
              type="button"
              title="اندازه متن (Font Size)"
              onClick={() => {
                setShowSizePicker(!showSizePicker);
                setShowColorPicker(false);
                setShowHighlightPicker(false);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer font-bold border ${
                showSizePicker
                  ? isDark ? 'bg-sky-500/20 text-sky-300 border-sky-400/50' : 'bg-indigo-100 text-indigo-700 border-indigo-300'
                  : isDark ? 'hover:bg-white/10 border-white/10' : 'hover:bg-slate-200 border-slate-300'
              }`}
            >
              <Type className="w-4 h-4 text-sky-400" />
              <span className="text-[11px]">سایز</span>
              <ChevronDown className="w-3 h-3 opacity-70" />
            </button>

            {showSizePicker && (
              <div
                className={`absolute right-0 top-full mt-2 z-50 p-2 rounded-2xl shadow-2xl border w-44 space-y-1 ${
                  isDark ? 'bg-slate-900 border-slate-700 text-white shadow-black/80' : 'bg-white border-slate-300 text-slate-800 shadow-xl'
                }`}
              >
                <div className="text-[10px] font-bold text-slate-400 mb-1 px-2 border-b border-slate-700/50 pb-1">
                  سایز قلم متن:
                </div>
                {PRESET_SIZES.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyFontSize(s.command)}
                    className={`w-full text-right px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer block ${
                      isDark ? 'hover:bg-sky-500/20 hover:text-sky-300' : 'hover:bg-indigo-50 hover:text-indigo-700'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Text Color Picker */}
          <div className="relative">
            <button
              type="button"
              title="تغییر رنگ متن (Text Color)"
              onClick={() => {
                setShowColorPicker(!showColorPicker);
                setShowHighlightPicker(false);
                setShowSizePicker(false);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer font-bold border ${
                showColorPicker
                  ? isDark ? 'bg-sky-500/20 text-sky-300 border-sky-400/50' : 'bg-indigo-100 text-indigo-700 border-indigo-300'
                  : isDark ? 'hover:bg-white/10 border-white/10' : 'hover:bg-slate-200 border-slate-300'
              }`}
            >
              <Palette className="w-4 h-4 text-rose-400" />
              <span className="text-[11px]">رنگ متن</span>
              <ChevronDown className="w-3 h-3 opacity-70" />
            </button>

            {showColorPicker && (
              <div
                className={`absolute right-0 top-full mt-2 z-50 p-3 rounded-2xl shadow-2xl border w-60 space-y-2.5 ${
                  isDark ? 'bg-slate-900 border-slate-700 text-white shadow-black/80' : 'bg-white border-slate-300 text-slate-800 shadow-xl'
                }`}
              >
                <div className="text-[11px] font-black text-sky-400 border-b border-slate-700/60 pb-1 px-1 flex items-center justify-between">
                  <span>پالت رنگ‌های پیشنهادی:</span>
                </div>
                
                {/* Colors Grid */}
                <div className="grid grid-cols-4 gap-2 p-1 bg-slate-950/40 rounded-xl border border-white/5">
                  {PRESET_COLORS.map((c, idx) => (
                    <button
                      key={idx}
                      type="button"
                      title={c.name}
                      onClick={() => applyTextColor(c.value)}
                      className="w-10 h-10 rounded-xl border border-white/20 flex items-center justify-center cursor-pointer hover:scale-110 hover:shadow-md transition-all relative group"
                      style={{ backgroundColor: c.value }}
                    >
                      <span className="sr-only">{c.name}</span>
                    </button>
                  ))}
                </div>

                {/* Custom Color Input */}
                <div className="pt-1 border-t border-slate-700/60 flex items-center justify-between gap-2 px-1">
                  <span className="text-[11px] font-bold text-slate-300">رنگ دلخواه:</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={customColor}
                      onChange={(e) => setCustomColor(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => applyTextColor(customColor)}
                      className="px-2.5 py-1 bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-lg text-[10px] font-black cursor-pointer transition-all"
                    >
                      اعمال
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Background Highlight Picker */}
          <div className="relative">
            <button
              type="button"
              title="هایلایت زمینه متن (Background Highlight)"
              onClick={() => {
                setShowHighlightPicker(!showHighlightPicker);
                setShowColorPicker(false);
                setShowSizePicker(false);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer font-bold border ${
                showHighlightPicker
                  ? isDark ? 'bg-sky-500/20 text-sky-300 border-sky-400/50' : 'bg-indigo-100 text-indigo-700 border-indigo-300'
                  : isDark ? 'hover:bg-white/10 border-white/10' : 'hover:bg-slate-200 border-slate-300'
              }`}
            >
              <Highlighter className="w-4 h-4 text-amber-400" />
              <span className="text-[11px]">هایلایت</span>
              <ChevronDown className="w-3 h-3 opacity-70" />
            </button>

            {showHighlightPicker && (
              <div
                className={`absolute right-0 top-full mt-2 z-50 p-3 rounded-2xl shadow-2xl border w-56 space-y-1.5 ${
                  isDark ? 'bg-slate-900 border-slate-700 text-white shadow-black/80' : 'bg-white border-slate-300 text-slate-800 shadow-xl'
                }`}
              >
                <div className="text-[11px] font-black text-amber-400 border-b border-slate-700/60 pb-1 px-1">
                  انتخاب رنگ هایلایت:
                </div>
                {PRESET_HIGHLIGHTS.map((h, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyHighlightColor(h.value)}
                    className={`w-full text-right px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2.5 ${
                      isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'
                    }`}
                  >
                    <span
                      className="w-5 h-5 rounded-lg border border-slate-400/40 shrink-0 shadow-sm"
                      style={{ backgroundColor: h.value === 'transparent' ? 'transparent' : h.value }}
                    />
                    <span className={h.value === 'transparent' ? 'text-rose-400' : 'text-inherit'}>
                      {h.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <span className={`h-5 w-[1px] mx-0.5 ${isDark ? 'bg-white/15' : 'bg-slate-300'}`} />

          {/* Bullet List */}
          <button
            type="button"
            title="لیست نقطه‌ای (Bullet List)"
            onClick={() => execCmd('insertUnorderedList')}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              isDark ? 'hover:bg-white/15 text-white' : 'hover:bg-slate-200 text-slate-900'
            }`}
          >
            <List className="w-4 h-4" />
          </button>

          {/* Numbered List */}
          <button
            type="button"
            title="لیست عددی (Numbered List)"
            onClick={() => execCmd('insertOrderedList')}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              isDark ? 'hover:bg-white/15 text-white' : 'hover:bg-slate-200 text-slate-900'
            }`}
          >
            <ListOrdered className="w-4 h-4" />
          </button>

          <span className={`h-5 w-[1px] mx-0.5 ${isDark ? 'bg-white/15' : 'bg-slate-300'}`} />

          {/* Alignment Controls */}
          <button
            type="button"
            title="راست‌چین (Right Align)"
            onClick={() => execCmd('justifyRight')}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              isDark ? 'hover:bg-white/15 text-white' : 'hover:bg-slate-200 text-slate-900'
            }`}
          >
            <AlignRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            title="وسط‌چین (Center Align)"
            onClick={() => execCmd('justifyCenter')}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              isDark ? 'hover:bg-white/15 text-white' : 'hover:bg-slate-200 text-slate-900'
            }`}
          >
            <AlignCenter className="w-4 h-4" />
          </button>

          <button
            type="button"
            title="چپ‌چین (Left Align)"
            onClick={() => execCmd('justifyLeft')}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              isDark ? 'hover:bg-white/15 text-white' : 'hover:bg-slate-200 text-slate-900'
            }`}
          >
            <AlignLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            title="تراز (Justify)"
            onClick={() => execCmd('justifyFull')}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              isDark ? 'hover:bg-white/15 text-white' : 'hover:bg-slate-200 text-slate-900'
            }`}
          >
            <AlignJustify className="w-4 h-4" />
          </button>

          <span className={`h-5 w-[1px] mx-0.5 ${isDark ? 'bg-white/15' : 'bg-slate-300'}`} />

          {/* Insert Alert Box */}
          <button
            type="button"
            title="افزودن کادر هشدار / نکته مهم"
            onClick={insertCustomAlertBox}
            className={`px-2.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 text-[11px] font-bold ${
              isDark ? 'hover:bg-amber-500/20 text-amber-400 bg-amber-500/10' : 'hover:bg-amber-100 text-amber-800 bg-amber-50'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>باکس نکته</span>
          </button>

          {/* Remove formatting */}
          <button
            type="button"
            title="پاک کردن استایل و فرمت متن"
            onClick={() => execCmd('removeFormat')}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              isDark ? 'hover:bg-rose-500/20 text-rose-400' : 'hover:bg-rose-100 text-rose-800'
            }`}
          >
            <RemoveFormatting className="w-4 h-4" />
          </button>
        </div>

        {/* Editor Editable Area */}
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onBlur={handleInput}
          dir="rtl"
          style={{ minHeight }}
          data-placeholder={placeholder}
          className={`w-full p-4 outline-none font-bold leading-relaxed text-right transition-all rounded-b-2xl overflow-y-auto ${
            isDark ? 'text-slate-100 focus:bg-white/[0.02]' : 'text-slate-900 focus:bg-slate-50/50'
          } empty:before:content-[attr(data-placeholder)] empty:before:text-slate-500 empty:before:pointer-events-none empty:before:font-normal`}
        />
      </div>
    </div>
  );
};

export default RichTextEditor;
