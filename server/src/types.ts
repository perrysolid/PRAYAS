export type Bilingual = { en: string; hi: string };

export type Department = {
  id: string;
  name: Bilingual;
  categories: { id: string; name: Bilingual }[];
  /** Words people actually use, in English, Hindi and Hinglish. Used for triage. */
  keywords: string[];
};

export type District = {
  id: string;
  name: Bilingual;
  blocks: string[];
};

export type GrievanceType = "complaint" | "demand" | "suggestion";

export type GrievanceStatus = "registered" | "in_progress" | "resolved" | "closed" | "reopened";

export type Level = 1 | 2 | 3 | 4;

export type TimelineEntry = {
  at: string;
  event: "registered" | "assigned" | "note" | "escalated" | "reminder" | "resolved" | "feedback" | "reopened" | "closed" | "supported";
  by: string;
  note?: string;
  level?: Level;
};

/** A compressed photo kept with the record. Production would store it in object storage, not inline. */
export type Photo = { dataUrl: string; at: string; lat?: number; lon?: number };

export type Grievance = {
  id: string;
  citizenMobile: string;
  citizenName: string;
  type: GrievanceType;
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
  lastReminderAt?: string;
  feedback?: { rating: number; comment?: string; at: string };
  triage: { source: "ai" | "rules" | "citizen"; confidence: number };
  channel: "web" | "phone" | "app" | "whatsapp";
  /** Citizen's photo of the problem, and the officer's photo proving it was fixed. */
  photos?: { before?: Photo; after?: Photo };
  /** Mobiles of other citizens who said "I face this too" instead of filing a duplicate. */
  supporters?: string[];
};

export type GovernmentOrder = {
  id: string;
  /** null when the source page gives no date. */
  date: string | null;
  title: Bilingual;
  kind: "go" | "minutes";
  url: string;
};

export type CitizenSession = { role: "citizen"; mobile: string; name?: string };
export type OfficerSession = { role: "officer"; username: string; departmentId: string; level: Level; name: string };
export type Session = CitizenSession | OfficerSession;
