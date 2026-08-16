/**
 * ScienceCoaching — the CIBLE School of Language science-coaching detail page
 * (route `/science-coaching`).
 *
 * Lazy-loaded by `src/App.jsx`
 * (`const ScienceCoaching = lazy(() => import('./pages/ScienceCoaching.jsx'))`,
 * `<Route path="science-coaching" element={<ScienceCoaching />} />`) and
 * rendered INSIDE the shared `<Layout>`. The Layout owns the page chrome
 * (Navbar, the `<main>` landmark, Footer, floating conversion widgets and
 * scroll-to-top), so this file renders ONLY the page's own content — it never
 * emits a second `<main>` or its own navigation.
 *
 * Scope: the two science programs CIBLE offers — PCM (Physics, Chemistry,
 * Maths) and PCB (Physics, Chemistry, Biology). Rather than hardcoding them,
 * the page derives them at module scope from the single source of truth
 * `src/data/courses.js` by selecting every course whose `category === 'Science'`
 * (`pcm-coaching`, `pcb-coaching`), so adding or renaming a science course in
 * the data module automatically flows through to this page and its JSON-LD.
 *
 * Composition (reuse-first, zero duplication — every element is a shared
 * primitive/composite, never hand-rolled markup):
 * - `<Seo>`            — per-page title/description/canonical + Open Graph /
 *                        Twitter head tags. `title="Science Coaching – PCM & PCB"`
 *                        resolves to the document title
 *                        "Science Coaching – PCM & PCB | CIBLE School of Language".
 * - `<StructuredData>` — emits BreadcrumbList JSON-LD from `crumbs`, plus one
 *                        Course JSON-LD per science course, so the visible trail
 *                        and cards agree with the structured data (AAP §0.6.3 SEO).
 * - `<Container>`      — the single canonical width/gutter wrapper, rendered as a
 *                        semantic `<section>` where it wraps a content section.
 * - `<Breadcrumbs>`    — the visible hierarchy trail (Home / Courses / Science
 *                        Coaching), sharing the exact `{ name, path }` shape
 *                        passed to `<StructuredData breadcrumbs>`.
 * - `<SectionHeading>` — the page heading blocks; `as="h1"` renders the page's
 *                        ONE `<h1>`, section headings use the default `<h2>`.
 * - `<FeatureCard>`    — one "what you'll gain" tile per benefit; each icon is a
 *                        react-icons COMPONENT REFERENCE (decorative, aria-hidden).
 * - `<CourseGrid>`     — the responsive grid of `CourseCard`s, pre-filtered to the
 *                        science courses via the `items` prop.
 * - `<CTASection>`     — the reusable admission call-to-action that closes every
 *                        page, offering the four conversion channels (admission /
 *                        advisor / WhatsApp / call). It owns its own button
 *                        wording, so this page passes no labels and none are
 *                        quoted here; see that component for the current copy.
 *
 * Accessibility (WCAG AA): exactly ONE `<h1>` (the page header, via
 * `SectionHeading as="h1"`); section titles are `<h2>` (SectionHeading default);
 * FeatureCard titles are `<h3>`, keeping a logical heading outline. Sections are
 * semantic `<section>` elements — no page-level `<main>`.
 *
 * Styling: token-only Tailwind v4 utilities on the 8px spacing scale
 * (`py-12`/`md:py-16`, `py-16`/`md:py-20`, `gap-6`, `mt-10`, `mb-6`), a
 * responsive `grid` (1 → 2 → 4 columns) for the benefits, and alternating
 * white / `bg-surface` section backgrounds. No arbitrary values, no hardcoded
 * colors, and static classNames (no `cn` needed on this presentational page).
 *
 * @returns {import('react').ReactElement} The rendered science-coaching page.
 */
import { FaFlask, FaAtom, FaCalculator, FaChartLine } from 'react-icons/fa'
import Seo from '../components/seo/Seo.jsx'
import StructuredData from '../components/seo/StructuredData.jsx'
import Container from '../components/ui/Container.jsx'
import SectionHeading from '../components/ui/SectionHeading.jsx'
import Breadcrumbs from '../components/ui/Breadcrumbs.jsx'
import CourseGrid from '../components/common/CourseGrid.jsx'
import FeatureCard from '../components/common/FeatureCard.jsx'
import CTASection from '../components/common/CTASection.jsx'
import { courses } from '../data/courses.js'

// Breadcrumb trail for this page. The same `{ name, path }` shape is consumed
// both by the visible <Breadcrumbs> trail and by `breadcrumbSchema()` via
// <StructuredData breadcrumbs={crumbs} />, keeping the UI and the JSON-LD
// BreadcrumbList in agreement (module-local; not exported).
const crumbs = [
  { name: 'Home', path: '/' },
  { name: 'Courses', path: '/courses' },
  { name: 'Science Coaching', path: '/science-coaching' },
]

// The science programs, derived from the single source of truth
// (src/data/courses.js) so the cards and their Course JSON-LD stay in sync with
// the data module. The category literal MUST be exactly 'Science'
// (pcm-coaching, pcb-coaching). Module-local; not exported.
const scienceCourses = courses.filter((c) => c.category === 'Science')

// FLAG (AAP §0.7.2): representative "what you'll gain" benefits — production-
// quality structure with polished, representative copy. Confirm/replace with the
// institute's own science-coaching value proposition before launch. Icons are
// passed as react-icons COMPONENT REFERENCES (never rendered elements) into
// FeatureCard, which renders them decoratively (aria-hidden). Module-local; not
// exported.
const benefits = [
  { icon: FaFlask, title: 'Concept Clarity', description: 'Strong fundamentals in Physics, Chemistry, Maths and Biology.' },
  { icon: FaCalculator, title: 'Problem Solving', description: 'Regular practice, tests and doubt-clearing sessions.' },
  { icon: FaChartLine, title: 'Exam Readiness', description: 'Board and competitive-exam oriented preparation.' },
  { icon: FaAtom, title: 'Small Batches', description: 'Personal attention for every student.' },
]

function ScienceCoaching() {
  return (
    <>
      <Seo
        title="Science Coaching – PCM & PCB"
        canonical="/science-coaching"
        description="CIBLE science coaching for PCM (Physics, Chemistry, Maths) and PCB (Physics, Chemistry, Biology) — concept-focused teaching, regular tests and exam-ready preparation in Madhubani."
      />
      <StructuredData breadcrumbs={crumbs} />
      {scienceCourses.map((course) => (
        <StructuredData key={course.slug} course={course} />
      ))}

      <Container as="section" className="py-12 md:py-16">
        <Breadcrumbs items={crumbs} className="mb-6" />
        <SectionHeading
          as="h1"
          align="left"
          eyebrow="Science Track"
          title="PCM & PCB Science Coaching"
          subtitle="Build strong concepts and exam confidence with focused coaching in Physics, Chemistry, Maths and Biology."
        />
      </Container>

      <section className="bg-surface py-16 md:py-20">
        <Container>
          <SectionHeading eyebrow="Why CIBLE Science" title="What You'll Gain" />
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map((b) => (
              <FeatureCard key={b.title} icon={b.icon} title={b.title} description={b.description} />
            ))}
          </div>
        </Container>
      </section>

      <Container as="section" className="py-16 md:py-20">
        <SectionHeading eyebrow="Programs" title="Science Courses" subtitle="Choose your stream." />
        <div className="mt-10">
          <CourseGrid
            items={scienceCourses}
            ctaTo={(c) => `/admission?course=${encodeURIComponent(c.title)}`}
            ctaLabel="Apply Now"
          />
        </div>
      </Container>

      <CTASection />
    </>
  )
}

export default ScienceCoaching
