import type { Bilingual, GrievanceStatus, TimelineEntry } from "../lib/types";

export type Lang = "en" | "hi";

export const statusLabels: Record<GrievanceStatus | "overdue" | "urgent", Bilingual> = {
  registered: { en: "Registered", hi: "दर्ज" },
  in_progress: { en: "In progress", hi: "कार्यवाही जारी" },
  resolved: { en: "Resolved", hi: "निस्तारित" },
  closed: { en: "Closed", hi: "बंद" },
  reopened: { en: "Reopened", hi: "पुनः खोली गई" },
  overdue: { en: "Overdue", hi: "समय सीमा पार" },
  urgent: { en: "Urgent", hi: "अत्यावश्यक" },
};

export const eventLabels: Record<TimelineEntry["event"], Bilingual> = {
  registered: { en: "Complaint registered", hi: "शिकायत दर्ज हुई" },
  assigned: { en: "Assigned to officer", hi: "अधिकारी को सौंपी गई" },
  note: { en: "Officer update", hi: "अधिकारी की टिप्पणी" },
  escalated: { en: "Escalated to a higher officer", hi: "उच्च अधिकारी को भेजी गई" },
  reminder: { en: "Reminder sent", hi: "अनुस्मारक भेजा गया" },
  resolved: { en: "Marked resolved", hi: "निस्तारित की गई" },
  feedback: { en: "Your feedback", hi: "आपकी प्रतिक्रिया" },
  reopened: { en: "Reopened by you", hi: "आपके द्वारा पुनः खोली गई" },
  closed: { en: "Closed", hi: "बंद की गई" },
  supported: { en: "Others joined", hi: "अन्य नागरिक जुड़े" },
};

export const typeLabels: Record<"complaint" | "demand" | "suggestion", Bilingual> = {
  complaint: { en: "Complaint", hi: "शिकायत" },
  demand: { en: "Demand", hi: "मांग" },
  suggestion: { en: "Suggestion", hi: "सुझाव" },
};
