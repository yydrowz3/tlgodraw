import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en";
import zhCN from "./locales/zh-CN";
import ja from "./locales/ja";

export const LANGUAGE_STORAGE_KEY = "tlgodraw_language";
export const languages = ["en", "zh-CN", "ja"] as const;
export type Language = (typeof languages)[number];
export const resources = {
  en: { translation: en },
  "zh-CN": { translation: zhCN },
  ja: { translation: ja },
};

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: { translation: typeof en };
    strictKeyChecks: true;
  }
}

export function isLanguage(value: unknown): value is Language {
  return languages.some((language) => language === value);
}

export function readLanguage(): Language {
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (isLanguage(saved)) return saved;
  } catch {
    // Browsers may disable storage. Language selection still works in memory.
  }
  return "en";
}

export const i18n = createInstance();
i18n.on("languageChanged", (language) => {
  document.documentElement.lang = isLanguage(language) ? language : "en";
});

// Bundled resources allow synchronous initialization before React renders.
void i18n.use(initReactI18next).init({
  resources,
  lng: readLanguage(),
  supportedLngs: [...languages],
  fallbackLng: "en",
  load: "currentOnly",
  initAsync: false,
  interpolation: { escapeValue: false },
});

export async function setLanguage(language: Language) {
  await i18n.changeLanguage(language);
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Do not prevent switching when the preference cannot be saved.
  }
}
