/**
 * SpokenEnglish — the CIBLE School of Language English-track landing page
 * (route `/spoken-english`).
 *
 * Lazy-loaded by `src/App.jsx`
 * (`const SpokenEnglish = lazy(() => import('./pages/SpokenEnglish.jsx'))`,
 * `<Route path="spoken-english" element={<SpokenEnglish />} />`) and rendered
 * INSIDE the shared `<Layout>`. The Layout owns the page chrome (Navbar,
 * `<main>` landmark, Footer, floating conversion widgets, scroll-to-top), so
 * this file renders ONLY the page's own content — never a second `<main>` or
 * navigation.
 *
 * This is a "Course page" (AAP §0.6 folder requirement): besides the
 * BreadcrumbList JSON-LD it emits one `Course` JSON-LD block per English course
 * so search engines can surface each program as rich structured data.
 *
 * Composition (reuse-first, zero duplication — every element is a shared
 * primitive/composite, never hand-rolled markup):
 * - `<Seo>`            — per-page title/description/canonical + Open Graph /
 *                        Twitter head tags. `title="Spoken English &
 *                        Communication Courses"` resolves to the document title
 *                        "Spoken English & Communication Courses | CIBLE School
 *                        of Language".
 * - `<StructuredData>` — BreadcrumbList JSON-LD from `crumbs`, plus one Course
 *                        JSON-LD per English course. The `{ name, path }` array
 *                        is the exact shape shared with `<Breadcrumbs>` so the
 *                        visible trail and the structured data never diverge.
 * - `<Container as="section">` — the single canonical width/gutter wrapper,
 *                        rendered as a semantic `<section>` landmark.
 * - `<Breadcrumbs>`    — the visible 3-level trail (Home / Courses / Spoken
 *                        English).
 * - `<SectionHeading as="h1">` — the page's ONE `<h1>`.
 * - `<FeatureCard>`    — the four track benefits ("What You'll Gain").
 * - `<CourseGrid>`     — the five English-category courses from the `courses`
 *                        data module (single source of truth). Its cards drive
 *                        admission instead of self-linking: every card is
 *                        labelled "Apply Now" and targets
 *                        `/admission?course=<encodeURIComponent(title)>`, which
 *                        `Admission.jsx` matches back against the catalogue by
 *                        exact TITLE to preselect that course in the admission
 *                        form's "Course of Interest" field — so the title is a
 *                        frozen contract, not free text. The same label composes
 *                        each card's accessible name ("Apply Now — Spoken
 *                        English"), naming the course a repeated CTA applies to.
 * - `<CTASection>`     — the reusable admission call-to-action that closes every
 *                        page. It offers four conversion channels (admission /
 *                        advisor / WhatsApp / call) ranked into THREE deliberate
 *                        emphasis tiers rather than four equally weighted
 *                        controls: one dominant admission action, two supporting
 *                        contact channels, and one low-emphasis `tertiary` call.
 *                        The tiers step down by size and fill, never by colour
 *                        alone, and each still clears the 44px touch-target
 *                        floor, so demoting a control never shrinks its hit
 *                        area. That component is the single authority for the
 *                        four button labels — all 18 consumers render it on its
 *                        defaults, so this page passes none and quotes none here
 *                        (a quoted label would go stale in 18 files the moment
 *                        the shared copy changed); its own tier table records the
 *                        exact wording.
 *
 * Accessibility (WCAG AA): exactly one `<h1>` (the header SectionHeading); every
 * other section heading is an `<h2>`; the benefit tiles and course cards use
 * `<h3>`, keeping the document outline logical. Sections are semantic
 * `<section>` elements — there is no page-level `<main>`.
 *
 * Styling: token-only Tailwind utilities on the 8px spacing scale
 * (`py-12`/`md:py-16`, `py-16`/`md:py-20`, `gap-6`, `mt-10`, `mb-6`), alternating
 * white and `bg-surface` sections, and a responsive benefits `grid`
 * (1 → 2 → 4 columns). No arbitrary values, no hardcoded colors, and static
 * classNames (no `cn` needed on this presentational page).
 */
import { FaComments, FaMicrophone, FaUserTie, FaHandshake } from 'react-icons/fa'
import Seo from '../components/seo/Seo.jsx'
import StructuredData from '../components/seo/StructuredData.jsx'
import Container from '../components/ui/Container.jsx'
import SectionHeading from '../components/ui/SectionHeading.jsx'
import Breadcrumbs from '../components/ui/Breadcrumbs.jsx'
import CourseGrid from '../components/common/CourseGrid.jsx'
import FeatureCard from '../components/common/FeatureCard.jsx'
import CTASection from '../components/common/CTASection.jsx'
import { courses } from '../data/courses.js'

// Breadcrumb trail for this page. Module-local (never exported) so the file's
// only public export stays the `SpokenEnglish` component. The identical array
// is passed to both the visible <Breadcrumbs> and the <StructuredData>
// BreadcrumbList so the trail and its JSON-LD never diverge.
const crumbs = [
  { name: 'Home', path: '/' },
  { name: 'Courses', path: '/courses' },
  { name: 'Spoken English', path: '/spoken-english' },
]

// The five English-track programs, filtered from the single source of truth.
// The `'English'` category literal is canonical in src/data/courses.js and must
// stay in sync with it (routing/filtering depend on it).
const englishCourses = courses.filter((c) => c.category === 'English')

// Representative track benefits — refine with genuine institute copy (AAP §0.7.2).
// `icon` holds a react-icons component reference (never a rendered element),
// matching the <FeatureCard icon={...} /> contract.
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
