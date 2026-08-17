/**
 * ScienceCoaching — the CIBLE School of Language science-coaching detail page
 * (route `/science-coaching`).
 *
 * Lazily loaded by `src/App.jsx` through the shared `lazyWithRetry` helper and
 * rendered INSIDE `<Layout>`, which owns the page chrome — the Navbar, the `<main>`
 * landmark, the Footer, the floating conversion widgets and scroll-to-top. This file
 * renders page CONTENT only: it emits no second `<main>` and no navigation of its own.
 *
 * Scope: every course whose `category === 'Science'` in `src/data/courses.js`
 * (currently `pcm-coaching` and `pcb-coaching` — Physics/Chemistry/Maths and
 * Physics/Chemistry/Biology). The pair is DERIVED from that module rather than
 * hardcoded, so adding or renaming a science course flows through to this page and its
 * JSON-LD without an edit here.
 *
 * Composition — shared primitives only, nothing hand-rolled:
 * - `<Seo>` / `<StructuredData>` — the per-page head tags, a BreadcrumbList built
 *   from `crumbs`, and one `Course` block per science course.
 * - `<Breadcrumbs>` — the visible trail, fed the SAME `crumbs` array as the
 *   BreadcrumbList, so the two cannot diverge.
 * - `<SectionHeading as="h1">` — the page's ONE `<h1>`; the content sections keep the
 *   component's default `<h2>`.
 * - `<FeatureCard>` — the "what you'll gain" tiles, over `benefits`.
 * - `<CourseGrid>` — the course grid, pre-filtered through `items`, so a
 *   single-category page needs no filter chips. `ctaTo` points every card at
 *   `/admission?course=<encodeURIComponent(title)>` and `Admission.jsx` matches that
 *   value back against the catalogue by exact TITLE to preselect the course, which is
 *   what makes the title a contract rather than free text.
 * - `<RepresentativeNote>` — the shared point-of-claim disclosure, composed once in
 *   the Programs band and worded to cover both classes of representative content on
 *   this page: the discovery fields the cards render (flagged in the header of
 *   src/data/courses.js) and the representative "What You'll Gain" copy above. It
 *   self-hides when `siteConfig.representativeContent` is cleared, so the caveat
 *   cannot outlive the placeholder content.
 * - `<CTASection>` — the shared admission close. It owns both its tier ranking and its
 *   button wording, so this page passes no props and quotes no labels; that component
 *   is the single place either is recorded.
 *
 * Accessibility (WCAG AA): one `<h1>`, section `<h2>`s, and `<h3>` tile and card
 * titles — a gap-free outline. Sections are semantic `<section>` elements; the
 * `<main>` landmark belongs to Layout.
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
import RepresentativeNote from '../components/common/RepresentativeNote.jsx'
import CTASection from '../components/common/CTASection.jsx'
import { courses } from '../data/courses.js'

// Module-local (never exported). The identical array feeds both the visible
// <Breadcrumbs> and the <StructuredData> BreadcrumbList, so the trail and its
// JSON-LD cannot diverge.
const crumbs = [
  { name: 'Home', path: '/' },
  { name: 'Courses', path: '/courses' },
  { name: 'Science Coaching', path: '/science-coaching' },
]

// Derived from the catalogue so the cards and their Course JSON-LD stay in sync with
// it. The category literal MUST stay exactly 'Science': it is the canonical value in
// src/data/courses.js that routing and filtering match on.
const scienceCourses = courses.filter((c) => c.category === 'Science')

// Page-authored "what you'll gain" copy. It is representative rather than
// institute-supplied, so it carries the same unconfirmed status as the catalogue's own
// representative fields. `icon` holds a react-icons component REFERENCE that
// <FeatureCard> renders decoratively — never a rendered element.
// The Programs band's <RepresentativeNote> names these tiles to the visitor and
// the Footer's site-wide notice covers the same class of descriptive copy, so the
// unconfirmed status is disclosed on the page rather than only here.
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
        {/* Point-of-claim disclosure (AAP §0.2.4 / R7). One note covers the two
            classes of representative content on this page: the discovery fields
            `CourseCard` renders (level, duration, eligibility, suitableFor,
            prerequisites, highlights — all flagged representative in the header of
            src/data/courses.js) and the "What You'll Gain" tiles above, whose
            `benefits` array is flagged at its own declaration. Wording is the
            /courses sentence (Courses.jsx) plus one clause naming this page's
            benefit tiles, so the same caveat reads identically everywhere it
            appears. Under the heading and above the grid — the band-7/band-10 shape
            on Home — so it is read before the cards it qualifies; `mt-8` (32px)
            against the grid's `mt-10` binds it to that content. The Footer's
            site-wide notice names the same two classes; both halves are gated by
            the single `siteConfig.representativeContent` flag. */}
        <RepresentativeNote className="mt-8">
          Course details shown on these cards — the duration, level, eligibility,
          who each course suits, any prerequisites and the listed highlights — and
          the &ldquo;What You&rsquo;ll Gain&rdquo; highlights above are
          representative and shown for demonstration. Please confirm the current
          curriculum, entry requirements, batch timings and fees with the institute
          before enrolling.
        </RepresentativeNote>
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
