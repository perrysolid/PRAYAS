import { forwardRef, useEffect, useRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { useI18n } from "../context/I18nContext";

type FieldProps = { id: string; label: ReactNode; hint?: ReactNode; error?: string; large?: boolean; children: ReactNode };

/** Label, hint and error wired to the control with aria-describedby, GOV.UK style. */
export function Field({ id, label, hint, error, large, children }: FieldProps) {
  return (
    <div className={`field${error ? " field--error" : ""}`}>
      <label className={`field__label${large ? " field__label--lg" : ""}`} htmlFor={id}>
        {label}
      </label>
      {hint && (
        <span className="field__hint" id={`${id}-hint`}>
          {hint}
        </span>
      )}
      {error && (
        <span className="field__error" id={`${id}-error`}>
          <span className="visually-hidden">Error: </span>
          {error}
        </span>
      )}
      {children}
    </div>
  );
}

export const describedBy = (id: string, hint?: unknown, error?: unknown) =>
  [hint ? `${id}-hint` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined;

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(function Input({ className = "", invalid, ...rest }, ref) {
  return <input ref={ref} className={`input ${className}`} aria-invalid={invalid || undefined} {...rest} />;
});

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(function TextArea({ className = "", invalid, ...rest }, ref) {
  return <textarea ref={ref} className={`textarea ${className}`} aria-invalid={invalid || undefined} {...rest} />;
});

export function Select({ invalid, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select className="select" aria-invalid={invalid || undefined} {...rest}>
      {children}
    </select>
  );
}

/** Lists every error at the top and moves focus there, so screen reader users hear what to fix. */
export function ErrorSummary({ errors }: { errors: Record<string, string> }) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const entries = Object.entries(errors);
  const signature = entries.map(([k, v]) => k + v).join("|");

  useEffect(() => {
    if (entries.length) ref.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  if (!entries.length) return null;
  return (
    <div className="error-summary" role="alert" tabIndex={-1} ref={ref} aria-labelledby="error-summary-title">
      <h2 id="error-summary-title">{t("There is a problem", "कृपया इन्हें ठीक करें")}</h2>
      <ul>
        {entries.map(([field, message]) => (
          <li key={field}>
            {field === "_" ? (
              message
            ) : (
              <a
                href={`#${field}`}
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(field)?.focus();
                }}
              >
                {message}
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
