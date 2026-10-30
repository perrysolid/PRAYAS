import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Printer } from "lucide-react";
import QRCode from "qrcode";
import { OtpSignIn } from "../components/OtpSignIn";
import { LoadError, Loading } from "../components/States";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";
import { useMeta } from "../context/MetaContext";
import { useAsync } from "../hooks/useAsync";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { typeLabels } from "../i18n/strings";
import { api } from "../lib/api";
import { formatDate, formatDateTime } from "../lib/format";

/** QR that opens the public status page. It carries only the complaint number, never the mobile. */
function TrackQr({ id }: { id: string }) {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    QRCode.toString(`${window.location.origin}/track?id=${id}`, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#0a2650", light: "#ffffff" } }).then(setSvg, () => setSvg(""));
  }, [id]);
  return <span aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} />;
}

function Slip({ id }: { id: string }) {
  const { t, pick, lang } = useI18n();
  const { department, district } = useMeta();
  const { data: g, error, loading, reload } = useAsync((signal) => api.grievance(id, signal), [id]);
  if (loading) return <Loading />;
  if (error) return <LoadError error={error} onRetry={reload} />;
  if (!g) return null;
  const dept = department(g.departmentId);
  const cat = dept?.categories.find((c) => c.id === g.categoryId);
  const dist = district(g.districtId);

  return (
    <>
      <div className="btn-row no-print" style={{ justifyContent: "center", marginBottom: "var(--s5)" }}>
        <button type="button" className="btn" onClick={() => window.print()}>
          <Printer size={18} aria-hidden="true" /> {t("Print or save as PDF", "प्रिंट करें या PDF सहेजें")}
        </button>
        <Link className="btn btn--secondary" to={`/my-complaints/${g.id}`}>{t("Back to complaint", "शिकायत पर वापस")}</Link>
      </div>
      <article className="receipt" aria-labelledby="receipt-title">
        <header className="receipt__head">
          <img src="/img/seal.png" alt="" />
          <div>
            <h2 id="receipt-title">{t("Acknowledgement of complaint", "शिकायत की पावती")}</h2>
            <p>{t("CM Helpline 1905 · Government of Uttarakhand", "मुख्यमंत्री हेल्पलाइन 1905 · उत्तराखंड सरकार")}</p>
          </div>
        </header>
        <div className="receipt__body">
          <div>
            <p className="small muted" style={{ margin: 0 }}>{t("Complaint number", "शिकायत संख्या")}</p>
            <p className="receipt__ref">{g.id}</p>
            <dl className="summary summary--compact">
              <div className="summary__row"><dt>{t("Registered on", "दर्ज तिथि")}</dt><dd>{formatDateTime(g.submittedAt, lang)}</dd></div>
              <div className="summary__row"><dt>{t("Name", "नाम")}</dt><dd>{g.citizenName} · {g.citizenMobile}</dd></div>
              <div className="summary__row"><dt>{t("Type", "प्रकार")}</dt><dd>{pick(typeLabels[g.type])}</dd></div>
              <div className="summary__row"><dt>{t("Subject", "विषय")}</dt><dd>{g.subject}</dd></div>
              {dept && <div className="summary__row"><dt>{t("Department", "विभाग")}</dt><dd>{pick(dept.name)}{cat ? ` – ${pick(cat.name)}` : ""}</dd></div>}
              <div className="summary__row"><dt>{t("Place", "स्थान")}</dt><dd>{[g.village, g.block, dist && pick(dist.name)].filter(Boolean).join(", ")}</dd></div>
              <div className="summary__row"><dt>{t("Assigned to", "सौंपी गई")}</dt><dd>{pick(g.currentOfficer)} (L{g.level})</dd></div>
              <div className="summary__row"><dt>{t("Action due by", "कार्यवाही की अंतिम तिथि")}</dt><dd><strong>{formatDate(g.levelDueAt, lang)}</strong></dd></div>
            </dl>
          </div>
          <div className="receipt__qr">
            <TrackQr id={g.id} />
            {t("Scan to check the status. You will need your mobile number.", "स्थिति देखने हेतु स्कैन करें। मोबाइल नंबर आवश्यक होगा।")}
          </div>
        </div>
        <p className="receipt__foot">
          {t(
            "If it is not resolved by the date above, it moves to a higher officer automatically. Send a reminder after 7 days. Call 1905 (toll free) with this number for help. This is a computer-generated acknowledgement and needs no signature.",
            "उपरोक्त तिथि तक निस्तारण न होने पर यह स्वतः उच्च अधिकारी को जाएगी। 7 दिन बाद अनुस्मारक भेजें। सहायता हेतु इस संख्या के साथ 1905 (निःशुल्क) पर कॉल करें। यह कंप्यूटर जनित पावती है, हस्ताक्षर आवश्यक नहीं।",
          )}
        </p>
      </article>
    </>
  );
}

export function Receipt() {
  const { t } = useI18n();
  const { id = "" } = useParams();
  const { session, loading } = useAuth();
  useDocumentTitle(`Acknowledgement ${id}`, `पावती ${id}`);
  return (
    <div className="container section">
      <h1 className={session?.role === "citizen" || loading ? "visually-hidden" : undefined}>
        {session?.role === "citizen" || loading ? t(`Acknowledgement for ${id}`, `${id} की पावती`) : t("Sign in to download the acknowledgement", "पावती हेतु साइन इन करें")}
      </h1>
      {loading ? <Loading /> : session?.role === "citizen" ? <Slip id={id} /> : <OtpSignIn />}
    </div>
  );
}
