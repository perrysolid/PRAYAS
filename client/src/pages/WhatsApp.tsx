import { Fragment, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, Bell, Camera, CheckCheck, MessageCircle, Send, Sparkles, Star } from "lucide-react";
import { PageHead } from "../components/PageHead";
import { SahayakAvatar } from "../components/SahayakAvatar";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";
import { api, type WhatsAppMessage } from "../lib/api";

/** WhatsApp's *bold* markup, rendered safely as React nodes. */
function rich(text: string): ReactNode {
  return text.split(/(\*[^*\n]+\*)/g).map((part, i) => (part.startsWith("*") && part.endsWith("*") && part.length > 2 ? <strong key={i}>{part.slice(1, -1)}</strong> : <Fragment key={i}>{part}</Fragment>));
}

const time = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

export function WhatsApp() {
  const { t } = useI18n();
  const { session } = useAuth();
  const [status, setStatus] = useState<{ mode: string; ai: boolean; demoMobiles: string[] } | null>(null);
  const [mobile, setMobile] = useState("9876543210");
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [text, setText] = useState("");
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState("");
  const logRef = useRef<HTMLDivElement>(null);
  const seen = useRef(0);

  useEffect(() => {
    api.waStatus().then(setStatus).catch(() => setStatus(null));
  }, []);
  useEffect(() => {
    if (session?.role === "citizen") setMobile(session.mobile);
  }, [session]);

  // Poll the thread: officer actions elsewhere arrive here within a couple of seconds.
  useEffect(() => {
    let alive = true;
    const load = () =>
      api
        .waThread(mobile)
        .then((m) => {
          if (!alive) return;
          setMessages(m);
          setError("");
          const outs = m.filter((x) => x.dir === "out").length;
          if (outs > seen.current) setWaiting(false);
          seen.current = outs;
        })
        .catch((e: Error) => alive && setError(e.message));
    load();
    const id = window.setInterval(load, 2500);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [mobile]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, waiting]);

  const sendText = async (value: string) => {
    const v = value.trim();
    if (!v) return;
    setText("");
    setWaiting(true);
    setMessages((m) => [...m, { id: `local-${Date.now()}`, mobile, dir: "in", text: v, at: new Date().toISOString(), status: "received" }]);
    try {
      await api.waSend(mobile, v);
      setMessages(await api.waThread(mobile));
      window.setTimeout(() => setWaiting(false), 4000);
    } catch (e) {
      setWaiting(false);
      setError((e as Error).message);
    }
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    sendText(text);
  };

  const samples = [
    t("Hi", "नमस्ते"),
    t("Pothole on the Pauri–Srinagar road near Khirsu bend for a month, two bikes fell", "पौड़ी–श्रीनगर मार्ग पर खिर्सू मोड़ के पास एक महीने से गड्ढा है, दो बाइक गिर चुकी हैं"),
    "STATUS",
    "REMIND",
  ];

  return (
    <>
      <PageHead
        en="Every update on WhatsApp"
        hi="हर अद्यतन व्हाट्सऐप पर"
        lead={t(
          "Register by chatting, and get every step on the WhatsApp number you registered with: who has it, escalations, the officer's notes and the photo proof when it's fixed. AI writes your complaint formally and routes it.",
          "चैट से शिकायत दर्ज करें और पंजीकृत व्हाट्सऐप नंबर पर हर चरण पाएँ: किसके पास है, ऊपर भेजा जाना, अधिकारी की टिप्पणी और समाधान की फ़ोटो। AI आपकी शिकायत औपचारिक भाषा में लिखकर सही विभाग तक भेजता है।",
        )}
      />
      <div className="container wa-page">
        <div className="wa-info">
          <ul className="wa-features">
            {[
              { Icon: Sparkles, title: t("Register in your words", "अपने शब्दों में दर्ज करें"), text: t("Type it the way you'd say it. AI writes it formally, finds the department and asks for the district.", "जैसे बोलते हैं वैसे लिखें। AI औपचारिक भाषा में लिखकर विभाग खोजता है और जनपद पूछता है।") },
              { Icon: Bell, title: t("Every change, as it happens", "हर बदलाव, तुरंत"), text: t("Registration, officer notes, automatic escalation, reminders and reopening.", "पंजीकरण, अधिकारी की टिप्पणी, स्वतः ऊपर भेजा जाना, अनुस्मारक और पुनः खोलना।") },
              { Icon: Camera, title: t("Photo proof when it's fixed", "समाधान पर फ़ोटो प्रमाण"), text: t("The officer's geo-tagged photo arrives with the resolution.", "अधिकारी की स्थान-अंकित फ़ोटो समाधान के साथ आती है।") },
              { Icon: Star, title: t("Rate or reopen by replying", "जवाब देकर रेटिंग या पुनः खोलें"), text: t("Reply 1–5 to rate, REOPEN if it isn't fixed, REMIND to nudge the officer.", "रेटिंग हेतु 1–5, समस्या बनी रहे तो REOPEN, अनुस्मारक हेतु REMIND।") },
            ].map(({ Icon, title, text: body }) => (
              <li key={title}>
                <span className="wa-features__icon"><Icon size={20} aria-hidden="true" /></span>
                <span><strong>{title}</strong>{body}</span>
              </li>
            ))}
          </ul>

          <div className="card wa-try">
            <h2>{t("Try the full journey", "पूरी यात्रा आज़माएँ")}</h2>
            <ol className="wa-steps">
              <li>{t("Send a problem from the phone, then reply with the district and “yes”.", "फ़ोन से समस्या भेजें, फिर जनपद और “हाँ” लिखें।")}</li>
              <li>
                {t("Sign in as officer ", "अधिकारी के रूप में साइन इन करें ")}<code>ee.pwd.pauri</code> / <code>Demo@1905</code>{" "}
                {t("in a new tab and resolve it with a photo.", "नए टैब में, और फ़ोटो के साथ निस्तारित करें।")} <Link to="/officer" target="_blank">{t("Open officer console", "अधिकारी कंसोल खोलें")}</Link>
              </li>
              <li>{t("Watch the update and photo arrive here, then reply 5.", "अद्यतन और फ़ोटो यहाँ आते देखें, फिर 5 लिखें।")}</li>
            </ol>
            <p className="small muted">
              {status?.mode === "cloud"
                ? t("Connected to WhatsApp Business: messages also go to the real number.", "व्हाट्सऐप बिज़नेस से जुड़ा: संदेश असली नंबर पर भी जाते हैं।")
                : t("Demo mode: messages are simulated here. Connecting a WhatsApp Business number sends the same messages for real.", "डेमो मोड: संदेश यहाँ सिम्युलेट होते हैं। व्हाट्सऐप बिज़नेस नंबर जोड़ने पर यही संदेश असली नंबर पर जाते हैं।")}
            </p>
            {session?.role !== "citizen" && (
              <p className="small muted">{t("Showing the demo number 98765 43210. Sign in to see your own number's messages.", "डेमो नंबर 98765 43210 दिखाया जा रहा है। अपने नंबर के संदेश देखने हेतु साइन इन करें।")}</p>
            )}
          </div>
        </div>

        <div className="phone" aria-label={t("WhatsApp conversation (demo)", "व्हाट्सऐप बातचीत (डेमो)")}>
          <div className="phone__notch" aria-hidden="true" />
          <div className="phone__screen">
            <header className="wa-head">
              <span className="wa-head__avatar"><SahayakAvatar size={40} speaking={waiting} /></span>
              <span className="wa-head__titles">
                <strong>CM Helpline 1905 <BadgeCheck size={15} aria-hidden="true" /></strong>
                <span>{waiting ? t("typing…", "लिख रही हैं…") : t("Government of Uttarakhand · Sahayak", "उत्तराखंड सरकार · सहायक")}</span>
              </span>
              <span className="wa-head__badge">{status?.mode === "cloud" ? "Live" : t("Demo", "डेमो")}</span>
            </header>
            <div className="wa-log" ref={logRef} role="log" aria-live="polite">
              <p className="wa-day">{t("Messages are end-to-end encrypted on real WhatsApp. This is a prototype.", "असली व्हाट्सऐप पर संदेश एंड-टू-एंड एन्क्रिप्टेड होते हैं। यह प्रोटोटाइप है।")}</p>
              {messages.map((m) => (
                <div key={m.id} className={`wa-msg wa-msg--${m.dir}`} data-no-translate>
                  {m.image && <img src={m.image} alt={t("Photo proof from the officer", "अधिकारी द्वारा फ़ोटो प्रमाण")} className="wa-msg__img" />}
                  <p>{rich(m.text)}</p>
                  <span className="wa-msg__meta">
                    {time(m.at)} {m.dir === "out" ? null : <CheckCheck size={14} aria-hidden="true" />}
                  </span>
                </div>
              ))}
              {waiting && <div className="wa-msg wa-msg--out wa-typing" aria-label={t("Sahayak is typing", "सहायक लिख रही हैं")}><i /><i /><i /></div>}
            </div>
            <div className="wa-chips">
              {samples.map((s) => (
                <button key={s} type="button" onClick={() => sendText(s)} disabled={waiting}>{s.length > 34 ? `${s.slice(0, 32)}…` : s}</button>
              ))}
            </div>
            <form className="wa-form" onSubmit={submit}>
              <label htmlFor="wa-input" className="visually-hidden">{t("Message", "संदेश")}</label>
              <input id="wa-input" value={text} onChange={(e) => setText(e.target.value)} placeholder={t("Message", "संदेश")} autoComplete="off" maxLength={1000} />
              <button type="submit" disabled={!text.trim()} aria-label={t("Send", "भेजें")}><Send size={18} aria-hidden="true" /></button>
            </form>
          </div>
        </div>
        {error && <p className="field__error" role="alert">{error}</p>}
      </div>
      <p className="container small muted wa-foot"><MessageCircle size={14} aria-hidden="true" /> {t("Updates go only to the number that registered the complaint, and to citizens who joined it.", "अद्यतन केवल शिकायत दर्ज करने वाले नंबर और उससे जुड़े नागरिकों को जाते हैं।")}</p>
    </>
  );
}
