import { useCallback, useEffect, useRef, useState } from "react";

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

const Recognition: (new () => SpeechRecognitionLike) | undefined =
  typeof window !== "undefined" ? ((window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition) : undefined;

/**
 * Speech-to-text through the browser (Hindi or Indian English).
 * Helps citizens who find typing hard: elderly people, low literacy, small phones.
 */
export function useSpeechInput(lang: "hi-IN" | "en-IN", onText: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const onTextRef = useRef(onText);
  onTextRef.current = onText;

  useEffect(() => () => recRef.current?.stop(), []);

  const start = useCallback(() => {
    if (!Recognition) return;
    setError(null);
    const rec = new Recognition();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) onTextRef.current(e.results[i][0].transcript.trim());
      }
    };
    rec.onerror = (e) => setError(e.error === "not-allowed" ? "permission" : "failed");
    rec.onend = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  }, [lang]);

  const stop = useCallback(() => recRef.current?.stop(), []);

  return { supported: Boolean(Recognition), listening, error, start, stop };
}
