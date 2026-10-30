import type { Department, District, GovernmentOrder, Level } from "../types.js";

export const departments: Department[] = [
  {
    id: "energy",
    name: { en: "Energy (UPCL)", hi: "ऊर्जा (यूपीसीएल)" },
    keywords: ["electricity", "power", "bijli", "बिजली", "light", "voltage", "transformer", "meter", "bill", "current", "करंट", "ट्रांसफार्मर", "मीटर", "बिल", "upcl", "power cut", "बत्ती"],
    categories: [
      { id: "no-supply", name: { en: "No power supply", hi: "बिजली आपूर्ति बंद" } },
      { id: "voltage", name: { en: "Low or fluctuating voltage", hi: "कम या अस्थिर वोल्टेज" } },
      { id: "billing", name: { en: "Wrong or inflated bill", hi: "गलत या अधिक बिल" } },
      { id: "connection", name: { en: "New connection delayed", hi: "नए कनेक्शन में देरी" } },
      { id: "transformer", name: { en: "Faulty transformer or line", hi: "खराब ट्रांसफार्मर या लाइन" } },
    ],
  },
  {
    id: "water",
    name: { en: "Drinking Water (Jal Sansthan)", hi: "पेयजल (जल संस्थान)" },
    keywords: ["water", "paani", "pani", "पानी", "पेयजल", "tap", "nal", "नल", "pipeline", "पाइपलाइन", "leak", "dirty water", "गंदा पानी", "har ghar jal", "हर घर जल", "jal"],
    categories: [
      { id: "no-supply", name: { en: "No water supply", hi: "पानी की आपूर्ति नहीं" } },
      { id: "contaminated", name: { en: "Dirty or contaminated water", hi: "गंदा या दूषित पानी" } },
      { id: "leakage", name: { en: "Pipeline leakage", hi: "पाइपलाइन रिसाव" } },
      { id: "connection", name: { en: "Tap connection (Har Ghar Jal)", hi: "नल कनेक्शन (हर घर जल)" } },
    ],
  },
  {
    id: "pwd",
    name: { en: "Public Works (Roads & Bridges)", hi: "लोक निर्माण (सड़क एवं पुल)" },
    keywords: ["road", "sadak", "सड़क", "pothole", "गड्ढा", "bridge", "pul", "पुल", "debris", "malba", "मलबा", "blocked road", "motor marg", "मोटर मार्ग", "culvert"],
    categories: [
      { id: "damaged", name: { en: "Damaged road or potholes", hi: "क्षतिग्रस्त सड़क या गड्ढे" } },
      { id: "blocked", name: { en: "Road blocked by debris", hi: "मलबे से सड़क बंद" } },
      { id: "bridge", name: { en: "Bridge or culvert", hi: "पुल या पुलिया" } },
      { id: "construction", name: { en: "Construction delayed or poor quality", hi: "निर्माण में देरी या घटिया गुणवत्ता" } },
    ],
  },
  {
    id: "revenue",
    name: { en: "Revenue", hi: "राजस्व" },
    keywords: ["land", "zameen", "ज़मीन", "जमीन", "khatauni", "खतौनी", "mutation", "dakhil kharij", "दाखिल खारिज", "patwari", "पटवारी", "tehsil", "तहसील", "certificate", "प्रमाण पत्र", "encroachment", "अतिक्रमण", "kabza", "कब्जा", "income certificate", "caste certificate", "domicile"],
    categories: [
      { id: "certificate", name: { en: "Certificate delayed or rejected", hi: "प्रमाण पत्र में देरी या अस्वीकृति" } },
      { id: "land-records", name: { en: "Land records / Khatauni", hi: "भू-अभिलेख / खतौनी" } },
      { id: "mutation", name: { en: "Mutation (Dakhil-kharij)", hi: "दाखिल-खारिज" } },
      { id: "encroachment", name: { en: "Encroachment on land", hi: "भूमि पर अतिक्रमण" } },
    ],
  },
  {
    id: "food",
    name: { en: "Food & Civil Supplies", hi: "खाद्य एवं नागरिक आपूर्ति" },
    keywords: ["ration", "राशन", "ration card", "राशन कार्ड", "kotedar", "कोटेदार", "dealer", "anaj", "अनाज", "wheat", "rice", "गेहूं", "चावल", "pds"],
    categories: [
      { id: "card", name: { en: "Ration card issue", hi: "राशन कार्ड संबंधी" } },
      { id: "not-received", name: { en: "Ration not received", hi: "राशन नहीं मिला" } },
      { id: "dealer", name: { en: "Ration dealer misconduct", hi: "राशन विक्रेता का दुर्व्यवहार" } },
    ],
  },
  {
    id: "social-welfare",
    name: { en: "Social Welfare", hi: "समाज कल्याण" },
    keywords: ["pension", "पेंशन", "old age", "वृद्धावस्था", "widow", "विधवा", "divyang", "दिव्यांग", "disability", "scholarship", "छात्रवृत्ति", "vridha"],
    categories: [
      { id: "pension", name: { en: "Pension not received", hi: "पेंशन नहीं मिली" } },
      { id: "pension-new", name: { en: "New pension application pending", hi: "नई पेंशन आवेदन लंबित" } },
      { id: "scholarship", name: { en: "Scholarship", hi: "छात्रवृत्ति" } },
    ],
  },
  {
    id: "health",
    name: { en: "Medical Health & Family Welfare", hi: "चिकित्सा स्वास्थ्य एवं परिवार कल्याण" },
    keywords: ["hospital", "अस्पताल", "aspatal", "doctor", "डॉक्टर", "medicine", "दवा", "dawai", "ambulance", "एम्बुलेंस", "108", "ayushman", "आयुष्मान", "phc", "nurse", "treatment", "इलाज"],
    categories: [
      { id: "staff", name: { en: "Doctor or staff absent", hi: "डॉक्टर या कर्मचारी अनुपस्थित" } },
      { id: "medicines", name: { en: "Medicines not available", hi: "दवाइयाँ उपलब्ध नहीं" } },
      { id: "ambulance", name: { en: "Ambulance (108) delay", hi: "एम्बुलेंस (108) में देरी" } },
      { id: "ayushman", name: { en: "Atal Ayushman card or claim", hi: "अटल आयुष्मान कार्ड या दावा" } },
    ],
  },
  {
    id: "education",
    name: { en: "School Education", hi: "विद्यालयी शिक्षा" },
    keywords: ["school", "स्कूल", "vidyalaya", "विद्यालय", "teacher", "शिक्षक", "adhyapak", "mid day meal", "मध्याह्न भोजन", "admission", "दाखिला", "books", "uniform"],
    categories: [
      { id: "teacher", name: { en: "Teacher absent or shortage", hi: "शिक्षक अनुपस्थित या कमी" } },
      { id: "mdm", name: { en: "Mid-day meal", hi: "मध्याह्न भोजन" } },
      { id: "infrastructure", name: { en: "School building or facilities", hi: "विद्यालय भवन या सुविधाएँ" } },
    ],
  },
  {
    id: "police",
    name: { en: "Home (Police)", hi: "गृह (पुलिस)" },
    keywords: ["police", "पुलिस", "fir", "एफआईआर", "thana", "थाना", "theft", "chori", "चोरी", "harassment", "उत्पीड़न", "cyber", "साइबर", "fraud", "धोखाधड़ी", "threat", "धमकी"],
    categories: [
      { id: "fir", name: { en: "FIR not registered", hi: "एफआईआर दर्ज नहीं हुई" } },
      { id: "cyber", name: { en: "Cyber or online fraud", hi: "साइबर या ऑनलाइन धोखाधड़ी" } },
      { id: "harassment", name: { en: "Harassment or threat", hi: "उत्पीड़न या धमकी" } },
      { id: "traffic", name: { en: "Traffic and parking", hi: "यातायात एवं पार्किंग" } },
    ],
  },
  {
    id: "urban",
    name: { en: "Urban Development (Nagar Nigam)", hi: "शहरी विकास (नगर निगम)" },
    keywords: ["garbage", "कूड़ा", "kuda", "kachra", "कचरा", "street light", "स्ट्रीट लाइट", "drain", "naali", "नाली", "sewer", "सीवर", "stray", "आवारा", "nagar nigam", "नगर निगम", "municipal", "safai", "सफाई"],
    categories: [
      { id: "garbage", name: { en: "Garbage not collected", hi: "कूड़ा नहीं उठाया गया" } },
      { id: "streetlight", name: { en: "Street light not working", hi: "स्ट्रीट लाइट खराब" } },
      { id: "drainage", name: { en: "Blocked drain or sewer", hi: "नाली या सीवर जाम" } },
      { id: "stray", name: { en: "Stray animals", hi: "आवारा पशु" } },
    ],
  },
  {
    id: "rural",
    name: { en: "Rural Development & Panchayati Raj", hi: "ग्राम्य विकास एवं पंचायती राज" },
    keywords: ["mnrega", "manrega", "मनरेगा", "wages", "मजदूरी", "awas", "आवास", "pmay", "gram panchayat", "ग्राम पंचायत", "pradhan", "प्रधान", "village", "गाँव", "gaon", "family register", "परिवार रजिस्टर"],
    categories: [
      { id: "mgnrega", name: { en: "MGNREGA wages pending", hi: "मनरेगा मजदूरी लंबित" } },
      { id: "housing", name: { en: "PM Awas (Gramin)", hi: "प्रधानमंत्री आवास (ग्रामीण)" } },
      { id: "panchayat", name: { en: "Gram Panchayat works", hi: "ग्राम पंचायत कार्य" } },
    ],
  },
  {
    id: "forest",
    name: { en: "Forest & Wildlife", hi: "वन एवं वन्यजीव" },
    keywords: ["forest", "जंगल", "jungle", "van", "वन", "leopard", "guldar", "गुलदार", "bear", "भालू", "monkey", "बंदर", "wild boar", "सुअर", "wildlife", "fire", "आग", "elephant", "हाथी", "crop damage"],
    categories: [
      { id: "attack", name: { en: "Wild animal attack or threat", hi: "वन्यजीव हमला या खतरा" } },
      { id: "crop", name: { en: "Crop damage by animals", hi: "जानवरों द्वारा फसल नुकसान" } },
      { id: "fire", name: { en: "Forest fire", hi: "वनाग्नि" } },
    ],
  },
  {
    id: "agriculture",
    name: { en: "Agriculture & Horticulture", hi: "कृषि एवं उद्यान" },
    keywords: ["farmer", "किसान", "kisan", "crop", "फसल", "fasal", "seed", "बीज", "fertiliser", "खाद", "khad", "insurance", "बीमा", "orchard", "बागवानी"],
    categories: [
      { id: "inputs", name: { en: "Seeds or fertiliser", hi: "बीज या खाद" } },
      { id: "insurance", name: { en: "Crop insurance claim", hi: "फसल बीमा दावा" } },
      { id: "subsidy", name: { en: "Subsidy not received", hi: "अनुदान नहीं मिला" } },
    ],
  },
  {
    id: "disaster",
    name: { en: "Disaster Management", hi: "आपदा प्रबंधन" },
    keywords: ["landslide", "भूस्खलन", "cloudburst", "बादल फटना", "flood", "बाढ़", "baadh", "relief", "राहत", "compensation", "मुआवजा", "muavza", "disaster", "आपदा", "house damaged", "मकान क्षतिग्रस्त"],
    categories: [
      { id: "relief", name: { en: "Relief or compensation pending", hi: "राहत या मुआवजा लंबित" } },
      { id: "danger", name: { en: "Landslide or danger zone", hi: "भूस्खलन या खतरे का क्षेत्र" } },
    ],
  },
  {
    id: "transport",
    name: { en: "Transport", hi: "परिवहन" },
    keywords: ["bus", "बस", "roadways", "रोडवेज", "driving licence", "licence", "लाइसेंस", "rto", "vehicle", "वाहन", "taxi", "overcharging", "किराया", "fare"],
    categories: [
      { id: "bus", name: { en: "Bus service", hi: "बस सेवा" } },
      { id: "licence", name: { en: "Licence or registration", hi: "लाइसेंस या पंजीकरण" } },
      { id: "fare", name: { en: "Overcharging", hi: "अधिक किराया" } },
    ],
  },
  {
    id: "other",
    name: { en: "Other / Not sure", hi: "अन्य / निश्चित नहीं" },
    keywords: [],
    categories: [{ id: "general", name: { en: "General", hi: "सामान्य" } }],
  },
];

export const districts: District[] = [
  { id: "almora", name: { en: "Almora", hi: "अल्मोड़ा" }, blocks: ["Hawalbagh", "Bhaisiyachhana", "Chaukhutia", "Dhauladevi", "Dwarahat", "Lamgara", "Salt", "Syaldey", "Takula", "Tarikhet", "Bhikiyasain"] },
  { id: "bageshwar", name: { en: "Bageshwar", hi: "बागेश्वर" }, blocks: ["Bageshwar", "Garur", "Kapkot"] },
  { id: "chamoli", name: { en: "Chamoli", hi: "चमोली" }, blocks: ["Dasholi", "Joshimath", "Karnaprayag", "Gairsain", "Tharali", "Dewal", "Narayanbagar", "Ghat", "Pokhari"] },
  { id: "champawat", name: { en: "Champawat", hi: "चम्पावत" }, blocks: ["Champawat", "Lohaghat", "Pati", "Barakot"] },
  { id: "dehradun", name: { en: "Dehradun", hi: "देहरादून" }, blocks: ["Vikasnagar", "Sahaspur", "Raipur", "Doiwala", "Chakrata", "Kalsi"] },
  { id: "haridwar", name: { en: "Haridwar", hi: "हरिद्वार" }, blocks: ["Bahadrabad", "Roorkee", "Bhagwanpur", "Narsan", "Laksar", "Khanpur"] },
  { id: "nainital", name: { en: "Nainital", hi: "नैनीताल" }, blocks: ["Haldwani", "Ramnagar", "Kotabagh", "Bhimtal", "Dhari", "Okhalkanda", "Betalghat", "Ramgarh"] },
  { id: "pauri", name: { en: "Pauri Garhwal", hi: "पौड़ी गढ़वाल" }, blocks: ["Pauri", "Kot", "Khirsu", "Thalisain", "Bironkhal", "Dugadda", "Yamkeshwar", "Rikhnikhal", "Pabau", "Kaljikhal"] },
  { id: "pithoragarh", name: { en: "Pithoragarh", hi: "पिथौरागढ़" }, blocks: ["Bin", "Munakot", "Dharchula", "Munsiyari", "Didihat", "Berinag", "Gangolihat", "Kanalichhina"] },
  { id: "rudraprayag", name: { en: "Rudraprayag", hi: "रुद्रप्रयाग" }, blocks: ["Agastyamuni", "Ukhimath", "Jakholi"] },
  { id: "tehri", name: { en: "Tehri Garhwal", hi: "टिहरी गढ़वाल" }, blocks: ["Chamba", "Jaunpur", "Thauldhar", "Pratapnagar", "Bhilangana", "Jakhnidhar", "Devprayag", "Kirtinagar", "Narendranagar"] },
  { id: "usnagar", name: { en: "Udham Singh Nagar", hi: "ऊधम सिंह नगर" }, blocks: ["Rudrapur", "Kashipur", "Jaspur", "Bajpur", "Gadarpur", "Sitarganj", "Khatima"] },
  { id: "uttarkashi", name: { en: "Uttarkashi", hi: "उत्तरकाशी" }, blocks: ["Bhatwari", "Dunda", "Chinyalisaur", "Naugaon", "Purola", "Mori"] },
];

/**
 * Escalation ladder. L1 is 15 days per the GO that raised it from 7 days.
 * L2–L4 durations are prototype defaults; set them from the operating guidelines.
 */
export const levels: Record<Level, { title: { en: string; hi: string }; days: number }> = {
  1: { title: { en: "Block / tehsil officer", hi: "विकासखंड / तहसील अधिकारी" }, days: 15 },
  2: { title: { en: "District officer", hi: "जनपद स्तरीय अधिकारी" }, days: 7 },
  3: { title: { en: "Head of department", hi: "विभागाध्यक्ष" }, days: 7 },
  4: { title: { en: "Secretary, Government of Uttarakhand", hi: "सचिव, उत्तराखंड शासन" }, days: 10 },
};

/** Per GO: at most 10 unresolved grievances per complainant at a time. */
export const MAX_OPEN_GRIEVANCES = 10;

/** Matters that belong to Government of India or other states, which go to CPGRAMS. */
export const cpgramsKeywords = [
  "passport", "पासपोर्ट", "railway", "train", "रेलवे", "ट्रेन", "income tax", "आयकर", "post office", "डाकघर",
  "aadhaar", "aadhar", "आधार", "epfo", "provident fund", "pf", "पीएफ", "bsnl", "telecom", "mobile network",
  "nhai", "national highway", "राष्ट्रीय राजमार्ग", "cbse", "kendriya vidyalaya", "केंद्रीय विद्यालय", "lpg", "gas cylinder",
  "गैस सिलेंडर", "bank", "बैंक", "army", "सेना", "pm kisan", "पीएम किसान",
];

const docs = "https://cmhelpline.uk.gov.in/assets/documents/";
const src = "https://cmhelpline.uk.gov.in/govt-order";

/** Sorted newest first on the way out. Undated entries come from the source page as-is. */
export const governmentOrders: GovernmentOrder[] = [
  { id: "mom-2026-09-14", date: "2026-09-14", kind: "minutes", title: { en: "Minutes of CM Helpline 1905 review meeting, 14 September 2026", hi: "सीएम हेल्पलाइन 1905 समीक्षा बैठक का कार्यवृत्त, 14 सितंबर 2026" }, url: docs + "MOM_of_meeting_held_on_14_09_2026_issue_letter.pdf" },
  { id: "mom-2026-07-30", date: "2026-07-30", kind: "minutes", title: { en: "Minutes of CM Helpline 1905 review meeting, 30 July 2026", hi: "सीएम हेल्पलाइन 1905 समीक्षा बैठक का कार्यवृत्त, 30 जुलाई 2026" }, url: docs + "MOM-CM-Helpline-1905-Dated-2026-08-14.pdf" },
  { id: "mom-2026-04-17", date: "2026-04-17", kind: "minutes", title: { en: "Minutes of CM Helpline 1905 review meeting, 17 April 2026", hi: "सीएम हेल्पलाइन 1905 समीक्षा बैठक का कार्यवृत्त, 17 अप्रैल 2026" }, url: docs + "MOM-CM-Helpline-1905-Dated-17.04.2026.pdf" },
  { id: "mom-2025-10-03", date: "2025-10-03", kind: "minutes", title: { en: "Minutes of CM Helpline 1905 review meeting, 3 October 2025", hi: "सीएम हेल्पलाइन 1905 समीक्षा बैठक का कार्यवृत्त, 3 अक्टूबर 2025" }, url: docs + "MoM_CM_helpline_Review_Meeting.pdf" },
  { id: "mom-2025-03-19", date: "2025-03-19", kind: "minutes", title: { en: "Minutes of CM Helpline 1905 review meeting, 19 March 2025", hi: "सीएम हेल्पलाइन 1905 समीक्षा बैठक का कार्यवृत्त, 19 मार्च 2025" }, url: docs + "MOM-CM-Help-25-march-2025.pdf" },
  { id: "mom-2024-07-25", date: "2024-07-25", kind: "minutes", title: { en: "Minutes of CM Helpline 1905 review meeting, 25 July 2024", hi: "सीएम हेल्पलाइन 1905 समीक्षा बैठक का कार्यवृत्त, 25 जुलाई 2024" }, url: src },
  { id: "mom-2024-06-27", date: "2024-06-27", kind: "minutes", title: { en: "Minutes of CM Helpline 1905 review meeting, 27 June 2024", hi: "सीएम हेल्पलाइन 1905 समीक्षा बैठक का कार्यवृत्त, 27 जून 2024" }, url: docs + "MOM_27_JUNE_2024.pdf" },
  { id: "mom-2023-07-27", date: "2023-07-27", kind: "minutes", title: { en: "Minutes of CM Helpline 1905 review meeting, 27 July 2023", hi: "सीएम हेल्पलाइन 1905 समीक्षा बैठक का कार्यवृत्त, 27 जुलाई 2023" }, url: docs + "MOM-Dated%20-27-July-2023.pdf" },
  { id: "mom-2022-09-19", date: "2022-09-19", kind: "minutes", title: { en: "Minutes of CM Portal 1905 review chaired by the Chief Secretary, 19 September 2022", hi: "मुख्य सचिव की अध्यक्षता में सीएम पोर्टल 1905 समीक्षा बैठक का कार्यवृत्त, 19 सितंबर 2022" }, url: src },
  { id: "go-cpgrams", date: null, kind: "go", title: { en: "Integration of CM Helpline with CPGRAMS", hi: "सीएम हेल्पलाइन का सीपीग्राम्स के साथ एकीकरण" }, url: docs + "Integration%20of%20CM%20Help%20Line%20with%20CPGRAMS..pdf" },
  { id: "go-l1-15-days", date: null, kind: "go", title: { en: "L1 resolution period raised from 7 to 15 days", hi: "मुख्यमंत्री हेल्पलाइन में L1 स्तर पर शिकायतों के निस्तारण की समयावधि 7 दिन से बढ़ाकर 15 दिन करने के संबंध में" }, url: src },
  { id: "go-max-10", date: null, kind: "go", title: { en: "Limit of 10 unresolved complaints per complainant at a time", hi: "एक शिकायतकर्ता के नाम एवं मोबाइल नंबर से एक समय में अधिकतम 10 अनिस्तारित शिकायतों के पंजीकरण की सीमा" }, url: src },
  { id: "go-l4-review", date: null, kind: "go", title: { en: "Review and time-bound disposal of complaints pending at L4", hi: "मुख्यमंत्री हेल्पलाइन में L4 स्तर पर लंबित शिकायतों की समीक्षा एवं समयबद्ध निस्तारण" }, url: src },
  { id: "go-transfer", date: null, kind: "go", title: { en: "Handing over L1–L4 officer logins on transfer", hi: "L1, L2, L3 एवं L4 स्तर के अधिकारियों के स्थानांतरण पर लॉगिन प्रोफाइल हस्तांतरण" }, url: src },
  { id: "go-monitoring", date: null, kind: "go", title: { en: "Regular monitoring of departments for time-bound, quality disposal", hi: "समयबद्ध एवं गुणवत्तापूर्ण निस्तारण हेतु समस्त विभागों की नियमित निगरानी एवं समीक्षा" }, url: src },
  { id: "go-guidelines", date: null, kind: "go", title: { en: "Operating guidelines for CM Helpline 1905", hi: "सीएम हेल्पलाइन 1905 के संचालन संबंधी दिशा-निर्देश" }, url: src },
  { id: "go-uksaps", date: null, kind: "go", title: { en: "Post-transfer order of UKSAPS", hi: "यूकेएसएपीएस का स्थानांतरण पश्चात आदेश" }, url: docs + "Government%20Order%20of%20UKSAPS%20Transfer.pdf" },
];
