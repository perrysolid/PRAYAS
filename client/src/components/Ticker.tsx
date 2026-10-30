import { useState } from "react";
import { Link } from "react-router-dom";
import { Megaphone, Pause, Play } from "lucide-react";
import { useI18n } from "../context/I18nContext";
import { useAsync } from "../hooks/useAsync";
import { api } from "../lib/api";
import { formatDate } from "../lib/format";

/**
 * "What's new" strip with the latest government orders and review minutes.
 * Moves slowly, stops on hover or focus, has a pause button, and is a plain list to screen readers.
 */
export function Ticker() {
  const { t, pick, lang } = useI18n();
  const [paused, setPaused] = useState(false);
  const { data } = useAsync((signal) => api.orders({}, signal), []);
  const items = (data ?? []).filter((o) => o.date).slice(0, 6);
  if (!items.length) return null;

  const list = (hidden: boolean) => (
    <ul className="ticker__list" aria-hidden={hidden || undefined}>
      {items.map((o) => (
        <li key={o.id}>
          <span className="ticker__date">{formatDate(o.date!, lang)}</span>
          <a href={o.url} rel="noopener" tabIndex={hidden ? -1 : undefined}>{pick(o.title)}</a>
        </li>
      ))}
    </ul>
  );

  return (
    <section className="ticker" aria-labelledby="ticker-title" data-paused={paused}>
      <div className="container ticker__inner">
        <h2 id="ticker-title" className="ticker__title">
          <Megaphone size={18} aria-hidden="true" /> {t("What's new", "नया क्या है")}
        </h2>
        <div className="ticker__viewport">
          <div className="ticker__track">
            {list(false)}
            {list(true)}
          </div>
        </div>
        <button type="button" className="ticker__btn" onClick={() => setPaused((p) => !p)} aria-label={paused ? t("Resume scrolling", "स्क्रॉल फिर शुरू करें") : t("Pause scrolling", "स्क्रॉल रोकें")}>
          {paused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
        </button>
        <Link to="/orders" className="ticker__all">{t("All orders", "सभी आदेश")}</Link>
      </div>
    </section>
  );
}
