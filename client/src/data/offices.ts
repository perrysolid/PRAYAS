export type Office = {
  id: string;
  kind: "department" | "building" | "district";
  name: { en: string; hi: string };
  role: { en: string; hi: string };
  address?: string;
  city?: string;
  phone: string[];
  email: string[];
  website?: string;
};

/**
 * Taken from the departments' own websites in November 2026. A number or email appears here only if it was printed
 * on an official page; where a page showed none, the entry has none rather than a guess.
 */
export const offices: Office[] = [
  // ---- Offices connected with the Chief Minister and the helpline ----
  {
    id: "cm-helpline-1905", kind: "building",
    name: { en: "CM Helpline 1905 office", hi: "मुख्यमंत्री हेल्पलाइन 1905" },
    role: { en: "The public grievance system, run by the IT Development Agency", hi: "जन शिकायत प्रणाली, सूचना प्रौद्योगिकी विकास अभिकरण द्वारा संचालित" },
    address: "Uttarakhand Secretariat, New Building, 4th Floor, Subhash Road", city: "Dehradun 248001",
    phone: ["1905", "+91 73022 54182 (WhatsApp)"], email: ["cm-helpline@uk.gov.in"], website: "https://cmhelpline.uk.gov.in/",
  },
  {
    id: "cm-office", kind: "building",
    name: { en: "Chief Minister's Secretariat", hi: "मुख्यमंत्री सचिवालय" },
    role: { en: "Office of the Chief Minister", hi: "मुख्यमंत्री कार्यालय" },
    address: "A.P.J. Abdul Kalam Building, 4th Floor, Uttarakhand Secretariat, 4 Subhash Road", city: "Dehradun 248001",
    phone: ["0135-2650433", "0135-2716262"], email: ["cm-ua@nic.in"], website: "https://cm.uk.gov.in",
  },
  {
    id: "cm-camp-office", kind: "building",
    name: { en: "CM Camp Office", hi: "मुख्यमंत्री शिविर कार्यालय" },
    role: { en: "The Chief Minister's camp office", hi: "मुख्यमंत्री का शिविर कार्यालय" },
    city: "Dehradun", phone: ["0135-2750033", "0135-2750344"], email: ["cm-ua@nic.in"], website: "https://cm.uk.gov.in",
  },
  {
    id: "secretariat", kind: "building",
    name: { en: "Uttarakhand Secretariat", hi: "उत्तराखण्ड सचिवालय" },
    role: { en: "Seat of the state government and its departments", hi: "राज्य सरकार और उसके विभागों का मुख्यालय" },
    address: "4 Subhash Road", city: "Dehradun 248001", phone: [], email: [], website: "https://uk.gov.in",
  },
  {
    id: "itda", kind: "building",
    name: { en: "IT Development Agency (ITDA), IT Bhawan", hi: "सूचना प्रौद्योगिकी विकास अभिकरण (आईटीडीए), आईटी भवन" },
    role: { en: "The state IT agency that runs the CM Helpline portal", hi: "राज्य की आईटी एजेंसी, जो सीएम हेल्पलाइन पोर्टल चलाती है" },
    address: "Plot No. IT-07, Sahastradhara Road, IT Park", city: "Dehradun 248013",
    phone: ["0135-2608330"], email: ["diritda-uk@nic.in"], website: "https://itda.uk.gov.in/",
  },
  {
    id: "raj-bhawan", kind: "building",
    name: { en: "Raj Bhawan (Lok Bhavan), Governor's Secretariat", hi: "राजभवन (लोक भवन), राज्यपाल सचिवालय" },
    role: { en: "Office of the Governor", hi: "राज्यपाल का कार्यालय" },
    address: "New Cantt. Road", city: "Dehradun 248003", phone: ["0135-2757400", "0135-2757403"], email: [], website: "https://governoruk.gov.in/",
  },

  // ---- Departments ----
  {
    id: "upcl", kind: "department",
    name: { en: "Uttarakhand Power Corporation (UPCL)", hi: "उत्तराखण्ड पावर कॉर्पोरेशन (यूपीसीएल)" },
    role: { en: "Electricity supply, bills and new connections", hi: "बिजली आपूर्ति, बिल और नए कनेक्शन" },
    city: "Dehradun", phone: ["1912"], email: ["customercare@upcl.org"], website: "https://upcl.uk.gov.in/",
  },
  {
    id: "ujvnl", kind: "department",
    name: { en: "Uttarakhand Jal Vidyut Nigam (UJVNL)", hi: "उत्तराखण्ड जल विद्युत निगम (यूजेवीएनएल)" },
    role: { en: "State hydropower generation", hi: "राज्य की जल विद्युत उत्पादन कंपनी" },
    address: "Maharani Bagh, G.M.S. Road", city: "Dehradun 248006", phone: [], email: [], website: "https://ujvnl.uk.gov.in/",
  },
  {
    id: "jal-sansthan", kind: "department",
    name: { en: "Uttarakhand Jal Sansthan", hi: "उत्तराखण्ड जल संस्थान" },
    role: { en: "Drinking water supply and sewerage", hi: "पेयजल आपूर्ति एवं सीवरेज" },
    address: "CGM Office, Jal Bhawan, B-Block, Nehru Colony", city: "Dehradun 248001",
    phone: ["1916", "1800 180 4100", "0135-2676260"], email: ["cgm-js-ua@nic.in"], website: "https://ujs.uk.gov.in/",
  },
  {
    id: "peyjal-nigam", kind: "department",
    name: { en: "Uttarakhand Peyjal Sansadhan Vikas evam Nirman Nigam", hi: "उत्तराखण्ड पेयजल संसाधन विकास एवं निर्माण निगम" },
    role: { en: "Builds drinking water schemes", hi: "पेयजल योजनाओं का निर्माण" },
    address: "11 Mohini Road", city: "Dehradun 248001", phone: ["1800 180 4192"], email: [], website: "https://peyjal.uk.gov.in/",
  },
  {
    id: "pwd", kind: "department",
    name: { en: "Public Works Department (PWD)", hi: "लोक निर्माण विभाग" },
    role: { en: "State roads, bridges and government buildings", hi: "राज्य की सड़कें, पुल और सरकारी भवन" },
    city: "Dehradun", phone: ["0135-2531424 (Chief Engineer)", "0135-2530431 (Disaster Control Room)"], email: ["cehq.pwduk@gov.in", "eicpwduk@nic.in"], website: "https://pwd.uk.gov.in",
  },
  {
    id: "food-civil-supplies", kind: "department",
    name: { en: "Food and Civil Supplies Department", hi: "खाद्य एवं नागरिक आपूर्ति विभाग" },
    role: { en: "Ration cards, ration shops and consumer protection", hi: "राशन कार्ड, राशन की दुकानें और उपभोक्ता संरक्षण" },
    address: "Khadya Bhawan, Mussoorie Bypass Ring Road (Ladpur)", city: "Dehradun",
    phone: ["0135-2780765 (Commissioner)", "0135-2669719 (State Consumer Commission)"], email: ["comm-fcs-uk@nic.in", "secy-fcs-ua@nic.in"], website: "https://fcs.uk.gov.in",
  },
  {
    id: "social-welfare", kind: "department",
    name: { en: "Department of Social Welfare", hi: "समाज कल्याण विभाग" },
    role: { en: "Pensions and scholarships", hi: "पेंशन और छात्रवृत्ति" },
    address: "Directorate, Maanpur Purab, Rampur Road", city: "Haldwani",
    phone: ["1800 180 4236 (toll free)", "05946-297051", "63952 21188 (WhatsApp and calls)"], email: ["directorsocialwelfare@gmail.com"], website: "https://socialwelfare.uk.gov.in/",
  },
  {
    id: "health", kind: "department",
    name: { en: "Health and Family Welfare (Directorate General of Health Services)", hi: "स्वास्थ्य एवं परिवार कल्याण (स्वास्थ्य सेवा महानिदेशालय)" },
    role: { en: "Public health services and the 108 ambulance", hi: "जन स्वास्थ्य सेवाएँ और 108 एम्बुलेंस" },
    address: "Village Danda Lakhond, Gujrara, Sahastradhara Road", city: "Dehradun",
    phone: ["0135-2608763", "108 (ambulance)"], email: ["dghealth.uttarakhand@gmail.com"], website: "https://health.uk.gov.in",
  },
  {
    id: "school-education", kind: "department",
    name: { en: "Directorate General of School Education", hi: "विद्यालयी शिक्षा महानिदेशालय" },
    role: { en: "Government schools, teachers and mid-day meal", hi: "सरकारी विद्यालय, शिक्षक और मध्याह्न भोजन" },
    address: "Nanoorkhera", city: "Dehradun 248001", phone: [], email: [], website: "https://schooleducation.uk.gov.in",
  },
  {
    id: "police-hq", kind: "department",
    name: { en: "Uttarakhand Police Headquarters", hi: "उत्तराखण्ड पुलिस मुख्यालय" },
    role: { en: "State police, emergency 112 and cyber fraud helpline 1930", hi: "राज्य पुलिस, आपात 112 और साइबर धोखाधड़ी हेल्पलाइन 1930" },
    address: "12 Subhash Road", city: "Dehradun 248001", phone: ["112", "1930 (cyber)", "9411112985"], email: ["dgc-police-ua@nic.in"], website: "https://uttarakhandpolice.uk.gov.in/",
  },
  {
    id: "urban-development", kind: "department",
    name: { en: "Urban Development Directorate", hi: "शहरी विकास निदेशालय" },
    role: { en: "Municipal bodies, garbage, drains and street lights", hi: "नगर निकाय, कूड़ा, नालियाँ और स्ट्रीट लाइट" },
    city: "Dehradun", phone: [], email: [], website: "https://udd.uk.gov.in/",
  },
  {
    id: "forest", kind: "department",
    name: { en: "Uttarakhand Forest Department", hi: "उत्तराखण्ड वन विभाग" },
    role: { en: "Forests, wildlife and forest fires", hi: "वन, वन्यजीव और वनाग्नि" },
    address: "85 Rajpur Road", city: "Dehradun 248001", phone: ["1926 (forest control centre, toll free)"], email: [], website: "https://forest.uk.gov.in",
  },
  {
    id: "agriculture", kind: "department",
    name: { en: "Directorate of Agriculture", hi: "कृषि निदेशालय" },
    role: { en: "Seeds, fertiliser, crop insurance and farm subsidies", hi: "बीज, खाद, फसल बीमा और कृषि अनुदान" },
    address: "Krishi Bhawan, Nanda-Ki-Chowki, Premnagar", city: "Dehradun 248007",
    phone: ["0135-2972421", "0135-2972422", "1800 180 1551 (Kisan helpline)"], email: ["dir-agri-ua@nic.in"], website: "https://agriculture.uk.gov.in",
  },
  {
    id: "transport", kind: "department",
    name: { en: "Transport Department", hi: "परिवहन विभाग" },
    role: { en: "Vehicle registration and driving licences", hi: "वाहन पंजीकरण और ड्राइविंग लाइसेंस" },
    address: "Office of the Transport Commissioner, Kulhan, Sahastradhara Road", city: "Dehradun 248001", phone: [], email: [], website: "https://transport.uk.gov.in",
  },
  {
    id: "tourism", kind: "department",
    name: { en: "Uttarakhand Tourism Development Board", hi: "उत्तराखण्ड पर्यटन विकास परिषद" },
    role: { en: "Tourism, homestays and the tourist helpline", hi: "पर्यटन, होमस्टे और पर्यटक हेल्पलाइन" },
    address: "Paryatan Bhawan, near ONGC Helipad, Garhi Cantt", city: "Dehradun", phone: ["1364 (tourist helpline)"], email: [], website: "https://uttarakhandtourism.gov.in",
  },
  {
    id: "wecd", kind: "department",
    name: { en: "Women Empowerment and Child Development", hi: "महिला सशक्तिकरण एवं बाल विकास" },
    role: { en: "Anganwadi, Nanda Gaura and women's welfare schemes", hi: "आंगनबाड़ी, नंदा गौरा और महिला कल्याण योजनाएँ" },
    city: "Dehradun", phone: [], email: [], website: "https://wecd.uk.gov.in",
  },
  {
    id: "usdma", kind: "department",
    name: { en: "State Disaster Management Authority (USDMA)", hi: "राज्य आपदा प्रबंधन प्राधिकरण (यूएसडीएमए)" },
    role: { en: "Disasters, landslides and floods; emergency control room", hi: "आपदा, भूस्खलन और बाढ़; आपातकालीन नियंत्रण कक्ष" },
    address: "36 IT Park Road, Doon IT Park, Kishanpur", city: "Dehradun 248013",
    phone: ["1070 (state control room)", "1077 (district control rooms)", "0135-2664317"], email: ["usdma.uttarakhand@gmail.com"], website: "https://usdma.uk.gov.in/",
  },

  // ---- District Magistrate offices ----
  { id: "almora", kind: "district", name: { en: "District Magistrate, Almora", hi: "जिलाधिकारी, अल्मोड़ा" }, role: { en: "District administration", hi: "जनपद प्रशासन" }, address: "Collectorate Compound", city: "Almora 263601", phone: ["05962-230170", "05962-237875 (disaster control room)"], email: ["dm-alm-ua@nic.in"], website: "https://almora.nic.in" },
  { id: "bageshwar", kind: "district", name: { en: "District Magistrate, Bageshwar", hi: "जिलाधिकारी, बागेश्वर" }, role: { en: "District administration", hi: "जनपद प्रशासन" }, address: "Collectorate", city: "Bageshwar 263642", phone: ["05963-220763"], email: ["dm-bag-ua@nic.in"], website: "https://bageshwar.nic.in" },
  { id: "chamoli", kind: "district", name: { en: "District Magistrate, Chamoli", hi: "जिलाधिकारी, चमोली" }, role: { en: "District administration", hi: "जनपद प्रशासन" }, address: "District Magistrate Office", city: "Gopeshwar 246401", phone: [], email: ["dm-cha-ua@nic.in"], website: "https://chamoli.gov.in" },
  { id: "champawat", kind: "district", name: { en: "District Magistrate, Champawat", hi: "जिलाधिकारी, चम्पावत" }, role: { en: "District administration", hi: "जनपद प्रशासन" }, address: "Collectorate Compound, Srikhand Chaur", city: "Champawat 262523", phone: [], email: ["dm-chp-ua@nic.in"], website: "https://champawat.nic.in" },
  { id: "dehradun", kind: "district", name: { en: "District Magistrate, Dehradun", hi: "जिलाधिकारी, देहरादून" }, role: { en: "District administration", hi: "जनपद प्रशासन" }, address: "Collectorate Compound", city: "Dehradun 248001", phone: ["0135-2622389", "0135-2726066 (disaster control room)"], email: ["dm-deh-ua@nic.in"], website: "https://dehradun.nic.in" },
  { id: "haridwar", kind: "district", name: { en: "District Magistrate, Haridwar", hi: "जिलाधिकारी, हरिद्वार" }, role: { en: "District administration", hi: "जनपद प्रशासन" }, address: "DM Office", city: "Haridwar 249403", phone: [], email: ["dm-har-ua@nic.in"], website: "https://haridwar.nic.in" },
  { id: "nainital", kind: "district", name: { en: "District Magistrate, Nainital", hi: "जिलाधिकारी, नैनीताल" }, role: { en: "District administration", hi: "जनपद प्रशासन" }, address: "District Magistrate Office, Tallital", city: "Nainital 263001", phone: [], email: ["dm-nai-ua@nic.in"], website: "https://nainital.nic.in" },
  { id: "pauri", kind: "district", name: { en: "District Magistrate, Pauri Garhwal", hi: "जिलाधिकारी, पौड़ी गढ़वाल" }, role: { en: "District administration", hi: "जनपद प्रशासन" }, address: "Collectorate Compound", city: "Pauri 246001", phone: [], email: ["dm-pau-ua@nic.in"], website: "https://pauri.nic.in" },
  { id: "pithoragarh", kind: "district", name: { en: "District Magistrate, Pithoragarh", hi: "जिलाधिकारी, पिथौरागढ़" }, role: { en: "District administration", hi: "जनपद प्रशासन" }, city: "Pithoragarh", phone: [], email: [], website: "https://pithoragarh.nic.in" },
  { id: "rudraprayag", kind: "district", name: { en: "District Magistrate, Rudraprayag", hi: "जिलाधिकारी, रुद्रप्रयाग" }, role: { en: "District administration", hi: "जनपद प्रशासन" }, address: "Collectorate Compound", city: "Rudraprayag 246171", phone: [], email: ["dm-rud-ua@nic.in"], website: "https://rudraprayag.gov.in" },
  { id: "tehri", kind: "district", name: { en: "District Magistrate, Tehri Garhwal", hi: "जिलाधिकारी, टिहरी गढ़वाल" }, role: { en: "District administration", hi: "जनपद प्रशासन" }, address: "Collectorate Campus", city: "New Tehri 249001", phone: ["01376-232092"], email: ["dm-teh-ua@nic.in"], website: "https://tehri.nic.in" },
  { id: "usnagar", kind: "district", name: { en: "District Magistrate, Udham Singh Nagar", hi: "जिलाधिकारी, ऊधम सिंह नगर" }, role: { en: "District administration", hi: "जनपद प्रशासन" }, address: "Collectorate Compound", city: "Rudrapur", phone: ["05944-242087"], email: [], website: "https://usnagar.nic.in" },
  { id: "uttarkashi", kind: "district", name: { en: "District Magistrate, Uttarkashi", hi: "जिलाधिकारी, उत्तरकाशी" }, role: { en: "District administration", hi: "जनपद प्रशासन" }, address: "Collectorate", city: "Uttarkashi 249193", phone: [], email: ["dm-utt-ua@nic.in"], website: "https://uttarkashi.nic.in" },
];
