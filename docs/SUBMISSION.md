# Hackathon submission – CM Helpline 1905 redesign

Copy each answer into the matching form field. Replace `Team_Name` with your team name.

---

## Identified Citizen Problem Statement

CM Helpline 1905 (cmhelpline.uk.gov.in) is how citizens of Uttarakhand reach every state department, but the website makes it hard to file a complaint, follow it, and trust the outcome. Our line-by-line audit (27 Oct 2026) found:

- **Broken trust:** Lorem-ipsum placeholder text is live on the home page, and the 2026 statistics show Total 0, Resolved 0 but Pending 24,901.
- **Dead navigation:** 42 links go nowhere (`javascript:void(0)`), including Services, every Login option and “View Status”. There are typos in the menu (“Trasport & Traffic”). Government orders are unsorted, have duplicate serial numbers, and two titles open PDFs with different dates.
- **Accessibility failures:** There is no page language set (screen readers read Hindi with an English voice) and image alt text reads “banner-1.jpg” and “image description”. Login uses an image CAPTCHA, which blocks blind users, and there is no way to speak a complaint.
- **Friction:** Five different logins sit in one dropdown, and citizens must use a username, password and CAPTCHA. They must also choose a department themselves, so complaints go to the wrong office.
- **No visible accountability:** The citizen is never told which officer holds the complaint or the deadline. The L1–L4 escalation and the 15-day L1 limit exist only inside GO PDFs.

The people hit hardest are elderly and low-literacy citizens, screen-reader users, and families in remote hill villages on slow mobile connections. These are exactly the people the helpline exists for.

## Proposed Solution & Web/Mobile Concept

A citizen-first rebuild of the same service, around one promise: **describe it once, then always know who has it and by when.**

1. **Say it in your own words.** One box on the home page accepts Hindi, English or Hinglish, typed or spoken. No department list to decode.
2. **We route it.** The system suggests the department and category, flags urgent risks (leopard, landslide, no water for days) and warns when an issue belongs on CPGRAMS (railways, passport, banks). The citizen confirms or changes the suggestion.
3. **One question per page.** The steps are location, name and a short title, then a check-your-answers page. Mobile OTP replaces username, password and CAPTCHA, and drafts survive a dropped connection.
4. **Visible accountability.** Every complaint shows the L1→L4 ladder, who holds it now, the days left, and automatic escalation when a deadline passes.
5. **Rights become buttons.** A reminder unlocks after 7 days, feedback after resolution, and reopening within 30 days sends the complaint one level up. Each button appears only when it is allowed.
6. **Honest transparency.** A live district map of Uttarakhand and a graded (A–D) scorecard for every department, where total = resolved + pending.
7. **Proof, not promises.** An officer cannot mark a complaint resolved without a geo-tagged photo. The citizen compares it with their own photo on a before/after slider before rating.
8. **“I face this too”.** Before filing, the citizen sees open complaints about the same problem in the same block and can join one instead of filing a duplicate. Shared problems rise up the officer's queue.
9. **Sahayak.** A voice and chat assistant in Hindi and English that starts a complaint from a conversation, reads out a complaint's status and answers common questions.

The look is formal and state-branded: the Uttarakhand emblem, the Chief Minister's portrait, a tricolour rule and a photo carousel of the state (Kedarnath, Valley of Flowers, Nainital and more) that can be paused and never moves for people who prefer reduced motion.

Every page of the current portal is kept (Home, About, Services/Departments, Government Orders, Privacy, Contact, Register, My Complaints, CPGRAMS, Officer login, Sitemap), reorganised around citizen tasks instead of the org chart. An officer desk lists overdue and urgent complaints first, and the officer's note becomes the citizen's update.

## Key Features & Emerging Technologies

- **AI grievance triage:** Claude classifies free text into department, category and urgency, using structured output. A built-in bilingual keyword classifier runs when AI is off, so the service never depends on it.
- **Sahayak voice and chat assistant:** Conversational complaint intake and status lookup, with speech-to-text and text-to-speech in Hindi and Indian English. It never registers anything without the citizen's review. Sahayak has a friendly illustrated face, a woman in a teal-and-gold saree greeting with namaste, who blinks and moves her lips while replies are read aloud, so first-time and elderly users feel they are talking to a helper, not a form.
- **Voice in and out:** Speak a complaint instead of typing, and press “Listen” to hear its status read aloud.
- **Photo evidence with GPS:** Photos are compressed in the browser (about 150 KB, for 2G/3G hill networks) and geo-tagged. “Use my location” finds the district on the device using Census 2011 district boundaries.
- **Proof of resolution:** Resolving requires an “after” photo. Citizens see an accessible before/after slider.
- **Collective complaints:** Duplicate detection by department, category, district and block. “I face this too” adds a supporter instead of a new record, and supporters can track it with their own mobile.
- **Live district map and department scorecard:** An animated, raised 3D map that tells the state's structure as it appears (one state → Garhwal and Kumaon divisions → 13 districts), then becomes a keyboard-accessible map of the 13 districts with hover tooltips and A–D grades per department from on-time resolution, share resolved and citizen rating.
- **QR acknowledgement:** A printable or PDF acknowledgement slip with the emblem, deadline and a QR code to the status page. The QR never contains the mobile number.
- **Installable app (PWA):** Add to home screen, with an offline fallback. Complaint status is never served stale from cache.
- **Bilingual by design:** Every screen is in Hindi and English, set in Poppins (Indian Type Foundry) and Noto Sans with Devanagari, with the correct `lang` so screen readers switch voice.
- **WCAG 2.1 AA / GIGW 3.0 accessibility:** A skip link, a yellow focus indicator, and error summaries that link to the fields. Text sizes A−/A/A+, a high-contrast mode, reduced motion and 48px touch targets. Focus moves on every page change, and there is no CAPTCHA. An automated check across all 23 routes, in both languages found no unlabelled fields, missing alt text, duplicate IDs or extra H1s.
- **Automatic escalation engine:** L1 has 15 days (per GO), then the complaint moves to the district officer, head of department and Secretary. The officer queue puts overdue, then urgent, then widely shared problems first.
- **Mobile-first and resilient:** No horizontal scroll at 360px, form drafts survive reloads, and a no-JavaScript fallback shows the 1905 number.
- **Privacy and security by default:** Public tracking needs both the complaint number and the mobile number, and officers see masked mobile numbers. Sessions use httpOnly cookies, OTPs are hashed and rate-limited, and Helmet sets a CSP. The GO's limit of 10 open complaints per citizen is enforced.
- **Stack:** React + TypeScript + React Router (hooks and context) for the frontend; Express + Zod for the backend, with routes, controllers and services layers.

Design references: the GOV.UK Design System (one thing per page, error summary, focus style), USA.gov and Canada.ca (photo-led home page with the main task on top, task tiles), India's UX4G and GIGW 3.0, Singapore's LifeSG plain language, the US Web Design System's official-site banner, and Indian state-portal conventions (emblem, Chief Minister's portrait, tricolour, “What's new” strip).

- **Write it formally:** One click turns informal Hinglish, Garhwali or Kumaoni into a clear, formal complaint in Hindi or English that a block officer can act on. Every fact is kept and nothing is added, and the citizen chooses which version to send.
- **Guard-railed assistant:** Sahayak answers only within CM Helpline 1905 and Uttarakhand government services. It refuses unrelated requests (general knowledge, politics, coding), sends emergencies to 112, never asks for OTPs or bank details, and treats citizen text as data so instructions inside it are ignored.
- **14 languages:** Hand-written Hindi and English plus automatic translation of the whole site into Garhwali, Kumaoni, Nepali, Punjabi, Urdu (right to left), Bengali, Marathi, Gujarati, Tamil, Telugu, Kannada and Malayalam. The official record stays in Hindi or English.
- **Natural voice:** Status and Sahayak replies are read aloud in a natural voice in every supported language.
- **Dark mode:** Follows the device setting, with a switch in the top bar, and works alongside high contrast and text resizing.

- **WhatsApp, end to end:** Every update reaches the citizen on WhatsApp, including the officer's photo proof. Citizens can register a complaint just by chatting (AI writes it formally, routes it and asks for the district) and reply STATUS, REMIND, 1–5 or REOPEN. The number is verified by WhatsApp itself, so no OTP is needed.
- **Officer console:** KPIs, a district map of the officer's complaints, a deadline radar, issue breakdown, a searchable priority queue, and "Polish with AI" to turn rough notes into a clear action-taken report.
- **Supabase (Postgres) backend:** Row-level-secured tables with generated columns for dashboards; the API writes every change through.

## Prototype / Pitch Deck Link

GitHub: `https://github.com/<your-account>/Team_Name`. It includes the working prototype, `docs/AUDIT.md` and the run instructions in `README.md`.
