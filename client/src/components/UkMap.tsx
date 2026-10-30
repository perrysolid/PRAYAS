import { useMemo } from "react";
import { useI18n } from "../context/I18nContext";
import { districtShapes, MAP_HEIGHT, MAP_WIDTH } from "../data/ukMap";
import type { Stats } from "../lib/types";

/** Hand-tuned label positions where a district's centroid sits too close to a neighbour's label. */
const nudge: Record<string, [number, number]> = { dehradun: [-14, 22], tehri: [6, 10], usnagar: [18, -2], rudraprayag: [2, -6] };

export type MapMetric = "pending" | "resolvedPct" | "total";
type Row = Stats["byDistrict"][number];

/** Five-step scale; for "resolved %" a higher share is better, so the scale is reversed to keep dark = needs attention. */
function bucket(value: number, max: number, invert: boolean) {
  if (max <= 0) return 0;
  const r = Math.min(1, value / max);
  const b = Math.min(4, Math.floor(r * 5));
  return invert ? 4 - b : b;
}

/**
 * Choropleth of Uttarakhand's 13 districts. Each district is a keyboard-focusable button;
 * the same figures are always available in the table beside it.
 */
export function UkMap({ rows, metric, selected, onSelect, compact = false }: { rows: Row[]; metric: MapMetric; selected?: string; onSelect: (id: string) => void; compact?: boolean }) {
  const { t, pick } = useI18n();
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

  return (
    <div className={`ukmap${compact ? " ukmap--compact" : ""}`}>
      <svg viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} role="group" aria-label={t("Map of Uttarakhand districts", "उत्तराखंड के जनपदों का मानचित्र")}>
        {districtShapes.map((s) => {
          const r = byId.get(s.id);
          if (!r) return null;
          const b = bucket(value(r), max, metric === "resolvedPct");
          const isSel = selected === s.id;
          const [dx, dy] = nudge[s.id] ?? [0, 0];
          const x = s.cx + dx;
          const y = s.cy + dy;
          return (
            <g
              key={s.id}
              className={`ukmap__district${isSel ? " is-selected" : ""}`}
              role="button"
              tabIndex={0}
              aria-pressed={isSel}
              aria-label={label(r)}
              onClick={() => onSelect(s.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(s.id);
                }
              }}
            >
              <title>{label(r)}</title>
              <path d={s.d} style={{ fill: `var(--map-${b})` }} />
              {!compact && (
                <text x={x} y={y} className={`ukmap__label${b >= 3 ? " is-dark" : ""}`} textAnchor="middle" aria-hidden="true">
                  <tspan x={x} dy="-0.2em">{pick(r.name).replace(" Garhwal", "").replace("ऊधम सिंह नगर", "ऊ.सि. नगर").replace("Udham Singh Nagar", "U.S. Nagar")}</tspan>
                  <tspan x={x} dy="1.15em" className="ukmap__value">{value(r)}{unit}</tspan>
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="ukmap__legend" aria-hidden="true">
        <span>{metric === "resolvedPct" ? t("More resolved", "अधिक निस्तारित") : t("Fewer", "कम")}</span>
        {[0, 1, 2, 3, 4].map((b) => <i key={b} style={{ background: `var(--map-${b})` }} />)}
        <span>{metric === "resolvedPct" ? t("Fewer resolved", "कम निस्तारित") : t("More", "अधिक")}</span>
      </div>
    </div>
  );
}
