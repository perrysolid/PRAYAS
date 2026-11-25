import type { SearchResult } from "./types";

type Text = { en: string; hi: string };
type Step = { day: number; en: string; hi: string };
type Case = {
  departmentId: string;
  category: Text;
  problem: string;
  days: number;
  escalations: number;
  proof: boolean;
  rating: number | null;
  keywords: string[];
  steps: Step[];
};

/** Small made-up data for testing the search without the server. Not real complaints. */
const departments: { id: string; name: Text; keywords: string[] }[] = [
  { id: "water", name: { en: "Drinking Water (Jal Sansthan)", hi: "पेयजल (जल संस्थान)" }, keywords: ["water", "pani", "पानी", "tap", "nal", "pipeline", "supply", "drinking", "jal"] },
  { id: "energy", name: { en: "Energy (UPCL)", hi: "ऊर्जा (यूपीसीएल)" }, keywords: ["electricity", "power", "light", "bijli", "बिजली", "transformer", "voltage", "bill", "meter"] },
  { id: "pwd", name: { en: "Public Works (PWD)", hi: "लोक निर्माण विभाग" }, keywords: ["road", "sadak", "सड़क", "pothole", "bridge", "landslide", "debris", "damaged"] },
  { id: "social-welfare", name: { en: "Social Welfare", hi: "समाज कल्याण" }, keywords: ["pension", "पेंशन", "widow", "old age", "scholarship", "वृद्धावस्था"] },
  { id: "food", name: { en: "Food and Civil Supplies", hi: "खाद्य एवं नागरिक आपूर्ति" }, keywords: ["ration", "राशन", "card", "dealer", "wheat", "rice"] },
  { id: "health", name: { en: "Health", hi: "स्वास्थ्य" }, keywords: ["hospital", "doctor", "medicine", "ambulance", "अस्पताल", "डॉक्टर", "health"] },
  { id: "revenue", name: { en: "Revenue", hi: "राजस्व" }, keywords: ["certificate", "land", "khatauni", "mutation", "प्रमाण", "domicile", "income", "caste"] },
];

const cases: Case[] = [
  {
    departmentId: "water", category: { en: "No water supply", hi: "पानी की आपूर्ति नहीं" }, problem: "No drinking water supply in our ward for 9 days", days: 6, escalations: 0, proof: true, rating: 4,
    keywords: ["water", "supply", "drinking", "ward", "tap"],
    steps: [
      { day: 0, en: "Complaint registered", hi: "शिकायत दर्ज हुई" },
      { day: 1, en: "Sent to the block or tehsil officer", hi: "विकासखंड / तहसील अधिकारी को भेजी गई" },
      { day: 3, en: "Citizen sent a reminder", hi: "नागरिक ने अनुस्मारक भेजा" },
      { day: 6, en: "Officer marked it resolved with photo proof", hi: "अधिकारी ने फ़ोटो प्रमाण सहित निस्तारित किया" },
      { day: 6, en: "Citizen rated the action 4 out of 5", hi: "नागरिक ने कार्यवाही को 5 में से 4 रेट किया" },
    ],
  },
  {
    departmentId: "water", category: { en: "Pipeline leakage", hi: "पाइपलाइन रिसाव" }, problem: "Main pipeline leaking near the village school, water wasted daily", days: 11, escalations: 1, proof: true, rating: 5,
    keywords: ["pipeline", "leak", "leakage", "water", "school", "pipe"],
    steps: [
      { day: 0, en: "Complaint registered", hi: "शिकायत दर्ज हुई" },
      { day: 1, en: "Sent to the block or tehsil officer", hi: "विकासखंड / तहसील अधिकारी को भेजी गई" },
      { day: 8, en: "Moved up to the district officer as the time limit passed", hi: "समय सीमा बीतने पर जनपद स्तरीय अधिकारी को भेजी गई" },
      { day: 11, en: "Officer marked it resolved with photo proof", hi: "अधिकारी ने फ़ोटो प्रमाण सहित निस्तारित किया" },
      { day: 11, en: "Citizen rated the action 5 out of 5", hi: "नागरिक ने कार्यवाही को 5 में से 5 रेट किया" },
    ],
  },
  {
    departmentId: "energy", category: { en: "Faulty transformer or line", hi: "खराब ट्रांसफार्मर या लाइन" }, problem: "Transformer burnt, no electricity in the hamlet for a week", days: 8, escalations: 0, proof: true, rating: 4,
    keywords: ["transformer", "electricity", "power", "light", "burnt", "bijli"],
    steps: [
      { day: 0, en: "Complaint registered", hi: "शिकायत दर्ज हुई" },
      { day: 1, en: "Sent to the block or tehsil officer", hi: "विकासखंड / तहसील अधिकारी को भेजी गई" },
      { day: 8, en: "Officer marked it resolved with photo proof", hi: "अधिकारी ने फ़ोटो प्रमाण सहित निस्तारित किया" },
      { day: 8, en: "Citizen rated the action 4 out of 5", hi: "नागरिक ने कार्यवाही को 5 में से 4 रेट किया" },
    ],
  },
  {
    departmentId: "energy", category: { en: "Wrong or inflated bill", hi: "गलत या अधिक बिल" }, problem: "Electricity bill is three times higher than usual", days: 13, escalations: 0, proof: false, rating: 3,
    keywords: ["bill", "electricity", "meter", "high", "inflated"],
    steps: [
      { day: 0, en: "Complaint registered", hi: "शिकायत दर्ज हुई" },
      { day: 2, en: "Sent to the block or tehsil officer", hi: "विकासखंड / तहसील अधिकारी को भेजी गई" },
      { day: 13, en: "Officer marked it resolved", hi: "अधिकारी ने निस्तारित किया" },
      { day: 13, en: "Citizen rated the action 3 out of 5", hi: "नागरिक ने कार्यवाही को 5 में से 3 रेट किया" },
    ],
  },
  {
    departmentId: "pwd", category: { en: "Road blocked by debris", hi: "मलबे से सड़क बंद" }, problem: "Road to the village blocked by debris after heavy rain", days: 4, escalations: 0, proof: true, rating: 5,
    keywords: ["road", "debris", "blocked", "rain", "landslide", "village"],
    steps: [
      { day: 0, en: "Complaint registered", hi: "शिकायत दर्ज हुई" },
      { day: 1, en: "Sent to the block or tehsil officer", hi: "विकासखंड / तहसील अधिकारी को भेजी गई" },
      { day: 4, en: "Officer marked it resolved with photo proof", hi: "अधिकारी ने फ़ोटो प्रमाण सहित निस्तारित किया" },
      { day: 4, en: "Citizen rated the action 5 out of 5", hi: "नागरिक ने कार्यवाही को 5 में से 5 रेट किया" },
    ],
  },
  {
    departmentId: "pwd", category: { en: "Damaged road or potholes", hi: "क्षतिग्रस्त सड़क या गड्ढे" }, problem: "Potholes on the main market road, two accidents already", days: 19, escalations: 1, proof: true, rating: 4,
    keywords: ["pothole", "potholes", "road", "damaged", "market", "accident"],
    steps: [
      { day: 0, en: "Complaint registered", hi: "शिकायत दर्ज हुई" },
      { day: 1, en: "Sent to the block or tehsil officer", hi: "विकासखंड / तहसील अधिकारी को भेजी गई" },
      { day: 9, en: "Citizen sent a reminder", hi: "नागरिक ने अनुस्मारक भेजा" },
      { day: 16, en: "Moved up to the district officer as the time limit passed", hi: "समय सीमा बीतने पर जनपद स्तरीय अधिकारी को भेजी गई" },
      { day: 19, en: "Officer marked it resolved with photo proof", hi: "अधिकारी ने फ़ोटो प्रमाण सहित निस्तारित किया" },
    ],
  },
  {
    departmentId: "social-welfare", category: { en: "Pension not received", hi: "पेंशन नहीं मिली" }, problem: "Old age pension not received for four months", days: 12, escalations: 0, proof: false, rating: 4,
    keywords: ["pension", "old", "age", "received", "months", "widow"],
    steps: [
      { day: 0, en: "Complaint registered", hi: "शिकायत दर्ज हुई" },
      { day: 2, en: "Sent to the block or tehsil officer", hi: "विकासखंड / तहसील अधिकारी को भेजी गई" },
      { day: 12, en: "Officer marked it resolved", hi: "अधिकारी ने निस्तारित किया" },
      { day: 12, en: "Citizen rated the action 4 out of 5", hi: "नागरिक ने कार्यवाही को 5 में से 4 रेट किया" },
    ],
  },
  {
    departmentId: "food", category: { en: "Ration not received", hi: "राशन नहीं मिला" }, problem: "Ration dealer not giving the monthly ration", days: 7, escalations: 0, proof: false, rating: 5,
    keywords: ["ration", "dealer", "monthly", "card", "wheat"],
    steps: [
      { day: 0, en: "Complaint registered", hi: "शिकायत दर्ज हुई" },
      { day: 1, en: "Sent to the block or tehsil officer", hi: "विकासखंड / तहसील अधिकारी को भेजी गई" },
      { day: 7, en: "Officer marked it resolved", hi: "अधिकारी ने निस्तारित किया" },
      { day: 7, en: "Citizen rated the action 5 out of 5", hi: "नागरिक ने कार्यवाही को 5 में से 5 रेट किया" },
    ],
  },
  {
    departmentId: "health", category: { en: "Medicines not available", hi: "दवाइयाँ उपलब्ध नहीं" }, problem: "No doctor and no medicines at the primary health centre", days: 10, escalations: 1, proof: false, rating: 4,
    keywords: ["doctor", "medicine", "medicines", "hospital", "health", "centre"],
    steps: [
      { day: 0, en: "Complaint registered", hi: "शिकायत दर्ज हुई" },
      { day: 1, en: "Sent to the block or tehsil officer", hi: "विकासखंड / तहसील अधिकारी को भेजी गई" },
      { day: 8, en: "Moved up to the district officer as the time limit passed", hi: "समय सीमा बीतने पर जनपद स्तरीय अधिकारी को भेजी गई" },
      { day: 10, en: "Officer marked it resolved", hi: "अधिकारी ने निस्तारित किया" },
    ],
  },
  {
    departmentId: "revenue", category: { en: "Certificate delayed or rejected", hi: "प्रमाण पत्र में देरी या अस्वीकृति" }, problem: "Income certificate pending at the tehsil for a month", days: 9, escalations: 0, proof: false, rating: 4,
    keywords: ["certificate", "income", "tehsil", "pending", "caste", "domicile"],
    steps: [
      { day: 0, en: "Complaint registered", hi: "शिकायत दर्ज हुई" },
      { day: 1, en: "Sent to the block or tehsil officer", hi: "विकासखंड / तहसील अधिकारी को भेजी गई" },
      { day: 9, en: "Officer marked it resolved", hi: "अधिकारी ने निस्तारित किया" },
      { day: 9, en: "Citizen rated the action 4 out of 5", hi: "नागरिक ने कार्यवाही को 5 में से 4 रेट किया" },
    ],
  },
];

const words = (s: string) => s.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 3);

export function sampleSearch(rawQuery: string): SearchResult {
  const q = rawQuery.trim().toLowerCase();
  const ws = words(q);
  const deptScore = (id: string) => {
    const d = departments.find((x) => x.id === id)!;
    return ws.filter((w) => d.keywords.some((k) => k.includes(w) || w.includes(k)) || d.name.en.toLowerCase().includes(w)).length;
  };

  const depts = departments
    .map((d) => ({ d, s: deptScore(d.id) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 4)
    .map(({ d }) => ({ id: d.id, name: d.name, categories: [] as string[] }));

  const found = cases
    .map((c) => ({ c, s: ws.filter((w) => c.keywords.some((k) => k.includes(w) || w.includes(k)) || c.problem.toLowerCase().includes(w)).length + deptScore(c.departmentId) }))
    .filter((x) => x.s >= 2)
    .sort((a, b) => b.s - a.s)
    .slice(0, 4)
    .map(({ c }) => ({
      departmentId: c.departmentId,
      department: departments.find((d) => d.id === c.departmentId)!.name,
      category: c.category,
      problem: c.problem,
      days: c.days,
      escalations: c.escalations,
      reopened: false,
      proof: c.proof,
      rating: c.rating,
      steps: c.steps,
    }));

  const days = found.map((c) => c.days).sort((a, b) => a - b);
  return {
    query: q,
    departments: depts,
    cases: found,
    summary: found.length ? { count: found.length, fastest: days[0], slowest: days[days.length - 1], median: days[Math.floor(days.length / 2)], withoutEscalation: found.filter((c) => c.escalations === 0).length } : null,
  };
}
