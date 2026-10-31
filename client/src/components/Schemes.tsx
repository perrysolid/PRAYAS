import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Baby, BriefcaseBusiness, ChevronLeft, ChevronRight, ExternalLink, Flame, HeartPulse, Home, MapPin, PenLine, Phone, Sparkles, Users, X } from "lucide-react";
import { useI18n } from "../context/I18nContext";

type Topic = "all" | "women" | "health" | "work" | "family";
type Text = { en: string; hi: string };
type Scheme = {
  id: string;
  topic: Exclude<Topic, "all">;
  Icon: typeof HeartPulse;
  image: string;
  name: Text;
  benefit: Text;
  who: Text;
  dept: Text;
  steps: Text[];
  where: Text;
  link?: { href: string; label: Text };
  helpline?: string;
};

/**
 * Ongoing schemes of the Government of Uttarakhand, checked against the departments' portals in October 2026.
 * Schemes with a closed application window or a target year already past are left out.
 */
const schemes: Scheme[] = [
  {
    id: "ayushman", topic: "health", Icon: HeartPulse, image: "/img/rishikesh-960.webp",
    name: { en: "Atal Ayushman Uttarakhand Yojana", hi: "अटल आयुष्मान उत्तराखंड योजना" },
    benefit: { en: "Cashless hospital treatment up to ₹5 lakh a year per family at empanelled hospitals.", hi: "सूचीबद्ध अस्पतालों में प्रति परिवार प्रति वर्ष ₹5 लाख तक कैशलेस उपचार।" },
    who: { en: "Resident families of Uttarakhand (state employees and pensioners have a separate scheme)", hi: "उत्तराखंड के निवासी परिवार (राज्य कर्मचारी और पेंशनर अलग योजना में)" },
    dept: { en: "State Health Authority", hi: "राज्य स्वास्थ्य प्राधिकरण" },
    steps: [
      { en: "Get your Ayushman card made at a Common Service Centre or the Ayushman desk of an empanelled hospital, with Aadhaar and ration card.", hi: "आधार और राशन कार्ड के साथ जन सेवा केंद्र या सूचीबद्ध अस्पताल के आयुष्मान डेस्क पर आयुष्मान कार्ड बनवाएँ।" },
      { en: "At admission, show the card at the hospital's Ayushman desk. Treatment is cashless.", hi: "भर्ती के समय अस्पताल के आयुष्मान डेस्क पर कार्ड दिखाएँ। उपचार कैशलेस है।" },
      { en: "If a hospital asks for money, call 104 or register a complaint here.", hi: "अस्पताल पैसे माँगे तो 104 पर कॉल करें या यहाँ शिकायत दर्ज करें।" },
    ],
    where: { en: "Common Service Centre or any empanelled hospital", hi: "जन सेवा केंद्र या कोई सूचीबद्ध अस्पताल" },
    link: { href: "https://sha.uk.gov.in/", label: { en: "State Health Authority portal", hi: "राज्य स्वास्थ्य प्राधिकरण पोर्टल" } },
    helpline: "104",
  },
  {
    id: "nanda-gaura", topic: "women", Icon: Baby, image: "/img/valley-of-flowers-960.webp",
    name: { en: "Nanda Gaura Yojana", hi: "नंदा गौरा योजना" },
    benefit: { en: "₹11,000 at a girl's birth and ₹51,000 after she passes Class 12.", hi: "बालिका के जन्म पर ₹11,000 और कक्षा 12 उत्तीर्ण करने पर ₹51,000।" },
    who: { en: "First two daughters of eligible families", hi: "पात्र परिवारों की पहली दो बालिकाएँ" },
    dept: { en: "Women Empowerment and Child Development", hi: "महिला सशक्तिकरण एवं बाल विकास" },
    steps: [
      { en: "Apply online when the department opens the yearly application window.", hi: "विभाग द्वारा वार्षिक आवेदन खोलने पर ऑनलाइन आवेदन करें।" },
      { en: "Keep ready: birth certificate, Aadhaar, income and residence certificates, and the girl's or mother's bank account.", hi: "तैयार रखें: जन्म प्रमाण पत्र, आधार, आय व निवास प्रमाण पत्र, और बालिका या माता का बैंक खाता।" },
      { en: "For help, contact your Anganwadi worker or the Child Development Project Officer of your block.", hi: "सहायता हेतु आंगनबाड़ी कार्यकर्ता या ब्लॉक के बाल विकास परियोजना अधिकारी से संपर्क करें।" },
    ],
    where: { en: "Online, or through your Anganwadi centre", hi: "ऑनलाइन, या आंगनबाड़ी केंद्र के माध्यम से" },
    link: { href: "https://www.myscheme.gov.in/schemes/ngy", label: { en: "Eligibility on myScheme", hi: "myScheme पर पात्रता" } },
  },
  {
    id: "mahalakshmi", topic: "women", Icon: Sparkles, image: "/img/hill-villages-960.webp",
    name: { en: "Mukhyamantri Mahalakshmi Kit Yojana", hi: "मुख्यमंत्री महालक्ष्मी किट योजना" },
    benefit: { en: "A kit of essentials for the mother and her newborn daughter after an institutional delivery.", hi: "संस्थागत प्रसव के बाद माता और नवजात बालिका हेतु आवश्यक वस्तुओं की किट।" },
    who: { en: "Mothers of newborn girls, for the first two daughters", hi: "नवजात बालिकाओं की माताएँ, पहली दो बालिकाओं हेतु" },
    dept: { en: "Women Empowerment and Child Development", hi: "महिला सशक्तिकरण एवं बाल विकास" },
    steps: [
      { en: "Register your pregnancy at the nearest Anganwadi centre.", hi: "निकटतम आंगनबाड़ी केंद्र पर गर्भावस्था का पंजीकरण कराएँ।" },
      { en: "After delivery in a hospital, give the birth certificate at the Anganwadi centre.", hi: "अस्पताल में प्रसव के बाद आंगनबाड़ी केंद्र पर जन्म प्रमाण पत्र दें।" },
      { en: "The kit is handed over through the Anganwadi centre.", hi: "किट आंगनबाड़ी केंद्र के माध्यम से दी जाती है।" },
    ],
    where: { en: "Your Anganwadi centre", hi: "आपका आंगनबाड़ी केंद्र" },
    link: { href: "https://www.myscheme.gov.in/schemes/mmkyu", label: { en: "Eligibility on myScheme", hi: "myScheme पर पात्रता" } },
  },
  {
    id: "swarozgar", topic: "work", Icon: BriefcaseBusiness, image: "/img/chaubatia-960.webp",
    name: { en: "Mukhyamantri Swarozgar Yojana 2.0", hi: "मुख्यमंत्री स्वरोजगार योजना 2.0" },
    benefit: { en: "Bank loans up to ₹25 lakh for manufacturing or ₹10 lakh for services and trade, with a margin-money subsidy based on the district.", hi: "विनिर्माण हेतु ₹25 लाख और सेवा व व्यापार हेतु ₹10 लाख तक बैंक ऋण, जनपद के अनुसार मार्जिन मनी अनुदान।" },
    who: { en: "Residents starting their own business. Open until 2029–30.", hi: "अपना व्यवसाय शुरू करने वाले निवासी। 2029–30 तक लागू।" },
    dept: { en: "Directorate of Industries", hi: "उद्योग निदेशालय" },
    steps: [
      { en: "Register on the MSY portal and choose “MSY 2.0”.", hi: "MSY पोर्टल पर पंजीकरण करें और “MSY 2.0” चुनें।" },
      { en: "Fill in your project and upload Aadhaar, residence certificate and the project report.", hi: "परियोजना विवरण भरें और आधार, निवास प्रमाण पत्र व परियोजना रिपोर्ट अपलोड करें।" },
      { en: "The District Industries Centre checks it and sends it to the bank. The subsidy is released with the loan.", hi: "जिला उद्योग केंद्र जाँच कर बैंक को भेजता है। अनुदान ऋण के साथ जारी होता है।" },
    ],
    where: { en: "Online, or at the District Industries Centre", hi: "ऑनलाइन, या जिला उद्योग केंद्र पर" },
    link: { href: "https://msy.uk.gov.in/", label: { en: "Apply on msy.uk.gov.in", hi: "msy.uk.gov.in पर आवेदन" } },
  },
  {
    id: "homestay", topic: "work", Icon: Home, image: "/img/landour-960.webp",
    name: { en: "Deen Dayal Upadhyay Home Stay Vikas Yojana", hi: "दीनदयाल उपाध्याय होमस्टे विकास योजना" },
    benefit: { en: "Capital and interest subsidy to build or upgrade a registered homestay for visitors.", hi: "पर्यटकों हेतु पंजीकृत होमस्टे बनाने या सुधारने पर पूँजी और ब्याज अनुदान।" },
    who: { en: "Natives of Uttarakhand, outside municipal areas", hi: "उत्तराखंड के मूल निवासी, नगर क्षेत्रों से बाहर" },
    dept: { en: "Uttarakhand Tourism", hi: "उत्तराखंड पर्यटन" },
    steps: [
      { en: "Apply on the MSY portal under the homestay scheme, with your Aadhaar-linked mobile.", hi: "आधार से जुड़े मोबाइल के साथ MSY पोर्टल पर होमस्टे योजना में आवेदन करें।" },
      { en: "The District Tourism Officer verifies the site and the bank sanctions the loan.", hi: "जिला पर्यटन अधिकारी स्थल सत्यापन करते हैं और बैंक ऋण स्वीकृत करता है।" },
      { en: "Register the homestay with Tourism. The subsidy is paid after completion.", hi: "होमस्टे को पर्यटन विभाग में पंजीकृत कराएँ। अनुदान निर्माण पूर्ण होने पर मिलता है।" },
    ],
    where: { en: "Online, or at the District Tourism Office", hi: "ऑनलाइन, या जिला पर्यटन कार्यालय" },
    link: { href: "https://msy.uk.gov.in/", label: { en: "Apply on msy.uk.gov.in", hi: "msy.uk.gov.in पर आवेदन" } },
  },
  {
    id: "pension", topic: "family", Icon: Users, image: "/img/pithoragarh-960.webp",
    name: { en: "Old-age and widow pension", hi: "वृद्धावस्था एवं विधवा पेंशन" },
    benefit: { en: "₹1,500 a month, paid directly into the bank account.", hi: "₹1,500 प्रति माह, सीधे बैंक खाते में।" },
    who: { en: "Eligible citizens aged 60 or over, and widows", hi: "60 वर्ष या अधिक आयु के पात्र नागरिक, और विधवाएँ" },
    dept: { en: "Social Welfare Department", hi: "समाज कल्याण विभाग" },
    steps: [
      { en: "Apply online on the social security pension portal, or at your Block or Tehsil office.", hi: "सामाजिक सुरक्षा पेंशन पोर्टल पर ऑनलाइन, या ब्लॉक या तहसील कार्यालय में आवेदन करें।" },
      { en: "Keep ready: Aadhaar, age or death certificate, income certificate and bank passbook.", hi: "तैयार रखें: आधार, आयु या मृत्यु प्रमाण पत्र, आय प्रमाण पत्र और बैंक पासबुक।" },
      { en: "Once approved, the pension arrives in your account every month.", hi: "स्वीकृति के बाद पेंशन हर माह खाते में आती है।" },
    ],
    where: { en: "Online, or at the Block or Tehsil office", hi: "ऑनलाइन, या ब्लॉक या तहसील कार्यालय" },
    link: { href: "https://ssp.uk.gov.in/", label: { en: "Apply on ssp.uk.gov.in", hi: "ssp.uk.gov.in पर आवेदन" } },
  },
  {
    id: "gas", topic: "family", Icon: Flame, image: "/img/chopta-hills-960.webp",
    name: { en: "Mukhyamantri Antyodaya Nishulk Gas Refill Yojana", hi: "मुख्यमंत्री अंत्योदय निःशुल्क गैस रिफिल योजना" },
    benefit: { en: "Three free LPG cylinder refills a year, with the amount paid into the bank account.", hi: "प्रति वर्ष तीन निःशुल्क एलपीजी रिफिल, राशि बैंक खाते में।" },
    who: { en: "Antyodaya ration card holders with a gas connection", hi: "गैस कनेक्शन वाले अंत्योदय राशन कार्ड धारक" },
    dept: { en: "Food and Civil Supplies", hi: "खाद्य एवं नागरिक आपूर्ति" },
    steps: [
      { en: "No form needed. Link your ration card, Aadhaar and bank account at your gas agency.", hi: "कोई फ़ॉर्म नहीं। अपनी गैस एजेंसी पर राशन कार्ड, आधार और बैंक खाता जोड़ें।" },
      { en: "Book your refill as usual.", hi: "रिफिल सामान्य रूप से बुक करें।" },
      { en: "The refill amount is credited to your bank account.", hi: "रिफिल की राशि बैंक खाते में आती है।" },
    ],
    where: { en: "Your gas agency", hi: "आपकी गैस एजेंसी" },
  },
];

const topics: { id: Topic; en: string; hi: string }[] = [
  { id: "all", en: "All schemes", hi: "सभी योजनाएँ" },
  { id: "women", en: "Women and girls", hi: "महिलाएँ और बालिकाएँ" },
  { id: "health", en: "Health", hi: "स्वास्थ्य" },
  { id: "work", en: "Jobs and business", hi: "रोज़गार और व्यवसाय" },
  { id: "family", en: "Families and pensions", hi: "परिवार और पेंशन" },
];

export function Schemes() {
  const { t, pick } = useI18n();
  const [topic, setTopic] = useState<Topic>("all");
  const [open, setOpen] = useState<Scheme | null>(null);
  const track = useRef<HTMLUListElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const list = schemes.filter((s) => topic === "all" || s.topic === topic);
  const topicName = (id: Topic) => { const x = topics.find((y) => y.id === id)!; return t(x.en, x.hi); };

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const scroll = (dir: 1 | -1) => {
    const el = track.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <section className="section schemes" aria-labelledby="schemes-title">
      <div className="container">
        <div className="schemes__head">
          <div>
            <h2 id="schemes-title">{t("Government schemes", "सरकारी योजनाएँ")}</h2>
            <p>{t("Schemes of the Government of Uttarakhand that are running now. Open one to see where and how to apply.", "उत्तराखंड सरकार की अभी चल रही योजनाएँ। कहाँ और कैसे आवेदन करें, यह देखने के लिए योजना खोलें।")}</p>
          </div>
          <div className="schemes__nav">
            <button type="button" onClick={() => scroll(-1)} aria-label={t("Previous schemes", "पिछली योजनाएँ")}><ChevronLeft size={20} /></button>
            <button type="button" onClick={() => scroll(1)} aria-label={t("More schemes", "और योजनाएँ")}><ChevronRight size={20} /></button>
          </div>
        </div>
        <div className="schemes__topics" role="group" aria-label={t("Filter schemes", "योजनाएँ छाँटें")}>
          {topics.map((x) => (
            <button key={x.id} type="button" aria-pressed={topic === x.id} onClick={() => { setTopic(x.id); track.current?.scrollTo({ left: 0 }); }}>{t(x.en, x.hi)}</button>
          ))}
        </div>
        <ul className="schemes__track" ref={track}>
          {list.map((s) => (
            <li key={s.id} className={`scheme scheme--${s.topic}`}>
              <button type="button" className="scheme__card" onClick={() => setOpen(s)} aria-haspopup="dialog">
                <span className="scheme__thumb">
                  <img src={s.image} alt="" loading="lazy" />
                  <span className="scheme__tag"><s.Icon size={14} aria-hidden="true" /> {topicName(s.topic)}</span>
                  <span className="scheme__status">{t("Ongoing", "चालू")}</span>
                </span>
                <span className="scheme__body">
                  <small className="scheme__dept">{pick(s.dept)}</small>
                  <strong>{pick(s.name)}</strong>
                  <span className="scheme__benefit">{pick(s.benefit)}</span>
                  <span className="scheme__more">{t("How to apply", "कैसे आवेदन करें")} <ArrowRight size={16} aria-hidden="true" /></span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p className="small muted schemes__note">{t("Checked against official sources in October 2026. Amounts and eligibility are set by the departments and can change; confirm on the portal before applying.", "अक्टूबर 2026 में आधिकारिक स्रोतों से जाँचा गया। राशि और पात्रता विभाग तय करते हैं और बदल सकती हैं; आवेदन से पहले पोर्टल पर पुष्टि करें।")}</p>
      </div>

      <dialog ref={dialog} className="scheme-dlg" aria-labelledby="scheme-dlg-title" onClose={() => setOpen(null)} onClick={(e) => e.target === e.currentTarget && setOpen(null)}>
        {open && (
          <div className="scheme-dlg__inner">
            <div className="scheme-dlg__hero">
              <img src={open.image} alt="" />
              <button type="button" className="scheme-dlg__close" onClick={() => setOpen(null)} aria-label={t("Close", "बंद करें")}><X size={20} /></button>
              <div>
                <span className="scheme__tag"><open.Icon size={14} aria-hidden="true" /> {topicName(open.topic)}</span>
                <h3 id="scheme-dlg-title">{pick(open.name)}</h3>
                <small>{pick(open.dept)}</small>
              </div>
            </div>
            <div className="scheme-dlg__body">
              <dl className="scheme-dlg__facts">
                <div><dt>{t("What you get", "क्या मिलता है")}</dt><dd>{pick(open.benefit)}</dd></div>
                <div><dt>{t("Who can apply", "कौन आवेदन कर सकता है")}</dt><dd>{pick(open.who)}</dd></div>
              </dl>
              <h4>{t("How to apply", "कैसे आवेदन करें")}</h4>
              <ol className="scheme-dlg__steps">
                {open.steps.map((st, i) => <li key={i}>{pick(st)}</li>)}
              </ol>
              <p className="scheme-dlg__where"><MapPin size={18} aria-hidden="true" /> <span><strong>{t("Where:", "कहाँ:")}</strong> {pick(open.where)}</span></p>
              {open.helpline && <p className="scheme-dlg__where"><Phone size={18} aria-hidden="true" /> <span><strong>{t("Helpline:", "हेल्पलाइन:")}</strong> <a href={`tel:${open.helpline}`}>{open.helpline}</a></span></p>}
              <div className="scheme-dlg__actions">
                {open.link && (
                  <a className="btn btn--primary" href={open.link.href} target="_blank" rel="noopener noreferrer">{pick(open.link.label)} <ExternalLink size={16} aria-hidden="true" /></a>
                )}
                <Link className="btn btn--secondary" to="/register" onClick={() => setOpen(null)}><PenLine size={16} aria-hidden="true" /> {t("Benefit not received? Complain", "लाभ नहीं मिला? शिकायत करें")}</Link>
              </div>
            </div>
          </div>
        )}
      </dialog>
    </section>
  );
}
