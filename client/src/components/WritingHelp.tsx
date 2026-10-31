import { useEffect, useRef, useState } from "react";
import { Check, Plus, Sparkles } from "lucide-react";
import { useI18n } from "../context/I18nContext";
import { aiStatus } from "../lib/ai";
import { api, type Assist } from "../lib/api";

const MIN_CHARS = 12;
const PAUSE_MS = 1200;

/**
 * Live writing help under a complaint box. Once the citizen pauses (typing or speaking), the language model
 * offers a clearer version, tap-to-add answers to the details still missing, and useful words.
 * Nothing changes the text until the citizen taps; the box works exactly as before without it.
 */
export function WritingHelp({ text, onReplace, onAppend }: { text: string; onReplace: (text: string) => void; onAppend: (text: string) => void }) {
  const { t, locale } = useI18n();
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [help, setHelp] = useState<Assist | null>(null);
  const lastAsked = useRef("");

  useEffect(() => {
    aiStatus().then((s) => setEnabled(s.enabled));
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const trimmed = text.trim();
    if (trimmed.length < MIN_CHARS) {
      setHelp(null);
      setBusy(false);
      lastAsked.current = "";
      return;
    }
    if (trimmed === lastAsked.current) return;
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      lastAsked.current = trimmed;
      setBusy(true);
      try {
        setHelp(await api.assist(trimmed, locale, ctrl.signal));
      } catch (err) {
        // Suggestions are optional, so a failure or a newer keystroke just leaves the old ones in place.
        if ((err as Error).name !== "AbortError") lastAsked.current = "";
      } finally {
        if (!ctrl.signal.aborted) setBusy(false);
      }
    }, PAUSE_MS);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [text, enabled, locale]);

  if (!enabled || text.trim().length < MIN_CHARS) return null;

  const showClearer = help?.clearer && help.clearer.trim() !== text.trim();
  const hasHelp = help?.isGrievance && (showClearer || help.questions.length > 0 || help.phrases.length > 0);

  return (
    <div className="wh" aria-live="polite">
      {busy && !hasHelp && (
        <p className="wh__status"><Sparkles size={15} aria-hidden="true" /> {t("Looking at what you wrote…", "आपने जो लिखा है उसे देख रहे हैं…")}</p>
      )}
      {hasHelp && help && (
        <div className={`wh__card${busy ? " is-busy" : ""}`}>
          <p className="wh__label"><Sparkles size={15} aria-hidden="true" /> {t("Suggestions to make it clearer", "इसे और साफ़ बनाने के सुझाव")}</p>

          {showClearer && (
            <div className="wh__clearer">
              <p className="wh__sub">{t("A clearer way to say it", "इसे साफ़ तरीके से कहने का एक तरीका")}</p>
              <p className="wh__text" data-no-translate>{help.clearer}</p>
              <button type="button" className="btn btn--small" onClick={() => onReplace(help.clearer)}>
                <Check size={16} aria-hidden="true" /> {t("Use this", "यह उपयोग करें")}
              </button>
            </div>
          )}

          {help.questions.length > 0 && (
            <div className="wh__questions">
              <p className="wh__sub">{t("Add details so the officer can act faster", "विवरण जोड़ें ताकि अधिकारी जल्दी कार्यवाही कर सके")}</p>
              {help.questions.map((q) => (
                <div key={q.ask} className="wh__q" data-no-translate>
                  <p className="wh__ask">{q.ask}</p>
                  <div className="wh__chips">
                    {q.options.map((o) => (
                      <button key={o} type="button" className="wh__chip" onClick={() => onAppend(o)}>
                        <Plus size={14} aria-hidden="true" /> {o}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {help.phrases.length > 0 && (
            <div className="wh__words">
              <p className="wh__sub">{t("Words that may help", "ये शब्द मदद कर सकते हैं")}</p>
              <div className="wh__chips" data-no-translate>
                {help.phrases.map((p) => (
                  <button key={p} type="button" className="wh__chip wh__chip--word" onClick={() => onAppend(p)}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="wh__hint">{t("These are only suggestions. Add only what is true; you check everything before it is sent.", "ये केवल सुझाव हैं। वही जोड़ें जो सही है; भेजने से पहले आप सब जाँच लेंगे।")}</p>
        </div>
      )}
    </div>
  );
}
