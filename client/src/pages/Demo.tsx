import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, BadgeCheck, Camera, CheckCheck, CheckCircle2, Globe, Home as HomeIcon, Mic, MessageCircle, Pause, Play, RotateCcw, ShieldCheck, SkipForward, Sparkles, X } from "lucide-react";
import { SahayakAvatar } from "../components/SahayakAvatar";
import { StateSeal } from "../components/Seal";
import { useI18n } from "../context/I18nContext";
import { useMeta } from "../context/MetaContext";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { api } from "../lib/api";
import { demoScene } from "../lib/demoScene";
import type { Level } from "../lib/types";
import { rich } from "./WhatsApp";
import "../styles/demo.css";

/* ------------------------------------------------------------------ */
/* Script                                                              */
/* ------------------------------------------------------------------ */

type Group = "start" | "whatsapp" | "website" | "officer" | "citizen" | "end";
type Scene = { id: string; group: Group; min: number; en: string; hi: string };

const scenes: Scene[] = [
  { id: "intro", group: "start", min: 7000, en: "Here's how a citizen's problem gets solved on CM Helpline 1905. There are two simple ways to report it: WhatsApp, or the website.", hi: "देखिए, सीएम हेल्पलाइन 1905 पर नागरिक की समस्या कैसे हल होती है। समस्या बताने के दो आसान तरीके हैं: व्हाट्सऐप, या वेबसाइट।" },
  { id: "wa-send", group: "whatsapp", min: 7000, en: "First, WhatsApp. Ramesh from Pauri types his problem in his own words. A landslide has blocked his village road.", hi: "पहला, व्हाट्सऐप। पौड़ी के रमेश अपने शब्दों में समस्या लिखते हैं। भूस्खलन से गाँव की सड़क बंद है।" },
  { id: "wa-ai", group: "whatsapp", min: 7000, en: "The AI understands it, picks the right department, Public Works, and asks only for the district.", hi: "AI इसे समझता है, सही विभाग, लोक निर्माण विभाग, चुनता है, और केवल जनपद पूछता है।" },
  { id: "wa-done", group: "whatsapp", min: 7500, en: "It writes the complaint formally. Ramesh replies yes, and gets his complaint number right away.", hi: "वह शिकायत औपचारिक भाषा में लिखता है। रमेश हाँ कहते हैं, और उन्हें तुरंत शिकायत संख्या मिल जाती है।" },
  { id: "web-speak", group: "website", min: 7500, en: "Now the website. Kamla Devi from Almora has had no water for ten days. She just speaks her problem in Hindi.", hi: "अब वेबसाइट। अल्मोड़ा की कमला देवी के घर दस दिन से पानी नहीं आया। वे बस हिंदी में बोलकर समस्या बताती हैं।" },
  { id: "web-submit", group: "website", min: 7500, en: "The site suggests Jal Sansthan. She adds a photo, verifies her mobile, and chooses updates on WhatsApp. Done.", hi: "साइट जल संस्थान सुझाती है। वे फ़ोटो जोड़ती हैं, मोबाइल सत्यापित करती हैं, और व्हाट्सऐप पर अद्यतन चुनती हैं। हो गया।" },
  { id: "flow", group: "officer", min: 7000, en: "Both complaints land in one system and go straight to the officer responsible, in the right district.", hi: "दोनों शिकायतें एक ही प्रणाली में आती हैं और सीधे सही जनपद के ज़िम्मेदार अधिकारी तक पहुँचती हैं।" },
  { id: "queue", group: "officer", min: 6500, en: "The officer sees them at the top of the queue, with the deadline for each one.", hi: "अधिकारी उन्हें अपनी कतार में सबसे ऊपर देखते हैं, हर एक की समय सीमा के साथ।" },
  { id: "escalate", group: "officer", min: 7000, en: "If nothing happens in fifteen days, the complaint moves up to a senior officer automatically.", hi: "अगर पंद्रह दिन में कार्यवाही नहीं होती, तो शिकायत अपने आप वरिष्ठ अधिकारी तक चली जाती है।" },
  { id: "resolve", group: "officer", min: 9000, en: "The officer writes quick notes. AI turns them into a proper report, and a photo of the fix is required to close it.", hi: "अधिकारी छोटे नोट्स लिखते हैं। AI उन्हें सही रिपोर्ट बनाता है, और बंद करने के लिए समाधान की फ़ोटो ज़रूरी है।" },
  { id: "citizen", group: "citizen", min: 7500, en: "Ramesh gets the photo on WhatsApp and rates the work. If it isn't fixed, he can reopen it.", hi: "रमेश को फ़ोटो व्हाट्सऐप पर मिलती है और वे काम को रेटिंग देते हैं। समस्या बनी रहे तो वे इसे फिर खोल सकते हैं।" },
  { id: "end", group: "end", min: 7000, en: "That's CM Helpline 1905. Simple for citizens, accountable for officers. Taking you back to the home page.", hi: "यह है सीएम हेल्पलाइन 1905। नागरिकों के लिए आसान, अधिकारियों के लिए जवाबदेह। अब आपको होम पेज पर ले चलते हैं।" },
];

const voices = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
  { code: "gbm", label: "गढ़वळि" },
  { code: "kfy", label: "कुमाऊँनी" },
  { code: "jns", label: "जौनसारी" },
] as const;
type Voice = (typeof voices)[number]["code"];

const WA = "CMH-2026-004701";
const WEB = "CMH-2026-004702";
const SILENCE = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";

/* ------------------------------------------------------------------ */
/* Timing helpers: every visual is a pure function of the scene clock  */
/* ------------------------------------------------------------------ */

const clamp = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => 1 - Math.pow(1 - x, 3);
const p = (t: number, start: number, dur = 600) => ease(clamp((t - start) / dur));
const show = (t: number, start: number, dur = 600, y = 18): CSSProperties => {
  const k = p(t, start, dur);
  return { opacity: k, transform: `translateY(${(1 - k) * y}px) scale(${0.97 + 0.03 * k})` };
};
const typed = (text: string, t: number, start: number, cps = 32) => text.slice(0, Math.max(0, Math.min(text.length, Math.floor(((t - start) / 1000) * cps))));
const pressed = (t: number, at: number) => t >= at && t < at + 220;

/* ------------------------------------------------------------------ */
/* Building blocks                                                     */
/* ------------------------------------------------------------------ */

type Msg = { from: "me" | "bot"; text: string; scene: number; at: number; image?: string };

function Phone({ msgs, scene, t, draft, typing }: { msgs: Msg[]; scene: number; t: number; draft?: { text: string; start: number; sent: number; cps?: number }; typing?: [number, number] }) {
  const { t: tr } = useI18n();
  const visible = msgs.filter((m) => m.scene < scene || (m.scene === scene && t >= m.at));
  const log = useRef<HTMLDivElement>(null);
  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight, behavior: "smooth" });
  }, [visible.length]);
  const isTyping = typing && t >= typing[0] && t < typing[1];
  const text = draft && t >= draft.start && t < draft.sent ? typed(draft.text, t, draft.start, draft.cps) : "";
  return (
    <div className="dm-phone">
      <div className="dm-phone__notch" />
      <div className="dm-phone__screen">
        <header className="wa-head">
          <span className="wa-head__avatar"><SahayakAvatar size={40} speaking={Boolean(isTyping)} /></span>
          <span className="wa-head__titles">
            <strong>CM Helpline 1905 <BadgeCheck size={15} aria-hidden="true" /></strong>
            <span>{isTyping ? tr("typing…", "लिख रही हैं…") : tr("Government of Uttarakhand", "उत्तराखंड सरकार")}</span>
          </span>
        </header>
        <div className="wa-log" ref={log}>
          {visible.map((m, i) => (
            <div key={i} className={`wa-msg ${m.from === "me" ? "wa-msg--in" : "wa-msg--out"}`} data-no-translate>
              {m.image && <img src={m.image} alt="" className="wa-msg__img" />}
              <p>{rich(m.text)}</p>
              <span className="wa-msg__meta">10:4{Math.min(9, i)} am {m.from === "me" && <CheckCheck size={14} aria-hidden="true" />}</span>
            </div>
          ))}
          {isTyping && <div className="wa-msg wa-msg--out wa-typing"><i /><i /><i /></div>}
        </div>
        <div className="dm-phone__input">
          <span className={text ? "is-typing" : ""} data-no-translate>{text || tr("Message", "संदेश")}</span>
          <i className={draft && pressed(t, draft.sent - 200) ? "is-pressed" : ""}><ArrowRight size={16} /></i>
        </div>
      </div>
    </div>
  );
}

function Browser({ url, children }: { url: string; children: ReactNode }) {
  return (
    <div className="dm-browser">
      <div className="dm-browser__bar">
        <span className="dm-browser__dots"><i /><i /><i /></span>
        <span className="dm-browser__url">🔒 cmhelpline.uk.gov.in{url}</span>
      </div>
      <div className="dm-browser__body">{children}</div>
    </div>
  );
}

/** The one thing to notice in this step, shown large beside the main visual. */
function Point({ t, at = 900, icon, title, text }: { t: number; at?: number; icon: ReactNode; title: string; text?: string }) {
  return (
    <div className="dm-point" style={show(t, at, 700, 24)}>
      <span className="dm-point__icon">{icon}</span>
      <strong>{title}</strong>
      {text && <span>{text}</span>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Scenes                                                              */
/* ------------------------------------------------------------------ */

function SceneView({ id, index, t, photos }: { id: string; index: number; t: number; photos: { before: string; after: string } }) {
  const { t: tr, pick } = useI18n();
  const { meta } = useMeta();

  const waMsgs: Msg[] = [
    { from: "me", scene: 1, at: 4300, text: "Namaste. Khirsu–Chaubatia road par landslide ka malba pada hai, 4 din se road band hai. School bus nahi aa rahi" },
    { from: "bot", scene: 2, at: 1700, text: tr("Understood. This is for *Public Works (Roads)*.\n\nWhich district is this in?", "समझ गई। यह *लोक निर्माण विभाग* का विषय है।\n\nयह किस जनपद में है?") },
    { from: "me", scene: 2, at: 4300, text: "Pauri" },
    { from: "bot", scene: 3, at: 900, text: tr("I've written it formally:\n\n*Removal of landslide debris, Khirsu–Chaubatia road*\n🏢 Public Works · 📍 Pauri · ⚠️ Urgent\n\nReply *YES* to register.", "मैंने शिकायत औपचारिक भाषा में लिखी है:\n\n*खिर्सू–चौबटिया मार्ग से भूस्खलन मलबा हटाना*\n🏢 लोक निर्माण · 📍 पौड़ी · ⚠️ अत्यावश्यक\n\nदर्ज करने हेतु *हाँ* लिखें।") },
    { from: "me", scene: 3, at: 3300, text: "haan" },
    { from: "bot", scene: 3, at: 4500, text: tr(`✅ Registered: *${WA}*\nAction due by 15 November. Every update will come here.`, `✅ दर्ज: *${WA}*\n15 नवंबर तक कार्यवाही। हर अद्यतन यहीं आएगा।`) },
    { from: "bot", scene: 10, at: 900, image: photos.after, text: tr(`✅ *${WA}* is resolved.\n“Debris removed with a JCB; road open both ways.”\n\nReply *1* to *5* to rate, or *REOPEN*.`, `✅ *${WA}* का निस्तारण हो गया।\n“JCB से मलबा हटाया; सड़क दोनों ओर से खुली।”\n\nरेटिंग हेतु *1* से *5*, या *REOPEN*।`) },
    { from: "me", scene: 10, at: 3600, text: "5" },
    { from: "bot", scene: 10, at: 4600, text: tr("🙏 Thank you for rating. The complaint is now closed.", "🙏 रेटिंग के लिए धन्यवाद। शिकायत बंद कर दी गई है।") },
  ];

  switch (id) {
    case "intro":
      return (
        <div className="dm-intro">
          <div className="dm-way" style={show(t, 300, 700, 30)}>
            <span className="dm-way__icon dm-way__icon--wa"><MessageCircle size={40} /></span>
            <strong>WhatsApp</strong>
            <span>{tr("Chat in your own words", "अपने शब्दों में चैट करें")}</span>
          </div>
          <div className="dm-or" style={show(t, 900)}>{tr("or", "या")}</div>
          <div className="dm-way" style={show(t, 1200, 700, 30)}>
            <span className="dm-way__icon dm-way__icon--web"><Globe size={40} /></span>
            <strong>{tr("Website", "वेबसाइट")}</strong>
            <span>{tr("Type or speak, in any language", "किसी भी भाषा में लिखें या बोलें")}</span>
          </div>
          <div className="dm-into" style={show(t, 2600, 700)}>
            <ArrowRight size={28} aria-hidden="true" />
            <StateSeal className="dm-into__seal" />
            <span>{tr("One system, one officer, one deadline", "एक प्रणाली, एक अधिकारी, एक समय सीमा")}</span>
          </div>
        </div>
      );

    case "wa-send":
    case "wa-ai":
    case "wa-done":
    case "citizen": {
      const draft =
        id === "wa-send" ? { text: waMsgs[0].text, start: 900, sent: 4300, cps: 46 }
        : id === "wa-ai" ? { text: "Pauri", start: 3300, sent: 4300, cps: 8 }
        : id === "wa-done" ? { text: "haan", start: 2600, sent: 3300, cps: 8 }
        : { text: "5", start: 3100, sent: 3600, cps: 4 };
      const typing: [number, number] | undefined = id === "wa-ai" ? [400, 1700] : id === "wa-done" ? [3400, 4500] : id === "citizen" ? [3700, 4600] : undefined;
      return (
        <div className="dm-split">
          <Phone msgs={waMsgs} scene={index} t={t} draft={draft} typing={typing} />
          {id === "wa-send" && <Point t={t} at={1200} icon={<MessageCircle size={26} />} title={tr("Writes in Hinglish", "हिंग्लिश में लिखते हैं")} text={tr("No app, no form, no office visit", "न ऐप, न फ़ॉर्म, न कार्यालय")} />}
          {id === "wa-ai" && <Point t={t} at={1900} icon={<Sparkles size={26} />} title={tr("AI picks the department", "AI विभाग चुनता है")} text={tr("Public Works · asks only for the district", "लोक निर्माण · केवल जनपद पूछता है")} />}
          {id === "wa-done" && <Point t={t} at={4700} icon={<CheckCircle2 size={26} />} title={WA} text={tr("Registered in under a minute", "एक मिनट से कम में दर्ज")} />}
          {id === "citizen" && (
            <div className="dm-col">
              <Point t={t} at={1300} icon={<Camera size={26} />} title={tr("Photo proof on WhatsApp", "व्हाट्सऐप पर फ़ोटो प्रमाण")} text={tr("Rate it 1–5, or reopen it", "1–5 रेटिंग दें, या पुनः खोलें")} />
              {t > 3800 && (
                <div className="dm-stars" aria-hidden="true">
                  {[0, 1, 2, 3, 4].map((i) => <span key={i} style={{ "--i": i } as CSSProperties}>★</span>)}
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    case "web-speak": {
      const spoken = "मेरे घर पिछले दस दिन से पानी नहीं आ रहा है। वार्ड 4, अल्मोड़ा।";
      const listening = t > 900 && t < 4300;
      return (
        <div className="dm-split">
          <Browser url="/">
            <div className="dm-site">
              <div className="dm-site__head"><StateSeal className="dm-site__seal" /> <strong>CM Helpline 1905</strong></div>
              <div className="dm-site__hero">
                <h3>{tr("Tell us the problem.", "समस्या बताइए।")}</h3>
                <div className="dm-site__box">
                  <p className="dm-site__label">{tr("What is the problem?", "समस्या क्या है?")}</p>
                  <div className="dm-site__input" data-no-translate>{typed(spoken, t, 1300, 16) || <span className="dm-muted">{tr("Write it in your own words…", "अपने शब्दों में लिखें…")}</span>}</div>
                  <div className="dm-site__row">
                    <span className={`dm-mic${listening ? " is-on" : ""}`}><Mic size={18} /> {listening ? tr("Listening…", "सुन रहे हैं…") : tr("Speak", "बोलें")}{listening && <i className="dm-wave"><b /><b /><b /><b /><b /></i>}</span>
                    <span className={`dm-btn${pressed(t, 5600) ? " is-pressed" : ""}`}>{tr("Find the right department", "सही विभाग खोजें")} <ArrowRight size={16} /></span>
                  </div>
                </div>
              </div>
            </div>
          </Browser>
          <Point t={t} at={1500} icon={<Mic size={26} />} title={tr("Speaks in Hindi", "हिंदी में बोलती हैं")} text={tr("Works in 15 languages, including Garhwali, Kumaoni and Jaunsari", "गढ़वाली, कुमाऊँनी और जौनसारी सहित 15 भाषाओं में")} />
        </div>
      );
    }

    case "web-submit":
      return (
        <div className="dm-split">
          <Browser url="/register">
            <div className="dm-site dm-form">
              <ol className="dm-steps">
                {[tr("Describe", "विवरण"), tr("Details", "जानकारी"), tr("Verify", "सत्यापन"), tr("Done", "पूर्ण")].map((s, i) => (
                  <li key={s} className={t > [0, 600, 2600, 4600][i] ? "is-on" : ""}>{s}</li>
                ))}
              </ol>
              <div className="dm-suggest" style={show(t, 500)}>
                <Sparkles size={18} /> <span><b>{tr("Uttarakhand Jal Sansthan", "उत्तराखंड जल संस्थान")}</b> · {tr("Drinking water supply", "पेयजल आपूर्ति")}</span> <CheckCircle2 size={18} className="dm-ok" />
              </div>
              <div className="dm-form__grid">
                <div className="dm-thumb" style={show(t, 1300)}><Camera size={18} /> {tr("Photo added · Ward 4, Almora", "फ़ोटो जोड़ी · वार्ड 4, अल्मोड़ा")}</div>
                <label className={`dm-check${t > 2100 ? " is-on" : ""}`}><i>{t > 2100 && "✓"}</i> {tr("Send every update on WhatsApp", "हर अद्यतन व्हाट्सऐप पर भेजें")}</label>
              </div>
              <div className="dm-otp" style={show(t, 2600)}>
                <span>{tr("OTP sent to 98765 ••••1", "OTP भेजा गया 98765 ••••1")}</span>
                <span className="dm-otp__boxes">{"481905".split("").map((d, i) => <b key={i}>{t > 3000 + i * 160 ? d : ""}</b>)}</span>
              </div>
              <span className={`dm-btn dm-btn--wide${pressed(t, 4300) ? " is-pressed" : ""}`} style={show(t, 3900)}>{tr("Submit complaint", "शिकायत जमा करें")}</span>
              {t > 4600 && (
                <div className="dm-receipt">
                  <CheckCircle2 size={34} />
                  <strong>{WEB}</strong>
                  <span>{tr("Registered · updates on WhatsApp", "दर्ज · अद्यतन व्हाट्सऐप पर")}</span>
                </div>
              )}
            </div>
          </Browser>
          <Point t={t} at={4800} icon={<CheckCircle2 size={26} />} title={WEB} text={tr("Department suggested, photo, OTP: done", "विभाग सुझाव, फ़ोटो, OTP: पूर्ण")} />
        </div>
      );

    case "flow":
      return (
        <div className="dm-flow">
          <svg viewBox="0 0 900 380" className="dm-flow__lines" aria-hidden="true">
            {["M190 95 C 320 95 330 190 420 190", "M190 285 C 320 285 330 190 420 190", "M480 190 C 570 190 580 95 710 95", "M480 190 C 570 190 580 285 710 285"].map((d, i) => (
              <g key={d}>
                <path d={d} className="dm-flow__path" style={{ strokeDashoffset: 400 * (1 - p(t, 500 + (i > 1 ? 1800 : 0), 1000)) }} />
                {t > (i > 1 ? 2600 : 1000) && (
                  <circle r="7" className={`dm-flow__dot dm-flow__dot--${i % 2 ? "web" : "wa"}`}>
                    <animateMotion dur="1.6s" repeatCount="indefinite" path={d} />
                  </circle>
                )}
              </g>
            ))}
          </svg>
          <div className="dm-node dm-node--wa" style={show(t, 100)}><MessageCircle size={22} /><span><b>WhatsApp</b>{WA}</span></div>
          <div className="dm-node dm-node--web" style={show(t, 300)}><Globe size={22} /><span><b>{tr("Website", "वेबसाइट")}</b>{WEB}</span></div>
          <div className="dm-hub" style={show(t, 1300, 700)}><StateSeal className="dm-hub__seal" /><b>CM Helpline 1905</b><span>{tr("Routes to the officer", "अधिकारी तक भेजती है")}</span></div>
          <div className="dm-node dm-node--pwd" style={show(t, 2900)}><ShieldCheck size={22} /><span><b>{tr("Public Works", "लोक निर्माण")}</b>{tr("Pauri", "पौड़ी")}</span></div>
          <div className="dm-node dm-node--jal" style={show(t, 3200)}><ShieldCheck size={22} /><span><b>{tr("Jal Sansthan", "जल संस्थान")}</b>{tr("Almora", "अल्मोड़ा")}</span></div>
        </div>
      );

    case "queue": {
      const rows = [
        { id: WA, title: tr("Landslide debris on Khirsu–Chaubatia road", "खिर्सू–चौबटिया मार्ग पर भूस्खलन मलबा"), where: tr("Pauri · via WhatsApp", "पौड़ी · व्हाट्सऐप से"), due: tr("15 days left", "15 दिन शेष"), at: 900, fresh: true },
        { id: WEB, title: tr("No water supply for 10 days, Ward 4", "वार्ड 4 में 10 दिन से जलापूर्ति बंद"), where: tr("Almora · via website", "अल्मोड़ा · वेबसाइट से"), due: tr("15 days left", "15 दिन शेष"), at: 1500, fresh: true },
        { id: "CMH-2026-004660", title: tr("Street light not working", "स्ट्रीट लाइट खराब"), where: tr("Nainital", "नैनीताल"), due: tr("6 days left", "6 दिन शेष"), at: 0, fresh: false },
        { id: "CMH-2026-004612", title: tr("Pension not received", "पेंशन नहीं मिली"), where: tr("Tehri", "टिहरी"), due: tr("9 days left", "9 दिन शेष"), at: 0, fresh: false },
      ];
      return (
        <div className="dm-split">
          <Browser url="/officer">
            <div className="dm-site dm-console">
              <div className="dm-console__head"><ShieldCheck size={20} /> <b>{tr("Officer console", "अधिकारी कंसोल")}</b> <span>{tr("Priority queue", "प्राथमिकता कतार")}</span></div>
              <ul className="dm-queue">
                {rows.map((r) => (
                  <li key={r.id} className={r.fresh ? "is-new" : ""} style={r.fresh ? show(t, r.at, 700, -30) : undefined}>
                    <span className="dm-queue__main"><b>{r.title}</b><small>{r.id} · {r.where}</small></span>
                    <span className="dm-queue__due">{r.fresh ? <em>{tr("New", "नई")}</em> : null}{r.due}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Browser>
          <Point t={t} at={2300} icon={<ShieldCheck size={26} />} title={tr("Top of the queue", "कतार में सबसे ऊपर")} text={tr("Each with its own deadline", "हर एक की अपनी समय सीमा")} />
        </div>
      );
    }

    case "escalate": {
      const day = Math.min(15, 1 + Math.floor(p(t, 600, 2800) * 14));
      const moved = t > 3700;
      return (
        <div className="dm-esc">
          <div className="dm-esc__day">
            <span>{tr("Day", "दिन")}</span>
            <b>{day}</b>
            <i style={{ width: `${(day / 15) * 100}%` }} className={day >= 15 ? "is-full" : ""} />
          </div>
          <ol className="dm-ladder">
            {([1, 2, 3, 4] as Level[]).map((l) => (
              <li key={l} className={(moved ? l === 2 : l === 1) ? "is-here" : ""} style={show(t, 100 + l * 120)}>
                <span>L{l}</span>
                <b>{meta ? pick(meta.levels[l].title) : `Level ${l}`}</b>
                <small>{meta ? tr(`${meta.levels[l].days} days`, `${meta.levels[l].days} दिन`) : ""}</small>
                {l === (moved ? 2 : 1) && <i className="dm-token">{WA.slice(-4)}</i>}
              </li>
            ))}
          </ol>
          <p className="dm-esc__note" style={show(t, 3900)}>
            <ArrowRight size={18} /> {tr("Moved up automatically. The citizen is told on WhatsApp.", "स्वतः उच्च स्तर पर भेजी गई। नागरिक को व्हाट्सऐप पर सूचना।")}
          </p>
        </div>
      );
    }

    case "resolve": {
      const notes = "JCB lagwa ke malba hataya, road dono taraf se khol di";
      const report = tr("Debris was removed with a JCB and the road has been reopened to traffic in both directions.", "जेसीबी से मलबा हटाकर सड़क को दोनों दिशाओं में यातायात हेतु खोल दिया गया है।");
      const polished = t > 3400;
      const words = report.split(" ");
      return (
        <div className="dm-split">
          <Browser url="/officer">
            <div className="dm-site dm-resolve">
              <p className="dm-site__label">{tr("Action taken", "की गई कार्यवाही")} · {WA}</p>
              <div className={`dm-note${polished ? " is-polished" : ""}${t > 2700 && !polished ? " is-working" : ""}`} data-no-translate>
                {polished ? words.map((w, i) => <span key={i} style={{ opacity: p(t, 3400 + i * 60, 300) }}>{w} </span>) : typed(notes, t, 400, 30)}
              </div>
              <span className={`dm-btn dm-btn--ai${pressed(t, 2500) ? " is-pressed" : ""}`}><Sparkles size={16} /> {polished ? tr("Written by AI", "AI द्वारा लिखा गया") : t > 2700 ? tr("Writing…", "लिखा जा रहा है…") : tr("Polish with AI", "AI से सुधारें")}</span>
              <div className="dm-photos" style={show(t, 5000)}>
                <figure><img src={photos.before} alt="" /><figcaption>{tr("Before", "पहले")}</figcaption></figure>
                <figure><img src={photos.after} alt="" /><figcaption>{tr("After · geo-tagged", "बाद में · स्थान-अंकित")}</figcaption></figure>
              </div>
              {t > 6900 && <span className="dm-stamp"><CheckCircle2 size={20} /> {tr("Resolved with photo proof", "फ़ोटो प्रमाण सहित निस्तारित")}</span>}
            </div>
          </Browser>
          <Point t={t} at={3600} icon={<Sparkles size={26} />} title={tr("Notes become a report", "नोट्स से रिपोर्ट")} text={tr("Can't close without a photo", "फ़ोटो के बिना बंद नहीं")} />
        </div>
      );
    }

    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/* Player                                                              */
/* ------------------------------------------------------------------ */

type Track = { text: string; url?: string; ms: number };

export function Demo() {
  const { t: tr, locale } = useI18n();
  const navigate = useNavigate();
  useDocumentTitle("Watch it work", "देखें कैसे काम करता है");

  const [voice, setVoice] = useState<Voice>(() => (voices.some((v) => v.code === locale) ? (locale as Voice) : "en"));
  const [stage, setStage] = useState<"choose" | "preparing" | "playing">("choose");
  const [ready, setReady] = useState(0);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [index, setIndex] = useState(0);
  const [t, setT] = useState(0);
  const [paused, setPaused] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const clockStart = useRef(0);
  const photos = useMemo(() => {
    const stamp = (d: Date) => d.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    return { before: demoScene("before", stamp(new Date(Date.now() - 4 * 86_400_000))), after: demoScene("after", stamp(new Date())) };
  }, []);

  useEffect(() => () => audio.current?.pause(), []);

  /** Write the narration in the chosen language, then voice every step before playing. */
  const prepare = async () => {
    // Unlock audio while we still have the click.
    const el = audio.current ?? new Audio();
    audio.current = el;
    el.src = SILENCE;
    void el.play().catch(() => undefined);
    setStage("preparing");
    setReady(0);

    let texts = scenes.map((s) => (voice === "hi" ? s.hi : s.en));
    if (voice !== "en" && voice !== "hi") {
      try {
        texts = (await api.translate(scenes.map((s) => s.hi), voice)).items;
      } catch {
        texts = scenes.map((s) => s.hi);
      }
    }
    const out: Track[] = texts.map((text, i) => ({ text, ms: scenes[i].min }));
    let next = 0;
    const worker = async () => {
      while (next < out.length) {
        const i = next++;
        // Speech occasionally comes back padded with silence; ask once more, then keep the step short anyway.
        const expected = Math.max(8, out[i].text.length / 9);
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const blob = await api.speak(attempt ? `${out[i].text} ` : out[i].text, voice, undefined, "narrator");
            const url = URL.createObjectURL(blob);
            const secs = await new Promise<number>((resolve) => {
              const a = new Audio(url);
              a.addEventListener("loadedmetadata", () => resolve(a.duration), { once: true });
              a.addEventListener("error", () => resolve(0), { once: true });
            });
            if (!secs) continue;
            out[i] = { ...out[i], url, ms: Math.min(scenes[i].min + 6000, Math.max(scenes[i].min, Math.ceil(secs * 1000) + 900)) };
            if (secs <= expected * 1.6) break;
          } catch {
            // Captions only for this step.
          }
        }
        setReady((r) => r + 1);
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
    setTracks(out);
    setIndex(0);
    setT(0);
    setPaused(false);
    setStage("playing");
  };

  // Start each step's voice-over.
  useEffect(() => {
    if (stage !== "playing") return;
    const el = audio.current;
    const url = tracks[index]?.url;
    if (el && url) {
      el.src = url;
      el.currentTime = 0;
      void el.play().catch(() => undefined);
    }
    clockStart.current = performance.now();
    setT(0);
  }, [stage, index, tracks]);

  // The scene clock.
  useEffect(() => {
    if (stage !== "playing" || paused) return;
    let raf = 0;
    const tick = (now: number) => {
      const elapsed = now - clockStart.current;
      setT(elapsed);
      if (elapsed >= (tracks[index]?.ms ?? 7000)) {
        if (index >= scenes.length - 1) {
          navigate("/");
          return;
        }
        setIndex((i) => i + 1);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [stage, paused, index, tracks, navigate]);

  const togglePause = useCallback(() => {
    const el = audio.current;
    if (paused) {
      clockStart.current = performance.now() - t;
      if (el && tracks[index]?.url) void el.play().catch(() => undefined);
    } else {
      el?.pause();
    }
    setPaused((v) => !v);
  }, [paused, t, tracks, index]);

  const restart = () => {
    setIndex(0);
    setPaused(false);
    clockStart.current = performance.now();
    setT(0);
    if (audio.current && tracks[0]?.url) {
      audio.current.src = tracks[0].url;
      void audio.current.play().catch(() => undefined);
    }
  };

  const scene = scenes[index];
  const groups: { id: Group; en: string; hi: string; Icon: typeof MessageCircle }[] = [
    { id: "whatsapp", en: "WhatsApp", hi: "व्हाट्सऐप", Icon: MessageCircle },
    { id: "website", en: "Website", hi: "वेबसाइट", Icon: Globe },
    { id: "officer", en: "Officer", hi: "अधिकारी", Icon: ShieldCheck },
    { id: "citizen", en: "Citizen", hi: "नागरिक", Icon: CheckCircle2 },
  ];
  const order: Group[] = ["start", "whatsapp", "website", "officer", "citizen", "end"];
  const total = tracks.reduce((a, x) => a + x.ms, 0) || 1;
  const done = tracks.slice(0, index).reduce((a, x) => a + x.ms, 0) + Math.min(t, tracks[index]?.ms ?? 0);
  const left = stage === "playing" && scene.id === "end" ? Math.max(0, Math.ceil(((tracks[index]?.ms ?? 0) - t) / 1000)) : 0;

  return (
    <div className="dm">
      <header className="dm-top">
        <div className="dm-brand"><StateSeal className="dm-brand__seal" /><span><b>CM Helpline 1905</b><small>{tr("How it works", "यह कैसे काम करता है")}</small></span></div>
        {stage === "playing" && (
          <ol className="dm-tabs" aria-label={tr("Steps", "चरण")}>
            {groups.map((g, i) => {
              const state = scene.group === g.id ? "is-now" : order.indexOf(scene.group) > order.indexOf(g.id) ? "is-past" : "";
              return (
                <li key={g.id} className={state}>
                  <span className="dm-tabs__n">{i + 1}</span>
                  <g.Icon size={16} aria-hidden="true" /> {tr(g.en, g.hi)}
                </li>
              );
            })}
          </ol>
        )}
        <div className="dm-controls">
          {stage === "playing" && (
            <>
              <button type="button" onClick={togglePause} aria-label={paused ? tr("Play", "चलाएँ") : tr("Pause", "रोकें")}>{paused ? <Play size={18} /> : <Pause size={18} />}</button>
              <button type="button" onClick={() => (index < scenes.length - 1 ? setIndex(index + 1) : navigate("/"))} aria-label={tr("Next step", "अगला चरण")}><SkipForward size={18} /></button>
              <button type="button" onClick={restart} aria-label={tr("Restart", "फिर से")}><RotateCcw size={18} /></button>
            </>
          )}
          <button type="button" onClick={() => navigate("/")} aria-label={tr("Close and go to the home page", "बंद करें और होम पेज पर जाएँ")}><X size={18} /></button>
        </div>
      </header>

      <main className="dm-stage">
        {stage === "playing" && (
          <div className="dm-scene" key={scene.id}>
            {scene.id === "end" ? (
              <div className="dm-end">
                <span className="dm-end__check"><CheckCircle2 size={56} /></span>
                <h2 style={show(t, 300)}>{tr("Simple for citizens. Accountable for officers.", "नागरिकों के लिए आसान। अधिकारियों के लिए जवाबदेह।")}</h2>
                <ul className="dm-end__facts" style={show(t, 900)}>
                  <li><b>2</b> {tr("ways to report", "शिकायत के तरीके")}</li>
                  <li><b>15</b> {tr("days, then it moves up", "दिन, फिर उच्च स्तर")}</li>
                  <li><b>📷</b> {tr("photo proof to close", "बंद करने हेतु फ़ोटो")}</li>
                  <li><b>3</b> {tr("languages of Uttarakhand, plus 12 more", "उत्तराखंड की भाषाएँ, और 12 अन्य")}</li>
                </ul>
                <div className="dm-end__actions" style={show(t, 1400)}>
                  <button type="button" className="dm-primary" onClick={() => navigate("/")}><HomeIcon size={18} /> {tr("Go to the home page", "होम पेज पर जाएँ")} {left > 0 && <small>({left})</small>}</button>
                  <button type="button" className="dm-secondary" onClick={restart}><RotateCcw size={18} /> {tr("Watch again", "फिर देखें")}</button>
                </div>
              </div>
            ) : (
              <SceneView id={scene.id} index={index} t={t} photos={photos} />
            )}
          </div>
        )}

        {stage !== "playing" && (
          <div className="dm-start">
            <StateSeal className="dm-start__seal" />
            <h1>{tr("See how a complaint gets solved", "देखें शिकायत कैसे हल होती है")}</h1>
            <p>{tr("Two citizens, two ways in: WhatsApp and the website. About 1½ minutes, with voice-over.", "दो नागरिक, दो तरीके: व्हाट्सऐप और वेबसाइट। लगभग डेढ़ मिनट, आवाज़ के साथ।")}</p>
            <p className="dm-start__label">{tr("Voice-over language", "आवाज़ की भाषा")}</p>
            <div className="dm-voices" role="radiogroup" aria-label={tr("Voice-over language", "आवाज़ की भाषा")}>
              {voices.map((v) => (
                <button key={v.code} type="button" role="radio" aria-checked={voice === v.code} disabled={stage === "preparing"} onClick={() => setVoice(v.code)} lang={v.code}>{v.label}</button>
              ))}
            </div>
            {stage === "choose" ? (
              <button type="button" className="dm-primary dm-primary--big" onClick={prepare} autoFocus><Play size={20} /> {tr("Start", "शुरू करें")}</button>
            ) : (
              <div className="dm-loading" role="status">
                <span className="dm-loading__bar"><i style={{ width: `${(ready / scenes.length) * 100}%` }} /></span>
                {tr(`Preparing the voice-over… ${ready}/${scenes.length}`, `आवाज़ तैयार हो रही है… ${ready}/${scenes.length}`)}
              </div>
            )}
          </div>
        )}
      </main>

      {stage === "playing" && (
        <footer className="dm-caption">
          <p key={index} lang={voice} data-no-translate>{tracks[index]?.text}</p>
          <span className="dm-progress"><i style={{ width: `${(done / total) * 100}%` }} /></span>
        </footer>
      )}
    </div>
  );
}
