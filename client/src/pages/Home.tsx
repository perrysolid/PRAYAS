import { Fragment, useState, type CSSProperties, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight, BadgeCheck, Camera, Sparkles, Star, Building2, Clock, Eye, Languages, MessageCircle, Mic, MicOff, PenLine, Phone, Search, Smartphone, Users, BarChart3, Bot, Volume2,
} from "lucide-react";
import { CountUp } from "../components/CountUp";
import { DeptIcon } from "../components/DeptIcon";
import { HeroCarousel } from "../components/HeroCarousel";
import { Ladder } from "../components/Ladder";
import { Ticker } from "../components/Ticker";
import { SahayakAvatar } from "../components/SahayakAvatar";
import { TrackForm } from "../components/TrackForm";
import { UkMap } from "../components/UkMap";
import { useI18n } from "../context/I18nContext";
import { useMeta } from "../context/MetaContext";
import { useAsync } from "../hooks/useAsync";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
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

/** The hero headline rises in word by word on load; the words stay ordinary text for screen readers. */
function RisingTitle({ id, text }: { id: string; text: string }) {
  return (
    <h1 id={id} className="hero__title rising" key={text}>
      {text.split(" ").map((w, i) => (
        <Fragment key={i}>
          <span className="rising__word" style={{ "--i": i } as CSSProperties}>{w}</span>{" "}
        </Fragment>
      ))}
    </h1>
  );
}

/** A small live indicator drawn from the same public figures as the dashboard. */
function LivePulse() {
  const { t, lang } = useI18n();
  const { data } = useAsync((signal) => api.stats(signal), []);
  if (!data) return <p className="live-pulse live-pulse--empty" aria-hidden="true" />;
  return (
    <p className="live-pulse">
      <span className="live-pulse__dot" aria-hidden="true" />
      <span>
        <strong>{t("Live", "लाइव")}</strong> · {t(`${formatNumber(data.resolved, lang)} of ${formatNumber(data.total, lang)} complaints resolved in ${data.year}`, `${data.year} में ${formatNumber(data.total, lang)} में से ${formatNumber(data.resolved, lang)} शिकायतें निस्तारित`)}
      </span>
    </p>
  );
}

/** Open the assistant from anywhere on the page. */
const openSahayak = () => (document.querySelector(".sahayak-launcher") as HTMLButtonElement | null)?.click();

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
      <p className="visually-hidden" aria-live="polite">
        {speech.listening ? t("Listening. Speak now.", "सुन रहे हैं। अब बोलें।") : ""}
      </p>
      {speech.error === "permission" && <p className="field__error">{t("Microphone access was blocked. Allow it in your browser settings, or type instead.", "माइक्रोफ़ोन की अनुमति नहीं मिली। ब्राउज़र सेटिंग में अनुमति दें या टाइप करें।")}</p>}
      <div className="describe__foot">
        <button className="btn btn--accent" type="submit">
          {t("Find the right department", "सही विभाग खोजें")} <ArrowRight size={18} aria-hidden="true" />
        </button>
        <span className="small muted">{t("Takes about 2 minutes. You check everything before it is sent.", "लगभग 2 मिनट। भेजने से पहले आप सब जाँच लेंगे।")}</span>
      </div>
    </form>
  );
}

function ServiceTiles() {
  const { t } = useI18n();
  const tiles = [
    { to: "/register", Icon: PenLine, title: t("Register a complaint", "शिकायत दर्ज करें"), text: t("Any state department, in 4 short steps", "किसी भी राज्य विभाग की, 4 छोटे चरणों में") },
    { to: "/track", Icon: Search, title: t("Track status", "स्थिति देखें"), text: t("Who has it, and by when they must act", "किसके पास है और कब तक कार्यवाही") },
    { action: openSahayak, Icon: Bot, title: t("Ask Sahayak", "सहायक से पूछें"), text: t("Speak or chat in Hindi or English", "हिंदी या अंग्रेज़ी में बोलें या लिखें") },
    { to: "/dashboard", Icon: BarChart3, title: t("Live dashboard", "लाइव डैशबोर्ड"), text: t("District map and department scorecards", "जनपद मानचित्र और विभाग स्कोरकार्ड") },
  ];
  return (
    <div className="container">
      <ul className="tiles">
        {tiles.map(({ to, action, Icon, title, text }) => (
          <li key={title}>
            {to ? (
              <Link className="tile" to={to}>
                <span className="tile__icon"><Icon size={24} aria-hidden="true" /></span>
                <span className="tile__body"><strong>{title}</strong><span>{text}</span></span>
              </Link>
            ) : (
              <button type="button" className="tile" onClick={action}>
                <span className="tile__icon tile__icon--avatar"><SahayakAvatar size={50} /></span>
                <span className="tile__body"><strong>{title}</strong><span>{text}</span></span>
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
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
        <p className="small muted">
          {t("Select a district on the map. Totals always add up: resolved + pending = registered. Updated", "मानचित्र पर जनपद चुनें। योग हमेशा मेल खाता है: निस्तारित + लंबित = दर्ज। अद्यतन")} {formatDateTime(data.generatedAt, lang)}.{" "}
          <Link to="/dashboard">{t("Open the full dashboard", "पूरा डैशबोर्ड खोलें")}</Link>
        </p>
      </div>
    </div>
  );
}

/** The four things that happen to every complaint, shown as a journey across the page. */
function Journey() {
  const { t } = useI18n();
  const [ref, inView] = useInView<HTMLOListElement>(0.25);
  const steps = [
    { Icon: Mic, title: t("You describe it", "आप बताते हैं"), text: t("In your words, typed or spoken, Hindi or English. A photo helps.", "अपने शब्दों में, लिखकर या बोलकर। फ़ोटो से मदद मिलती है।"), chip: t("“No water in Khirsu for 10 days”", "“खिर्सू में 10 दिन से पानी नहीं”") },
    { Icon: Sparkles, title: t("It is routed in seconds", "सेकंडों में सही विभाग"), text: t("AI suggests the department and urgency. You confirm it.", "AI विभाग और प्राथमिकता सुझाता है। पुष्टि आप करते हैं।"), chip: t("Drinking Water · Jal Sansthan", "पेयजल · जल संस्थान") },
    { Icon: Building2, title: t("The officer acts, with proof", "अधिकारी कार्यवाही करते हैं, प्रमाण सहित"), text: t("15 days at the first level, then it moves up on its own. Resolving needs a photo.", "प्रथम स्तर पर 15 दिन, फिर स्वतः ऊपर। निस्तारण के लिए फ़ोटो ज़रूरी।"), chip: t("Photo proof attached", "फ़ोटो प्रमाण संलग्न") },
    { Icon: Star, title: t("You rate it", "आप रेटिंग देते हैं"), text: t("Not fixed? Reopen within 30 days and it goes higher.", "हल नहीं हुआ? 30 दिन में पुनः खोलें, उच्च अधिकारी तक जाएगी।"), chip: "★★★★★" },
  ];
  return (
    <ol ref={ref} className={`journey${inView ? " is-in" : ""}`}>
      {steps.map(({ Icon, title, text, chip }, i) => (
        <li key={title} className="journey__step" style={{ "--i": i } as CSSProperties}>
          <span className="journey__icon"><Icon size={26} aria-hidden="true" /><span className="journey__num" aria-hidden="true">{i + 1}</span></span>
          <h3>{title}</h3>
          <p>{text}</p>
          <span className="journey__chip" aria-hidden="true">{chip}</span>
        </li>
      ))}
    </ol>
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
        <p className="impact__credit">{t("Valley of Flowers National Park, Chamoli", "फूलों की घाटी राष्ट्रीय उद्यान, चमोली")}</p>
      </div>
    </section>
  );
}

function Commitments() {
  const { t } = useI18n();
  const items = [
    { Icon: Eye, title: t("You see who has it", "आप देखते हैं किसके पास है"), text: t("The officer's level and deadline are on every complaint. Late complaints move up on their own.", "हर शिकायत पर अधिकारी का स्तर और समय सीमा दिखती है। देरी होने पर शिकायत स्वतः ऊपर जाती है।") },
    { Icon: Camera, title: t("Photo proof before closing", "बंद करने से पहले फ़ोटो प्रमाण"), text: t("Officers attach a photo of the fix. You compare it with your own photo, before and after.", "अधिकारी समाधान की फ़ोटो लगाते हैं। आप उसे अपनी फ़ोटो से मिलाते हैं, पहले और बाद।") },
    { Icon: Users, title: t("“I face this too”", "“मेरी भी यही समस्या है”"), text: t("Join a neighbour's complaint instead of filing a duplicate. Shared problems rise up the officer's list.", "डुप्लिकेट दर्ज करने की बजाय पड़ोसी की शिकायत से जुड़ें। साझा समस्याएँ अधिकारी की सूची में ऊपर आती हैं।") },
    { Icon: Languages, title: t("Hindi first, voice friendly", "हिंदी पहले, आवाज़ से भी"), text: t("Speak your complaint, and listen to its status read aloud, in Hindi or English.", "शिकायत बोलकर दर्ज करें और उसकी स्थिति सुनें, हिंदी या अंग्रेज़ी में।") },
    { Icon: Clock, title: t("Rights, not favours", "अधिकार, एहसान नहीं"), text: t("Reminder after 7 days, rating after resolution, reopen within 30 days. The buttons appear when you are entitled.", "7 दिन बाद अनुस्मारक, निस्तारण के बाद रेटिंग, 30 दिन में पुनः खोलें। अधिकार मिलते ही बटन दिखते हैं।") },
    { Icon: BadgeCheck, title: t("Open, honest numbers", "खुले, सच्चे आँकड़े"), text: t("A public scorecard for every department and district, computed from the same records.", "हर विभाग और जनपद का सार्वजनिक स्कोरकार्ड, एक ही रिकॉर्ड से।") },
  ];
  return (
    <ul className="commitments">
      {items.map(({ Icon, title, text }) => (
        <li key={title} className="commitment">
          <span className="commitment__icon"><Icon size={22} aria-hidden="true" /></span>
          <h3>{title}</h3>
          <p>{text}</p>
        </li>
      ))}
    </ul>
  );
}

export function Home() {
  const { t, pick } = useI18n();
  useDocumentTitle("Register and track complaints", "शिकायत दर्ज करें और स्थिति देखें");

  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <HeroCarousel />
        <div className="container hero__grid">
          <div className="hero__main">
            <LivePulse />
            <p className="hero__eyebrow">{t("CM Helpline 1905 · Government of Uttarakhand", "मुख्यमंत्री हेल्पलाइन 1905 · उत्तराखंड सरकार")}</p>
            <RisingTitle id="hero-title" text={t("Tell us the problem. We'll get it to the officer who can fix it.", "समस्या बताइए। हम उसे समाधान करने वाले अधिकारी तक पहुँचाएँगे।")} />
            <DescribeBox />
          </div>
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
              <li>
                <Smartphone size={18} aria-hidden="true" />
                <a href="https://play.google.com/store/apps/details?id=com.itda" rel="noopener">{t("CM Helpline app for Android", "एंड्रॉइड हेतु हेल्पलाइन ऐप")}</a>
              </li>
              <li>
                <Volume2 size={18} aria-hidden="true" />
                <button type="button" className="hero__link-btn" onClick={openSahayak}>{t("Chat or speak with Sahayak", "सहायक से चैट करें या बोलें")}</button>
              </li>
            </ul>
          </aside>
        </div>
      </section>

      <ServiceTiles />
      <Ticker />

      <section className="section" aria-labelledby="quick-title">
        <div className="container">
          <div className="section__head">
            <div>
              <span className="kicker">{t("Start here", "यहाँ से शुरू करें")}</span>
              <h2 id="quick-title">{t("Common problems", "आम समस्याएँ")}</h2>
              <p>{t("Choose one and we'll pre-select the department.", "एक चुनें, विभाग पहले से चुना रहेगा।")}</p>
            </div>
            <Link to="/departments">{t("All 16 departments", "सभी 16 विभाग")}</Link>
          </div>
          <ul className="quick">
            {quickStarts.map((q) => (
              <li key={q.dept}>
                <Link to={`/register?department=${q.dept}`}>
                  <span className="quick__icon"><DeptIcon id={q.dept} /></span>
                  {pick(q)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section section--journey" aria-labelledby="journey-title">
        <div className="container">
          <div className="section__head">
            <div>
              <span className="kicker">{t("How it works", "यह कैसे काम करता है")}</span>
              <h2 id="journey-title">{t("From your words to a fixed problem", "आपके शब्दों से समाधान तक")}</h2>
            </div>
          </div>
          <Journey />
        </div>
      </section>

      <section className="section section--tint" aria-labelledby="map-title">
        <div className="container">
          <div className="section__head">
            <div>
              <span className="kicker">{t("Live, from the same records officers use", "लाइव, उन्हीं रिकॉर्ड से जो अधिकारी देखते हैं")}</span>
              <h2 id="map-title">{t("Complaints across Uttarakhand", "पूरे उत्तराखंड में शिकायतें")}</h2>
            </div>
          </div>
          <LiveMap />
        </div>
      </section>

      <ImpactBand />

      <section className="section" aria-labelledby="commit-title">
        <div className="container">
          <div className="section__head">
            <div>
              <span className="kicker">{t("Our commitments to you", "आपके प्रति हमारी प्रतिबद्धता")}</span>
              <h2 id="commit-title">{t("What you can count on", "आप किन बातों पर भरोसा कर सकते हैं")}</h2>
            </div>
          </div>
          <Commitments />
        </div>
      </section>

      <div className="aipan" aria-hidden="true" />
      <section className="cm-band" aria-labelledby="cm-title">
        <div className="container cm-band__inner">
          <img className="cm-band__photo" src="/img/cm-dhami.webp" width="180" height="240" alt={t("Shri Pushkar Singh Dhami, Chief Minister of Uttarakhand", "श्री पुष्कर सिंह धामी, मुख्यमंत्री, उत्तराखंड")} loading="lazy" />
          <div className="cm-band__text">
            <span className="kicker kicker--light">{t("The Chief Minister's helpline", "मुख्यमंत्री की हेल्पलाइन")}</span>
            <h2 id="cm-title">{t("A direct line from every village to the Chief Minister's Office", "हर गाँव से मुख्यमंत्री कार्यालय तक सीधी पहुँच")}</h2>
            <p>
              {t(
                "CM Helpline 1905 takes complaints, demands and suggestions about every Government of Uttarakhand department, by phone, WhatsApp, app or this website.",
                "मुख्यमंत्री हेल्पलाइन 1905 पर उत्तराखंड सरकार के हर विभाग से जुड़ी शिकायत, मांग और सुझाव फ़ोन, व्हाट्सऐप, ऐप या इस वेबसाइट से दर्ज होते हैं।",
              )}
            </p>
            <p className="cm-band__name">
              <strong>{t("Shri Pushkar Singh Dhami", "श्री पुष्कर सिंह धामी")}</strong>
              <span>{t("Hon'ble Chief Minister, Uttarakhand", "माननीय मुख्यमंत्री, उत्तराखंड")}</span>
            </p>
            <div className="btn-row">
              <Link className="btn btn--accent" to="/register">{t("Register a complaint", "शिकायत दर्ज करें")}</Link>
              <Link className="btn btn--ghost-light" to="/about">{t("About the helpline", "हेल्पलाइन के बारे में")}</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="ladder-title">
        <div className="container grid-2-1">
          <div>
            <span className="kicker">{t("After you register", "दर्ज करने के बाद")}</span>
            <h2 id="ladder-title">{t("Your complaint never gets stuck on one desk", "आपकी शिकायत एक मेज़ पर अटकती नहीं")}</h2>
            <p>
              {t(
                "It goes straight to the officer responsible. If it is not resolved in time, it moves up automatically. You don't have to chase anyone.",
                "यह सीधे ज़िम्मेदार अधिकारी को जाती है। समय पर निस्तारण न होने पर यह स्वतः ऊपर भेजी जाती है। आपको किसी के पीछे भागना नहीं पड़ता।",
              )}
            </p>
            <Ladder />
          </div>
          <div className="card track-card">
            <h3>{t("Already registered?", "पहले से दर्ज है?")}</h3>
            <p className="muted">{t("Check the status with the number from your SMS. No sign-in needed.", "SMS में मिले नंबर से स्थिति देखें। साइन इन की आवश्यकता नहीं।")}</p>
            <TrackForm compact />
            <p className="small" style={{ marginTop: "var(--s4)" }}>
              <Link to="/my-complaints">{t("Sign in to see all your complaints, send reminders and give feedback", "सभी शिकायतें देखने, अनुस्मारक भेजने और प्रतिक्रिया देने हेतु साइन इन करें")}</Link>
            </p>
          </div>
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
