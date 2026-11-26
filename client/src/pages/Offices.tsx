import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Building2, ExternalLink, Globe, Mail, MapPin, Phone, Search } from "lucide-react";
import { DeptIcon } from "../components/DeptIcon";
import { PageHead } from "../components/PageHead";
import { Loading } from "../components/States";
import { useI18n } from "../context/I18nContext";
import { useMeta } from "../context/MetaContext";
import { offices, type Office } from "../data/offices";
import { officePhotos } from "../data/officePhotos";
import type { Bilingual } from "../lib/types";

/** Which directory entry gives each complaint department its address and numbers. */
const contactFor: Record<string, string> = {
  energy: "upcl",
  water: "jal-sansthan",
  pwd: "pwd",
  food: "food-civil-supplies",
  "social-welfare": "social-welfare",
  health: "health",
  education: "school-education",
  police: "police-hq",
  urban: "urban-development",
  forest: "forest",
  agriculture: "agriculture",
  disaster: "usdma",
  transport: "transport",
};
const usedByDepartments = new Set(Object.values(contactFor));

const tabs = [
  { id: "departments", en: "Departments", hi: "विभाग" },
  { id: "offices", en: "Other offices", hi: "अन्य कार्यालय" },
  { id: "district", en: "District offices", hi: "जनपद कार्यालय" },
] as const;

type Card = { key: string; name: Bilingual; office?: Office; deptId?: string };

const mapLink = (o: Office) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${o.name.en} ${o.address ?? ""} ${o.city ?? ""}`.trim())}`;

/** One page for every department and office: each department appears once, with its contact details where known. */
export function Offices() {
  const { t, pick } = useI18n();
  const { meta } = useMeta();
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("departments");

  const cards = useMemo<Card[]>(() => {
    if (tab === "departments") {
      return (meta?.departments ?? [])
        .filter((d) => d.id !== "other")
        .map((d) => ({ key: d.id, name: d.name, deptId: d.id, office: offices.find((o) => o.id === contactFor[d.id]) }));
    }
    const list = tab === "district" ? offices.filter((o) => o.kind === "district") : offices.filter((o) => o.kind === "building" || (o.kind === "department" && !usedByDepartments.has(o.id)));
    return list.map((o) => ({ key: o.id, name: o.name, office: o }));
  }, [tab, meta]);

  const rows = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return cards.filter((c) => {
      const hay = `${c.name.en} ${c.name.hi} ${c.office?.name.en ?? ""} ${c.office?.role.en ?? ""} ${c.office?.address ?? ""} ${c.office?.city ?? ""}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [q, cards]);

  return (
    <>
      <PageHead en="Departments and offices" hi="विभाग और कार्यालय" />
      <div className="container offices-page">
        <div className="searchbar searchbar--big" role="search">
          <Search size={20} aria-hidden="true" />
          <label htmlFor="oq" className="visually-hidden">{t("Search", "खोजें")}</label>
          <input id="oq" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Search by name or place", "नाम या स्थान से खोजें")} autoComplete="off" />
        </div>
        <div className="schemes__topics offices-tabs" role="group" aria-label={t("Type", "प्रकार")}>
          {tabs.map((x) => (
            <button key={x.id} type="button" aria-pressed={tab === x.id} onClick={() => setTab(x.id)}>{t(x.en, x.hi)}</button>
          ))}
        </div>

        {tab === "departments" && !meta ? <Loading /> : (
          <ul className="offices">
            {rows.map((c) => {
              const o = c.office;
              const photo = o ? officePhotos[o.id] : undefined;
              return (
                <li key={c.key} className="office">
                  <figure className={`office__photo${photo ? "" : " office__photo--none"}`}>
                    {photo && o ? (
                      <>
                        <img src={`/img/offices/${o.id}.jpg`} alt={pick(c.name)} loading="lazy" width={800} height={450} />
                        <figcaption>
                          <a href={photo.source} target="_blank" rel="noopener noreferrer">{t("Photo", "फ़ोटो")}: {photo.credit}<span className="visually-hidden"> {t("(new tab)", "(नया टैब)")}</span></a>
                        </figcaption>
                      </>
                    ) : c.deptId ? (
                      <DeptIcon id={c.deptId} size={40} />
                    ) : (
                      <Building2 size={40} aria-hidden="true" />
                    )}
                  </figure>
                  <h2>{pick(c.name)}</h2>
                  {o && (
                    <>
                      {(o.address || o.city) && (
                        <p className="office__line"><MapPin size={16} aria-hidden="true" /> <span>{[o.address, o.city].filter(Boolean).join(", ")} <a href={mapLink(o)} target="_blank" rel="noopener noreferrer">{t("Map", "मानचित्र")}<span className="visually-hidden"> {t("(new tab)", "(नया टैब)")}</span></a></span></p>
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
                    </>
                  )}
                  {c.deptId && (
                    <Link className="office__cta" to={`/register?department=${c.deptId}`}>{t("Register a complaint", "शिकायत दर्ज करें")}<span className="visually-hidden"> {pick(c.name)}</span></Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {!rows.length && (tab !== "departments" || meta) && <p className="muted">{t("Nothing matches.", "कुछ नहीं मिला।")}</p>}
      </div>
    </>
  );
}
