import { useCallback, useEffect, useRef, useState } from "react";
import { aiStatus, translateStrings } from "../lib/ai";
import { api } from "../lib/api";
import { languageOf, type Locale } from "../lib/languages";

const synth = typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : undefined;

/**
 * Reads text aloud in the citizen's language. Uses the natural AI voice when the server has one,
 * otherwise the browser's own voice. Lets citizens who cannot read comfortably hear their status.
 */
export function useSpeak(locale: Locale) {
  const [speaking, setSpeaking] = useState(false);
  const [natural, setNatural] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const abort = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abort.current?.abort();
    audio.current?.pause();
    audio.current = null;
    synth?.cancel();
    setSpeaking(false);
  }, []);

  useEffect(() => stop, [stop]);
  useEffect(() => {
    aiStatus().then((s) => setNatural(s.speech));
  }, []);

  const browserSpeak = useCallback(
    (text: string) => {
      if (!synth) return setSpeaking(false);
      const tag = languageOf(locale).speech;
      const u = new SpeechSynthesisUtterance(text);
      u.lang = tag;
      u.rate = 0.95;
      // Prefer an installed voice for the language; the browser default may read Hindi with an English voice.
      const voice = synth.getVoices().find((v) => v.lang === tag) ?? synth.getVoices().find((v) => v.lang.startsWith(tag.slice(0, 2)));
      if (voice) u.voice = voice;
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      synth.speak(u);
    },
    [locale],
  );

  /** `english` marks text written in English for locales that have no hand-written copy, so it is translated first. */
  const speak = useCallback(
    async (text: string, opts: { english?: boolean } = {}) => {
      stop();
      setSpeaking(true);
      const ctrl = new AbortController();
      abort.current = ctrl;
      let say = text;
      try {
        if (opts.english && locale !== "en" && locale !== "hi") say = (await translateStrings([text], locale))[0];
        if (ctrl.signal.aborted) return;
        if ((await aiStatus()).speech) {
          const blob = await api.speak(say.slice(0, 700), locale, ctrl.signal);
          if (ctrl.signal.aborted) return;
          const url = URL.createObjectURL(blob);
          const el = new Audio(url);
          audio.current = el;
          el.onended = el.onerror = () => {
            URL.revokeObjectURL(url);
            if (audio.current === el) setSpeaking(false);
          };
          await el.play();
          return;
        }
      } catch (err) {
        if (ctrl.signal.aborted || (err as Error).name === "AbortError") return;
      }
      browserSpeak(say);
    },
    [browserSpeak, locale, stop],
  );

  return { supported: Boolean(synth) || natural, speaking, speak, stop };
}
