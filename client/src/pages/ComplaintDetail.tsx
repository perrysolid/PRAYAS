import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { BadgeCheck, Download, Users } from "lucide-react";
import { BeforeAfter } from "../components/BeforeAfter";
import { ReadAloud } from "../components/ReadAloud";
import { ErrorSummary, Field, TextArea, describedBy } from "../components/Form";
import { Ladder } from "../components/Ladder";
import { OtpSignIn } from "../components/OtpSignIn";
import { PageHead } from "../components/PageHead";
import { LoadError, Loading } from "../components/States";
import { StatusTag } from "../components/StatusTag";
import { Timeline } from "../components/Timeline";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";
import { useMeta } from "../context/MetaContext";
import { useAsync } from "../hooks/useAsync";
import { typeLabels } from "../i18n/strings";
import { api, ApiError } from "../lib/api";
import { formatDate, formatDateTime } from "../lib/format";
import type { Grievance } from "../lib/types";

const ratings = [
  { value: 5, en: "Very satisfied – fully solved", hi: "बहुत संतुष्ट – पूरी तरह हल" },
  { value: 4, en: "Satisfied", hi: "संतुष्ट" },
  { value: 3, en: "Partly solved", hi: "आंशिक रूप से हल" },
  { value: 2, en: "Not satisfied", hi: "असंतुष्ट" },
  { value: 1, en: "Not solved at all", hi: "बिल्कुल हल नहीं हुआ" },
];

function Actions({ g, onChange }: { g: Grievance; onChange: (g: Grievance) => void }) {
  const { t, lang } = useI18n();
  const [mode, setMode] = useState<"none" | "reopen">("none");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState("");

  const run = async (fn: () => Promise<Grievance>, success: string) => {
    setBusy(true);
    setErrors({});
    try {
      const updated = await fn();
      onChange(updated);
      setFlash(success);
      setMode("none");
    } catch (err) {
      setErrors(err instanceof ApiError && Object.keys(err.fields).length ? err.fields : { _: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const submitFeedback = (e: FormEvent) => {
    e.preventDefault();
    if (!rating) return setErrors({ "rating-5": t("Choose how satisfied you are", "चुनें कि आप कितने संतुष्ट हैं") });
    run(() => api.feedback(g.id, rating, comment.trim()), rating >= 3 ? t("Thank you. The complaint is now closed.", "धन्यवाद। शिकायत अब बंद हो गई है।") : t("Thank you. You can reopen it below if the problem is not solved.", "धन्यवाद। समस्या हल न होने पर नीचे से पुनः खोल सकते हैं।"));
  };

  const submitReopen = (e: FormEvent) => {
    e.preventDefault();
    if (reason.trim().length < 10) return setErrors({ reason: t("Tell us what is still wrong, in at least 10 characters", "कम से कम 10 अक्षरों में बताएँ कि क्या अब भी गलत है") });
    run(() => api.reopen(g.id, reason.trim()), t("Reopened and sent to a higher officer.", "पुनः खोली गई और उच्च अधिकारी को भेजी गई।"));
  };

  return (
    <div className="actions-panel">
      {flash && (
        <div className="notice notice--success" role="status">
          <p>{flash}</p>
        </div>
      )}
      <ErrorSummary errors={errors} />

      {g.actions.canGiveFeedback && (
        <form onSubmit={submitFeedback} noValidate className="action-block">
          <h2>{t("Is the problem solved?", "क्या समस्या हल हुई?")}</h2>
          <p>{t("Your answer is seen by senior officers. A low rating lets you reopen the complaint.", "आपका उत्तर वरिष्ठ अधिकारी देखते हैं। कम रेटिंग देने पर आप शिकायत पुनः खोल सकते हैं।")}</p>
          <fieldset className={`field${errors["rating-5"] ? " field--error" : ""}`} style={{ border: 0, padding: 0 }}>
            <legend className="field__label">{t("How satisfied are you with the action taken?", "की गई कार्यवाही से आप कितने संतुष्ट हैं?")}</legend>
            {errors["rating-5"] && <span className="field__error">{errors["rating-5"]}</span>}
            <div className="radios">
              {ratings.map((r) => (
                <label className="radio" key={r.value}>
                  <input type="radio" name="rating" id={`rating-${r.value}`} value={r.value} checked={rating === r.value} onChange={() => setRating(r.value)} />
                  <span>{t(r.en, r.hi)}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <Field id="comment" label={t("Anything to add? (optional)", "कुछ और कहना है? (वैकल्पिक)")}>
            <TextArea id="comment" rows={3} maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)} />
          </Field>
          <button className="btn" type="submit" disabled={busy}>{t("Send feedback", "प्रतिक्रिया भेजें")}</button>
        </form>
      )}

      {g.actions.canReopen && !g.actions.canGiveFeedback && (
        <div className="action-block">
          <h2>{t("Problem came back or not fixed?", "समस्या फिर से हुई या हल नहीं हुई?")}</h2>
          {mode === "reopen" ? (
            <form onSubmit={submitReopen} noValidate>
              <Field id="reason" label={t("What is still wrong?", "क्या अब भी गलत है?")} hint={t(`It will go to a higher officer. You can reopen until ${formatDate(g.actions.reopenUntil!, lang)}.`, `यह उच्च अधिकारी को जाएगी। आप ${formatDate(g.actions.reopenUntil!, lang)} तक पुनः खोल सकते हैं।`)} error={errors.reason}>
                <TextArea id="reason" rows={4} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} invalid={Boolean(errors.reason)} aria-describedby={describedBy("reason", true, errors.reason)} />
              </Field>
              <div className="btn-row">
                <button className="btn" type="submit" disabled={busy}>{t("Reopen complaint", "शिकायत पुनः खोलें")}</button>
                <button className="btn btn--quiet" type="button" onClick={() => setMode("none")}>{t("Cancel", "रद्द करें")}</button>
              </div>
            </form>
          ) : (
            <button className="btn btn--secondary" type="button" onClick={() => setMode("reopen")}>{t("Reopen complaint", "शिकायत पुनः खोलें")}</button>
          )}
        </div>
      )}

      {(g.status === "registered" || g.status === "in_progress" || g.status === "reopened") && (
        <div className="action-block">
          <h2>{t("Taking too long?", "बहुत देर हो रही है?")}</h2>
          {g.actions.canRemind ? (
            <>
              <p>{t("A reminder goes to the officer handling it and is visible to the Chief Minister's Office.", "अनुस्मारक संबंधित अधिकारी को जाता है और मुख्यमंत्री कार्यालय को भी दिखता है।")}</p>
              <button className="btn btn--secondary" type="button" disabled={busy} onClick={() => run(() => api.remind(g.id), t("Reminder sent.", "अनुस्मारक भेजा गया।"))}>
                {t("Send a reminder", "अनुस्मारक भेजें")}
              </button>
            </>
          ) : (
            <p className="muted">
              {t("You can send a reminder from", "आप अनुस्मारक भेज सकते हैं")} <strong>{formatDateTime(g.actions.reminderAvailableAt!, lang)}</strong>
              {t(". Officers get 7 days before the first reminder, and 3 days between reminders.", " से। पहले अनुस्मारक से पहले अधिकारी को 7 दिन और दो अनुस्मारकों के बीच 3 दिन मिलते हैं।")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Detail({ id }: { id: string }) {
  const { t, pick, lang } = useI18n();
  const { department, district } = useMeta();
  const { data: g, setData, error, loading, reload } = useAsync((signal) => api.grievance(id, signal), [id]);

  if (loading) return <div className="container"><Loading /></div>;
  if (error) return <div className="container"><LoadError error={error} onRetry={reload} /></div>;
  if (!g) return null;

  const dept = department(g.departmentId);
  const cat = dept?.categories.find((c) => c.id === g.categoryId);
  const dist = district(g.districtId);
  const latestNote = [...g.timeline].reverse().find((e) => e.event === "resolved" || e.event === "note");

  return (
    <div className="container grid-2-1">
      <div>
        <div className="detail-status">
          <StatusTag status={g.status} /> {g.urgency === "high" && <StatusTag status="urgent" />}
          {g.supportCount > 0 && <span className="pill"><Users size={16} aria-hidden="true" /> {t(`${g.supportCount} others joined`, `${g.supportCount} अन्य जुड़े`)}</span>}
          {g.photos?.after && <span className="pill pill--ok"><BadgeCheck size={16} aria-hidden="true" /> {t("Photo proof", "फ़ोटो प्रमाण")}</span>}
          <ReadAloud
            text={
              g.status === "resolved" || g.status === "closed"
                ? t(`Your complaint about ${g.subject} is ${g.status === "closed" ? "closed" : "resolved"}. ${latestNote?.note ?? ""}`, `${g.subject} के बारे में आपकी शिकायत ${g.status === "closed" ? "बंद" : "निस्तारित"} हो गई है। ${latestNote?.note ?? ""}`)
                : t(
                    `Your complaint about ${g.subject} is with the ${g.currentOfficer.en}, level ${g.level}. They must act by ${formatDate(g.levelDueAt, "en")}. ${latestNote?.note ? `Latest update: ${latestNote.note}` : ""}`,
                    `${g.subject} के बारे में आपकी शिकायत स्तर ${g.level} पर ${g.currentOfficer.hi} के पास है। उन्हें ${formatDate(g.levelDueAt, "hi")} तक कार्यवाही करनी है। ${latestNote?.note ? `नवीनतम अद्यतन: ${latestNote.note}` : ""}`,
                  )
            }
          />
          <Link className="btn btn--secondary btn--small" to={`/my-complaints/${g.id}/receipt`}>
            <Download size={16} aria-hidden="true" /> {t("Acknowledgement", "पावती")}
          </Link>
        </div>
        {latestNote?.note && (
          <div className={`notice${g.status === "resolved" || g.status === "closed" ? " notice--success" : ""}`}>
            <span className="notice__title">{t("Latest from the officer", "अधिकारी की नवीनतम टिप्पणी")}</span>
            <p>“{latestNote.note}”</p>
            <p className="small muted">{latestNote.by}, {formatDateTime(latestNote.at, lang)}</p>
          </div>
        )}
        {g.photos?.after && (
          <section aria-labelledby="proof-title">
            <h2 id="proof-title">{t("Proof of resolution", "निस्तारण का प्रमाण")}</h2>
            <BeforeAfter before={g.photos.before} after={g.photos.after} />
          </section>
        )}
        <Actions g={g} onChange={setData} />
        <h2>{t("History", "इतिहास")}</h2>
        <Timeline entries={g.timeline} />
      </div>
      <aside>
        <div className="aside-card aside-card--plain">
          <h2 className="h3">{t("Your complaint", "आपकी शिकायत")}</h2>
          <dl className="summary summary--compact">
            <div className="summary__row"><dt>{t("Number", "संख्या")}</dt><dd>{g.id}</dd></div>
            <div className="summary__row"><dt>{t("Type", "प्रकार")}</dt><dd>{pick(typeLabels[g.type])}</dd></div>
            {dept && <div className="summary__row"><dt>{t("Department", "विभाग")}</dt><dd>{pick(dept.name)}{cat ? ` – ${pick(cat.name)}` : ""}</dd></div>}
            <div className="summary__row"><dt>{t("Place", "स्थान")}</dt><dd>{[g.village, g.block, dist && pick(dist.name)].filter(Boolean).join(", ")}</dd></div>
            <div className="summary__row"><dt>{t("Registered", "दर्ज")}</dt><dd>{formatDate(g.submittedAt, lang)}</dd></div>
          </dl>
          <details>
            <summary>{t("What you wrote", "आपने क्या लिखा")}</summary>
            <p style={{ whiteSpace: "pre-wrap" }}>{g.description}</p>
            {g.photos?.before && <img src={g.photos.before.dataUrl} alt={t("Your photo of the problem", "समस्या की आपकी फ़ोटो")} style={{ width: "100%", borderRadius: 8 }} />}
          </details>
        </div>
        <h2 className="h3">{t("Who is handling it", "कौन देख रहा है")}</h2>
        <Ladder current={g} />
      </aside>
    </div>
  );
}

export function ComplaintDetail() {
  const { t } = useI18n();
  const { id = "" } = useParams();
  const { session, loading } = useAuth();
  return (
    <>
      <PageHead en={`Complaint ${id}`} hi={`शिकायत ${id}`} crumbs={[{ to: "/my-complaints", en: "My complaints", hi: "मेरी शिकायतें" }]} />
      {loading ? (
        <div className="container"><Loading /></div>
      ) : session?.role === "citizen" ? (
        <Detail id={id} />
      ) : (
        <div className="container">
          <p>{t("Sign in with the mobile number used for this complaint.", "इस शिकायत में प्रयुक्त मोबाइल नंबर से साइन इन करें।")}</p>
          <OtpSignIn />
          <p className="small" style={{ marginTop: "var(--s5)" }}>
            <Link to="/track">{t("Or check the status without signing in", "या बिना साइन इन स्थिति देखें")}</Link>
          </p>
        </div>
      )}
    </>
  );
}
