import { Link } from "react-router-dom";
import { PageHead } from "../components/PageHead";
import { useI18n } from "../context/I18nContext";

// Hackathon submission content. Kept in English for the jury; mirrored in docs/SUBMISSION.md.

const findings: { area: string; issue: string; evidence: string }[] = [
  { area: "Content", issue: "Placeholder Lorem-ipsum text is live on the home page", evidence: "“Sed ut perspiciatis unde omnis…” under Features 3 and 4" },
  { area: "Trust", issue: "Statistics contradict each other", evidence: "2026 panel: Total 0, Resolved 0, In process 0, Pending 24,901" },
  { area: "Navigation", issue: "42 links lead nowhere", evidence: "href=\"javascript:void(0)\" on Services, Login menu, View Status and more" },
  { area: "Accessibility", issue: "No page language declared", evidence: "<html> has no lang attribute, so screen readers read Hindi with an English voice (WCAG 3.1.1)" },
  { area: "Accessibility", issue: "Meaningless image descriptions", evidence: "alt=\"banner-1.jpg\", alt=\"image description\" (5 times)" },
  { area: "Accessibility", issue: "Image CAPTCHA on login", evidence: "“Can't read the image? click here” – blocks blind and low-vision users (WCAG 1.1.1)" },
  { area: "Records", issue: "Government orders unsorted, duplicated and mislabelled", evidence: "Serial no. 5 appears three times; 2022–2026 mixed; “19 March 2025” opens a file dated 25 March; “30 July 2026” opens one dated 14 Aug" },
  { area: "Clarity", issue: "Citizen never told who holds the complaint or the deadline", evidence: "L1–L4 levels and the 15-day L1 limit exist only in GO PDFs" },
  { area: "Quality", issue: "Spelling errors in navigation and copy", evidence: "“Trasport & Traffic”, “stay informated”, “timeSpecial supervision”" },
  { area: "Security", issue: "Internal IP address exposed in a response header", evidence: "Content-Security-Policy: frame-ancestors 'self' http://10.66.33.11" },
  { area: "Friction", issue: "Two separate login systems, username + password + CAPTCHA", evidence: "Citizen, CM AAWAS, CSO, Officer, VIP logins in one dropdown" },
  { area: "Routing", issue: "Citizen must pick from department lists to file", evidence: "Services menu offers 6 broad categories, most of them dead links" },
];

export function Proposal() {
  const { t } = useI18n();
  return (
    <>
      <PageHead en="About this redesign" hi="इस नए डिज़ाइन के बारे में" lead="A proposal to make CM Helpline 1905 simpler, smarter and accessible to every citizen of Uttarakhand." />
      <div className="container prose" lang="en">
        <p className="notice small">{t("This page is in English for the hackathon jury.", "यह पृष्ठ हैकाथॉन निर्णायकों हेतु अंग्रेज़ी में है।")}</p>

        <h2>1. Identified citizen problem statement</h2>
        <p>
          A villager in Pauri whose water supply has stopped needs three things from CM Helpline 1905: to say what is wrong in their own words, to know who is
          now responsible, and to see that something will happen by a known date. The current portal makes all three hard.
        </p>
        <p>We audited cmhelpline.uk.gov.in line by line on 27 October 2026. Main findings:</p>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th scope="col">Area</th><th scope="col">Problem</th><th scope="col">Evidence on the live site</th></tr>
            </thead>
            <tbody>
              {findings.map((f) => (
                <tr key={f.issue}><td>{f.area}</td><th scope="row" style={{ fontWeight: 600 }}>{f.issue}</th><td>{f.evidence}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          The result is that citizens fall back on calling, complaints go to the wrong department, and trust drops when the published numbers don't add up.
          People who are elderly, have low literacy, use screen readers or are on a slow hill connection are hit hardest.
        </p>

        <h2>2. Proposed solution and web concept</h2>
        <p>A citizen-first rebuild of the same service, with the same routes, rules and back-office flow, around one idea: <strong>describe it once, then always know who has it and by when.</strong></p>
        <ol>
          <li><strong>Describe in your own words.</strong> One text box on the home page, in Hindi, English or Hinglish, typed or spoken. No department list to decode.</li>
          <li><strong>We route it.</strong> The system suggests the department and category, flags urgent risks (leopard, landslide, no water) and spots central matters that belong on CPGRAMS. The citizen confirms or changes it.</li>
          <li><strong>One question per page.</strong> Location, name, a short title, then a check-your-answers page. Mobile OTP replaces username, password and CAPTCHA.</li>
          <li><strong>Visible accountability.</strong> Every complaint shows the L1→L4 ladder, the officer level holding it, days left, and automatic escalation when the deadline passes.</li>
          <li><strong>Rights made into buttons.</strong> Reminder unlocks after 7 days; feedback after resolution; reopen within 30 days sends it one level higher. Each button appears only when it is allowed.</li>
          <li><strong>Honest transparency.</strong> A live district map and a graded scorecard for every department, where total = resolved + pending.</li>
          <li><strong>Proof, not promises.</strong> An officer cannot mark a complaint resolved without a geo-tagged photo. The citizen compares it with their own photo on a before/after slider before rating.</li>
          <li><strong>“I face this too”.</strong> Before filing, the citizen sees open complaints about the same thing in the same block and can join one instead of filing a duplicate. Shared problems rise up the officer's queue.</li>
          <li><strong>Sahayak, a voice and chat assistant.</strong> Ask in Hindi or English, by voice or text: it routes a new complaint, reads out a complaint's status, and answers questions, then hands over to the same reviewed form.</li>
        </ol>
        <p>
          Everything in the original portal is kept: Home, About, Services (departments), Government Orders, Privacy, Contact, Register Complaint, My
          Complaints, CPGRAMS, officer login, sitemap. It is reorganised around tasks instead of the org chart.
        </p>

        <h2>3. Key features and emerging technologies</h2>
        <ul>
          <li><strong>AI grievance triage</strong> – Claude classifies free text in Hindi, English or Hinglish (and makes a best effort with Garhwali and Kumaoni) into department, category and urgency, with structured output. A built-in bilingual keyword classifier runs when AI is off, so the service never depends on it, and nothing personal is sent unless enabled.</li>
          <li><strong>Voice input</strong> – speech-to-text in Hindi (hi-IN) and Indian English through the browser for people who find typing hard.</li>
          <li><strong>Bilingual by design</strong> – every string in Hindi and English, Poppins (Indian Type Foundry) and Noto Sans with Devanagari, correct <code>lang</code> on the page so screen readers switch voice.</li>
          <li><strong>Sahayak assistant</strong> – conversational complaint intake and status lookup with speech-to-text and text-to-speech in hi-IN / en-IN; it never registers anything without the citizen's review. An original animated avatar (namaste, saree) blinks and lip-syncs while speaking.</li>
          <li><strong>Photo evidence with GPS</strong> – photos are compressed in the browser (a 4 MB photo becomes about 150 KB for 2G/3G hill networks) and geo-tagged; “Use my location” finds the district with an on-device point-in-polygon lookup against Census 2011 district boundaries.</li>
          <li><strong>Proof of resolution</strong> – resolving requires an “after” photo; citizens see an accessible before/after comparison slider.</li>
          <li><strong>Collective complaints</strong> – duplicate detection by department, category, district and block; “I face this too” adds a supporter instead of a new record, and supporters can track it with their own mobile.</li>
          <li><strong>Live district map and scorecard</strong> – an animated 3D map that divides from state to Garhwal/Kumaon to 13 districts, then an interactive, keyboard-accessible SVG map of the 13 districts (pending, share resolved, registered), and A–D grades per department from on-time resolution, share resolved and citizen rating.</li>
          <li><strong>Listen</strong> – a “Listen” button reads a complaint's status aloud for people who cannot read comfortably.</li>
          <li><strong>QR acknowledgement</strong> – a printable / PDF acknowledgement slip with the state emblem, deadline and a QR code to the status page (the QR never contains the mobile number).</li>
          <li><strong>Installable app (PWA)</strong> – add to home screen, with an offline fallback; status data is never served stale from cache.</li>
          <li><strong>Accessibility to WCAG 2.1 AA / GIGW 3.0</strong> – skip link, visible yellow focus, error summaries that link to fields, text size A−/A/A+, high-contrast mode, reduced motion, 48px touch targets, focus moved on every page change, no CAPTCHA.</li>
          <li><strong>Automatic escalation engine</strong> – L1 15 days (per GO), then district, HoD and Secretary, computed server-side and shown to citizen and officer alike.</li>
          <li><strong>Officer desk</strong> – queue sorted overdue first, then urgent, then problems many citizens share; one plain-language note serves as the citizen update and the action-taken report.</li>
          <li><strong>Privacy by default</strong> – public tracking needs both complaint number and mobile; officers see masked numbers; httpOnly session cookies; rate-limited OTP; enforcement of the 10-open-complaints rule from the GO.</li>
          <li><strong>Mobile-first and resilient</strong> – works on a 360px phone, form drafts survive a dropped connection, and a no-JavaScript fallback gives the 1905 number.</li>
        </ul>
        <p>Design inspiration: GOV.UK Design System (one thing per page, error summary, focus style), USA.gov and Canada.ca (photo-led home page with the main task on top, task tiles), India's UX4G and GIGW 3.0, Singapore's plain-language LifeSG, the US Web Design System's official-site banner, and Indian state-portal conventions (state emblem, Chief Minister's portrait, tricolour, “What's new” strip, all made accessible).</p>

        <h2>4. Prototype and pitch deck</h2>
        <ul>
          <li>Working prototype: this site (React + Express). Try it with the demo mobile <strong>9876543210</strong>, or track <strong>CMH-2026-004512</strong>.</li>
          <li>Source code and documents: GitHub repository <code>Team_Name</code> (replace with your team name before submitting).</li>
        </ul>
        <div className="btn-row">
          <Link className="btn" to="/register">Try registering a complaint</Link>
          <Link className="btn btn--secondary" to="/track?id=CMH-2026-004512&mobile=9876543210">See a tracked complaint</Link>
        </div>
      </div>
    </>
  );
}
