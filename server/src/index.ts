import { config } from "./config.js";
import { createApp } from "./app.js";
import { store } from "./data/store.js";
import { postgresStore } from "./lib/postgres.js";
import { supabaseStore } from "./lib/supabase.js";
import "./services/whatsapp.service.js";
import "./services/brief.service.js";
import { startWaLink } from "./services/walink.service.js";
import { attachPhone, voiceReady } from "./voice/phone.js";

async function main() {
  let database = "local file";
  if (config.databaseUrl) {
    try {
      await store.useRemote(postgresStore());
      database = "Postgres (Neon)";
    } catch (err) {
      console.warn("Postgres unavailable; using the local file", err);
    }
  } else if (config.supabase.url && config.supabase.serviceKey) {
    try {
      await store.useRemote(supabaseStore());
      database = "Supabase";
    } catch (err) {
      console.warn("Supabase unavailable; using the local file", err);
    }
  }
  const server = createApp().listen(config.port, () => {
    const ai = config.ai.key && config.ai.model ? "language model" : config.anthropicEnabled ? "Claude" : "built-in rules";
    const wa = config.waLink.enabled ? "linked number" : config.whatsapp.token ? "Cloud API" : "simulated";
    console.log(`CM Helpline API on http://localhost:${config.port} (AI: ${ai}; data: ${database}; WhatsApp: ${wa}; phone agent: ${voiceReady() ? "on" : "off"})`);
  });
  attachPhone(server);
  void startWaLink();

  // Render's free plan sleeps after 15 idle minutes, which would drop the WhatsApp link and miss calls.
  // The server pings itself; an outside cron (see .github/workflows/keep-awake.yml) wakes it if it sleeps anyway.
  if (config.isProd && config.publicUrl) {
    setInterval(() => void fetch(`${config.publicUrl}/api/health`, { signal: AbortSignal.timeout(10_000) }).catch(() => {}), 10 * 60_000).unref();
  }
}

void main();
