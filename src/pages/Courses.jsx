/**
 * Courses — the full course catalog page for CIBLE School of Language
 * (route `/courses`).
 *
 * Lazy-loaded by `src/App.jsx`
 * (`const Courses = lazy(() => import('./pages/Courses.jsx'))`,
 * `<Route path="courses" element={<Courses />} />`) and rendered INSIDE the
 * shared `<Layout>`. The Layout owns the page chrome (Navbar, `<main>`
 * landmark, Footer, floating conversion widgets, scroll-to-top), so this file
 * renders ONLY the page's own content — never a second `<main>` or navigation.
 *
 * Purpose (AAP §0.1.1): surface ALL 10 CIBLE courses in one browsable catalog
 * with category filtering (English / Science / Computer / Career), driving the
 * visitor toward admission via the closing call-to-action.
 *
 * Composition (reuse-first, zero duplication — every element is a shared
 * primitive/composite, never hand-rolled markup):
 * - `<Seo>`            — per-page title/description/canonical + Open Graph /
 *                        Twitter head tags. `title="Courses"` resolves to the
 *                        document title "Courses | CIBLE School of Language".
 * - `<StructuredData>` — emits BreadcrumbList JSON-LD from `crumbs` so the
 *                        visible trail and the structured data always agree,
 *                        PLUS one Course JSON-LD block for every catalog entry
 *                        (`courses.map(courseSchema)`) so all ten courses —
 *                        including Career Guidance — are covered by structured
 *                        data (search-engine friendly, AAP §0.6.3 SEO; M19).
 * - `<Container as="section">` — the single canonical width/gutter wrapper,
 *                        rendered as a semantic `<section>` landmark.
 * - `<Breadcrumbs>`    — the visible hierarchy trail (Home / Courses), sharing
 *                        the exact `{ name, path }` shape passed to
 *                        `<StructuredData>`.
 * - `<SectionHeading as="h1">` — the page's ONE `<h1>`.
 * - `<RepresentativeNote>` — the ONE canonical point-of-claim disclosure, gated
 *                        site-wide by `siteConfig.representativeContent`. Its
 *                        copy must name every course field the cards actually
 *                        display, so it is revised whenever `CourseCard` starts
 *                        surfacing a new one (content integrity, AAP §0.2.4).
 * - `<CourseGrid showFilter>` — the shared responsive grid; it owns the
 *                        category-filter state internally (via `useState`), so
 *                        this page stays hook-free and purely presentational —
 *                        it passes the `courses` data only. It is deliberately
 *                        given NO `ctaLabel`/`ctaTo`: this is the one view that
 *                        lists all four categories at once, so every card
 *                        resolves its own category route and the destinations
 *                        are MIXED. No single catalog-wide label is truthful for
 *                        all of them, so each card keeps `CourseCard`'s neutral
 *                        "Learn more" default (see the note beside the grid).
 * - `<CTASection>`     — the reusable admission call-to-action that closes every
 *                        page, offering the four conversion channels (admission /
 *                        advisor / WhatsApp / call) ranked into THREE emphasis
 *                        tiers rather than four equally weighted controls, so the
 *                        admission action reads as the dominant one. It owns both
 *                        that ranking and its own button wording, so this page
 *                        passes no labels and none are quoted here; see that
 *                        component for the current copy and its tier table.
 *
 * Accessibility (WCAG AA): exactly one `<h1>` (the section heading). The grid's
 * filter chips are keyboard-accessible `<button>`s with `aria-pressed` (owned by
 * `CourseGrid`), and each course card title is an `<h3>`. A visually-hidden
 * `<h2 class="sr-only">` ("All courses") is rendered immediately before the grid
 * so the outline steps h1 -> h2 -> h3 with no skipped level (QA Issue 9); the CTA
 * closes with its own `<h2>`. Sections are semantic `<section>` elements — no
 * page-level `<main>`.
 *
 * Styling: token-only Tailwind utilities on the 8px spacing scale
 * (`py-12`/`md:py-16`, `pb-16`/`md:pb-20`, `mb-6`). No arbitrary values, no
 * hardcoded colors, and static classNames (no `cn` needed on this presentational
 * page).
 */
import Seo from '../components/seo/Seo.jsx'
import StructuredData from '../components/seo/StructuredData.jsx'
import Container from '../components/ui/Container.jsx'
import SectionHeading from '../components/ui/SectionHeading.jsx'
import Breadcrumbs from '../components/ui/Breadcrumbs.jsx'
import CourseGrid from '../components/common/CourseGrid.jsx'
import RepresentativeNote from '../components/common/RepresentativeNote.jsx'
import CTASection from '../components/common/CTASection.jsx'
import { courses } from '../data/courses.js'
import { courseSchema } from '../lib/schema.js'

// Breadcrumb trail for this page. Module-local (never exported) so the file's
// only public export stays the `Courses` component. The identical array is
// passed to both the visible <Breadcrumbs> and the <StructuredData>
// BreadcrumbList so the trail and its JSON-LD never diverge.
const crumbs = [
  { name: 'Home', path: '/' },
  { name: 'Courses', path: '/courses' },
]

function Courses() {
  return (
    <>
      <Seo
        title="Courses"
        canonical="/courses"
        description="Browse all CIBLE courses — Spoken English, English Communication, Personality Development, Public Speaking, Interview Preparation, PCM & PCB science coaching, Basic Computer, Digital Literacy and Career Guidance."
      />
      {/* Breadcrumb trail plus one Course JSON-LD block for EVERY catalog entry.
          `courses` is the full 10-course single source of truth, so mapping it
          through `courseSchema` guarantees the tenth course (Career Guidance)
          emits its Course structured data here rather than being the only course
          with no schema consumer anywhere in the site (M19). StructuredData
          spreads the array into individual, injection-safe <script> blocks. */}
      <StructuredData breadcrumbs={crumbs} schema={courses.map(courseSchema)} />

      {/* Page header */}
      <Container as="section" className="py-12 md:py-16">
        <Breadcrumbs items={crumbs} className="mb-6" />
        <SectionHeading
          as="h1"
          align="left"
          eyebrow="Our Programs"
          title="Courses at CIBLE School of Language"
          subtitle="From spoken English to science and computer courses — find the program that fits your goals."
        />
      </Container>

      {/* Full catalog with category filter */}
      <Container as="section" className="pb-16 md:pb-20">
        {/* Visually-hidden section heading so the card grid (each course card
            title is an <h3>) nests under an <h2>, keeping the outline
            h1 -> h2 -> h3 with no skipped level for assistive tech (QA Issue 9). */}
        <h2 className="sr-only">All courses</h2>
        {/* The disclosure names each field the cards below actually render, so
            it stays true to what the visitor can see: `CourseCard` surfaces
            `level`, `duration`, `eligibility`, `suitableFor`, `prerequisites`
            and `highlights`, and every one of those is representative sample
            copy per the header of src/data/courses.js. Extend this sentence
            whenever the card begins surfacing another field (AAP §0.2.4). */}
        <RepresentativeNote className="mb-8">
          Course details shown on these cards — the duration, level, eligibility,
          who each course suits, any prerequisites and the listed highlights —
          are representative and shown for demonstration. Please confirm the
          current curriculum, entry requirements, batch timings and fees with the
          institute before enrolling.
        </RepresentativeNote>
        {/* No `ctaLabel` / `ctaTo` here BY DESIGN — see the <CourseGrid> entry in
            the file header for the full reasoning. In short: this catalog mixes
            destinations per category (English/Science/Computer cards open their
            track page, Career opens /admission), so every card keeps
            `CourseCard`'s neutral "Learn more" default. A single catalog-wide
            label such as "Apply Now" would be untrue for most of these cards —
            the track pages may use it only because they ALSO pass `ctaTo` to
            force every card to /admission. Please do not add one here. */}
        <CourseGrid items={courses} showFilter />
      </Container>

      <CTASection />
    </>
  )
}

export default Courses
