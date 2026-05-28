"use client";

import { Languages } from "lucide-react";
import { languageLabels, type Language } from "@/lib/i18n";
import { useLanguage } from "./language-provider";

const languages: Language[] = ["en", "my"];

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage } = useLanguage();

  return (
    <div
      className="inline-flex items-center gap-1 rounded-md bg-white/90 p-1 text-sm font-semibold text-stone-700 ring-1 ring-stone-200 backdrop-blur"
      aria-label="Language"
    >
      {!compact ? <Languages size={16} aria-hidden="true" /> : null}
      {languages.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => setLanguage(item)}
          aria-pressed={language === item}
          className={`h-9 rounded px-3 transition ${
            language === item
              ? "bg-stone-950 text-white"
              : "text-stone-600 hover:bg-stone-100"
          }`}
        >
          {languageLabels[item]}
        </button>
      ))}
    </div>
  );
}
