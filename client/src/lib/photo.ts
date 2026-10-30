/**
 * Shrinks a camera photo in the browser before upload: at most 1280px on the long side, JPEG at 75%.
 * A 4 MB phone photo becomes roughly 150 KB, which matters on 2G/3G connections in the hills.
 */
export async function compressPhoto(file: File, maxSide = 1280, quality = 0.75): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("not-image");
  // A data: URL rather than a blob: URL, so the strict Content-Security-Policy (img-src 'self' data:) allows it.
  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("unreadable"));
    reader.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("unreadable"));
    el.src = source;
  });
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}

/** Current position, or null if the citizen declines or the device has no GPS. Never blocks the form. */
export function currentPosition(timeout = 10_000): Promise<{ lat: number; lon: number } | null> {
  if (!("geolocation" in navigator)) return Promise.resolve(null);
  return new Promise((resolve) =>
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: Number(p.coords.latitude.toFixed(5)), lon: Number(p.coords.longitude.toFixed(5)) }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout, maximumAge: 60_000 },
    ),
  );
}
