import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Lang } from "../i18n/strings";
import type { Bilingual } from "../lib/types";
import { isLocale, languageOf, type Locale } from "../lib/languages";
import { readPref, writePref } from "../lib/prefs";

type I18n = {
  /** Language of the hand-written copy: Hindi, or English for every other locale. */
  lang: Lang;
  /** The language the citizen chose. Locales other than en/hi are translated automatically. */
  locale: Locale;
  /** True when the page is shown through automatic translation. */
  machine: boolean;
  setLocale: (locale: Locale) => void;
  setLang: (lang: Lang) => void;
  /** t("English", "हिंदी") returns the copy for the current language. */
  t: (en: string, hi: string) => string;
  /** pick({ en, hi }) for data that arrives from the API. */
  pick: (text: Bilingual) => string;
};

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = readPref("lang");
    return isLocale(saved) ? saved : "en";
  });
  const lang: Lang = locale === "hi" ? "hi" : "en";

  useEffect(() => {
    // Screen readers switch voice on <html lang>; the current portal omits it entirely.
    document.documentElement.lang = locale;
    document.documentElement.dir = "rtl" in languageOf(locale) ? "rtl" : "ltr";
    document.documentElement.dataset.lang = lang;
  }, [locale, lang]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    writePref("lang", next);
  }, []);

  const value = useMemo<I18n>(
    () => ({
      lang,
      locale,
      machine: locale !== "en" && locale !== "hi",
      setLocale,
      setLang: setLocale,
      t: (en, hi) => (lang === "hi" ? hi : en),
      pick: (text) => text[lang],
    }),
    [lang, locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
