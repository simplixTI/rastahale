import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import pt from "./locales/pt.json";
import en from "./locales/en.json";
import es from "./locales/es.json";

/** Idiomas oferecidos ao aluno. `pt` é a fonte de verdade das chaves. */
export const LANGUAGES = ["pt", "en", "es"] as const;
export type Language = (typeof LANGUAGES)[number];

/** Chave no localStorage onde a escolha do aluno fica guardada. */
export const LANGUAGE_KEY = "rasta_lang";

/** Locale usado para formatar datas e moeda em cada idioma. */
const LOCALES: Record<Language, string> = {
  pt: "pt-BR",
  en: "en-US",
  es: "es-ES",
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      pt: { translation: pt },
      en: { translation: en },
      es: { translation: es },
    },
    fallbackLng: "pt",
    supportedLngs: LANGUAGES,
    // "pt-BR" do navegador deve cair em "pt", não criar um idioma novo.
    load: "languageOnly",
    interpolation: { escapeValue: false }, // React já escapa
    detection: {
      // A escolha explícita do aluno vence; senão segue o idioma do navegador.
      order: ["localStorage", "navigator"],
      lookupLocalStorage: LANGUAGE_KEY,
      caches: ["localStorage"],
    },
  });

/** Idioma ativo, sempre normalizado para um dos três suportados. */
export function currentLanguage(): Language {
  const lng = i18n.resolvedLanguage ?? i18n.language ?? "pt";
  const base = lng.split("-")[0] as Language;
  return LANGUAGES.includes(base) ? base : "pt";
}

/** Locale (pt-BR / en-US / es-ES) do idioma ativo, para Intl. */
export function currentLocale(): string {
  return LOCALES[currentLanguage()];
}

export function changeLanguage(lng: Language) {
  i18n.changeLanguage(lng);
  document.documentElement.lang = LOCALES[lng];
}

// Mantém o atributo lang do <html> em dia (acessibilidade e SEO).
document.documentElement.lang = currentLocale();
i18n.on("languageChanged", () => {
  document.documentElement.lang = currentLocale();
});

export default i18n;
