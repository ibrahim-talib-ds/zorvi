"use client";

import { useState, useRef, useEffect } from "react";
import { Globe, ChevronDown } from "lucide-react";
import { locales } from "@/i18n/config";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useLanguage } from "@/i18n/LanguageProvider";

export function LanguageSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const { locale, setLocale } = useLanguage();
  const currentLang = locales.find(l => l.code === locale) || locales[0];
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (lang: typeof locales[number]) => {
    setLocale(lang.code);
    setIsOpen(false);
    
    // Automatically trigger Google Translate
    const selectElement = document.querySelector('.goog-te-combo') as HTMLSelectElement;
    if (selectElement) {
      selectElement.value = lang.code;
      selectElement.dispatchEvent(new Event('change'));
    }
  };

  return (
    <div data-no-translate className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition text-sm text-[#B7BDD0]"
      >
        <Globe size={16} />
        <span>{currentLang.flag} {currentLang.code.toUpperCase()}</span>
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-48 bg-[#171B33] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50 max-h-80 overflow-y-auto">
          {locales.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleSelect(lang)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-white/5 ${currentLang.code === lang.code ? 'text-[#8B70FF] bg-[#8B70FF]/10' : 'text-[#B7BDD0]'}`}
            >
              <span className="text-lg">{lang.flag}</span>
              <span>{lang.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
