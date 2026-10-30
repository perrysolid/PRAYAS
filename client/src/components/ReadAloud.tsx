import { Square, Volume2 } from "lucide-react";
import { useI18n } from "../context/I18nContext";
import { useSpeak } from "../hooks/useSpeak";

/** "Listen" button that reads a summary aloud in the page language. Hidden where the browser cannot speak. */
export function ReadAloud({ text, className = "" }: { text: string; className?: string }) {
  const { t, lang } = useI18n();
  const { supported, speaking, speak, stop } = useSpeak(lang === "hi" ? "hi-IN" : "en-IN");
  if (!supported) return null;
  return (
    <button type="button" className={`btn btn--secondary btn--small ${className}`} onClick={() => (speaking ? stop() : speak(text))} aria-pressed={speaking}>
      {speaking ? <Square size={16} aria-hidden="true" /> : <Volume2 size={16} aria-hidden="true" />}
      {speaking ? t("Stop", "रोकें") : t("Listen", "सुनें")}
    </button>
  );
}
