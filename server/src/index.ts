import { config } from "./config.js";
import { createApp } from "./app.js";
import { store } from "./data/store.js";
import { supabaseStore } from "./lib/supabase.js";
import "./services/whatsapp.service.js";

async function main() {
  let database = "local file";
  if (config.supabase.url && config.supabase.serviceKey) {
    try {
      await store.useRemote(supabaseStore());
      database = "Supabase";
    } catch (err) {
      console.warn("Supabase unavailable; using the local file", err);
    }
  }
  createApp().listen(config.port, () => {
    const ai = config.ai.key && config.ai.model ? "language model" : config.anthropicEnabled ? "Claude" : "built-in rules";
    console.log(`CM Helpline API on http://localhost:${config.port} (AI: ${ai}; data: ${database}; WhatsApp: ${config.whatsapp.token ? "Cloud API" : "simulated"})`);
  });
}

void main();
