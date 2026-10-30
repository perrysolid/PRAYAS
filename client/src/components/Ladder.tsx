import { useI18n } from "../context/I18nContext";
import { useMeta } from "../context/MetaContext";
import { daysUntil, formatDate } from "../lib/format";
import type { GrievanceStatus, Level } from "../lib/types";

type Props = {
  /** Omit for the general explainer on the home page. */
  current?: { level: Level; levelDueAt: string; status: GrievanceStatus };
};

/**
 * The L1→L4 escalation path with each level's deadline.
 * The current portal never tells citizens who holds their complaint or until when.
 */
export function Ladder({ current }: Props) {
  const { t, pick, lang } = useI18n();
  const { meta } = useMeta();
  if (!meta) return null;
  const done = current && (current.status === "resolved" || current.status === "closed");

  return (
    <ol className="ladder" aria-label={t("Escalation levels", "शिकायत के स्तर")}>
      {([1, 2, 3, 4] as Level[]).map((level) => {
        const info = meta.levels[level];
        const state = !current ? "idle" : level < current.level ? "past" : level === current.level ? (done ? "done" : "current") : "future";
        const remaining = state === "current" ? daysUntil(current!.levelDueAt) : 0;
        return (
          <li key={level} className={`ladder__step ladder__step--${state}`} aria-current={state === "current" ? "step" : undefined}>
            <span className="ladder__level">L{level}</span>
            <span className="ladder__body">
              <strong>{pick(info.title)}</strong>
              <span className="ladder__days">
                {level === 1
                  ? t(`Has ${info.days} days to resolve`, `निस्तारण हेतु ${info.days} दिन`)
                  : t(`Gets it if unresolved; ${info.days} more days`, `अनिस्तारित रहने पर; ${info.days} दिन और`)}
              </span>
              {state === "current" && (
                <span className={`ladder__due${remaining < 0 ? " is-overdue" : ""}`}>
                  {remaining >= 0
                    ? t(`With this officer now. Due by ${formatDate(current!.levelDueAt, lang)} (${remaining} days left)`, `अभी इसी अधिकारी के पास। ${formatDate(current!.levelDueAt, lang)} तक (${remaining} दिन शेष)`)
                    : t(`Overdue. Moves up automatically.`, `समय सीमा पार। स्वतः ऊपर भेजी जाएगी।`)}
                </span>
              )}
              {state === "past" && <span className="ladder__days">{t("Not resolved here in time", "यहाँ समय पर निस्तारित नहीं हुई")}</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
