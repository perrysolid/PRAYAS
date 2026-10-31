import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../context/I18nContext";

/** Shown once per browser session. */
const SEEN_KEY = "cmh-intro-seen";

type Shape = { d: string; x: number; y: number };

/** The wide satellite sheet covers 30°E-130°E and 20°S-60°N; the sharper India crop sits on it from 55°E-105°E and 0°-42°N. */
const SHEET = { w: 9340, h: 8000 };
const DETAIL = { x: 2335, y: 1800, w: 4670, h: 4200 };

/** Map units: 1 degree of latitude = 100, 1 degree of longitude = 93.4, measured from 30°E and 60°N. */
const unit = (lon: number, lat: number): [number, number] => [(lon - 30) * 93.4, (60 - lat) * 100];

/** The tilted stage is 180% of the window wide and 230% tall, so its edge never shows. */
const STAGE = 1.8;
const STAGE_V = 2.3;

const FADE_IN = 400;
const STRAIGHTEN_AT = 750;
const STRAIGHTEN = 1200;
const ZOOM_AT = 1500;
const ZOOM = 2000;
const FADE_OUT = 600;
const LOAD_TIMEOUT = 7000;

const ease = (v: number) => (v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2);
const clamp = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Opening sequence: an aerial satellite view of the subcontinent, tilted; it levels out, then dives quickly into
 * the centre of Uttarakhand, and the site opens as we land. Plays once per session, can be skipped, and is not shown
 * when the visitor prefers reduced motion. Imagery: NASA Blue Marble (public domain); outline: Natural Earth.
 */
export function Intro() {
  const { t } = useI18n();
  const [show, setShow] = useState(() => {
    try {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
      return !sessionStorage.getItem(SEEN_KEY);
    } catch {
      return false;
    }
  });
  const [uk, setUk] = useState<Shape | null>(null);

  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const world = useRef<SVGGElement>(null);
  const clouds = useRef<SVGImageElement>(null);
  const outline = useRef<SVGGElement>(null);

  const finish = () => {
    try { sessionStorage.setItem(SEEN_KEY, "1"); } catch { /* the intro simply plays again next visit */ }
    setShow(false);
  };

  // Load the imagery and the outline before anything is shown; give up quietly if it takes too long.
  useEffect(() => {
    if (!show) return;
    let alive = true;
    const giveUp = window.setTimeout(() => alive && finish(), LOAD_TIMEOUT);
    const images = ["/img/india-satellite-wide.webp", "/img/india-satellite.webp", "/img/india-clouds.webp"].map((src) => { const i = new Image(); i.src = src; return i.decode(); });
    Promise.all([fetch("/data/uttarakhand.json").then((r) => r.json() as Promise<Shape>), ...images])
      .then(([shape]) => { if (alive) { window.clearTimeout(giveUp); setUk(shape as Shape); } })
      .catch(() => alive && finish());
    return () => { alive = false; window.clearTimeout(giveUp); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  const route = useMemo(() => ({ from: unit(80.5, 20.5), to: uk ? ([uk.x, uk.y] as [number, number]) : unit(79.25, 30.1) }), [uk]);

  useEffect(() => {
    if (!show || !uk) return;
    document.documentElement.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") finish(); };
    window.addEventListener("keydown", onKey);

    const [c0x, c0y] = route.from;
    const [c1x, c1y] = route.to;
    const start = performance.now();
    let raf = 0;

    const frame = (now: number) => {
      const W = window.innerWidth;
      const H = window.innerHeight;
      // The opening frames the whole subcontinent; the stage still has to stay inside the satellite sheet.
      const s0 = Math.max((STAGE * 1.02 * W) / SHEET.w, (STAGE_V * 1.02 * H) / SHEET.h);
      const s1 = W / 90; // ends about 90 map units (roughly 100 km) across: inside the state, at its centre
      const ms = now - start;

      const level = ease(clamp((ms - STRAIGHTEN_AT) / STRAIGHTEN));
      const zoomT = clamp((ms - ZOOM_AT) / ZOOM);
      const z = ease(zoomT);
      const pan = ease(clamp(zoomT / 0.8));
      const s = s0 * (1 + 0.04 * clamp(ms / STRAIGHTEN_AT)) * Math.exp(Math.log(s1 / (s0 * 1.04)) * z);
      const cx = c0x + (c1x - c0x) * pan;
      const cy = c0y + (c1y - c0y) * pan;

      const el = stage.current;
      if (el) {
        const tilt = 46 * (1 - level);
        const roll = -6 * (1 - level);
        const cover = 1 + 0.5 * (1 - level);
        el.style.transform = `perspective(${Math.round(H * 1.7)}px) rotateX(${tilt.toFixed(2)}deg) rotateZ(${roll.toFixed(2)}deg) scale(${cover.toFixed(3)})`;
      }
      world.current?.setAttribute("transform", `translate(${(STAGE * W) / 2} ${(STAGE_V * H) / 2}) scale(${s.toFixed(5)}) translate(${(-cx).toFixed(1)} ${(-cy).toFixed(1)})`);
      if (clouds.current) clouds.current.style.opacity = (0.8 * (1 - clamp(z / 0.5))).toFixed(3);
      if (outline.current) outline.current.style.opacity = (clamp((z - 0.3) / 0.25) * (1 - clamp((z - 0.8) / 0.15))).toFixed(3);

      const fadeStart = ZOOM_AT + ZOOM - 600;
      if (el) el.style.opacity = clamp(ms / FADE_IN).toFixed(3);
      if (root.current) root.current.style.opacity = (1 - clamp((ms - fadeStart) / FADE_OUT)).toFixed(3);
      if (ms >= fadeStart + FADE_OUT) finish();
      else raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, uk, route]);

  if (!show) return null;

  return (
    <div ref={root} className="intro" role="dialog" aria-modal="true" aria-label={t("Welcome to CM Helpline 1905", "सीएम हेल्पलाइन 1905 में आपका स्वागत है")}>
      {uk && (
        <div ref={stage} className="intro__stage" aria-hidden="true">
          <svg className="intro__map">
            <g ref={world}>
              <image href="/img/india-satellite-wide.webp" x={0} y={0} width={SHEET.w} height={SHEET.h} preserveAspectRatio="none" />
              <image href="/img/india-satellite.webp" x={DETAIL.x} y={DETAIL.y} width={DETAIL.w} height={DETAIL.h} preserveAspectRatio="none" />
              <image ref={clouds} href="/img/india-clouds.webp" x={0} y={0} width={SHEET.w} height={SHEET.h} preserveAspectRatio="none" />
              <g ref={outline} style={{ opacity: 0 }} strokeLinejoin="round">
                <path d={uk.d} fill="#ffb347" fillOpacity=".18" stroke="#ffb347" strokeOpacity=".35" strokeWidth="9" vectorEffect="non-scaling-stroke" />
                <path d={uk.d} fill="none" stroke="#ffd9a0" strokeWidth="2.2" vectorEffect="non-scaling-stroke" />
              </g>
            </g>
          </svg>
        </div>
      )}
      <button type="button" className="intro__skip" onClick={finish} autoFocus>{t("Skip", "छोड़ें")}</button>
    </div>
  );
}
