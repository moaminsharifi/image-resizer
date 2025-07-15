"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import enTranslations from "@/locales/en.json";
import faTranslations from "@/locales/fa.json";

type Language = "en" | "fa";

const translationsMap = {
  en: enTranslations,
  fa: faTranslations,
};

// A simple recursive type for nested object structures like our JSON files
type Translations = { [key: string]: string | Translations };

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  translations: typeof enTranslations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>("en");
  const [currentTranslations, setCurrentTranslations] = useState(enTranslations);

  useEffect(() => {
    const storedLang = localStorage.getItem("language") as Language | null;
    if (storedLang && (storedLang === "en" || storedLang === "fa")) {
      setLanguage(storedLang);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("language", language);
    setCurrentTranslations(translationsMap[language]);
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'fa' ? 'rtl' : 'ltr';
  }, [language]);

  const value = {
    language,
    setLanguage,
    translations: currentTranslations,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
