import { useI18n } from "../context/I18nContext";

export function Loading({ label }: { label?: string }) {
  const { t } = useI18n();
  return (
    <p className="loading" role="status">
      <span className="loading__dot" aria-hidden="true" />
      {label ?? t("Loading…", "लोड हो रहा है…")}
    </p>
  );
}

export function LoadError({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  const { t } = useI18n();
  return (
    <div className="notice notice--danger" role="alert">
      <span className="notice__title">{t("This could not be loaded", "यह लोड नहीं हो सका")}</span>
      <p>{error.message}</p>
      {onRetry && (
        <button type="button" className="btn btn--secondary btn--small" onClick={onRetry}>
          {t("Try again", "फिर से प्रयास करें")}
        </button>
      )}
    </div>
  );
}
