import { useMemo, useState } from "react";
import { Download, ExternalLink, FileText, Search } from "lucide-react";
import { PageHead } from "../components/PageHead";
import { useI18n } from "../context/I18nContext";
import { forms, type FormCategory } from "../data/forms";

const categories: { id: FormCategory | "all"; en: string; hi: string }[] = [
  { id: "all", en: "All forms", hi: "सभी फ़ॉर्म" },
  { id: "certificates", en: "Certificates", hi: "प्रमाण पत्र" },
  { id: "pension-welfare", en: "Pension and welfare", hi: "पेंशन एवं कल्याण" },
  { id: "ration-food", en: "Ration and food", hi: "राशन एवं खाद्य" },
  { id: "health", en: "Health", hi: "स्वास्थ्य" },
  { id: "education-scholarship", en: "Education", hi: "शिक्षा" },
  { id: "land-revenue", en: "Land and revenue", hi: "भूमि एवं राजस्व" },
  { id: "business-employment", en: "Business and jobs", hi: "व्यवसाय एवं रोज़गार" },
  { id: "police", en: "Police", hi: "पुलिस" },
  { id: "rti-grievance", en: "RTI and grievance", hi: "आरटीआई एवं शिकायत" },
  { id: "other", en: "Other", hi: "अन्य" },
];

/** Official forms, linked from the government website that issues them. Nothing is copied or re-hosted here. */
export function Forms() {
  const { t, pick } = useI18n();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<FormCategory | "all">("all");
  const present = useMemo(() => new Set(forms.map((f) => f.category)), []);

  const rows = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return forms
      .filter((f) => cat === "all" || f.category === cat)
      .filter((f) => {
        const hay = `${f.title.en} ${f.title.hi} ${f.department} ${f.about.en} ${f.about.hi}`.toLowerCase();
        return words.every((w) => hay.includes(w));
      });
  }, [q, cat]);

  return (
    <>
      <PageHead
        en="Download forms"
        hi="फ़ॉर्म डाउनलोड करें"
        lead={t("Official application forms of the Government of Uttarakhand. Each opens on the website of the department that issues it.", "उत्तराखंड सरकार के आधिकारिक आवेदन फ़ॉर्म। हर फ़ॉर्म उसे जारी करने वाले विभाग की वेबसाइट पर खुलता है।")}
      />
      <div className="container forms-page">
        <div className="searchbar searchbar--big" role="search">
          <Search size={20} aria-hidden="true" />
          <label htmlFor="fq" className="visually-hidden">{t("Search forms", "फ़ॉर्म खोजें")}</label>
          <input id="fq" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Search, for example: income certificate", "खोजें, जैसे: आय प्रमाण पत्र")} autoComplete="off" />
        </div>
        <div className="schemes__topics offices-tabs" role="group" aria-label={t("Filter by subject", "विषय से छाँटें")}>
          {categories.filter((c) => c.id === "all" || present.has(c.id)).map((c) => (
            <button key={c.id} type="button" aria-pressed={cat === c.id} onClick={() => setCat(c.id)}>{t(c.en, c.hi)}</button>
          ))}
        </div>
        <p className="small muted" aria-live="polite">{t(`${rows.length} forms`, `${rows.length} फ़ॉर्म`)}</p>
        <ul className="forms">
          {rows.map((f) => (
            <li key={f.id} className="form-card">
              <span className="form-card__icon" aria-hidden="true"><FileText size={22} /></span>
              <div className="form-card__body">
                <h2>{pick(f.title)}</h2>
                <p>{pick(f.about)}</p>
                <small>{f.department}</small>
              </div>
              <a className="btn btn--secondary btn--small" href={f.url} target="_blank" rel="noopener noreferrer">
                {f.kind === "pdf" ? <Download size={16} aria-hidden="true" /> : <ExternalLink size={16} aria-hidden="true" />}
                {f.kind === "pdf" ? t("Download", "डाउनलोड") : f.kind === "online" ? t("Apply online", "ऑनलाइन आवेदन") : t("Open", "खोलें")}
                <span className="visually-hidden"> {pick(f.title)} {t("(opens the official website in a new tab)", "(आधिकारिक वेबसाइट नए टैब में खुलेगी)")}</span>
              </a>
            </li>
          ))}
        </ul>
        {!rows.length && <p className="muted">{t("No form matches. Try other words.", "कोई फ़ॉर्म नहीं मिला। अन्य शब्द आज़माएँ।")}</p>}
        <p className="small muted">{t("Forms are not stored here, so you always get the latest version. If a link does not open, call 1905.", "फ़ॉर्म यहाँ संग्रहीत नहीं हैं, इसलिए आपको हमेशा नवीनतम संस्करण मिलता है। लिंक न खुले तो 1905 पर कॉल करें।")}</p>
      </div>
    </>
  );
}
