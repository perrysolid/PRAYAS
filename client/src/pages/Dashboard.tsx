import { useState } from "react";
import { Users } from "lucide-react";
import { DeptIcon } from "../components/DeptIcon";
import { PageHead } from "../components/PageHead";
import { LoadError, Loading } from "../components/States";
import { UkMap, type MapMetric } from "../components/UkMap";
import { useI18n } from "../context/I18nContext";
import { useMeta } from "../context/MetaContext";
import { useAsync } from "../hooks/useAsync";
import { api } from "../lib/api";
import { formatDateTime, formatNumber } from "../lib/format";

export function Dashboard() {
  const { t, pick, lang } = useI18n();
  const { meta, department, district } = useMeta();
  const { data, error, loading, reload } = useAsync((signal) => api.stats(signal), []);
  const [metric, setMetric] = useState<MapMetric>("pending");
  const [selected, setSelected] = useState("pauri");

  const sel = data?.byDistrict.find((d) => d.id === selected);

  return (
    <>
      <PageHead en="Live performance dashboard" hi="लाइव प्रदर्शन डैशबोर्ड" lead={t("How quickly complaints are being resolved, by district and department. Every figure is calculated from the same records, so the numbers always add up.", "जनपद एवं विभागवार शिकायतों के निस्तारण की गति। सभी आँकड़े एक ही रिकॉर्ड से निकाले जाते हैं, इसलिए योग हमेशा मेल खाता है।")} />
      <div className="container">
        {loading && <Loading />}
        {error && <LoadError error={error} onRetry={reload} />}
        {data && (
          <>
            <dl className="kpis" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
              {[
                { label: t(`Registered in ${data.year}`, `${data.year} में दर्ज`), value: formatNumber(data.total, lang) },
                { label: t("Resolved", "निस्तारित"), value: formatNumber(data.resolved, lang) },
                { label: t("Pending", "लंबित"), value: formatNumber(data.pending, lang) },
                { label: t("Past their deadline", "समय सीमा पार"), value: formatNumber(data.overdue, lang), alert: data.overdue > 0 },
                { label: t("Average days to resolve", "निस्तारण में औसत दिन"), value: data.avgResolutionDays ?? "–" },
                { label: t("Citizens satisfied", "संतुष्ट नागरिक"), value: data.satisfactionPct === null ? "–" : `${data.satisfactionPct}%` },
                { label: t("Citizens heard (incl. “me too”)", "सुने गए नागरिक (“मेरी भी” सहित)"), value: formatNumber(data.citizensHeard, lang) },
              ].map((f) => (
                <div key={f.label} className={`kpi${f.alert ? " kpi--alert" : ""}`}>
                  <dt>{f.label}</dt>
                  <dd>{f.value}</dd>
                </div>
              ))}
            </dl>
            <p className="small muted">{t("Updated", "अद्यतन")} {formatDateTime(data.generatedAt, lang)} · {t("Prototype data", "प्रोटोटाइप डेटा")}</p>

            <section className="section" aria-labelledby="map-title">
              <div className="section__head">
                <h2 id="map-title">{t("District map", "जनपद मानचित्र")}</h2>
                <div className="segmented" role="group" aria-label={t("Colour the map by", "मानचित्र का रंग")} style={{ margin: 0 }}>
                  {([
                    ["pending", "Pending", "लंबित"],
                    ["resolvedPct", "Share resolved", "निस्तारण %"],
                    ["total", "Registered", "दर्ज"],
                  ] as const).map(([id, en, hi]) => (
                    <button key={id} type="button" aria-pressed={metric === id} onClick={() => setMetric(id)}>{t(en, hi)}</button>
                  ))}
                </div>
              </div>
              <div className="dash-map">
                <div className="card"><UkMap rows={data.byDistrict} metric={metric} selected={selected} onSelect={setSelected} /></div>
                <div>
                  {sel && (
                    <div className="district-card card" aria-live="polite" style={{ marginBottom: "var(--s4)" }}>
                      <p className="district-card__name">{pick(sel.name)}</p>
                      <dl className="district-card__grid">
                        <div><dt>{t("Registered", "दर्ज")}</dt><dd>{formatNumber(sel.total, lang)}</dd></div>
                        <div><dt>{t("Pending", "लंबित")}</dt><dd>{formatNumber(sel.pending, lang)}</dd></div>
                        <div><dt>{t("Resolved", "निस्तारित")}</dt><dd>{sel.resolvedPct === null ? "–" : `${sel.resolvedPct}%`}</dd></div>
                        <div><dt>{t("Overdue", "विलंबित")}</dt><dd className={sel.overdue ? "is-overdue" : undefined}>{formatNumber(sel.overdue, lang)}</dd></div>
                      </dl>
                      {sel.topIssue && department(sel.topIssue) && (
                        <p className="district-card__top"><DeptIcon id={sel.topIssue} size={18} /> {t("Most open complaints:", "सबसे अधिक खुली शिकायतें:")} <strong>{pick(department(sel.topIssue)!.name)}</strong></p>
                      )}
                    </div>
                  )}
                  <div className="table-wrap">
                    <table className="table">
                      <caption className="visually-hidden">{t("Complaints by district", "जनपदवार शिकायतें")}</caption>
                      <thead>
                        <tr>
                          <th scope="col">{t("District", "जनपद")}</th>
                          <th scope="col" className="num">{t("Registered", "दर्ज")}</th>
                          <th scope="col" className="num">{t("Pending", "लंबित")}</th>
                          <th scope="col" className="num">{t("Resolved", "निस्तारित")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...data.byDistrict].sort((a, b) => b.pending - a.pending).map((d) => (
                          <tr key={d.id} aria-current={d.id === selected ? "true" : undefined} style={d.id === selected ? { background: "var(--brand-tint)" } : undefined}>
                            <th scope="row"><button type="button" className="btn btn--quiet" onClick={() => setSelected(d.id)}>{pick(d.name)}</button></th>
                            <td className="num">{formatNumber(d.total, lang)}</td>
                            <td className="num">{formatNumber(d.pending, lang)}</td>
                            <td className="num">{d.resolvedPct === null ? "–" : `${d.resolvedPct}%`}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>

            <section aria-labelledby="dept-title">
              <div className="section__head">
                <div>
                  <h2 id="dept-title">{t("Department scorecard", "विभाग स्कोरकार्ड")}</h2>
                  <p>{t("Grade = 50% resolved within the first deadline, 30% share resolved, 20% citizen rating.", "ग्रेड = 50% पहली समय सीमा में निस्तारण, 30% कुल निस्तारण, 20% नागरिक रेटिंग।")}</p>
                </div>
              </div>
              <div className="table-wrap">
                <table className="table">
                  <caption className="visually-hidden">{t("Department scorecard", "विभाग स्कोरकार्ड")}</caption>
                  <thead>
                    <tr>
                      <th scope="col">{t("Department", "विभाग")}</th>
                      <th scope="col">{t("Grade", "ग्रेड")}</th>
                      <th scope="col" className="num">{t("Registered", "दर्ज")}</th>
                      <th scope="col" className="num">{t("On time", "समय पर")}</th>
                      <th scope="col" className="num">{t("Avg days", "औसत दिन")}</th>
                      <th scope="col" className="num">{t("Rating", "रेटिंग")}</th>
                      <th scope="col" style={{ width: "26%" }}>{t("Share resolved", "निस्तारण प्रतिशत")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...data.byDepartment].sort((a, b) => b.score - a.score).map((d) => (
                      <tr key={d.id}>
                        <th scope="row"><span className="dept-cell"><DeptIcon id={d.id} size={18} />{pick(d.name)}</span></th>
                        <td><span className={`grade grade--${d.grade}`} aria-label={t(`Grade ${d.grade}, score ${d.score}`, `ग्रेड ${d.grade}, अंक ${d.score}`)}>{d.grade}</span></td>
                        <td className="num">{formatNumber(d.total, lang)}</td>
                        <td className="num">{d.resolved ? `${d.onTimePct}%` : "–"}</td>
                        <td className="num">{d.avgDays ?? "–"}</td>
                        <td className="num">{d.satisfaction === null ? "–" : `${d.satisfaction}/5`}</td>
                        <td>
                          <span className="bar" aria-hidden="true"><span style={{ width: `${d.resolvedPct}%` }} /></span>
                          <span className="bar__label">{d.resolvedPct}%</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="grid-2-1 section">
              <section aria-labelledby="hot-title">
                <h2 id="hot-title">{t("Problems many citizens share", "कई नागरिकों की साझा समस्याएँ")}</h2>
                <p className="muted">{t("Instead of filing duplicates, citizens join an existing complaint with “I face this too”. One fix here helps the most people.", "डुप्लिकेट दर्ज करने की बजाय नागरिक “मेरी भी यही समस्या है” से मौजूदा शिकायत से जुड़ते हैं। यहाँ एक समाधान सबसे अधिक लोगों की मदद करता है।")}</p>
                <ul className="hotspots">
                  {data.hotspots.map((h) => (
                    <li key={h.id} className="hotspot">
                      <span className="hotspot__text">
                        <strong>{h.subject}</strong>
                        <span>{[h.block, district(h.districtId) && pick(district(h.districtId)!.name)].filter(Boolean).join(", ")} · {department(h.departmentId) && pick(department(h.departmentId)!.name)} · L{h.level}</span>
                      </span>
                      <span className="people"><Users size={16} aria-hidden="true" /> {t(`${h.people} people`, `${h.people} लोग`)}</span>
                    </li>
                  ))}
                </ul>
              </section>
              <section aria-labelledby="level-title">
                <h2 id="level-title">{t("Pending, by who holds it", "लंबित, किसके पास")}</h2>
                <div className="table-wrap">
                  <table className="table">
                    <tbody>
                      {data.byLevel.map((l) => (
                        <tr key={l.level}>
                          <th scope="row">L{l.level} · {meta ? pick(meta.levels[l.level].title) : ""}</th>
                          <td className="num">{formatNumber(l.pending, lang)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="small muted" style={{ marginTop: "var(--s3)" }}>{t("Complaints reach L3 and L4 only when lower levels miss their deadline.", "शिकायतें L3 और L4 तक तभी पहुँचती हैं जब निचले स्तर समय सीमा चूक जाते हैं।")}</p>
              </section>
            </div>
          </>
        )}
      </div>
    </>
  );
}
