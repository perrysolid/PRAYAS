/**
 * Languages offered in the language menu. English and Hindi have a hand-written interface;
 * the others are translated automatically and spoken with a natural voice when AI is available.
 */
export const languages = [
  { code: "en", native: "English", name: "English", speech: "en-IN" },
  { code: "hi", native: "हिन्दी", name: "Hindi", speech: "hi-IN" },
  { code: "gbm", native: "गढ़वळि", name: "Garhwali", speech: "hi-IN" },
  { code: "kfy", native: "कुमाऊँनी", name: "Kumaoni", speech: "hi-IN" },
  { code: "ne", native: "नेपाली", name: "Nepali", speech: "ne-NP" },
  { code: "pa", native: "ਪੰਜਾਬੀ", name: "Punjabi", speech: "pa-IN" },
  { code: "ur", native: "اردو", name: "Urdu", speech: "ur-IN", rtl: true },
  { code: "bn", native: "বাংলা", name: "Bengali", speech: "bn-IN" },
  { code: "mr", native: "मराठी", name: "Marathi", speech: "mr-IN" },
  { code: "gu", native: "ગુજરાતી", name: "Gujarati", speech: "gu-IN" },
  { code: "ta", native: "தமிழ்", name: "Tamil", speech: "ta-IN" },
  { code: "te", native: "తెలుగు", name: "Telugu", speech: "te-IN" },
  { code: "kn", native: "ಕನ್ನಡ", name: "Kannada", speech: "kn-IN" },
  { code: "ml", native: "മലയാളം", name: "Malayalam", speech: "ml-IN" },
] as const;

export type Locale = (typeof languages)[number]["code"];
export const isLocale = (v: unknown): v is Locale => languages.some((l) => l.code === v);
export const languageOf = (code: Locale) => languages.find((l) => l.code === code)!;
