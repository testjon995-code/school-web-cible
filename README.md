# CIBLE School of Language

> **Learn English. Build Confidence. Shape Your Future.**

CIBLE School of Language is a premium, conversion-first marketing and admissions
website for an institute based in Madhubani, Bihar. It showcases the school's
**Spoken English**, **Science (PCM/PCB) coaching**, and **Computer courses**, and is
engineered as a fast, accessible, and SEO-optimized React single-page application
(SPA) in which every page, component, and call-to-action is designed to drive
student admissions and inquiries.

## Table of Contents

- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Pages](#pages)
- [Contact & Brand](#contact--brand)
- [Accessibility & SEO](#accessibility--seo)
- [Deployment & Hosting](#deployment--hosting)
- [Security](#security)
- [Limitations](#limitations)
- [License & Notes](#license--notes)

## Tech Stack

The project is built entirely on the client with a modern React toolchain. All
dependency versions are declared as caret (`^`) ranges in
[`package.json`](./package.json) and locked in `package-lock.json`, which together
are the source of truth. The major versions below reflect what is actually declared
and installed; patch/minor levels may float within each caret range.

- **React 19 + Vite 8** — a modern ESM React SPA with fast HMR in development and an
  optimized production build. Vite 8 uses the Rolldown bundler under the hood.
- **React Router v7 (`react-router-dom`)** — client-side routing across 23 route
  entries (21 concrete paths plus two `:slug` patterns that expand to one URL per
  course and per event record) and a catch-all 404 *Not Found* route, configured
  declaratively with `<BrowserRouter>` (no server/data-router or React Server
  Components mode; see [Pages](#pages) for the breakdown and
  [Security](#security)).
- **Tailwind CSS v4** — CSS-first design system wired through the
  `@tailwindcss/vite` plugin (no `tailwind.config.js`; tokens are defined in an
  `@theme` block in `src/index.css`). The brand palette is blue (primary), orange
  (secondary), and green (accent) on a white background, built on an 8px spacing
  scale with rounded cards and soft shadows.
- **react-helmet-async** — per-page SEO head management (title, description,
  canonical, Open Graph, and Twitter cards).
- **react-hook-form** — accessible, validated Admission, Contact, and Newsletter
  forms with loading, error, empty, and success states.
- **framer-motion** + **react-intersection-observer** — subtle fade / slide /
  reveal animations triggered on scroll (respecting `prefers-reduced-motion`).
- **react-countup** — animated statistics counters.
- **swiper** — testimonial and gallery carousels.
- **react-icons** — professional, consistent iconography.
- **clsx** + **tailwind-merge** — the `cn()` helper for safe, conflict-free
  Tailwind class composition.
- **oxlint** — fast linter used as the code-quality gate.

## Getting Started

### Prerequisites

- **Node.js** and **npm**. Vite 8 requires Node.js **20.19+** or **22.12+**
  (the project is developed and validated on Node 22.x). No other global tooling is
  required — all dependencies install locally into `node_modules`.

### Install & run

```bash
# 1. Install dependencies
npm install

# 2. Start the Vite development server (default: http://localhost:5173)
npm run dev

# 3. Create an optimized production build in dist/
npm run build

# 4. Preview the production build locally
npm run preview

# 5. Run the linter (oxlint) quality gate
npm run lint
```

### Available scripts

Each command below maps directly to a script defined in `package.json`.

| Command           | Underlying command | Description                                              |
| ----------------- | ------------------ | -------------------------------------------------------- |
| `npm run dev`     | `vite`             | Start the development server with hot module replacement |
| `npm run build`   | `vite build`       | Produce an optimized production build in `dist/`         |
| `npm run preview` | `vite preview`     | Serve and preview the production build locally           |
| `npm run lint`    | `oxlint`           | Run the Oxlint quality gate                              |

> There is **no `test` script and no automated test suite** in this repository
> (`npm test` is not defined). Quality is gated by `npm run lint` (Oxlint) and a
> clean `npm run build`. See [Limitations](#limitations).

## Project Structure

The codebase follows a reuse-first structure: content lives in `src/data`, styling
tokens live in `src/index.css`, and a single canonical set of primitives is composed
across every page.

```text
public/            robots.txt, sitemap.xml, site.webmanifest, og-image.jpg, favicon.svg, logo.svg
src/
  assets/          logo, hero & course/faculty imagery
  data/            siteConfig, navigation, courses, faculty, testimonials, faq, events, blog, stats,
                   goals, learningPaths, trust, studentDashboard, gallery
  lib/             cn.js, validators.js, dates.js, routeLoading.js, schema.js (JSON-LD builders),
                   storage.js (the single localStorage boundary), states.js (state → label/variant/
                   icon), courseFilters.js, search.js, recommend.js, eventSchedule.js, calendar.js
                   (.ics + provider URL), enquiry.js (WhatsApp/email dispatch seam)
  hooks/           useScrollReveal.js, useSavedCourses.js, useCourseFilters.js, useComparison.js,
                   useDialog.js
  components/
    layout/        Layout, Navbar, Footer, ScrollToTop, ErrorBoundary, RouteProgress
    ui/            Button, Card, Container, SectionHeading, Badge, Input, Textarea, Select, Accordion,
                   Breadcrumbs, Spinner, Dialog, EmptyState, Checkbox, RadioGroup, Stepper, Combobox
    common/        Hero, Statistics, CourseCard, FacultyCard, ReviewCard, Gallery, Timeline, FAQ,
                   Newsletter, GoogleMap, CTASection, TestimonialSlider, CourseGrid, BlogCard,
                   EventCard, FeatureCard, RepresentativeNote, CourseFilters, CourseDetailView,
                   ComparisonTable, LearningPathWizard, GlobalSearch, TrustSection, EventFilters,
                   AddToCalendar
    cta/           FloatingWhatsApp, FloatingCall, StickyBottomCTA
    forms/         AdmissionForm, AdmissionFormSteps, ContactForm
    seo/           Seo, StructuredData
  pages/           Home, About, Courses, CourseDetail, SpokenEnglish, ScienceCoaching,
                   ComputerCourses, Faculty, Gallery, SuccessStories, Blog, Events, EventDetail,
                   Admission, Career, Faq, Contact, LearningPath, Compare, Search, Dashboard,
                   PrivacyPolicy, Terms, NotFound
  App.jsx          route table (React.lazy + Suspense) under <Layout>
  main.jsx         bootstrap (HelmetProvider + BrowserRouter)
  index.css        @import "tailwindcss" + @theme brand tokens
index.html         document shell (SEO defaults, Inter font)
vite.config.js     react() + tailwindcss() plugins
```

## Pages

`src/App.jsx` registers 23 route entries plus a catch-all 404, all lazy-loaded under a
shared layout shell (navbar, footer, floating WhatsApp/Call widgets, and a mobile
sticky CTA bar). Items 1–17 are the original content pages; items 18–23 were added by
the Smart Learning Experience work and are a mix of dynamic patterns and utility
routes, which the note after the list explains:

1. **Home** — hero, featured courses, animated statistics, testimonials, faculty
   preview, and an admission call-to-action.
2. **About** — the institute's story, mission, values, and milestones.
3. **Courses** — the full course catalog.
4. **Spoken English** — the flagship Spoken English program.
5. **Science Coaching** — PCM and PCB coaching for science students.
6. **Computer Courses** — Basic Computer, Digital Literacy, and related programs.
7. **Faculty** — faculty profiles and expertise.
8. **Gallery** — a visual gallery built from on-brand **representative
   illustrations** (not photographs of the actual institute yet — see
   [Limitations](#limitations)).
9. **Success Stories** — **representative** student testimonials and outcomes shown
   for demonstration; these are not verified student records.
10. **Blog** — articles, learning tips, and updates.
11. **Events** — upcoming events, workshops, and seminars.
12. **Admission** — the admission form and enrollment process.
13. **Career** — career and hiring opportunities at the institute.
14. **FAQ** — frequently asked questions.
15. **Contact** — contact form, Google Map, and contact details.
16. **Privacy Policy** — the site's privacy policy.
17. **Terms** — the site's terms of service.
18. **Course detail (`/courses/:slug`)** — one page per catalogue course (ten today),
    carrying that course's own depth: its level, eligibility, prerequisites, outcomes,
    curriculum and suitability wherever the institute's existing description supports
    them, plus the shared six-stage learning journey. Blocks without approved content
    are omitted entirely rather than filled in — see [Limitations](#limitations).
19. **Event detail (`/events/:slug`)** — one page per event record (five today), with a
    real RFC 5545 `.ics` download and a calendar-provider template link generated in
    the browser. No integration is claimed: the copy says a file downloaded or a
    provider opened pre-filled, never that anything was synced.
20. **Find Your Learning Path (`/learning-path`)** — a four-question questionnaire that
    recommends courses from the catalogue and shows the rules that produced each
    result. The scoring is a deterministic, fixed-weight pass that runs entirely on
    the client — there is no model and no service behind it — so the feature is never
    labelled AI, intelligent or personalized in the interface.
21. **Compare (`/compare`)** — side-by-side comparison of up to three courses,
    shareable as `?courses=a,b,c`.
22. **Search (`/search`)** — one client-side index over courses, events, faculty,
    articles, FAQs, and the page set, reached from the header's search control.
23. **My Learning (`/dashboard`)** — an unauthenticated front-end foundation showing
    the visitor's saved courses, their learning-path result, and the real upcoming
    events. There is no account, no sign-in and no enrolment tracking, and the page
    says so; it names no person and fabricates no progress figure.
24. **404 — Not Found** — a friendly catch-all for unmatched routes.

**Three route categories, and why the two counts differ.** `src/App.jsx`,
`src/data/navigation.js` and `public/sitemap.xml` must stay in lock-step, but a
registered route answers four independent questions — registration, human
reachability, canonical URL, and sitemap membership — and answers them differently
depending on its kind:

- **Route patterns** — 2 entries (`courses/:slug`, `events/:slug`). They have no single
  path, so `src/data/navigation.js` cannot list them; each expands to one concrete URL
  per record, giving **15** sitemap URLs today (ten courses, five events). Every one is
  indexable with its own canonical and breadcrumb trail, and is reached by a
  course/event card, a search result or a comparison row.
- **Concrete indexable URLs** — 18 entries (items 1–17 above plus `/learning-path`).
  Each renders stable authored content at its bare URL, passes an explicit `canonical`
  to `<Seo>`, appears in the sitemap, and is listed in `src/data/navigation.js`.
- **Control-reachable utility routes** — 3 entries (`/compare`, `/search`,
  `/dashboard`). Registered, but deliberately in **neither** navigation surface **nor**
  the sitemap, because each one's content is entirely query-determined or is the
  visitor's own local state. Each passes no `canonical` and emits
  `noindex, follow`. Their absence from those artifacts is intentional, **not** drift.

So 2 + 18 + 3 = **23 route entries**, while the sitemap holds 15 + 18 = **33 URLs**.
The two numbers are not meant to match, and neither is wrong. The invariant that does
hold in both directions: every registered route has a human-reachable affordance — a
navigation link for the concrete pages, a card or search result for the patterns, and a
named control for the utility routes (`/compare` from "Compare selected" in the
catalogue's result-count row, `/search` from the header search trigger, `/dashboard`
from the header's saved-courses affordance) — so no page is orphaned, and every path
`src/data/navigation.js` lists is both registered and indexable.

Note that `/courses/spoken-english` (the new detail route) and `/spoken-english` (the
existing track landing page) are **different pages and both continue to resolve**. One
did not replace the other: React Router v7 ranks a static segment above a dynamic one
irrespective of source order, so `/courses` still resolves to the catalogue and the
track pages keep their original URLs and their own calls to action.

## Contact & Brand

- **Phone:** +91 98993 15093
- **Email:** info2cible@gmail.com
- **Address:** State Highway 75 (SH75), Mukhiapatti, Saharghat, Madhubani, Bihar – 847305

### Color system

| Role       | Color |
| ---------- | ----- |
| Primary    | Blue  |
| Secondary  | Orange |
| Accent     | Green |
| Background | White |

The palette is applied consistently across all pages and components via Tailwind
`@theme` tokens defined in `src/index.css`, with high contrast throughout and subtle
neutral sections for visual rhythm.

## Accessibility & SEO

The site targets **WCAG AA** accessibility: semantic HTML landmarks
(`header` / `nav` / `main` / `footer`), ARIA labels, full keyboard navigation,
visible focus states, a logical heading hierarchy, descriptive alt text, and
AA-contrast color pairings across the blue / orange / green palette on white. For
discoverability, every page emits a unique meta title and description together with
Open Graph and Twitter card metadata, and injects JSON-LD structured data
(**Organization**, **LocalBusiness**, **Course**, **Breadcrumb**, and — behind a
per-record verification gate described below — **Event** and **FAQPage**). Static
`public/robots.txt` and `public/sitemap.xml` files complete the SEO surface. All of
this metadata is set **client-side** (via `react-helmet-async` and runtime JSON-LD
injection); see [Deployment & Hosting](#deployment--hosting) for how this affects
crawlers that do not execute JavaScript.

**Structured data is gated on verified content, not merely on available content.**
JSON-LD asserts to a machine that the marked-up content is accurate, and three data
modules label their own content provisional pending institute sign-off:
`courses.js` (durations, highlights, curriculum detail), `events.js` (final media,
exact dates and times) and `faq.js` (timings, batches, fees, payment options, trial
availability, certificate details). Marking up a provisional claim would be a policy
violation rather than a stylistic choice, so the two new blocks are withheld until the
underlying record is confirmed:

- **Event** is emitted on an event detail page only where that record's
  `scheduleConfirmed` is `true`, and never on the `/events` listing — an event's own
  URL is the only valid place for its markup. All five records currently ship
  `scheduleConfirmed: false`, so **no Event block is emitted anywhere today**, and that
  absence is the expected, verified outcome rather than a bug. A record with no
  truthful resolvable location stays withheld even once its schedule is confirmed,
  because `location` is a required property and prose describing an arrangement does
  not satisfy it.
- **FAQPage** is emitted only where **every** question in the emitted set carries
  `answerConfirmed: true` — all-or-nothing per set, because partially marked-up answers
  misrepresent which ones are authoritative. All ten records currently ship
  `answerConfirmed: false`, so no FAQPage block is emitted today either. The questions
  and answers still render visibly on the page exactly as before.
- **Breadcrumb** emits unconditionally on the indexable routes, because it describes
  the site's own structure rather than a content claim. The three `noindex` utility
  routes render their visible trail but emit no JSON-LD at all, since markup on a page
  excluded from the index has no consumer.
- **Course** is unchanged: still emitted for all ten courses, through the same builder
  over the same three fields (name, description, and the provider from `siteConfig`),
  so none of the newly added course fields enters the markup.

The gate is **one boolean per record**. The richer blocks appear the moment the
institute confirms the underlying content, with no code change required. Nothing here
emits `aggregateRating`, `review`, a priced `offers`, or an accreditation field,
because the repository holds no basis for any of them.

## Deployment & Hosting

This is a **client-rendered single-page application (SPA)**. `npm run build` emits a
static bundle to `dist/` (an `index.html` shell plus hashed JS/CSS/asset files) that
can be served by any static host or CDN. Two hosting characteristics follow directly
from the client-only architecture and **must be understood/configured at deploy time**:

- **History fallback / rewrite rule (required).** Routing is handled in the browser by
  React Router's `<BrowserRouter>`, which uses the HTML5 History API. The host must be
  configured to **rewrite all unmatched request paths to `/index.html`** so that deep
  links and hard refreshes on routes such as `/courses` or `/contact` load the app
  instead of returning the host's own 404. Typical configuration:
  - Netlify: a `/* /index.html 200` redirect (e.g. in `netlify.toml` or `_redirects`).
  - Vercel: a catch-all rewrite to `/index.html`.
  - Nginx: `try_files $uri /index.html;`.
  - Apache: a `mod_rewrite` fallback to `index.html`.

  Without this rewrite, only the root `/` path will load reliably.

- **Soft-404 (no true HTTP 404 status).** Because the same `index.html` is served for
  every path, unmatched routes render the in-app **NotFound** page but the HTTP
  response status is still **200**, not a real `404` — a *soft* 404. To keep these
  pages out of the index, `NotFound` emits
  `<meta name="robots" content="noindex, follow">`. A genuine `404` status for unknown
  paths would require server-side logic or host configuration that this static SPA does
  not provide.

- **No server-side rendering or prerendering.** The app is **client-rendered only**.
  The shipped `index.html` contains an empty `#root` element hydrated by JavaScript at
  runtime; there is no SSR, SSG, or build-time prerendering. Crawlers that execute
  JavaScript see the fully rendered content plus the per-page `react-helmet-async`
  metadata and JSON-LD; crawlers that do **not** execute JavaScript see only the static
  defaults in `index.html`. Adding no-JS SEO or social-preview crawling would require a
  prerender/SSR layer (out of scope for this build).

## Security

- **Dependency advisories (`react-router-dom`).** The project pins `react-router-dom`
  at the latest published v7 (`^7.18.1`), the most secure version available for a
  **declarative client SPA**: it resolves the client-relevant advisories
  (open-redirect / XSS classes) that affect older 7.x releases. One residual advisory,
  **GHSA-qwww-vcr4-c8h2** — a CSRF issue in React Router's **React Server Components /
  server-action** mode — has no published version that fixes it without regressing to a
  release that reintroduces the worse client-side advisories. It is **not reachable in
  this application**, which uses only declarative `<BrowserRouter>` routing with no RSC,
  no server actions, and no data-router loaders/actions. It is therefore documented as
  an accepted, non-exploitable ecosystem constraint rather than a code defect;
  re-evaluate when a fixed React Router release is published.
- **Structured-data serialization.** JSON-LD injected into `<script>` tags via Helmet
  is validated (plain objects only) and escaped (`<` → `\u003c`, `>` → `\u003e`,
  `&` → `\u0026`, and U+2028/U+2029) to prevent script-context breakout (CWE-79).
- **Form handoff.** Forms do not post to any server (see [Limitations](#limitations));
  they open a WhatsApp or email **draft** on the user's device. The user's details are
  only transmitted if they choose to send that draft, and each form discloses this
  third-party handoff adjacent to the submit action and links to the Privacy Policy.

### Response headers (host / edge configuration)

The SPA ships no server, so HTTP response headers are **not set by application code** —
they are configured on the static host / CDN / edge that serves `dist/`. The following
hardening headers are **recommended for production** and are tuned to the exact
third-party origins this site actually uses (Google Fonts, plus a Google Maps embed on
the Contact page). Apply them at the edge and verify with a tool such as Mozilla
Observatory or `curl -I` (the CSP is shown wrapped for readability; send it as a single
header value):

```
Content-Security-Policy: default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data:;
  frame-src https://www.google.com;
  connect-src 'self';
  base-uri 'self';
  object-src 'none';
  frame-ancestors 'self'
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

CSP notes specific to this app:

- `style-src` includes `'unsafe-inline'` because Framer Motion and Swiper set inline
  `style` attributes at runtime for animations/transforms; this relaxation applies to
  **styles only**, never scripts. To run a strict inline-style CSP, drive those effects
  with classes/CSS variables and then drop `'unsafe-inline'`.
- `style-src` / `font-src` allow `https://fonts.googleapis.com` / `https://fonts.gstatic.com`
  for the Inter web font loaded in `index.html`; self-hosting Inter lets you tighten both
  back to `'self'` and remove the font preconnects.
- `frame-src https://www.google.com` is required **only** for the Contact page's Google
  Maps `<iframe>`; remove it if the map embed is removed.
- No `script-src` allowance is needed for the JSON-LD injected via `react-helmet-async`:
  `<script type="application/ld+json">` is a non-executed data block, so CSP does not
  gate it.
- `frame-ancestors 'self'` is the modern clickjacking control; `X-Frame-Options: SAMEORIGIN`
  is retained alongside it for legacy browsers.

Caching & CORS:

- **Immutable static assets.** `npm run build` emits content-hashed files under
  `dist/assets/*` (the hash changes whenever content changes), so serve them with
  `Cache-Control: public, max-age=31536000, immutable`. Serve the non-hashed `index.html`
  with `Cache-Control: no-cache` (or a short `max-age` + `must-revalidate`) so a new deploy
  is picked up on the next visit rather than being pinned to a stale shell.
- **CORS.** The app makes no cross-origin data requests, so it needs no permissive CORS.
  Do **not** emit `Access-Control-Allow-Origin: *` on the HTML document; if a CDN needs CORS
  for the hashed asset/font files, scope it narrowly and limit methods to `GET, HEAD`.
- **Genuine 404 status.** As noted under [Deployment & Hosting](#deployment--hosting),
  unmatched paths currently return a *soft* 404 (HTTP 200 with the in-app NotFound page);
  returning a true `404` status requires host/edge configuration that recognises unknown
  paths ahead of the SPA history-fallback rewrite.

## Limitations

This repository is a front-end website. The following are **intentionally not part of
this build** and are documented so integrators are not surprised:

- **No backend, API, or database.** There is no server component and no persistent data
  store. Admission, Contact, and Newsletter forms perform a **client-side handoff** by
  opening a prefilled WhatsApp chat (`https://wa.me/…`) or a `mailto:` email draft;
  nothing is submitted to or stored on a server, and the UI states say so truthfully
  ("draft opened — not yet sent"). The one thing the site does keep is **device-local**
  and is described in the next bullet; it is not a server store, and it does not soften
  this one.
- **Saved courses use device-local browser storage — the site's only persistence.**
  Saving a course writes to the browser's own `localStorage`, on the visitor's own
  device, under a single namespaced, versioned key — **`cible:saved-courses:v1`** —
  through `src/lib/storage.js`, the one module permitted to touch it. The stored value
  holds **only course identifiers** (the same slugs already public in every course URL)
  plus a version marker: no name, no contact detail, no message text, no timestamp, and
  **no personal information** of any kind. It is **never transmitted anywhere** — there
  is still no backend for it to reach — and the visitor stays in control of it: clear
  the whole list on the **My Learning** page, unsave a single course with the same
  control that saved it, or clear this site's data in the browser. It is **functional,
  not analytical**: it sets no cookie, identifies no person, and therefore needs no
  consent banner. It also degrades safely — a corrupted, wrong-shaped or unavailable
  store yields an empty list rather than an error, slugs that no longer exist in the
  catalogue are dropped on read, and when the browser refuses the write (a full quota,
  or Safari private browsing, where the quota is effectively zero) the selection still
  works for the rest of the session while the interface discloses that it will not
  survive a reload. This is **distinct from `cible:chunk-reload`**, the pre-existing
  one-shot chunk-recovery flag in **sessionStorage** owned by `src/lib/routeLoading.js`
  — the two storage areas are deliberately kept separate, and `localStorage.clear()` is
  never called, so unrelated keys on the origin are never destroyed. The visitor-facing
  version of this disclosure is on the Privacy Policy page.
- **No automated tests.** There is no unit/integration/e2e test suite and no `test`
  script; the gates are `npm run lint` (Oxlint) and a clean `npm run build`.
- **No offline / service worker.** `site.webmanifest` supplies installability metadata
  (name, icons, theme color) only. There is **no service worker**, so the app does not
  work offline and does not cache beyond normal browser HTTP caching.
- **No prerender / SSR and no true HTTP-404.** See
  [Deployment & Hosting](#deployment--hosting).
- **iOS safe-area not verified on hardware.** `viewport-fit=cover` plus
  `env(safe-area-inset-*)` padding is implemented for the fixed mobile CTA, but it has
  not been verified on a physical notched iOS device or the iOS Simulator in this
  environment; verify on representative iOS hardware before launch.
- **Blog articles have no URL of their own.** `src/data/blog.js` carries a `content`
  field per article, but no `/blog/:slug` route exists, so that full text is not
  rendered on a page of its own and a blog card is deliberately non-interactive rather
  than linking nowhere. Course and event detail routes were requested and built; blog
  detail routes were not, so this is recorded here rather than added unasked.
- **One declared dependency is unused.** `aos ^2.3.4` is declared in `package.json`
  but has **zero importers** anywhere in `src/` — scroll reveals are owned by
  `framer-motion` + `react-intersection-observer` through `useScrollReveal`. It is
  deliberately left in place rather than removed, because removing it would itself edit
  `package.json` and regenerate entries in `package-lock.json`, and adopting it would
  fork a reveal approach the codebase already has one of. It is therefore a recorded
  known limitation, to be resolved in a dedicated dependency-maintenance change rather
  than silently as a side effect of feature work.
- **Some course detail blocks await content-owner input.** Eligibility, prerequisites,
  outcomes, curriculum and suitability are optional per course, and a course detail page
  omits any block — heading included — that the institute's existing description does
  not support, rather than inventing plausible-sounding copy. Nine of the ten courses
  also carry no difficulty level yet, so no level badge renders on those pages. A page
  showing fewer blocks is the honest state; supply the content to fill it.
- **Representative content and assets.** See [License & Notes](#license--notes).

## License & Notes

- Some imagery and editorial copy in this repository are **representative
  placeholders** intended to be replaced with genuine, institute-supplied assets
  (real photographs, verified faculty biographies, and actual student records)
  before launch. This is disclosed **visibly in the running app** — a site-wide
  "Demo content notice" band in the footer, plus point-of-claim notices on the
  Faculty, Success Stories, About, Career, Events, Blog, and Courses pages, on the
  course detail and event detail routes (each inheriting the disclosure its listing
  page already makes about durations, highlights and dates), and in the trust sections,
  which render alongside representative course copy — and is gated by the
  `representativeContent` flag in `src/data/siteConfig.js` (set it to `false` once the
  content is client-verified to retire every content notice at once).
- **One notice is deliberately exempt from that flag, and must stay that way.** The
  **My Learning** dashboard renders the same `RepresentativeNote` component with
  `gate="always"`, so its notice survives `representativeContent: false`. That is
  intentional: the dashboard's disclosure states an **architectural** fact rather than
  content awaiting confirmation — there is no account, no authentication and no server —
  so confirming the institute's course content changes nothing about it. Retiring it
  with the content flag would delete the only statement telling a visitor that this
  surface does not track a real enrolment, at precisely the moment the site starts to
  look finished. `src/pages/Dashboard.jsx` is the only caller that passes `gate`; every
  other call site uses the default `gate="content"` and retires itself as intended. Do
  not "fix" the dashboard back onto the content gate.
- **Unverified social profiles are hidden by default.** Social links and the
  `sameAs` entries in the JSON-LD are gated behind `socialVerified` in
  `src/data/siteConfig.js` (currently `false`), so no unconfirmed identity is
  published; enable it once the official profile URLs are verified.
- The domain `https://www.cibleschool.com`, the map location/hours, and the contact
  details are **representative** and drive the SEO metadata, structured data,
  `sitemap.xml`, and `robots.txt`; swap them for the final, verified production
  values at launch.
- This is a private project (`"private": true` in `package.json`) developed for
  CIBLE School of Language.
