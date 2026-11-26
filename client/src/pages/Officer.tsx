import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AlarmClock, ArrowLeft, ArrowRight, CheckCircle2, CircleDot, Clock3, Inbox, ListChecks, Lock, MapPin, MessageCircle, Phone, RefreshCw, Search, ShieldCheck, Smile, Sparkles, Undo2, Users, X } from "lucide-react";
import { DeptIcon } from "../components/DeptIcon";
import { LocationCard } from "../components/LocationCard";
import { ErrorSummary, Field, TextArea, describedBy } from "../components/Form";
import { PhotoInput } from "../components/PhotoInput";
import { LoadError, Loading } from "../components/States";
import { StatusTag } from "../components/StatusTag";
import { Timeline } from "../components/Timeline";
import { UkMap, type MapMetric } from "../components/UkMap";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";
import { useMeta } from "../context/MetaContext";
import { useAsync } from "../hooks/useAsync";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { aiStatus } from "../lib/ai";
import { api, ApiError } from "../lib/api";
import { daysUntil, formatDate } from "../lib/format";
import type { Grievance, Photo, Stats } from "../lib/types";

const DAY = 86_400_000;
const isOpen = (g: Grievance) => g.status !== "resolved" && g.status !== "closed";

/* ------------------------------------------------------------------ */
/* Action form, with AI help for the action-taken report               */
/* ------------------------------------------------------------------ */

function ActionForm({ g, onDone }: { g: Grievance; onDone: (g: Grievance) => void }) {
  const { t, lang } = useI18n();
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [ai, setAi] = useState(false);
  const [polishing, setPolishing] = useState(false);
  const [before, setBefore] = useState<string | null>(null);

  useEffect(() => {
    aiStatus().then((s) => setAi(s.enabled));
  }, []);

  const id = `note-${g.id}`;
  const polish = async () => {
    if (note.trim().length < 5) return setErrors({ [id]: t("Write a few words first", "पहले कार्यवाही के बारे में कुछ शब्द लिखें") });
    setPolishing(true);
    setErrors({});
    try {
      const { report } = await api.officerNote(note.trim(), lang);
      setBefore(note);
      setNote(report);
    } catch {
      setErrors({ [id]: t("AI help is not available right now. Write the report in your own words.", "AI सहायता अभी उपलब्ध नहीं है। रिपोर्ट अपने शब्दों में लिखें।") });
    } finally {
      setPolishing(false);
    }
  };

  const act = async (action: "note" | "resolve", e?: FormEvent) => {
    e?.preventDefault();
    const next: Record<string, string> = {};
    if (note.trim().length < 10) next[id] = t("Write at least 10 characters", "कम से कम 10 अक्षर लिखें");
    if (action === "resolve" && !photo) next[`photo-${g.id}`] = t("Add a photo to mark it resolved", "निस्तारित करने के लिए फ़ोटो जोड़ें");
    if (Object.keys(next).length) return setErrors(next);
    setBusy(true);
    setErrors({});
    try {
      onDone(await api.officerAct(g.id, action, note.trim(), action === "resolve" ? photo ?? undefined : undefined));
      setNote("");
      setPhoto(null);
      setBefore(null);
    } catch (err) {
      setErrors({ [id]: err instanceof ApiError && err.fields.note ? err.fields.note : (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={(e) => act("note", e)} noValidate className="ws-form">
      <ErrorSummary errors={errors} />
      <Field id={id} label={t("Remarks", "टिप्पणी")} error={errors[id]}>
        <TextArea id={id} rows={4} value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} invalid={Boolean(errors[id])} aria-describedby={describedBy(id, false, errors[id])} />
      </Field>
      {ai && (
        <div className="ws-ai">
          <button type="button" className="btn btn--secondary btn--small formal__btn" onClick={polish} disabled={polishing}>
            <Sparkles size={16} aria-hidden="true" /> {polishing ? t("Writing…", "लिखा जा रहा है…") : t("Improve with AI", "AI से सुधारें")}
          </button>
          {before !== null && (
            <button type="button" className="btn btn--quiet btn--small" onClick={() => { setNote(before); setBefore(null); }}>
              <Undo2 size={16} aria-hidden="true" /> {t("Undo", "पहले जैसा")}
            </button>
          )}
        </div>
      )}
      <PhotoInput
        id={`photo-${g.id}`}
        label={t("Photo", "फ़ोटो")}
        error={errors[`photo-${g.id}`]}
        value={photo}
        onChange={setPhoto}
      />
      <div className="btn-row">
        <button type="button" className="btn btn--success" disabled={busy} onClick={() => act("resolve")}><CheckCircle2 size={18} aria-hidden="true" /> {t("Mark resolved", "निस्तारित करें")}</button>
        <button type="submit" className="btn btn--secondary" disabled={busy}>{t("Save remark", "टिप्पणी सहेजें")}</button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Workspace for one complaint                                         */
/* ------------------------------------------------------------------ */

function Workspace({ g, onDone, onClose }: { g: Grievance; onDone: (g: Grievance) => void; onClose: () => void }) {
  const { t, pick, lang } = useI18n();
  const { department, district } = useMeta();
  const [step, setStep] = useState<"view" | "act">("view");
  const [panel, setPanel] = useState<"history" | "complaint" | null>(null);
  const due = daysUntil(g.levelDueAt);
  const cat = department(g.departmentId)?.categories.find((c) => c.id === g.categoryId);

  const head = (
    <header className="ws__head">
      <div>
        <p className="ws__id">{g.id}{cat ? ` · ${pick(cat.name)}` : ""}</p>
        <h2 id="ws-title" className="ws__title">{g.subject}</h2>
      </div>
      <button type="button" className="ws__close" onClick={onClose} aria-label={t("Close", "बंद करें")}><X size={18} aria-hidden="true" /></button>
    </header>
  );

  if (step === "act") {
    return (
      <section className="ws card" aria-labelledby="ws-title">
        {head}
        <button type="button" className="ws-back" onClick={() => setStep("view")}><ArrowLeft size={16} aria-hidden="true" /> {t("Back", "वापस")}</button>
        {isOpen(g) ? (
          <ActionForm g={g} onDone={(x) => { onDone(x); setStep("view"); }} />
        ) : (
          <p className="muted">{t("This complaint is closed.", "यह शिकायत बंद है।")}</p>
        )}
      </section>
    );
  }

  return (
    <section className="ws card" aria-labelledby="ws-title">
      {head}
      <div className="ws__tags">
        <StatusTag status={g.status} />
        {g.urgency === "high" && <StatusTag status="urgent" />}
        {g.sensitive && <span className="tag tag--sensitive"><Lock size={13} aria-hidden="true" /> {t("Private", "गोपनीय")}</span>}
        {isOpen(g) && <span className={`ws__due${due < 0 ? " is-overdue" : due <= 2 ? " is-soon" : ""}`}><Clock3 size={14} aria-hidden="true" /> {t("Level", "स्तर")} {g.level} · {due >= 0 ? t(`${due} days left`, `${due} दिन शेष`) : t(`${-due} days late`, `${-due} दिन विलंब`)}</span>}
        {g.supportCount > 0 && <span className="people"><Users size={14} aria-hidden="true" /> +{g.supportCount}</span>}
      </div>
      <dl className="ws__facts">
        <div><dt><MapPin size={14} aria-hidden="true" /> {t("Where", "कहाँ")}</dt><dd>{[g.village, g.block, district(g.districtId) && pick(district(g.districtId)!.name)].filter(Boolean).join(", ")}</dd></div>
        <div><dt><Phone size={14} aria-hidden="true" /> {t("Citizen", "नागरिक")}</dt><dd>{g.citizenName} · {g.citizenMobile}</dd></div>
        <div><dt><Inbox size={14} aria-hidden="true" /> {t("Received", "प्राप्त")}</dt><dd>{formatDate(g.submittedAt, lang)} · {g.channel === "whatsapp" ? "WhatsApp" : g.channel === "phone" ? t("Phone", "फ़ोन") : t("Website", "वेबसाइट")}</dd></div>
      </dl>
      {g.brief && (
        <section className="ws-brief" aria-label={t("Brief", "सार")}>
          <h3>{g.brief.source === "ai" ? <Sparkles size={16} aria-hidden="true" /> : <ListChecks size={16} aria-hidden="true" />} {t("Brief", "सार")}</h3>
          <ul data-no-translate>{g.brief.points.map((p) => <li key={p}>{p}</li>)}</ul>
        </section>
      )}

      <div className="ws-pills">
        <button type="button" className="ws-pill" aria-expanded={panel === "history"} onClick={() => setPanel((v) => (v === "history" ? null : "history"))}>{t("History", "इतिहास")}</button>
        <button type="button" className="ws-pill" aria-expanded={panel === "complaint"} onClick={() => setPanel((v) => (v === "complaint" ? null : "complaint"))}>{t("See complaint", "शिकायत देखें")}</button>
      </div>

      {panel === "history" && (
        <div className="ws-panel">
          <Timeline entries={g.timeline} />
        </div>
      )}
      {panel === "complaint" && (
        <div className="ws-panel">
          <p className="ws__desc">{g.description}</p>
          {g.call && g.call.transcript.length > 0 && (
            <details className="ws-call">
              <summary><Phone size={15} aria-hidden="true" /> {t(`Call · ${Math.max(1, Math.round(g.call.seconds / 60))} min`, `कॉल · ${Math.max(1, Math.round(g.call.seconds / 60))} मिनट`)}</summary>
              <ol data-no-translate>
                {g.call.transcript.map((l, i) => (
                  <li key={i} className={`ws-call__${l.who}`}><strong>{l.who === "agent" ? t("Agent", "एजेंट") : t("Citizen", "नागरिक")}</strong> {l.text}</li>
                ))}
              </ol>
            </details>
          )}
          {g.photos?.before && <img className="ws__photo" src={g.photos.before.dataUrl} alt={t("Citizen's photo of the problem", "समस्या की नागरिक द्वारा फ़ोटो")} />}
          <LocationCard pin={g.location} officer />
        </div>
      )}

      {isOpen(g) && (
        <button type="button" className="ws-pill ws-pill--next" onClick={() => setStep("act")}>{t("Next", "आगे")} <ArrowRight size={16} aria-hidden="true" /></button>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Console                                                             */
/* ------------------------------------------------------------------ */

function Console() {
  const { t, pick, lang } = useI18n();
  const { session } = useAuth();
  const { department, district, meta } = useMeta();
  const { data, setData, error, loading, reload } = useAsync((signal) => api.officerQueue("", signal), []);
  const [status, setStatus] = useState<"open" | "resolved" | "all">("open");
  const [query, setQuery] = useState("");
  const [districtFilter, setDistrictFilter] = useState<string | null>(null);
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [metric, setMetric] = useState<MapMetric>("pending");

  const all = data ?? [];
  const now = Date.now();
  const open = all.filter(isOpen);
  const resolved = all.filter((g) => !isOpen(g));
  const overdue = open.filter((g) => new Date(g.levelDueAt).getTime() < now);
  const soon = open.filter((g) => { const ms = new Date(g.levelDueAt).getTime() - now; return ms >= 0 && ms < 2 * DAY; });
  const recent = resolved.filter((g) => g.resolvedAt && now - new Date(g.resolvedAt).getTime() < 30 * DAY);
  const days = resolved.filter((g) => g.resolvedAt).map((g) => (new Date(g.resolvedAt!).getTime() - new Date(g.submittedAt).getTime()) / DAY);
  const avgDays = days.length ? (days.reduce((a, b) => a + b, 0) / days.length).toFixed(1) : "–";
  const ratings = all.filter((g) => g.feedback).map((g) => g.feedback!.rating);
  const rating = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : "–";
  const people = open.reduce((n, g) => n + 1 + g.supportCount, 0);

  // District rows for the map, in the same shape as the public dashboard.
  const rows = useMemo<Stats["byDistrict"]>(
    () =>
      (meta?.districts ?? []).map((d) => {
        const mine = all.filter((g) => g.districtId === d.id);
        const res = mine.filter((g) => !isOpen(g)).length;
        return { id: d.id, name: d.name, total: mine.length, pending: mine.length - res, resolved: res, overdue: mine.filter((g) => isOpen(g) && new Date(g.levelDueAt).getTime() < now).length, resolvedPct: mine.length ? Math.round((res / mine.length) * 100) : null, topIssue: null };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [meta, data],
  );

  const radar = [
    { label: t("Overdue", "विलंबित"), n: overdue.length, cls: "r-over" },
    { label: t("Due in 2 days", "2 दिन में देय"), n: soon.length, cls: "r-soon" },
    { label: t("3–7 days", "3–7 दिन"), n: open.filter((g) => { const d = (new Date(g.levelDueAt).getTime() - now) / DAY; return d >= 2 && d < 7; }).length, cls: "r-mid" },
    { label: t("7+ days", "7+ दिन"), n: open.filter((g) => (new Date(g.levelDueAt).getTime() - now) / DAY >= 7).length, cls: "r-ok" },
  ];
  const radarMax = Math.max(1, ...radar.map((r) => r.n));

  const dept = session?.role === "officer" ? department(session.departmentId) : undefined;
  // The demo officer for all departments ("*") sees open complaints by department instead of by issue.
  const allDepts = session?.role === "officer" && session.departmentId === "*";
  const byCategory = (allDepts
    ? (meta?.departments ?? []).map((d) => ({ c: { id: d.id, name: d.name }, n: open.filter((g) => g.departmentId === d.id).length }))
    : (dept?.categories ?? []).map((c) => ({ c, n: open.filter((g) => g.departmentId === dept?.id && g.categoryId === c.id).length })))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, 5);
  const catMax = Math.max(1, ...byCategory.map((x) => x.n));

  const list = all
    .filter((g) => (status === "open" ? isOpen(g) : status === "resolved" ? !isOpen(g) : true))
    .filter((g) => !districtFilter || g.districtId === districtFilter)
    .filter((g) => !urgentOnly || g.urgency === "high")
    .filter((g) => {
      const q = query.trim().toLowerCase();
      return !q || [g.id, g.subject, g.description, g.block, g.village, g.citizenName].some((v) => v?.toLowerCase().includes(q));
    });
  const current = all.find((g) => g.id === selected);
  const replace = (g: Grievance) => setData((r) => r?.map((x) => (x.id === g.id ? g : x)));

  if (loading) return <div className="container"><Loading /></div>;
  if (error) return <div className="container"><LoadError error={error} onRetry={reload} /></div>;
  if (session?.role !== "officer") return null;

  const kpis = [
    { Icon: CircleDot, label: t("Open", "खुली"), value: open.length, tone: "navy" },
    { Icon: AlarmClock, label: t("Due in 48 hours", "48 घंटे में देय"), value: soon.length, tone: "saffron" },
    { Icon: Clock3, label: t("Past deadline", "समय सीमा पार"), value: overdue.length, tone: "red" },
    { Icon: CheckCircle2, label: t("Resolved, last 30 days", "निस्तारित, पिछले 30 दिन"), value: recent.length, tone: "green" },
    { Icon: RefreshCw, label: t("Avg days to resolve", "औसत निस्तारण दिन"), value: avgDays, tone: "navy" },
    { Icon: Smile, label: t("Citizen rating", "नागरिक रेटिंग"), value: rating === "–" ? "–" : `${rating}/5`, tone: "violet" },
    { Icon: Users, label: t("Citizens waiting", "प्रतीक्षारत नागरिक"), value: people, tone: "teal" },
  ];

  return (
    <>
      <section className="oc-hero">
        <div className="container oc-hero__inner">
          <span className="oc-hero__badge" aria-hidden="true">{dept && <DeptIcon id={dept.id} size={30} />}</span>
          <div className="oc-hero__text">
            <p className="oc-hero__kicker"><ShieldCheck size={15} aria-hidden="true" /> {t("Officer console", "अधिकारी कंसोल")} · L{session.level}</p>
            <h1 className="oc-hero__title">{session.name}</h1>
            <p className="oc-hero__sub">{dept ? pick(dept.name) : allDepts ? t("All departments", "सभी विभाग") : ""} · {new Date().toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", { weekday: "long", day: "numeric", month: "long" })}</p>
          </div>
        </div>
      </section>

      <div className="container oc">
        <dl className="oc-kpis">
          {kpis.map(({ Icon, label, value, tone }, i) => (
            <div key={label} className={`oc-kpi oc-kpi--${tone}`} style={{ animationDelay: `${i * 60}ms` }}>
              <dt><Icon size={18} aria-hidden="true" /> {label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>

        <div className="oc-grid">
          <section className="card oc-map" aria-labelledby="oc-map-title">
            <div className="oc-card-head">
              <h2 id="oc-map-title">{t("By district", "जनपदवार")}</h2>
              <div className="segmented segmented--small" role="group" aria-label={t("Colour the map by", "मानचित्र का रंग")}>
                {([["pending", "Open", "खुली"], ["resolvedPct", "Resolved %", "निस्तारण %"], ["total", "All", "सभी"]] as const).map(([id, en, hi]) => (
                  <button key={id} type="button" aria-pressed={metric === id} onClick={() => setMetric(id)}>{t(en, hi)}</button>
                ))}
              </div>
            </div>
            <UkMap rows={rows} metric={metric} selected={districtFilter ?? undefined} onSelect={(id) => setDistrictFilter((d) => (d === id ? null : id))} />
          </section>

          <div className="oc-side">
            <section className="card" aria-labelledby="oc-radar-title">
              <h2 id="oc-radar-title" className="oc-h2">{t("Deadlines", "समय सीमा")}</h2>
              <ul className="oc-bars">
                {radar.map((r) => (
                  <li key={r.label}>
                    <span className="oc-bars__label">{r.label}</span>
                    <span className="oc-bars__track"><span className={`oc-bars__fill ${r.cls}`} style={{ width: `${(r.n / radarMax) * 100}%` }} /></span>
                    <span className="oc-bars__n">{r.n}</span>
                  </li>
                ))}
              </ul>
            </section>
            <section className="card" aria-labelledby="oc-cat-title">
              <h2 id="oc-cat-title" className="oc-h2">{allDepts ? t("Open, by department", "खुली, विभागवार") : t("Open, by issue", "खुली, विषयवार")}</h2>
              {byCategory.length ? (
                <ul className="oc-bars">
                  {byCategory.map(({ c, n }) => (
                    <li key={c.id}>
                      <span className="oc-bars__label">{pick(c.name)}</span>
                      <span className="oc-bars__track"><span className="oc-bars__fill r-cat" style={{ width: `${(n / catMax) * 100}%` }} /></span>
                      <span className="oc-bars__n">{n}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="muted small">{t("Nothing open. Well done.", "कुछ भी खुला नहीं। बहुत बढ़िया।")}</p>}
            </section>
          </div>
        </div>

        <div className="oc-work">
          <section aria-labelledby="oc-queue-title" className="oc-queue">
            <div className="oc-card-head">
              <h2 id="oc-queue-title">{t("Complaints", "शिकायतें")} <span className="oc-count">{list.length}</span></h2>
            </div>
            <div className="oc-tools">
              <label className="oc-search">
                <Search size={16} aria-hidden="true" />
                <span className="visually-hidden">{t("Search complaints", "शिकायतें खोजें")}</span>
                <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("Search number, place, citizen…", "संख्या, स्थान, नागरिक खोजें…")} />
              </label>
              <div className="segmented segmented--small" role="group" aria-label={t("Status", "स्थिति")}>
                {([["open", "Open", "खुली"], ["resolved", "Resolved", "निस्तारित"], ["all", "All", "सभी"]] as const).map(([id, en, hi]) => (
                  <button key={id} type="button" aria-pressed={status === id} onClick={() => setStatus(id)}>{t(en, hi)}</button>
                ))}
              </div>
              <button type="button" className="chip" aria-pressed={urgentOnly} onClick={() => setUrgentOnly((v) => !v)}>{t("Urgent only", "केवल अत्यावश्यक")}</button>
              {districtFilter && (
                <button type="button" className="chip chip--on" onClick={() => setDistrictFilter(null)}>
                  {pick(district(districtFilter)?.name ?? { en: "", hi: "" })} <X size={14} aria-hidden="true" />
                </button>
              )}
            </div>
            {!list.length && <p className="muted">{t("No complaints match.", "कोई शिकायत मेल नहीं खाती।")}</p>}
            <ul className="oc-list">
              {list.map((g) => {
                const due = daysUntil(g.levelDueAt);
                const live = isOpen(g);
                const tone = live && due < 0 ? "over" : g.urgency === "high" && live ? "urgent" : live && due <= 2 ? "soon" : live ? "open" : "done";
                return (
                  <li key={g.id}>
                    <button type="button" className={`oc-row oc-row--${tone}${selected === g.id ? " is-active" : ""}`} onClick={() => setSelected(g.id)} aria-pressed={selected === g.id}>
                      <span className="oc-row__main">
                        <span className="oc-row__title">{g.subject}</span>
                        <span className="oc-row__meta">{g.id} · {[g.block, pick(district(g.districtId)?.name ?? { en: "", hi: "" })].filter(Boolean).join(", ")} · {formatDate(g.submittedAt, lang)}</span>
                      </span>
                      <span className="oc-row__side">
                        {live ? (
                          <span className={`oc-row__due${due < 0 ? " is-overdue" : ""}`}>{due >= 0 ? t(`${due}d left`, `${due} दिन`) : t(`${-due}d late`, `${-due} दिन विलंब`)}</span>
                        ) : (
                          <StatusTag status={g.status} />
                        )}
                        <span className="oc-row__icons">
                          {g.urgency === "high" && live && <span className="oc-dot oc-dot--urgent" title={t("Urgent", "अत्यावश्यक")} />}
                          {g.supportCount > 0 && <span className="oc-mini"><Users size={13} aria-hidden="true" />{g.supportCount}</span>}
                          {g.channel === "whatsapp" && <span className="oc-mini oc-mini--wa"><MessageCircle size={13} aria-hidden="true" /></span>}
                          {g.channel === "phone" && <span className="oc-mini" title={t("Phone", "फ़ोन")}><Phone size={13} aria-hidden="true" /></span>}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
          <div className="oc-ws">
            {current ? (
              <Workspace key={current.id} g={current} onDone={replace} onClose={() => setSelected(null)} />
            ) : (
              <div className="ws-empty card">
                <Inbox size={36} aria-hidden="true" />
                <p><strong>{t("Select a complaint", "शिकायत चुनें")}</strong></p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export function Officer() {
  const { t } = useI18n();
  const { session, loading } = useAuth();
  useDocumentTitle("Officer console", "अधिकारी कंसोल");
  if (loading) return <div className="container section"><Loading /></div>;
  if (session?.role === "officer") return <Console />;
  return (
    <section className="oc-hero oc-hero--signin">
      <div className="container oc-hero__inner">
        <span className="oc-hero__badge" aria-hidden="true"><ShieldCheck size={30} /></span>
        <div className="oc-hero__text">
          <h1 className="oc-hero__title">{t("Officer console", "अधिकारी कंसोल")}</h1>
          <p><Link className="btn btn--accent" to="/login">{t("Sign in as an officer", "अधिकारी के रूप में साइन इन करें")}</Link></p>
        </div>
      </div>
    </section>
  );
}
