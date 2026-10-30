import { Link, useSearchParams } from "react-router-dom";
import { Ladder } from "../components/Ladder";
import { PageHead } from "../components/PageHead";
import { LoadError, Loading } from "../components/States";
import { StatusTag } from "../components/StatusTag";
import { Timeline } from "../components/Timeline";
import { TrackForm } from "../components/TrackForm";
import { useI18n } from "../context/I18nContext";
import { useMeta } from "../context/MetaContext";
import { useAsync } from "../hooks/useAsync";
import { api } from "../lib/api";
import { formatDate } from "../lib/format";
import { ReadAloud } from "../components/ReadAloud";
import { BadgeCheck, Users } from "lucide-react";

function Result({ id, mobile }: { id: string; mobile: string }) {
  const { t, pick, lang } = useI18n();
  const { department, district } = useMeta();
  const { data, error, loading } = useAsync((signal) => api.track(id, mobile, signal), [id, mobile]);

  if (loading) return <Loading />;
  if (error) return <LoadError error={error} />;
  if (!data) return null;
  const dept = department(data.departmentId);
  const cat = dept?.categories.find((c) => c.id === data.categoryId);
  const dist = district(data.districtId);

  return (
    <section aria-labelledby="result-title" className="result">
      <h2 id="result-title">
        {data.id} <StatusTag status={data.status} />
      </h2>
      <div className="result__chips">
        {data.supportCount > 0 && (
          <span className="pill"><Users size={16} aria-hidden="true" /> {t(`${data.supportCount + 1} citizens face this problem`, `${data.supportCount + 1} नागरिक इस समस्या से प्रभावित`)}</span>
        )}
        {data.hasProof && (
          <span className="pill pill--ok"><BadgeCheck size={16} aria-hidden="true" /> {t("Resolved with photo proof", "फ़ोटो प्रमाण सहित निस्तारित")}</span>
        )}
        <ReadAloud
          text={
            data.status === "resolved" || data.status === "closed"
              ? t(`Complaint ${data.id} is ${data.status === "closed" ? "closed" : "resolved"}.`, `शिकायत ${data.id} ${data.status === "closed" ? "बंद" : "निस्तारित"} हो गई है।`)
              : t(
                  `Complaint ${data.id} is with the ${data.currentOfficer.en}, level ${data.level}. They must act by ${formatDate(data.levelDueAt, "en")}.`,
                  `शिकायत ${data.id} स्तर ${data.level} पर ${data.currentOfficer.hi} के पास है। उन्हें ${formatDate(data.levelDueAt, "hi")} तक कार्यवाही करनी है।`,
                )
          }
        />
      </div>
      <dl className="summary">
        <div className="summary__row"><dt>{t("Registered by", "दर्ज करने वाले")}</dt><dd>{data.citizenName}</dd></div>
        <div className="summary__row"><dt>{t("Registered on", "दर्ज तिथि")}</dt><dd>{formatDate(data.submittedAt, lang)}</dd></div>
        {dept && <div className="summary__row"><dt>{t("Department", "विभाग")}</dt><dd>{pick(dept.name)}{cat ? ` – ${pick(cat.name)}` : ""}</dd></div>}
        {dist && <div className="summary__row"><dt>{t("District", "जनपद")}</dt><dd>{pick(dist.name)}</dd></div>}
        <div className="summary__row"><dt>{t("With", "किसके पास")}</dt><dd>{pick(data.currentOfficer)} (L{data.level})</dd></div>
      </dl>
      <h3>{t("Who is handling it", "कौन देख रहा है")}</h3>
      <Ladder current={data} />
      <h3>{t("History", "इतिहास")}</h3>
      <Timeline entries={data.timeline} />
      <div className="notice">
        <p>
          {t("To read officer notes, send a reminder or give feedback,", "अधिकारी की टिप्पणी पढ़ने, अनुस्मारक भेजने या प्रतिक्रिया देने के लिए")}{" "}
          <Link to={`/my-complaints/${data.id}`}>{t("sign in with this mobile number", "इसी मोबाइल नंबर से साइन इन करें")}</Link>.
        </p>
      </div>
    </section>
  );
}

export function Track() {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const id = params.get("id") ?? "";
  const mobile = params.get("mobile") ?? "";

  return (
    <>
      <PageHead en="Check complaint status" hi="शिकायत की स्थिति देखें" lead={t("Use the complaint number from your SMS and the mobile number you registered with.", "SMS में मिली शिकायत संख्या और पंजीकृत मोबाइल नंबर का उपयोग करें।")} />
      <div className="container grid-2-1">
        <div>{id && mobile ? <Result id={id} mobile={mobile} /> : <TrackForm key={id} initial={{ id, mobile: "" }} />}</div>
        <aside>
          {id && mobile && (
            <div className="aside-card">
              <h3>{t("Check another", "दूसरी शिकायत देखें")}</h3>
              <TrackForm compact key={id} />
            </div>
          )}
          <div className="aside-card aside-card--plain">
            <h3>{t("Lost your number?", "संख्या खो गई?")}</h3>
            <p>
              <Link to="/my-complaints">{t("Sign in with your mobile", "मोबाइल से साइन इन करें")}</Link> {t("to see every complaint you have registered.", "और अपनी सभी शिकायतें देखें।")}
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
