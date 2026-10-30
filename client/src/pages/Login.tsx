import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ErrorSummary, Field, Input, describedBy } from "../components/Form";
import { OtpSignIn } from "../components/OtpSignIn";
import { PageHead } from "../components/PageHead";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";
import { api } from "../lib/api";

function OfficerForm() {
  const { t } = useI18n();
  const { setSession } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!username.trim()) next.username = t("Enter your username", "उपयोगकर्ता नाम दर्ज करें");
    if (!password) next.password = t("Enter your password", "पासवर्ड दर्ज करें");
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      const res = await api.officerLogin(username.trim(), password);
      setSession(res.session);
      navigate("/officer");
    } catch (err) {
      setErrors({ username: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <ErrorSummary errors={errors} />
      <Field id="username" label={t("Username", "उपयोगकर्ता नाम")} error={errors.username}>
        <Input id="username" className="input--short" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} invalid={Boolean(errors.username)} aria-describedby={describedBy("username", false, errors.username)} />
      </Field>
      <Field id="password" label={t("Password", "पासवर्ड")} error={errors.password}>
        <Input id="password" className="input--short" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} invalid={Boolean(errors.password)} aria-describedby={describedBy("password", false, errors.password)} />
      </Field>
      <button className="btn" type="submit" disabled={busy}>{t("Sign in", "साइन इन")}</button>
      <p className="small muted" style={{ marginTop: "var(--s4)" }}>
        {t("Demo officers: je.jal.khirsu, sdo.upcl.srinagar or ee.pwd.pauri, password Demo@1905. In production officers sign in through Jan Parichay.", "डेमो अधिकारी: je.jal.khirsu, sdo.upcl.srinagar या ee.pwd.pauri, पासवर्ड Demo@1905। वास्तविक प्रणाली में अधिकारी जन परिचय से साइन इन करते हैं।")}
      </p>
    </form>
  );
}

export function Login() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [who, setWho] = useState<"citizen" | "officer">("citizen");
  return (
    <>
      <PageHead en="Sign in" hi="साइन इन" />
      <div className="container grid-2-1">
        <div>
          <div className="segmented" role="tablist" aria-label={t("Who is signing in", "कौन साइन इन कर रहा है")}>
            <button type="button" role="tab" aria-selected={who === "citizen"} onClick={() => setWho("citizen")}>{t("Citizen", "नागरिक")}</button>
            <button type="button" role="tab" aria-selected={who === "officer"} onClick={() => setWho("officer")}>{t("Officer", "अधिकारी")}</button>
          </div>
          <div role="tabpanel">
            {who === "citizen" ? <OtpSignIn onDone={() => navigate("/my-complaints")} /> : <OfficerForm />}
          </div>
        </div>
        <aside className="aside-card aside-card--plain">
          <h3>{t("No account needed", "खाते की आवश्यकता नहीं")}</h3>
          <p>{t("Citizens only need a mobile number. There is no password or CAPTCHA to remember.", "नागरिकों को केवल मोबाइल नंबर चाहिए। कोई पासवर्ड या कैप्चा याद रखने की ज़रूरत नहीं।")}</p>
          <p><Link to="/track">{t("Check a status without signing in", "बिना साइन इन स्थिति देखें")}</Link></p>
        </aside>
      </div>
    </>
  );
}
