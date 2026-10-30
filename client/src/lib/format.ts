import type { Lang } from "../i18n/strings";

const locale = (lang: Lang) => (lang === "hi" ? "hi-IN" : "en-IN");

export const formatDate = (iso: string, lang: Lang) =>
  new Date(iso).toLocaleDateString(locale(lang), { day: "numeric", month: "long", year: "numeric" });

export const formatDateTime = (iso: string, lang: Lang) =>
  new Date(iso).toLocaleString(locale(lang), { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

export const formatNumber = (n: number, lang: Lang) => n.toLocaleString(locale(lang));

/** Whole days from now until iso; negative when past. */
export const daysUntil = (iso: string) => Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
