import { Link } from "react-router-dom";
import { MapPin, Navigation } from "lucide-react";
import { useI18n } from "../context/I18nContext";
import { formatDate } from "../lib/format";
import type { GeoPin } from "../lib/types";

/**
 * The exact spot of the problem, as the citizen marked it: a Google map, a link to open it in Google Maps,
 * and for officers, directions. Without a spot, the citizen gets a button to mark one.
 */
export function LocationCard({ pin, pinHref, officer = false }: { pin?: GeoPin | null; pinHref?: string; officer?: boolean }) {
  const { t, lang } = useI18n();
  if (!pin) {
    if (officer) return <p className="loc__none small muted"><MapPin size={15} aria-hidden="true" /> {t("The citizen has not marked the exact spot yet. They were sent a link on WhatsApp.", "नागरिक ने अभी सही जगह नहीं बताई है। उन्हें व्हाट्सऐप पर लिंक भेजा गया है।")}</p>;
    return pinHref ? (
      <Link to={pinHref} className="btn btn--secondary btn--small loc__add"><MapPin size={16} aria-hidden="true" /> {t("Mark the exact spot on the map", "नक्शे पर सही जगह बताएँ")}</Link>
    ) : null;
  }
  const q = `${pin.lat},${pin.lng}`;
  return (
    <figure className="loc">
      <iframe className="loc__map" title={t("Map of the problem's location", "समस्या की जगह का नक्शा")} src={`https://maps.google.com/maps?q=${q}&z=16&output=embed`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
      <figcaption className="loc__bar">
        <span className="small muted">
          {pin.source === "whatsapp" ? t("Shared on WhatsApp", "व्हाट्सऐप पर भेजी गई") : t("Marked on the map", "नक्शे पर चिह्नित")} · {formatDate(pin.at, lang)}
        </span>
        <span className="loc__links">
          <a href={`https://www.google.com/maps/search/?api=1&query=${q}`} target="_blank" rel="noopener"><MapPin size={15} aria-hidden="true" /> {t("Open in Google Maps", "गूगल मैप्स में खोलें")}</a>
          {officer && <a href={`https://www.google.com/maps/dir/?api=1&destination=${q}`} target="_blank" rel="noopener"><Navigation size={15} aria-hidden="true" /> {t("Directions", "रास्ता")}</a>}
          {!officer && pinHref && <Link to={pinHref}>{t("Change", "बदलें")}</Link>}
        </span>
      </figcaption>
    </figure>
  );
}
