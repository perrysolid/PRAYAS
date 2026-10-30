import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ErrorSummary, Field, Input, TextArea, describedBy } from "../components/Form";
import { PageHead } from "../components/PageHead";
import { useI18n } from "../context/I18nContext";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { api, ApiError } from "../lib/api";

const faqs = [
  {
    q: ["Who can register a complaint?", "शिकायत कौन दर्ज कर सकता है?"],
    a: ["Anyone with a problem involving a Government of Uttarakhand department, office or scheme. You only need a mobile number.", "उत्तराखंड सरकार के किसी विभाग, कार्यालय या योजना से जुड़ी समस्या वाला कोई भी व्यक्ति। केवल मोबाइल नंबर चाहिए।"],
  },
  {
    q: ["How long will it take?", "कितना समय लगेगा?"],
    a: ["The first officer (L1) has 15 days. If it is not resolved, it moves up to the district officer, then the head of department, then the Secretary. You can see who has it and their deadline at any time.", "प्रथम अधिकारी (L1) के पास 15 दिन होते हैं। निस्तारण न होने पर यह जनपद अधिकारी, फिर विभागाध्यक्ष और फिर सचिव तक जाती है। आप कभी भी देख सकते हैं कि शिकायत किसके पास है और समय सीमा क्या है।"],
  },
  {
    q: ["When can I send a reminder?", "अनुस्मारक कब भेज सकते हैं?"],
    a: ["7 days after registering, and then once every 3 days while it is open. Reminders are visible to the Chief Minister's Office.", "दर्ज करने के 7 दिन बाद, और फिर शिकायत खुली रहने तक हर 3 दिन में एक बार। अनुस्मारक मुख्यमंत्री कार्यालय को भी दिखते हैं।"],
  },
  {
    q: ["The officer marked it resolved but nothing changed. What can I do?", "अधिकारी ने निस्तारित कर दिया पर कुछ नहीं बदला। क्या करें?"],
    a: ["Rate the action as 'Not satisfied' and reopen the complaint within 30 days. It goes to the next higher officer.", "कार्यवाही को 'असंतुष्ट' रेट करें और 30 दिन के भीतर शिकायत पुनः खोलें। यह अगले उच्च अधिकारी को जाएगी।"],
  },
  {
    q: ["How many complaints can I have open?", "एक साथ कितनी शिकायतें खुली रख सकते हैं?"],
    a: ["Up to 10 unresolved complaints per mobile number at a time, as set by government order.", "शासनादेश के अनुसार एक मोबाइल नंबर से एक समय में अधिकतम 10 अनिस्तारित शिकायतें।"],
  },
  {
    q: ["My problem is with a bank, railway or passport office.", "मेरी समस्या बैंक, रेलवे या पासपोर्ट कार्यालय से है।"],
    a: ["Those are run by the Government of India. Register on CPGRAMS (pgportal.gov.in). We show a warning if your description looks like a central matter.", "ये भारत सरकार के अधीन हैं। CPGRAMS (pgportal.gov.in) पर दर्ज करें। आपका विवरण केंद्रीय विषय लगने पर हम चेतावनी दिखाते हैं।"],
  },
  {
    q: ["Is my information safe?", "क्या मेरी जानकारी सुरक्षित है?"],
    a: ["Officers see only the last 4 digits of your mobile number. Public status checks need both the complaint number and your mobile number, so no one else can look you up.", "अधिकारियों को आपके मोबाइल नंबर के केवल अंतिम 4 अंक दिखते हैं। सार्वजनिक स्थिति जाँच के लिए शिकायत संख्या और मोबाइल नंबर दोनों चाहिए, इसलिए कोई और आपको खोज नहीं सकता।"],
  },
  {
    q: ["Can I write in Garhwali or Kumaoni?", "क्या गढ़वाली या कुमाऊँनी में लिख सकते हैं?"],
    a: ["Yes. Write the way you speak. If we can't place the department, you can choose it yourself, or call 1905.", "हाँ। जैसे बोलते हैं वैसे लिखें। विभाग पता न चले तो आप स्वयं चुन सकते हैं या 1905 पर कॉल करें।"],
  },
] as const;

export function Help() {
  const { t } = useI18n();
  return (
    <>
      <PageHead en="Help and frequently asked questions" hi="सहायता एवं सामान्य प्रश्न" />
      <div className="container grid-2-1">
        <div className="faq">
          {faqs.map((f) => (
            <details key={f.q[0]}>
              <summary>{t(f.q[0], f.q[1])}</summary>
              <p>{t(f.a[0], f.a[1])}</p>
            </details>
          ))}
        </div>
        <aside className="aside-card aside-card--plain">
          <h3>{t("Still stuck?", "अब भी समस्या है?")}</h3>
          <p>{t("Call", "कॉल करें")} <a href="tel:1905"><strong>1905</strong></a> {t("or", "या")} <Link to="/contact">{t("write to us", "हमें लिखें")}</Link>.</p>
        </aside>
      </div>
    </>
  );
}

export function Contact() {
  const { t } = useI18n();
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (form.name.trim().length < 2) next.name = t("Enter your name", "अपना नाम दर्ज करें");
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = t("Enter an email address like name@example.com", "name@example.com जैसा ईमेल पता दर्ज करें");
    if (form.message.trim().length < 10) next.message = t("Write at least 10 characters", "कम से कम 10 अक्षर लिखें");
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      await api.contact(form);
      setSent(true);
    } catch (err) {
      setErrors(err instanceof ApiError && Object.keys(err.fields).length ? err.fields : { _: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHead en="Contact us" hi="संपर्क करें" lead={t("For problems with this website. To register a complaint about a department, use Register complaint or call 1905.", "इस वेबसाइट से जुड़ी समस्याओं के लिए। किसी विभाग की शिकायत के लिए 'शिकायत दर्ज करें' का उपयोग करें या 1905 पर कॉल करें।")} />
      <div className="container grid-2-1">
        <div>
          {sent ? (
            <div className="notice notice--success" role="status">
              <span className="notice__title">{t("Message sent", "संदेश भेजा गया")}</span>
              <p>{t("We will reply to the email address you gave.", "हम आपके दिए गए ईमेल पते पर उत्तर देंगे।")}</p>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              <ErrorSummary errors={errors} />
              <Field id="name" label={t("Name", "नाम")} error={errors.name}>
                <Input id="name" autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} invalid={Boolean(errors.name)} aria-describedby={describedBy("name", false, errors.name)} />
              </Field>
              <Field id="email" label={t("Email", "ईमेल")} error={errors.email}>
                <Input id="email" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} invalid={Boolean(errors.email)} aria-describedby={describedBy("email", false, errors.email)} />
              </Field>
              <Field id="message" label={t("Message", "संदेश")} error={errors.message}>
                <TextArea id="message" rows={5} maxLength={2000} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} invalid={Boolean(errors.message)} aria-describedby={describedBy("message", false, errors.message)} />
              </Field>
              <button className="btn" type="submit" disabled={busy}>{t("Send message", "संदेश भेजें")}</button>
            </form>
          )}
        </div>
        <aside className="aside-card aside-card--plain">
          <h3>{t("Offices", "कार्यालय")}</h3>
          <p><strong>{t("CM Helpline 1905", "मुख्यमंत्री हेल्पलाइन 1905")}</strong><br />{t("Uttarakhand Secretariat, New Building, 4th Floor, Subhash Road, Dehradun 248001", "उत्तराखंड सचिवालय, नया भवन, चौथी मंज़िल, सुभाष रोड, देहरादून 248001")}</p>
          <p><strong>ITDA</strong><br />{t("IT Bhawan, Plot IT-07, Sahastradhara Road, IT Park, Dehradun 248013", "आईटी भवन, प्लॉट IT-07, सहस्त्रधारा रोड, आईटी पार्क, देहरादून 248013")}</p>
          <p><a href="mailto:cm-helpline@uk.gov.in">cm-helpline@uk.gov.in</a></p>
        </aside>
      </div>
    </>
  );
}

export function About() {
  const { t } = useI18n();
  return (
    <>
      <PageHead en="About CM Helpline 1905" hi="मुख्यमंत्री हेल्पलाइन 1905 के बारे में" />
      <div className="container prose">
        <p className="lead">{t("CM Helpline 1905 is the Government of Uttarakhand's single place to raise complaints, demands and suggestions about any state department, by phone, website, app or WhatsApp.", "मुख्यमंत्री हेल्पलाइन 1905 उत्तराखंड सरकार का एकल मंच है, जहाँ किसी भी राज्य विभाग से जुड़ी शिकायत, मांग या सुझाव फ़ोन, वेबसाइट, ऐप या व्हाट्सऐप से दर्ज किए जा सकते हैं।")}</p>
        <h2>{t("What it promises", "इसका वादा")}</h2>
        <ul>
          <li>{t("Every complaint reaches the officer responsible, with a deadline.", "हर शिकायत ज़िम्मेदार अधिकारी तक, समय सीमा के साथ पहुँचती है।")}</li>
          <li>{t("Unresolved complaints move up automatically, up to the Secretary.", "अनिस्तारित शिकायतें स्वतः सचिव स्तर तक ऊपर जाती हैं।")}</li>
          <li>{t("The Chief Minister's Office reviews pending complaints and reminders.", "मुख्यमंत्री कार्यालय लंबित शिकायतों और अनुस्मारकों की समीक्षा करता है।")}</li>
          <li>{t("Complaints are closed only after the citizen gives feedback, and can be reopened.", "शिकायत नागरिक की प्रतिक्रिया के बाद ही बंद होती है, और पुनः खोली जा सकती है।")}</li>
        </ul>
        <h2>{t("Connected systems", "जुड़ी हुई प्रणालियाँ")}</h2>
        <ul>
          <li><a href="https://pgportal.gov.in/" rel="noopener">CPGRAMS</a> – {t("central government grievances", "केंद्र सरकार की शिकायतें")}</li>
          <li><a href="https://eservices.uk.gov.in/" rel="noopener">Apuni Sarkar</a> – {t("state e-services such as certificates", "प्रमाण पत्र जैसी राज्य ई-सेवाएँ")}</li>
          <li>{t("CM Letter Monitoring System (LMS)", "मुख्यमंत्री पत्र निगरानी प्रणाली (LMS)")}</li>
        </ul>
        <p><Link to="/orders">{t("Read the government orders behind these rules", "इन नियमों से जुड़े शासनादेश पढ़ें")}</Link></p>
      </div>
    </>
  );
}

export function Accessibility() {
  const { t } = useI18n();
  return (
    <>
      <PageHead en="Accessibility statement" hi="सुगम्यता विवरण" />
      <div className="container prose">
        <p>{t("This prototype is built to meet WCAG 2.1 level AA and the Guidelines for Indian Government Websites (GIGW 3.0).", "यह प्रोटोटाइप WCAG 2.1 स्तर AA और भारत सरकार की वेबसाइटों हेतु दिशानिर्देश (GIGW 3.0) के अनुरूप बनाया गया है।")}</p>
        <h2>{t("What you can do", "आप क्या कर सकते हैं")}</h2>
        <ul>
          <li>{t("Make text up to 130% bigger with A+ at the top of every page, or zoom to 400% without losing content", "हर पृष्ठ के ऊपर A+ से अक्षर 130% तक बड़े करें, या बिना सामग्री खोए 400% तक ज़ूम करें")}</li>
          <li>{t("Switch to high contrast", "उच्च कंट्रास्ट पर जाएँ")}</li>
          <li>{t("Use the whole site with a keyboard; a yellow focus shows where you are", "पूरी साइट कीबोर्ड से चलाएँ; पीला फ़ोकस बताता है कि आप कहाँ हैं")}</li>
          <li>{t("Use a screen reader: pages set the correct language (Hindi or English), every form error is announced, and each page has a unique title", "स्क्रीन रीडर का उपयोग करें: पृष्ठ सही भाषा (हिंदी या अंग्रेज़ी) बताते हैं, हर त्रुटि बोली जाती है और हर पृष्ठ का अलग शीर्षक है")}</li>
          <li>{t("Speak your complaint instead of typing, in Hindi or English", "टाइप करने के बजाय हिंदी या अंग्रेज़ी में बोलकर शिकायत दर्ज करें")}</li>
          <li>{t("Press Listen to hear your complaint's status read aloud, or ask Sahayak with your voice", "‘सुनें’ दबाकर शिकायत की स्थिति सुनें, या आवाज़ से सहायक से पूछें")}</li>
          <li>{t("The photo slideshow on the home page can be paused, and never moves if your device is set to reduce motion", "मुखपृष्ठ का फ़ोटो स्लाइड शो रोका जा सकता है, और ‘कम गति’ सेटिंग पर कभी नहीं चलता")}</li>
          <li>{t("Register by phone on 1905 if the website doesn't work for you", "वेबसाइट उपयोगी न हो तो 1905 पर फ़ोन से दर्ज करें")}</li>
        </ul>
        <h2>{t("Known limitations", "ज्ञात सीमाएँ")}</h2>
        <ul>
          <li>{t("Voice input depends on browser support (Chrome, Edge and Safari).", "वॉइस इनपुट ब्राउज़र पर निर्भर है (क्रोम, एज और सफ़ारी)।")}</li>
          <li>{t("Linked PDFs of government orders are scans and may not be readable by screen readers.", "शासनादेशों के PDF स्कैन हैं और स्क्रीन रीडर से पढ़े नहीं जा सकते।")}</li>
        </ul>
        <p>{t("Found a barrier?", "कोई बाधा मिली?")} <Link to="/contact">{t("Tell us", "हमें बताएँ")}</Link>.</p>
      </div>
    </>
  );
}

export function Privacy() {
  const { t } = useI18n();
  return (
    <>
      <PageHead en="Privacy policy" hi="गोपनीयता नीति" />
      <div className="container prose">
        <h2>{t("What we collect", "हम क्या एकत्र करते हैं")}</h2>
        <p>{t("Your mobile number, name, the complaint and its location. Nothing else is required.", "आपका मोबाइल नंबर, नाम, शिकायत और उसका स्थान। इसके अलावा कुछ आवश्यक नहीं।")}</p>
        <h2>{t("Who sees it", "इसे कौन देखता है")}</h2>
        <p>{t("Only the officers handling your complaint and the CM Office. Officers see your mobile number masked except the last 4 digits.", "केवल आपकी शिकायत देख रहे अधिकारी और मुख्यमंत्री कार्यालय। अधिकारियों को आपका मोबाइल नंबर अंतिम 4 अंकों को छोड़कर छिपा हुआ दिखता है।")}</p>
        <h2>{t("Cookies", "कुकीज़")}</h2>
        <p>{t("One cookie keeps you signed in for up to 8 hours. Your text size, contrast and language choices are saved in your browser only.", "एक कुकी आपको 8 घंटे तक साइन इन रखती है। अक्षर आकार, कंट्रास्ट और भाषा की पसंद केवल आपके ब्राउज़र में सहेजी जाती है।")}</p>
        <h2>{t("Automated suggestions", "स्वचालित सुझाव")}</h2>
        <p>{t("When you describe a problem, software suggests the department. You can always change it, and a person decides what happens next.", "समस्या बताने पर सॉफ़्टवेयर विभाग सुझाता है। आप इसे हमेशा बदल सकते हैं, और आगे का निर्णय व्यक्ति ही लेता है।")}</p>
      </div>
    </>
  );
}

export function Terms() {
  const { t } = useI18n();
  return (
    <>
      <PageHead en="Terms of use" hi="उपयोग की शर्तें" />
      <div className="container prose">
        <ul>
          <li>{t("Give true information. False complaints may be closed without action.", "सत्य जानकारी दें। झूठी शिकायतें बिना कार्यवाही बंद की जा सकती हैं।")}</li>
          <li>{t("Do not use abusive language or share other people's personal details.", "अपमानजनक भाषा का प्रयोग न करें और दूसरों की निजी जानकारी साझा न करें।")}</li>
          <li>{t("Matters before a court, and RTI applications, cannot be registered here.", "न्यायालय में विचाराधीन मामले और आरटीआई आवेदन यहाँ दर्ज नहीं हो सकते।")}</li>
          <li>{t("Emergencies: call 112. This service is not for emergencies.", "आपात स्थिति: 112 पर कॉल करें। यह सेवा आपात स्थिति के लिए नहीं है।")}</li>
        </ul>
      </div>
    </>
  );
}

export function Cpgrams() {
  const { t } = useI18n();
  return (
    <>
      <PageHead en="Complaints about central government offices" hi="केंद्र सरकार के कार्यालयों की शिकायतें" />
      <div className="container prose">
        <p className="lead">{t("Railways, passports, income tax, banks, post offices, Aadhaar, EPFO, telecom, national highways and central schools are run by the Government of India.", "रेलवे, पासपोर्ट, आयकर, बैंक, डाकघर, आधार, ईपीएफओ, दूरसंचार, राष्ट्रीय राजमार्ग और केंद्रीय विद्यालय भारत सरकार के अधीन हैं।")}</p>
        <p>{t("Register those on CPGRAMS, the Centralised Public Grievance Redress and Monitoring System. CM Helpline is linked to CPGRAMS, so state matters sent there come back to us.", "इन्हें CPGRAMS (केंद्रीकृत लोक शिकायत निवारण एवं निगरानी प्रणाली) पर दर्ज करें। मुख्यमंत्री हेल्पलाइन CPGRAMS से जुड़ी है, इसलिए वहाँ भेजे गए राज्य के मामले हमारे पास आ जाते हैं।")}</p>
        <a className="btn" href="https://pgportal.gov.in/" rel="noopener">{t("Go to CPGRAMS", "CPGRAMS पर जाएँ")}</a>
      </div>
    </>
  );
}

export function Sitemap() {
  const { t } = useI18n();
  const groups = [
    { title: ["Complaints", "शिकायतें"], links: [["/register", "Register a complaint", "शिकायत दर्ज करें"], ["/track", "Check status", "स्थिति देखें"], ["/my-complaints", "My complaints", "मेरी शिकायतें"], ["/cpgrams", "Central government complaints", "केंद्र सरकार की शिकायतें"]] },
    { title: ["Information", "जानकारी"], links: [["/departments", "Departments", "विभाग"], ["/dashboard", "Live dashboard", "लाइव डैशबोर्ड"], ["/orders", "Government orders", "शासनादेश"], ["/about", "About", "परिचय"], ["/help", "Help and FAQs", "सहायता"]] },
    { title: ["Account", "खाता"], links: [["/login", "Sign in", "साइन इन"], ["/officer", "Officer console", "अधिकारी कंसोल"], ["/whatsapp", "WhatsApp updates", "व्हाट्सऐप अद्यतन"]] },
    { title: ["Policies", "नीतियाँ"], links: [["/accessibility", "Accessibility", "सुगम्यता"], ["/privacy", "Privacy", "गोपनीयता"], ["/terms", "Terms of use", "उपयोग की शर्तें"], ["/contact", "Contact", "संपर्क"], ["/proposal", "About this redesign", "इस नए डिज़ाइन के बारे में"], ["/credits", "Photo and map credits", "फ़ोटो एवं मानचित्र श्रेय"]] },
  ] as const;
  return (
    <>
      <PageHead en="Sitemap" hi="साइटमैप" />
      <div className="container sitemap">
        {groups.map((g) => (
          <section key={g.title[0]}>
            <h2>{t(g.title[0], g.title[1])}</h2>
            <ul>
              {g.links.map(([to, en, hi]) => (
                <li key={to}><Link to={to}>{t(en, hi)}</Link></li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}

export function NotFound() {
  const { t } = useI18n();
  useDocumentTitle("Page not found", "पृष्ठ नहीं मिला");
  return (
    <div className="container section prose">
      <h1>{t("Page not found", "पृष्ठ नहीं मिला")}</h1>
      <p>{t("If you typed the address, check it. If you followed a link, it may be out of date.", "यदि आपने पता टाइप किया है तो जाँच लें। यदि लिंक से आए हैं तो वह पुराना हो सकता है।")}</p>
      <p><Link to="/">{t("Go to the home page", "मुखपृष्ठ पर जाएँ")}</Link> {t("or", "या")} <Link to="/register">{t("register a complaint", "शिकायत दर्ज करें")}</Link>.</p>
    </div>
  );
}

const credits = [
  { img: "/img/kedarnath-960.webp", title: "Kedarnath temple in uttarakhand.jpg", artist: "Nehasnaps0306", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Kedarnath_temple_in_uttarakhand.jpg" },
  { img: "/img/valley-of-flowers-960.webp", title: "Valley of flowers national park, Uttarakhand, India.jpg", artist: "Rohit Sharma", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Valley_of_flowers_national_park,_Uttarakhand,_India.jpg" },
  { img: "/img/nainital-960.webp", title: "Naini Lake, Nainital, Uttarakhand, India.jpg", artist: "Praveen Singh Bisht", license: "CC BY 2.0", url: "https://commons.wikimedia.org/wiki/File:Naini_Lake,_Nainital,_Uttarakhand,_India.jpg" },
  { img: "/img/tungnath-960.webp", title: "Tungnath, India (32735073444).jpg", artist: "Aditya Siva", license: "CC0", url: "https://commons.wikimedia.org/wiki/File:Tungnath,_India_(32735073444).jpg" },
  { img: "/img/haridwar-960.webp", title: "Har Ki Pauri and Clock Tower of Haridwar.jpg", artist: "Whispyhistory", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Har_Ki_Pauri_and_Clock_Tower_of_Haridwar.jpg" },
  { img: "/img/auli-960.webp", title: "Auli mountains.jpg", artist: "Navi8apr", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Auli_mountains.jpg" },
  { img: "/img/cm-dhami.webp", title: "Pushkar Dhami.jpg", artist: "Ministry of Defence, Government of India", license: "GODL-India", url: "https://commons.wikimedia.org/wiki/File:Pushkar_Dhami.jpg" },
  { img: "/img/seal.png", title: "Seal of Uttarakhand.svg", artist: "Government of Uttarakhand", license: "Public domain", url: "https://commons.wikimedia.org/wiki/File:Seal_of_Uttarakhand.svg" },
];

export function Credits() {
  const { t } = useI18n();
  return (
    <>
      <PageHead en="Photo and map credits" hi="फ़ोटो एवं मानचित्र श्रेय" lead={t("Photographs are from Wikimedia Commons under the licences shown. The state emblem and the Chief Minister's portrait are Government of India / Uttarakhand works.", "फ़ोटो विकिमीडिया कॉमन्स से, दर्शाए गए लाइसेंस के अंतर्गत हैं। राज्य चिह्न और मुख्यमंत्री का चित्र भारत / उत्तराखंड सरकार की कृतियाँ हैं।")} />
      <div className="container">
        <ul className="credits">
          {credits.map((c) => (
            <li key={c.url}>
              <img src={c.img} alt="" loading="lazy" style={c.img.includes("seal") ? { objectFit: "contain", background: "var(--surface)" } : undefined} />
              <div>
                <strong>{c.title}</strong>
                <br />
                {c.artist} · {c.license} · <a href={c.url} rel="noopener">{t("Source", "स्रोत")}</a>
              </div>
            </li>
          ))}
        </ul>
        <div className="prose section">
          <h2>{t("District map", "जनपद मानचित्र")}</h2>
          <p>{t("District boundaries from the Census of India 2011, as published by DataMeet and the india-maps-data project, simplified for the web. Boundaries are indicative.", "जनपद सीमाएँ भारत की जनगणना 2011 से, DataMeet एवं india-maps-data परियोजना द्वारा प्रकाशित, वेब हेतु सरलीकृत। सीमाएँ सांकेतिक हैं।")}</p>
          <h2>{t("Typefaces and icons", "टाइपफ़ेस एवं आइकन")}</h2>
          <p>{t("Poppins by Indian Type Foundry and Noto Sans by Google (SIL Open Font Licence). Icons from Lucide (ISC licence).", "इंडियन टाइप फ़ाउंड्री का Poppins और Google का Noto Sans (SIL ओपन फ़ॉन्ट लाइसेंस)। आइकन Lucide से (ISC लाइसेंस)।")}</p>
        </div>
      </div>
    </>
  );
}
