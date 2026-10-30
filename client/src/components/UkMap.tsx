import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { RotateCcw } from "lucide-react";
import { useI18n } from "../context/I18nContext";
import { districtShapes, MAP_HEIGHT, MAP_WIDTH } from "../data/ukMap";
import type { Stats } from "../lib/types";

/** Hand-tuned label positions where a district's centroid sits too close to a neighbour's label. */
const nudge: Record<string, [number, number]> = { dehradun: [-14, 22], tehri: [6, 10], usnagar: [18, -2], rudraprayag: [2, -6] };

/** Uttarakhand's two revenue divisions. */
const divisions = [
  { id: "garhwal", name: { en: "Garhwal", hi: "गढ़वाल" }, districts: ["uttarkashi", "chamoli", "rudraprayag", "tehri", "dehradun", "pauri", "haridwar"], shift: [-14, -8] },
  { id: "kumaon", name: { en: "Kumaon", hi: "कुमाऊँ" }, districts: ["pithoragarh", "bageshwar", "almora", "champawat", "nainital", "usnagar"], shift: [14, 8] },
] as const;

export type MapMetric = "pending" | "resolvedPct" | "total";
type Row = Stats["byDistrict"][number];

/**
 * The intro tells the state's structure in four beats: the outline draws, the state fills,
 * it splits into Garhwal and Kumaon, then into 13 districts that settle into the live map.
 */
type Phase = "idle" | "draw" | "state" | "divisions" | "districts" | "ready";
const timeline: [Phase, number][] = [["draw", 0], ["state", 1300], ["divisions", 2200], ["districts", 3300], ["ready", 4400]];

/** Five-step scale; for "resolved %" a higher share is better, so the scale is reversed to keep dark = needs attention. */
function bucket(value: number, max: number, invert: boolean) {
  if (max <= 0) return 0;
  const r = Math.min(1, value / max);
  const b = Math.min(4, Math.floor(r * 5));
  return invert ? 4 - b : b;
}

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Choropleth of Uttarakhand's 13 districts. Each district is a keyboard-focusable button;
 * the same figures are always available in the table beside it.
 */
export function UkMap({ rows, metric, selected, onSelect }: { rows: Row[]; metric: MapMetric; selected?: string; onSelect: (id: string) => void }) {
  const { t, pick } = useI18n();
  const wrapRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const [phase, setPhase] = useState<Phase>(() => (reducedMotion() ? "ready" : "idle"));
  const [tip, setTip] = useState<{ id: string; x: number; y: number } | null>(null);

  const byId = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);
  const value = (r?: Row) => (!r ? 0 : metric === "resolvedPct" ? r.resolvedPct ?? 0 : r[metric]);
  const max = metric === "resolvedPct" ? 100 : Math.max(1, ...rows.map((r) => value(r)));
  const unit = metric === "resolvedPct" ? "%" : "";
  const label = (r: Row) =>
    metric === "pending"
      ? t(`${r.name.en}: ${r.pending} pending`, `${r.name.hi}: ${r.pending} लंबित`)
      : metric === "total"
        ? t(`${r.name.en}: ${r.total} registered`, `${r.name.hi}: ${r.total} दर्ज`)
        : t(`${r.name.en}: ${r.resolvedPct ?? 0}% resolved`, `${r.name.hi}: ${r.resolvedPct ?? 0}% निस्तारित`);

  // Centre of each division, used to push its districts outward while they "divide".
  const centres = useMemo(() => {
    const out: Record<string, [number, number]> = {};
    for (const div of divisions) {
      const shapes = districtShapes.filter((s) => (div.districts as readonly string[]).includes(s.id));
      out[div.id] = [shapes.reduce((a, s) => a + s.cx, 0) / shapes.length, shapes.reduce((a, s) => a + s.cy, 0) / shapes.length];
    }
    return out;
  }, []);

  const play = () => {
    timers.current.forEach(window.clearTimeout);
    if (reducedMotion()) return setPhase("ready");
    setPhase("idle");
    timers.current = timeline.map(([p, at]) => window.setTimeout(() => setPhase(p), at + 60));
  };

  // Start the intro the first time the map scrolls into view.
  useEffect(() => {
    if (phase !== "idle" || !wrapRef.current) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        play();
      }
    }, { threshold: 0.35 });
    io.observe(wrapRef.current);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => () => timers.current.forEach(window.clearTimeout), []);

  const ready = phase === "ready";
  const caption =
    phase === "districts" || ready
      ? t("13 districts", "13 जनपद")
      : phase === "divisions"
        ? t("2 divisions: Garhwal and Kumaon", "2 मंडल: गढ़वाल और कुमाऊँ")
        : t("Uttarakhand", "उत्तराखंड");

  const moveTip = (e: MouseEvent, id: string) => {
    const box = wrapRef.current?.getBoundingClientRect();
    if (box) setTip({ id, x: e.clientX - box.left, y: e.clientY - box.top });
  };
  const focusTip = (id: string) => {
    const svg = wrapRef.current?.querySelector("svg")?.getBoundingClientRect();
    const box = wrapRef.current?.getBoundingClientRect();
    const s = districtShapes.find((d) => d.id === id);
    if (svg && box && s) setTip({ id, x: svg.left - box.left + (s.cx / MAP_WIDTH) * svg.width, y: svg.top - box.top + (s.cy / MAP_HEIGHT) * svg.height });
  };
  const tipRow = tip ? byId.get(tip.id) : undefined;

  return (
    <div ref={wrapRef} className={`ukmap ukmap--${phase}`} onMouseLeave={() => setTip(null)}>
      <div className="ukmap__caption" aria-hidden="true">
        <span key={caption} className="ukmap__caption-text">{caption}</span>
        {ready && (
          <button type="button" className="ukmap__replay" onClick={play} aria-label={t("Replay map animation", "मानचित्र एनिमेशन फिर चलाएँ")} tabIndex={-1}>
            <RotateCcw size={14} aria-hidden="true" /> {t("Replay", "फिर देखें")}
          </button>
        )}
      </div>
      <svg viewBox={`-20 -20 ${MAP_WIDTH + 40} ${MAP_HEIGHT + 50}`} role="group" aria-label={t("Map of Uttarakhand districts", "उत्तराखंड के जनपदों का मानचित्र")}>
        <defs>
          <filter id="ukmap-lift" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="8" stdDeviation="7" floodColor="#061630" floodOpacity=".35" />
          </filter>
        </defs>
        {/* Extruded base gives the map its raised, three-dimensional look. */}
        <g className="ukmap__base" aria-hidden="true">
          {districtShapes.map((s) => <path key={s.id} d={s.d} />)}
        </g>
        {divisions.map((div) => {
          const [ox, oy] = centres[div.id];
          return (
            <g key={div.id} className={`ukmap__division ukmap__division--${div.id}`} style={{ "--dx": `${div.shift[0]}px`, "--dy": `${div.shift[1]}px` } as CSSProperties}>
              {districtShapes
                .filter((s) => (div.districts as readonly string[]).includes(s.id))
                .map((s, i) => {
                  const r = byId.get(s.id);
                  if (!r) return null;
                  const b = bucket(value(r), max, metric === "resolvedPct");
                  const isSel = selected === s.id;
                  const [nx, ny] = nudge[s.id] ?? [0, 0];
                  const x = s.cx + nx;
                  const y = s.cy + ny;
                  const len = Math.hypot(s.cx - ox, s.cy - oy) || 1;
                  const push = { "--px": `${((s.cx - ox) / len) * 12}px`, "--py": `${((s.cy - oy) / len) * 12}px`, "--i": i } as CSSProperties;
                  return (
                    <g
                      key={s.id}
                      id={`ukd-${s.id}`}
                      className={`ukmap__district${isSel && ready ? " is-selected" : ""}`}
                      style={push}
                      role="button"
                      tabIndex={ready ? 0 : -1}
                      aria-pressed={isSel}
                      aria-label={label(r)}
                      onClick={() => onSelect(s.id)}
                      onMouseMove={(e) => ready && moveTip(e, s.id)}
                      onFocus={() => ready && focusTip(s.id)}
                      onBlur={() => setTip(null)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onSelect(s.id);
                        }
                      }}
                    >
                      <path d={s.d} pathLength={1} style={{ "--fill": `var(--map-${b})` } as CSSProperties} />
                      <text x={x} y={y} className={`ukmap__label${b >= 3 ? " is-dark" : ""}`} textAnchor="middle" aria-hidden="true">
                        <tspan x={x} dy="-0.2em">{pick(r.name).replace(" Garhwal", "").replace("ऊधम सिंह नगर", "ऊ.सि. नगर").replace("Udham Singh Nagar", "U.S. Nagar")}</tspan>
                        <tspan x={x} dy="1.15em" className="ukmap__value">{value(r)}{unit}</tspan>
                      </text>
                    </g>
                  );
                })}
              <text x={div.id === "garhwal" ? -6 : 606} y={div.id === "garhwal" ? 440 : 500} className="ukmap__division-name" textAnchor={div.id === "garhwal" ? "start" : "end"} aria-hidden="true">{pick(div.name)}</text>
            </g>
          );
        })}
        {/* Redraw the hovered or selected district on top so its raised edge is not hidden by neighbours. */}
        {ready && (tip?.id ?? selected) && <use href={`#ukd-${tip?.id ?? selected}`} className="ukmap__lifted" aria-hidden="true" />}
      </svg>
      {tip && tipRow && (
        <div className="ukmap__tip" style={{ left: tip.x, top: tip.y }} aria-hidden="true">
          <strong>{pick(tipRow.name)}</strong>
          <span><b>{tipRow.pending}</b> {t("pending", "लंबित")}</span>
          <span><b>{tipRow.resolvedPct ?? 0}%</b> {t("resolved", "निस्तारित")}</span>
          {tipRow.overdue > 0 && <span className="is-overdue"><b>{tipRow.overdue}</b> {t("past deadline", "समय सीमा पार")}</span>}
        </div>
      )}
      <div className="ukmap__legend" aria-hidden="true">
        <span>{metric === "resolvedPct" ? t("More resolved", "अधिक निस्तारित") : t("Fewer", "कम")}</span>
        {[0, 1, 2, 3, 4].map((b) => <i key={b} style={{ background: `var(--map-${b})` }} />)}
        <span>{metric === "resolvedPct" ? t("Fewer resolved", "कम निस्तारित") : t("More", "अधिक")}</span>
      </div>
    </div>
  );
}
