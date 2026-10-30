import { useEffect, useState } from "react";
import { useI18n } from "../context/I18nContext";
import { formatNumber } from "../lib/format";

const reduced = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Counts from 0 to `value` once `start` is true. Screen readers get the final figure straight away,
 * so the animation is decoration only.
 */
export function CountUp({ value, start, decimals = 0, suffix = "" }: { value: number; start: boolean; decimals?: number; suffix?: string }) {
  const { lang } = useI18n();
  const [shown, setShown] = useState(() => (reduced() ? value : 0));

  useEffect(() => {
    if (!start || reduced()) return setShown(value);
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / 1400);
      setShown(value * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [start, value]);

  const text = decimals ? shown.toFixed(decimals) : formatNumber(Math.round(shown), lang);
  const final = decimals ? value.toFixed(decimals) : formatNumber(value, lang);
  return (
    <>
      <span aria-hidden="true">{text}{suffix}</span>
      <span className="visually-hidden">{final}{suffix}</span>
    </>
  );
}
