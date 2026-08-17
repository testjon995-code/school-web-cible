/**
 * Courses — the full course catalog for CIBLE School of Language (route `/courses`).
 *
 * Lazily loaded by `src/App.jsx` through the shared `lazyWithRetry` helper and
 * rendered INSIDE `<Layout>`, which owns the page chrome — the Navbar, the `<main>`
 * landmark, the Footer, the floating conversion widgets and scroll-to-top. This file
 * renders page CONTENT only: it emits no second `<main>` and no navigation of its own.
 *
 * Purpose: the one view that lists the WHOLE catalogue in a single browsable grid with
 * category filtering, so a visitor who does not yet know which track they want can
 * compare across English, Science, Computer and Career in one place. The per-category
 * landing pages cover the narrower "I already know the track" journey.
 *
 * Composition — shared primitives only, nothing hand-rolled:
 * - `<Seo>` / `<StructuredData>` — the per-page head tags, a BreadcrumbList built
 *   from `crumbs`, and one `Course` block for EVERY catalogue entry. Mapping the whole
 *   `courses` array is what gives Career Guidance — the one course with no category
 *   landing page of its own — a structured-data consumer.
 * - `<Breadcrumbs>` — the visible trail, fed the SAME `crumbs` array as the
 *   BreadcrumbList, so the two cannot diverge.
 * - `<SectionHeading as="h1">` — the page's ONE `<h1>`.
 * - `<RepresentativeNote>` — the point-of-claim disclosure, gated site-wide by
 *   `siteConfig.representativeContent`. Its copy names every course field the cards
 *   actually display, so it has to be revised whenever `CourseCard` starts surfacing
 *   another one; the note beside it in the body lists the current set.
 * - `<CourseGrid showFilter>` — the shared grid, which owns its category-filter state
 *   internally, so this page stays hook-free and passes data only. It is given no
 *   `ctaLabel`/`ctaTo` by design — see the note beside the grid.
 * - `<CTASection>` — the shared admission close. It owns both its tier ranking and its
 *   button wording, so this page passes no props and quotes no labels; that component
 *   is the single place either is recorded.
 *
 * Accessibility (WCAG AA): one `<h1>`, a visually-hidden `<h2>` naming the grid so the
 * outline steps h1 → h2 → h3 with no skipped level (the card titles are `<h3>`), and
 * keyboard-accessible filter chips owned by `CourseGrid`. Sections are semantic
 * `<section>` elements; the `<main>` landmark belongs to Layout.
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

// Module-local (never exported) so the file's only public export stays the `Courses`
// component. The identical array feeds both the visible <Breadcrumbs> and the
// <StructuredData> BreadcrumbList, so the trail and its JSON-LD cannot diverge.
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
      {/* One Course block for EVERY catalogue entry, not just the filtered view:
          Career Guidance has no category landing page, so this is the only surface that
          can emit its Course structured data. <StructuredData> splits the array into
          individual, injection-safe <script> blocks. */}
      <StructuredData breadcrumbs={crumbs} schema={courses.map(courseSchema)} />

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

      <Container as="section" className="pb-16 md:pb-20">
        {/* Visually hidden, and required rather than decorative: the card titles are
            <h3>, so without an <h2> here the outline would skip a level. */}
        <h2 className="sr-only">All courses</h2>
        {/* The wording tracks what the cards actually render — `CourseCard` surfaces
            `level`, `duration`, `eligibility`, `suitableFor`, `prerequisites` and
            `highlights`, all of which src/data/courses.js marks representative — so a
            card that begins surfacing another field needs this sentence extended with
            it. */}
        <RepresentativeNote className="mb-8">
          Course details shown on these cards — the duration, level, eligibility,
          who each course suits, any prerequisites and the listed highlights —
          are representative and shown for demonstration. Please confirm the
          current curriculum, entry requirements, batch timings and fees with the
          institute before enrolling.
        </RepresentativeNote>
        {/* No `ctaLabel` / `ctaTo` here BY DESIGN. This is the only view that lists all
            four categories at once, so each card resolves its OWN category route and the
            destinations are mixed: English, Science and Computer cards open their track
            page while Career opens /admission. No single catalogue-wide label is
            truthful across that mix, so every card keeps `CourseCard`'s neutral default.
            The category landing pages can label their cards for admission only because
            they ALSO pass `ctaTo` to send every card there. */}
        <CourseGrid items={courses} showFilter />
      </Container>

      <CTASection />
    </>
  )
}

export default Courses
