import { departments, levels, MAX_OPEN_GRIEVANCES } from "../data/catalog.js";
import { addDays, store } from "../data/store.js";
import { badRequest, conflict, forbidden, notFound } from "../lib/httpError.js";
import { maskMobile, maskName } from "../lib/mask.js";
import type { CitizenSession, Grievance, Level, OfficerSession, Photo } from "../types.js";
import type { TriageResult } from "./triage.service.js";

const HOUR = 60 * 60 * 1000;
const REMINDER_AFTER_DAYS = 7;
const REMINDER_COOLDOWN_HOURS = 72;
const REOPEN_WINDOW_DAYS = 30;

const isOpen = (g: Grievance) => g.status !== "resolved" && g.status !== "closed";

/** What the citizen may do next, computed on the server so the UI never shows an action that will fail. */
export function allowedActions(g: Grievance, now = Date.now()) {
  const ageDays = (now - new Date(g.submittedAt).getTime()) / (24 * HOUR);
  const sinceReminder = g.lastReminderAt ? (now - new Date(g.lastReminderAt).getTime()) / HOUR : Infinity;
  const sinceResolved = g.resolvedAt ? (now - new Date(g.resolvedAt).getTime()) / (24 * HOUR) : Infinity;

  let reminderAvailableAt: string | null = null;
  if (isOpen(g)) {
    const byAge = new Date(g.submittedAt).getTime() + REMINDER_AFTER_DAYS * 24 * HOUR;
    const byCooldown = g.lastReminderAt ? new Date(g.lastReminderAt).getTime() + REMINDER_COOLDOWN_HOURS * HOUR : 0;
    reminderAvailableAt = new Date(Math.max(byAge, byCooldown)).toISOString();
  }

  return {
    canRemind: isOpen(g) && ageDays >= REMINDER_AFTER_DAYS && sinceReminder >= REMINDER_COOLDOWN_HOURS,
    reminderAvailableAt,
    canGiveFeedback: g.status === "resolved" && !g.feedback,
    canReopen: (g.status === "resolved" || g.status === "closed") && sinceResolved <= REOPEN_WINDOW_DAYS,
    reopenUntil: g.resolvedAt ? addDays(g.resolvedAt, REOPEN_WINDOW_DAYS) : null,
  };
}

const supportCount = (g: Grievance) => g.supporters?.length ?? 0;

/** Full record for the owner or an officer. Supporter numbers are never sent, only the count. */
export function toDetail(g: Grievance) {
  const { supporters: _s, ...rest } = g;
  return { ...rest, citizenMobile: maskMobile(g.citizenMobile), currentOfficer: levels[g.level].title, actions: allowedActions(g), supportCount: supportCount(g) };
}

/** Public tracking view: status only, personal details masked. */
function toPublic(g: Grievance) {
  return {
    id: g.id,
    citizenName: maskName(g.citizenName),
    departmentId: g.departmentId,
    categoryId: g.categoryId,
    districtId: g.districtId,
    status: g.status,
    level: g.level,
    levelDueAt: g.levelDueAt,
    currentOfficer: levels[g.level].title,
    submittedAt: g.submittedAt,
    resolvedAt: g.resolvedAt,
    timeline: g.timeline.map(({ at, event, level }) => ({ at, event, level })),
    supportCount: supportCount(g),
    hasProof: Boolean(g.photos?.after),
    photos: g.photos?.after ? { before: g.photos.before, after: g.photos.after } : undefined,
  };
}

export type CreateGrievanceInput = {
  name: string;
  type: Grievance["type"];
  departmentId: string;
  categoryId: string;
  subject: string;
  description: string;
  districtId: string;
  block?: string;
  village?: string;
  triage?: Pick<TriageResult, "source" | "confidence" | "urgency">;
  photo?: Omit<Photo, "at">;
  whatsapp?: boolean;
  lang?: string;
};

export function create(session: CitizenSession, input: CreateGrievanceInput, channel: Grievance["channel"] = "web") {
  const dept = departments.find((d) => d.id === input.departmentId);
  if (!dept) throw badRequest("VALIDATION_FAILED", "Choose a department", { departmentId: "Choose a department" });
  if (!dept.categories.some((c) => c.id === input.categoryId)) {
    throw badRequest("VALIDATION_FAILED", "Choose a category", { categoryId: "Choose a category from the list" });
  }

  const open = store.grievances.all().filter((g) => g.citizenMobile === session.mobile && isOpen(g)).length;
  if (open >= MAX_OPEN_GRIEVANCES) {
    throw conflict("OPEN_LIMIT", `You already have ${open} unresolved complaints. Government rules allow ${MAX_OPEN_GRIEVANCES} at a time. Wait for one to be resolved, or call 1905.`);
  }

  const now = new Date().toISOString();
  const g: Grievance = {
    id: store.grievances.nextId(),
    citizenMobile: session.mobile,
    citizenName: input.name,
    type: input.type,
    departmentId: input.departmentId,
    categoryId: input.categoryId,
    subject: input.subject,
    description: input.description,
    districtId: input.districtId,
    block: input.block,
    village: input.village,
    urgency: input.triage?.urgency ?? "normal",
    status: "registered",
    level: 1,
    levelDueAt: addDays(now, levels[1].days),
    submittedAt: now,
    timeline: [
      { at: now, event: "registered", by: "Citizen" },
      { at: now, event: "assigned", by: "CM Helpline 1905", level: 1, note: `Assigned to ${levels[1].title.en}, ${dept.name.en}` },
    ],
    remindersSent: 0,
    triage: input.triage ? { source: input.triage.source, confidence: input.triage.confidence } : { source: "citizen", confidence: 1 },
    channel,
    whatsapp: input.whatsapp ?? true,
    lang: input.lang,
    notifiedUpTo: 0,
    photos: input.photo ? { before: { ...input.photo, at: now } } : undefined,
    supporters: [],
  };
  return toDetail(store.grievances.insert(g));
}

export function listMine(session: CitizenSession) {
  return store.grievances
    .all()
    .filter((g) => g.citizenMobile === session.mobile)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
    .map(toDetail);
}

function ownedBy(session: CitizenSession, id: string) {
  const g = store.grievances.find(id);
  if (!g) throw notFound("No complaint with that number");
  if (g.citizenMobile !== session.mobile) throw forbidden("This complaint was registered from a different mobile number");
  return g;
}

export const getMine = (session: CitizenSession, id: string) => toDetail(ownedBy(session, id));

/**
 * Public lookup needs the reference number and a linked mobile (the owner's, or one that joined with
 * "I face this too"), so numbers cannot be enumerated.
 */
export function track(id: string, mobile: string) {
  const g = store.grievances.find(id);
  if (!g || (g.citizenMobile !== mobile && !g.supporters?.includes(mobile))) throw notFound("We could not find a complaint with that number and mobile. Check both and try again.");
  return toPublic(g);
}

export function remind(session: CitizenSession, id: string) {
  const g = ownedBy(session, id);
  const actions = allowedActions(g);
  if (!actions.canRemind) {
    throw conflict("REMINDER_NOT_YET", actions.reminderAvailableAt ? `You can send a reminder from ${new Date(actions.reminderAvailableAt).toLocaleString("en-IN")}` : "This complaint is already resolved");
  }
  const now = new Date().toISOString();
  g.remindersSent += 1;
  g.lastReminderAt = now;
  g.timeline.push({ at: now, event: "reminder", by: "Citizen", level: g.level, note: `Reminder ${g.remindersSent} sent to ${levels[g.level].title.en}; visible to CM Office` });
  store.grievances.save(g);
  return toDetail(g);
}

export function giveFeedback(session: CitizenSession, id: string, rating: number, comment?: string) {
  const g = ownedBy(session, id);
  if (!allowedActions(g).canGiveFeedback) throw conflict("FEEDBACK_NOT_ALLOWED", "Feedback can be given once, after the complaint is resolved");
  const now = new Date().toISOString();
  g.feedback = { rating, comment, at: now };
  g.timeline.push({ at: now, event: "feedback", by: "Citizen", note: `Rated ${rating} of 5${comment ? `: ${comment}` : ""}` });
  if (rating >= 3) {
    g.status = "closed";
    g.timeline.push({ at: now, event: "closed", by: "System", note: "Closed with citizen's satisfaction" });
  }
  store.grievances.save(g);
  return toDetail(g);
}

/** Reopening sends the complaint one level higher, as the 1905 guidelines intend for unsatisfactory disposal. */
export function reopen(session: CitizenSession, id: string, reason: string) {
  const g = ownedBy(session, id);
  if (!allowedActions(g).canReopen) throw conflict("REOPEN_NOT_ALLOWED", `Complaints can be reopened within ${REOPEN_WINDOW_DAYS} days of resolution`);
  const now = new Date().toISOString();
  const next = Math.min(4, g.level + 1) as Level;
  g.status = "reopened";
  g.level = next;
  g.levelDueAt = addDays(now, levels[next].days);
  g.resolvedAt = undefined;
  g.timeline.push({ at: now, event: "reopened", by: "Citizen", level: next, note: reason });
  store.grievances.save(g);
  return toDetail(g);
}

/**
 * Open complaints about the same thing in the same place. Shown before registering so a citizen can
 * add their voice to an existing complaint instead of filing a duplicate that splits the officer's attention.
 */
export function similar(q: { departmentId: string; districtId: string; categoryId?: string; block?: string }) {
  return store.grievances
    .all()
    .filter((g) => isOpen(g) && g.departmentId === q.departmentId && g.districtId === q.districtId)
    .map((g) => ({ g, score: (q.categoryId && g.categoryId === q.categoryId ? 2 : 0) + (q.block && g.block === q.block ? 3 : 0) + Math.min(2, supportCount(g) / 10) }))
    .filter((x) => x.score >= 2)
    .sort((a, b) => b.score - a.score || b.g.submittedAt.localeCompare(a.g.submittedAt))
    .slice(0, 4)
    .map(({ g }) => ({
      id: g.id,
      subject: g.subject,
      categoryId: g.categoryId,
      block: g.block,
      village: g.village,
      status: g.status,
      level: g.level,
      submittedAt: g.submittedAt,
      supportCount: supportCount(g),
    }));
}

/** "I face this too": adds the citizen's voice to an open complaint. More supporters move it up the officer's queue. */
export function support(session: CitizenSession, id: string) {
  const g = store.grievances.find(id);
  if (!g) throw notFound("No complaint with that number");
  if (!isOpen(g)) throw conflict("ALREADY_RESOLVED", "This complaint is already resolved. If the problem is back, register a new complaint.");
  if (g.citizenMobile === session.mobile) throw conflict("OWN_COMPLAINT", "You registered this complaint yourself");
  g.supporters ??= [];
  if (!g.supporters.includes(session.mobile)) {
    g.supporters.push(session.mobile);
    // Log milestones, not every click, so the history stays readable.
    if ([1, 5, 10, 25, 50, 100].includes(g.supporters.length)) {
      g.timeline.push({ at: new Date().toISOString(), event: "supported", by: "Citizens", level: g.level, note: `${g.supporters.length} other ${g.supporters.length === 1 ? "citizen faces" : "citizens face"} the same problem` });
    }
    store.grievances.save(g);
  }
  return { id: g.id, supportCount: g.supporters.length, supported: true };
}

// Officer side

export function listForOfficer(officer: OfficerSession, filter: { status?: string }) {
  return store.grievances
    .all()
    .filter((g) => g.departmentId === officer.departmentId && g.level <= officer.level + 1)
    .filter((g) => (filter.status === "open" ? isOpen(g) : filter.status ? g.status === filter.status : true))
    .sort((a, b) => {
      const overdue = (g: Grievance) => (isOpen(g) && new Date(g.levelDueAt).getTime() < Date.now() + 2 * 24 * HOUR ? 1 : 0);
      // Overdue, then urgent, then complaints many citizens share, then oldest first.
      return (
        overdue(b) - overdue(a) ||
        (b.urgency === "high" ? 1 : 0) - (a.urgency === "high" ? 1 : 0) ||
        Math.min(3, Math.floor(supportCount(b) / 5)) - Math.min(3, Math.floor(supportCount(a) / 5)) ||
        a.submittedAt.localeCompare(b.submittedAt)
      );
    })
    .map(toDetail);
}

export function officerAct(officer: OfficerSession, id: string, action: "note" | "resolve", note: string, photo?: Omit<Photo, "at">) {
  const g = store.grievances.find(id);
  if (!g) throw notFound("No complaint with that number");
  if (g.departmentId !== officer.departmentId) throw forbidden("This complaint belongs to another department");
  if (!isOpen(g)) throw conflict("ALREADY_RESOLVED", "This complaint is already resolved");
  const now = new Date().toISOString();
  if (action === "resolve") {
    if (!photo) throw badRequest("VALIDATION_FAILED", "Attach a photo as proof", { photo: "Attach a photo that shows the problem is fixed" });
    g.status = "resolved";
    g.resolvedAt = now;
    g.photos = { ...g.photos, after: { ...photo, at: now } };
    g.timeline.push({ at: now, event: "resolved", by: officer.name, level: g.level, note });
  } else {
    if (g.status === "registered") g.status = "in_progress";
    g.timeline.push({ at: now, event: "note", by: officer.name, level: g.level, note });
  }
  store.grievances.save(g);
  return toDetail(g);
}
