import { createClient } from "@supabase/supabase-js";
import { config } from "../config.js";
import type { Db, RemoteStore } from "../data/store.js";
import type { Grievance, WhatsAppMessage } from "../types.js";

/** Supabase (Postgres) persistence. Schema: supabase/migrations. Uses the service role key, server-side only. */
export function supabaseStore(): RemoteStore {
  const db = createClient(config.supabase.url, config.supabase.serviceKey, { auth: { persistSession: false } });

  const check = <T>(res: { data: T; error: { message: string } | null }) => {
    if (res.error) throw new Error(`Supabase: ${res.error.message}`);
    return res.data;
  };

  return {
    async load() {
      const rows = check(await db.from("grievances").select("data").limit(10000)) as { data: Grievance }[];
      if (!rows.length) return null;
      const msgs = check(await db.from("whatsapp_messages").select("*").order("at").limit(5000)) as { id: string; mobile: string; dir: "in" | "out"; body: string; grievance_id: string | null; image: string | null; status: WhatsAppMessage["status"]; at: string }[];
      const state = check(await db.from("app_state").select("value").eq("key", "sequence").maybeSingle()) as { value: number } | null;
      const out: Db = {
        grievances: rows.map((r) => r.data),
        sequence: state?.value ?? 4600 + rows.length,
        contactMessages: [],
        whatsapp: msgs.map((m) => ({ id: m.id, mobile: m.mobile, dir: m.dir, text: m.body, grievanceId: m.grievance_id ?? undefined, image: m.image ?? undefined, status: m.status, at: m.at })),
      };
      return out;
    },
    async saveGrievances(rows) {
      for (let i = 0; i < rows.length; i += 200) {
        check(await db.from("grievances").upsert(rows.slice(i, i + 200).map((g) => ({ id: g.id, data: g, updated_at: new Date().toISOString() }))));
      }
    },
    async saveMessages(rows) {
      for (let i = 0; i < rows.length; i += 200) {
        check(
          await db.from("whatsapp_messages").upsert(
            rows.slice(i, i + 200).map((m) => ({ id: m.id, mobile: m.mobile, dir: m.dir, body: m.text, grievance_id: m.grievanceId ?? null, image: m.image ?? null, status: m.status, at: m.at })),
          ),
        );
      }
    },
    async saveState(state) {
      check(await db.from("app_state").upsert({ key: "sequence", value: state.sequence }));
    },
  };
}
