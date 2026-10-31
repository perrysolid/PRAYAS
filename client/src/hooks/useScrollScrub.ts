import { useEffect } from "react";

export type Rule = { selector: string; from: (i: number) => { x?: number; y?: number; scale?: number; fade?: boolean } };

/**
 * Scroll-linked entrances that work in every browser: as an element climbs into the viewport it glides from an
 * offset position to its place, and glides back when scrolled away. Text stays still; the boxes around it move.
 */
export function useScrollScrub(rules: Rule[], ready: unknown) {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const items = rules.flatMap((r) => Array.from(document.querySelectorAll<HTMLElement>(r.selector)).map((el, i) => ({ el, ...r.from(i), y0: 0 })));
    let raf = 0;
    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      for (const it of items) {
        const top = it.el.getBoundingClientRect().top - it.y0;
        const p = Math.min(1, Math.max(0, (vh * 0.98 - top) / (vh * 0.5)));
        const e = 1 - Math.pow(1 - p, 3);
        const x = (it.x ?? 0) * (1 - e);
        const y = (it.y ?? 0) * (1 - e);
        it.y0 = y;
        it.el.style.translate = e >= 1 ? "" : `${x.toFixed(1)}px ${y.toFixed(1)}px`;
        it.el.style.scale = it.scale && e < 1 ? String(1 + (it.scale - 1) * (1 - e)) : "";
        if (it.fade !== false) it.el.style.opacity = e >= 1 ? "" : String(Math.min(1, e * 1.4));
      }
      const scroll = window.scrollY;
      const slides = document.querySelector<HTMLElement>(".carousel__slides");
      const panels = document.querySelector<HTMLElement>(".hero__panels");
      if (slides) slides.style.translate = `0 ${Math.min(scroll, 900) * 0.18}px`;
      if (panels) panels.style.translate = `0 ${-Math.min(scroll, 900) * 0.08}px`;
    };
    const queue = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    return () => {
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
      cancelAnimationFrame(raf);
      items.forEach((it) => { it.el.style.translate = ""; it.el.style.scale = ""; it.el.style.opacity = ""; });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);
}
