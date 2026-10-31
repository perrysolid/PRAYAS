import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, CheckCheck, CheckCircle2, Clock3, MapPin, MessageCircle, Play, RotateCcw, ShieldCheck, Sparkles, Volume2, VolumeX, X } from "lucide-react";
import { BeforeAfter } from "../components/BeforeAfter";
import { DeptIcon } from "../components/DeptIcon";
import { SahayakAvatar } from "../components/SahayakAvatar";
import { StateSeal } from "../components/Seal";
import { UkMap } from "../components/UkMap";
import { useI18n } from "../context/I18nContext";
import { useMeta } from "../context/MetaContext";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { api, type WhatsAppMessage } from "../lib/api";
import { demoScene } from "../lib/demoScene";
import type { Stats } from "../lib/types";
import { rich } from "./WhatsApp";
import "../styles/demo.css";

/** The demo number; the server only runs the guided demo for its demo numbers. */
const MOBILE = "9876500001";
const COMPLAINT = "Namaste. Khirsu–Chaubatia motor road par 4 din se landslide ka malba pada hai. School bus aur ambulance nahi aa pa rahi, bachche 5 km paidal ja rahe hain";
const DISTRICT_REPLY = "Pauri";
const YES = "haan";
const OFFICER_NOTES = "JCB lagwa ke malba hataya, road dono taraf se khol di. 2 ghante laga, drain bhi saaf kiya";

type Phase = "ready" | "running" | "done" | "error";
type Case = { id: string; subject: string; districtId: string; departmentId: string; officer: string; at: string };

const chapters = [
  { en: ["A citizen writes on WhatsApp", "In Hinglish, the way he speaks. No app, no form, no office visit."], hi: ["नागरिक व्हाट्सऐप पर लिखते हैं", "अपनी बोली में, हिंग्लिश में। न ऐप, न फ़ॉर्म, न कार्यालय के चक्कर।"] },
  { en: ["AI understands and routes it", "It identifies the department and asks only for what is missing."], hi: ["AI समझकर सही विभाग चुनता है", "विभाग पहचानता है और केवल छूटी जानकारी पूछता है।"] },
  { en: ["Written formally, confirmed by the citizen", "Nothing is filed until the citizen says yes. The receipt comes by WhatsApp, and is read aloud."], hi: ["औपचारिक भाषा में, नागरिक की पुष्टि से", "नागरिक की हाँ के बिना कुछ दर्ज नहीं होता। पावती व्हाट्सऐप पर, आवाज़ में भी।"] },
  { en: ["It reaches the right officer at once", "The district lights up on the state map and the complaint tops the officer's queue, with its deadline."], hi: ["तुरंत सही अधिकारी तक", "मानचित्र पर जनपद चिह्नित होता है और शिकायत समय सीमा सहित अधिकारी की कतार में सबसे ऊपर।"] },
  { en: ["The officer acts; AI writes the report", "Rough notes become a clear action-taken report. Resolving needs geo-tagged photo proof."], hi: ["अधिकारी कार्यवाही करते हैं; रिपोर्ट AI लिखता है", "कच्चे नोट्स से स्पष्ट कार्यवाही रिपोर्ट। निस्तारण हेतु स्थान-अंकित फ़ोटो प्रमाण अनिवार्य।"] },
  { en: ["Proof reaches the citizen, who rates it", "The photo arrives on WhatsApp. One reply rates it, or reopens it one level higher."], hi: ["प्रमाण नागरिक तक, वे रेटिंग देते हैं", "फ़ोटो व्हाट्सऐप पर आती है। एक जवाब से रेटिंग, या उच्च स्तर पर पुनः खोलना।"] },
];

const sleepFor = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(new DOMException("Stopped", "AbortError"));
    const id = window.setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      window.clearTimeout(id);
      reject(new DOMException("Stopped", "AbortError"));
    }, { once: true });
  });

const clock = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}`;
const time = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

export function Demo() {
  const { t, pick } = useI18n();
  const { department, district } = useMeta();
  useDocumentTitle("Watch it work", "देखें यह कैसे काम करता है");

  const [phase, setPhase] = useState<Phase>("ready");
  const [chapter, setChapter] = useState(0);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [botTyping, setBotTyping] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pulses, setPulses] = useState<{ id: string; key: number }[]>([]);
  const [lit, setLit] = useState<string | undefined>();
  const [kase, setKase] = useState<Case | null>(null);
  const [rowIn, setRowIn] = useState(false);
  const [note, setNote] = useState("");
  const [polishing, setPolishing] = useState(false);
  const [report, setReport] = useState("");
  const [photos, setPhotos] = useState<{ before: string; after: string } | null>(null);
  const [pressed, setPressed] = useState<"polish" | "resolve" | null>(null);
  const [resolved, setResolved] = useState(false);
  const [stars, setStars] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [sound, setSound] = useState(true);
  const [error, setError] = useState("");

  const ctrl = useRef<AbortController | null>(null);
  const startedAt = useRef(0);
  const soundRef = useRef(sound);
  soundRef.current = sound;
  const audio = useRef<AudioContext | null>(null);
  const seen = useRef(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<HTMLDivElement>(null);
  const flyRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    api.stats().then(setStats, () => undefined);
    return () => ctrl.current?.abort();
  }, []);

  // Keep the newest message and the officer's latest step in view.
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, botTyping, draft]);
  useEffect(() => {
    wsRef.current?.scrollTo({ top: wsRef.current.scrollHeight, behavior: "smooth" });
  }, [note, report, photos, resolved]);

  useEffect(() => {
    if (phase !== "running") return;
    const id = window.setInterval(() => setElapsed(Date.now() - startedAt.current), 200);
    return () => window.clearInterval(id);
  }, [phase]);

  /** A soft two-note chime for each incoming WhatsApp message. */
  const chime = useCallback(() => {
    const ac = audio.current;
    if (!ac || !soundRef.current) return;
    const now = ac.currentTime;
    [880, 1320].forEach((f, i) => {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = "sine";
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, now + i * 0.09);
      g.gain.exponentialRampToValueAtTime(0.08, now + i * 0.09 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.09 + 0.25);
      o.connect(g).connect(ac.destination);
      o.start(now + i * 0.09);
      o.stop(now + i * 0.09 + 0.3);
    });
  }, []);

  const say = useCallback((text: string) => {
    if (!soundRef.current) return;
    api.speak(text, "hi").then((blob) => {
      const a = new Audio(URL.createObjectURL(blob));
      a.volume = 0.9;
      void a.play().catch(() => undefined);
    }, () => undefined);
  }, []);

  /** Fly a small complaint card from one element to a point, then to another element. */
  const fly = useCallback(async (from: Element | null, via: Element | null, to: Element | null) => {
    const stage = stageRef.current?.getBoundingClientRect();
    const card = flyRef.current;
    if (!stage || !card || !from || !via || !to || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const centre = (el: Element) => {
      const r = el.getBoundingClientRect();
      return [r.left + r.width / 2 - stage.left, r.top + r.height / 2 - stage.top];
    };
    const [x0, y0] = centre(from);
    const [x1, y1] = centre(via);
    const [x2, y2] = centre(to);
    const w = card.offsetWidth / 2;
    const h = card.offsetHeight / 2;
    const at = (x: number, y: number, s: number, r = 0) => `translate(${x - w}px, ${y - h}px) scale(${s}) rotate(${r}deg)`;
    card.style.visibility = "visible";
    await card.animate(
      [
        { transform: at(x0, y0, 0.6), opacity: 0 },
        { transform: at(x0, y0 - 30, 1, -4), opacity: 1, offset: 0.12 },
        { transform: at((x0 + x1) / 2, Math.min(y0, y1) - 120, 1.05, 3), opacity: 1, offset: 0.38 },
        { transform: at(x1, y1 - 34, 0.9), opacity: 1, offset: 0.55 },
        { transform: at(x1, y1 - 34, 0.9), opacity: 1, offset: 0.66 },
        { transform: at((x1 + x2) / 2, Math.min(y1, y2) - 90, 1.05, -3), opacity: 1, offset: 0.84 },
        { transform: at(x2, y2, 1), opacity: 0 },
      ],
      { duration: 2600, easing: "cubic-bezier(.45,.05,.25,1)", fill: "forwards" },
    ).finished;
    card.style.visibility = "hidden";
  }, []);

  const run = useCallback(async () => {
    ctrl.current?.abort();
    const c = new AbortController();
    ctrl.current = c;
    const { signal } = c;
    const sleep = (ms: number) => sleepFor(ms, signal);
    const since = new Date(Date.now() - 1000).toISOString();

    // Reset the stage
    setMessages([]);
    setDraft("");
    setKase(null);
    setRowIn(false);
    setNote("");
    setReport("");
    setPhotos(null);
    setResolved(false);
    setStars(false);
    setLit(undefined);
    setError("");
    setChapter(0);
    seen.current = 0;
    startedAt.current = Date.now();
    setElapsed(0);
    setPhase("running");
    if (!audio.current) {
      try {
        audio.current = new AudioContext();
      } catch {
        // No sound effects on this browser.
      }
    }
    void audio.current?.resume();

    const outs = (list: WhatsAppMessage[]) => list.filter((m) => m.dir === "out");
    const pull = async () => {
      const list = (await api.waThread(MOBILE)).filter((m) => m.at >= since);
      setMessages(list);
      const n = outs(list).length;
      if (n > seen.current) chime();
      seen.current = Math.max(seen.current, n);
      return list;
    };
    /** Wait for the helpline's reply that matches, polling the live thread. */
    const waitFor = async (after: number, test: (m: WhatsAppMessage) => boolean, ms = 40000) => {
      setBotTyping(true);
      const until = Date.now() + ms;
      while (Date.now() < until) {
        const list = await pull();
        const hit = outs(list).slice(after).find(test);
        if (hit) {
          setBotTyping(false);
          return hit;
        }
        await sleep(650);
      }
      throw new Error("timeout");
    };
    const typeAndSend = async (text: string, cps = 38) => {
      for (let i = 1; i <= text.length; i++) {
        setDraft(text.slice(0, i));
        await sleep(1000 / cps + (text[i - 1] === " " ? 25 : 0));
      }
      await sleep(350);
      setDraft("");
      const before = outs(await pull()).length;
      await api.waSend(MOBILE, text);
      await pull();
      return before;
    };

    try {
      await api.demoReset(MOBILE);
      await sleep(900);

      // 1. The citizen writes
      let after = await typeAndSend(COMPLAINT);
      setChapter(1);
      const first = await waitFor(after, (m) => /district|जनपद|\*YES\*|\*हाँ\*/i.test(m.text));

      // 2. AI routes it and asks for the district
      await sleep(1600);
      let confirm = first;
      if (!/\*YES\*|\*हाँ\*/i.test(first.text)) {
        after = await typeAndSend(DISTRICT_REPLY, 14);
        confirm = await waitFor(after, (m) => /\*YES\*|\*हाँ\*/i.test(m.text));
      }
      setChapter(2);
      const subject = /\*([^*\n]{6,})\*/.exec(confirm.text)?.[1] ?? "Motor road blocked by landslide debris";

      // 3. Confirmed, registered, receipt read aloud
      await sleep(2600);
      after = await typeAndSend(YES, 10);
      const receipt = await waitFor(after, (m) => /CMH-\d{4}-\d{6}/.test(m.text));
      const id = /CMH-\d{4}-\d{6}/.exec(receipt.text)![0];
      const g = await api.track(id, MOBILE);
      const dept = department(g.departmentId);
      setKase({ id, subject, districtId: g.districtId, departmentId: g.departmentId, officer: pick(g.currentOfficer), at: g.levelDueAt });
      say(`शिकायत संख्या ${id.slice(-4).split("").join(" ")} दर्ज हो गई है। इसे ${dept ? dept.name.hi : "संबंधित विभाग"} को भेज दिया गया है।`);
      await sleep(1800);

      // 4. To the map and the officer's queue
      setChapter(3);
      await sleep(500);
      const bubble = logRef.current?.querySelector(".wa-msg--out:last-of-type") ?? null;
      const target = stageRef.current?.querySelector(`#ukd-${g.districtId} path`) ?? null;
      setPulses([{ id: g.districtId, key: Date.now() }]);
      setLit(g.districtId);
      api.stats().then(setStats, () => undefined);
      await fly(bubble, target, slotRef.current);
      setRowIn(true);
      await sleep(2200);

      // 5. The officer acts, AI writes the report, photo proof
      setChapter(4);
      for (let i = 1; i <= OFFICER_NOTES.length; i++) {
        setNote(OFFICER_NOTES.slice(0, i));
        await sleep(30);
      }
      await sleep(500);
      setPressed("polish");
      await sleep(250);
      setPressed(null);
      setPolishing(true);
      const { report: polished } = await api.demoPolish(OFFICER_NOTES, "en");
      setPolishing(false);
      setReport(polished);
      await sleep(Math.min(3200, polished.split(" ").length * 45 + 900));
      const stamp = (d: Date) => d.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
      const pics = { before: demoScene("before", stamp(new Date(Date.now() - 4 * 86_400_000))), after: demoScene("after", stamp(new Date())) };
      setPhotos(pics);
      await sleep(3600);
      setPressed("resolve");
      await sleep(250);
      setPressed(null);
      const outsBefore = outs(await pull()).length;
      await api.demoResolve(id, polished, { dataUrl: pics.before }, { dataUrl: pics.after });
      setResolved(true);
      api.stats().then(setStats, () => undefined);
      await sleep(900);

      // 6. Proof on WhatsApp, the citizen rates it
      setChapter(5);
      await waitFor(outsBefore, (m) => Boolean(m.image));
      say("आपकी शिकायत का निस्तारण हो गया है। फ़ोटो प्रमाण व्हाट्सऐप पर भेजा गया है।");
      await sleep(3200);
      after = await typeAndSend("5", 6);
      await waitFor(after, () => true, 20000);
      setStars(true);
      setElapsed(Date.now() - startedAt.current);
      await sleep(2600);
      setPhase("done");
    } catch (err) {
      setBotTyping(false);
      setPolishing(false);
      if ((err as Error).name === "AbortError") return;
      setError((err as Error).message === "timeout" ? t("The live system took too long to reply.", "लाइव सिस्टम ने उत्तर देने में अधिक समय लिया।") : (err as Error).message);
      setPhase("error");
    }
  }, [chime, department, fly, pick, say, t]);

  const queue = useMemo(() => (stats?.hotspots ?? []).filter((h) => !kase || h.departmentId === kase.departmentId).slice(0, 3), [stats, kase]);
  const deptOf = kase ? department(kase.departmentId) : undefined;
  const words = useMemo(() => report.split(" "), [report]);
  const [title, sub] = pick({ en: chapters[chapter].en.join("\u0000"), hi: chapters[chapter].hi.join("\u0000") }).split("\u0000");

  return (
    <div className={`demo demo--${phase}`}>
      <div className="demo__bg" aria-hidden="true">
        <span className="demo__blob demo__blob--a" />
        <span className="demo__blob demo__blob--b" />
        <span className="demo__blob demo__blob--c" />
        <svg className="demo__ridges" viewBox="0 0 1440 320" preserveAspectRatio="none">
          <path d="M0 250 120 190 230 230 360 140 480 210 620 120 760 200 900 130 1040 210 1190 150 1320 220 1440 170V320H0Z" />
          <path d="M0 290 160 240 300 270 450 210 610 260 760 220 930 270 1080 230 1250 270 1440 240V320H0Z" />
        </svg>
      </div>

      <header className="demo__bar">
        <Link to="/" className="demo__brand">
          <StateSeal className="demo__seal" />
          <span>
            <strong>CM Helpline 1905</strong>
            <small>{t("Live demonstration", "लाइव प्रदर्शन")}</small>
          </span>
        </Link>
        <div className="demo__tools">
          <span className="demo__clock" aria-label={t("Elapsed time", "बीता समय")}>
            <Clock3 size={16} aria-hidden="true" /> {clock(elapsed)}
          </span>
          <button type="button" className="demo__icon" onClick={() => setSound((s) => !s)} aria-pressed={sound} aria-label={sound ? t("Turn sound off", "आवाज़ बंद करें") : t("Turn sound on", "आवाज़ चालू करें")}>
            {sound ? <Volume2 size={18} aria-hidden="true" /> : <VolumeX size={18} aria-hidden="true" />}
          </button>
          {phase !== "ready" && (
            <button type="button" className="demo__icon" onClick={run} aria-label={t("Restart", "फिर से शुरू करें")}>
              <RotateCcw size={18} aria-hidden="true" />
            </button>
          )}
          <Link to="/" className="demo__icon" aria-label={t("Exit the demonstration", "प्रदर्शन से बाहर")}>
            <X size={18} aria-hidden="true" />
          </Link>
        </div>
      </header>

      <main className="demo__stage" ref={stageRef}>
        {/* Citizen */}
        <section className="demo__col demo__col--phone" aria-label={t("Citizen's WhatsApp", "नागरिक का व्हाट्सऐप")}>
          <p className="demo__tag"><MessageCircle size={14} aria-hidden="true" /> {t("Citizen · WhatsApp", "नागरिक · व्हाट्सऐप")}</p>
          <div className="phone demo__phone">
            <div className="phone__notch" aria-hidden="true" />
            <div className="phone__screen">
              <header className="wa-head">
                <span className="wa-head__avatar"><SahayakAvatar size={40} speaking={botTyping} /></span>
                <span className="wa-head__titles">
                  <strong>CM Helpline 1905 <BadgeCheck size={15} aria-hidden="true" /></strong>
                  <span>{botTyping ? t("typing…", "लिख रही हैं…") : t("Government of Uttarakhand", "उत्तराखंड सरकार")}</span>
                </span>
              </header>
              <div className="wa-log" ref={logRef} role="log" aria-live="polite">
                {messages.map((m) => (
                  <div key={m.id} className={`wa-msg wa-msg--${m.dir}`} data-no-translate>
                    {m.image && <img src={m.image} alt={t("Photo proof from the officer", "अधिकारी द्वारा फ़ोटो प्रमाण")} className="wa-msg__img" />}
                    <p>{rich(m.text)}</p>
                    <span className="wa-msg__meta">{time(m.at)} {m.dir === "in" && <CheckCheck size={14} aria-hidden="true" />}</span>
                  </div>
                ))}
                {botTyping && <div className="wa-msg wa-msg--out wa-typing" aria-hidden="true"><i /><i /><i /></div>}
              </div>
              <div className="wa-form" aria-hidden="true">
                <span className={`demo__input${draft ? " is-typing" : ""}`} data-no-translate>{draft || t("Message", "संदेश")}</span>
                <span className="demo__send"><Play size={16} /></span>
              </div>
            </div>
            {stars && (
              <div className="demo__stars" aria-hidden="true">
                {[0, 1, 2, 3, 4].map((i) => <span key={i} style={{ "--i": i } as CSSProperties}>★</span>)}
              </div>
            )}
          </div>
        </section>

        {/* State map */}
        <section className="demo__col demo__col--map" aria-label={t("Uttarakhand map", "उत्तराखंड मानचित्र")}>
          <p className="demo__tag"><MapPin size={14} aria-hidden="true" /> {t("Uttarakhand · live complaints by district", "उत्तराखंड · जनपदवार लाइव शिकायतें")}</p>
          <div className="demo__map">
            {stats && <UkMap rows={stats.byDistrict} metric="pending" selected={lit} onSelect={() => undefined} pulses={pulses} />}
            {kase && (
              <div className="demo__route" key={kase.id}>
                <span className="demo__route-dot" />
                <span>
                  <b>{kase.id}</b>
                  {deptOf ? pick(deptOf.name) : ""} · {district(kase.districtId) ? pick(district(kase.districtId)!.name) : ""}
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Officer */}
        <section className="demo__col demo__col--console" aria-label={t("Officer console", "अधिकारी कंसोल")}>
          <p className="demo__tag"><ShieldCheck size={14} aria-hidden="true" /> {t("Officer console", "अधिकारी कंसोल")}</p>
          <div className="demo__console">
            <header className="demo__officer">
              <span className="demo__officer-icon">{deptOf ? <DeptIcon id={deptOf.id} size={22} /> : <ShieldCheck size={22} aria-hidden="true" />}</span>
              <span>
                <strong>{kase?.officer ?? t("Department officer", "विभागीय अधिकारी")}</strong>
                <small>{deptOf ? pick(deptOf.name) : t("Waiting for a complaint", "शिकायत की प्रतीक्षा")}</small>
              </span>
            </header>
            <div className="demo__ws" ref={wsRef}>
              <ol className="demo__queue">
                <li ref={slotRef} className={`demo__row demo__row--new${rowIn ? " is-in" : ""}${resolved ? " is-done" : ""}`}>
                  {kase && (
                    <>
                      <span className="demo__row-title">{kase.subject}</span>
                      <span className="demo__row-meta">{kase.id} · {district(kase.districtId) ? pick(district(kase.districtId)!.name) : ""}</span>
                      <span className="demo__row-badge">{resolved ? t("Resolved", "निस्तारित") : t("New · 15 days", "नई · 15 दिन")}</span>
                    </>
                  )}
                </li>
                {queue.map((h) => (
                  <li key={h.id} className="demo__row">
                    <span className="demo__row-title">{h.subject}</span>
                    <span className="demo__row-meta">{h.id} · {district(h.districtId) ? pick(district(h.districtId)!.name) : ""}</span>
                  </li>
                ))}
              </ol>

              {rowIn && kase && (
                <div className="demo__case">
                  <p className="demo__label">{t("Action taken", "की गई कार्यवाही")}</p>
                  <div className={`demo__note${report ? " is-polished" : ""}${polishing ? " is-polishing" : ""}`} data-no-translate>
                    {report ? words.map((w, i) => <span key={i} style={{ "--i": i } as CSSProperties}>{w} </span>) : <>{note}<i className="demo__caret" /></>}
                  </div>
                  <button type="button" tabIndex={-1} className={`demo__btn demo__btn--ai${pressed === "polish" ? " is-pressed" : ""}`}>
                    <Sparkles size={15} aria-hidden="true" /> {polishing ? t("Writing the report…", "रिपोर्ट लिखी जा रही है…") : report ? t("Polished by AI", "AI द्वारा सुधारा गया") : t("Polish with AI", "AI से सुधारें")}
                  </button>
                  {photos && (
                    <div className="demo__proof">
                      <BeforeAfter before={{ dataUrl: photos.before }} after={{ dataUrl: photos.after }} />
                    </div>
                  )}
                  {photos && (
                    <button type="button" tabIndex={-1} className={`demo__btn demo__btn--ok${pressed === "resolve" ? " is-pressed" : ""}${resolved ? " is-done" : ""}`}>
                      <CheckCircle2 size={16} aria-hidden="true" /> {resolved ? t("Resolved with photo proof", "फ़ोटो प्रमाण सहित निस्तारित") : t("Mark resolved", "निस्तारित करें")}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        <div ref={flyRef} className="demo__fly" aria-hidden="true">
          <MessageCircle size={16} />
          <span>{kase?.id ?? "CMH"}</span>
        </div>
      </main>

      <footer className="demo__rail">
        <div className="demo__caption" aria-live="polite" key={chapter}>
          <span className="demo__step">{String(chapter + 1).padStart(2, "0")}<small>/06</small></span>
          <span>
            <strong>{title}</strong>
            <span>{sub}</span>
          </span>
        </div>
        <ol className="demo__chapters" aria-label={t("Steps", "चरण")}>
          {chapters.map((c, i) => (
            <li key={i} className={i < chapter || phase === "done" ? "is-past" : i === chapter && phase === "running" ? "is-now" : ""}>
              <span>{pick({ en: c.en[0], hi: c.hi[0] })}</span>
            </li>
          ))}
        </ol>
      </footer>

      {phase === "ready" && (
        <div className="demo__overlay">
          <div className="demo__intro">
            <p className="demo__kicker">{t("Live demonstration · about 60 seconds", "लाइव प्रदर्शन · लगभग 60 सेकंड")}</p>
            <h1>{t("One grievance, from first message to photo proof", "एक शिकायत, पहले संदेश से फ़ोटो प्रमाण तक")}</h1>
            <p>{t("A citizen in Pauri reports a landslide on WhatsApp in Hinglish. Watch it reach the right officer, get resolved with proof, and come back to the citizen. Everything here runs on the live system: real AI, real database, real escalation rules.", "पौड़ी के एक नागरिक व्हाट्सऐप पर हिंग्लिश में भूस्खलन की सूचना देते हैं। देखें कैसे यह सही अधिकारी तक पहुँचती है, प्रमाण सहित निस्तारित होती है और नागरिक तक लौटती है। सब कुछ लाइव सिस्टम पर: वास्तविक AI, वास्तविक डेटाबेस, वास्तविक नियम।")}</p>
            <div className="demo__intro-actions">
              <button type="button" className="demo__play" onClick={run} autoFocus>
                <span className="demo__play-ring" aria-hidden="true" />
                <Play size={22} aria-hidden="true" /> {t("Start the demonstration", "प्रदर्शन शुरू करें")}
              </button>
              <button type="button" className="demo__ghost" onClick={() => setSound((s) => !s)} aria-pressed={sound}>
                {sound ? <Volume2 size={18} aria-hidden="true" /> : <VolumeX size={18} aria-hidden="true" />} {sound ? t("Sound on", "आवाज़ चालू") : t("Sound off", "आवाज़ बंद")}
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === "done" && (
        <div className="demo__overlay demo__overlay--end">
          <div className="demo__intro demo__end">
            <span className="demo__end-check" aria-hidden="true"><CheckCircle2 size={44} /></span>
            <p className="demo__kicker">{kase?.id}</p>
            <h2>{t(`Registered, resolved and rated in ${clock(elapsed)}`, `${clock(elapsed)} में दर्ज, निस्तारित और रेटिंग प्राप्त`)}</h2>
            <ul className="demo__facts">
              <li><b>1</b> {t("WhatsApp chat, in Hinglish", "व्हाट्सऐप चैट, हिंग्लिश में")}</li>
              <li><b>0</b> {t("office visits or forms", "कार्यालय चक्कर या फ़ॉर्म")}</li>
              <li><b>15</b> {t("days before it moves up automatically", "दिन बाद स्वतः उच्च स्तर पर")}</li>
              <li><b>📍</b> {t("geo-tagged photo proof", "स्थान-अंकित फ़ोटो प्रमाण")}</li>
            </ul>
            <div className="demo__intro-actions">
              <button type="button" className="demo__play" onClick={run}><RotateCcw size={20} aria-hidden="true" /> {t("Watch again", "फिर देखें")}</button>
              <Link className="demo__ghost" to="/whatsapp">{t("Try WhatsApp yourself", "स्वयं व्हाट्सऐप आज़माएँ")}</Link>
              {kase && <Link className="demo__ghost" to={`/track?id=${kase.id}&mobile=${MOBILE}`}>{t("Track this complaint", "यह शिकायत देखें")}</Link>}
            </div>
          </div>
        </div>
      )}

      {phase === "error" && (
        <div className="demo__overlay">
          <div className="demo__intro">
            <h2>{t("The demonstration stopped", "प्रदर्शन रुक गया")}</h2>
            <p>{error}</p>
            <div className="demo__intro-actions">
              <button type="button" className="demo__play" onClick={run}><RotateCcw size={20} aria-hidden="true" /> {t("Try again", "फिर प्रयास करें")}</button>
              <Link className="demo__ghost" to="/whatsapp">{t("Open the WhatsApp demo", "व्हाट्सऐप डेमो खोलें")}</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
