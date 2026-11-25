import pg from "pg";
import { config } from "../config.js";
import type { Db, RemoteStore } from "../data/store.js";
import type { Grievance, WhatsAppMessage } from "../types.js";

/*
 * Plain Postgres persistence (Neon by default) over DATABASE_URL. Only the server connects; there is
 * no public API in front of the database. Tables are created on start, so a fresh database needs no setup.
 * Neon's free compute sleeps after 5 idle minutes and wakes on the next query (well under a second).
 */

let pool: pg.Pool | undefined;
export const postgresEnabled = () => Boolean(config.databaseUrl);
export function db() {
  if (pool) return pool;
  pool = new pg.Pool({
    // libpq "require" is already treated as full verification by pg; say so to skip its warning.
    connectionString: config.databaseUrl.replace("sslmode=require", "sslmode=verify-full"),
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 15_000,
    ssl: /localhost|127\.0\.0\.1/.test(config.databaseUrl) ? false : { rejectUnauthorized: true },
  });
  // Neon closes idle connections when its compute sleeps; that must not crash the server.
  pool.on("error", (err) => console.warn(`Postgres connection closed (${err.message})`));
  return pool;
}

const SCHEMA = `
create table if not exists grievances (
  id text primary key,
  data jsonb not null,
  department_id text generated always as (data->>'departmentId') stored,
  district_id text generated always as (data->>'districtId') stored,
  status text generated always as (data->>'status') stored,
  level int generated always as ((data->>'level')::int) stored,
  citizen_mobile text generated always as (data->>'citizenMobile') stored,
  submitted_at timestamptz not null,
  updated_at timestamptz not null default now()
);
create index if not exists grievances_dept_status on grievances (department_id, status);
create index if not exists grievances_district on grievances (district_id);
create index if not exists grievances_mobile on grievances (citizen_mobile);
create index if not exists grievances_submitted on grievances (submitted_at desc);

create table if not exists whatsapp_messages (
  id uuid primary key,
  mobile text not null,
  dir text not null check (dir in ('in', 'out')),
  body text not null,
  grievance_id text,
  image text,
  status text not null,
  at timestamptz not null
);
create index if not exists whatsapp_messages_mobile_at on whatsapp_messages (mobile, at);
create index if not exists whatsapp_messages_grievance on whatsapp_messages (grievance_id);

create table if not exists app_state (key text primary key, value jsonb not null);

-- Login for the linked WhatsApp number (services/walink.service.ts), one row per key.
create table if not exists wa_auth (key text primary key, value text not null);

-- Each citizen's chosen language (services/prefs.service.ts).
create table if not exists citizen_prefs (mobile text primary key, lang text not null check (lang in ('hi', 'en', 'gbm', 'kfy')));
`;

let schemaReady: Promise<unknown> | undefined;
export const ensureSchema = () => (schemaReady ??= db().query(SCHEMA));

export function postgresStore(): RemoteStore {
  return {
    async load() {
      await ensureSchema();
      const rows = (await db().query<{ data: Grievance }>("select data from grievances limit 10000")).rows;
      if (!rows.length) return null;
      const msgs = (
        await db().query<{ id: string; mobile: string; dir: "in" | "out"; body: string; grievance_id: string | null; image: string | null; status: WhatsAppMessage["status"]; at: Date }>(
          "select * from whatsapp_messages order by at limit 5000",
        )
      ).rows;
      const state = (await db().query<{ value: number }>("select value from app_state where key = 'sequence'")).rows[0];
      const out: Db = {
        grievances: rows.map((r) => r.data),
        sequence: state?.value ?? 4600 + rows.length,
        contactMessages: [],
        whatsapp: msgs.map((m) => ({ id: m.id, mobile: m.mobile, dir: m.dir, text: m.body, grievanceId: m.grievance_id ?? undefined, image: m.image ?? undefined, status: m.status, at: new Date(m.at).toISOString() })),
      };
      return out;
    },
    async saveGrievances(rows) {
      for (let i = 0; i < rows.length; i += 200) {
        const batch = rows.slice(i, i + 200);
        await db().query(
          `insert into grievances (id, data, submitted_at, updated_at)
           select x.id, x.data, x.submitted_at, now() from jsonb_to_recordset($1::jsonb) as x(id text, data jsonb, submitted_at timestamptz)
           on conflict (id) do update set data = excluded.data, updated_at = now()`,
          [JSON.stringify(batch.map((g) => ({ id: g.id, data: g, submitted_at: g.submittedAt })))],
        );
      }
    },
    async saveMessages(rows) {
      for (let i = 0; i < rows.length; i += 200) {
        const batch = rows.slice(i, i + 200);
        await db().query(
          `insert into whatsapp_messages (id, mobile, dir, body, grievance_id, image, status, at)
           select * from jsonb_to_recordset($1::jsonb) as x(id uuid, mobile text, dir text, body text, grievance_id text, image text, status text, at timestamptz)
           on conflict (id) do update set status = excluded.status`,
          [JSON.stringify(batch.map((m) => ({ id: m.id, mobile: m.mobile, dir: m.dir, body: m.text, grievance_id: m.grievanceId ?? null, image: m.image ?? null, status: m.status, at: m.at })))],
        );
      }
    },
    async saveState(state) {
      await db().query("insert into app_state (key, value) values ('sequence', $1::jsonb) on conflict (key) do update set value = excluded.value", [JSON.stringify(state.sequence)]);
    },
  };
}

/** Key-value rows for the WhatsApp login. */
export const pgKv = {
  async get(key: string) {
    await ensureSchema();
    return (await db().query<{ value: string }>("select value from wa_auth where key = $1", [key])).rows[0]?.value;
  },
  async set(key: string, value: string) {
    await db().query("insert into wa_auth (key, value) values ($1, $2) on conflict (key) do update set value = excluded.value", [key, value]);
  },
  async del(key: string) {
    await db().query("delete from wa_auth where key = $1", [key]);
  },
  async clear() {
    await db().query("delete from wa_auth");
  },
};
