import { useEffect, useId, useRef, useState, type PointerEvent } from "react";
import { useInView } from "../hooks/useInView";
import { useI18n } from "../context/I18nContext";
import { formatDate } from "../lib/format";
import type { Photo } from "../lib/types";

/**
 * Proof of resolution: the citizen's photo of the problem against the officer's photo of the fix.
 * Drag (or use arrow keys on) the slider to compare.
 */
export function BeforeAfter({ before, after }: { before?: Photo; after?: Photo }) {
  const { t, lang } = useI18n();
  const [pos, setPos] = useState(50);
  const id = useId();
  const [ref, inView] = useInView<HTMLDivElement>(0.5);
  const touched = useRef(false);
  const played = useRef(false);
  const dragging = useRef(false);

  // The first time the photos come into view, the divider sweeps across once to show what changed.
  useEffect(() => {
    if (!inView || played.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const keys = [50, 8, 92, 50];
    const leg = 900;
    let start = 0;
    let raf = 0;
    const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    const step = (now: number) => {
      if (touched.current) return;
      start ||= now;
      const t = (now - start) / leg;
      const i = Math.min(keys.length - 2, Math.floor(t));
      const f = Math.min(1, t - i);
      setPos(keys[i] + (keys[i + 1] - keys[i]) * ease(f));
      if (t < keys.length - 1) raf = requestAnimationFrame(step);
    };
    const delay = window.setTimeout(() => {
      played.current = true;
      raf = requestAnimationFrame(step);
    }, 300);
    return () => {
      window.clearTimeout(delay);
      cancelAnimationFrame(raf);
    };
  }, [inView]);

  const fromPointer = (e: PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    setPos(Math.max(0, Math.min(100, ((e.clientX - box.left) / box.width) * 100)));
  };

  if (!after) return null;
  if (!before) {
    return (
      <figure className="proof proof--single">
        <img src={after.dataUrl} alt={t("Officer's photo after the action was taken", "कार्यवाही के बाद अधिकारी की फ़ोटो")} />
        <figcaption>{t("Photo of the action taken", "की गई कार्यवाही की फ़ोटो")}{after.at ? `, ${formatDate(after.at, lang)}` : ""}</figcaption>
      </figure>
    );
  }

  return (
    <figure className="proof">
      <div
        ref={ref}
        className="proof__frame"
        style={{ ["--pos" as string]: `${pos}%` }}
        onPointerDown={(e) => {
          touched.current = true;
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          fromPointer(e);
        }}
        onPointerMove={(e) => dragging.current && fromPointer(e)}
        onPointerUp={() => (dragging.current = false)}
        onPointerCancel={() => (dragging.current = false)}
      >
        <img className="proof__img" src={after.dataUrl} alt={t("After: officer's photo of the fix", "बाद में: समाधान की अधिकारी द्वारा फ़ोटो")} />
        <div className="proof__before">
          <img className="proof__img" src={before.dataUrl} alt={t("Before: your photo of the problem", "पहले: समस्या की आपकी फ़ोटो")} />
        </div>
        <span className="proof__label proof__label--before" aria-hidden="true">{t("Before", "पहले")}</span>
        <span className="proof__label proof__label--after" aria-hidden="true">{t("After", "बाद में")}</span>
        <span className="proof__handle" aria-hidden="true" />
      </div>
      <label htmlFor={id} className="visually-hidden">{t("Compare before and after", "पहले और बाद की तुलना करें")}</label>
      <input id={id} className="proof__range" type="range" min={0} max={100} value={pos} onChange={(e) => { touched.current = true; setPos(Number(e.target.value)); }} />
      <figcaption className="small muted">
        {t("Your photo", "आपकी फ़ोटो")}{before.at ? ` (${formatDate(before.at, lang)})` : ""} · {t("Officer's photo", "अधिकारी की फ़ोटो")}{after.at ? ` (${formatDate(after.at, lang)})` : ""}
        {after.lat !== undefined && ` · ${t("taken at", "स्थान")} ${after.lat.toFixed(3)}, ${after.lon!.toFixed(3)}`}
      </figcaption>
    </figure>
  );
}
