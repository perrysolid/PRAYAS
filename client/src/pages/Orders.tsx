import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { Field, Input } from "../components/Form";
import { PageHead } from "../components/PageHead";
import { LoadError, Loading } from "../components/States";
import { useI18n } from "../context/I18nContext";
import { useAsync } from "../hooks/useAsync";
import { api } from "../lib/api";
import { formatDate } from "../lib/format";

export function Orders() {
  const { t, pick, lang } = useI18n();
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("");

  // Debounce typing so each keystroke doesn't hit the server.
  useEffect(() => {
    const id = setTimeout(() => setQuery(q.trim()), 250);
    return () => clearTimeout(id);
  }, [q]);

  const { data, error, loading, reload } = useAsync((signal) => api.orders({ q: query, kind }, signal), [query, kind]);

  return (
    <>
      <PageHead en="Government orders and meeting minutes" hi="शासनादेश एवं बैठक कार्यवृत्त" lead={t("Rules that govern how CM Helpline 1905 works, newest first.", "मुख्यमंत्री हेल्पलाइन 1905 के संचालन से जुड़े नियम, नवीनतम पहले।")} />
      <div className="container">
        <div className="filters">
          <Field id="order-search" label={t("Search", "खोजें")}>
            <Input id="order-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("For example: L1, reminder, CPGRAMS", "उदाहरण: L1, अनुस्मारक, CPGRAMS")} />
          </Field>
          <div className="segmented" role="group" aria-label={t("Type of document", "दस्तावेज़ का प्रकार")}>
            {[
              { id: "", en: "All", hi: "सभी" },
              { id: "go", en: "Government orders", hi: "शासनादेश" },
              { id: "minutes", en: "Meeting minutes", hi: "बैठक कार्यवृत्त" },
            ].map((k) => (
              <button key={k.id} type="button" aria-pressed={kind === k.id} onClick={() => setKind(k.id)}>{t(k.en, k.hi)}</button>
            ))}
          </div>
        </div>
        <p className="visually-hidden" aria-live="polite">{data ? t(`${data.length} documents`, `${data.length} दस्तावेज़`) : ""}</p>
        {loading && !data && <Loading />}
        {error && <LoadError error={error} onRetry={reload} />}
        {data && (data.length ? (
          <ul className="doc-list">
            {data.map((o) => (
              <li key={o.id} className="doc">
                <FileText size={22} aria-hidden="true" className="doc__icon" />
                <div>
                  <a href={o.url} rel="noopener" className="doc__title">{pick(o.title)}</a>
                  <span className="doc__meta">
                    {o.kind === "go" ? t("Government order", "शासनादेश") : t("Meeting minutes", "बैठक कार्यवृत्त")} · {o.date ? formatDate(o.date, lang) : t("Date not given on the source page", "स्रोत पृष्ठ पर तिथि नहीं दी गई")} · PDF
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p>{t("No documents match. Try a different word.", "कोई दस्तावेज़ नहीं मिला। कोई और शब्द आज़माएँ।")}</p>
        ))}
      </div>
    </>
  );
}
