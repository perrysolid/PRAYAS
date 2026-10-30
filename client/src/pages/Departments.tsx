import { Link } from "react-router-dom";
import { DeptIcon } from "../components/DeptIcon";
import { PageHead } from "../components/PageHead";
import { Loading } from "../components/States";
import { useI18n } from "../context/I18nContext";
import { useMeta } from "../context/MetaContext";

export function Departments() {
  const { t, pick } = useI18n();
  const { meta } = useMeta();
  return (
    <>
      <PageHead
        en="Departments and what you can complain about"
        hi="विभाग और किन विषयों पर शिकायत कर सकते हैं"
        lead={t("Not sure which department? Just describe the problem and we will work it out.", "विभाग पता नहीं? बस समस्या बताइए, हम पता लगा लेंगे।")}
      >
        <Link className="btn" to="/register">{t("Describe your problem", "अपनी समस्या बताएँ")}</Link>
      </PageHead>
      <div className="container">
        {!meta ? <Loading /> : (
          <ul className="dept-grid">
            {meta.departments.filter((d) => d.id !== "other").map((d) => (
              <li key={d.id} className="dept">
                <div className="dept__head">
                  <span className="quick__icon"><DeptIcon id={d.id} /></span>
                  <h2 className="dept__name">{pick(d.name)}</h2>
                </div>
                <ul className="dept__cats">
                  {d.categories.map((c) => (
                    <li key={c.id}>{pick(c.name)}</li>
                  ))}
                </ul>
                <Link to={`/register?department=${d.id}`} className="dept__link">
                  {t("Register a complaint", "शिकायत दर्ज करें")}<span className="visually-hidden"> {t("about", "विषय")} {pick(d.name)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
