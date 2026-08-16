/**
 * ComputerCourses — the CIBLE School of Language computer-track landing page
 * (route `/computer-courses`).
 *
 * Lazy-loaded by `src/App.jsx`
 * (`const ComputerCourses = lazy(() => import('./pages/ComputerCourses.jsx'))`,
 * `<Route path="computer-courses" element={<ComputerCourses />} />`) and
 * rendered INSIDE the shared `<Layout>`. The Layout owns the page chrome
 * (Navbar, `<main>` landmark, Footer, floating conversion widgets,
 * scroll-to-top), so this file renders ONLY the page's own content — never a
 * second `<main>` or navigation.
 *
 * Scope: the institute's computer offerings, i.e. the courses whose
 * `category === 'Computer'` in the `courses` single source of truth
 * (`src/data/courses.js`) — Basic Computer and Digital Literacy. The list is
 * derived by filtering that data module rather than being hardcoded, so the
 * page automatically reflects any future additions to the Computer category.
 *
 * Composition (reuse-first, zero duplication — every element is a shared
 * primitive/composite, never hand-rolled markup):
 * - `<Seo>`            — per-page title/description/canonical + Open Graph /
 *                        Twitter head tags. `title="Computer Courses"` resolves
 *                        to the document title
 *                        "Computer Courses | CIBLE School of Language".
 * - `<StructuredData>` — emits BreadcrumbList JSON-LD from `crumbs` (so the
 *                        visible trail and structured data agree) plus one
 *                        `Course` JSON-LD block per computer course, for
 *                        search-engine rich results (AAP §0.6.3 SEO).
 * - `<Container as="section">` — the single canonical width/gutter wrapper,
 *                        rendered as semantic `<section>` landmarks.
 * - `<Breadcrumbs>`    — the visible hierarchy trail (Home / Courses / Computer
 *                        Courses), sharing the exact `{ name, path }` shape
 *                        passed to `<StructuredData>`.
 * - `<SectionHeading as="h1">` — the page's ONE `<h1>` ("Computer Courses").
 *                        The two content sections below use the default `<h2>`.
 * - `<FeatureCard>`    — the four "what you'll learn" highlight tiles, each fed
 *                        a react-icons component reference from `benefits`.
 * - `<CourseGrid>`     — the responsive grid of `<CourseCard>`s, pre-filtered to
 *                        the computer courses via the `items` prop (no filter
 *                        chips — this is already a single-category page).
 * - `<CTASection>`     — the reusable admission call-to-action that closes every
 *                        page, offering the four conversion channels (admission /
 *                        advisor / WhatsApp / call). It owns its own button
 *                        wording, so this page passes no labels and none are
 *                        quoted here; see that component for the current copy.
 *
 * Accessibility (WCAG AA): exactly one `<h1>` (the header SectionHeading);
 * section headings are `<h2>`; the FeatureCard tiles and CourseCards use `<h3>`
 * beneath their section `<h2>`, and the CTA closes with an `<h2>` — a logical,
 * gap-free heading outline. Sections are semantic `<section>` elements — no
 * page-level `<main>` (the Layout owns it).
 *
 * Styling: token-only Tailwind utilities on the 8px spacing scale
 * (`py-12`/`md:py-16`, `py-16`/`md:py-20`, `mt-10`, `mb-6`, `gap-6`) with the
 * white / `bg-surface` section-alternation convention used site-wide, a
 * responsive `grid` (1 → 2 → 4 columns for the benefits), no arbitrary values,
 * no hardcoded colors, and static classNames (no `cn` needed on this
 * presentational page).
 */
import { FaDesktop, FaKeyboard, FaGlobe, FaFileWord } from 'react-icons/fa'
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
// only public export stays the `ComputerCourses` component. The identical array
// is passed to both the visible <Breadcrumbs> and the <StructuredData>
// BreadcrumbList so the trail and its JSON-LD never diverge.
const crumbs = [
  { name: 'Home', path: '/' },
  { name: 'Courses', path: '/courses' },
  { name: 'Computer Courses', path: '/computer-courses' },
]

// The computer-track courses, derived from the single source of truth so the
// page and its Course JSON-LD stay in sync with the catalog. The category
// literal MUST stay exactly 'Computer' — page routing/filtering depends on it.
const computerCourses = courses.filter((c) => c.category === 'Computer')

// Representative "what you'll learn" highlights — refine with genuine institute
// copy before launch (AAP §0.7.2). `icon` holds a react-icons component
// REFERENCE (passed through to <FeatureCard>, never rendered here).
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
