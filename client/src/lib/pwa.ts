/** Installable, offline-tolerant app: registered only in production builds so dev reloads stay fresh. */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // The site works without it; nothing to tell the citizen.
    });
  });
}
