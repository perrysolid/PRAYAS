import { useState, type CSSProperties, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Building2, MessageCircle, Mic, MicOff, Phone, Sparkles, Star } from "lucide-react";
import { DeptIcon } from "../components/DeptIcon";
import { HeroCarousel } from "../components/HeroCarousel";
import { Ladder } from "../components/Ladder";
import { TrackForm } from "../components/TrackForm";
import { UkMap } from "../components/UkMap";
import { CountUp } from "../components/CountUp";
import { Reveal } from "../components/Reveal";
import { Typewriter } from "../components/Typewriter";
import { WritingHelp } from "../components/WritingHelp";
import { useI18n } from "../context/I18nContext";
import { useMeta } from "../context/MetaContext";
import { useAsync } from "../hooks/useAsync";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useScrollScrub, type Rule } from "../hooks/useScrollScrub";
import { useInView } from "../hooks/useInView";
import { useSpeechInput } from "../hooks/useSpeechInput";
import { api } from "../lib/api";
import { formatDateTime, formatNumber } from "../lib/format";

const quickStarts = [
  { dept: "energy", en: "No electricity", hi: "बिजली नहीं है" },
  { dept: "water", en: "No drinking water", hi: "पीने का पानी नहीं" },
  { dept: "pwd", en: "Road blocked or damaged", hi: "सड़क बंद या खराब" },
  { dept: "social-welfare", en: "Pension not received", hi: "पेंशन नहीं मिली" },
  { dept: "food", en: "Ration not given", hi: "राशन नहीं मिला" },
  { dept: "forest", en: "Wild animal threat", hi: "जंगली जानवर का खतरा" },
  { dept: "health", en: "Hospital or doctor", hi: "अस्पताल या डॉक्टर" },
  { dept: "revenue", en: "Certificate delayed", hi: "प्रमाण पत्र में देरी" },
];

function DescribeBox() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const speech = useSpeechInput(lang === "hi" ? "hi-IN" : "en-IN", (heard) => setText((prev) => (prev ? `${prev} ${heard}` : heard)));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (text.trim().length < 10) {
      setError(t("Write a little more so we can find the right department (at least 10 characters)", "थोड़ा और लिखें ताकि सही विभाग मिल सके (कम से कम 10 अक्षर)"));
      return;
    }
    navigate("/register", { state: { description: text.trim() } });
  };

  return (
    <form className="describe" onSubmit={submit} noValidate>
      <label htmlFor="describe" className="describe__label">
        {t("What is the problem?", "समस्या क्या है?")}
      </label>
      <span className="field__hint" id="describe-hint">
        {t("Write it in your own words, in Hindi or English. Or press Speak.", "अपने शब्दों में लिखें, हिंदी या अंग्रेज़ी में। या ‘बोलें’ दबाएँ।")}
      </span>
      {error && (
        <span className="field__error" id="describe-error">
          {error}
        </span>
      )}
      <div className="describe__box">
        <textarea
          id="describe"
          className="textarea"
          rows={3}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (error) setError("");
          }}
          placeholder={t("For example: No water supply in Ward 4, Khirsu for 10 days", "उदाहरण: खिर्सू के वार्ड 4 में 10 दिन से पानी नहीं आ रहा")}
          aria-describedby={error ? "describe-hint describe-error" : "describe-hint"}
          aria-invalid={Boolean(error) || undefined}
        />
        {speech.supported && (
          <button
            type="button"
            className={`describe__mic${speech.listening ? " is-on" : ""}`}
            onClick={speech.listening ? speech.stop : speech.start}
            aria-pressed={speech.listening}
          >
            {speech.listening ? <MicOff size={20} aria-hidden="true" /> : <Mic size={20} aria-hidden="true" />}
            <span>{speech.listening ? t("Stop", "रोकें") : t("Speak", "बोलें")}</span>
          </button>
        )}
      </div>
      <WritingHelp
        text={text}
        onReplace={(next) => { setText(next); setError(""); }}
        onAppend={(add) => setText((prev) => (prev.trim() ? `${prev.trimEnd()} ${add}` : add))}
      />
      <p className="visually-hidden" aria-live="polite">
        {speech.listening ? t("Listening. Speak now.", "सुन रहे हैं। अब बोलें।") : ""}
      </p>
      {speech.error === "permission" && <p className="field__error">{t("Microphone access was blocked. Allow it in your browser settings, or type instead.", "माइक्रोफ़ोन की अनुमति नहीं मिली। ब्राउज़र सेटिंग में अनुमति दें या टाइप करें।")}</p>}
      <div className="describe__foot">
        <button className="btn btn--accent" type="submit">
          {t("Find the right department", "सही विभाग खोजें")} <ArrowRight size={18} aria-hidden="true" />
        </button>
      </div>
    </form>
  );
}

function LiveMap() {
  const { t, pick, lang } = useI18n();
  const { department } = useMeta();
  const { data } = useAsync((signal) => api.stats(signal), []);
  const [selected, setSelected] = useState<string>("pauri");
  if (!data) return <div className="livemap livemap--loading" aria-hidden="true" />;
  const d = data.byDistrict.find((x) => x.id === selected) ?? data.byDistrict[0];
  const top = d.topIssue ? department(d.topIssue) : undefined;

  const figures = [
    { value: formatNumber(data.total, lang), label: t(`complaints registered in ${data.year}`, `${data.year} में दर्ज शिकायतें`) },
    { value: formatNumber(data.resolved, lang), label: t("resolved", "निस्तारित") },
    { value: formatNumber(data.pending, lang), label: t("being worked on", "कार्यवाही जारी") },
    { value: data.avgResolutionDays === null ? "–" : `${data.avgResolutionDays}`, label: t("days on average to resolve", "दिन औसत निस्तारण समय") },
  ];

  return (
    <div className="livemap">
      <div className="livemap__map card">
        <UkMap rows={data.byDistrict} metric="pending" selected={selected} onSelect={setSelected} />
        <p className="livemap__stamp">
          {t("Official figures, straight from the records officers work on.", "आधिकारिक आँकड़े, सीधे उन्हीं रिकॉर्ड से जिन पर अधिकारी कार्य करते हैं।")}
          <br />
          <span>{t("Updated", "अद्यतन")} {formatDateTime(data.generatedAt, lang)}</span>
        </p>
      </div>
      <div className="livemap__side">
        <dl className="kpis">
          {figures.map((f) => (
            <div key={f.label} className="kpi">
              <dt>{f.label}</dt>
              <dd>{f.value}</dd>
            </div>
          ))}
        </dl>
        <div className="district-card card" aria-live="polite">
          <p className="district-card__name">{pick(d.name)}</p>
          <dl className="district-card__grid">
            <div><dt>{t("Registered", "दर्ज")}</dt><dd>{formatNumber(d.total, lang)}</dd></div>
            <div><dt>{t("Pending", "लंबित")}</dt><dd>{formatNumber(d.pending, lang)}</dd></div>
            <div><dt>{t("Resolved", "निस्तारित")}</dt><dd>{d.resolvedPct === null ? "–" : `${d.resolvedPct}%`}</dd></div>
            <div><dt>{t("Overdue", "विलंबित")}</dt><dd className={d.overdue ? "is-overdue" : undefined}>{formatNumber(d.overdue, lang)}</dd></div>
          </dl>
          {top && (
            <p className="district-card__top">
              <DeptIcon id={top.id} size={18} /> {t("Most open complaints:", "सबसे अधिक खुली शिकायतें:")} <strong>{pick(top.name)}</strong>
            </p>
          )}
        </div>
        <p className="livemap__more"><Link to="/dashboard">{t("Open the full dashboard", "पूरा डैशबोर्ड खोलें")} <ArrowRight size={16} aria-hidden="true" /></Link></p>
      </div>
    </div>
  );
}

/** Winding road behind the portrait, with a pin at each step: describe, route, act, rate. */
function Roadmap() {
  const pins = [[345, 297], [628, 292], [392, 78], [596, 26]];
  const road = "M352 420 C292 392 312 305 400 288 C470 274 540 272 612 288 C705 308 690 205 600 172 C520 145 400 150 392 78 C386 30 520 56 596 26";
  return (
    <svg className="journey__road" viewBox="0 0 1000 620" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
      <path className="journey__road-bed" pathLength={1} d={road} />
      <path className="journey__road-line" pathLength={1} d={road} />
      {pins.map(([x, y], i) => (
        <g key={i} className="journey__pin" transform={`translate(${x} ${y})`} style={{ "--i": i } as CSSProperties}>
          <path d="M0 0 C-10 -16 -20 -26 -20 -40 a20 20 0 1 1 40 0 C20 -26 10 -16 0 0Z" />
        </g>
      ))}
    </svg>
  );
}

/** The portrait, in front of the road so the road seems to pass behind the person. */
function Figure() {
  return (
    <div className="journey__figure" aria-hidden="true">
      <img src="/img/cm-real.webp" alt="" width={840} height={1120} decoding="async" draggable={false} />
    </div>
  );
}

/** The four things that happen to every complaint, along a road with the portrait in the middle. */
function Journey() {
  const { t } = useI18n();
  const [ref, inView] = useInView<HTMLDivElement>(0.25);
  const steps = [
    { Icon: Mic, title: t("Submission of grievance", "शिकायत प्रस्तुत करना"), text: t("State the problem in Hindi or English, in writing or by voice. A photograph may be attached.", "समस्या हिंदी या अंग्रेज़ी में, लिखकर या बोलकर दर्ज करें। फ़ोटो संलग्न की जा सकती है।"), chip: t("“No water supply in Khirsu for 10 days”", "“खिर्सू में 10 दिन से जलापूर्ति बाधित”") },
    { Icon: Sparkles, title: t("Assignment to department", "संबंधित विभाग को प्रेषण"), text: t("The concerned department and priority are identified for the citizen's confirmation.", "संबंधित विभाग और प्राथमिकता चिह्नित कर नागरिक की पुष्टि हेतु प्रस्तुत की जाती है।"), chip: t("Drinking Water · Jal Sansthan", "पेयजल · जल संस्थान") },
    { Icon: Building2, title: t("Action by the officer", "अधिकारी द्वारा कार्यवाही"), text: t("Each level has a fixed time limit (15 days at the first level), after which the grievance is escalated automatically. Disposal requires photographic proof.", "प्रत्येक स्तर की निर्धारित समय सीमा (प्रथम स्तर पर 15 दिन) के बाद शिकायत स्वतः उच्च स्तर पर जाती है। निस्तारण हेतु फ़ोटो प्रमाण अनिवार्य है।"), chip: t("Photographic proof attached", "फ़ोटो प्रमाण संलग्न") },
    { Icon: Star, title: t("Citizen feedback", "नागरिक प्रतिपुष्टि"), text: t("If the grievance is not resolved, it may be reopened within 30 days and is referred to a higher level.", "समाधान न होने पर शिकायत 30 दिन के भीतर पुनः खोली जा सकती है और उच्च स्तर को भेजी जाती है।"), chip: "★★★★★" },
  ];
  return (
    <div ref={ref} className={`journey-stage${inView ? " is-in" : ""}`}>
      <Roadmap />
      <Figure />
      <ol className="journey">
        {steps.map(({ Icon, title, text, chip }, i) => (
          <li key={title} className="journey__step" style={{ "--i": i } as CSSProperties}>
            <span className="journey__icon"><Icon size={26} aria-hidden="true" /></span>
            <h3>{title}</h3>
            <p>{text}</p>
            <span className="journey__chip" aria-hidden="true">{chip}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Headline figures over a photograph of the state, counting up as they come into view. */
function ImpactBand() {
  const { t } = useI18n();
  const { data } = useAsync((signal) => api.stats(signal), []);
  const [ref, inView] = useInView<HTMLElement>(0.3);
  const figures = data
    ? [
        { value: data.total, label: t(`complaints registered in ${data.year}`, `${data.year} में दर्ज शिकायतें`) },
        { value: data.resolved, label: t("resolved, with the officer named", "निस्तारित, अधिकारी के नाम सहित") },
        { value: data.citizensHeard, label: t("citizens heard, including those who joined a neighbour's complaint", "सुने गए नागरिक, पड़ोसी की शिकायत से जुड़ने वालों सहित") },
        { value: data.satisfactionPct ?? 0, suffix: "%", label: t("of citizens who rated were satisfied", "रेटिंग देने वाले नागरिक संतुष्ट") },
      ]
    : [];
  return (
    <section ref={ref} className="impact" aria-labelledby="impact-title">
      <div className="container">
        <h2 id="impact-title" className="impact__title">{t("Every complaint counted, in public", "हर शिकायत की गिनती, सबके सामने")}</h2>
        <dl className="impact__grid">
          {figures.map((f) => (
            <div key={f.label} className="impact__fig">
              <dt>{f.label}</dt>
              <dd><CountUp value={f.value} start={inView} suffix={f.suffix} /></dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/** Boxes that glide into place as they scroll into view; the text inside them never moves. */
const scrubRules: Rule[] = [
  { selector: ".split__left", from: () => ({ x: -150, y: 40, scale: 0.95 }) },
  { selector: ".split__right", from: () => ({ x: 150, y: 40, scale: 0.95 }) },
  { selector: ".rungs li", from: () => ({ x: -60 }) },
  { selector: ".journey__step", from: (i) => ({ x: i % 2 ? 80 : -80, y: i < 2 ? -60 : 60, fade: false }) },
  { selector: ".journey__figure", from: () => ({ y: 90, fade: false }) },
  { selector: ".livemap__map", from: () => ({ x: -150, y: 30 }) },
  { selector: ".livemap__side", from: () => ({ x: 150, y: 30 }) },
  { selector: ".kpi", from: (i) => ({ y: i % 2 ? 50 : -50 }) },
  { selector: ".ladder--path .ladder__step", from: (i) => ({ y: 44 + i * 10 }) },
  { selector: ".track-panel", from: () => ({ y: 60, scale: 0.9 }) },
  { selector: ".track-panel__copy", from: () => ({ x: -70 }) },
  { selector: ".track-panel__form", from: () => ({ x: 70 }) },
];

export function Home() {
  const { t, pick } = useI18n();
  useDocumentTitle("Register and track complaints", "शिकायत दर्ज करें और स्थिति देखें");
  const { data: scrubReady } = useAsync((signal) => api.stats(signal), []);
  useScrollScrub(scrubRules, scrubReady);

  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <HeroCarousel />
        <div className="container hero__stack">
          <h1 id="hero-title" className="hero__title" aria-label={t("Tell us the problem. We'll get it to the officer who can fix it.", "समस्या बताइए। हम उसे समाधान करने वाले अधिकारी तक पहुँचाएँगे।")}>
            <Typewriter text={t("Tell us the problem. We'll get it to the officer who can fix it.", "समस्या बताइए। हम उसे समाधान करने वाले अधिकारी तक पहुँचाएँगे।")} />
          </h1>
          <div className="hero__panels">
            <DescribeBox />
            <aside className="hero__call" aria-labelledby="call-title">
              <h2 id="call-title" className="hero__call-title">{t("Prefer to talk?", "बात करना पसंद है?")}</h2>
              <a href="tel:1905" className="hero__number" aria-label={t("Call 1905, toll free", "1905 पर निःशुल्क कॉल करें")}>
                <Phone size={28} aria-hidden="true" /> 1905
              </a>
              <p className="hero__call-text">{t("Toll free from any phone. An operator registers it for you.", "किसी भी फ़ोन से निःशुल्क। ऑपरेटर आपके लिए दर्ज करेंगे।")}</p>
              <ul className="hero__channels">
              <li>
                <MessageCircle size={18} aria-hidden="true" />
                <a href="https://api.whatsapp.com/send?phone=917302254182" rel="noopener">{t("WhatsApp +91 73022 54182", "व्हाट्सऐप +91 73022 54182")}</a>
              </li>
            </ul>
            </aside>
          </div>
        </div>
      </section>

      <section className="section section--tint section--split" aria-labelledby="quick-title">
        <div className="container split">
          <Reveal className="split__panel split__left">
            <div className="split__head">
              <span className="kicker kicker--plain">{t("Start here", "यहाँ से शुरू करें")}</span>
              <h2 id="quick-title" className="split__title">{t("Common problems", "आम समस्याएँ")}</h2>
              <p>{t("Choose one and we'll pre-select the department.", "एक चुनें, विभाग पहले से चुना रहेगा।")}</p>
            </div>
            <ul className="rungs">
              {quickStarts.map((q, i) => (
                <li key={q.dept} style={{ "--i": i } as CSSProperties}>
                  <Link className="rung" to={`/register?department=${q.dept}`}>
                    <span className="rung__node"><DeptIcon id={q.dept} /></span>
                    <span className="rung__label">{pick(q)}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link className="split__more" to="/departments">{t("All 16 departments", "सभी 16 विभाग")} <ArrowRight size={16} aria-hidden="true" /></Link>
          </Reveal>
          <Reveal className="split__panel split__right" delay={160} role="region" aria-labelledby="journey-title">
            <div className="split__head">
              <span className="kicker kicker--plain">{t("How it works", "यह कैसे काम करता है")}</span>
              <h2 id="journey-title" className="split__title">{t("From your words to a fixed solution", "आपके शब्दों से समाधान तक")}</h2>
              <p>{t("Four clear steps, and you can see every one of them.", "चार साफ़ कदम, और हर कदम आपको दिखता है।")}</p>
            </div>
            <Journey />
          </Reveal>
        </div>
      </section>

      <section className="section section--map" aria-labelledby="map-title">
        <div className="container">
          <Reveal className="section__head section__head--center">
            <div>
              <span className="kicker kicker--plain">{t("Select a district on the map to see how its complaints are doing.", "मानचित्र पर कोई जनपद चुनें और देखें वहाँ की शिकायतों की स्थिति क्या है।")}</span>
              <h2 id="map-title" className="split__title">{t("Complaints across Uttarakhand", "पूरे उत्तराखंड में शिकायतें")}</h2>
            </div>
          </Reveal>
          <Reveal delay={140}>
            <LiveMap />
          </Reveal>
        </div>
      </section>

      <ImpactBand />

      <section className="section section--path" aria-labelledby="ladder-title">
        <div className="container">
          <Reveal className="path__head">
            <span className="path__eyebrow">{t("After you register", "दर्ज करने के बाद")}</span>
            <h2 id="ladder-title" className="path__title"><span>{t("Your complaint never gets stuck on one desk", "आपकी शिकायत एक मेज़ पर अटकती नहीं")}</span></h2>
            <p>
              {t(
                "It goes straight to the officer responsible. If nothing happens in time, it moves up on its own. You never have to chase anyone.",
                "यह सीधे ज़िम्मेदार अधिकारी के पास जाती है। समय पर कुछ न हुआ तो अपने आप ऊपर चली जाती है। आपको किसी के पीछे भागना नहीं पड़ता।",
              )}
            </p>
          </Reveal>
          <Reveal className="path__steps" delay={120}>
            <Ladder variant="path" />
          </Reveal>
          <Reveal className="track-panel" delay={200}>
            <div className="track-panel__copy">
              <h3>{t("Already registered?", "पहले से दर्ज है?")}</h3>
              <p>{t("Type the number from your SMS and see exactly where your complaint is. No sign-in needed.", "SMS में मिला नंबर डालिए और देखिए आपकी शिकायत अभी कहाँ है। साइन इन ज़रूरी नहीं।")}</p>
              <Link to="/my-complaints">{t("Or sign in to see all your complaints", "या सभी शिकायतें देखने के लिए साइन इन करें")} <ArrowRight size={16} aria-hidden="true" /></Link>
            </div>
            <div className="track-panel__form">
              <TrackForm compact />
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section section--slim" aria-labelledby="central-title">
        <div className="container">
          <div className="notice">
            <h2 id="central-title" className="notice__title" style={{ fontFamily: "var(--font-sans)", fontSize: "var(--fs-base)", color: "var(--ink)" }}>
              {t("Problem with a central government office?", "केंद्र सरकार के कार्यालय से समस्या है?")}
            </h2>
            <p>
              {t(
                "Railways, passports, income tax, banks, post offices, Aadhaar and EPFO are run by the Government of India. Complaints about them go to CPGRAMS.",
                "रेलवे, पासपोर्ट, आयकर, बैंक, डाकघर, आधार और ईपीएफओ भारत सरकार के अधीन हैं। इनकी शिकायत CPGRAMS पर होती है।",
              )}{" "}
              <Link to="/cpgrams">{t("How to complain on CPGRAMS", "CPGRAMS पर शिकायत कैसे करें")}</Link>
            </p>
          </div>
          <p className="small muted">
            <Phone size={14} aria-hidden="true" style={{ verticalAlign: "-2px" }} /> {t("In an emergency call 112. For an ambulance call 108.", "आपात स्थिति में 112 पर कॉल करें। एम्बुलेंस के लिए 108 पर।")}
          </p>
        </div>
      </section>
    </>
  );
}
