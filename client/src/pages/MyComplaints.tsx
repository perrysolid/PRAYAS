import { Link } from "react-router-dom";
import { OtpSignIn } from "../components/OtpSignIn";
import { PageHead } from "../components/PageHead";
import { LoadError, Loading } from "../components/States";
import { StatusTag } from "../components/StatusTag";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";
import { useMeta } from "../context/MetaContext";
import { useAsync } from "../hooks/useAsync";
import { api } from "../lib/api";
import { daysUntil, formatDate } from "../lib/format";
import type { Grievance } from "../lib/types";

const isOpen = (g: Grievance) => g.status !== "resolved" && g.status !== "closed";

function List() {
  const { t, pick, lang } = useI18n();
  const { department } = useMeta();
  const { data, error, loading, reload } = useAsync((signal) => api.myGrievances(signal), []);

  if (loading) return <Loading />;
  if (error) return <LoadError error={error} onRetry={reload} />;
  if (!data?.length) {
    return (
      <div className="empty">
        <p>{t("You have not registered any complaints from this mobile number.", "इस मोबाइल नंबर से कोई शिकायत दर्ज नहीं है।")}</p>
        <Link className="btn" to="/register">{t("Register a complaint", "शिकायत दर्ज करें")}</Link>
      </div>
    );
  }

  const open = data.filter(isOpen);
  const done = data.filter((g) => !isOpen(g));

  const card = (g: Grievance) => {
    const due = daysUntil(g.levelDueAt);
    return (
      <li key={g.id} className="complaint-row">
        <div className="complaint-row__main">
          <Link className="complaint-row__title" to={`/my-complaints/${g.id}`}>{g.subject}</Link>
          <span className="complaint-row__meta">
            {g.id} · {pick(department(g.departmentId)?.name ?? { en: "", hi: "" })} · {t("Registered", "दर्ज")} {formatDate(g.submittedAt, lang)}
          </span>
          {g.actions.canGiveFeedback && <span className="complaint-row__cta">{t("Action taken. Tell us if the problem is solved.", "कार्यवाही हो गई। बताएँ कि समस्या हल हुई या नहीं।")}</span>}
          {g.actions.canRemind && <span className="complaint-row__cta">{t("You can send a reminder.", "आप अनुस्मारक भेज सकते हैं।")}</span>}
        </div>
        <div className="complaint-row__status">
          <StatusTag status={g.status} />
          {isOpen(g) && (
            <span className={`small${due < 0 ? " is-overdue" : " muted"}`}>
              L{g.level} · {due >= 0 ? t(`${due} days left`, `${due} दिन शेष`) : t("overdue", "समय सीमा पार")}
            </span>
          )}
        </div>
      </li>
    );
  };

  return (
    <>
      <h2>{t(`Open (${open.length})`, `खुली (${open.length})`)}</h2>
      {open.length ? <ul className="complaint-list">{open.map(card)}</ul> : <p className="muted">{t("Nothing open right now.", "अभी कोई खुली शिकायत नहीं।")}</p>}
      {done.length > 0 && (
        <>
          <h2>{t(`Resolved (${done.length})`, `निस्तारित (${done.length})`)}</h2>
          <ul className="complaint-list">{done.map(card)}</ul>
        </>
      )}
    </>
  );
}

export function MyComplaints() {
  const { t } = useI18n();
  const { session, loading } = useAuth();
  return (
    <>
      <PageHead en="My complaints" hi="मेरी शिकायतें" />
      <div className="container grid-2-1">
        <div>
          {loading ? <Loading /> : session?.role === "citizen" ? (
            <List />
          ) : (
            <>
              <p>{t("Sign in with the mobile number you used to register.", "पंजीकरण में प्रयुक्त मोबाइल नंबर से साइन इन करें।")}</p>
              <OtpSignIn />
              <p className="small muted" style={{ marginTop: "var(--s5)" }}>{t("Demo: use 9876543210 to see sample complaints.", "डेमो: नमूना शिकायतें देखने के लिए 9876543210 का उपयोग करें।")}</p>
            </>
          )}
        </div>
        <aside>
          <div className="aside-card aside-card--plain">
            <h3>{t("Register a new grievance", "नई शिकायत दर्ज करें")}</h3>
            <p className="small muted">{t("For a problem not already registered with CM Helpline 1905.", "ऐसी समस्या हेतु जो सीएम हेल्पलाइन 1905 पर पहले से दर्ज नहीं है।")}</p>
            <Link className="btn" to="/register">{t("Register a complaint", "शिकायत दर्ज करें")}</Link>
          </div>
        </aside>
      </div>
    </>
  );
}
