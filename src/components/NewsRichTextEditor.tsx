import React, { useState, useRef, useEffect } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Link as LinkIcon,
  Unlink,
  Palette,
  Type,
  List,
  ListOrdered,
  RemoveFormatting,
  Eye,
  Code,
  Sparkles,
  Check,
  X
} from 'lucide-react';

interface NewsRichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const COLORS = [
  { name: 'مشکی (پیش‌فرض)', hex: '#1e293b' },
  { name: 'قرمز مهم', hex: '#ef4444' },
  { name: 'آبی بیمارستانی', hex: '#2563eb' },
  { name: 'سبز موفقیت', hex: '#16a34a' },
  { name: 'نارنجی هشدار', hex: '#d97706' },
  { name: 'بنفش ویژه', hex: '#9333ea' },
  { name: 'فیروزه‌ای', hex: '#0891b2' },
  { name: 'خاکستری ملایم', hex: '#64748b' },
];

const FONT_SIZES = [
  { label: 'کوچک (13px)', size: '1', cssSize: '13px' },
  { label: 'عادی (16px - پیش‌فرض)', size: '3', cssSize: '16px' },
  { label: 'بزرگ (18px)', size: '4', cssSize: '18px' },
  { label: 'تیتر بزرگ (22px)', size: '6', cssSize: '22px' },
];

export const NewsRichTextEditor: React.FC<NewsRichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'شرح کامل و توضیحات خبر را اینجا بنویسید...'
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [showColorPalette, setShowColorPalette] = useState(false);
  const [showSizeMenu, setShowSizeMenu] = useState(false);
  const [savedRange, setSavedRange] = useState<Range | null>(null);

  // Sync value to editor only when editor is not focused or initial load
  useEffect(() => {
    if (editorRef.current && document.activeElement !== editorRef.current) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || '';
      }
    }
  }, [value]);

  const saveSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      setSavedRange(selection.getRangeAt(0));
    }
  };

  const restoreSelection = () => {
    const selection = window.getSelection();
    if (selection && savedRange) {
      selection.removeAllRanges();
      selection.addRange(savedRange);
    }
  };

  const execCmd = (command: string, arg: string | undefined = undefined) => {
    if (isHtmlMode) return;
    editorRef.current?.focus();
    document.execCommand(command, false, arg);
    updateContent();
  };

  const updateContent = () => {
    if (editorRef.current) {
      const content = editorRef.current.innerHTML;
      onChange(content);
    }
  };

  const handleInsertLink = () => {
    if (!linkUrl.trim()) return;
    let url = linkUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('mailto:')) {
      url = `https://${url}`;
    }

    restoreSelection();
    editorRef.current?.focus();

    const selection = window.getSelection();
    const hasSelectedText = selection && selection.toString().length > 0;

    if (hasSelectedText) {
      document.execCommand(
        'insertHTML',
        false,
        `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline; font-weight: 800;">${selection.toString()}</a>`
      );
    } else {
      const text = linkText.trim() || url;
      document.execCommand(
        'insertHTML',
        false,
        `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline; font-weight: 800;">${text}</a>`
      );
    }

    updateContent();
    setShowLinkModal(false);
    setLinkUrl('');
    setLinkText('');
  };

  const handleApplyColor = (hex: string) => {
    restoreSelection();
    editorRef.current?.focus();
    document.execCommand('foreColor', false, hex);
    updateContent();
    setShowColorPalette(false);
  };

  const handleApplySize = (cssSize: string) => {
    restoreSelection();
    editorRef.current?.focus();
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && selection.toString().length > 0) {
      document.execCommand(
        'insertHTML',
        false,
        `<span style="font-size: ${cssSize}; font-weight: 700;">${selection.toString()}</span>`
      );
    } else {
      document.execCommand('fontSize', false, '3');
    }
    updateContent();
    setShowSizeMenu(false);
  };

  return (
    <div className="border border-white/15 bg-slate-900/90 rounded-2xl overflow-hidden shadow-lg text-right font-sans">
      {/* Word-like Toolbar */}
      <div className="bg-slate-800/90 border-b border-white/10 p-2 sm:p-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Bold */}
          <button
            type="button"
            onClick={() => execCmd('bold')}
            disabled={isHtmlMode}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-white transition-colors cursor-pointer disabled:opacity-40"
            title="بلد / ضخیم (Bold)"
          >
            <Bold className="w-4 h-4" />
          </button>

          {/* Italic */}
          <button
            type="button"
            onClick={() => execCmd('italic')}
            disabled={isHtmlMode}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-white transition-colors cursor-pointer disabled:opacity-40"
            title="کج / ایتالیک (Italic)"
          >
            <Italic className="w-4 h-4" />
          </button>

          {/* Underline */}
          <button
            type="button"
            onClick={() => execCmd('underline')}
            disabled={isHtmlMode}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-white transition-colors cursor-pointer disabled:opacity-40"
            title="زیرخط (Underline)"
          >
            <Underline className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-white/15 mx-1" />

          {/* Text Color Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                saveSelection();
                setShowColorPalette(!showColorPalette);
                setShowSizeMenu(false);
              }}
              disabled={isHtmlMode}
              className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-40"
              title="تغییر رنگ نوشته"
            >
              <Palette className="w-4 h-4 text-indigo-400" />
              <span>رنگ نوشته</span>
            </button>

            {showColorPalette && (
              <div className="absolute right-0 top-full mt-1.5 z-40 bg-slate-900 border border-white/20 rounded-2xl shadow-2xl p-3 w-52 space-y-1.5">
                <span className="text-[10px] text-slate-400 font-bold block pb-1 border-b border-white/10">
                  انتخاب رنگ متن:
                </span>
                <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto">
                  {COLORS.map((col) => (
                    <button
                      key={col.hex}
                      type="button"
                      onClick={() => handleApplyColor(col.hex)}
                      className="flex items-center gap-2.5 w-full text-right p-1.5 rounded-lg hover:bg-white/10 text-xs text-white font-bold transition-colors cursor-pointer"
                    >
                      <span
                        className="w-4 h-4 rounded-full border border-white/30 shrink-0"
                        style={{ backgroundColor: col.hex }}
                      />
                      <span>{col.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Font Size Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                saveSelection();
                setShowSizeMenu(!showSizeMenu);
                setShowColorPalette(false);
              }}
              disabled={isHtmlMode}
              className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-40"
              title="تغییر سایز نوشته"
            >
              <Type className="w-4 h-4 text-emerald-400" />
              <span>سایز نوشته</span>
            </button>

            {showSizeMenu && (
              <div className="absolute right-0 top-full mt-1.5 z-40 bg-slate-900 border border-white/20 rounded-2xl shadow-2xl p-2 w-48 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold block pb-1 border-b border-white/10 px-2">
                  انتخاب اندازه متن:
                </span>
                {FONT_SIZES.map((fs) => (
                  <button
                    key={fs.cssSize}
                    type="button"
                    onClick={() => handleApplySize(fs.cssSize)}
                    className="w-full text-right p-2 rounded-lg hover:bg-white/10 text-white font-bold transition-colors cursor-pointer block"
                    style={{ fontSize: fs.cssSize }}
                  >
                    {fs.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="w-px h-5 bg-white/15 mx-1" />

          {/* Insert Link Button */}
          <button
            type="button"
            onClick={() => {
              saveSelection();
              const selection = window.getSelection();
              const selText = selection ? selection.toString() : '';
              setLinkText(selText);
              setShowLinkModal(true);
            }}
            disabled={isHtmlMode}
            className="px-2.5 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 text-indigo-300 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-40"
            title="گذاشتن لینک (Link)"
          >
            <LinkIcon className="w-4 h-4" />
            <span>افزودن لینک</span>
          </button>

          {/* Remove Link */}
          <button
            type="button"
            onClick={() => execCmd('unlink')}
            disabled={isHtmlMode}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-white transition-colors cursor-pointer disabled:opacity-40"
            title="حذف لینک (Unlink)"
          >
            <Unlink className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-white/15 mx-1" />

          {/* Bullet List */}
          <button
            type="button"
            onClick={() => execCmd('insertUnorderedList')}
            disabled={isHtmlMode}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-white transition-colors cursor-pointer disabled:opacity-40"
            title="لیست نقطه‌ای (Bullet List)"
          >
            <List className="w-4 h-4" />
          </button>

          {/* Numbered List */}
          <button
            type="button"
            onClick={() => execCmd('insertOrderedList')}
            disabled={isHtmlMode}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-white transition-colors cursor-pointer disabled:opacity-40"
            title="لیست عددی (Numbered List)"
          >
            <ListOrdered className="w-4 h-4" />
          </button>

          {/* Clear Formatting */}
          <button
            type="button"
            onClick={() => execCmd('removeFormat')}
            disabled={isHtmlMode}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-rose-300 transition-colors cursor-pointer disabled:opacity-40"
            title="پاک کردن قالب‌بندی (Clear Formatting)"
          >
            <RemoveFormatting className="w-4 h-4" />
          </button>
        </div>

        {/* Toggle HTML vs Visual Mode */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setIsHtmlMode(!isHtmlMode);
              setShowColorPalette(false);
              setShowSizeMenu(false);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              isHtmlMode
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'bg-white/10 hover:bg-white/20 text-slate-300'
            }`}
            title="تغییر حالت ویرایش"
          >
            {isHtmlMode ? (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span>حالت دیداری (ورد)</span>
              </>
            ) : (
              <>
                <Code className="w-3.5 h-3.5" />
                <span>ویرایش کد HTML</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Inline Link Modal */}
      {showLinkModal && (
        <div className="bg-slate-800 border-b border-indigo-500/30 p-3 sm:p-4 flex flex-col sm:flex-row items-center gap-3">
          <div className="flex-1 w-full sm:w-auto">
            <input
              type="text"
              placeholder="آدرس اینترنتی (مثلا: https://example.com)"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              className="w-full text-xs bg-white/10 border border-white/20 text-white placeholder:text-slate-400 rounded-xl p-2.5 outline-none focus:border-indigo-400 font-sans"
              autoFocus
            />
          </div>
          <div className="flex-1 w-full sm:w-auto">
            <input
              type="text"
              placeholder="عنوان نمایشی لینک (اختیاری)"
              value={linkText}
              onChange={(e) => setLinkText(e.target.value)}
              className="w-full text-xs bg-white/10 border border-white/20 text-white placeholder:text-slate-400 rounded-xl p-2.5 outline-none focus:border-indigo-400 font-sans"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleInsertLink}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition-colors cursor-pointer flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>درج لینک</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setShowLinkModal(false);
                setLinkUrl('');
                setLinkText('');
              }}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Editing Area */}
      {isHtmlMode ? (
        <textarea
          rows={7}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="کد HTML یا متن خبر را در اینجا وارد کنید..."
          className="w-full bg-slate-950/80 text-emerald-400 font-mono text-xs p-4 outline-none border-none resize-y leading-relaxed"
        />
      ) : (
        <div
          ref={editorRef}
          contentEditable
          onInput={updateContent}
          onBlur={updateContent}
          data-placeholder={placeholder}
          className="min-h-[160px] max-h-[350px] overflow-y-auto p-4 text-xs sm:text-sm text-white font-bold leading-8 outline-none focus:ring-0 empty:before:content-[attr(data-placeholder)] empty:before:text-slate-500"
          style={{ whiteSpace: 'pre-wrap' }}
        />
      )}

      {/* Footer Helper Note */}
      <div className="bg-slate-950/60 border-t border-white/5 px-3 py-1.5 flex items-center justify-between text-[10px] text-slate-400 font-medium">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-indigo-400" />
          <span>امکان لینک‌دهی، بولد کردن، تغییر سایز و رنگ نوشته مشابه نرم‌افزار ورد (Word)</span>
        </div>
        <span>{value ? value.replace(/<[^>]*>?/gm, '').length : 0} کاراکتر</span>
      </div>
    </div>
  );
};
