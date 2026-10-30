import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, Mic, MicOff, Send, Volume2, VolumeX, X } from "lucide-react";
import { useI18n } from "../context/I18nContext";
import { useMeta } from "../context/MetaContext";
import { useSpeak } from "../hooks/useSpeak";
import { useSpeechInput } from "../hooks/useSpeechInput";
import { statusLabels } from "../i18n/strings";
import { api, ApiError } from "../lib/api";
import { daysUntil, formatDate } from "../lib/format";

type Action = { label: string; run: () => void };
type Message = { id: number; from: "bot" | "me"; text: string; actions?: Action[] };

const ID_PATTERN = /CMH[-\s]?(\d{4})[-\s]?(\d{1,6})/i;
const MOBILE_PATTERN = /(?:\+?91[-\s]?)?([6-9]\d{9})\b/;

/** Small keyword intents. Anything longer that is not a question is treated as a complaint and triaged. */
const intents: { id: string; words: RegExp }[] = [
  { id: "track", words: /\b(track|status|where is|kahan|kab tak)\b|स्थिति|कहाँ है|स्टेटस/i },
  { id: "reminder", words: /\b(remind|reminder|yaad)\b|अनुस्मारक|याद दिला/i },
  { id: "reopen", words: /\b(reopen|not satisfied|again)\b|दोबारा|पुनः खोल|असंतुष्ट/i },
  { id: "time", words: /\b(how long|how many days|kitne din|deadline|time limit)\b|कितने दिन|कितना समय|समय सीमा/i },
  { id: "human", words: /\b(call|human|operator|person|talk)\b|बात कर|कॉल|ऑपरेटर/i },
  { id: "register", words: /^(register|complain|new complaint|file)\b|^शिकायत दर्ज/i },
  { id: "hello", words: /^(hi|hello|namaste|namaskar|hey)\b|^नमस्ते|^नमस्कार|^हेलो/i },
];

/**
 * Sahayak (सहायक): a bilingual assistant that can start a complaint from a conversation,
 * check a complaint's status, and answer common questions — by text or by voice.
 * It never registers anything on its own: it hands over to the same reviewed form.
 */
export function Sahayak() {
  const { t, pick, lang } = useI18n();
  const { department } = useMeta();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [voiceReplies, setVoiceReplies] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const nextId = useRef(1);
  const voice = useSpeak(lang === "hi" ? "hi-IN" : "en-IN");
  const speech = useSpeechInput(lang === "hi" ? "hi-IN" : "en-IN", (heard) => setText((prev) => (prev ? `${prev} ${heard}` : heard)));

  const say = (msg: Omit<Message, "id" | "from">) => {
    setMessages((m) => [...m, { id: nextId.current++, from: "bot", ...msg }]);
    if (voiceReplies) voice.speak(msg.text);
  };

  const starters: Action[] = [
    { label: t("Register a complaint", "शिकायत दर्ज करें"), run: () => handle(t("I want to register a complaint", "मुझे शिकायत दर्ज करनी है"), "register") },
    { label: t("Check my complaint", "मेरी शिकायत की स्थिति"), run: () => handle(t("Check my complaint status", "मेरी शिकायत की स्थिति"), "track") },
    { label: t("How long does it take?", "कितना समय लगता है?"), run: () => handle(t("How long does it take?", "कितना समय लगता है?"), "time") },
    { label: t("Talk to a person", "किसी व्यक्ति से बात"), run: () => handle(t("I want to talk to a person", "मुझे किसी से बात करनी है"), "human") },
  ];

  useEffect(() => {
    if (open && messages.length === 0) {
      say({
        text: t(
          "Namaste! I am Sahayak. Tell me your problem in your own words, in Hindi or English, and I will find the right department. I can also check a complaint's status.",
          "नमस्ते! मैं सहायक हूँ। अपनी समस्या अपने शब्दों में, हिंदी या अंग्रेज़ी में बताइए, मैं सही विभाग खोज दूँगा। मैं शिकायत की स्थिति भी बता सकता हूँ।",
        ),
        actions: starters,
      });
    }
    if (open) inputRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const close = () => {
    setOpen(false);
    voice.stop();
    launcherRef.current?.focus();
  };

  async function trackWith(id: string, mobile: string) {
    setBusy(true);
    try {
      const g = await api.track(id, mobile);
      const dept = department(g.departmentId);
      const open = g.status !== "resolved" && g.status !== "closed";
      const left = daysUntil(g.levelDueAt);
      say({
        text: open
          ? t(
              `${g.id} is "${statusLabels[g.status].en}". It is with the ${g.currentOfficer.en} (L${g.level}) of ${dept?.name.en ?? "the department"}, who must act by ${formatDate(g.levelDueAt, "en")}${left >= 0 ? ` — ${left} days left` : ""}.${g.supportCount ? ` ${g.supportCount} other citizens have joined this complaint.` : ""}`,
              `${g.id} की स्थिति "${statusLabels[g.status].hi}" है। यह ${dept?.name.hi ?? "विभाग"} के ${g.currentOfficer.hi} (L${g.level}) के पास है, जिन्हें ${formatDate(g.levelDueAt, "hi")} तक कार्यवाही करनी है${left >= 0 ? ` — ${left} दिन शेष` : ""}।${g.supportCount ? ` ${g.supportCount} अन्य नागरिक भी इससे जुड़े हैं।` : ""}`,
            )
          : t(
              `${g.id} was resolved on ${g.resolvedAt ? formatDate(g.resolvedAt, "en") : "–"}${g.hasProof ? ", with a photo as proof" : ""}. If the problem is not fixed, sign in and reopen it within 30 days.`,
              `${g.id} का निस्तारण ${g.resolvedAt ? formatDate(g.resolvedAt, "hi") : "–"} को हुआ${g.hasProof ? ", फ़ोटो प्रमाण सहित" : ""}। समस्या हल न हुई हो तो साइन इन करके 30 दिन में पुनः खोलें।`,
            ),
        actions: [{ label: t("Open full status", "पूरी स्थिति देखें"), run: () => { navigate(`/track?${new URLSearchParams({ id: g.id, mobile })}`); close(); } }],
      });
    } catch (err) {
      say({ text: err instanceof ApiError ? err.message : t("I could not check that right now. Try again, or call 1905.", "अभी जाँच नहीं हो सकी। फिर से प्रयास करें या 1905 पर कॉल करें।") });
    } finally {
      setBusy(false);
      setPendingId(null);
    }
  }

  async function handle(raw: string, forced?: string) {
    const input = raw.trim();
    if (!input) return;
    setMessages((m) => [...m, { id: nextId.current++, from: "me", text: input }]);
    setText("");

    const idMatch = input.match(ID_PATTERN);
    const mobileMatch = input.match(MOBILE_PATTERN);
    const id = idMatch ? `CMH-${idMatch[1]}-${idMatch[2].padStart(6, "0")}`.toUpperCase() : pendingId;

    if (id && mobileMatch) return trackWith(id, mobileMatch[1]);
    if (idMatch) {
      setPendingId(id);
      return say({ text: t(`Thanks. What is the mobile number used to register ${id}?`, `धन्यवाद। ${id} किस मोबाइल नंबर से दर्ज की गई थी?`) });
    }
    if (pendingId && /\d{6,}/.test(input)) {
      return say({ text: t("That doesn't look like a 10-digit mobile number. Please type it again.", "यह 10 अंकों का मोबाइल नंबर नहीं लगता। कृपया फिर से लिखें।") });
    }

    const intent = forced ?? intents.find((i) => i.words.test(input))?.id;
    const isShortQuestion = input.length < 60 || /\?$/.test(input);

    if (intent === "track" && isShortQuestion) {
      return say({ text: t("Sure. Type your complaint number, like CMH-2026-004512. It is in the SMS you received.", "ज़रूर। अपनी शिकायत संख्या लिखें, जैसे CMH-2026-004512। यह आपको मिले SMS में है।") });
    }
    if (intent === "register" && isShortQuestion) {
      return say({ text: t("Tell me what is wrong, where, and since when. For example: \"No water in Ward 4, Khirsu for 10 days\". You can press the mic and speak.", "बताइए क्या समस्या है, कहाँ और कब से। जैसे: \"खिर्सू वार्ड 4 में 10 दिन से पानी नहीं\"। आप माइक दबाकर बोल भी सकते हैं।") });
    }
    if (intent === "time" && isShortQuestion) {
      return say({ text: t("The first officer has 15 days. If it is not resolved, it moves up automatically: district officer, head of department, then Secretary. You can always see who has it and the deadline.", "प्रथम अधिकारी के पास 15 दिन होते हैं। निस्तारण न होने पर यह स्वतः ऊपर जाती है: जनपद अधिकारी, विभागाध्यक्ष, फिर सचिव। आप हमेशा देख सकते हैं कि यह किसके पास है और समय सीमा क्या है।") });
    }
    if (intent === "reminder" && isShortQuestion) {
      return say({ text: t("You can send a reminder 7 days after registering, then every 3 days. Reminders are visible to the Chief Minister's Office. Sign in and open the complaint to send one.", "दर्ज करने के 7 दिन बाद, फिर हर 3 दिन में अनुस्मारक भेज सकते हैं। यह मुख्यमंत्री कार्यालय को भी दिखता है। साइन इन करके शिकायत खोलें।") });
    }
    if (intent === "reopen" && isShortQuestion) {
      return say({ text: t("If it was marked resolved but the problem remains, rate it 'Not satisfied' and reopen within 30 days. It goes to a higher officer.", "यदि निस्तारित दिखाया गया पर समस्या बनी है, तो 'असंतुष्ट' रेट करें और 30 दिन में पुनः खोलें। यह उच्च अधिकारी को जाएगी।") });
    }
    if (intent === "human" && isShortQuestion) {
      return say({ text: t("Call 1905 free from any phone and an operator will register it for you. In an emergency call 112.", "किसी भी फ़ोन से 1905 पर निःशुल्क कॉल करें, ऑपरेटर शिकायत दर्ज करेंगे। आपात स्थिति में 112 पर कॉल करें।"), actions: [{ label: t("Call 1905", "1905 पर कॉल करें"), run: () => (window.location.href = "tel:1905") }] });
    }
    if (intent === "hello" && input.length < 25) {
      return say({ text: t("Namaste! What can I help you with?", "नमस्ते! मैं आपकी क्या सहायता करूँ?"), actions: starters });
    }

    if (input.length < 15) {
      return say({ text: t("Tell me a little more: what is wrong, where, and since when?", "थोड़ा और बताइए: क्या समस्या है, कहाँ और कब से?"), actions: starters });
    }

    setBusy(true);
    try {
      const triage = await api.triage(input);
      const dept = department(triage.departmentId);
      const cat = dept?.categories.find((c) => c.id === triage.categoryId);
      const parts = [
        t(`This looks like a matter for ${dept ? dept.name.en : "the department"}${cat ? ` (${cat.name.en})` : ""}.`, `यह ${dept ? dept.name.hi : "विभाग"}${cat ? ` (${cat.name.hi})` : ""} का विषय लगता है।`),
        triage.urgency === "high" ? t("I have marked it urgent. If anyone is in danger now, call 112.", "मैंने इसे अत्यावश्यक चिह्नित किया है। यदि कोई अभी खतरे में है, तो 112 पर कॉल करें।") : "",
        triage.centralMatter ? t("Note: it may be a central government matter, which goes to CPGRAMS.", "ध्यान दें: यह केंद्र सरकार का विषय हो सकता है, जिसकी शिकायत CPGRAMS पर होती है।") : "",
        t("Shall I open the form with this filled in? You will check everything before it is registered.", "क्या मैं यह भरकर फ़ॉर्म खोलूँ? दर्ज होने से पहले आप सब कुछ जाँच सकेंगे।"),
      ].filter(Boolean);
      say({
        text: parts.join(" "),
        actions: [
          { label: t("Yes, continue", "हाँ, आगे बढ़ें"), run: () => { navigate("/register", { state: { description: input } }); close(); } },
          { label: t("No, it's something else", "नहीं, कुछ और है"), run: () => say({ text: t("No problem. Describe it differently, or open the form and choose the department yourself.", "कोई बात नहीं। इसे अलग तरीके से बताइए, या फ़ॉर्म खोलकर विभाग स्वयं चुनें।") }) },
        ],
      });
    } catch {
      say({ text: t("I could not reach the server. You can still register on the form, or call 1905.", "सर्वर से संपर्क नहीं हो सका। आप फ़ॉर्म से दर्ज कर सकते हैं या 1905 पर कॉल करें।") });
    } finally {
      setBusy(false);
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (speech.listening) speech.stop();
    handle(text);
  };

  return (
    <>
      <button ref={launcherRef} type="button" className="sahayak-launcher" aria-expanded={open} aria-controls="sahayak" onClick={() => (open ? close() : setOpen(true))} hidden={open}>
        <span className="sahayak-launcher__icon"><Bot size={22} aria-hidden="true" /></span>
        <span className="sahayak-launcher__text">
          <strong>{t("Ask Sahayak", "सहायक से पूछें")}</strong>
          <span>{t("Speak or type, Hindi or English", "बोलें या लिखें, हिंदी या अंग्रेज़ी")}</span>
        </span>
      </button>
      {open && (
        <section id="sahayak" className="sahayak" role="dialog" aria-modal="false" aria-labelledby="sahayak-title" onKeyDown={(e) => e.key === "Escape" && close()}>
          <header className="sahayak__head">
            <span className="sahayak__avatar"><Bot size={20} aria-hidden="true" /></span>
            <span className="sahayak__titles">
              <h2 id="sahayak-title">{t("Sahayak", "सहायक")}</h2>
              <span>{t("CM Helpline assistant", "मुख्यमंत्री हेल्पलाइन सहायक")}</span>
            </span>
            {voice.supported && (
              <button type="button" className="sahayak__icon-btn" aria-pressed={voiceReplies} onClick={() => { setVoiceReplies((v) => !v); voice.stop(); }} aria-label={t("Read replies aloud", "उत्तर बोलकर सुनाएँ")}>
                {voiceReplies ? <Volume2 size={18} aria-hidden="true" /> : <VolumeX size={18} aria-hidden="true" />}
              </button>
            )}
            <button type="button" className="sahayak__icon-btn" onClick={close} aria-label={t("Close assistant", "सहायक बंद करें")}>
              <X size={18} aria-hidden="true" />
            </button>
          </header>
          <div className="sahayak__log" ref={logRef} role="log" aria-live="polite" aria-relevant="additions">
            {messages.map((m) => (
              <div key={m.id} className={`bubble bubble--${m.from}`}>
                <span className="visually-hidden">{m.from === "bot" ? t("Sahayak says:", "सहायक:") : t("You said:", "आपने कहा:")} </span>
                <p>{m.text}</p>
                {m.actions && (
                  <div className="bubble__actions">
                    {m.actions.map((a) => (
                      <button key={a.label} type="button" className="chip" onClick={a.run}>{a.label}</button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {busy && <div className="bubble bubble--bot bubble--typing" aria-label={t("Sahayak is typing", "सहायक लिख रहा है")}><i /><i /><i /></div>}
          </div>
          <form className="sahayak__form" onSubmit={submit}>
            <label htmlFor="sahayak-input" className="visually-hidden">{t("Message", "संदेश")}</label>
            <input
              id="sahayak-input"
              ref={inputRef}
              className="sahayak__input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={speech.listening ? t("Listening…", "सुन रहे हैं…") : t("Type your problem or complaint number", "समस्या या शिकायत संख्या लिखें")}
              autoComplete="off"
              maxLength={1000}
            />
            {speech.supported && (
              <button type="button" className={`sahayak__icon-btn sahayak__mic${speech.listening ? " is-on" : ""}`} onClick={speech.listening ? speech.stop : speech.start} aria-pressed={speech.listening} aria-label={speech.listening ? t("Stop listening", "सुनना बंद करें") : t("Speak", "बोलें")}>
                {speech.listening ? <MicOff size={18} aria-hidden="true" /> : <Mic size={18} aria-hidden="true" />}
              </button>
            )}
            <button type="submit" className="sahayak__send" disabled={!text.trim() || busy} aria-label={t("Send", "भेजें")}>
              <Send size={18} aria-hidden="true" />
            </button>
          </form>
          <p className="sahayak__foot">{t("Sahayak suggests; you confirm. Nothing is registered without your check.", "सहायक सुझाव देता है; पुष्टि आप करते हैं। आपकी जाँच के बिना कुछ दर्ज नहीं होता।")} {pick({ en: "Emergency: 112", hi: "आपात: 112" })}</p>
        </section>
      )}
    </>
  );
}
