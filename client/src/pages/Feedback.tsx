import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Star } from "lucide-react";
import { PageHead } from "../components/PageHead";
import { useI18n } from "../context/I18nContext";
import { api, ApiError } from "../lib/api";

type Text = { en: string; hi: string };

const uses: { id: string; label: Text }[] = [
  { id: "register", label: { en: "Registering a complaint", hi: "शिकायत दर्ज करना" } },
  { id: "track", label: { en: "Tracking a complaint", hi: "शिकायत की स्थिति देखना" } },
  { id: "schemes", label: { en: "Government schemes", hi: "सरकारी योजनाएँ" } },
  { id: "dashboard", label: { en: "Map and dashboard", hi: "मानचित्र और डैशबोर्ड" } },
  { id: "whatsapp", label: { en: "WhatsApp or phone call", hi: "व्हाट्सऐप या फ़ोन कॉल" } },
  { id: "other", label: { en: "Just browsing", hi: "केवल देख रहा/रही था" } },
];

const kinds: { id: string; label: Text }[] = [
  { id: "suggestion", label: { en: "A suggestion", hi: "सुझाव" } },
  { id: "problem", label: { en: "A problem with the website", hi: "वेबसाइट में समस्या" } },
  { id: "compliment", label: { en: "A compliment", hi: "प्रशंसा" } },
  { id: "other", label: { en: "Something else", hi: "कुछ और" } },
];

const stars: Text[] = [
  { en: "Very poor", hi: "बहुत खराब" },
  { en: "Poor", hi: "खराब" },
  { en: "Average", hi: "ठीक-ठाक" },
  { en: "Good", hi: "अच्छा" },
  { en: "Excellent", hi: "उत्कृष्ट" },
];

const ease: Text[] = [
  { en: "Very difficult", hi: "बहुत कठिन" },
  { en: "Difficult", hi: "कठिन" },
  { en: "Neither", hi: "न आसान, न कठिन" },
  { en: "Easy", hi: "आसान" },
  { en: "Very easy", hi: "बहुत आसान" },
];

const MAX = 1000;

/** A short survey in the style of the usual feedback forms: rating, ease, likelihood to recommend, then free text. */
export function Feedback() {
  const { t, pick } = useI18n();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [easy, setEasy] = useState(0);
  const [recommend, setRecommend] = useState<number | null>(null);
  const [used, setUsed] = useState<string[]>([]);
  const [kind, setKind] = useState("suggestion");
  const [comments, setComments] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [contactMe, setContactMe] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const thanks = useRef<HTMLHeadingElement>(null);
  const summary = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (done) thanks.current?.focus(); }, [done]);
  useEffect(() => { if (Object.keys(errors).length) summary.current?.focus(); }, [errors]);

  const answered = useMemo(() => [rating > 0, easy > 0, recommend !== null, comments.trim().length > 0].filter(Boolean).length, [rating, easy, recommend, comments]);

  const toggle = (id: string) => setUsed((u) => (u.includes(id) ? u.filter((x) => x !== id) : [...u, id]));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!rating) next.rating = t("Choose a rating from 1 to 5 stars", "1 से 5 सितारों में रेटिंग चुनें");
    if (email && !/^\S+@\S+\.\S+$/.test(email)) next.email = t("Enter an email address like name@example.com", "name@example.com जैसा ईमेल पता दर्ज करें");
    if (contactMe && !email) next.email = t("Add your email so we can reply", "उत्तर देने हेतु अपना ईमेल जोड़ें");
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      await api.siteFeedback({ rating, ease: easy || undefined, recommend: recommend ?? undefined, used, kind, comments, name, email, contactMe });
      setDone(true);
      window.scrollTo({ top: 0 });
    } catch (err) {
      setErrors(err instanceof ApiError && Object.keys(err.fields).length ? err.fields : { _: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <>
        <PageHead en="Share your feedback" hi="अपनी प्रतिपुष्टि दें" />
        <div className="container">
          <div className="survey survey--done" role="status">
            <CheckCircle2 size={52} aria-hidden="true" />
            <h2 ref={thanks} tabIndex={-1}>{t("Thank you for your feedback", "आपकी प्रतिपुष्टि के लिए धन्यवाद")}</h2>
            <p>{t("It has been recorded and will be reviewed by the team that runs this portal.", "यह दर्ज हो गई है और इस पोर्टल का संचालन करने वाली टीम इसकी समीक्षा करेगी।")}</p>
            <p className="small muted">{t("This form is for the website. To report a problem with a department, register a complaint.", "यह फ़ॉर्म वेबसाइट के लिए है। किसी विभाग की समस्या के लिए शिकायत दर्ज करें।")}</p>
            <div className="survey__actions">
              <Link className="btn" to="/">{t("Back to home", "मुखपृष्ठ पर जाएँ")}</Link>
              <Link className="btn btn--secondary" to="/register">{t("Register a complaint", "शिकायत दर्ज करें")}</Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  const shown = hover || rating;

  return (
    <>
      <PageHead
        en="Share your feedback"
        hi="अपनी प्रतिपुष्टि दें"
        lead={t("It takes about two minutes. Only the star rating is required.", "इसमें लगभग दो मिनट लगते हैं। केवल सितारों की रेटिंग अनिवार्य है।")}
      />
      <div className="container">
        <form className="survey" onSubmit={submit} noValidate>
          <div className="survey__progress" role="progressbar" aria-valuemin={0} aria-valuemax={4} aria-valuenow={answered} aria-label={t("Questions answered", "उत्तर दिए गए प्रश्न")}>
            <span style={{ width: `${(answered / 4) * 100}%` }} />
          </div>

          {Object.keys(errors).length > 0 && (
            <p ref={summary} tabIndex={-1} className="field__error" role="alert">{errors._ ?? t("Please correct the highlighted answers: ", "कृपया चिह्नित उत्तर सुधारें: ") + Object.entries(errors).filter(([k]) => k !== "_").map(([, v]) => v).join(" ")}</p>
          )}

          <fieldset className="survey__q">
            <legend><span className="survey__n" aria-hidden="true">1</span>{t("Overall, how was your experience?", "कुल मिलाकर आपका अनुभव कैसा रहा?")} <em>{t("Required", "अनिवार्य")}</em></legend>
            <div className="stars" role="radiogroup" aria-required="true" aria-label={t("Overall rating, 1 to 5 stars", "कुल रेटिंग, 1 से 5 सितारे")} aria-describedby={errors.rating ? "fb-rating-err" : undefined} onMouseLeave={() => setHover(0)}>
              {stars.map((s, i) => (
                <button key={i} type="button" role="radio" aria-checked={rating === i + 1} aria-label={`${i + 1} — ${pick(s)}`} className={shown > i ? "is-on" : ""} onMouseEnter={() => setHover(i + 1)} onClick={() => setRating(i + 1)}>
                  <Star size={34} aria-hidden="true" />
                </button>
              ))}
              <span className="stars__word" aria-live="polite">{shown ? pick(stars[shown - 1]) : ""}</span>
            </div>
            {errors.rating && <span className="field__error" id="fb-rating-err">{errors.rating}</span>}
          </fieldset>

          <fieldset className="survey__q">
            <legend><span className="survey__n" aria-hidden="true">2</span>{t("What did you use today?", "आज आपने क्या उपयोग किया?")} <em>{t("Select all that apply", "जो लागू हों सभी चुनें")}</em></legend>
            <div className="survey__chips">
              {uses.map((u) => (
                <label key={u.id} className={`chip${used.includes(u.id) ? " is-on" : ""}`}>
                  <input type="checkbox" checked={used.includes(u.id)} onChange={() => toggle(u.id)} />
                  {pick(u.label)}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="survey__q">
            <legend><span className="survey__n" aria-hidden="true">3</span>{t("How easy was it to find what you needed?", "आपको जो चाहिए वह ढूँढना कितना आसान रहा?")}</legend>
            <div className="likert" role="radiogroup" aria-label={t("Ease of use, from very difficult to very easy", "उपयोग में आसानी, बहुत कठिन से बहुत आसान")}>
              {ease.map((x, i) => (
                <label key={i} className={`likert__opt${easy === i + 1 ? " is-on" : ""}`}>
                  <input type="radio" name="ease" checked={easy === i + 1} onChange={() => setEasy(i + 1)} />
                  <span className="likert__dot" aria-hidden="true">{i + 1}</span>
                  <span>{pick(x)}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="survey__q">
            <legend><span className="survey__n" aria-hidden="true">4</span>{t("How likely are you to recommend this portal to a neighbour or relative?", "आप इस पोर्टल की सिफ़ारिश पड़ोसी या रिश्तेदार से कितनी संभावना से करेंगे?")}</legend>
            <div className="nps" role="radiogroup" aria-label={t("Likelihood to recommend, 0 not at all likely to 10 extremely likely", "सिफ़ारिश की संभावना, 0 बिल्कुल नहीं से 10 अवश्य")}>
              {Array.from({ length: 11 }, (_, n) => (
                <label key={n} className={`nps__opt${recommend === n ? " is-on" : ""}`}>
                  <input type="radio" name="nps" checked={recommend === n} onChange={() => setRecommend(n)} />
                  <span>{n}</span>
                </label>
              ))}
            </div>
            <div className="nps__ends" aria-hidden="true"><span>{t("Not at all likely", "बिल्कुल नहीं")}</span><span>{t("Extremely likely", "अवश्य")}</span></div>
          </fieldset>

          <fieldset className="survey__q">
            <legend><span className="survey__n" aria-hidden="true">5</span>{t("What would you like to tell us?", "आप हमें क्या बताना चाहेंगे?")}</legend>
            <div className="survey__chips">
              {kinds.map((k) => (
                <label key={k.id} className={`chip${kind === k.id ? " is-on" : ""}`}>
                  <input type="radio" name="kind" checked={kind === k.id} onChange={() => setKind(k.id)} />
                  {pick(k.label)}
                </label>
              ))}
            </div>
            <label className="visually-hidden" htmlFor="fb-comments">{t("Your comments", "आपकी टिप्पणी")}</label>
            <textarea id="fb-comments" className="textarea" rows={5} maxLength={MAX} value={comments} onChange={(e) => setComments(e.target.value)} placeholder={t("What worked well, and what could be better?", "क्या अच्छा रहा, और क्या बेहतर हो सकता है?")} />
            <span className="survey__count" aria-live="polite">{comments.length} / {MAX}</span>
          </fieldset>

          <fieldset className="survey__q survey__q--soft">
            <legend><span className="survey__n" aria-hidden="true">6</span>{t("Can we follow up?", "क्या हम आपसे संपर्क कर सकते हैं?")} <em>{t("Optional", "वैकल्पिक")}</em></legend>
            <div className="survey__two">
              <div className="field">
                <label className="field__label" htmlFor="fb-name">{t("Name", "नाम")}</label>
                <input id="fb-name" className="input" autoComplete="name" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="field">
                <label className="field__label" htmlFor="fb-email">{t("Email", "ईमेल")}</label>
                <input id="fb-email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={Boolean(errors.email) || undefined} aria-describedby={errors.email ? "fb-email-err" : undefined} />
                {errors.email && <span className="field__error" id="fb-email-err">{errors.email}</span>}
              </div>
            </div>
            <label className="survey__consent">
              <input type="checkbox" checked={contactMe} onChange={(e) => setContactMe(e.target.checked)} />
              {t("You may contact me about my feedback.", "मेरी प्रतिपुष्टि के संबंध में आप मुझसे संपर्क कर सकते हैं।")}
            </label>
            <p className="small muted">{t("Do not include your mobile number, Aadhaar or passwords here. Your answers are used only to improve this portal.", "यहाँ मोबाइल नंबर, आधार या पासवर्ड न लिखें। आपके उत्तर केवल इस पोर्टल को बेहतर बनाने में उपयोग होते हैं।")}</p>
          </fieldset>

          <div className="survey__actions">
            <button className="btn btn--accent" type="submit" disabled={busy}>{busy ? t("Sending", "भेज रहे हैं") : t("Submit feedback", "प्रतिपुष्टि भेजें")}</button>
            <Link className="btn btn--quiet" to="/">{t("Cancel", "रद्द करें")}</Link>
          </div>
        </form>
      </div>
    </>
  );
}
