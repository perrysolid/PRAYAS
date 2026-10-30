import { useId, useState } from "react";
import { Camera, MapPin, Trash2 } from "lucide-react";
import { useI18n } from "../context/I18nContext";
import { compressPhoto, currentPosition } from "../lib/photo";
import type { Photo } from "../lib/types";

type Props = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  value: Photo | null;
  onChange: (photo: Photo | null) => void;
};

/** Camera or gallery photo, compressed in the browser and optionally geo-tagged. */
export function PhotoInput({ id, label, hint, error, value, onChange }: Props) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const statusId = useId();

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setProblem("");
    try {
      const dataUrl = await compressPhoto(file);
      const pos = await currentPosition(6000);
      onChange({ dataUrl, ...(pos ?? {}) });
    } catch {
      setProblem(t("We could not read that file. Choose a photo (JPEG or PNG).", "यह फ़ाइल पढ़ी नहीं जा सकी। फ़ोटो (JPEG या PNG) चुनें।"));
    } finally {
      setBusy(false);
    }
  };

  const describedBy = [hint && `${id}-hint`, (error || problem) && `${id}-error`].filter(Boolean).join(" ") || undefined;

  return (
    <div className={`field photo-input${error || problem ? " field--error" : ""}`}>
      <span className="field__label" id={`${id}-label`}>{label}</span>
      {hint && <span className="field__hint" id={`${id}-hint`}>{hint}</span>}
      {(error || problem) && <span className="field__error" id={`${id}-error`}>{error || problem}</span>}
      {value ? (
        <figure className="photo-input__preview">
          <img src={value.dataUrl} alt={t("Your attached photo", "आपकी संलग्न फ़ोटो")} />
          <figcaption>
            {value.lat !== undefined ? (
              <span className="photo-input__geo"><MapPin size={14} aria-hidden="true" /> {t("Location tagged", "स्थान दर्ज")} ({value.lat.toFixed(3)}, {value.lon!.toFixed(3)})</span>
            ) : (
              <span className="muted small">{t("No location attached", "स्थान संलग्न नहीं")}</span>
            )}
            <button type="button" className="btn btn--quiet" onClick={() => onChange(null)}>
              <Trash2 size={16} aria-hidden="true" /> {t("Remove photo", "फ़ोटो हटाएँ")}
            </button>
          </figcaption>
        </figure>
      ) : (
        <label className="photo-input__drop" htmlFor={id}>
          <Camera size={28} aria-hidden="true" />
          <span>
            <strong>{busy ? t("Preparing photo…", "फ़ोटो तैयार हो रही है…") : t("Take or choose a photo", "फ़ोटो लें या चुनें")}</strong>
            <span className="small muted">{t("It is made smaller before upload, so it works on slow networks.", "अपलोड से पहले छोटी की जाती है, ताकि धीमे नेटवर्क पर भी चले।")}</span>
          </span>
        </label>
      )}
      <input
        id={id}
        className="visually-hidden"
        type="file"
        accept="image/*"
        capture="environment"
        aria-labelledby={`${id}-label`}
        aria-describedby={describedBy}
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <span id={statusId} className="visually-hidden" aria-live="polite">{busy ? t("Preparing photo", "फ़ोटो तैयार हो रही है") : value ? t("Photo attached", "फ़ोटो संलग्न") : ""}</span>
    </div>
  );
}
