import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { useI18n } from "../context/I18nContext";

/** Search for a department, or for how complaints like yours were handled before. Sits just under the hero. */
export function HomeSearch() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    navigate(text.trim().length >= 2 ? `/search?q=${encodeURIComponent(text.trim())}` : "/search");
  };
  return (
    <section className="home-search" aria-labelledby="home-search-title">
      <div className="container">
        <h2 id="home-search-title" className="home-search__title">{t("Search a department or your problem", "विभाग या अपनी समस्या खोजें")}</h2>
        <form className="searchbar" role="search" onSubmit={submit}>
          <label htmlFor="home-q" className="visually-hidden">{t("Search departments and problems", "विभाग और समस्याएँ खोजें")}</label>
          <Search size={20} aria-hidden="true" />
          <input id="home-q" type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder={t("Try “no water supply” or “pension”", "जैसे “पानी की आपूर्ति नहीं” या “पेंशन”")} autoComplete="off" enterKeyHint="search" />
          <button type="submit" className="btn btn--accent btn--small">{t("Search", "खोजें")}</button>
        </form>
        <p className="home-search__hint">{t("See how similar complaints were handled and how long they took.", "देखें कि ऐसी शिकायतों पर क्या कार्यवाही हुई और कितना समय लगा।")}</p>
      </div>
    </section>
  );
}
