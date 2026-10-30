import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { useI18n } from "../context/I18nContext";

export const heroSlides = [
  { file: "kedarnath", en: "Kedarnath Temple, Rudraprayag", hi: "केदारनाथ मंदिर, रुद्रप्रयाग", focus: "50% 40%" },
  { file: "valley-of-flowers", en: "Valley of Flowers, Chamoli", hi: "फूलों की घाटी, चमोली", focus: "50% 55%" },
  { file: "nainital", en: "Naini Lake, Nainital", hi: "नैनी झील, नैनीताल", focus: "50% 50%" },
  { file: "tungnath", en: "Tungnath, Rudraprayag", hi: "तुंगनाथ, रुद्रप्रयाग", focus: "50% 45%" },
  { file: "haridwar", en: "Har Ki Pauri, Haridwar", hi: "हर की पौड़ी, हरिद्वार", focus: "50% 50%" },
  { file: "auli", en: "Auli, Chamoli", hi: "औली, चमोली", focus: "50% 50%" },
];

const INTERVAL = 7000;
const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Background photo carousel for the home page hero.
 * Accessible by design (WCAG 2.2.2): a visible pause button, pauses on hover and keyboard focus,
 * never auto-plays when the person prefers reduced motion, and the photos carry no information
 * that is not also in the visible caption.
 */
export function HeroCarousel() {
  const { t, pick } = useI18n();
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(() => !prefersReducedMotion());
  const [hovered, setHovered] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!playing || hovered) return;
    const id = window.setTimeout(() => setIndex((i) => (i + 1) % heroSlides.length), INTERVAL);
    return () => window.clearTimeout(id);
  }, [index, playing, hovered]);

  const go = (i: number) => setIndex((i + heroSlides.length) % heroSlides.length);
  const slide = heroSlides[index];

  return (
    <div
      ref={root}
      className="carousel"
      role="region"
      aria-roledescription={t("carousel", "स्लाइड शो")}
      aria-label={t("Photographs of Uttarakhand", "उत्तराखंड की तस्वीरें")}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={(e) => !root.current?.contains(e.relatedTarget as Node) && setHovered(false)}
    >
      <div className="carousel__slides">
        {heroSlides.map((s, i) => (
          <img
            key={s.file}
            className={`carousel__img${i === index ? " is-active" : ""}`}
            src={`/img/${s.file}.webp`}
            srcSet={`/img/${s.file}-960.webp 960w, /img/${s.file}.webp 1920w`}
            sizes="100vw"
            alt=""
            style={{ objectPosition: s.focus }}
            loading={i === 0 ? "eager" : "lazy"}
            fetchPriority={i === 0 ? "high" : "low"}
            decoding="async"
          />
        ))}
      </div>
      <div className="carousel__shade" aria-hidden="true" />
      <div className="container carousel__bar">
        <p className="carousel__caption" aria-live={playing && !hovered ? "off" : "polite"}>
          <span className="visually-hidden">{t(`Photo ${index + 1} of ${heroSlides.length}:`, `फ़ोटो ${index + 1} / ${heroSlides.length}:`)} </span>
          {pick(slide)}
        </p>
        <div className="carousel__controls">
          <button type="button" onClick={() => go(index - 1)} aria-label={t("Previous photo", "पिछली फ़ोटो")}>
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <div className="carousel__dots">
            {heroSlides.map((s, i) => (
              <button key={s.file} type="button" className="carousel__dot" aria-current={i === index ? "true" : undefined} aria-label={t(`Show photo ${i + 1}: ${s.en}`, `फ़ोटो ${i + 1} दिखाएँ: ${s.hi}`)} onClick={() => go(i)} />
            ))}
          </div>
          <button type="button" onClick={() => go(index + 1)} aria-label={t("Next photo", "अगली फ़ोटो")}>
            <ChevronRight size={18} aria-hidden="true" />
          </button>
          <button type="button" onClick={() => setPlaying((p) => !p)} aria-label={playing ? t("Pause slideshow", "स्लाइड शो रोकें") : t("Play slideshow", "स्लाइड शो चलाएँ")}>
            {playing ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
          </button>
        </div>
      </div>
    </div>
  );
}
