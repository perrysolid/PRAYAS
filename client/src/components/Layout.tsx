import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { BarChart3, Building2, ExternalLink, FileBadge, FileText, Globe, HelpCircle, LogOut, Menu, MessageCircle, Moon, PenLine, Phone, Search, ShieldCheck, Sun, User, X } from "lucide-react";
import { useA11y } from "../context/A11yContext";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";
import { languages, type Locale } from "../lib/languages";
import { PageTranslator } from "./PageTranslator";
import { Sahayak } from "./Sahayak";
import { StateSeal } from "./Seal";

function ThemeSwitch() {
  const { t } = useI18n();
  const { theme, setTheme } = useA11y();
  const systemDark = typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  const dark = theme === "dark" || (theme === "system" && systemDark);
  return (
    <button type="button" role="switch" aria-checked={dark} className="menu__switch" onClick={() => setTheme(dark ? "light" : "dark")}>
      <span className="menu__switch-name">
        {dark ? <Moon size={18} aria-hidden="true" /> : <Sun size={18} aria-hidden="true" />}
        {dark ? t("Dark mode", "डार्क मोड") : t("Light mode", "लाइट मोड")}
      </span>
      <span className="menu__track" aria-hidden="true" />
    </button>
  );
}

/** The menu behind the hamburger: language first, then appearance, then the places to go. */
function SiteMenu({ onClose }: { onClose: () => void }) {
  const { t, locale, setLocale } = useI18n();
  const a11y = useA11y();
  const { session, logout } = useAuth();
  const items = [
    { to: "/register", label: t("Register complaint", "शिकायत दर्ज करें"), Icon: PenLine },
    { to: "/track", label: t("Track status", "स्थिति देखें"), Icon: Search },
    ...(session?.role === "officer" ? [] : [{ to: "/my-complaints", label: t("My profile", "मेरी प्रोफ़ाइल"), Icon: User }]),
    { to: "/whatsapp", label: t("WhatsApp", "व्हाट्सऐप"), Icon: MessageCircle },
    { to: "/departments", label: t("Departments", "विभाग"), Icon: Building2 },
    { to: "/orders", label: t("Resolutions", "शासनादेश"), Icon: FileText },
    { to: "/dashboard", label: t("Live dashboard", "लाइव डैशबोर्ड"), Icon: BarChart3 },
    { to: "/help", label: t("Help", "सहायता"), Icon: HelpCircle },
  ];
  return (
    <div id="site-menu" className="menu" role="dialog" aria-label={t("Menu", "मेनू")}>
      <div className="menu__group">
        <p className="menu__label" id="menu-lang">{t("Language", "भाषा")}</p>
        <label className="menu__lang">
          <Globe size={18} aria-hidden="true" />
          <select aria-labelledby="menu-lang" value={locale} onChange={(e) => setLocale(e.target.value as Locale)} data-no-translate>
            {languages.map((l) => (
              <option key={l.code} value={l.code} lang={l.code}>{l.native}{l.code !== "en" && l.code !== "hi" ? " · AI" : ""}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="menu__group">
        <p className="menu__label">{t("Display", "प्रदर्शन")}</p>
        <ThemeSwitch />
        <div className="menu__size" role="group" aria-label={t("Text size", "अक्षर आकार")}>
          <span>{t("Text size", "अक्षर आकार")}</span>
          <div>
            <button type="button" onClick={a11y.shrink} disabled={!a11y.canShrink} aria-label={t("Decrease text size", "अक्षर छोटे करें")}>A−</button>
            <button type="button" onClick={a11y.reset} aria-label={t("Reset text size", "सामान्य अक्षर आकार")}>A</button>
            <button type="button" onClick={a11y.grow} disabled={!a11y.canGrow} aria-label={t("Increase text size", "अक्षर बड़े करें")}>A+</button>
          </div>
        </div>
      </div>
      <ul className="menu__list">
        {items.map(({ to, label, Icon }) => (
          <li key={to}>
            <NavLink to={to} onClick={onClose}><Icon size={18} aria-hidden="true" />{label}</NavLink>
          </li>
        ))}
        <li>
          <a href="https://eservices.uk.gov.in/" target="_blank" rel="noopener noreferrer" onClick={onClose}>
            <FileBadge size={18} aria-hidden="true" />{t("Apply for permits", "अनुमति हेतु आवेदन")}
            <ExternalLink size={14} className="menu__ext" aria-hidden="true" /><span className="visually-hidden">{t("(opens Apuni Sarkar in a new tab)", "(अपनी सरकार नए टैब में खुलेगा)")}</span>
          </a>
        </li>
        {session?.role === "officer" && (
          <li><NavLink to="/officer" onClick={onClose}><ShieldCheck size={18} aria-hidden="true" />{t("Officer console", "अधिकारी कंसोल")}</NavLink></li>
        )}
        <li><a href="tel:1905"><Phone size={18} aria-hidden="true" />{t("Call 1905, toll free", "1905 पर कॉल करें, निःशुल्क")}</a></li>
        {session && (
          <li>
            <button type="button" onClick={() => { logout(); onClose(); }}><LogOut size={18} aria-hidden="true" />{t("Sign out", "साइन आउट")}</button>
          </li>
        )}
      </ul>
    </div>
  );
}

function Header() {
  const { t, lang } = useI18n();
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const wrap = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);

  useEffect(() => setOpen(false), [location.pathname]);

  // Close on outside click or Escape, handing focus back to the button like any disclosure.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); toggle.current?.focus(); } };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onPointer); document.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <header className={`header-wrap${location.pathname === "/" ? " header-wrap--overlay" : ""}`}>
      <div className="header">
        <div className="container header__inner">
          <div className="header__left">
            <Link to="/about" className="cm-chip">
              <img className="cm-chip__photo" src="/img/cm-portrait.webp" width="58" height="58" alt="" />
              <span className="cm-chip__text">
                <span className="cm-chip__name">{t("Shri Pushkar Singh Dhami", "श्री पुष्कर सिंह धामी")}</span>
                <span className="cm-chip__role">{t("Hon'ble Chief Minister, Uttarakhand", "माननीय मुख्यमंत्री, उत्तराखंड")}</span>
              </span>
            </Link>
          </div>
          <Link to="/" className="brand">
            <StateSeal className="brand__seal" />
            <span className="brand__text">
              <span className="brand__name">{t("CM Helpline 1905", "मुख्यमंत्री हेल्पलाइन 1905")}</span>
              <span className="brand__name-alt" lang={lang === "en" ? "hi" : "en"}>{lang === "en" ? "मुख्यमंत्री हेल्पलाइन" : "CM Helpline"}</span>
              <span className="brand__sub">{t("Government of Uttarakhand", "उत्तराखंड सरकार")}</span>
            </span>
          </Link>
          <div className="header__right" ref={wrap}>
            {session?.role === "officer" ? (
              <Link className="signin" to="/officer">
                <ShieldCheck size={18} aria-hidden="true" />
                {t("Officer console", "अधिकारी कंसोल")}
              </Link>
            ) : session ? (
              <Link className="signin" to="/my-complaints">{t("My profile", "मेरी प्रोफ़ाइल")}</Link>
            ) : (
              <Link className="signin" to="/login">
                <User size={18} aria-hidden="true" />
                <span className="signin__long">{t("Sign in / Sign up", "साइन इन / साइन अप")}</span>
                <span className="signin__short">{t("Sign in", "साइन इन")}</span>
              </Link>
            )}
            <button ref={toggle} type="button" className="burger" aria-expanded={open} aria-controls="site-menu" aria-label={t("Menu", "मेनू")} onClick={() => setOpen((v) => !v)}>
              {open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
            </button>
            {open && <SiteMenu onClose={() => setOpen(false)} />}
          </div>
        </div>
      </div>
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
          <span>{t("CM Helpline 1905 is run by ITDA, Government of Uttarakhand.", "मुख्यमंत्री हेल्पलाइन 1905 का संचालन आईटीडीए, उत्तराखंड सरकार करती है।")}</span>
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
      <Header />
      <PageTranslator />
      <main id="main" ref={mainRef} tabIndex={-1}>
        <Outlet />
      </main>
      <Footer />
      <Sahayak />
    </>
  );
}
