import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Headphones, Mic, Phone, PhoneOff } from "lucide-react";
import { PageHead } from "../components/PageHead";
import { SahayakAvatar } from "../components/SahayakAvatar";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";
import { api, ApiError } from "../lib/api";

/*
 * Practice call with the 1905 voice agent from the browser: the same agent that answers the phone
 * line, at 16 kHz. Microphone audio goes up as raw 16-bit PCM; the agent's voice comes back the same
 * way and is scheduled for gapless playback. "clear" drops queued audio when the caller interrupts.
 */

const RATE = 16000;

/** Downsamples the microphone to 16 kHz 16-bit PCM in 20 ms frames. */
const WORKLET = `
class Pcm16 extends AudioWorkletProcessor {
  constructor() { super(); this.step = sampleRate / ${RATE}; this.pos = 0; this.out = new Int16Array(320); this.n = 0; }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (!ch) return true;
    for (; this.pos < ch.length; this.pos += this.step) {
      const s = Math.max(-1, Math.min(1, ch[Math.floor(this.pos)]));
      this.out[this.n++] = s < 0 ? s * 0x8000 : s * 0x7fff;
      if (this.n === this.out.length) { this.port.postMessage(this.out.buffer.slice(0)); this.n = 0; }
    }
    this.pos -= ch.length;
    return true;
  }
}
registerProcessor("pcm16", Pcm16);
`;

type Line = { who: "citizen" | "agent"; text: string };
type State = "idle" | "connecting" | "live" | "ended" | "error";

export function Call() {
  const { t } = useI18n();
  const { session } = useAuth();
  const [status, setStatus] = useState<{ available: boolean; garhwali: boolean; number: string | null } | null>(null);
  const [state, setState] = useState<State>("idle");
  const [lines, setLines] = useState<Line[]>([]);
  const [partial, setPartial] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [registered, setRegistered] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [mobile, setMobile] = useState("");
  const call = useRef<{ ws: WebSocket; ctx: AudioContext; stream: MediaStream; sources: Set<AudioBufferSourceNode>; next: number; timers: number[] } | null>(null);
  const logRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    api.phoneStatus().then(setStatus).catch(() => setStatus({ available: false, garhwali: false, number: null }));
    return () => hangUp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [lines.length, partial]);

  function cleanup() {
    const c = call.current;
    if (!c) return;
    call.current = null;
    c.timers.forEach(clearTimeout);
    c.sources.forEach((s) => s.stop());
    c.stream.getTracks().forEach((tr) => tr.stop());
    void c.ctx.close().catch(() => {});
    setSpeaking(false);
    setPartial("");
  }

  function hangUp() {
    const c = call.current;
    if (c && c.ws.readyState === WebSocket.OPEN) c.ws.send(JSON.stringify({ type: "hangup" }));
    cleanup();
    setState((s) => (s === "live" || s === "connecting" ? "ended" : s));
  }

  async function start() {
    setError("");
    setLines([]);
    setRegistered(null);
    setState("connecting");
    try {
      const tok = await api.callToken();
      setMobile(tok.mobile);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } });
      const ctx = new AudioContext({ latencyHint: "interactive" });
      await ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([WORKLET], { type: "application/javascript" })));
      const base = tok.wsUrl ?? `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/api/phone/browser`;
      const ws = new WebSocket(`${base}?token=${encodeURIComponent(tok.token)}`);
      ws.binaryType = "arraybuffer";
      const c = { ws, ctx, stream, sources: new Set<AudioBufferSourceNode>(), next: 0, timers: [] as number[] };
      call.current = c;

      const mic = ctx.createMediaStreamSource(stream);
      const node = new AudioWorkletNode(ctx, "pcm16");
      mic.connect(node);
      node.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
        if (ws.readyState !== WebSocket.OPEN) return;
        const pcm = new Int16Array(e.data);
        // While the agent talks, pass only clearly louder speech so speakers don't echo back in as "interruptions".
        if (c.sources.size) {
          let sum = 0;
          for (const v of pcm) sum += v * v;
          if (Math.sqrt(sum / pcm.length) < 2500) pcm.fill(0);
        }
        ws.send(pcm.buffer);
      };

      ws.onopen = () => setState("live");
      ws.onerror = () => setError(t("Could not connect to the voice agent.", "वॉइस एजेंट से जुड़ नहीं सका।"));
      ws.onclose = () => {
        cleanup();
        setState((s) => (s === "connecting" ? "error" : s === "live" ? "ended" : s));
      };
      ws.onmessage = (e) => {
        if (e.data instanceof ArrayBuffer) return play(c, e.data);
        const m = JSON.parse(e.data as string) as { type: string; who?: Line["who"]; text?: string; final?: boolean; name?: string; id?: string; message?: string };
        if (m.type === "caption" && m.who && m.text) {
          if (m.who === "citizen" && !m.final) return setPartial(m.text);
          if (m.who === "citizen") setPartial("");
          setLines((l) => [...l, { who: m.who!, text: m.text! }]);
        } else if (m.type === "clear") {
          c.sources.forEach((s) => s.stop());
          c.sources.clear();
          c.next = 0;
          setSpeaking(false);
        } else if (m.type === "mark" && m.name) {
          const name = m.name;
          const wait = Math.max(0, (c.next - c.ctx.currentTime) * 1000);
          c.timers.push(window.setTimeout(() => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify({ type: "played", name })), wait));
        } else if (m.type === "registered" && m.id) setRegistered(m.id);
        else if (m.type === "error" && m.message) setError(m.message);
      };
    } catch (err) {
      cleanup();
      setState("error");
      setError(
        err instanceof ApiError
          ? err.message
          : (err as Error).name === "NotAllowedError"
            ? t("Allow the microphone to talk to the agent.", "एजेंट से बात करने हेतु माइक्रोफ़ोन की अनुमति दें।")
            : t("Could not start the call.", "कॉल शुरू नहीं हो सकी।"),
      );
    }
  }

  function play(c: NonNullable<typeof call.current>, data: ArrayBuffer) {
    const pcm = new Int16Array(data);
    if (!pcm.length) return;
    const buf = c.ctx.createBuffer(1, pcm.length, RATE);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < pcm.length; i++) ch[i] = pcm[i] / 0x8000;
    const src = c.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(c.ctx.destination);
    const at = Math.max(c.ctx.currentTime + 0.04, c.next);
    src.start(at);
    c.next = at + buf.duration;
    c.sources.add(src);
    setSpeaking(true);
    src.onended = () => {
      c.sources.delete(src);
      if (!c.sources.size) setSpeaking(false);
    };
  }

  const dtmf = (digit: string) => call.current?.ws.send(JSON.stringify({ type: "dtmf", digit }));
  const live = state === "live" || state === "connecting";

  return (
    <>
      <PageHead
        en="Talk to the 1905 voice agent"
        hi="1905 वॉइस एजेंट से बात करें"
        lead={t(
          "The same AI agent that answers the helpline phone. Tell it your problem in Hindi or English, as you would on a call; it asks what it needs, reads the complaint back, registers it and sends the number on WhatsApp.",
          "वही AI एजेंट जो हेल्पलाइन फ़ोन का उत्तर देता है। कॉल की तरह हिंदी या अंग्रेज़ी में अपनी समस्या बताइए; वह ज़रूरी जानकारी पूछेगा, शिकायत दोहराएगा, दर्ज करेगा और संख्या व्हाट्सऐप पर भेजेगा।",
        )}
      />
      <div className="container call-page">
        <div className="card call-card">
          <div className="call-card__agent">
            <SahayakAvatar size={88} speaking={speaking} />
            <div>
              <strong>{t("Sahayak · CM Helpline 1905", "सहायक · मुख्यमंत्री हेल्पलाइन 1905")}</strong>
              <span className="muted small">
                {state === "live"
                  ? speaking
                    ? t("Speaking… talk any time to interrupt", "बोल रही हैं… बीच में कभी भी बोलें")
                    : t("Listening", "सुन रही हैं")
                  : state === "connecting"
                    ? t("Connecting…", "जुड़ रहा है…")
                    : state === "ended"
                      ? t("Call ended", "कॉल समाप्त")
                      : t("Ready", "तैयार")}
              </span>
            </div>
          </div>

          {status && !status.available && (
            <p className="field__error" role="alert">{t("The voice agent is not switched on for this server yet.", "इस सर्वर पर वॉइस एजेंट अभी चालू नहीं है।")}</p>
          )}

          <div className="call-card__actions">
            {!live ? (
              <button type="button" className="btn btn--success" onClick={start} disabled={!status?.available}>
                <Phone size={18} aria-hidden="true" /> {state === "ended" ? t("Call again", "फिर से कॉल करें") : t("Start call", "कॉल शुरू करें")}
              </button>
            ) : (
              <button type="button" className="btn call-card__hangup" onClick={hangUp}>
                <PhoneOff size={18} aria-hidden="true" /> {t("Hang up", "कॉल काटें")}
              </button>
            )}
            {live && (
              <span className="call-card__keys" aria-label={t("Keypad", "कीपैड")}>
                <button type="button" className="btn btn--secondary" onClick={() => dtmf("1")}>1 · हिंदी</button>
                <button type="button" className="btn btn--secondary" onClick={() => dtmf("2")}>2 · गढ़वळि</button>
                <button type="button" className="btn btn--secondary" onClick={() => dtmf("3")}>3 · English</button>
                <button type="button" className="btn btn--secondary" onClick={() => dtmf("4")}>4 · कुमाऊँनी</button>
              </span>
            )}
          </div>

          <p className="small muted call-card__hint">
            <Headphones size={14} aria-hidden="true" /> {t("Headphones give the smoothest call.", "हेडफ़ोन से कॉल सबसे सहज रहती है।")}{" "}
            {mobile && t(`Complaints from this call are registered to ${mobile}.`, `इस कॉल की शिकायत ${mobile} पर दर्ज होगी।`)}
            {!mobile && session?.role !== "citizen" && t(" Not signed in: the call uses the demo number 98765 43210.", " साइन इन नहीं: कॉल डेमो नंबर 98765 43210 से होगी।")}
          </p>
          {status?.number && <p className="small">{t("Or call from your phone: ", "या अपने फ़ोन से कॉल करें: ")}<a href={`tel:${status.number}`}>{status.number}</a></p>}

          {registered && (
            <p className="call-card__done" role="status">
              {t("Registered as ", "दर्ज संख्या ")}<strong>{registered}</strong>.{" "}
              {session?.role === "citizen" ? <Link to={`/my-complaints/${registered}`}>{t("Open it", "देखें")}</Link> : <Link to="/whatsapp">{t("See the WhatsApp message", "व्हाट्सऐप संदेश देखें")}</Link>}
            </p>
          )}
          {error && <p className="field__error" role="alert">{error}</p>}
        </div>

        <section className="card call-log" aria-label={t("Live captions", "लाइव कैप्शन")}>
          <h2 className="call-log__title"><Mic size={16} aria-hidden="true" /> {t("Live captions", "लाइव कैप्शन")}</h2>
          <ol ref={logRef} role="log" aria-live="polite" data-no-translate>
            {lines.map((l, i) => (
              <li key={i} className={`call-log__${l.who}`}><strong>{l.who === "agent" ? t("Sahayak", "सहायक") : t("You", "आप")}</strong>{l.text}</li>
            ))}
            {partial && <li className="call-log__citizen is-partial"><strong>{t("You", "आप")}</strong>{partial}</li>}
            {!lines.length && !partial && <li className="muted">{t("Captions appear here once the call starts.", "कॉल शुरू होने पर कैप्शन यहाँ दिखेंगे।")}</li>}
          </ol>
        </section>
      </div>
    </>
  );
}
