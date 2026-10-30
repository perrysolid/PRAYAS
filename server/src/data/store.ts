import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { config } from "../config.js";
import type { Grievance, Level } from "../types.js";
import { departments, districts, levels } from "./catalog.js";

type Db = { grievances: Grievance[]; sequence: number; contactMessages: { at: string; name: string; email: string; message: string }[] };

const DAY = 24 * 60 * 60 * 1000;

export function addDays(iso: string, days: number) {
  return new Date(new Date(iso).getTime() + days * DAY).toISOString();
}

/** Moves an unresolved grievance up the L1→L4 ladder once its current level's deadline passes. */
export function applyEscalation(g: Grievance, now = Date.now()): boolean {
  if (g.status === "resolved" || g.status === "closed") return false;
  let changed = false;
  while (g.level < 4 && new Date(g.levelDueAt).getTime() < now) {
    const next = (g.level + 1) as Level;
    g.timeline.push({ at: g.levelDueAt, event: "escalated", by: "System", level: next, note: `Not resolved within ${levels[g.level].days} days at L${g.level}` });
    g.level = next;
    g.levelDueAt = addDays(g.levelDueAt, levels[next].days);
    changed = true;
  }
  return changed;
}

// Deterministic pseudo-random generator so seeded data is stable between restarts.
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

const sampleText: Record<string, [string, string][]> = {
  energy: [["No electricity for three days", "Our village has had no power since the transformer burnt out on Monday. Linemen have not visited."]],
  water: [["Taps dry for a week", "Water supply in our ward has stopped for 7 days. Families are carrying water from the spring 2 km away."]],
  pwd: [["Motor road blocked after landslide", "Debris from last week's landslide still blocks the motor road. School children walk 5 km around it."]],
  revenue: [["Income certificate pending past 15 days", "Applied on Apuni Sarkar for an income certificate. It is past the 15 day timeline and still shows pending."]],
  food: [["Ration not given for two months", "The ration dealer says stock has not arrived, but neighbours from other villages are getting ration."]],
  "social-welfare": [["Old age pension stopped", "My mother's old age pension has not come for four months. Bank says no credit received."]],
  health: [["No doctor at PHC", "The primary health centre has had no doctor for three weeks. Patients are sent to the district hospital."]],
  urban: [["Garbage not collected", "Garbage has not been collected from our lane for ten days and is spreading disease."]],
  forest: [["Leopard sighted near school", "A leopard has been seen near the primary school twice this week. Parents are scared to send children."]],
};

function seed(): Db {
  const rand = rng(1905);
  const grievances: Grievance[] = [];
  const now = Date.now();
  const deptIds = Object.keys(sampleText);
  let sequence = 4600; // Above the hand-written demo IDs (004498, 004512) so they never collide.

  for (let i = 0; i < 60; i++) {
    const departmentId = deptIds[Math.floor(rand() * deptIds.length)];
    const dept = departments.find((d) => d.id === departmentId)!;
    const district = districts[Math.floor(rand() * districts.length)];
    const [subject, description] = sampleText[departmentId][0];
    const roll = rand();
    const resolved = roll < 0.62;
    // Most open complaints are recent; only a few have aged into L2–L4.
    const ageDays = resolved ? rand() * 60 : rand() < 0.75 ? rand() * 14 : 15 + rand() * 25;
    const submittedAt = new Date(now - Math.floor(ageDays * DAY)).toISOString();
    const g: Grievance = {
      id: `CMH-2026-${String(++sequence).padStart(6, "0")}`,
      citizenMobile: `9${Math.floor(100000000 + rand() * 899999999)}`,
      citizenName: "Citizen",
      type: "complaint",
      departmentId,
      categoryId: dept.categories[0].id,
      subject,
      description,
      districtId: district.id,
      block: district.blocks[Math.floor(rand() * district.blocks.length)],
      urgency: rand() < 0.15 ? "high" : "normal",
      status: "registered",
      level: 1,
      levelDueAt: addDays(submittedAt, levels[1].days),
      submittedAt,
      timeline: [
        { at: submittedAt, event: "registered", by: "Citizen" },
        { at: addDays(submittedAt, 0.1), event: "assigned", by: "CM Helpline 1905", level: 1, note: `Assigned to ${levels[1].title.en}, ${district.name.en}` },
      ],
      remindersSent: 0,
      triage: { source: "rules", confidence: 0.8 },
      channel: (["web", "phone", "app", "whatsapp"] as const)[Math.floor(rand() * 4)],
    };
    if (resolved) {
      // Most are fixed within the first officer's 15 days; some take longer.
      const resolvedAt = addDays(submittedAt, 2 + Math.floor(rand() * rand() * 28));
      if (new Date(resolvedAt).getTime() < now) {
        g.status = "resolved";
        g.resolvedAt = resolvedAt;
        g.timeline.push({ at: resolvedAt, event: "resolved", by: `${levels[1].title.en}`, level: 1, note: "Action taken and reported." });
        if (rand() < 0.6) {
          const rating = Math.min(5, 2 + Math.floor(rand() * 4));
          const at = addDays(resolvedAt, 1);
          g.feedback = { rating, at };
          g.timeline.push({ at, event: "feedback", by: "Citizen", note: `Rated ${rating} of 5` });
          if (rating >= 3) g.status = "closed";
        }
      }
    } else if (roll < 0.8) {
      g.status = "in_progress";
      g.timeline.push({ at: addDays(submittedAt, 1), event: "note", by: levels[1].title.en, level: 1, note: "Field inspection scheduled." });
    }
    // Some open problems affect a whole village or ward; others joined instead of filing duplicates.
    if (g.status !== "resolved" && rand() < 0.45) {
      const n = Math.floor(1 + rand() * rand() * 30);
      g.supporters = Array.from({ length: n }, (_, k) => `8${String(100000000 + i * 1000 + k)}`);
    } else {
      g.supporters = [];
    }
    applyEscalation(g, now);
    grievances.push(g);
  }

  // Known demo records for the walkthrough. Demo mobile: 9876543210.
  const demoStart = new Date(now - 18 * DAY).toISOString();
  grievances.push({
    id: "CMH-2026-004512",
    citizenMobile: "9876543210",
    citizenName: "Kamla Devi",
    type: "complaint",
    departmentId: "water",
    categoryId: "no-supply",
    subject: "No water supply in Ward 4 for 10 days",
    description: "The main pipeline near the primary school has been broken since the rains. Around 40 families in Ward 4 have no water.",
    districtId: "pauri",
    block: "Khirsu",
    village: "Ward 4, Khirsu",
    urgency: "high",
    status: "in_progress",
    level: 1,
    levelDueAt: addDays(demoStart, levels[1].days),
    submittedAt: demoStart,
    timeline: [
      { at: demoStart, event: "registered", by: "Citizen" },
      { at: addDays(demoStart, 0.1), event: "assigned", by: "CM Helpline 1905", level: 1, note: "Assigned to Junior Engineer, Jal Sansthan, Khirsu" },
      { at: addDays(demoStart, 3), event: "note", by: "Junior Engineer, Jal Sansthan", level: 1, note: "Site inspected. Pipe replacement estimate sent for approval." },
      { at: addDays(demoStart, 5), event: "supported", by: "Citizens", level: 1, note: "23 other citizens face the same problem" },
    ],
    remindersSent: 0,
    triage: { source: "rules", confidence: 0.92 },
    channel: "web",
    // Neighbours in Ward 4 joined this complaint rather than filing 23 separate ones.
    supporters: Array.from({ length: 23 }, (_, k) => `70000000${String(k).padStart(2, "0")}`),
  });
  applyEscalation(grievances[grievances.length - 1], now);

  const resolvedStart = new Date(now - 9 * DAY).toISOString();
  grievances.push({
    id: "CMH-2026-004498",
    citizenMobile: "9876543210",
    citizenName: "Kamla Devi",
    type: "complaint",
    departmentId: "energy",
    categoryId: "transformer",
    subject: "Transformer burnt in Srikot",
    description: "The transformer serving Srikot village burnt out after a storm. Thirty houses have no power.",
    districtId: "pauri",
    block: "Khirsu",
    village: "Srikot",
    urgency: "normal",
    status: "resolved",
    level: 1,
    levelDueAt: addDays(resolvedStart, levels[1].days),
    submittedAt: resolvedStart,
    resolvedAt: addDays(resolvedStart, 4),
    timeline: [
      { at: resolvedStart, event: "registered", by: "Citizen" },
      { at: addDays(resolvedStart, 0.1), event: "assigned", by: "CM Helpline 1905", level: 1, note: "Assigned to Sub Divisional Officer, UPCL Srinagar" },
      { at: addDays(resolvedStart, 4), event: "resolved", by: "Sub Divisional Officer, UPCL", level: 1, note: "New 63 kVA transformer installed and supply restored." },
    ],
    remindersSent: 0,
    triage: { source: "rules", confidence: 0.95 },
    channel: "phone",
    supporters: [],
  });

  return { grievances, sequence, contactMessages: [] };
}

function load(): Db {
  if (existsSync(config.dataFile)) {
    try {
      return JSON.parse(readFileSync(config.dataFile, "utf8")) as Db;
    } catch {
      // Corrupt file: fall through and reseed rather than crash the portal.
    }
  }
  const db = seed();
  writeFileSync(config.dataFile, JSON.stringify(db, null, 2));
  return db;
}

const db = load();
let saveTimer: NodeJS.Timeout | undefined;

function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => writeFileSync(config.dataFile, JSON.stringify(db, null, 2)), 200);
}

export const store = {
  grievances: {
    all(): Grievance[] {
      const now = Date.now();
      if (db.grievances.some((g) => applyEscalation(g, now))) persist();
      return db.grievances;
    },
    find(id: string): Grievance | undefined {
      const g = db.grievances.find((x) => x.id === id.toUpperCase());
      if (g && applyEscalation(g)) persist();
      return g;
    },
    nextId(): string {
      db.sequence += 1;
      return `CMH-${new Date().getFullYear()}-${String(db.sequence).padStart(6, "0")}`;
    },
    insert(g: Grievance) {
      db.grievances.push(g);
      persist();
      return g;
    },
    save() {
      persist();
    },
  },
  contact: {
    insert(msg: Db["contactMessages"][number]) {
      db.contactMessages.push(msg);
      persist();
    },
  },
};
