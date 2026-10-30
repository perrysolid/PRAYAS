import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../context/I18nContext";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

type Crumb = { to: string; en: string; hi: string };

/** Breadcrumbs, H1 and the document title for a page, kept in one place so they never disagree. */
export function PageHead({ en, hi, lead, crumbs = [], children }: { en: string; hi: string; lead?: ReactNode; crumbs?: Crumb[]; children?: ReactNode }) {
  const { t } = useI18n();
  useDocumentTitle(en, hi);
  return (
    <div className="page-banner">
    <div className="container">
      <nav className="breadcrumbs" aria-label={t("Breadcrumb", "ब्रेडक्रम्ब")}>
        <ol>
          <li>
            <Link to="/">{t("Home", "मुखपृष्ठ")}</Link>
          </li>
          {crumbs.map((c) => (
            <li key={c.to}>
              <Link to={c.to}>{t(c.en, c.hi)}</Link>
            </li>
          ))}
        </ol>
      </nav>
      <div className="page-head">
        <h1>{t(en, hi)}</h1>
        {lead && <p className="lead">{lead}</p>}
        {children}
      </div>
    </div>
    </div>
  );
}
