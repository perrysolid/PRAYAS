import { departments, districts, levels } from "../data/catalog.js";
import { store } from "../data/store.js";
import type { Grievance } from "../types.js";

const DAY = 24 * 60 * 60 * 1000;
const done = (g: Grievance) => g.status === "resolved" || g.status === "closed";
const daysToResolve = (g: Grievance) => (new Date(g.resolvedAt!).getTime() - new Date(g.submittedAt).getTime()) / DAY;
/** Resolved within the first officer's deadline, without needing escalation. */
const resolvedOnTime = (g: Grievance) => Boolean(g.resolvedAt) && daysToResolve(g) <= levels[1].days;

/**
 * Public transparency figures. Every number is derived from the same records,
 * so totals always add up (unlike the current portal, which shows 0 total and 24,901 pending).
 */
export function publicStats() {
  const all = store.grievances.all();
  const year = new Date().getFullYear();
  const thisYear = all.filter((g) => new Date(g.submittedAt).getFullYear() === year);

  const resolved = thisYear.filter(done);
  const pending = thisYear.filter((g) => !done(g));
  const overdue = pending.filter((g) => new Date(g.levelDueAt).getTime() < Date.now());
  const resolutionDays = resolved.filter((g) => g.resolvedAt).map((g) => (new Date(g.resolvedAt!).getTime() - new Date(g.submittedAt).getTime()) / DAY);
  const rated = thisYear.filter((g) => g.feedback);

  const byDepartment = departments
    .map((d) => {
      const rows = thisYear.filter((g) => g.departmentId === d.id);
      const solved = rows.filter(done);
      const onTime = solved.filter(resolvedOnTime).length;
      const ratings = rows.filter((g) => g.feedback).map((g) => g.feedback!.rating);
      const days = solved.filter((g) => g.resolvedAt).map(daysToResolve);
      const resolvedPct = rows.length ? Math.round((solved.length / rows.length) * 100) : 0;
      const onTimePct = solved.length ? Math.round((onTime / solved.length) * 100) : 0;
      // Scorecard: half on-time resolution, a third share resolved, the rest citizen satisfaction (neutral when unrated).
      const satisfaction = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
      const score = Math.round(onTimePct * 0.5 + resolvedPct * 0.3 + ((satisfaction ?? 3) / 5) * 100 * 0.2);
      return {
        id: d.id,
        name: d.name,
        total: rows.length,
        resolved: solved.length,
        pending: rows.length - solved.length,
        overdue: rows.filter((g) => !done(g) && new Date(g.levelDueAt).getTime() < Date.now()).length,
        resolvedPct,
        onTimePct,
        avgDays: days.length ? Number((days.reduce((a, b) => a + b, 0) / days.length).toFixed(1)) : null,
        satisfaction: satisfaction === null ? null : Number(satisfaction.toFixed(1)),
        score,
        grade: score >= 80 ? "A" : score >= 65 ? "B" : score >= 50 ? "C" : "D",
      };
    })
    .filter((d) => d.total > 0)
    .sort((a, b) => b.total - a.total);

  const byDistrict = districts.map((d) => {
    const rows = thisYear.filter((g) => g.districtId === d.id);
    const open = rows.filter((g) => !done(g));
    const topDept = departments
      .map((dept) => ({ id: dept.id, n: open.filter((g) => g.departmentId === dept.id).length }))
      .sort((a, b) => b.n - a.n)[0];
    return {
      id: d.id,
      name: d.name,
      total: rows.length,
      pending: open.length,
      resolved: rows.length - open.length,
      overdue: open.filter((g) => new Date(g.levelDueAt).getTime() < Date.now()).length,
      resolvedPct: rows.length ? Math.round(((rows.length - open.length) / rows.length) * 100) : null,
      topIssue: topDept && topDept.n > 0 ? topDept.id : null,
    };
  });

  // Problems many citizens share: the clearest signal of where a single fix helps the most people.
  const hotspots = all
    .filter((g) => !done(g) && (g.supporters?.length ?? 0) > 0)
    .sort((a, b) => (b.supporters?.length ?? 0) - (a.supporters?.length ?? 0))
    .slice(0, 5)
    .map((g) => ({ id: g.id, subject: g.subject, departmentId: g.departmentId, districtId: g.districtId, block: g.block, people: 1 + (g.supporters?.length ?? 0), level: g.level }));

  const byLevel = ([1, 2, 3, 4] as const).map((level) => ({ level, pending: pending.filter((g) => g.level === level).length }));

  return {
    year,
    generatedAt: new Date().toISOString(),
    total: thisYear.length,
    resolved: resolved.length,
    pending: pending.length,
    overdue: overdue.length,
    avgResolutionDays: resolutionDays.length ? Number((resolutionDays.reduce((a, b) => a + b, 0) / resolutionDays.length).toFixed(1)) : null,
    resolvedAtL1Pct: resolved.length ? Math.round((resolved.filter((g) => g.level === 1).length / resolved.length) * 100) : null,
    satisfactionPct: rated.length ? Math.round((rated.filter((g) => g.feedback!.rating >= 3).length / rated.length) * 100) : null,
    byDepartment,
    byDistrict,
    byLevel,
    hotspots,
    citizensHeard: thisYear.reduce((n, g) => n + 1 + (g.supporters?.length ?? 0), 0),
  };
}
