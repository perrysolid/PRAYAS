import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { Crosshair, Download, Mic, MicOff, Sparkles, Users } from "lucide-react";
import { ErrorSummary, Field, Input, Select, TextArea, describedBy } from "../components/Form";
import { DeptIcon } from "../components/DeptIcon";
import { Ladder } from "../components/Ladder";
import { PhotoInput } from "../components/PhotoInput";
import { ReadAloud } from "../components/ReadAloud";
import { OtpSignIn } from "../components/OtpSignIn";
import { PageHead } from "../components/PageHead";
import { Loading } from "../components/States";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";
import { useMeta } from "../context/MetaContext";
import { useDraft } from "../hooks/useDraft";
import { useSpeechInput } from "../hooks/useSpeechInput";
import { typeLabels } from "../i18n/strings";
import { api, ApiError } from "../lib/api";
import { districtAt } from "../data/ukMap";
import { currentPosition } from "../lib/photo";
import { formatDate } from "../lib/format";
import type { Grievance, Photo, SimilarGrievance, Triage } from "../lib/types";

type Step = "describe" | "department" | "location" | "similar" | "details" | "verify" | "check";
const STEPS: Step[] = ["describe", "department", "location", "similar", "details", "verify", "check"];

type Draft = {
  description: string;
  departmentId: string;
  categoryId: string;
  districtId: string;
  block: string;
  village: string;
  name: string;
  type: "complaint" | "demand" | "suggestion";
  subject: string;
  triage: Triage | null;
  photo: Photo | null;
};

const emptyDraft: Draft = { description: "", departmentId: "", categoryId: "", districtId: "", block: "", village: "", name: "", type: "complaint", subject: "", triage: null, photo: null };

export function Register() {
  const { t, pick, lang } = useI18n();
  const { meta, department, district } = useMeta();
  const { session } = useAuth();
  const location = useLocation();
  const [params] = useSearchParams();
  const [draft, setDraft, clearDraft] = useDraft<Draft>("register", emptyDraft);
  const [step, setStep] = useState<Step>("describe");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<Grievance | null>(null);
  const [showOther, setShowOther] = useState(false);
  const [similar, setSimilar] = useState<SimilarGrievance[]>([]);
  const [joined, setJoined] = useState<{ id: string; count: number } | null>(null);
  const [geoNote, setGeoNote] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Text handed over from the home page box, or a department from a quick-start link.
  useEffect(() => {
    const handed = (location.state as { description?: string } | null)?.description;
    const preselected = params.get("department");
    if (handed || preselected) {
      setDraft((d) => ({ ...d, description: handed ?? d.description, departmentId: preselected ?? d.departmentId, categoryId: preselected ? "" : d.categoryId }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    headingRef.current?.focus();
  }, [step, created]);

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    if (errors[key as string]) setErrors(({ [key as string]: _, ...rest }) => rest);
  };

  const goTo = (next: Step) => {
    setErrors({});
    setStep(next);
  };

  const stepIndex = STEPS.indexOf(step);
  // "Verify" is skipped when already signed in; "similar" only appears when there is something to join.
  const skip = (s: Step) => (s === "verify" && Boolean(session)) || (s === "similar" && similar.length === 0);
  const visibleSteps = STEPS.filter((s) => !skip(s));
  const visibleIndex = visibleSteps.indexOf(step) + 1;
  const back = () => {
    let i = stepIndex - 1;
    while (i > 0 && skip(STEPS[i])) i -= 1;
    if (i >= 0) goTo(STEPS[i]);
  };
  const forward = (from: Step, found = similar) => {
    let i = STEPS.indexOf(from) + 1;
    while ((STEPS[i] === "verify" && session) || (STEPS[i] === "similar" && found.length === 0)) i += 1;
    goTo(STEPS[i]);
  };

  const speech = useSpeechInput(lang === "hi" ? "hi-IN" : "en-IN", (heard) => update("description", draft.description ? `${draft.description} ${heard}` : heard));

  // Step handlers

  const submitDescribe = async (e: FormEvent) => {
    e.preventDefault();
    if (draft.description.trim().length < 20) {
      setErrors({ description: t("Describe the problem in at least 20 characters: what, where and since when", "समस्या कम से कम 20 अक्षरों में बताएँ: क्या, कहाँ और कब से") });
      return;
    }
    setBusy(true);
    try {
      const triage = await api.triage(draft.description);
      setDraft((d) => {
        const keepDept = d.departmentId && params.get("department") === d.departmentId;
        const departmentId = keepDept ? d.departmentId : triage.departmentId;
        const categoryId = departmentId === triage.departmentId ? triage.categoryId : "";
        return { ...d, triage, departmentId, categoryId, subject: d.subject || triage.suggestedSubject };
      });
      setShowOther(false);
      forward("describe");
    } catch {
      // Triage is a convenience. If it fails, the citizen just picks the department.
      setShowOther(true);
      forward("describe");
    } finally {
      setBusy(false);
    }
  };

  const submitDepartment = (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!draft.departmentId) next.departmentId = t("Choose the department", "विभाग चुनें");
    if (!draft.categoryId) next.categoryId = t("Choose what the problem is about", "समस्या का प्रकार चुनें");
    setErrors(next);
    if (!Object.keys(next).length) forward("department");
  };

  const useMyLocation = async () => {
    setGeoNote(t("Finding your location…", "आपका स्थान खोजा जा रहा है…"));
    const pos = await currentPosition();
    if (!pos) return setGeoNote(t("Location is off or not allowed. Choose the district from the list.", "स्थान बंद है या अनुमति नहीं मिली। सूची से जनपद चुनें।"));
    const found = districtAt(pos.lon, pos.lat);
    if (!found) return setGeoNote(t("You seem to be outside Uttarakhand. Choose the district where the problem is.", "आप उत्तराखंड से बाहर लगते हैं। वह जनपद चुनें जहाँ समस्या है।"));
    setDraft((d) => ({ ...d, districtId: found, block: d.districtId === found ? d.block : "" }));
    setErrors(({ districtId: _, ...rest }) => rest);
    setGeoNote(t(`Found: ${district(found)?.name.en}. Change it if the problem is elsewhere.`, `मिला: ${district(found)?.name.hi}। समस्या कहीं और है तो बदलें।`));
  };

  const submitLocation = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft.districtId) {
      setErrors({ districtId: t("Choose the district where the problem is", "वह जनपद चुनें जहाँ समस्या है") });
      return;
    }
    // Before a new complaint is filed, look for an open one about the same thing nearby.
    setBusy(true);
    let found: SimilarGrievance[] = [];
    try {
      found = await api.similar({ departmentId: draft.departmentId, districtId: draft.districtId, categoryId: draft.categoryId, block: draft.block || undefined });
    } catch {
      // Optional step; carry on.
    } finally {
      setBusy(false);
    }
    setSimilar(found);
    setJoined(null);
    forward("location", found);
  };

  const join = async (id: string) => {
    setBusy(true);
    setErrors({});
    try {
      const r = await api.support(id);
      setJoined({ id: r.id, count: r.supportCount });
      clearDraft();
    } catch (err) {
      setErrors({ _: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const submitDetails = (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (draft.name.trim().length < 2) next.name = t("Enter your name", "अपना नाम दर्ज करें");
    if (draft.subject.trim().length < 5) next.subject = t("Write a short title of at least 5 characters", "कम से कम 5 अक्षरों का छोटा शीर्षक लिखें");
    if (draft.subject.length > 120) next.subject = t("Keep the title under 120 characters", "शीर्षक 120 अक्षरों से कम रखें");
    setErrors(next);
    if (!Object.keys(next).length) forward("details");
  };

  const submitFinal = async () => {
    setBusy(true);
    setErrors({});
    try {
      const g = await api.createGrievance({
        name: draft.name.trim(),
        type: draft.type,
        departmentId: draft.departmentId,
        categoryId: draft.categoryId,
        subject: draft.subject.trim(),
        description: draft.description.trim(),
        districtId: draft.districtId,
        block: draft.block || undefined,
        village: draft.village.trim() || undefined,
        triage: draft.triage ? { source: draft.triage.source, confidence: draft.triage.confidence, urgency: draft.triage.urgency } : undefined,
        photo: draft.photo ?? undefined,
      });
      clearDraft();
      setCreated(g);
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fields).length) setErrors(err.fields);
      else setErrors({ _: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  if (!meta) return <div className="container section"><Loading /></div>;

  // Confirmation

  if (created) {
    return (
      <>
        <PageHead en="Complaint registered" hi="शिकायत दर्ज हो गई" />
        <div className="container">
          <div className="panel-confirm" role="status">
            <h2 ref={headingRef} tabIndex={-1} style={{ color: "#fff" }}>
              {t("Your complaint number is", "आपकी शिकायत संख्या है")}
              <span className="panel-confirm__ref">{created.id}</span>
            </h2>
            <p>{t("We have also sent it to your mobile by SMS.", "यह आपके मोबाइल पर SMS से भी भेज दी गई है।")}</p>
            <div className="btn-row" style={{ justifyContent: "center" }}>
              <Link className="btn btn--accent" to={`/my-complaints/${created.id}/receipt`}>
                <Download size={18} aria-hidden="true" /> {t("Download acknowledgement", "पावती डाउनलोड करें")}
              </Link>
              <ReadAloud
                text={t(
                  `Your complaint number is ${created.id.split("").join(" ")}. It has gone to the ${created.currentOfficer.en}, who must act by ${formatDate(created.levelDueAt, "en")}.`,
                  `आपकी शिकायत संख्या है ${created.id.split("").join(" ")}। यह ${created.currentOfficer.hi} को भेजी गई है, जिन्हें ${formatDate(created.levelDueAt, "hi")} तक कार्यवाही करनी है।`,
                )}
              />
            </div>
          </div>
          <div className="grid-2-1">
            <div>
              <h2>{t("What happens next", "आगे क्या होगा")}</h2>
              <p>
                {t(`It has gone to the ${pick(created.currentOfficer)} for ${pick(department(created.departmentId)!.name)}.`, `यह ${pick(department(created.departmentId)!.name)} के ${pick(created.currentOfficer)} को भेज दी गई है।`)}
              </p>
              <Ladder current={created} />
              <div className="btn-row">
                <Link className="btn" to={`/my-complaints/${created.id}`}>
                  {t("View this complaint", "यह शिकायत देखें")}
                </Link>
                <Link className="btn btn--secondary" to="/register" onClick={() => { setCreated(null); setDraft(emptyDraft); setStep("describe"); }}>
                  {t("Register another", "दूसरी शिकायत दर्ज करें")}
                </Link>
              </div>
            </div>
            <aside className="aside-card">
              <h3>{t("Keep this number", "यह संख्या संभाल कर रखें")}</h3>
              <p>{t("You need it with your mobile number to check the status without signing in, or when you call 1905.", "बिना साइन इन स्थिति देखने या 1905 पर कॉल करते समय मोबाइल नंबर के साथ इसकी आवश्यकता होगी।")}</p>
            </aside>
          </div>
        </div>
      </>
    );
  }

  const dept = department(draft.departmentId);
  const dist = district(draft.districtId);
  const triage = draft.triage;

  const stepTitle: Record<Step, [string, string]> = {
    describe: ["What is the problem?", "समस्या क्या है?"],
    department: ["Which department should handle it?", "कौन सा विभाग इसे देखेगा?"],
    location: ["Where is the problem?", "समस्या कहाँ है?"],
    similar: ["Others nearby have reported this", "आस-पास के लोगों ने यह पहले ही दर्ज किया है"],
    details: ["About you and the complaint", "आप और शिकायत के बारे में"],
    verify: ["Verify your mobile number", "अपना मोबाइल नंबर सत्यापित करें"],
    check: ["Check your answers before registering", "दर्ज करने से पहले अपने उत्तर जाँच लें"],
  };

  return (
    <>
      <PageHead en="Register a complaint" hi="शिकायत दर्ज करें" crumbs={[]} />
      <div className="container">
        <div className="wizard">
          <div className="wizard__main">
            {stepIndex > 0 && (
              <button type="button" className="btn btn--quiet back-link" onClick={back}>
                ‹ {t("Back", "पीछे")}
              </button>
            )}
            <p className="wizard__count">{t(`Step ${visibleIndex} of ${visibleSteps.length}`, `चरण ${visibleIndex} / ${visibleSteps.length}`)}</p>
            <div className="wizard__progress" aria-hidden="true">
              <span style={{ width: `${(visibleIndex / visibleSteps.length) * 100}%` }} />
            </div>
            <ErrorSummary errors={errors} />
            <h2 className="wizard__title" ref={headingRef} tabIndex={-1}>
              {t(...stepTitle[step])}
            </h2>

            {step === "describe" && (
              <form onSubmit={submitDescribe} noValidate>
                <Field
                  id="description"
                  label={<span className="visually-hidden">{t("Describe the problem", "समस्या बताइए")}</span>}
                  hint={t("Say what is wrong, where, and since when. Hindi, English or Hinglish are all fine.", "क्या गलत है, कहाँ और कब से, यह बताएँ। हिंदी, अंग्रेज़ी या हिंग्लिश, सब चलेगा।")}
                  error={errors.description}
                >
                  <TextArea id="description" rows={7} value={draft.description} onChange={(e) => update("description", e.target.value)} maxLength={4000} invalid={Boolean(errors.description)} aria-describedby={describedBy("description", true, errors.description)} />
                  <div className="describe__tools">
                    {speech.supported && (
                      <button type="button" className={`btn btn--secondary btn--small${speech.listening ? " is-listening" : ""}`} onClick={speech.listening ? speech.stop : speech.start} aria-pressed={speech.listening}>
                        {speech.listening ? <MicOff size={16} aria-hidden="true" /> : <Mic size={16} aria-hidden="true" />}
                        {speech.listening ? t("Stop listening", "सुनना बंद करें") : t(lang === "hi" ? "Speak in Hindi" : "Speak", "बोलकर लिखें")}
                      </button>
                    )}
                    <span className="char-count" aria-live="polite">
                      {t(`${draft.description.length} of 4,000 characters`, `4,000 में से ${draft.description.length} अक्षर`)}
                    </span>
                  </div>
                </Field>
                <button className="btn" type="submit" disabled={busy}>
                  {busy ? t("Finding the right department…", "सही विभाग खोजा जा रहा है…") : t("Continue", "आगे बढ़ें")}
                </button>
              </form>
            )}

            {step === "department" && (
              <form onSubmit={submitDepartment} noValidate>
                {triage?.urgency === "high" && (
                  <div className="notice notice--danger" role="alert">
                    <span className="notice__title">{t("If anyone is in danger right now, call 112", "यदि कोई अभी खतरे में है, तो 112 पर कॉल करें")}</span>
                    <p>{t("We have marked this complaint as urgent so it is seen first.", "हमने इस शिकायत को अत्यावश्यक चिह्नित किया है ताकि इसे पहले देखा जाए।")}</p>
                  </div>
                )}
                {triage?.centralMatter && (
                  <div className="notice notice--warning">
                    <span className="notice__title">{t("This may be a central government matter", "यह केंद्र सरकार का विषय हो सकता है")}</span>
                    <p>
                      {t("Railways, passports, banks, post offices, income tax and Aadhaar are handled through CPGRAMS. A state officer cannot act on them.", "रेलवे, पासपोर्ट, बैंक, डाकघर, आयकर और आधार की शिकायतें CPGRAMS पर होती हैं। राज्य का अधिकारी इन पर कार्यवाही नहीं कर सकता।")}{" "}
                      <a href="https://pgportal.gov.in/" rel="noopener">{t("Go to CPGRAMS", "CPGRAMS पर जाएँ")}</a>
                    </p>
                  </div>
                )}

                {triage && dept && !showOther ? (
                  <div className="suggestion">
                    <p className="suggestion__label">
                      <Sparkles size={16} aria-hidden="true" />{" "}
                      {triage.source === "ai" ? t("Suggested from your description", "आपके विवरण के आधार पर सुझाव") : t("Matched from the words you used", "आपके शब्दों के आधार पर मिलान")}
                    </p>
                    <p className="suggestion__dept"><DeptIcon id={dept.id} /> {pick(dept.name)}</p>
                    {draft.categoryId && <p className="suggestion__cat">{pick(dept.categories.find((c) => c.id === draft.categoryId)!.name)}</p>}
                    {triage.confidence < 0.6 && <p className="small muted">{t("We are not sure about this one. Please check it.", "हमें इस पर पूरा भरोसा नहीं है। कृपया जाँच लें।")}</p>}
                    {!draft.categoryId && (
                      <Field id="categoryId" label={t("What is it about?", "यह किस बारे में है?")} error={errors.categoryId}>
                        <div className="radios">
                          {dept.categories.map((c) => (
                            <label className="radio" key={c.id}>
                              <input type="radio" name="categoryId" id={c === dept.categories[0] ? "categoryId" : undefined} value={c.id} checked={draft.categoryId === c.id} onChange={() => update("categoryId", c.id)} />
                              <span>{pick(c.name)}</span>
                            </label>
                          ))}
                        </div>
                      </Field>
                    )}
                    <button type="button" className="btn btn--quiet" onClick={() => setShowOther(true)}>
                      {t("This is not right, let me choose", "यह सही नहीं है, मैं स्वयं चुनूँगा")}
                    </button>
                  </div>
                ) : (
                  <>
                    <Field id="departmentId" label={t("Department", "विभाग")} error={errors.departmentId}>
                      <Select id="departmentId" value={draft.departmentId} onChange={(e) => setDraft((d) => ({ ...d, departmentId: e.target.value, categoryId: "" }))} invalid={Boolean(errors.departmentId)} aria-describedby={describedBy("departmentId", false, errors.departmentId)}>
                        <option value="">{t("Choose a department", "विभाग चुनें")}</option>
                        {meta.departments.map((d) => (
                          <option key={d.id} value={d.id}>{pick(d.name)}</option>
                        ))}
                      </Select>
                    </Field>
                    {dept && (
                      <Field id="categoryId" label={t("What is it about?", "यह किस बारे में है?")} error={errors.categoryId}>
                        <div className="radios">
                          {dept.categories.map((c) => (
                            <label className="radio" key={c.id}>
                              <input type="radio" name="categoryId" id={c === dept.categories[0] ? "categoryId" : undefined} value={c.id} checked={draft.categoryId === c.id} onChange={() => update("categoryId", c.id)} />
                              <span>{pick(c.name)}</span>
                            </label>
                          ))}
                        </div>
                      </Field>
                    )}
                  </>
                )}
                <button className="btn" type="submit">{t("Continue", "आगे बढ़ें")}</button>
              </form>
            )}

            {step === "location" && (
              <form onSubmit={submitLocation} noValidate>
                <div className="geo-btn">
                  <button type="button" className="btn btn--secondary" onClick={useMyLocation}>
                    <Crosshair size={18} aria-hidden="true" /> {t("Use my current location", "मेरा वर्तमान स्थान लें")}
                  </button>
                  <p className="small muted" aria-live="polite" style={{ marginTop: "var(--s2)" }}>{geoNote}</p>
                </div>
                <Field id="districtId" label={t("District", "जनपद")} error={errors.districtId}>
                  <Select id="districtId" value={draft.districtId} onChange={(e) => setDraft((d) => ({ ...d, districtId: e.target.value, block: "" }))} invalid={Boolean(errors.districtId)} aria-describedby={describedBy("districtId", false, errors.districtId)}>
                    <option value="">{t("Choose a district", "जनपद चुनें")}</option>
                    {meta.districts.map((d) => (
                      <option key={d.id} value={d.id}>{pick(d.name)}</option>
                    ))}
                  </Select>
                </Field>
                {dist && (
                  <Field id="block" label={t("Development block (optional)", "विकासखंड (वैकल्पिक)")} hint={t("Helps us send it to the nearest officer.", "इससे शिकायत निकटतम अधिकारी तक जाती है।")}>
                    <Select id="block" value={draft.block} onChange={(e) => update("block", e.target.value)} aria-describedby="block-hint">
                      <option value="">{t("Not sure", "पता नहीं")}</option>
                      {dist.blocks.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </Select>
                  </Field>
                )}
                <Field id="village" label={t("Village, ward or landmark (optional)", "गाँव, वार्ड या पहचान स्थल (वैकल्पिक)")}>
                  <Input id="village" value={draft.village} onChange={(e) => update("village", e.target.value)} maxLength={120} autoComplete="address-level4" />
                </Field>
                <button className="btn" type="submit" disabled={busy}>{busy ? t("Checking nearby complaints…", "आस-पास की शिकायतें देखी जा रही हैं…") : t("Continue", "आगे बढ़ें")}</button>
              </form>
            )}

            {step === "similar" && (
              <>
                {joined ? (
                  <div className="notice notice--success" role="status">
                    <span className="notice__title">{t(`You have joined ${joined.id}`, `आप ${joined.id} से जुड़ गए हैं`)}</span>
                    <p>{t(`${joined.count + 1} citizens now face this problem together. Complaints shared by many people rise up the officer's list. You can follow it with your own mobile number.`, `अब ${joined.count + 1} नागरिक इस समस्या में साथ हैं। अधिक लोगों की साझा शिकायत अधिकारी की सूची में ऊपर आती है। आप अपने मोबाइल नंबर से इसे देख सकते हैं।`)}</p>
                    {session?.role === "citizen" && (
                      <Link className="btn" to={`/track?${new URLSearchParams({ id: joined.id, mobile: session.mobile })}`}>{t("Follow this complaint", "यह शिकायत देखें")}</Link>
                    )}
                  </div>
                ) : (
                  <>
                    <p>{t("If one of these is your problem, add your voice instead of filing a new complaint. It gets fixed faster when the officer sees how many people it affects.", "यदि इनमें से कोई आपकी समस्या है, तो नई शिकायत की बजाय उससे जुड़ें। अधिकारी देखते हैं कि कितने लोग प्रभावित हैं, तो समाधान जल्दी होता है।")}</p>
                    <ul className="similar">
                      {similar.map((g) => (
                        <li key={g.id} className="similar__item">
                          <span>
                            <span className="similar__title">{g.subject}</span>
                            <span className="similar__meta">{g.id} · {g.village && g.block && g.village.includes(g.block) ? g.village : [g.village, g.block].filter(Boolean).join(", ")} · {t("since", "से")} {formatDate(g.submittedAt, lang)} · L{g.level}</span>
                            <span className="people"><Users size={16} aria-hidden="true" /> {t(`${g.supportCount + 1} ${g.supportCount ? "people" : "person"} reported`, `${g.supportCount + 1} लोगों ने दर्ज किया`)}</span>
                          </span>
                          {session?.role === "citizen" && (
                            <button type="button" className="btn btn--success btn--small" disabled={busy} onClick={() => join(g.id)}>
                              {t("I face this too", "मेरी भी यही समस्या है")}
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                    {session?.role !== "citizen" && (
                      <div className="action-block">
                        <h3>{t("Verify your mobile to join one of these", "इनसे जुड़ने के लिए मोबाइल सत्यापित करें")}</h3>
                        <OtpSignIn />
                      </div>
                    )}
                    <button type="button" className="btn btn--secondary" onClick={() => forward("similar")}>
                      {t("My problem is different, continue", "मेरी समस्या अलग है, आगे बढ़ें")}
                    </button>
                  </>
                )}
              </>
            )}

            {step === "details" && (
              <form onSubmit={submitDetails} noValidate>
                <Field id="name" label={t("Your full name", "आपका पूरा नाम")} error={errors.name}>
                  <Input id="name" value={draft.name} onChange={(e) => update("name", e.target.value)} autoComplete="name" maxLength={80} invalid={Boolean(errors.name)} aria-describedby={describedBy("name", false, errors.name)} />
                </Field>
                <fieldset className="field" style={{ border: 0, padding: 0, margin: "0 0 var(--s5)" }}>
                  <legend className="field__label">{t("Is this a…", "यह है एक…")}</legend>
                  <div className="radios">
                    {(["complaint", "demand", "suggestion"] as const).map((type) => (
                      <label className="radio" key={type}>
                        <input type="radio" name="type" value={type} checked={draft.type === type} onChange={() => update("type", type)} />
                        <span>
                          <strong>{pick(typeLabels[type])}</strong>
                          <span className="field__hint" style={{ margin: 0 }}>
                            {type === "complaint" && t("Something is not working or someone is not doing their job", "कुछ काम नहीं कर रहा या कोई अपना काम नहीं कर रहा")}
                            {type === "demand" && t("You are asking for a new facility, like a road or a handpump", "आप नई सुविधा माँग रहे हैं, जैसे सड़क या हैंडपंप")}
                            {type === "suggestion" && t("An idea to improve a government service", "किसी सरकारी सेवा को बेहतर बनाने का सुझाव")}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <PhotoInput
                  id="photo"
                  label={t("Photo of the problem (optional)", "समस्या की फ़ोटो (वैकल्पिक)")}
                  hint={t("A photo helps the officer act without a second visit. Later you'll compare it with the officer's photo of the fix.", "फ़ोटो से अधिकारी बिना दोबारा आए कार्यवाही कर पाते हैं। बाद में आप इसे समाधान की फ़ोटो से मिला सकेंगे।")}
                  value={draft.photo}
                  onChange={(photo) => update("photo", photo)}
                />
                <Field id="subject" label={t("Short title", "छोटा शीर्षक")} hint={t("We filled this in from your description. Change it if you like.", "हमने इसे आपके विवरण से भरा है। चाहें तो बदलें।")} error={errors.subject}>
                  <Input id="subject" value={draft.subject} onChange={(e) => update("subject", e.target.value)} maxLength={120} invalid={Boolean(errors.subject)} aria-describedby={describedBy("subject", true, errors.subject)} />
                </Field>
                <button className="btn" type="submit">{t("Continue", "आगे बढ़ें")}</button>
              </form>
            )}

            {step === "verify" && (
              <>
                <p>{t("This is how we send you updates and stop fake complaints. Your number is never shown to officers in full.", "इसी से हम आपको सूचनाएँ भेजते हैं और फ़र्ज़ी शिकायतें रोकते हैं। अधिकारियों को आपका पूरा नंबर नहीं दिखता।")}</p>
                <OtpSignIn onDone={() => goTo("check")} />
              </>
            )}

            {step === "check" && dept && (
              <>
                <dl className="summary">
                  {[
                    { key: "describe" as Step, label: t("Problem", "समस्या"), value: draft.description },
                    { key: "department" as Step, label: t("Department", "विभाग"), value: `${pick(dept.name)} – ${pick(dept.categories.find((c) => c.id === draft.categoryId)?.name ?? { en: "", hi: "" })}` },
                    { key: "location" as Step, label: t("Location", "स्थान"), value: [draft.village, draft.block, dist && pick(dist.name)].filter(Boolean).join(", ") },
                    { key: "details" as Step, label: t("Name", "नाम"), value: draft.name },
                    { key: "details" as Step, label: t("Type", "प्रकार"), value: pick(typeLabels[draft.type]) },
                    { key: "details" as Step, label: t("Title", "शीर्षक"), value: draft.subject },
                    { key: "details" as Step, label: t("Photo", "फ़ोटो"), value: draft.photo ? <img src={draft.photo.dataUrl} alt={t("Your attached photo", "आपकी संलग्न फ़ोटो")} style={{ maxWidth: 160, borderRadius: 8 }} /> : t("None", "कोई नहीं") },
                    ...(session?.role === "citizen" ? [{ key: "verify" as Step, label: t("Mobile", "मोबाइल"), value: `******${session.mobile.slice(-4)}`, fixed: true }] : []),
                  ].map((row, i) => (
                    <div className="summary__row" key={i}>
                      <dt>{row.label}</dt>
                      <dd style={{ whiteSpace: "pre-wrap" }}>{row.value}</dd>
                      <dd>
                        {!("fixed" in row) && (
                          <button type="button" className="btn btn--quiet" onClick={() => goTo(row.key)}>
                            {t("Change", "बदलें")}<span className="visually-hidden"> {row.label}</span>
                          </button>
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
                {session?.role !== "citizen" ? (
                  <div className="notice notice--warning">
                    <p>{t("Sign in with your mobile number to register.", "दर्ज करने के लिए मोबाइल नंबर से साइन इन करें।")}</p>
                    <button type="button" className="btn btn--secondary" onClick={() => goTo("verify")}>{t("Verify mobile", "मोबाइल सत्यापित करें")}</button>
                  </div>
                ) : (
                  <>
                    <p>{t("By registering you confirm the information is true to the best of your knowledge.", "दर्ज करके आप पुष्टि करते हैं कि जानकारी आपकी जानकारी के अनुसार सत्य है।")}</p>
                    <button type="button" className="btn" onClick={submitFinal} disabled={busy}>
                      {busy ? t("Registering…", "दर्ज हो रही है…") : t("Register complaint", "शिकायत दर्ज करें")}
                    </button>
                  </>
                )}
              </>
            )}
          </div>

          <aside className="wizard__aside">
            <div className="aside-card aside-card--plain">
              <h3>{t("Rather talk to someone?", "किसी से बात करना चाहते हैं?")}</h3>
              <p>
                {t("Call", "कॉल करें")} <a href="tel:1905"><strong>1905</strong></a> {t("free from any phone.", "किसी भी फ़ोन से निःशुल्क।")}
              </p>
              <p className="small muted">{t("What you type is saved in this browser until you register, so you won't lose it if the connection drops.", "दर्ज करने तक आपका लिखा इसी ब्राउज़र में सुरक्षित रहता है, कनेक्शन टूटने पर भी नहीं खोता।")}</p>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
