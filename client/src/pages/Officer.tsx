import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Users } from "lucide-react";
import { PhotoInput } from "../components/PhotoInput";
import { ErrorSummary, Field, TextArea, describedBy } from "../components/Form";
import { PageHead } from "../components/PageHead";
import { LoadError, Loading } from "../components/States";
import { StatusTag } from "../components/StatusTag";
import { Timeline } from "../components/Timeline";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";
import { useMeta } from "../context/MetaContext";
import { useAsync } from "../hooks/useAsync";
import { api, ApiError } from "../lib/api";
import { daysUntil, formatDate } from "../lib/format";
import type { Grievance, Photo } from "../lib/types";

function ActionForm({ g, onDone }: { g: Grievance; onDone: (g: Grievance) => void }) {
  const { t } = useI18n();
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const act = async (action: "note" | "resolve", e?: FormEvent) => {
    e?.preventDefault();
    const next: Record<string, string> = {};
    if (note.trim().length < 10) next[`note-${g.id}`] = t("Write at least 10 characters about the action taken", "की गई कार्यवाही के बारे में कम से कम 10 अक्षर लिखें");
    if (action === "resolve" && !photo) next[`photo-${g.id}`] = t("Attach a photo that shows the problem is fixed, or of the order or letter issued", "समाधान दिखाने वाली फ़ोटो, या जारी आदेश/पत्र की फ़ोटो संलग्न करें");
    if (Object.keys(next).length) return setErrors(next);
    setBusy(true);
    setErrors({});
    try {
      onDone(await api.officerAct(g.id, action, note.trim(), action === "resolve" ? photo ?? undefined : undefined));
      setNote("");
      setPhoto(null);
    } catch (err) {
      setErrors({ [`note-${g.id}`]: err instanceof ApiError && err.fields.note ? err.fields.note : (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const id = `note-${g.id}`;
  return (
    <form onSubmit={(e) => act("note", e)} noValidate>
      <ErrorSummary errors={errors} />
      <Field id={id} label={t("Action taken / update for the citizen", "की गई कार्यवाही / नागरिक हेतु अद्यतन")} hint={t("The citizen reads this. Write plainly: what was done, where, and when.", "नागरिक इसे पढ़ेंगे। सरल भाषा में लिखें: क्या, कहाँ और कब किया गया।")} error={errors[id]}>
        <TextArea id={id} rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} invalid={Boolean(errors[id])} aria-describedby={describedBy(id, true, errors[id])} />
      </Field>
      <PhotoInput
        id={`photo-${g.id}`}
        label={t("Proof of resolution (needed to mark resolved)", "निस्तारण का प्रमाण (निस्तारित करने हेतु आवश्यक)")}
        hint={t("Photo of the site after the fix, geo-tagged automatically. For paperwork, a photo of the order or letter.", "समाधान के बाद स्थल की फ़ोटो, स्थान स्वतः दर्ज। कागज़ी कार्य हेतु आदेश या पत्र की फ़ोटो।")}
        error={errors[`photo-${g.id}`]}
        value={photo}
        onChange={setPhoto}
      />
      <div className="btn-row">
        <button type="button" className="btn btn--success" disabled={busy} onClick={() => act("resolve")}>{t("Mark resolved", "निस्तारित करें")}</button>
        <button type="submit" className="btn btn--secondary" disabled={busy}>{t("Add update only", "केवल अद्यतन जोड़ें")}</button>
      </div>
    </form>
  );
}

function Queue() {
  const { t, pick, lang } = useI18n();
  const { department, district } = useMeta();
  const [filter, setFilter] = useState("open");
  const [openId, setOpenId] = useState<string | null>(null);
  const { data, setData, error, loading, reload } = useAsync((signal) => api.officerQueue(filter, signal), [filter]);

  const replace = (g: Grievance) => setData((rows) => rows?.map((r) => (r.id === g.id ? g : r)));

  return (
    <>
      <div className="segmented" role="group" aria-label={t("Filter", "फ़िल्टर")}>
        {[
          { id: "open", en: "Open", hi: "खुली" },
          { id: "resolved", en: "Resolved", hi: "निस्तारित" },
          { id: "", en: "All", hi: "सभी" },
        ].map((f) => (
          <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>{t(f.en, f.hi)}</button>
        ))}
      </div>
      {loading && <Loading />}
      {error && <LoadError error={error} onRetry={reload} />}
      {data && !data.length && <p className="muted">{t("No complaints here.", "यहाँ कोई शिकायत नहीं।")}</p>}
      {data && data.length > 0 && (
        <ul className="complaint-list">
          {data.map((g) => {
            const due = daysUntil(g.levelDueAt);
            const open = g.status !== "resolved" && g.status !== "closed";
            return (
              <li key={g.id} className="complaint-row complaint-row--officer">
                <div className="complaint-row__main">
                  <button type="button" className="complaint-row__title btn btn--quiet" aria-expanded={openId === g.id} onClick={() => setOpenId(openId === g.id ? null : g.id)}>
                    {g.subject}
                  </button>
                  <span className="complaint-row__meta">
                    {g.id} · {pick(department(g.departmentId)?.categories.find((c) => c.id === g.categoryId)?.name ?? { en: "", hi: "" })} · {[g.block, pick(district(g.districtId)?.name ?? { en: "", hi: "" })].filter(Boolean).join(", ")} · {formatDate(g.submittedAt, lang)}
                  </span>
                  {openId === g.id && (
                    <div className="officer-detail">
                      <p style={{ whiteSpace: "pre-wrap" }}>{g.description}</p>
                      {g.photos?.before && <img className="officer-detail__photo" src={g.photos.before.dataUrl} alt={t("Citizen's photo of the problem", "समस्या की नागरिक द्वारा फ़ोटो")} />}
                      <p className="small muted">{t("Citizen", "नागरिक")}: {g.citizenName}, {g.citizenMobile} · {t("Reminders", "अनुस्मारक")}: {g.remindersSent}</p>
                      {open && <ActionForm g={g} onDone={replace} />}
                      <h3>{t("History", "इतिहास")}</h3>
                      <Timeline entries={g.timeline} />
                    </div>
                  )}
                </div>
                <div className="complaint-row__status">
                  <StatusTag status={g.status} />
                  {g.urgency === "high" && <StatusTag status="urgent" />}
                  {g.supportCount > 0 && <span className="people"><Users size={16} aria-hidden="true" /> {t(`+${g.supportCount} citizens`, `+${g.supportCount} नागरिक`)}</span>}
                  {open && <span className={`small${due < 0 ? " is-overdue" : " muted"}`}>L{g.level} · {due >= 0 ? t(`${due} days left`, `${due} दिन शेष`) : t(`${-due} days overdue`, `${-due} दिन विलंब`)}</span>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

export function Officer() {
  const { t, pick } = useI18n();
  const { session, loading } = useAuth();
  const { department } = useMeta();
  return (
    <>
      <PageHead en="Officer desk" hi="अधिकारी डेस्क" lead={session?.role === "officer" ? `${session.name} · ${pick(department(session.departmentId)?.name ?? { en: "", hi: "" })} · L${session.level}` : undefined} />
      <div className="container">
        {loading ? <Loading /> : session?.role === "officer" ? (
          <>
            <p className="muted">{t("Overdue and urgent complaints come first, then problems many citizens share. Resolving needs a photo as proof.", "समय सीमा पार और अत्यावश्यक शिकायतें पहले, फिर कई नागरिकों की साझा समस्याएँ। निस्तारण हेतु फ़ोटो प्रमाण आवश्यक है।")}</p>
            <Queue />
          </>
        ) : (
          <p>
            {t("This desk is for department officers.", "यह डेस्क विभागीय अधिकारियों के लिए है।")} <Link to="/login">{t("Sign in as an officer", "अधिकारी के रूप में साइन इन करें")}</Link>.
          </p>
        )}
      </div>
    </>
  );
}
