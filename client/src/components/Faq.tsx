import { Link } from "react-router-dom";
import { Phone } from "lucide-react";
import { useI18n } from "../context/I18nContext";
import { Reveal } from "./Reveal";

type Text = { en: string; hi: string };

const questions: { q: Text; a: Text }[] = [
  {
    q: { en: "Who can register a complaint?", hi: "शिकायत कौन दर्ज कर सकता है?" },
    a: { en: "Any resident with a problem involving a Government of Uttarakhand department, office or scheme. You only need a mobile number; no fee is charged.", hi: "उत्तराखंड सरकार के किसी विभाग, कार्यालय या योजना से जुड़ी समस्या वाला कोई भी निवासी। केवल मोबाइल नंबर चाहिए; कोई शुल्क नहीं लगता।" },
  },
  {
    q: { en: "How do I register a complaint?", hi: "शिकायत कैसे दर्ज करें?" },
    a: { en: "Describe the problem in your own words on this page, in writing or by voice. We suggest the department for your confirmation. You can also call 080 4729 1964 or message us on WhatsApp.", hi: "इसी पृष्ठ पर अपनी समस्या अपने शब्दों में, लिखकर या बोलकर बताएँ। हम पुष्टि हेतु विभाग सुझाते हैं। आप 080 4729 1964 पर कॉल या व्हाट्सऐप पर संदेश भी कर सकते हैं।" },
  },
  {
    q: { en: "How long will it take to get a response?", hi: "समाधान में कितना समय लगेगा?" },
    a: { en: "The first officer has 15 days. If the grievance is not resolved, it moves up automatically to the district officer, then the head of department, then the Secretary.", hi: "प्रथम अधिकारी के पास 15 दिन होते हैं। निस्तारण न होने पर शिकायत स्वतः जनपद अधिकारी, फिर विभागाध्यक्ष और फिर सचिव तक जाती है।" },
  },
  {
    q: { en: "How can I check the status of my complaint?", hi: "शिकायत की स्थिति कैसे देखें?" },
    a: { en: "Use Track a complaint with your complaint number and the mobile number you registered with. You can see which officer holds it and the deadline.", hi: "‘शिकायत की स्थिति’ में अपना शिकायत क्रमांक और पंजीकृत मोबाइल नंबर दर्ज करें। आप देख सकते हैं कि शिकायत किस अधिकारी के पास है और समय सीमा क्या है।" },
  },
  {
    q: { en: "The complaint was closed but my problem remains. What can I do?", hi: "शिकायत बंद हो गई पर समस्या बनी है। क्या करें?" },
    a: { en: "Rate the action as not satisfactory and reopen the complaint within 30 days. It is referred to the next higher officer.", hi: "कार्यवाही को असंतोषजनक रेट करें और 30 दिन के भीतर शिकायत पुनः खोलें। यह अगले उच्च अधिकारी को भेजी जाती है।" },
  },
  {
    q: { en: "In which languages can I write?", hi: "किन भाषाओं में लिख सकते हैं?" },
    a: { en: "Hindi and English, and the page can be read in Garhwali and Kumaoni too. Write the way you speak; if the department is unclear you can choose it yourself.", hi: "हिंदी और अंग्रेज़ी में, और पृष्ठ गढ़वाली व कुमाऊँनी में भी पढ़ा जा सकता है। जैसे बोलते हैं वैसे लिखें; विभाग स्पष्ट न हो तो स्वयं चुन सकते हैं।" },
  },
  {
    q: { en: "Is my personal information protected?", hi: "क्या मेरी व्यक्तिगत जानकारी सुरक्षित है?" },
    a: { en: "Officers see only the last four digits of your mobile number. A status check needs both the complaint number and your mobile number, so no one else can look you up.", hi: "अधिकारियों को आपके मोबाइल नंबर के केवल अंतिम चार अंक दिखते हैं। स्थिति जाँच हेतु शिकायत क्रमांक और मोबाइल नंबर दोनों चाहिए, इसलिए कोई और आपको खोज नहीं सकता।" },
  },
  {
    q: { en: "I did not receive a scheme benefit. Where do I complain?", hi: "योजना का लाभ नहीं मिला। कहाँ शिकायत करें?" },
    a: { en: "Open the scheme and choose “Benefit not received? Complain”, or register here and name the department. The complaint goes to the officer responsible.", hi: "योजना खोलकर ‘लाभ नहीं मिला? शिकायत करें’ चुनें, या यहाँ दर्ज कर विभाग का नाम बताएँ। शिकायत ज़िम्मेदार अधिकारी तक पहुँचती है।" },
  },
];

/** Plain questions and answers at the foot of the home page. */
export function Faq() {
  const { t, pick } = useI18n();
  return (
    <section className="section section--faq" aria-labelledby="faq-title">
      <div className="container">
        <Reveal className="path__head">
          <span className="kicker kicker--plain">{t("Need to know", "जानने योग्य")}</span>
          <h2 id="faq-title" className="split__title">{t("Frequently asked questions", "अक्सर पूछे जाने वाले प्रश्न")}</h2>
        </Reveal>
        <Reveal className="faqs" delay={120}>
          {questions.map((x) => (
            <details key={x.q.en} className="faqs__item">
              <summary>{pick(x.q)}</summary>
              <p>{pick(x.a)}</p>
            </details>
          ))}
        </Reveal>
        <p className="faqs__more">
          <Phone size={16} aria-hidden="true" /> {t("Still have a question? Call", "अब भी प्रश्न है? कॉल करें")} <a href="tel:08047291964"><strong>080 4729 1964</strong></a> {t("or see", "या देखें")} <Link to="/help">{t("all help topics", "सभी सहायता विषय")}</Link>.
        </p>
      </div>
    </section>
  );
}
