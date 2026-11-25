import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Check, Crosshair, MapPin } from "lucide-react";
import { PageHead } from "../components/PageHead";
import { LoadError, Loading } from "../components/States";
import { useI18n } from "../context/I18nContext";
import { useMeta } from "../context/MetaContext";
import { useAsync } from "../hooks/useAsync";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { api, ApiError } from "../lib/api";

/** District headquarters, where the map opens when the citizen has not marked a spot yet. */
const DISTRICT_CENTRE: Record<string, [number, number]> = {
  almora: [29.597, 79.659], bageshwar: [29.838, 79.771], chamoli: [30.405, 79.33], champawat: [29.336, 80.091],
  dehradun: [30.316, 78.032], haridwar: [29.946, 78.164], nainital: [29.38, 79.463], pauri: [30.147, 78.775],
  pithoragarh: [29.583, 80.218], rudraprayag: [30.285, 78.981], tehri: [30.39, 78.48], usnagar: [28.975, 79.4], uttarkashi: [30.727, 78.435],
};

const pinIcon = L.divIcon({ className: "pin-marker", html: '<span aria-hidden="true"></span>', iconSize: [30, 42], iconAnchor: [15, 40] });

/**
 * Mark the exact spot of a problem on the map. Opened from the WhatsApp link (signed, no sign-in needed)
 * or from the citizen's own complaint page. The officer then sees it on Google Maps with directions.
 */
export function Pin() {
  const { t, pick } = useI18n();
  const { district, department } = useMeta();
  const { id = "" } = useParams();
  const [params] = useSearchParams();
  const token = params.get("t");
  useDocumentTitle("Mark the exact spot", "सही जगह बताएँ");
  const { data, error, loading, reload } = useAsync((signal) => api.pinInfo(id, token, signal), [id, token]);

  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);
  const [spot, setSpot] = useState<{ lat: number; lng: number } | null>(null);
  const [state, setState] = useState<"idle" | "locating" | "saving" | "saved">("idle");
  const [problem, setProblem] = useState("");

  useEffect(() => {
    if (!data || !box.current || map.current) return;
    const start = data.location ? ([data.location.lat, data.location.lng] as [number, number]) : DISTRICT_CENTRE[data.districtId] ?? [30.07, 79.3];
    const m = L.map(box.current, { zoomControl: true }).setView(start, data.location ? 17 : 12);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(m);
    const place = (lat: number, lng: number) => {
      if (!marker.current) {
        marker.current = L.marker([lat, lng], { icon: pinIcon, draggable: true, keyboard: false }).addTo(m);
        marker.current.on("dragend", () => {
          const p = marker.current!.getLatLng();
          setSpot({ lat: p.lat, lng: p.lng });
          setState("idle");
        });
      } else marker.current.setLatLng([lat, lng]);
      setSpot({ lat, lng });
      setState("idle");
    };
    if (data.location) place(data.location.lat, data.location.lng);
    m.on("click", (e: L.LeafletMouseEvent) => place(e.latlng.lat, e.latlng.lng));
    map.current = m;
    (m as L.Map & { placePin?: typeof place }).placePin = place;
    return () => {
      m.remove();
      map.current = null;
      marker.current = null;
    };
  }, [data]);

  const useMyLocation = () => {
    if (!navigator.geolocation) return setProblem(t("This phone cannot share its location. Tap the map instead.", "यह फ़ोन लोकेशन नहीं दे सकता। नक्शे पर टैप करें।"));
    setProblem("");
    setState("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const m = map.current as (L.Map & { placePin?: (lat: number, lng: number) => void }) | null;
        m?.setView([pos.coords.latitude, pos.coords.longitude], 17);
        m?.placePin?.(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setState("idle");
        setProblem(t("Could not get your location. Allow location access, or tap the map where the problem is.", "आपकी लोकेशन नहीं मिल सकी। लोकेशन की अनुमति दें, या नक्शे पर समस्या वाली जगह टैप करें।"));
      },
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  };

  const save = async () => {
    if (!spot) return;
    setState("saving");
    setProblem("");
    try {
      await api.savePin(id, token, spot.lat, spot.lng);
      setState("saved");
    } catch (err) {
      setState("idle");
      setProblem(err instanceof ApiError ? err.message : t("Could not save. Please try again.", "सहेजा नहीं जा सका। फिर से प्रयास करें।"));
    }
  };

  if (loading) return <div className="container"><Loading /></div>;
  if (error || !data) return <div className="container"><PageHead en="Mark the exact spot" hi="सही जगह बताएँ" /><LoadError error={error ?? new Error("Not found")} onRetry={reload} /></div>;

  const dist = district(data.districtId);
  const dept = department(data.departmentId);
  return (
    <div className="container pin-page">
      <PageHead en="Mark the exact spot" hi="सही जगह बताएँ" lead={t("Tap the map where the problem is, or use your current location. The officer will see this spot and can get directions to it.", "नक्शे पर वहाँ टैप करें जहाँ समस्या है, या अपनी वर्तमान लोकेशन चुनें। अधिकारी यह जगह देखेंगे और वहाँ तक का रास्ता पा सकेंगे।")} />
      <p className="pin-page__about">
        <strong>{data.id}</strong> · {data.subject}
        <br />
        <span className="muted small">{[dept && pick(dept.name), data.village, data.block, dist && pick(dist.name)].filter(Boolean).join(" · ")}</span>
      </p>
      <div className="pin-page__actions">
        <button type="button" className="btn btn--secondary" onClick={useMyLocation} disabled={state === "locating" || state === "saving"}>
          <Crosshair size={18} aria-hidden="true" /> {state === "locating" ? t("Finding you…", "लोकेशन ढूँढ रहे हैं…") : t("Use my current location", "मेरी वर्तमान लोकेशन")}
        </button>
      </div>
      <div ref={box} className="pin-page__map" role="application" aria-label={t("Map. Tap to place the pin; drag the pin to adjust.", "नक्शा। पिन लगाने के लिए टैप करें; ठीक करने के लिए पिन खींचें।")} />
      <p className="small muted">{spot ? t("Drag the pin to adjust it.", "ठीक करने के लिए पिन खींचें।") : t("No spot yet: tap the map.", "अभी कोई जगह नहीं: नक्शे पर टैप करें।")}</p>
      {problem && <p className="field__error" role="alert">{problem}</p>}
      {state === "saved" ? (
        <div className="pin-page__done" role="status">
          <Check size={20} aria-hidden="true" />
          <span>{t("Saved. The officer can now see the exact spot.", "सहेज लिया गया। अधिकारी अब सही जगह देख सकेंगे।")} <a href={`https://www.google.com/maps/search/?api=1&query=${spot!.lat},${spot!.lng}`} target="_blank" rel="noopener">{t("Open in Google Maps", "गूगल मैप्स में खोलें")}</a></span>
        </div>
      ) : (
        <button type="button" className="btn" onClick={save} disabled={!spot || state === "saving" || !data.open}>
          <MapPin size={18} aria-hidden="true" /> {state === "saving" ? t("Saving…", "सहेज रहे हैं…") : data.location ? t("Update this spot", "यह जगह अपडेट करें") : t("Save this spot", "यह जगह सहेजें")}
        </button>
      )}
      {!data.open && <p className="small muted">{t("This complaint is closed, so its location can no longer be changed.", "यह शिकायत बंद है, इसलिए जगह अब नहीं बदली जा सकती।")}</p>}
      {!token && <p className="small"><Link to={`/my-complaints/${data.id}`}>{t("Back to the complaint", "शिकायत पर वापस")}</Link></p>}
    </div>
  );
}
