import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../context/I18nContext";
import { ErrorSummary, Field, Input, describedBy } from "./Form";

const ID_RE = /^CMH-\d{4}-\d{6}$/;

/** Normalises what people actually type: "cmh 2026 4512", "CMH-2026-004512", "2026/4512". */
export function normaliseId(raw: string) {
  const digits = raw.toUpperCase().replace(/^CMH/, "").match(/\d+/g);
  if (!digits || digits.length < 2) return raw.trim().toUpperCase();
  return `CMH-${digits[0]}-${digits[1].padStart(6, "0")}`;
}

export function TrackForm({ compact, initial = { id: "", mobile: "" } }: { compact?: boolean; initial?: { id: string; mobile: string } }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [id, setId] = useState(initial.id);
  const [mobile, setMobile] = useState(initial.mobile);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const prefix = compact ? "home-" : "";

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    const cleanId = normaliseId(id);
    const cleanMobile = mobile.replace(/\D/g, "").slice(-10);
    if (!ID_RE.test(cleanId)) next[`${prefix}ref`] = t("Enter the complaint number from your SMS, like CMH-2026-004512", "SMS में मिला शिकायत नंबर दर्ज करें, जैसे CMH-2026-004512");
    if (!/^[6-9]\d{9}$/.test(cleanMobile)) next[`${prefix}track-mobile`] = t("Enter the 10-digit mobile number used to register", "पंजीकरण में प्रयुक्त 10 अंकों का मोबाइल नंबर दर्ज करें");
    setErrors(next);
    if (Object.keys(next).length) return;
    navigate(`/track?${new URLSearchParams({ id: cleanId, mobile: cleanMobile })}`);
  };

  return (
    <form onSubmit={submit} noValidate>
      {!compact && <ErrorSummary errors={errors} />}
      <Field id={`${prefix}ref`} label={t("Complaint number", "शिकायत संख्या")} hint={t("For example CMH-2026-004512", "उदाहरण: CMH-2026-004512")} error={errors[`${prefix}ref`]}>
        <Input id={`${prefix}ref`} value={id} onChange={(e) => setId(e.target.value)} autoComplete="off" spellCheck={false} invalid={Boolean(errors[`${prefix}ref`])} aria-describedby={describedBy(`${prefix}ref`, true, errors[`${prefix}ref`])} />
      </Field>
      <Field id={`${prefix}track-mobile`} label={t("Registered mobile number", "पंजीकृत मोबाइल नंबर")} error={errors[`${prefix}track-mobile`]}>
        <Input id={`${prefix}track-mobile`} className="input--short" type="tel" inputMode="numeric" autoComplete="tel-national" value={mobile} onChange={(e) => setMobile(e.target.value)} invalid={Boolean(errors[`${prefix}track-mobile`])} aria-describedby={describedBy(`${prefix}track-mobile`, false, errors[`${prefix}track-mobile`])} />
      </Field>
      <button className={compact ? "btn btn--secondary" : "btn"} type="submit">
        {t("Check status", "स्थिति देखें")}
      </button>
    </form>
  );
}
