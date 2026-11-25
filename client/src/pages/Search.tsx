import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, Building2, CheckCircle2, Clock, Search as SearchIcon, ShieldCheck } from "lucide-react";
import { DeptIcon } from "../components/DeptIcon";
import { PageHead } from "../components/PageHead";
import { useI18n } from "../context/I18nContext";
import { api } from "../lib/api";
import { sampleSearch } from "../lib/sampleSearch";
import type { SearchResult } from "../lib/types";

const examples = [
  { en: "No water supply for 10 days", hi: "10 दिन से पानी नहीं आ रहा" },
  { en: "Pension not received", hi: "पेंशन नहीं मिली" },
  { en: "Road damaged after rain", hi: "बारिश के बाद सड़क टूटी" },
  { en: "Transformer burnt", hi: "ट्रांसफार्मर जल गया" },
];

/** Find a department, or see how complaints like yours were handled before: anonymous, with the steps and the time it took. */
export function Search() {
  const { t, pick } = useI18n();
  const [params, setParams] = useSearchParams();
  const initial = params.get("q") ?? "";
  const [text, setText] = useState(initial);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [sample, setSample] = useState(false);

  useEffect(() => {
    const q = initial.trim();
    if (q.length < 2) { setResult(null); setState("idle"); return; }
    const ctl = new AbortController();
    setState("loading");
    // While the project is being tested, fall back to a small built-in set of sample cases when the server is down or finds nothing.
    const useSample = () => { setResult(sampleSearch(q)); setSample(true); setState("idle"); };
    api.search(q, ctl.signal)
      .then((r) => { if (r.departments.length || r.cases.length) { setResult(r); setSample(false); setState("idle"); } else useSample(); })
      .catch((e) => { if ((e as Error).name !== "AbortError") useSample(); });
    return () => ctl.abort();
  }, [initial]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setParams(text.trim() ? { q: text.trim() } : {});
  };
  const empty = result && !result.departments.length && !result.cases.length;

  return (
    <>
      <PageHead
        en="Search"
        hi="खोजें"
        lead={t("Search for a department, or describe your problem to see how similar complaints were handled.", "विभाग खोजें, या अपनी समस्या बताकर देखें कि ऐसी शिकायतों पर क्या कार्यवाही हुई।")}
      />
      <div className="container search-page">
        <form className="searchbar searchbar--big" role="search" onSubmit={submit}>
          <label htmlFor="q" className="visually-hidden">{t("Search departments and problems", "विभाग और समस्याएँ खोजें")}</label>
          <SearchIcon size={20} aria-hidden="true" />
          <input id="q" type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder={t("For example: no water supply in my village", "उदाहरण: मेरे गाँव में पानी की आपूर्ति नहीं")} autoComplete="off" enterKeyHint="search" />
          <button type="submit" className="btn btn--accent btn--small">{t("Search", "खोजें")}</button>
        </form>
        {!initial && (
          <p className="search-page__try">
            {t("Try:", "आज़माएँ:")}{" "}
            {examples.map((x) => (
              <button key={x.en} type="button" className="btn btn--quiet" onClick={() => { setText(pick(x)); setParams({ q: pick(x) }); }}>{pick(x)}</button>
            ))}
          </p>
        )}

        <div aria-live="polite">
          {state === "loading" && <p className="muted">{t("Searching…", "खोज रहे हैं…")}</p>}
          {state === "error" && <p className="field__error">{t("Search is not available right now. Please try again, or call 1905.", "खोज अभी उपलब्ध नहीं है। कृपया पुनः प्रयास करें, या 1905 पर कॉल करें।")}</p>}
          {empty && state === "idle" && (
            <div className="notice">
              <p>{t("We found nothing close to that. Try other words, or describe the problem and we will find the department for you.", "इसके पास कुछ नहीं मिला। अन्य शब्द आज़माएँ, या समस्या लिखें और हम विभाग खोज देंगे।")}</p>
              <p><Link to="/register" state={{ description: initial }}>{t("Register a complaint", "शिकायत दर्ज करें")}</Link></p>
            </div>
          )}
        </div>

        {result && result.departments.length > 0 && (
          <section className="search-section" aria-labelledby="s-dept">
            <h2 id="s-dept">{t("Departments", "विभाग")}</h2>
            <ul className="search-depts">
              {result.departments.map((d) => (
                <li key={d.id}>
                  <Link to={`/register?department=${d.id}`} className="search-dept">
                    <span className="search-dept__icon"><DeptIcon id={d.id} size={22} /></span>
                    <span><strong>{pick(d.name)}</strong><small>{t("Register a complaint", "शिकायत दर्ज करें")}</small></span>
                    <ArrowRight size={18} aria-hidden="true" />
                  </Link>
                </li>
              ))}
              <li><Link to={`/offices?q=${encodeURIComponent(result.departments[0] ? pick(result.departments[0].name) : "")}`} className="search-dept search-dept--soft"><span className="search-dept__icon"><Building2 size={22} aria-hidden="true" /></span><span><strong>{t("Office addresses and phone numbers", "कार्यालयों के पते और फ़ोन नंबर")}</strong></span><ArrowRight size={18} aria-hidden="true" /></Link></li>
            </ul>
          </section>
        )}

        {result && result.cases.length > 0 && result.summary && (
          <section className="search-section" aria-labelledby="s-cases">
            <h2 id="s-cases">{t("How similar complaints were handled", "ऐसी शिकायतों पर क्या हुआ")}</h2>
            <p className="search-summary">
              <Clock size={18} aria-hidden="true" />
              {t(
                `${result.summary.count} similar complaints were resolved in ${result.summary.fastest} to ${result.summary.slowest} days. Typically about ${result.summary.median} days.`,
                `ऐसी ${result.summary.count} शिकायतें ${result.summary.fastest} से ${result.summary.slowest} दिन में निस्तारित हुईं। सामान्यतः लगभग ${result.summary.median} दिन।`,
              )}
            </p>
            {sample && <p className="notice notice--warning search-sample" role="note">{t("Sample data for testing. These are made-up cases, not real complaints.", "परीक्षण हेतु नमूना डेटा। ये काल्पनिक उदाहरण हैं, वास्तविक शिकायतें नहीं।")}</p>}
            <p className="small muted search-privacy"><ShieldCheck size={15} aria-hidden="true" /> {t("Shared anonymously. No names, phone numbers, villages or officers are shown.", "गुमनाम रूप से साझा। कोई नाम, फ़ोन नंबर, गाँव या अधिकारी नहीं दिखाया जाता।")}</p>
            <ul className="cases">
              {result.cases.map((c, i) => (
                <li key={i} className="case">
                  <header className="case__head">
                    <span className="case__dept"><DeptIcon id={c.departmentId} size={18} /> {c.department ? pick(c.department) : ""}{c.category ? ` · ${pick(c.category)}` : ""}</span>
                    <span className="case__days"><CheckCircle2 size={16} aria-hidden="true" /> {t(`Resolved in ${c.days} days`, `${c.days} दिन में निस्तारित`)}</span>
                  </header>
                  <p className="case__problem">“{c.problem}”</p>
                  <ol className="case__steps">
                    {c.steps.map((s, j) => (
                      <li key={j}><span className="case__day">{t(`Day ${s.day}`, `दिन ${s.day}`)}</span> {pick(s)}</li>
                    ))}
                  </ol>
                  <p className="case__foot small muted">
                    {c.escalations ? t(`Moved up ${c.escalations} time${c.escalations > 1 ? "s" : ""}`, `${c.escalations} बार ऊपर भेजी गई`) : t("Resolved without moving up", "बिना ऊपर भेजे निस्तारित")}
                    {c.proof ? ` · ${t("photo proof", "फ़ोटो प्रमाण")}` : ""}
                    {c.rating ? ` · ${t(`rated ${c.rating}/5`, `${c.rating}/5 रेटिंग`)}` : ""}
                  </p>
                </li>
              ))}
            </ul>
            <p className="small muted">{t("Every complaint is different. Time limits are fixed: 15 days at the first level, then each level moves it up automatically.", "हर शिकायत अलग होती है। समय सीमा निश्चित है: प्रथम स्तर पर 15 दिन, फिर हर स्तर पर शिकायत स्वतः ऊपर जाती है।")}</p>
            <p><Link className="btn" to="/register" state={{ description: initial }}>{t("Register this complaint", "यह शिकायत दर्ज करें")} <ArrowRight size={18} aria-hidden="true" /></Link></p>
          </section>
        )}
      </div>
    </>
  );
}
