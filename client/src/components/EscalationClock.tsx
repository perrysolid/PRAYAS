import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { useI18n } from "../context/I18nContext";
import { useMeta } from "../context/MetaContext";
import type { Level } from "../lib/types";

type Props = { level: Level; levelDueAt: string; submittedAt: string; timeline: { at: string; level?: Level }[] };

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * A live countdown to the moment an unresolved complaint moves up a level by itself,
 * with a ring showing how much of this level's time has been used.
 */
export function EscalationClock({ level, levelDueAt, submittedAt, timeline }: Props) {
  const { t, pick } = useI18n();
  const { meta } = useMeta();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  if (!meta) return null;

  const due = new Date(levelDueAt).getTime();
  const startedAt = timeline.find((e) => e.level === level)?.at ?? submittedAt;
  const start = Math.min(new Date(startedAt).getTime(), due - 1);
  const used = Math.min(1, Math.max(0, (now - start) / (due - start)));
  const left = Math.max(0, due - now);
  const parts = [
    { v: Math.floor(left / 86_400_000), en: "days", hi: "दिन" },
    { v: Math.floor(left / 3_600_000) % 24, en: "hours", hi: "घंटे" },
    { v: Math.floor(left / 60_000) % 60, en: "min", hi: "मिनट" },
    { v: Math.floor(left / 1000) % 60, en: "sec", hi: "सेकंड" },
  ];
  const next = level < 4 ? meta.levels[(level + 1) as Level] : undefined;
  const R = 52;
  const C = 2 * Math.PI * R;
  const tone = left === 0 ? "over" : used > 0.8 ? "late" : "ok";

  return (
    <section className={`esc esc--${tone}`} aria-labelledby="esc-title">
      <svg className="esc__ring" viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r={R} className="esc__track" />
        <circle cx="60" cy="60" r={R} className="esc__used" strokeDasharray={C} strokeDashoffset={C * (1 - used)} />
        <text x="60" y="56" textAnchor="middle" className="esc__level">L{level}</text>
        <text x="60" y="76" textAnchor="middle" className="esc__pct">{Math.round(used * 100)}%</text>
      </svg>
      <div className="esc__body">
        <h3 id="esc-title" className="esc__title">
          {left === 0
            ? t("Time limit passed: moving up a level", "समय सीमा समाप्त: उच्च स्तर पर भेजी जा रही है")
            : next
              ? t("Moves up automatically if not resolved in", "निस्तारण न होने पर स्वतः उच्च स्तर पर जाएगी")
              : t("Final level. Time left for action", "अंतिम स्तर। कार्यवाही हेतु शेष समय")}
        </h3>
        <div className="esc__clock" role="timer" aria-label={t(`${parts[0].v} days ${parts[1].v} hours left`, `${parts[0].v} दिन ${parts[1].v} घंटे शेष`)}>
          {parts.map((p) => (
            <span key={p.en} className="esc__unit">
              <b>{pad(p.v)}</b>
              <small>{t(p.en, p.hi)}</small>
            </span>
          ))}
        </div>
        {next && (
          <p className="esc__next">
            <ArrowUpRight size={16} aria-hidden="true" /> {t("Next:", "अगला:")} <strong>{pick(next.title)}</strong> (L{level + 1}), {t(`${next.days} days`, `${next.days} दिन`)}
          </p>
        )}
      </div>
    </section>
  );
}
