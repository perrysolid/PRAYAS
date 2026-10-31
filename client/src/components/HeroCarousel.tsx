import { useEffect, useRef, useState } from "react";
import { useI18n } from "../context/I18nContext";

export const heroSlides = [
  { file: "hill-villages", en: "Hill villages in the mist, Uttarakhand", hi: "कोहरे में पहाड़ी गाँव, उत्तराखंड", focus: "50% 55%" },
  { file: "kedarnath", en: "Kedarnath Temple, Rudraprayag", hi: "केदारनाथ मंदिर, रुद्रप्रयाग", focus: "50% 40%" },
  { file: "rishikesh", en: "Ganga at Rishikesh", hi: "गंगा, ऋषिकेश", focus: "50% 55%" },
  { file: "valley-of-flowers", en: "Valley of Flowers, Chamoli", hi: "फूलों की घाटी, चमोली", focus: "50% 55%" },
  { file: "badrinath", en: "Badrinath Temple, Chamoli", hi: "बद्रीनाथ मंदिर, चमोली", focus: "50% 55%" },
  { file: "nainital", en: "Naini Lake, Nainital", hi: "नैनी झील, नैनीताल", focus: "50% 50%" },
  { file: "panchachuli", en: "Panchachuli peaks, Pithoragarh", hi: "पंचाचूली शिखर, पिथौरागढ़", focus: "50% 50%" },
  { file: "haridwar", en: "Har Ki Pauri, Haridwar", hi: "हर की पौड़ी, हरिद्वार", focus: "50% 50%" },
  { file: "chopta-hills", en: "Chopta, Rudraprayag", hi: "चोपता, रुद्रप्रयाग", focus: "50% 55%" },
  { file: "hemkund-sahib", en: "Hemkund Sahib and Lokpal Lake, Chamoli", hi: "हेमकुंड साहिब और लोकपाल झील, चमोली", focus: "50% 55%" },
  { file: "tungnath", en: "Tungnath, Rudraprayag", hi: "तुंगनाथ, रुद्रप्रयाग", focus: "50% 45%" },
  { file: "tehri-lake", en: "Tehri Lake, Tehri Garhwal", hi: "टिहरी झील, टिहरी गढ़वाल", focus: "50% 50%" },
  { file: "gangotri", en: "Gangotri, Uttarkashi", hi: "गंगोत्री, उत्तरकाशी", focus: "50% 45%" },
  { file: "auli", en: "Auli, Chamoli", hi: "औली, चमोली", focus: "50% 50%" },
  { file: "landour", en: "Dehradun valley from Landour, Mussoorie", hi: "लंढौर से देहरादून घाटी, मसूरी", focus: "50% 50%" },
  { file: "bhimtal", en: "Bhimtal Lake, Nainital", hi: "भीमताल झील, नैनीताल", focus: "50% 55%" },
  { file: "chopta-peak", en: "Snow peak from Chopta, Rudraprayag", hi: "चोपता से हिमशिखर, रुद्रप्रयाग", focus: "50% 40%" },
  { file: "pithoragarh", en: "Pithoragarh valley", hi: "पिथौरागढ़ घाटी", focus: "50% 55%" },
  { file: "chaubatia", en: "Chaubatia, Ranikhet", hi: "चौबटिया, रानीखेत", focus: "50% 60%" },
  { file: "pindari", en: "Pindari Glacier, Bageshwar", hi: "पिंडारी ग्लेशियर, बागेश्वर", focus: "50% 50%" },
];

const INTERVAL = 6000;
const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Background photo carousel for the home page hero.
 * The photographs drift and change on their own, pause while the pointer or keyboard focus is on the hero,
 * never auto-play when the person prefers reduced motion, and carry no information that is not in the caption.
 */
export function HeroCarousel() {
  const { t, pick } = useI18n();
  const [index, setIndex] = useState(0);
  const playing = !prefersReducedMotion();
  const [hovered, setHovered] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!playing || hovered) return;
    const id = window.setTimeout(() => setIndex((i) => (i + 1) % heroSlides.length), INTERVAL);
    return () => window.clearTimeout(id);
  }, [index, playing, hovered]);

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
        {heroSlides.map((s, i) => {
          const gap = Math.min((i - index + heroSlides.length) % heroSlides.length, (index - i + heroSlides.length) % heroSlides.length);
          return gap > 1 ? null : (
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
          );
        })}
      </div>
      <div className="carousel__shade" aria-hidden="true" />
      <div className="container carousel__bar">
        <p className="carousel__caption" aria-live={playing && !hovered ? "off" : "polite"}>
          <span className="visually-hidden">{t(`Photo ${index + 1} of ${heroSlides.length}:`, `फ़ोटो ${index + 1} / ${heroSlides.length}:`)} </span>
          {pick(slide)}
        </p>
      </div>
    </div>
  );
}
