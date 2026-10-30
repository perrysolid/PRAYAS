import { useCallback, useEffect, useState } from "react";

const synth = typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : undefined;

/**
 * Text-to-speech through the browser, in Hindi or Indian English.
 * Lets citizens who cannot read comfortably hear their complaint status.
 */
export function useSpeak(lang: "hi-IN" | "en-IN") {
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => () => synth?.cancel(), []);

  const speak = useCallback(
    (text: string) => {
      if (!synth) return;
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang;
      u.rate = 0.95;
      // Prefer an installed voice for the language; the browser default may read Hindi with an English voice.
      const voice = synth.getVoices().find((v) => v.lang === lang) ?? synth.getVoices().find((v) => v.lang.startsWith(lang.slice(0, 2)));
      if (voice) u.voice = voice;
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      setSpeaking(true);
      synth.speak(u);
    },
    [lang],
  );

  const stop = useCallback(() => {
    synth?.cancel();
    setSpeaking(false);
  }, []);

  return { supported: Boolean(synth), speaking, speak, stop };
}
