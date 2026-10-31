export type Bilingual = { en: string; hi: string };
export type Level = 1 | 2 | 3 | 4;
export type GrievanceStatus = "registered" | "in_progress" | "resolved" | "closed" | "reopened";

export type Department = { id: string; name: Bilingual; categories: { id: string; name: Bilingual }[] };
export type District = { id: string; name: Bilingual; blocks: string[] };

export type Meta = {
  departments: Department[];
  districts: District[];
  levels: Record<Level, { title: Bilingual; days: number }>;
  maxOpenGrievances: number;
  aiTriage: boolean;
};

export type TimelineEntry = {
  at: string;
  event: "registered" | "assigned" | "note" | "escalated" | "reminder" | "resolved" | "feedback" | "reopened" | "closed" | "supported";
  by?: string;
  note?: string;
  level?: Level;
};

export type Actions = {
  canRemind: boolean;
  reminderAvailableAt: string | null;
  canGiveFeedback: boolean;
  canReopen: boolean;
  reopenUntil: string | null;
};

export type Photo = { dataUrl: string; at?: string; lat?: number; lon?: number };

export type Grievance = {
  id: string;
  citizenName: string;
  citizenMobile: string;
  type: "complaint" | "demand" | "suggestion";
  departmentId: string;
  categoryId: string;
  subject: string;
  description: string;
  districtId: string;
  block?: string;
  village?: string;
  urgency: "normal" | "high";
  status: GrievanceStatus;
  level: Level;
  levelDueAt: string;
  submittedAt: string;
  resolvedAt?: string;
  timeline: TimelineEntry[];
  remindersSent: number;
  feedback?: { rating: number; comment?: string; at: string };
  currentOfficer: Bilingual;
  actions: Actions;
  photos?: { before?: Photo; after?: Photo };
  supportCount: number;
  whatsapp?: boolean;
  channel?: "web" | "phone" | "app" | "whatsapp";
};

export type PublicGrievance = Pick<Grievance, "id" | "citizenName" | "departmentId" | "categoryId" | "districtId" | "status" | "level" | "levelDueAt" | "submittedAt" | "resolvedAt" | "timeline" | "currentOfficer" | "supportCount"> & { hasProof: boolean };

export type SimilarGrievance = Pick<Grievance, "id" | "subject" | "categoryId" | "block" | "village" | "status" | "level" | "submittedAt" | "supportCount">;

export type Triage = {
  departmentId: string;
  categoryId: string;
  urgency: "normal" | "high";
  centralMatter: boolean;
  confidence: number;
  source: "ai" | "rules";
  suggestedSubject: string;
};

export type Session =
  | { role: "citizen"; mobile: string; name?: string }
  | { role: "officer"; username: string; departmentId: string; level: Level; name: string };

export type Stats = {
  year: number;
  generatedAt: string;
  total: number;
  resolved: number;
  pending: number;
  overdue: number;
  avgResolutionDays: number | null;
  resolvedAtL1Pct: number | null;
  satisfactionPct: number | null;
  byDepartment: {
    id: string;
    name: Bilingual;
    total: number;
    resolved: number;
    pending: number;
    overdue: number;
    resolvedPct: number;
    onTimePct: number;
    avgDays: number | null;
    satisfaction: number | null;
    score: number;
    grade: "A" | "B" | "C" | "D";
  }[];
  byDistrict: { id: string; name: Bilingual; total: number; pending: number; resolved: number; overdue: number; resolvedPct: number | null; topIssue: string | null }[];
  byLevel: { level: Level; pending: number }[];
  hotspots: { id: string; subject: string; departmentId: string; districtId: string; block?: string; people: number; level: Level }[];
  citizensHeard: number;
};

export type GovernmentOrder = { id: string; date: string | null; title: Bilingual; kind: "go" | "minutes"; url: string };
