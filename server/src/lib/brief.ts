import { departments, districts, levels } from "../data/catalog.js";
import type { Brief, Grievance, Level } from "../types.js";

/*
 * Officer briefs written from the record alone, without a language model. They are always
 * available, and the model-written versions (services/brief.service.ts) replace them when ready.
 */

const DAY = 86_400_000;
const place = (g: Grievance) => [g.village, g.block, districts.find((d) => d.id === g.districtId)?.name.en].filter(Boolean).join(", ");
const dept = (g: Grievance) => departments.find((d) => d.id === g.departmentId)?.name.en ?? g.departmentId;
const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

export function rulesBrief(g: Grievance): Brief {
  const people = g.supporters?.length ?? 0;
  const points = [
    `${g.subject} at ${place(g) || "an unspecified place"}.`,
    [g.urgency === "high" ? "Marked urgent" : null, people ? `${people + 1} citizens affected` : null, `Action due ${shortDate(g.levelDueAt)} at L${g.level}`].filter(Boolean).join(" · ") + ".",
    `Reported by ${g.channel === "phone" ? "phone call" : g.channel === "whatsapp" ? "WhatsApp" : "website"}; ${g.whatsapp === false ? "no WhatsApp updates" : "the citizen sees your updates on WhatsApp"}.`,
  ];
  return { points, source: "rules", at: g.submittedAt };
}

/** The escalation the record is currently at, if any. */
export function lastEscalation(g: Grievance) {
  for (let i = g.timeline.length - 1; i >= 0; i--) {
    const e = g.timeline[i];
    if (e.event === "escalated" && e.level === g.level) return e;
  }
  return undefined;
}

export function rulesEscalationBrief(g: Grievance): (Brief & { level: Level }) | undefined {
  const esc = lastEscalation(g);
  if (!esc || g.level < 2) return undefined;
  const prev = (g.level - 1) as Level;
  const notes = g.timeline.filter((e) => e.event === "note" && (e.level ?? 1) < g.level);
  const lastNote = notes[notes.length - 1];
  const days = Math.max(1, Math.round((Date.now() - new Date(g.submittedAt).getTime()) / DAY));
  const points = [
    `Reported ${shortDate(g.submittedAt)} (${days} days ago): ${g.subject}, ${place(g)}.`,
    lastNote ? `Last action by ${lastNote.by} on ${shortDate(lastNote.at)}: “${lastNote.note}”` : `No action was recorded by the ${levels[prev].title.en} (L${prev}).`,
    `Moved up because it was not resolved within ${levels[prev].days} days at L${prev}${g.remindersSent ? `, after ${g.remindersSent} citizen reminder${g.remindersSent > 1 ? "s" : ""}` : ""}${g.supporters?.length ? `; ${g.supporters.length + 1} citizens affected` : ""}.`,
  ];
  return { points, source: "rules", at: esc.at, level: g.level };
}

/** The record as text for a language model writing a brief. Citizen-written parts stay tagged as data. */
export function recordForBrief(g: Grievance) {
  const lines = [
    `Complaint ${g.id}, ${dept(g)}, ${place(g)}`,
    `Received ${g.submittedAt} by ${g.channel}; now at L${g.level} (${levels[g.level].title.en}), due ${g.levelDueAt}; urgency ${g.urgency}; ${g.supporters?.length ?? 0} other citizens joined`,
    `<citizen_text>\n${g.subject}\n${g.description}\n</citizen_text>`,
    `History:\n${g.timeline.map((e) => `- ${e.at.slice(0, 10)} ${e.event}${e.level ? ` L${e.level}` : ""} by ${e.by}${e.note ? `: ${e.note}` : ""}`).join("\n")}`,
  ];
  if (g.call?.transcript.length) {
    lines.push(`<call_transcript>\n${g.call.transcript.map((l) => `${l.who}: ${l.text}`).join("\n").slice(0, 6000)}\n</call_transcript>`);
  }
  return lines.join("\n\n");
}
