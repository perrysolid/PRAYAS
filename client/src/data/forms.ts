export type FormCategory = "certificates" | "pension-welfare" | "ration-food" | "health" | "education-scholarship" | "land-revenue" | "business-employment" | "police" | "rti-grievance" | "other";

export type GovForm = {
  id: string;
  title: { en: string; hi: string };
  department: string;
  category: FormCategory;
  about: { en: string; hi: string };
  url: string;
  kind: "pdf" | "online" | "page";
};

const f = (id: string, category: FormCategory, kind: GovForm["kind"], department: string, en: string, hi: string, aboutEn: string, aboutHi: string, url: string): GovForm => ({
  id, category, kind, department, url, title: { en, hi }, about: { en: aboutEn, hi: aboutHi },
});

/** Every link goes to the official website that issues the form. Nothing is copied or re-hosted here. */
export const forms: GovForm[] = [
  // Certificates
  f("apuni-sarkar", "certificates", "online", "Government of Uttarakhand", "Caste, income, residence and other certificates (Apuni Sarkar)", "जाति, आय, निवास आदि प्रमाण पत्र (अपनी सरकार)", "The state's citizen services portal. Apply here for certificates issued through the tehsil, such as caste, income and permanent residence.", "राज्य का नागरिक सेवा पोर्टल। तहसील से जारी जाति, आय और स्थायी निवास जैसे प्रमाण पत्रों के लिए यहाँ आवेदन करें।", "https://eservices.uk.gov.in/"),
  f("birth-death", "certificates", "page", "Medical Health and Family Welfare", "Birth and death registration", "जन्म एवं मृत्यु पंजीकरण", "How to register a birth or death, with the link to the national civil registration portal.", "जन्म या मृत्यु पंजीकरण की प्रक्रिया, राष्ट्रीय नागरिक पंजीकरण पोर्टल के लिंक सहित।", "https://health.uk.gov.in/?p=6756"),
  f("marriage", "certificates", "online", "Government of Uttarakhand (UCC portal)", "Marriage registration", "विवाह पंजीकरण", "Register a marriage online. The portal shows the fee and the documents needed.", "विवाह का ऑनलाइन पंजीकरण। पोर्टल पर शुल्क और आवश्यक दस्तावेज़ दिखते हैं।", "https://ucc.uk.gov.in/service-details/6628e978cb0f60d283c33511"),
  f("character-certificate", "police", "online", "Uttarakhand Police", "Police character certificate", "पुलिस चरित्र प्रमाण पत्र", "Register on the police citizen portal, then request a character certificate.", "पुलिस नागरिक पोर्टल पर पंजीकरण कर चरित्र प्रमाण पत्र के लिए अनुरोध करें।", "https://policecitizenportal.uk.gov.in/Citizen/AboutCharacterCertificate.aspx"),

  // Pension and welfare
  f("pension-apply", "pension-welfare", "online", "Social Welfare", "Social security pension: apply online", "सामाजिक सुरक्षा पेंशन: ऑनलाइन आवेदन", "Old age, widow, disability and other pensions.", "वृद्धावस्था, विधवा, दिव्यांग और अन्य पेंशन।", "https://ssp.uk.gov.in/OnlineRegistration/FrmOnlineRegisApplicationOldage.aspx"),
  f("pension-process", "pension-welfare", "pdf", "Social Welfare", "Pension: how to register (guide)", "पेंशन: पंजीकरण कैसे करें (मार्गदर्शिका)", "Step-by-step process for a pension application.", "पेंशन आवेदन की चरणबद्ध प्रक्रिया।", "https://ssp.uk.gov.in/Documents/ProcessForRegistration.pdf"),
  f("pension-documents", "pension-welfare", "pdf", "Social Welfare", "Pension: documents required", "पेंशन: आवश्यक दस्तावेज़", "A checklist of the documents to keep ready.", "तैयार रखने योग्य दस्तावेज़ों की सूची।", "https://ssp.uk.gov.in/Documents/Requireddocuments.pdf"),
  f("pension-status", "pension-welfare", "online", "Social Welfare", "Check pension application status", "पेंशन आवेदन की स्थिति देखें", "Track an application you have already submitted.", "पहले से जमा आवेदन की स्थिति देखें।", "https://ssp.uk.gov.in/frmApplicantionVerificationDetailAtDiffLevels.aspx"),
  f("nanda-gaura", "pension-welfare", "online", "Women Empowerment and Child Development", "Nanda Gaura Yojana: registration", "नंदा गौरा योजना: पंजीकरण", "Incentive for girls, paid at birth and after Class 12.", "बालिकाओं के लिए प्रोत्साहन राशि, जन्म पर और कक्षा 12 के बाद।", "https://nandagaurauk.in"),
  f("nanda-gaura-aww", "pension-welfare", "pdf", "Women Empowerment and Child Development", "Nanda Gaura: Anganwadi birth certificate format", "नंदा गौरा: आंगनबाड़ी जन्म प्रमाण पत्र प्रारूप", "The format your Anganwadi worker fills for the birth-stage benefit.", "जन्म चरण के लाभ हेतु आंगनबाड़ी कार्यकर्ता द्वारा भरा जाने वाला प्रारूप।", "https://nandagaurauk.in/nanda_gaura/doc/born_child_aww_certificate.pdf"),
  f("ekal-mahila", "business-employment", "pdf", "Women Empowerment and Child Development", "Mukhyamantri Ekal Mahila Swarozgar Yojana: application", "मुख्यमंत्री एकल महिला स्वरोजगार योजना: आवेदन", "Application form for the self-employment scheme for single women.", "एकल महिलाओं हेतु स्वरोजगार योजना का आवेदन पत्र।", "https://cdnbbsr.s3waas.gov.in/s38a20a8621978632d76c43dfd28b67767/uploads/2026/07/20260704491757982.pdf"),

  // Ration and food
  f("ration-card-form", "ration-food", "pdf", "Food and Civil Supplies", "Ration card application form", "राशन कार्ड आवेदन पत्र", "For a new ration card or changes. Submit at the District Supply Office (urban) or Block Development Office (rural).", "नए राशन कार्ड या बदलाव हेतु। जिला पूर्ति कार्यालय (शहरी) या खंड विकास कार्यालय (ग्रामीण) में जमा करें।", "https://cdnbbsr.s3waas.gov.in/s38bdb5058376143fa358981954e7626b8/uploads/2025/02/20250213639436570.pdf"),
  f("ration-new", "ration-food", "page", "Food and Civil Supplies", "New ration card: process and documents", "नया राशन कार्ड: प्रक्रिया और दस्तावेज़", "Official steps and the documents needed.", "आधिकारिक प्रक्रिया और आवश्यक दस्तावेज़।", "https://fcs.uk.gov.in/issuance-of-new-ration-card/"),
  f("ration-modify", "ration-food", "page", "Food and Civil Supplies", "Ration card correction: add or remove a member", "राशन कार्ड संशोधन: सदस्य जोड़ें या हटाएँ", "Correct details or change the members listed.", "विवरण सुधारें या सदस्य बदलें।", "https://fcs.uk.gov.in/modification-in-ration-card/"),
  f("ration-duplicate", "ration-food", "page", "Food and Civil Supplies", "Ration card: renewal or duplicate", "राशन कार्ड: नवीनीकरण या डुप्लीकेट", "For a lost, damaged or expired card.", "खोए, क्षतिग्रस्त या समाप्त कार्ड हेतु।", "https://fcs.uk.gov.in/renewal-or-duplicate/"),

  // Health
  f("ayushman", "health", "page", "Health Department / State Health Agency", "Atal Ayushman card: how to apply", "अटल आयुष्मान कार्ड: आवेदन कैसे करें", "Cards are made at camps, Common Service Centres or empanelled hospitals.", "कार्ड शिविरों, जन सेवा केंद्रों या सूचीबद्ध अस्पतालों में बनते हैं।", "https://health.uk.gov.in/?p=6707"),
  f("ayushman-details", "health", "pdf", "Health Department", "Atal Ayushman card: details", "अटल आयुष्मान कार्ड: विवरण", "The department's own document on the card and its benefits.", "कार्ड और उसके लाभों पर विभाग का आधिकारिक दस्तावेज़।", "https://cdnbbsr.s3waas.gov.in/s3c154e8f56c74b3be3008da9bd19d08fc/uploads/2025/04/202504301944242927.pdf"),

  // Education
  f("scholarship-nsp", "education-scholarship", "online", "Ministry of Education (linked by Social Welfare)", "National Scholarship Portal", "राष्ट्रीय छात्रवृत्ति पोर्टल", "Apply for central and state scholarships.", "केंद्र और राज्य की छात्रवृत्तियों हेतु आवेदन।", "https://scholarships.gov.in/"),
  f("scholarship-uk", "education-scholarship", "page", "Social Welfare", "Scholarship schemes of Social Welfare", "समाज कल्याण की छात्रवृत्ति योजनाएँ", "SC, ST, OBC and other scholarships, with how to apply.", "अनुसूचित जाति, जनजाति, ओबीसी आदि की छात्रवृत्तियाँ और आवेदन की जानकारी।", "https://socialwelfare.uk.gov.in/service-category/scholarship-schemes/"),
  f("scholarship-otr", "education-scholarship", "pdf", "Social Welfare", "Scholarship one-time registration (OTR) guide", "छात्रवृत्ति वन-टाइम रजिस्ट्रेशन (ओटीआर) मार्गदर्शिका", "How a student registers once before applying.", "आवेदन से पहले छात्र एक बार पंजीकरण कैसे करें।", "https://cdnbbsr.s3waas.gov.in/s357bafb2c2dfeefba931bb03a835b1fa9/uploads/2025/06/20250616553521300.pdf"),
  f("cmheess", "education-scholarship", "pdf", "Higher Education", "CM Higher Education Encouragement Scholarship: guidelines", "मुख्यमंत्री उच्च शिक्षा प्रोत्साहन छात्रवृत्ति: दिशानिर्देश", "Eligibility and how to apply through the Samarth portal.", "पात्रता और समर्थ पोर्टल से आवेदन की जानकारी।", "https://cdnbbsr.s3waas.gov.in/s39ed9328611fe3f45b3cce8ffe386ee97/uploads/2025/02/202502041262487877.pdf"),

  // Land and revenue
  f("bhulekh", "land-revenue", "online", "Revenue Department", "Bhulekh: view land records (khatauni)", "भूलेख: भू-अभिलेख (खतौनी) देखें", "Look up your land record of rights online.", "अपना भू-अभिलेख ऑनलाइन देखें।", "https://bhulekh.uk.gov.in/public/public_ror/Public_ROR.jsp"),

  // Business and employment
  f("msy", "business-employment", "online", "Government of Uttarakhand (MSY portal)", "Mukhyamantri Swarozgar Yojana: apply online", "मुख्यमंत्री स्वरोजगार योजना: ऑनलाइन आवेदन", "Loan and subsidy to start your own business. Applications are online only.", "स्वयं का व्यवसाय शुरू करने हेतु ऋण और अनुदान। आवेदन केवल ऑनलाइन।", "https://msy.uk.gov.in"),

  // Police
  f("efir", "police", "online", "Uttarakhand Police", "E-FIR", "ई-एफआईआर", "Register an FIR online for eligible cases.", "पात्र मामलों में ऑनलाइन एफआईआर दर्ज करें।", "https://policecitizenportal.uk.gov.in/efir/Login.aspx"),
  f("fir-copy", "police", "online", "Uttarakhand Police", "Search and download an FIR copy", "एफआईआर की प्रति खोजें और डाउनलोड करें", "Find a registered FIR.", "दर्ज एफआईआर खोजें।", "https://policecitizenportal.uk.gov.in/Citi/firSearch.aspx"),
  f("tenant-verification", "police", "online", "Uttarakhand Police", "Tenant or paying-guest verification", "किरायेदार या पेइंग गेस्ट सत्यापन", "Request police verification of a tenant.", "किरायेदार का पुलिस सत्यापन हेतु अनुरोध।", "https://policecitizenportal.uk.gov.in/Citizen/AboutTenant.aspx"),
  f("employee-verification", "police", "online", "Uttarakhand Police", "Employee or domestic help verification", "कर्मचारी या घरेलू सहायक सत्यापन", "Request police verification of someone you employ.", "अपने कर्मचारी का पुलिस सत्यापन हेतु अनुरोध।", "https://policecitizenportal.uk.gov.in/Citizen/AboutEmployee.aspx"),
  f("police-complaint", "police", "online", "Uttarakhand Police", "Complaint to the police (online)", "पुलिस को ऑनलाइन शिकायत", "File a complaint on the police citizen portal.", "पुलिस नागरिक पोर्टल पर शिकायत दर्ज करें।", "https://policecitizenportal.uk.gov.in/Citizen/AboutComplaint.aspx"),

  // RTI and grievance
  f("rti-state", "rti-grievance", "online", "Government of Uttarakhand", "RTI: file an application (state)", "सूचना का अधिकार: आवेदन (राज्य)", "File an RTI request and first appeal online for state departments.", "राज्य के विभागों हेतु आरटीआई आवेदन और प्रथम अपील ऑनलाइन।", "https://rtionline.uk.gov.in/guidelines.php?request"),
  f("rti-rules-en", "rti-grievance", "pdf", "Government of Uttarakhand", "Uttarakhand RTI Rules, 2013 (English)", "उत्तराखण्ड सूचना का अधिकार नियमावली, 2013 (अंग्रेज़ी)", "State rules on fees and procedure.", "शुल्क और प्रक्रिया संबंधी राज्य नियम।", "https://rtionline.uk.gov.in/RTI-Rules-2013-English.pdf"),
  f("rti-rules-hi", "rti-grievance", "pdf", "Government of Uttarakhand", "Uttarakhand RTI Rules, 2013 (Hindi)", "उत्तराखण्ड सूचना का अधिकार नियमावली, 2013 (हिंदी)", "Hindi version of the state rules.", "राज्य नियमों का हिंदी संस्करण।", "https://rtionline.uk.gov.in/RTI-Rules-2013-Hindi.pdf"),
  f("rti-central", "rti-grievance", "online", "Government of India", "RTI: central government bodies", "सूचना का अधिकार: केंद्र सरकार", "For railways, passports, income tax and other central bodies.", "रेलवे, पासपोर्ट, आयकर आदि केंद्रीय निकायों हेतु।", "https://rtionline.gov.in/"),
  f("cpgrams", "rti-grievance", "online", "Government of India (DARPG)", "CPGRAMS: central government grievance", "सीपीग्राम्स: केंद्र सरकार की शिकायत", "For complaints about central government offices.", "केंद्र सरकार के कार्यालयों की शिकायतों हेतु।", "https://pgportal.gov.in/Home/LodgeGrievance"),

  // Other
  f("water-connection", "other", "pdf", "Uttarakhand Jal Sansthan", "Water or sewer connection form", "पेयजल या सीवर कनेक्शन आवेदन पत्र", "Apply for a new water or sewer connection.", "नए पेयजल या सीवर कनेक्शन हेतु आवेदन।", "https://cdnbbsr.s3waas.gov.in/s37fd804295ef7f6a2822bf4c61f9dc4a8/uploads/2025/01/20250122151605008.pdf"),
  f("water-complaint", "other", "online", "Uttarakhand Jal Sansthan", "Water supply and billing complaint form", "जलापूर्ति एवं बिल शिकायत प्रपत्र", "The department's own online complaint form.", "विभाग का अपना ऑनलाइन शिकायत प्रपत्र।", "https://ujsmis.uk.gov.in/Boundry/CRM/Consumercomplaintform.aspx"),
  f("upcl-new", "other", "online", "UPCL", "New electricity connection: register online", "नया बिजली कनेक्शन: ऑनलाइन पंजीकरण", "Apply for a new low or high tension connection.", "नए निम्न या उच्च दाब कनेक्शन हेतु आवेदन।", "https://www.upcl.org/wss/nsc/connectionType"),
  f("upcl-forms", "other", "page", "UPCL", "UPCL forms: load change, name change", "यूपीसीएल प्रपत्र: लोड परिवर्तन, नाम परिवर्तन", "Forms for load change and for transferring a connection to another name.", "लोड परिवर्तन और कनेक्शन दूसरे नाम पर करने के प्रपत्र।", "https://www.upcl.org/wss/form-downloads"),
  f("citizen-services", "other", "page", "Government of Uttarakhand", "Directory of state citizen services", "राज्य की नागरिक सेवाओं की निर्देशिका", "A list of services the state offers online.", "राज्य की ऑनलाइन सेवाओं की सूची।", "https://uk.gov.in/pages/citizen-services"),
];
