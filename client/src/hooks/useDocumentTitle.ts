import { useEffect } from "react";
import { useI18n } from "../context/I18nContext";

/** Sets a unique, descriptive <title> on every page (WCAG 2.4.2). */
export function useDocumentTitle(en: string, hi: string) {
  const { t } = useI18n();
  const title = t(en, hi);
  useEffect(() => {
    document.title = `${title} – ${t("CM Helpline 1905, Uttarakhand", "मुख्यमंत्री हेल्पलाइन 1905, उत्तराखंड")}`;
  }, [title, t]);
}
