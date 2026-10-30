import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Lang } from "../i18n/strings";
import type { Bilingual } from "../lib/types";
import { readPref, writePref } from "../lib/prefs";

type I18n = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  /** t("English", "हिंदी") returns the copy for the current language. */
  t: (en: string, hi: string) => string;
  /** pick({ en, hi }) for data that arrives from the API. */
  pick: (text: Bilingual) => string;
};

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => (readPref("lang") === "hi" ? "hi" : "en"));

  useEffect(() => {
    // Screen readers switch voice on <html lang>; the current portal omits it entirely.
    document.documentElement.lang = lang;
    document.documentElement.dataset.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    writePref("lang", next);
  }, []);

  const value = useMemo<I18n>(
    () => ({
      lang,
      setLang,
      t: (en, hi) => (lang === "hi" ? hi : en),
      pick: (text) => text[lang],
    }),
    [lang, setLang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
