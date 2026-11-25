import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Building2, ExternalLink, Globe, Mail, MapPin, Phone, Search } from "lucide-react";
import { PageHead } from "../components/PageHead";
import { useI18n } from "../context/I18nContext";
import { offices, type Office } from "../data/offices";
import { officePhotos } from "../data/officePhotos";

const tabs = [
  { id: "all", en: "All", hi: "सभी" },
  { id: "department", en: "Departments", hi: "विभाग" },
  { id: "building", en: "Government offices", hi: "सरकारी कार्यालय" },
  { id: "district", en: "District offices", hi: "जनपद कार्यालय" },
] as const;

const mapLink = (o: Office) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${o.name.en} ${o.address ?? ""} ${o.city ?? ""}`.trim())}`;

/** Where to go and whom to call: departments and the main government offices, with the source of every entry. */
export function Offices() {
  const { t, pick } = useI18n();
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("all");

  const rows = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return offices
      .filter((o) => tab === "all" || o.kind === tab)
      .filter((o) => {
        const hay = `${o.name.en} ${o.name.hi} ${o.role.en} ${o.role.hi} ${o.address ?? ""} ${o.city ?? ""}`.toLowerCase();
        return words.every((w) => hay.includes(w));
      });
  }, [q, tab]);

  return (
    <>
      <PageHead
        en="Offices and contacts"
        hi="कार्यालय और संपर्क"
        lead={t("Addresses, phone numbers and emails of departments and the main government offices connected with the CM Helpline.", "सीएम हेल्पलाइन से जुड़े विभागों और प्रमुख सरकारी कार्यालयों के पते, फ़ोन नंबर और ईमेल।")}
      />
      <div className="container offices-page">
        <div className="searchbar searchbar--big" role="search">
          <Search size={20} aria-hidden="true" />
          <label htmlFor="oq" className="visually-hidden">{t("Search offices", "कार्यालय खोजें")}</label>
          <input id="oq" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Search by name, place or work", "नाम, स्थान या कार्य से खोजें")} autoComplete="off" />
        </div>
        <div className="schemes__topics offices-tabs" role="group" aria-label={t("Type of office", "कार्यालय का प्रकार")}>
          {tabs.map((x) => (
            <button key={x.id} type="button" aria-pressed={tab === x.id} onClick={() => setTab(x.id)}>{t(x.en, x.hi)}</button>
          ))}
        </div>

        <div className="notice offices-emergency">
          <p>
            <Phone size={16} aria-hidden="true" /> <strong>{t("Emergency and helplines:", "आपात और हेल्पलाइन:")}</strong>{" "}
            <a href="tel:112">112</a> {t("emergency", "आपात")} · <a href="tel:108">108</a> {t("ambulance", "एम्बुलेंस")} · <a href="tel:1905">1905</a> {t("CM Helpline", "सीएम हेल्पलाइन")} · <a href="tel:1070">1070</a> {t("disaster control", "आपदा नियंत्रण")} · <a href="tel:1930">1930</a> {t("cyber fraud", "साइबर धोखाधड़ी")}
          </p>
        </div>

        <p className="small muted" aria-live="polite">{t(`${rows.length} offices`, `${rows.length} कार्यालय`)}</p>
        <ul className="offices">
          {rows.map((o) => (
            <li key={o.id} className="office">
              <figure className={`office__photo${officePhotos[o.id] ? "" : " office__photo--none"}`}>
                {officePhotos[o.id] ? (
                  <>
                    <img src={`/img/offices/${o.id}.jpg`} alt={pick(o.name)} loading="lazy" width={800} height={450} />
                    <figcaption>
                      <a href={officePhotos[o.id].source} target="_blank" rel="noopener noreferrer">{t("Photo", "फ़ोटो")}: {officePhotos[o.id].credit}<span className="visually-hidden"> {t("(opens source in a new tab)", "(स्रोत नए टैब में खुलेगा)")}</span></a>
                    </figcaption>
                  </>
                ) : (
                  <Building2 size={40} aria-hidden="true" />
                )}
              </figure>
              <h2>{pick(o.name)}</h2>
              <p className="office__role">{pick(o.role)}</p>
              {(o.address || o.city) && (
                <p className="office__line"><MapPin size={16} aria-hidden="true" /> <span>{[o.address, o.city].filter(Boolean).join(", ")} <a href={mapLink(o)} target="_blank" rel="noopener noreferrer">{t("Open in maps", "मानचित्र में खोलें")}<span className="visually-hidden"> {t("(new tab)", "(नया टैब)")}</span></a></span></p>
              )}
              {o.phone.map((p) => (
                <p key={p} className="office__line"><Phone size={16} aria-hidden="true" /> <a href={`tel:${p.replace(/[^\d+]/g, "")}`}>{p}</a></p>
              ))}
              {o.email.map((m) => (
                <p key={m} className="office__line"><Mail size={16} aria-hidden="true" /> <a href={`mailto:${m}`}>{m}</a></p>
              ))}
              {o.website && (
                <p className="office__line"><Globe size={16} aria-hidden="true" /> <a href={o.website} target="_blank" rel="noopener noreferrer">{o.website.replace(/^https?:\/\//, "").replace(/\/$/, "")} <ExternalLink size={13} aria-hidden="true" /><span className="visually-hidden"> {t("(new tab)", "(नया टैब)")}</span></a></p>
              )}
            </li>
          ))}
        </ul>
        {!rows.length && <p className="muted">{t("Nothing matches. Try fewer words, or call 1905.", "कुछ नहीं मिला। कम शब्द आज़माएँ, या 1905 पर कॉल करें।")}</p>}
        <p className="small muted">{t("Details were taken from official government websites. Offices can change numbers; if one does not answer, call 1905.", "विवरण आधिकारिक सरकारी वेबसाइटों से लिए गए हैं। कार्यालय नंबर बदल सकते हैं; उत्तर न मिले तो 1905 पर कॉल करें।")}</p>
      </div>
    </>
  );
}
