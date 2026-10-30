# Audit of cmhelpline.uk.gov.in

Audited 27 October 2026 from the public HTML of `/`, `/about-us`, `/contact-us`, `/govt-order`, `/privacy-policy` and the response headers. Severity reflects impact on citizens.

## Critical

| # | Problem | Evidence | Fix in this prototype |
|---|---|---|---|
| 1 | Statistics contradict each other | “This year complaint (2026)”: Total 0, Resolved 0, In process 0, **Pending 24,901** | Dashboard computes every figure from the same records; total = resolved + pending |
| 2 | Placeholder text in production | Features 3 and 4 read “Sed ut perspiciatis unde omnis iste natus error…” | Real copy throughout |
| 3 | 42 links lead nowhere | `href="javascript:void(0)"` ×34, `href="#"` ×4, more variants; includes Services menu, all Login options, “View Status” | Every link resolves; sitemap generated from routes |
| 4 | No page language | `<html>` with no `lang` (WCAG 3.1.1). Hindi content is read with an English voice | `lang` updates with the language toggle |
| 5 | Citizen never sees who holds the complaint or the deadline | L1–L4 and the 15-day L1 period exist only in GO PDFs | Escalation ladder with current level and days left on every complaint |

## High

| # | Problem | Evidence | Fix |
|---|---|---|---|
| 6 | Image CAPTCHA on login | “Enter the code below here… Can't read the image? click here” | Mobile OTP only; no CAPTCHA |
| 7 | Five logins in one dropdown | Register Complaint/Login, CM AAWAS, CSO, Officer, VIP | One citizen sign-in (OTP); officers on a separate tab |
| 8 | Citizens must pick the department | Services lists 6 broad groups, mostly dead links | Free-text description → suggested department, editable |
| 9 | Meaningless alt text | `alt="banner-1.jpg"`, `alt="banner-2.jpg"`, `alt="image description"` ×5, `alt=""` ×2 on content | Decorative SVGs `aria-hidden`; no image carries information without text |
| 10 | Government orders unusable | Unsorted 2020–2026; serial “5” appears three times; generic titles “Government Order”; “19 March 2025” opens `MOM-CM-Help-25-march-2025.pdf`; “30 July 2026” opens `…Dated-2026-08-14.pdf` | Newest first, searchable, filter by type, descriptive titles, undated items labelled |
| 11 | Internal network address exposed | `Content-Security-Policy: frame-ancestors 'self' http://10.66.33.11;` | Helmet default CSP |
| 12 | No guidance on central matters until after filing | CPGRAMS is a separate link | Triage warns when text mentions passport, railway, bank, Aadhaar etc. |

## Medium

| # | Problem | Evidence | Fix |
|---|---|---|---|
| 13 | Typos in navigation and copy | “Trasport & Traffic” (menu and footer), “stay informated about news purposes”, “stipulated timeSpecial supervision” | Proof-read copy |
| 14 | Feature list items look like links but aren't | “Features” and “Integration” numbered tiles have no targets | Integrations described on About with real links |
| 15 | Mixed-language headings | Hindi headings beside English body in the same view | Full Hindi and English versions, switchable |
| 16 | Heavy page | jQuery, Bootstrap, DataTables (5 files), Owl Carousel, Select2, Waypoints, CounterUp, CryptoJS, SweetAlert, iziToast, Google Tag Manager | One 105 KB (gzip) bundle; self-hosted fonts; no trackers |
| 17 | Contact email notice in Hindi only | Banner explains the gmail → uk.gov.in change only in Hindi | Single official email everywhere |

## Note on Apuni Sarkar (eservices.uk.gov.in)

We also reviewed Apuni Sarkar before choosing. It was recently rebuilt (React, TanStack Router, accessibility widget, full Hindi translation). Remaining issues: the page is blank without JavaScript; there are typos in the locale file (“Easy of Navigation”, “avialable”, “atleast”, “aviaibility”); a “best viewed at 1024×768” notice; the documents needed are revealed only after you start applying; fees are inconsistent (₹40 on service pages, ₹30 service charge in the FAQ); and it uses a separate login and ID from CM Helpline. Because CM Helpline has much larger problems, we focused there.
