import { useI18n } from "../context/I18nContext";
import { eventLabels } from "../i18n/strings";
import { formatDateTime } from "../lib/format";
import type { TimelineEntry } from "../lib/types";

export function Timeline({ entries }: { entries: TimelineEntry[] }) {
  const { t, pick, lang } = useI18n();
  const ordered = [...entries].sort((a, b) => b.at.localeCompare(a.at));
  return (
    <ol className="timeline" aria-label={t("History, newest first", "इतिहास, नवीनतम पहले")}>
      {ordered.map((e, i) => (
        <li key={`${e.at}-${i}`} className={`timeline__item timeline__item--${e.event}`}>
          <span className="timeline__when">
            <time dateTime={e.at}>{formatDateTime(e.at, lang)}</time>
          </span>
          <span className="timeline__what">
            <span>
              <strong>{pick(eventLabels[e.event])}</strong>
              {e.level && <span className="muted"> · L{e.level}</span>}
            </span>
            {e.by && <span className="timeline__by">{e.by}</span>}
            {e.note && <span className="timeline__note">{e.note}</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}
