import { useState } from "react";
import { Link } from "react-router-dom";
import { Baby, BriefcaseBusiness, ExternalLink, Flame, HeartPulse, Home, PenLine, Sparkles, UserRound, Users } from "lucide-react";
import { useI18n } from "../context/I18nContext";

type Topic = "all" | "women" | "health" | "work" | "family";
type Scheme = { id: string; topic: Exclude<Topic, "all">; Icon: typeof HeartPulse; name: { en: string; hi: string }; benefit: { en: string; hi: string }; who: { en: string; hi: string } };

/** Ongoing schemes of the Government of Uttarakhand most often asked about on the helpline. */
const schemes: Scheme[] = [
  { id: "ayushman", topic: "health", Icon: HeartPulse, name: { en: "Atal Ayushman Uttarakhand Yojana", hi: "अटल आयुष्मान उत्तराखंड योजना" }, benefit: { en: "Cashless treatment up to ₹5 lakh a year per family at empanelled hospitals.", hi: "सूचीबद्ध अस्पतालों में प्रति परिवार प्रति वर्ष ₹5 लाख तक निःशुल्क उपचार।" }, who: { en: "Families of Uttarakhand", hi: "उत्तराखंड के परिवार" } },
  { id: "nanda-gaura", topic: "women", Icon: Baby, name: { en: "Nanda Gaura Yojana", hi: "नंदा गौरा योजना" }, benefit: { en: "₹11,000 at a girl's birth and ₹51,000 after she passes Class 12.", hi: "बालिका के जन्म पर ₹11,000 और कक्षा 12 उत्तीर्ण करने पर ₹51,000।" }, who: { en: "Girls from eligible families", hi: "पात्र परिवारों की बालिकाएँ" } },
  { id: "mahalakshmi", topic: "women", Icon: Sparkles, name: { en: "Mukhyamantri Mahalakshmi Kit Yojana", hi: "मुख्यमंत्री महालक्ष्मी किट योजना" }, benefit: { en: "A kit of essentials for the mother and newborn daughter.", hi: "माता और नवजात बालिका हेतु आवश्यक वस्तुओं की किट।" }, who: { en: "Mothers of newborn girls", hi: "नवजात बालिकाओं की माताएँ" } },
  { id: "ekal-mahila", topic: "women", Icon: UserRound, name: { en: "Mukhyamantri Ekal Mahila Swarozgar Yojana", hi: "मुख्यमंत्री एकल महिला स्वरोजगार योजना" }, benefit: { en: "Subsidy for single women to start their own work or small business.", hi: "एकल महिलाओं को स्वयं का कार्य या लघु व्यवसाय शुरू करने हेतु अनुदान।" }, who: { en: "Single, widowed or abandoned women", hi: "एकल, विधवा या परित्यक्ता महिलाएँ" } },
  { id: "lakhpati", topic: "women", Icon: Users, name: { en: "Mukhyamantri Lakhpati Didi Yojana", hi: "मुख्यमंत्री लखपति दीदी योजना" }, benefit: { en: "Training, credit and market support so women in self-help groups earn ₹1 lakh or more a year.", hi: "स्वयं सहायता समूह की महिलाओं को ₹1 लाख वार्षिक से अधिक आय हेतु प्रशिक्षण, ऋण और बाज़ार सहायता।" }, who: { en: "Women in self-help groups", hi: "स्वयं सहायता समूह की महिलाएँ" } },
  { id: "swarozgar", topic: "work", Icon: BriefcaseBusiness, name: { en: "Mukhyamantri Swarozgar Yojana", hi: "मुख्यमंत्री स्वरोजगार योजना" }, benefit: { en: "Bank loans with a margin-money subsidy to start a business or service.", hi: "व्यवसाय या सेवा शुरू करने हेतु मार्जिन मनी अनुदान सहित बैंक ऋण।" }, who: { en: "Local youth and returning migrants", hi: "स्थानीय युवा और लौटे प्रवासी" } },
  { id: "homestay", topic: "work", Icon: Home, name: { en: "Deen Dayal Upadhyay Homestay Yojana", hi: "दीनदयाल उपाध्याय होमस्टे योजना" }, benefit: { en: "Support to turn your home into a registered homestay for visitors.", hi: "अपने घर को पर्यटकों हेतु पंजीकृत होमस्टे बनाने में सहायता।" }, who: { en: "Residents in hill and tourist areas", hi: "पर्वतीय और पर्यटन क्षेत्रों के निवासी" } },
  { id: "pension", topic: "family", Icon: Users, name: { en: "Social security pensions", hi: "सामाजिक सुरक्षा पेंशन" }, benefit: { en: "Monthly old-age, widow and disability pension, paid into the bank account.", hi: "वृद्धावस्था, विधवा और दिव्यांग मासिक पेंशन, सीधे बैंक खाते में।" }, who: { en: "Eligible elderly, widowed and disabled citizens", hi: "पात्र वृद्ध, विधवा और दिव्यांग नागरिक" } },
  { id: "gas", topic: "family", Icon: Flame, name: { en: "Mukhyamantri Antyodaya Nishulk Gas Refill Yojana", hi: "मुख्यमंत्री अंत्योदय निःशुल्क गैस रिफिल योजना" }, benefit: { en: "Free LPG cylinder refills each year.", hi: "प्रति वर्ष निःशुल्क एलपीजी सिलेंडर रिफिल।" }, who: { en: "Antyodaya ration card holders", hi: "अंत्योदय राशन कार्ड धारक" } },
];

const topics: { id: Topic; en: string; hi: string }[] = [
  { id: "all", en: "All schemes", hi: "सभी योजनाएँ" },
  { id: "women", en: "Women and girls", hi: "महिलाएँ और बालिकाएँ" },
  { id: "health", en: "Health", hi: "स्वास्थ्य" },
  { id: "work", en: "Jobs and business", hi: "रोज़गार और व्यवसाय" },
  { id: "family", en: "Families and pensions", hi: "परिवार और पेंशन" },
];

const APUNI_SARKAR = "https://eservices.uk.gov.in/";

export function Schemes() {
  const { t, pick } = useI18n();
  const [topic, setTopic] = useState<Topic>("all");
  const list = schemes.filter((s) => topic === "all" || s.topic === topic);

  return (
    <section className="section schemes" aria-labelledby="schemes-title">
      <div className="container">
        <div className="schemes__head">
          <div>
            <h2 id="schemes-title">{t("Government schemes", "सरकारी योजनाएँ")}</h2>
            <p>{t("Ongoing schemes of the Government of Uttarakhand. Check eligibility and apply online on Apuni Sarkar.", "उत्तराखंड सरकार की चल रही योजनाएँ। पात्रता देखें और अपुणि सरकार पर ऑनलाइन आवेदन करें।")}</p>
          </div>
          <a className="btn btn--secondary" href={APUNI_SARKAR} target="_blank" rel="noopener noreferrer">
            {t("All services on Apuni Sarkar", "अपुणि सरकार पर सभी सेवाएँ")} <ExternalLink size={16} aria-hidden="true" />
          </a>
        </div>
        <div className="schemes__topics" role="group" aria-label={t("Filter schemes", "योजनाएँ छाँटें")}>
          {topics.map((x) => (
            <button key={x.id} type="button" aria-pressed={topic === x.id} onClick={() => setTopic(x.id)}>{t(x.en, x.hi)}</button>
          ))}
        </div>
        <ul className="schemes__grid">
          {list.map(({ id, Icon, name, benefit, who, topic: tp }) => (
            <li key={id} className={`scheme scheme--${tp}`}>
              <div className="scheme__top">
                <span className="scheme__icon" aria-hidden="true"><Icon size={22} /></span>
                <span className="scheme__status">{t("Ongoing", "चालू")}</span>
              </div>
              <h3>{pick(name)}</h3>
              <p>{pick(benefit)}</p>
              <p className="scheme__who"><strong>{t("For:", "किसके लिए:")}</strong> {pick(who)}</p>
              <div className="scheme__actions">
                <a href={APUNI_SARKAR} target="_blank" rel="noopener noreferrer">{t("Apply online", "ऑनलाइन आवेदन")} <ExternalLink size={14} aria-hidden="true" /></a>
                <Link to="/register"><PenLine size={14} aria-hidden="true" /> {t("Benefit not received?", "लाभ नहीं मिला?")}</Link>
              </div>
            </li>
          ))}
        </ul>
        <p className="small muted schemes__note">{t("Amounts and eligibility are set by the departments and can change. Confirm the latest details before applying.", "राशि और पात्रता विभागों द्वारा तय की जाती हैं और बदल सकती हैं। आवेदन से पहले नवीनतम विवरण की पुष्टि करें।")}</p>
      </div>
    </section>
  );
}
