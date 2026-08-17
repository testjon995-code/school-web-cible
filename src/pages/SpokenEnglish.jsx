/**
 * SpokenEnglish — the CIBLE School of Language English-track landing page
 * (route `/spoken-english`).
 *
 * Lazily loaded by `src/App.jsx` through the shared `lazyWithRetry` helper and
 * rendered INSIDE `<Layout>`, which owns the page chrome — the Navbar, the `<main>`
 * landmark, the Footer, the floating conversion widgets and scroll-to-top. This file
 * renders page CONTENT only: it emits no second `<main>` and no navigation of its own.
 *
 * Scope: every course whose `category === 'English'` in `src/data/courses.js`. The
 * list is DERIVED from that module rather than hardcoded, so a course added to the
 * category reaches this page and its JSON-LD without an edit here.
 *
 * Composition — shared primitives only, nothing hand-rolled:
 * - `<Seo>` / `<StructuredData>` — the per-page head tags, a BreadcrumbList built
 *   from `crumbs`, and one `Course` block per English course, so each program can
 *   surface as its own rich result.
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
 */
import { FaComments, FaMicrophone, FaUserTie, FaHandshake } from 'react-icons/fa'
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
// `SpokenEnglish` component. The identical array feeds both the visible
// <Breadcrumbs> and the <StructuredData> BreadcrumbList, so the trail and its
// JSON-LD cannot diverge.
const crumbs = [
  { name: 'Home', path: '/' },
  { name: 'Courses', path: '/courses' },
  { name: 'Spoken English', path: '/spoken-english' },
]

// Derived from the catalogue so the cards and their Course JSON-LD stay in sync with
// it. The category literal MUST stay exactly 'English': it is the canonical value in
// src/data/courses.js that routing and filtering match on.
const englishCourses = courses.filter((c) => c.category === 'English')

// Page-authored track-benefit copy. It is representative rather than
// institute-supplied, so it carries the same unconfirmed status as the catalogue's own
// representative fields. `icon` holds a react-icons component REFERENCE that
// <FeatureCard> renders decoratively — never a rendered element.
// The Programs band's <RepresentativeNote> names these tiles to the visitor and
// the Footer's site-wide notice covers the same class of descriptive copy, so the
// unconfirmed status is disclosed on the page rather than only here.
const benefits = [
  { icon: FaComments, title: 'Speak Fluently', description: 'Daily speaking practice to build real, usable fluency.' },
  { icon: FaMicrophone, title: 'Public Speaking', description: 'Present and speak on stage with confidence and clarity.' },
  { icon: FaUserTie, title: 'Personality Development', description: 'Body language, etiquette and confidence for every setting.' },
  { icon: FaHandshake, title: 'Interview Ready', description: 'Mock interviews and communication skills that get results.' },
]

function SpokenEnglish() {
  return (
    <>
      <Seo
        title="Spoken English & Communication Courses"
        canonical="/spoken-english"
        description="Master spoken English at CIBLE — Spoken English, English Communication, Personality Development, Public Speaking and Interview Preparation courses that build real fluency and confidence."
      />
      <StructuredData breadcrumbs={crumbs} />
      {englishCourses.map((course) => (
        <StructuredData key={course.slug} course={course} />
      ))}

      {/* Page header */}
      <Container as="section" className="py-12 md:py-16">
        <Breadcrumbs items={crumbs} className="mb-6" />
        <SectionHeading
          as="h1"
          align="left"
          eyebrow="English Track"
          title="Spoken English & Communication"
          subtitle="Speak confidently in any situation — our English programs build fluency, personality and interview readiness."
        />
      </Container>

      {/* Benefits */}
      <section className="bg-surface py-16 md:py-20">
        <Container>
          <SectionHeading eyebrow="Why This Track" title="What You'll Gain" />
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map((b) => (
              <FeatureCard key={b.title} icon={b.icon} title={b.title} description={b.description} />
            ))}
          </div>
        </Container>
      </section>

      {/* Courses in this track */}
      <Container as="section" className="py-16 md:py-20">
        <SectionHeading eyebrow="Programs" title="English Courses" subtitle="Choose the program that matches your goals." />
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
            items={englishCourses}
            ctaTo={(c) => `/admission?course=${encodeURIComponent(c.title)}`}
            ctaLabel="Apply Now"
          />
        </div>
      </Container>

      <CTASection />
    </>
  )
}

export default SpokenEnglish
