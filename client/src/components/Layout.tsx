import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { BarChart3, Building2, FileText, HelpCircle, LayoutList, Menu, PenLine, Phone, Search, ShieldCheck, X } from "lucide-react";
import { useA11y } from "../context/A11yContext";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";
import { Sahayak } from "./Sahayak";
import { StateSeal } from "./Seal";

function IdentifierBar() {
  const { t, lang, setLang } = useI18n();
  const a11y = useA11y();
  return (
    <div className="idbar">
      <div className="container idbar__inner">
        <span className="idbar__gov">
          <strong>{t("Government of Uttarakhand", "उत्तराखंड सरकार")}</strong>
          {/* On adoption this becomes "Official website". */}
          <span className="idbar__gov-long">· {t("Prototype redesign, not the official site", "प्रोटोटाइप पुनः डिज़ाइन, आधिकारिक साइट नहीं")}</span>
        </span>
        <div className="idbar__tools" role="group" aria-label={t("Display settings", "प्रदर्शन सेटिंग")}>
          <button type="button" onClick={a11y.shrink} disabled={!a11y.canShrink} aria-label={t("Decrease text size", "अक्षर छोटे करें")}>A−</button>
          <button type="button" onClick={a11y.reset} aria-label={t("Reset text size", "सामान्य अक्षर आकार")}>A</button>
          <button type="button" onClick={a11y.grow} disabled={!a11y.canGrow} aria-label={t("Increase text size", "अक्षर बड़े करें")}>A+</button>
          <span className="idbar__sep" aria-hidden="true" />
          <button type="button" onClick={a11y.toggleContrast} aria-pressed={a11y.highContrast}>
            {t("High contrast", "उच्च कंट्रास्ट")}
          </button>
          <span className="idbar__sep" aria-hidden="true" />
          {lang === "en" ? (
            <button type="button" onClick={() => setLang("hi")} lang="hi">हिंदी</button>
          ) : (
            <button type="button" onClick={() => setLang("en")} lang="en">English</button>
          )}
        </div>
      </div>
    </div>
  );
}

function Header() {
  const { t, lang } = useI18n();
  const { session, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);

  const links = [
    { to: "/register", label: t("Register complaint", "शिकायत दर्ज करें"), Icon: PenLine },
    { to: "/track", label: t("Track status", "स्थिति देखें"), Icon: Search },
    { to: "/my-complaints", label: t("My complaints", "मेरी शिकायतें"), Icon: LayoutList },
    { to: "/departments", label: t("Departments", "विभाग"), Icon: Building2 },
    { to: "/dashboard", label: t("Live dashboard", "लाइव डैशबोर्ड"), Icon: BarChart3 },
    { to: "/orders", label: t("Government orders", "शासनादेश"), Icon: FileText },
    { to: "/help", label: t("Help", "सहायता"), Icon: HelpCircle },
  ];

  return (
    <header className="header-wrap">
      <div className="header">
        <div className="container header__inner">
          <Link to="/" className="brand">
            <StateSeal className="brand__seal" />
            <span className="brand__text">
              <span className="brand__name">{t("CM Helpline 1905", "मुख्यमंत्री हेल्पलाइन 1905")}</span>
              <span className="brand__name-alt" lang={lang === "en" ? "hi" : "en"}>{lang === "en" ? "मुख्यमंत्री हेल्पलाइन" : "CM Helpline"}</span>
              <span className="brand__sub">{t("Government of Uttarakhand", "उत्तराखंड सरकार")}</span>
            </span>
          </Link>
          <div className="header__actions">
            <a className="call-pill" href="tel:1905">
              <Phone size={18} aria-hidden="true" />
              {t("Call 1905, toll free", "1905 पर कॉल करें, निःशुल्क")}
            </a>
            {session ? (
              <button type="button" className="btn btn--secondary btn--small" onClick={logout}>
                {t("Sign out", "साइन आउट")}
              </button>
            ) : (
              <Link className="btn btn--secondary btn--small" to="/login">
                {t("Sign in", "साइन इन")}
              </Link>
            )}
            <button
              type="button"
              className="btn btn--secondary btn--small nav-toggle"
              aria-expanded={open}
              aria-controls="primary-nav"
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
              {t("Menu", "मेनू")}
            </button>
            <Link to="/about" className="cm-chip">
              <img className="cm-chip__photo" src="/img/cm-dhami.webp" width="56" height="56" alt="" />
              <span className="cm-chip__text">
                <span className="cm-chip__name">{t("Shri Pushkar Singh Dhami", "श्री पुष्कर सिंह धामी")}</span>
                <span className="cm-chip__role">{t("Hon'ble Chief Minister, Uttarakhand", "माननीय मुख्यमंत्री, उत्तराखंड")}</span>
              </span>
            </Link>
          </div>
        </div>
      </div>
      <nav id="primary-nav" className="nav" data-open={open} aria-label={t("Main", "मुख्य")}>
        <ul className="container nav__list">
          {links.map(({ to, label, Icon }) => (
            <li key={to}>
              <NavLink to={to}>
                <Icon size={17} aria-hidden="true" />
                {label}
              </NavLink>
            </li>
          ))}
          {session?.role === "officer" && (
            <li>
              <NavLink to="/officer">
                <ShieldCheck size={17} aria-hidden="true" />
                {t("Officer desk", "अधिकारी डेस्क")}
              </NavLink>
            </li>
          )}
        </ul>
      </nav>
    </header>
  );
}

function Footer() {
  const { t } = useI18n();
  return (
    <>
    <svg className="ridge" viewBox="0 0 1440 140" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path className="ridge__far" d="M0 140V90l80-20 80 15 100-45 80 35 80-20 100-35 80 40 100-15 90 25 90-40 80 35 100-15 90-35 90 45 100-15 100 25v70z" />
      <path className="ridge__snow" d="M505 28l15-8 16 10-10-2-6 4-8-4zM1135 23l15-8 16 11-9-2-7 5-7-4zM865 38l15-8 15 10-9-2-6 4-7-3zM245 48l15-8 15 10-9-2-6 4-7-3z" />
      <path className="ridge__mid" d="M0 140v-30l120-30 100 25 110-35 120 30 110-35 120 33 120-23 120 29 120-34 120 30 120-22 160 22v40z" />
      <path className="ridge__near" d="M0 140v-15l150-20 150 23 160-20 160 22 160-20 160 18 160-22 160 20 180-14v28z" />
    </svg>
    <footer className="footer">
      <div className="container">
        <div className="footer__brand">
          <img src="/img/seal.png" alt="" width="56" height="56" />
          <span>
            <strong>{t("CM Helpline 1905", "मुख्यमंत्री हेल्पलाइन 1905")}</strong>
            {t("Government of Uttarakhand · Toll free from any phone", "उत्तराखंड सरकार · किसी भी फ़ोन से निःशुल्क")}
          </span>
        </div>
        <div className="footer__grid">
          <div>
            <h2>{t("Register a complaint", "शिकायत दर्ज करें")}</h2>
            <ul>
              <li><a href="tel:1905">{t("Call 1905 (toll free)", "1905 पर कॉल करें (निःशुल्क)")}</a></li>
              <li><Link to="/register">{t("Online, in Hindi or English", "ऑनलाइन, हिंदी या अंग्रेज़ी में")}</Link></li>
              <li><a href="https://api.whatsapp.com/send?phone=917302254182" rel="noopener">{t("WhatsApp +91 73022 54182", "व्हाट्सऐप +91 73022 54182")}</a></li>
              <li><a href="https://play.google.com/store/apps/details?id=com.itda" rel="noopener">{t("Android app", "एंड्रॉइड ऐप")}</a></li>
            </ul>
          </div>
          <div>
            <h2>{t("About this service", "इस सेवा के बारे में")}</h2>
            <ul>
              <li><Link to="/about">{t("About CM Helpline", "हेल्पलाइन के बारे में")}</Link></li>
              <li><Link to="/orders">{t("Government orders", "शासनादेश")}</Link></li>
              <li><Link to="/dashboard">{t("Live dashboard", "लाइव डैशबोर्ड")}</Link></li>
              <li><Link to="/cpgrams">{t("Central government complaints (CPGRAMS)", "केंद्र सरकार की शिकायतें (CPGRAMS)")}</Link></li>
              <li><Link to="/proposal">{t("About this redesign", "इस नए डिज़ाइन के बारे में")}</Link></li>
            </ul>
          </div>
          <div>
            <h2>{t("Help and policies", "सहायता एवं नीतियाँ")}</h2>
            <ul>
              <li><Link to="/help">{t("Help and FAQs", "सहायता एवं सामान्य प्रश्न")}</Link></li>
              <li><Link to="/contact">{t("Contact us", "संपर्क करें")}</Link></li>
              <li><Link to="/accessibility">{t("Accessibility statement", "सुगम्यता विवरण")}</Link></li>
              <li><Link to="/privacy">{t("Privacy policy", "गोपनीयता नीति")}</Link></li>
              <li><Link to="/terms">{t("Terms of use", "उपयोग की शर्तें")}</Link></li>
              <li><Link to="/sitemap">{t("Sitemap", "साइटमैप")}</Link></li>
              <li><Link to="/credits">{t("Photo and map credits", "फ़ोटो एवं मानचित्र श्रेय")}</Link></li>
            </ul>
          </div>
          <div>
            <h2>{t("Office", "कार्यालय")}</h2>
            <p>
              {t("Uttarakhand Secretariat, New Building, 4th Floor, Subhash Road, Dehradun 248001", "उत्तराखंड सचिवालय, नया भवन, चौथी मंज़िल, सुभाष रोड, देहरादून 248001")}
            </p>
            <p>
              <a href="mailto:cm-helpline@uk.gov.in">cm-helpline@uk.gov.in</a>
            </p>
          </div>
        </div>
        <div className="footer__base">
          <span>
            {t(
              "CM Helpline 1905 is run by ITDA, Government of Uttarakhand. This site is a hackathon redesign prototype, not the official service.",
              "मुख्यमंत्री हेल्पलाइन 1905 का संचालन आईटीडीए, उत्तराखंड सरकार करती है। यह साइट हैकाथॉन हेतु बना पुनः डिज़ाइन प्रोटोटाइप है, आधिकारिक सेवा नहीं।",
            )}
          </span>
          <a href="https://cmhelpline.uk.gov.in/" rel="noopener">{t("Go to the official portal", "आधिकारिक पोर्टल पर जाएँ")}</a>
        </div>
      </div>
    </footer>
    </>
  );
}

/** On route change, move focus to <main> and announce the new page, as a full page load would. */
function useRouteFocus(mainRef: React.RefObject<HTMLElement>) {
  const location = useLocation();
  const previousPath = useRef(location.pathname);
  useEffect(() => {
    // Comparing paths (not a "first run" flag) keeps StrictMode's double effect from stealing focus on load.
    if (previousPath.current === location.pathname) return;
    previousPath.current = location.pathname;
    if (location.hash) return;
    window.scrollTo(0, 0);
    mainRef.current?.focus({ preventScroll: true });
  }, [location.pathname, location.hash, mainRef]);
}

export function Layout() {
  const { t } = useI18n();
  const mainRef = useRef<HTMLElement>(null);
  useRouteFocus(mainRef);

  return (
    <>
      <a className="skip-link" href="#main">
        {t("Skip to main content", "मुख्य सामग्री पर जाएँ")}
      </a>
      <div className="tricolour" aria-hidden="true"><span /><span /><span /></div>
      <IdentifierBar />
      <Header />
      <main id="main" ref={mainRef} tabIndex={-1}>
        <Outlet />
      </main>
      <Footer />
      <Sahayak />
    </>
  );
}
