import { useI18n } from "../context/I18nContext";
import { statusLabels } from "../i18n/strings";
import type { GrievanceStatus } from "../lib/types";

export function StatusTag({ status }: { status: GrievanceStatus | "overdue" | "urgent" }) {
  const { pick } = useI18n();
  return <strong className={`tag tag--${status}`}>{pick(statusLabels[status])}</strong>;
}
