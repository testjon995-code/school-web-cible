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
- **React Router v7 (`react-router-dom`)** — client-side routing across 17 content
  pages plus a catch-all 404 *Not Found* route, configured declaratively with
  `<BrowserRouter>` (no server/data-router or React Server Components mode; see
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
public/            robots.txt, sitemap.xml, site.webmanifest, og-image.jpg, favicon.svg
src/
  assets/          logo, hero & course/faculty imagery
  data/            siteConfig, navigation, courses, faculty, testimonials, faq, events, blog, stats
  lib/             cn.js, validators.js, schema.js (JSON-LD builders)
  hooks/           useScrollReveal.js
  components/
    layout/        Layout, Navbar, Footer, ScrollToTop
    ui/            Button, Card, Container, SectionHeading, Badge, Input, Textarea, Select, Accordion, Breadcrumbs, Spinner
    common/        Hero, Statistics, CourseCard, FacultyCard, ReviewCard, Gallery, Timeline, FAQ, Newsletter, GoogleMap, CTASection, TestimonialSlider, CourseGrid, BlogCard, EventCard, FeatureCard
    cta/           FloatingWhatsApp, FloatingCall, StickyBottomCTA
    forms/         AdmissionForm, ContactForm
    seo/           Seo, StructuredData
  pages/           Home, About, Courses, SpokenEnglish, ScienceCoaching, ComputerCourses, Faculty, Gallery, SuccessStories, Blog, Events, Admission, Career, Faq, Contact, PrivacyPolicy, Terms, NotFound
  App.jsx          route table (React.lazy + Suspense) under <Layout>
  main.jsx         bootstrap (HelmetProvider + BrowserRouter)
  index.css        @import "tailwindcss" + @theme brand tokens
index.html         document shell (SEO defaults, Inter font)
vite.config.js     react() + tailwindcss() plugins
```

## Pages

The application ships 17 content pages plus a catch-all 404, all lazy-loaded under a
shared layout shell (navbar, footer, floating WhatsApp/Call widgets, and a mobile
sticky CTA bar):

1. **Home** — an eleven-band conversion funnel: hero, trust/proof, courses, why
   choose CIBLE, learning journey, faculty/mentors, student success, animated
   statistics, testimonials, events/content, and a closing admission
   call-to-action. Statistics land after the value story rather than above it,
   and every band is composed from the existing primitives — no new component
   was added for any of them. The student-success and events bands surface the
   same **representative** records as their dedicated pages and carry the in-app
   demo-content notice (see [Limitations](#limitations)).
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
18. **404 — Not Found** — a friendly catch-all for unmatched routes.

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
(**Organization**, **LocalBusiness**, **Course**, and **Breadcrumb**). Static
`public/robots.txt` and `public/sitemap.xml` files complete the SEO surface. All of
this metadata is set **client-side** (via `react-helmet-async` and runtime JSON-LD
injection); see [Deployment & Hosting](#deployment--hosting) for how this affects
crawlers that do not execute JavaScript.

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
  ("draft opened — not yet sent").
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
- **Representative content and assets.** See [License & Notes](#license--notes).

## License & Notes

- Some imagery and editorial copy in this repository are **representative
  placeholders** intended to be replaced with genuine, institute-supplied assets
  (real photographs, verified faculty biographies, and actual student records)
  before launch. This is disclosed **visibly in the running app** — a site-wide
  "Demo content notice" band in the footer, plus point-of-claim notices on the
  Home, Faculty, Success Stories, About, Career, Events, Blog, and Courses pages —
  and is gated by the `representativeContent` flag in `src/data/siteConfig.js` (set
  it to `false` once the content is client-verified to retire every notice at once).
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
