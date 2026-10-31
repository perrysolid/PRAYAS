# CM Helpline 1905 – citizen-first redesign (hackathon prototype)

A working redesign of [cmhelpline.uk.gov.in](https://cmhelpline.uk.gov.in/), Uttarakhand's grievance portal. Same service, same rules and back-office flow, rebuilt around one idea: **describe it once, then always know who has it and by when.**

- `docs/SUBMISSION.md` – answers for the hackathon form (problem, solution, features, link)
- `docs/AUDIT.md` – line-by-line audit of the live portal, with evidence
- `docs/DESIGN.md` – design system, references and decisions

## Run it

Requires Node 20+.

```bash
npm install
npm run dev          # API on :4000, web on http://localhost:5173
```

Production (one process serves API + built site):

```bash
npm run build
cd server && NODE_ENV=production JWT_SECRET=<long-random> npm start   # http://localhost:4000
```

For a hosted demo with no SMS gateway, also set `SHOW_DEMO_OTP=true` so the OTP appears on screen.

### Demo walkthrough

| Try | How |
|---|---|
| Register a complaint | Home → type or speak “पौड़ी में 6 दिन से बिजली नहीं है” → Continue. The OTP is shown on screen in dev. |
| Track without signing in | `/track` with **CMH-2026-004512** and **9876543210** |
| Citizen actions | Sign in with **9876543210** → My complaints → send a reminder, rate CMH-2026-004498, reopen |
| Officer desk | Sign in → Officer tab → `je.jal.khirsu` / `Demo@1905` (also `sdo.upcl.srinagar`, `ee.pwd.pauri`) |
| “I face this too” | Register → “No water in Khirsu ward 4…” → district Pauri, block Khirsu → join CMH-2026-004512 instead of filing a duplicate |
| Photo proof | Register with a photo → sign in as `ee.pwd.pauri` (for a road complaint) → resolve with an “after” photo → citizen sees the before/after slider |
| Sahayak | “Ask Sahayak” (bottom right) → type `CMH-2026-004512`, then `9876543210`; or describe a problem by voice |
| Acknowledgement | After registering → “Download acknowledgement” (print or save as PDF, with QR) |
| Live map | Home → “Complaints across Uttarakhand”, or `/dashboard` for the scorecard |
| Hindi / accessibility | हिंदी, A−/A/A+ and High contrast in the top bar |

Delete `server/data.json` to reset the demo data.

### AI triage (optional)

By default a built-in bilingual keyword classifier (English, Hindi, Hinglish) routes complaints, with no network calls. Set `ANTHROPIC_API_KEY` in `server/.env` to use Claude (`claude-opus-5-5`, structured output, low effort) instead. It falls back to the keyword classifier on any error or refusal. The Claude path is typechecked but was not exercised against the live API while this prototype was built.

### Language model features (optional)

Set `AI_API_KEY`, `AI_MODEL`, `AI_DRAFT_MODEL` and `AI_TTS_MODEL` in `server/.env` (see `server/.env.example`). The key never leaves the server. This turns on:

- **Live writing help**: under "What is the problem?", once the citizen pauses typing or speaking, shows a clearer one-line version, tap-to-add answers for missing details (where, since when, how many affected) and useful words. Nothing changes until they tap, and no facts are invented.
- **Write it formally**: rewrites the citizen's words into a formal complaint in Hindi or English, keeping every fact and adding none. The citizen picks their version or the formal one.
- **Guarded Sahayak**: answers only about CM Helpline 1905 and Uttarakhand government services, refuses everything else (general knowledge, politics, coding), flags emergencies with 112, and never claims to register or change anything. Citizen text is always sent as data, never as instructions.
- **14 languages**: English and Hindi are hand-written; Garhwali, Kumaoni, Nepali, Punjabi, Urdu (right to left), Bengali, Marathi, Gujarati, Tamil, Telugu, Kannada and Malayalam are translated automatically in place, with a notice and a one-click way back to English.
- **Natural voice** for Listen and Sahayak in every language, falling back to the browser's voice.
- **Model triage**, ahead of the keyword classifier, which stays as the fallback.

All AI endpoints (`/api/ai/*`) are validated and rate-limited, and every feature degrades gracefully when the model is unavailable.

### WhatsApp updates

Every change to a complaint (registration, officer note, automatic escalation, resolution with photo, reminder, reopening, neighbours joining) is sent to the citizen on WhatsApp, and to citizens who joined it. Citizens can reply:

| Reply | What happens |
|---|---|
| Any description of a problem | AI writes it formally, routes it, asks for the district, and registers it after **YES** |
| `STATUS` | Their complaints with level and deadline |
| `REMIND` | Sends a reminder on the latest open complaint (rules apply) |
| `1`–`5` | Rates the latest resolved complaint |
| `REOPEN` | Reopens it one level higher |

Without a WhatsApp Business account, messages are **simulated** and shown in the demo phone at `/whatsapp` (demo number 98765 43210, or your own number once signed in). To send real messages, set `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_VERIFY_TOKEN` and `WHATSAPP_APP_SECRET`, and point the Meta webhook at `/api/whatsapp/webhook` (signature-checked). Messages started by the business outside the 24-hour window need approved templates in production.

### Officer console

`/officer` (demo: `ee.pwd.pauri`, `sdo.upcl.srinagar` or `je.jal.khirsu`, password `Demo@1905`): KPIs, a district map of the officer's own complaints, a deadline radar, issues breakdown, a searchable priority queue and a workspace with "Polish with AI" for action-taken reports. Resolving needs a photo, which reaches the citizen on WhatsApp.

### Supabase

Apply `supabase/migrations/20261031000000_init.sql` to a Supabase project, then set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `server/.env`. On start the API loads from Supabase (filling an empty database from the seed) and writes every change through. Row level security is on with no public policies, so only the server's service role can read data. Without these variables the API uses `server/data.json`.

### Dark mode

Follows the device setting by default; the "Dark mode" switch in the top bar overrides it. High contrast always wins.

## Architecture

```
client/ (React 18 + Vite + TypeScript + React Router 6)
  src/pages/        Route screens: Home, Register (wizard), Track, MyComplaints, ComplaintDetail,
                    Receipt, Officer, Departments, Dashboard, Orders, Info pages, Credits, Proposal
  src/components/   Layout (id bar, header, nav, footer), Form (Field, ErrorSummary), Ladder,
                    Timeline, OtpSignIn, TrackForm, StatusTag, PageHead
  src/context/      I18n (en/hi + <html lang>), A11y (text size, contrast), Auth, Meta
  src/components/   HeroCarousel, Ticker, UkMap, Sahayak, PhotoInput, BeforeAfter, ReadAloud, DeptIcon
  src/data/ukMap.ts District outlines (Census 2011, simplified) + point-in-district lookup
  src/hooks/        useAsync, useDraft, useSpeechInput, useSpeak, useCountdown, useDocumentTitle
  src/lib/api.ts    Typed API client

server/ (Express + TypeScript + Zod)
  routes/ → controllers/ → services/ → data/store
  routes:      auth, grievances, officer, public (meta, stats, orders, contact)
  services:    grievance (lifecycle, rules), triage (rules + Claude), auth (OTP, officers), stats
  middleware:  session cookie, role guards, Zod validation with field errors, rate limits, errors
  data:        catalog (departments, 13 districts + blocks, L1–L4, GOs), JSON-file store
```

### API

| Method | Path | Who | What |
|---|---|---|---|
| POST | `/api/auth/otp/send`, `/otp/verify` | public | Mobile OTP sign-in (rate-limited, hashed, 5 attempts) |
| POST | `/api/auth/officer/login` | public | Officer sign-in (demo; production uses Jan Parichay) |
| GET | `/api/auth/me` · POST `/api/auth/logout` | any | Session |
| POST | `/api/grievances/triage` | public | Suggest department, category, urgency, CPGRAMS flag |
| GET | `/api/grievances/track?id&mobile` | public | Masked status view; both fields required |
| GET/POST | `/api/grievances` | citizen | List mine / register (max 10 open, per GO) |
| GET | `/api/grievances/:id` | owner | Full record + allowed actions |
| GET | `/api/grievances/similar?departmentId&districtId&categoryId&block` | public | Open complaints about the same thing nearby |
| POST | `/api/grievances/:id/support` | citizen | “I face this too” (not on your own complaint) |
| POST | `/api/grievances/:id/reminder` · `/feedback` · `/reopen` | owner | Lifecycle actions, enforced server-side |
| GET | `/api/officer/grievances` · POST `/:id/actions` | officer | Queue (overdue, urgent, widely shared first) / update, or resolve with a photo |
| GET | `/api/meta` · `/api/stats` · `/api/orders` | public | Catalogue, dashboard, government orders |

### Business rules

- L1 has 15 days (per GO raising it from 7). L2 7, L3 7, L4 10 days are prototype defaults in `server/src/data/catalog.ts`.
- Escalation is automatic once a level's deadline passes; it is applied on read.
- Reminders open 7 days after registering, then every 72 hours while the complaint is open.
- Feedback is allowed once, after resolution; a rating of 3 or more closes the complaint.
- A complaint can be reopened within 30 days of resolution, and goes up one level.
- At most 10 unresolved complaints per mobile number (per GO).
- Resolving needs an “after” photo (proof of resolution). Photos are resized in the browser and stored inline in the prototype; production would use object storage.
- Public tracking accepts the owner's mobile or a supporter's mobile.

### Images and data

Photos are from Wikimedia Commons (CC BY / CC BY-SA / CC0), the state emblem and the Chief Minister's portrait are government works; full credits are at `/credits`. District boundaries are Census 2011 via DataMeet / india-maps-data. Swap in official ITDA photography before any real deployment.
