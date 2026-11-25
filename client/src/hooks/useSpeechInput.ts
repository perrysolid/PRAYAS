import { useCallback, useEffect, useRef, useState } from "react";
import { aiStatus } from "../lib/ai";
import { api } from "../lib/api";

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
const canRecord = typeof window !== "undefined" && typeof MediaRecorder !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);

/** Chrome and Firefox record WebM, Safari MP4. */
const recordingType = () => ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"].find((t) => MediaRecorder.isTypeSupported?.(t)) ?? "";

/**
 * Speech-to-text for citizens who find typing hard: elderly people, low literacy, small phones.
 * The recording goes to the server's Indian-language model (Sarvam), which works in every browser and
 * understands Hindi, English and Hinglish whatever the page language. It stops by itself after a pause.
 * Without that, the browser's own recognition is used (Chrome, Edge, Safari).
 */
export function useSpeechInput(lang: "hi-IN" | "en-IN", onText: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [server, setServer] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const stopRef = useRef<() => void>(() => {});
  const onTextRef = useRef(onText);
  onTextRef.current = onText;

  useEffect(() => {
    aiStatus().then((s) => setServer(Boolean(s.listen) && canRecord));
    return () => stopRef.current();
  }, []);

  const startBrowser = useCallback(() => {
    if (!Recognition) return;
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
    stopRef.current = () => rec.stop();
    rec.start();
    setListening(true);
  }, [lang]);

  const startServer = useCallback(async () => {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      setError("permission");
      return;
    }
    const type = recordingType();
    const recorder = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);

    // Stop after ~1.5 s of quiet once the citizen has spoken, after 8 s of nothing, or at 45 s.
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const samples = new Float32Array(analyser.fftSize);
    const began = Date.now();
    let spoke = false;
    let quietSince = Date.now();
    const timer = window.setInterval(() => {
      analyser.getFloatTimeDomainData(samples);
      const rms = Math.sqrt(samples.reduce((s, v) => s + v * v, 0) / samples.length);
      const now = Date.now();
      if (rms > 0.02) (spoke = true), (quietSince = now);
      if ((spoke && now - quietSince > 1500) || (!spoke && now - began > 8000) || now - began > 45_000) finish();
    }, 100);

    let done = false;
    function finish() {
      if (done) return;
      done = true;
      window.clearInterval(timer);
      if (recorder.state !== "inactive") recorder.stop();
    }
    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      void ctx.close();
      setListening(false);
      if (!spoke || !chunks.length) return;
      setBusy(true);
      try {
        const { text } = await api.listen(new Blob(chunks, { type: recorder.mimeType || type || "audio/webm" }));
        if (text) onTextRef.current(text);
        else setError("failed");
      } catch {
        setError("failed");
      } finally {
        setBusy(false);
      }
    };
    stopRef.current = finish;
    recorder.start(250);
    setListening(true);
  }, []);

  const start = useCallback(() => {
    setError(null);
    if (server) void startServer();
    else startBrowser();
  }, [server, startBrowser, startServer]);

  const stop = useCallback(() => stopRef.current(), []);

  return { supported: server || Boolean(Recognition), listening, busy, error, start, stop };
}
