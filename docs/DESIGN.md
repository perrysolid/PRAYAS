# Design notes

## Principles

1. **Start from what the citizen knows.** People know their problem, not the org chart. Lead with a free-text box and the phone number, not a department grid.
2. **One thing per page.** Each registration step asks one question, with a check-answers page at the end (GOV.UK pattern).
3. **Show the promise.** Every complaint shows who holds it and by when. The escalation ladder is the most important component.
4. **Formal, but proud of the state.** Government trust comes from clarity and plain words; the state's identity (emblem, Chief Minister, tricolour, its landscapes) makes it recognisably Uttarakhand's. Motion is limited to one paused-able photo carousel and a slow news strip.
5. **Hindi is not a translation afterthought.** Both languages are written side by side in the code, `t("English", "हिंदी")`, and use Devanagari-first fonts.

## Tokens

| Token | Value | Use |
|---|---|---|
| Himalayan blue | `#123E7C` | Nav bar, headings, primary buttons |
| Deep blue | `#0A2650` | Identifier bar, footer |
| Saffron | `#F28C1B` | Main call to action, active nav, accents (text uses `#8F4A00`) |
| Pine | `#0E7A45` | “Resolved”, success |
| Focus yellow | `#FFD23F` | Keyboard focus (GOV.UK style) |
| Ink / Muted | `#16202B` / `#4A5868` | Text (muted is 7.2:1 on white) |
| Status | blue registered, amber in progress, green resolved, red overdue | Same meaning everywhere |

Type: **Poppins** (Indian Type Foundry, Latin + Devanagari) for headings, **Noto Sans** (with Devanagari) for body, self-hosted. Scale 14 / 17 / 20 / 24 / 32 / 44 px, multiplied by the user's text-size choice. Hindi gets a taller line height (1.75).

Hero: a full-width photo carousel of Uttarakhand behind the main task (“What is the problem?”) and the 1905 call card, with task tiles overlapping its lower edge. The carousel has a pause button, stops on hover and focus, never auto-plays under reduced motion, and its captions are text.

## References and what we took

| Source | Taken |
|---|---|
| GOV.UK Design System | One question per page, error summary linking to fields, yellow focus with underline, check-your-answers |
| UX4G (NeGD) and GIGW 3.0 | Indian government accessibility baseline (WCAG 2.1 AA), text-size and contrast controls |
| Singapore LifeSG / SGDS | Plain-language, task-first navigation |
| US Web Design System | Official-site identifier banner above the header |
| USA.gov, Canada.ca | Photo-led home page with the main task on top, task tiles below |
| Indian state portals | State emblem, Chief Minister's portrait, tricolour, “What's new” strip (made pausable) |

The identifier bar currently reads “Prototype redesign of a Government of Uttarakhand service”. On adoption it becomes “Official website of the Government of Uttarakhand”.

## Accessibility checklist (verified)

Skip link · unique `<title>` per route · single H1 per page · `lang` follows language toggle · focus moves to `<main>` on navigation · all inputs labelled, hints and errors linked with `aria-describedby` · error summary takes focus · live region for voice status · 48px targets · high contrast mode · reduced-motion respected · no horizontal scroll at 360px in Hindi and English · works at 130% text size · carousel and news strip pausable (WCAG 2.2.2) · map districts are keyboard buttons with the same data in a table · before/after slider is a native range input · high-contrast mode re-checked for every new component.
