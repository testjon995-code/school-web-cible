/**
 * ComputerCourses — the CIBLE School of Language computer-track landing page
 * (route `/computer-courses`).
 *
 * Lazily loaded by `src/App.jsx` through the shared `lazyWithRetry` helper and
 * rendered INSIDE `<Layout>`, which owns the page chrome — the Navbar, the `<main>`
 * landmark, the Footer, the floating conversion widgets and scroll-to-top. This file
 * renders page CONTENT only: it emits no second `<main>` and no navigation of its own.
 *
 * Scope: every course whose `category === 'Computer'` in `src/data/courses.js`
 * (currently Basic Computer and Digital Literacy). The list is DERIVED from that
 * module rather than hardcoded, so a course added to the category reaches this page
 * and its JSON-LD without an edit here.
 *
 * Composition — shared primitives only, nothing hand-rolled:
 * - `<Seo>` / `<StructuredData>` — the per-page head tags, a BreadcrumbList built
 *   from `crumbs`, and one `Course` block per computer course.
 * - `<Breadcrumbs>` — the visible trail, fed the SAME `crumbs` array as the
 *   BreadcrumbList, so the two cannot diverge.
 * - `<SectionHeading as="h1">` — the page's ONE `<h1>`; the content sections keep the
 *   component's default `<h2>`.
 * - `<FeatureCard>` — the "what you'll learn" tiles, over `benefits`.
 * - `<CourseGrid>` — the course grid, pre-filtered through `items`, so a
 *   single-category page needs no filter chips. `ctaTo` points every card at
 *   `/admission?course=<encodeURIComponent(title)>` and `Admission.jsx` matches that
 *   value back against the catalogue by exact TITLE to preselect the course, which is
 *   what makes the title a contract rather than free text.
 * - `<RepresentativeNote>` — the shared point-of-claim disclosure, composed once in
 *   the Programs band and worded to cover both classes of representative content on
 *   this page: the discovery fields the cards render (flagged in the header of
 *   src/data/courses.js) and the representative "What You'll Learn" copy above. It
 *   self-hides when `siteConfig.representativeContent` is cleared, so the caveat
 *   cannot outlive the placeholder content.
 * - `<CTASection>` — the shared admission close. It owns both its tier ranking and its
 *   button wording, so this page passes no props and quotes no labels; that component
 *   is the single place either is recorded.
 *
 * Accessibility (WCAG AA): one `<h1>`, section `<h2>`s, and `<h3>` tile and card
 * titles — a gap-free outline. Sections are semantic `<section>` elements; the
 * `<main>` landmark belongs to Layout.
 */
import { FaDesktop, FaKeyboard, FaGlobe, FaFileWord } from 'react-icons/fa'
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

// Module-local (never exported) so the file's only public export stays the
// `ComputerCourses` component. The identical array feeds both the visible
// <Breadcrumbs> and the <StructuredData> BreadcrumbList, so the trail and its
// JSON-LD cannot diverge.
const crumbs = [
  { name: 'Home', path: '/' },
  { name: 'Courses', path: '/courses' },
  { name: 'Computer Courses', path: '/computer-courses' },
]

// Derived from the catalogue so the cards and their Course JSON-LD stay in sync with
// it. The category literal MUST stay exactly 'Computer': it is the canonical value in
// src/data/courses.js that routing and filtering match on.
const computerCourses = courses.filter((c) => c.category === 'Computer')

// Page-authored "what you'll learn" copy. It is representative rather than
// institute-supplied, so it carries the same unconfirmed status as the catalogue's own
// representative fields. `icon` holds a react-icons component REFERENCE that
// <FeatureCard> renders decoratively — never a rendered element.
// The Programs band's <RepresentativeNote> names these tiles to the visitor and
// the Footer's site-wide notice covers the same class of descriptive copy, so the
// unconfirmed status is disclosed on the page rather than only here.
const benefits = [
  { icon: FaDesktop, title: 'Computer Basics', description: 'Hands-on fundamentals — OS, files, and everyday tools.' },
  { icon: FaFileWord, title: 'Office & Docs', description: 'Word processing, spreadsheets and presentations.' },
  { icon: FaGlobe, title: 'Digital Literacy', description: 'Internet, email, online safety and digital services.' },
  { icon: FaKeyboard, title: 'Practical Skills', description: 'Typing and real-world tasks employers expect.' },
]

function ComputerCourses() {
  return (
    <>
      <Seo
        title="Computer Courses"
        canonical="/computer-courses"
        description="CIBLE computer courses — Basic Computer and Digital Literacy. Hands-on training in essential computing, office tools, internet and digital skills for study and work."
      />
      <StructuredData breadcrumbs={crumbs} />
      {computerCourses.map((course) => (
        <StructuredData key={course.slug} course={course} />
      ))}

      <Container as="section" className="py-12 md:py-16">
        <Breadcrumbs items={crumbs} className="mb-6" />
        <SectionHeading
          as="h1"
          align="left"
          eyebrow="Computer Track"
          title="Computer Courses"
          subtitle="Build practical, job-ready digital skills — from computer basics to full digital literacy."
        />
      </Container>

      <section className="bg-surface py-16 md:py-20">
        <Container>
          <SectionHeading eyebrow="Why This Track" title="What You'll Learn" />
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map((b) => (
              <FeatureCard key={b.title} icon={b.icon} title={b.title} description={b.description} />
            ))}
          </div>
        </Container>
      </section>

      <Container as="section" className="py-16 md:py-20">
        <SectionHeading eyebrow="Programs" title="Computer Courses" subtitle="Start where you are." />
        {/* Point-of-claim disclosure (AAP §0.2.4 / R7). This page shows TWO classes
            of representative content, and this one note covers both because they
            are the same promise read twice — what the track teaches, and what each
            course in it involves:
              • the discovery fields `CourseCard` renders (level, duration,
                eligibility, suitableFor, prerequisites, highlights), every one of
                them marked representative and "to be confirmed before launch" in
                the header of src/data/courses.js; and
              • the "What You'll Learn" tiles in the band above, whose `benefits`
                array is flagged at its own declaration as representative copy.
            Wording follows /courses (Courses.jsx) rather than being reinvented, so
            the same claim reads identically wherever a visitor meets it, with one
            clause added to name this page's benefit tiles. Placed directly under
            the heading and above the grid — the band-7/band-10 shape on Home — so
            the caveat is read BEFORE the cards it qualifies; `mt-8` (32px) against
            the grid's `mt-10` deliberately binds the note to the content it
            annotates. The site-wide Footer band names these same two classes; this
            note is the point-of-claim half, and both are gated by the single
            `siteConfig.representativeContent` flag so they retire together. */}
        <RepresentativeNote className="mt-8">
          Course details shown on these cards — the duration, level, eligibility,
          who each course suits, any prerequisites and the listed highlights — and
          the &ldquo;What You&rsquo;ll Learn&rdquo; highlights above are
          representative and shown for demonstration. Please confirm the current
          curriculum, entry requirements, batch timings and fees with the institute
          before enrolling.
        </RepresentativeNote>
        <div className="mt-10">
          <CourseGrid
            items={computerCourses}
            ctaTo={(c) => `/admission?course=${encodeURIComponent(c.title)}`}
            ctaLabel="Apply Now"
          />
        </div>
      </Container>

      <CTASection />
    </>
  )
}

export default ComputerCourses
