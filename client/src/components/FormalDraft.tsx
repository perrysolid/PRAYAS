import { useEffect, useState } from "react";
import { Check, Sparkles, Undo2 } from "lucide-react";
import { useI18n } from "../context/I18nContext";
import { aiStatus } from "../lib/ai";
import { api } from "../lib/api";

/** Officers read complaints in Hindi or English, so drafts are written in one of those. */
const devanagari = new Set(["hi", "gbm", "kfy", "jns", "ne", "mr"]);

/**
 * "Write it formally": turns the citizen's own words into a clear, respectful complaint an officer can act on.
 * The citizen sees both versions and chooses; nothing changes without their click.
 */
export function FormalDraft({ text, onUse }: { text: string; onUse: (draft: { subject: string; description: string }) => void }) {
  const { t, locale } = useI18n();
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ subject: string; description: string } | null>(null);
  const [note, setNote] = useState("");
  const [previous, setPrevious] = useState<string | null>(null);

  useEffect(() => {
    aiStatus().then((s) => setEnabled(s.enabled));
  }, []);

  if (!enabled) return null;

  const run = async () => {
    setNote("");
    setResult(null);
    if (text.trim().length < 10) return setNote(t("Write a little more first, then we can help word it formally.", "पहले थोड़ा और लिखें, फिर हम इसे औपचारिक भाषा में लिखने में मदद करेंगे।"));
    setBusy(true);
    try {
      const out = await api.draft(text, devanagari.has(locale) ? "hi" : "en");
      if (!out.isGrievance) setNote(t("This doesn't read like a complaint about a government service, so we left it as it is.", "यह किसी सरकारी सेवा से जुड़ी शिकायत नहीं लगती, इसलिए हमने इसे जैसा है वैसा छोड़ा है।"));
      else setResult(out);
    } catch {
      setNote(t("Formal wording is not available right now. Your own words are fine; officers will read them as written.", "औपचारिक भाषा अभी उपलब्ध नहीं है। आपके अपने शब्द ठीक हैं; अधिकारी उन्हें वैसे ही पढ़ेंगे।"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="formal">
      <div className="formal__bar">
        <button type="button" className="btn btn--secondary btn--small formal__btn" onClick={run} disabled={busy}>
          <Sparkles size={16} aria-hidden="true" />
          {busy ? t("Writing it formally…", "औपचारिक भाषा में लिखा जा रहा है…") : t("Write it formally for me", "मेरे लिए औपचारिक भाषा में लिखें")}
        </button>
        {previous !== null && (
          <button type="button" className="btn btn--quiet btn--small" onClick={() => { onUse({ subject: "", description: previous }); setPrevious(null); }}>
            <Undo2 size={16} aria-hidden="true" /> {t("Back to my words", "मेरे शब्द वापस लाएँ")}
          </button>
        )}
      </div>
      <div aria-live="polite">
        {note && <p className="formal__note">{note}</p>}
        {result && (
          <div className="formal__card">
            <p className="formal__label">{t("Suggested formal version", "सुझाया गया औपचारिक रूप")}</p>
            <div data-no-translate>
              <p className="formal__subject">{result.subject}</p>
              <p className="formal__text">{result.description}</p>
            </div>
            <p className="formal__hint">{t("Check that every detail is right. Nothing has been added that you didn't write.", "जाँच लें कि हर जानकारी सही है। आपने जो नहीं लिखा, वह जोड़ा नहीं गया है।")}</p>
            <div className="btn-row">
              <button type="button" className="btn btn--small" onClick={() => { setPrevious(text); onUse(result); setResult(null); }}>
                <Check size={16} aria-hidden="true" /> {t("Use this version", "यह रूप उपयोग करें")}
              </button>
              <button type="button" className="btn btn--secondary btn--small" onClick={() => setResult(null)}>{t("Keep my words", "मेरे शब्द रखें")}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
