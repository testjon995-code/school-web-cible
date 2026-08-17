/**
 * Faculty — the CIBLE School of Language faculty listing page (route `/faculty`).
 *
 * Lazy-loaded by `src/App.jsx`
 * (`const Faculty = lazy(() => import('./pages/Faculty.jsx'))`,
 * `<Route path="faculty" element={<Faculty />} />`) and rendered INSIDE the
 * shared `<Layout>`. The Layout owns the page chrome (Navbar, `<main>` landmark,
 * Footer, floating conversion widgets, scroll-to-top), so this file renders ONLY
 * the page's own content — never a second `<main>` or navigation.
 *
 * Composition (reuse-first, zero duplication — every element is a shared
 * primitive/composite, never hand-rolled markup):
 * - `<Seo>`            — per-page title/description/canonical + Open Graph /
 *                        Twitter head tags. `title="Faculty"` resolves to the
 *                        document title "Faculty | CIBLE School of Language".
 * - `<StructuredData>` — emits BreadcrumbList JSON-LD from `crumbs` so the
 *                        visible trail and structured data agree (search-engine
 *                        friendly, AAP §0.6.3 SEO).
 * - `<Container as="section">` — the single canonical width/gutter wrapper,
 *                        rendered as a semantic `<section>` landmark.
 * - `<Breadcrumbs>`    — the visible hierarchy trail (Home / Faculty), sharing
 *                        the exact `{ name, path }` shape passed to
 *                        `<StructuredData>`.
 * - `<SectionHeading as="h1">` — the page's ONE `<h1>` ("Meet Our Faculty").
 * - `<FacultyCard>`    — one card per member from the `faculty` data module
 *                        (single source of truth). Each card owns its own
 *                        photo/initials-avatar fallback and social links, so
 *                        this page stays purely presentational.
 * - `<RepresentativeNote>` — a restrained disclosure that the faculty profiles
 *                        are representative samples, not verified individuals
 *                        (M03, AAP §0.7.2); it retires automatically once
 *                        `siteConfig.representativeContent` is cleared.
 * - `<CTASection>`     — the reusable admission call-to-action that closes every
 *                        page, offering its four CHANNELS (admission, advisor,
 *                        WhatsApp, call) so conversion actions stay reachable. The
 *                        wording of those actions is owned solely by CTASection, so
 *                        it is described here by channel and never by label text.
 *
 * Accessibility (WCAG AA): exactly one `<h1>` (the section heading); the faculty
 * grid is a list of repeated cards whose names are `<h3>`s. A visually-hidden
 * `<h2 class="sr-only">` ("Faculty members") is rendered immediately before the
 * grid so the outline steps h1 -> h2 -> h3 with no skipped level (QA Issue 9);
 * the CTA closes with its own `<h2>`. Sections are semantic `<section>` elements
 * — no page-level `<main>`.
 *
 * Styling: token-only Tailwind utilities on the 8px spacing scale
 * (`py-12`/`md:py-16`, `pb-16`/`md:pb-20`, `gap-6`, `mb-6`) and a responsive
 * `grid` (1 → 2 → 3 columns). No arbitrary values, no hardcoded colors, and
 * static classNames (no `cn` needed on this presentational page).
 */
import Seo from '../components/seo/Seo.jsx'
import StructuredData from '../components/seo/StructuredData.jsx'
import Container from '../components/ui/Container.jsx'
import SectionHeading from '../components/ui/SectionHeading.jsx'
import Breadcrumbs from '../components/ui/Breadcrumbs.jsx'
import FacultyCard from '../components/common/FacultyCard.jsx'
import RepresentativeNote from '../components/common/RepresentativeNote.jsx'
import CTASection from '../components/common/CTASection.jsx'
import { faculty } from '../data/faculty.js'

// Breadcrumb trail for this page. Module-local (never exported) so the file's
// only public export stays the `Faculty` component. The identical array is
// passed to both the visible <Breadcrumbs> and the <StructuredData>
// BreadcrumbList so the trail and its JSON-LD never diverge.
const crumbs = [
  { name: 'Home', path: '/' },
  { name: 'Faculty', path: '/faculty' },
]

function Faculty() {
  return (
    <>
      <Seo
        title="Faculty"
        canonical="/faculty"
        description="Meet the experienced teachers and mentors at CIBLE School of Language, Madhubani — dedicated faculty guiding students in spoken English, science and computer courses."
      />
      <StructuredData breadcrumbs={crumbs} />

      <Container as="section" className="py-12 md:py-16">
        <Breadcrumbs items={crumbs} className="mb-6" />
        <SectionHeading
          as="h1"
          align="left"
          eyebrow="Our Team"
          title="Meet Our Faculty"
          subtitle="Passionate educators committed to every student's growth and confidence."
        />
      </Container>

      <Container as="section" className="pb-16 md:pb-20">
        {/* Visually-hidden section heading so the card grid (each faculty card
            name is an <h3>) nests under an <h2>, keeping the outline
            h1 -> h2 -> h3 with no skipped level for assistive tech (QA Issue 9). */}
        <h2 className="sr-only">Faculty members</h2>
        <RepresentativeNote className="mb-8">
          The faculty profiles shown here are representative examples for
          demonstration and are not verified individuals. They will be replaced
          with the institute's actual team before launch.
        </RepresentativeNote>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {faculty.map((member) => (
            <FacultyCard key={member.name} member={member} />
          ))}
        </div>
      </Container>

      <CTASection />
    </>
  )
}

export default Faculty
