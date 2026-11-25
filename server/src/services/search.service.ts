import { departments, districts, levels } from "../data/catalog.js";
import { store } from "../data/store.js";
import type { Grievance, Level } from "../types.js";
import { triageWithRules } from "./triage.service.js";

const DAY = 24 * 60 * 60 * 1000;
const done = (g: Grievance) => g.status === "resolved" || g.status === "closed";
const STOP = new Set(["the", "and", "for", "not", "has", "have", "from", "with", "this", "that", "are", "was", "days", "day", "since", "from", "there", "our", "any", "no", "is", "in", "my", "के", "में", "से", "को", "है", "का", "की", "नहीं", "और"]);
const tokens = (text: string) => text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 3 && !STOP.has(w));
const dayOf = (g: Grievance, at: string) => Math.max(0, Math.round((new Date(at).getTime() - new Date(g.submittedAt).getTime()) / DAY));

/** No phone numbers, long ids or other digit runs ever leave the server in a shared case. */
const scrub = (text: string) => text.replace(/\d{4,}/g, "…").replace(/\s+/g, " ").trim().slice(0, 140);

/** What happened to a complaint, in plain words, without officers' names or their notes. */
function stepsOf(g: Grievance) {
  const steps: { day: number; en: string; hi: string }[] = [{ day: 0, en: "Complaint registered", hi: "शिकायत दर्ज हुई" }];
  for (const e of g.timeline) {
    const day = dayOf(g, e.at);
    const lvl = e.level ? levels[e.level as Level]?.title : undefined;
    if (e.event === "assigned") steps.push({ day, en: `Sent to the ${lvl?.en.toLowerCase() ?? "responsible officer"}`, hi: `${lvl?.hi ?? "संबंधित अधिकारी"} को भेजी गई` });
    else if (e.event === "escalated") steps.push({ day, en: `Moved up to the ${lvl?.en.toLowerCase() ?? "next officer"} as the time limit passed`, hi: `समय सीमा बीतने पर ${lvl?.hi ?? "अगले अधिकारी"} को भेजी गई` });
    else if (e.event === "reminder") steps.push({ day, en: "Citizen sent a reminder", hi: "नागरिक ने अनुस्मारक भेजा" });
    else if (e.event === "resolved") steps.push({ day, en: g.photos?.after ? "Officer marked it resolved with photo proof" : "Officer marked it resolved", hi: g.photos?.after ? "अधिकारी ने फ़ोटो प्रमाण सहित निस्तारित किया" : "अधिकारी ने निस्तारित किया" });
    else if (e.event === "reopened") steps.push({ day, en: "Citizen reopened it as the problem remained", hi: "समस्या बनी रहने पर नागरिक ने पुनः खोली" });
    else if (e.event === "feedback" && g.feedback) steps.push({ day, en: `Citizen rated the action ${g.feedback.rating} out of 5`, hi: `नागरिक ने कार्यवाही को 5 में से ${g.feedback.rating} रेट किया` });
  }
  return steps;
}

/**
 * Search for departments and for how similar complaints were handled before.
 * Shared cases are anonymous: no name, mobile, village or officer, only the problem, the steps and how long it took.
 */
export function search(rawQuery: string) {
  const q = rawQuery.trim().toLowerCase().slice(0, 200);
  const words = tokens(q);
  if (!words.length) return { query: q, departments: [], cases: [], summary: null };

  const guess = triageWithRules(q);
  const guessed = guess.confidence >= 0.5 ? guess : null;

  const matchedDepartments = departments
    .filter((d) => d.id !== "other")
    .map((d) => {
      const haystack = [d.name.en, d.name.hi, ...d.keywords, ...d.categories.flatMap((c) => [c.name.en, c.name.hi])].join(" ").toLowerCase();
      const hits = words.filter((w) => haystack.includes(w)).length;
      const score = hits + (guessed?.departmentId === d.id ? 3 : 0);
      const categories = d.categories.filter((c) => words.some((w) => `${c.name.en} ${c.name.hi}`.toLowerCase().includes(w))).map((c) => c.id);
      return { id: d.id, name: d.name, score, categories };
    })
    .filter((d) => d.score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(({ score: _s, ...d }) => d);

  const cases = store.grievances
    .all()
    .filter((g) => done(g) && g.resolvedAt)
    .map((g) => {
      const text = `${g.subject} ${g.description}`.toLowerCase();
      const overlap = words.filter((w) => text.includes(w)).length;
      const score = overlap + (guessed?.departmentId === g.departmentId ? 2 : 0) + (guessed?.categoryId === g.categoryId && guessed?.departmentId === g.departmentId ? 2 : 0);
      return { g, score };
    })
    .filter((x) => x.score >= 3)
    .sort((a, b) => b.score - a.score || b.g.resolvedAt!.localeCompare(a.g.resolvedAt!))
    .slice(0, 5)
    .map(({ g }) => {
      const dept = departments.find((d) => d.id === g.departmentId);
      const cat = dept?.categories.find((c) => c.id === g.categoryId);
      const district = districts.find((d) => d.id === g.districtId);
      return {
        departmentId: g.departmentId,
        department: dept?.name,
        category: cat?.name,
        district: district?.name,
        problem: scrub(g.subject),
        days: dayOf(g, g.resolvedAt!),
        escalations: g.timeline.filter((e) => e.event === "escalated").length,
        reopened: g.timeline.some((e) => e.event === "reopened"),
        proof: Boolean(g.photos?.after),
        rating: g.feedback?.rating ?? null,
        steps: stepsOf(g),
      };
    });

  const days = cases.map((c) => c.days).sort((a, b) => a - b);
  const summary = cases.length
    ? {
        count: cases.length,
        fastest: days[0],
        slowest: days[days.length - 1],
        median: days[Math.floor(days.length / 2)],
        withoutEscalation: cases.filter((c) => c.escalations === 0).length,
      }
    : null;

  return { query: q, departments: matchedDepartments, cases, summary };
}
