import { useState, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";
import { useCountdown } from "../hooks/useCountdown";
import { api, ApiError } from "../lib/api";
import { ErrorSummary, Field, Input, describedBy } from "./Form";

/** Mobile + OTP sign-in. No password or CAPTCHA to remember; one screen, two short steps. */
export function OtpSignIn({ onDone, initialMobile = "" }: { onDone?: () => void; initialMobile?: string }) {
  const { t } = useI18n();
  const { setSession } = useAuth();
  const [mobile, setMobile] = useState(initialMobile);
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"mobile" | "otp">("mobile");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [devOtp, setDevOtp] = useState<string>();
  const { remaining, start } = useCountdown();

  const send = async (e?: FormEvent) => {
    e?.preventDefault();
    const clean = mobile.replace(/\D/g, "").slice(-10);
    if (!/^[6-9]\d{9}$/.test(clean)) {
      setErrors({ mobile: t("Enter a 10-digit mobile number, like 98765 43210", "10 अंकों का मोबाइल नंबर दर्ज करें, जैसे 98765 43210") });
      return;
    }
    setBusy(true);
    setErrors({});
    try {
      const res = await api.sendOtp(clean);
      setMobile(clean);
      setDevOtp(res.devOtp);
      start(res.resendInSeconds);
      setStep("otp");
    } catch (err) {
      setErrors({ mobile: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp)) {
      setErrors({ otp: t("Enter the 6-digit OTP sent by SMS", "SMS से भेजा गया 6 अंकों का OTP दर्ज करें") });
      return;
    }
    setBusy(true);
    setErrors({});
    try {
      const res = await api.verifyOtp(mobile, otp);
      setSession(res.session);
      onDone?.();
    } catch (err) {
      setErrors({ otp: err instanceof ApiError && err.fields.otp ? err.fields.otp : (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  if (step === "mobile") {
    return (
      <form onSubmit={send} noValidate>
        <ErrorSummary errors={errors} />
        <Field id="mobile" label={t("Mobile number", "मोबाइल नंबर")} hint={t("We will send a one-time password (OTP) by SMS.", "हम SMS से एक बार उपयोग होने वाला पासवर्ड (OTP) भेजेंगे।")} error={errors.mobile}>
          <Input
            id="mobile"
            className="input--short"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            invalid={Boolean(errors.mobile)}
            aria-describedby={describedBy("mobile", true, errors.mobile)}
          />
        </Field>
        <button className="btn" type="submit" disabled={busy}>
          {busy ? t("Sending…", "भेजा जा रहा है…") : t("Send OTP", "OTP भेजें")}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={verify} noValidate>
      <ErrorSummary errors={errors} />
      <p>
        {t(`We sent a 6-digit OTP to ******${mobile.slice(-4)}.`, `हमने ******${mobile.slice(-4)} पर 6 अंकों का OTP भेजा है।`)}{" "}
        <button type="button" className="btn btn--quiet" onClick={() => { setStep("mobile"); setOtp(""); setErrors({}); }}>
          {t("Change number", "नंबर बदलें")}
        </button>
      </p>
      {devOtp && (
        <p className="notice notice--warning small">
          {t("Prototype only: no SMS is sent. Your OTP is", "केवल प्रोटोटाइप: SMS नहीं भेजा जाता। आपका OTP है")} <strong>{devOtp}</strong>
        </p>
      )}
      <Field id="otp" label={t("Enter OTP", "OTP दर्ज करें")} error={errors.otp}>
        <Input
          id="otp"
          className="input--otp"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
          invalid={Boolean(errors.otp)}
          aria-describedby={describedBy("otp", false, errors.otp)}
          autoFocus
        />
      </Field>
      <div className="btn-row">
        <button className="btn" type="submit" disabled={busy}>
          {busy ? t("Checking…", "जाँच हो रही है…") : t("Continue", "आगे बढ़ें")}
        </button>
        <button type="button" className="btn btn--quiet" disabled={remaining > 0 || busy} onClick={() => send()}>
          {remaining > 0 ? t(`Resend OTP in ${remaining}s`, `${remaining} सेकंड में OTP दोबारा भेजें`) : t("Resend OTP", "OTP दोबारा भेजें")}
        </button>
      </div>
    </form>
  );
}
