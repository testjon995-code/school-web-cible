/**
 * Admission — CIBLE School of Language (route `/admission`).
 *
 * The site's PRIMARY conversion page (AAP §0.6.3): it walks a prospective
 * student/parent through the admission journey and puts the inquiry form front
 * and centre. It is lazy-loaded by `src/App.jsx`
 * (`const Admission = lazy(() => import('./pages/Admission.jsx'))`) and rendered
 * at `<Route path="admission" element={<Admission />} />` inside the shared
 * `<Layout>`, so this module renders ONLY the page's own content — the
 * persistent Navbar, Footer and floating conversion widgets belong to Layout.
 *
 * Composition (single <h1>, logical heading outline, admission-focused close):
 *   1. <Seo>            — per-page title/description/canonical + OG/Twitter tags.
 *   2. <StructuredData> — BreadcrumbList JSON-LD built from `crumbs`.
 *   3. Page header      — Breadcrumbs + the page <h1> (SectionHeading as="h1").
 *   4. Process band     — a tinted `bg-surface` section whose <Timeline> lists
 *                         the four admission steps (icons passed as component
 *                         references, never JSX).
 *   5. Admission form   — the self-contained <AdmissionForm/> in a narrow column.
 *   6. <TrustSection/>  — the shared trust-and-transparency band that answers
 *                         what a visitor asks before enquiring.
 *   7. <CTASection/>    — the reusable admission call-to-action that closes
 *                         every page.
 *
 * TRUST BLOCK PLACEMENT. <TrustSection> closes the page immediately before
 * <CTASection>, so the visitor reads what the institute can actually evidence
 * (including how admission works) right after the form and right before the
 * final call to action. It renders at `headingAs="h2"`: this page's own title is
 * the single <h1> and the process and form headings are already `h2`, so an
 * `h2` here keeps the outline `h1 → h2 → h3` with no skipped level, its cards
 * sitting at `h3` alongside the Timeline steps. Every string it shows comes
 * from src/data/trust.js — the `sections` prop is deliberately NOT passed so the
 * block stays on that single canonical set, and no trust copy is restated here.
 * It is a SIBLING of this page's <Container>s, never a child of one, because it
 * owns its own tinted band and Container (nesting would double the gutters).
 *
 * Reuse-first (zero duplication): every visual element is delegated to a
 * canonical primitive (`Container`, `SectionHeading`, `Breadcrumbs`) or
 * composite (`Timeline`, `AdmissionForm`, `TrustSection`, `CTASection`); this page owns no
 * bespoke markup styling beyond token-only layout classes on the project's 8px
 * spacing scale. Its only hook is `useSearchParams`, used to preselect the
 * admission form's "Course of Interest" from an optional `?course=<title>`
 * query (set by the category pages' course cards); all other interactivity
 * (form validation, reveal animation) lives inside the composed components.
 */
import { useSearchParams } from 'react-router-dom'
import { FaWpforms, FaComments, FaClipboardCheck, FaGraduationCap } from 'react-icons/fa'
import Seo from '../components/seo/Seo.jsx'
import StructuredData from '../components/seo/StructuredData.jsx'
import Container from '../components/ui/Container.jsx'
import SectionHeading from '../components/ui/SectionHeading.jsx'
import Breadcrumbs from '../components/ui/Breadcrumbs.jsx'
import Timeline from '../components/common/Timeline.jsx'
import TrustSection from '../components/common/TrustSection.jsx'
import CTASection from '../components/common/CTASection.jsx'
import AdmissionForm from '../components/forms/AdmissionForm.jsx'
import { courses } from '../data/courses.js'

// Breadcrumb trail — shared verbatim with the BreadcrumbList JSON-LD emitted by
// <StructuredData> so the visible trail and the structured data stay in
// agreement (same `{ name, path }` shape consumed by breadcrumbSchema). Module-
// local (NOT exported): this module exposes only its default component.
const crumbs = [
  { name: 'Home', path: '/' },
  { name: 'Admission', path: '/admission' },
]

// Representative admission process steps — confirm exact process with the institute (AAP 0.7.2).
// Each `icon` is a react-icons COMPONENT REFERENCE (never JSX); <Timeline>
// renders it inside the step marker and keys each entry by `title`. Module-local
// (NOT exported).
const admissionSteps = [
  {
    title: 'Submit Enquiry',
    description: 'Fill the admission form below or reach us on WhatsApp or call to register your interest.',
    icon: FaWpforms,
  },
  {
    title: 'Free Counseling',
    description: 'Our counselors help you choose the right course based on your goals and current level.',
    icon: FaComments,
  },
  {
    title: 'Confirm Enrolment',
    description: 'Complete a simple registration and choose a batch timing that suits you.',
    icon: FaClipboardCheck,
  },
  {
    title: 'Start Learning',
    description: 'Begin your classes at CIBLE and start building confidence from day one.',
    icon: FaGraduationCap,
  },
]

function Admission() {
  // Preselect the "Course of Interest" when a category page linked here with a
  // `?course=<title>` query (QA Issue 8 — category cards now drive admission).
  // The value is validated against the single source of truth so only a real
  // course title reaches the form; anything else is ignored (undefined → the
  // form's blank default), so a stale/hand-edited query can never break the
  // <Select>.
  const [searchParams] = useSearchParams()
  const requestedCourse = searchParams.get('course')
  const defaultCourse = courses.find((c) => c.title === requestedCourse)?.title

  return (
    <>
      <Seo
        title="Admission"
        canonical="/admission"
        description="Apply to CIBLE School of Language. Complete the admission form for spoken English, science coaching or computer courses — free counseling and flexible batches in Madhubani, Bihar."
      />
      <StructuredData breadcrumbs={crumbs} />

      {/* Page header */}
      <Container as="section" className="py-12 md:py-16">
        <Breadcrumbs items={crumbs} className="mb-6" />
        <SectionHeading
          as="h1"
          align="left"
          eyebrow="Admissions Open"
          title="Admission"
          subtitle="Take the first step toward confident English, better results and a brighter future."
        />
      </Container>

      {/* Process (tinted band) */}
      <section className="bg-surface py-16 md:py-20">
        <Container>
          <SectionHeading
            eyebrow="How It Works"
            title="Admission Process"
            subtitle="Four simple steps from enquiry to your first class."
          />
          <div className="mt-10">
            <Timeline items={admissionSteps} />
          </div>
        </Container>
      </section>

      {/* Admission form */}
      <Container as="section" className="py-16 md:py-20">
        <SectionHeading
          eyebrow="Apply Now"
          title="Admission Form"
          subtitle="Fill in your details and our team will get in touch shortly."
        />
        <div className="mx-auto mt-10 max-w-2xl">
          <AdmissionForm defaultCourse={defaultCourse} />
        </div>
      </Container>

      {/* Trust & transparency — rendered as a SIBLING of the sections above,
          never inside a <Container>: TrustSection owns its own tinted band and
          Container, and nesting the two would double the page gutters. */}
      <TrustSection headingAs="h2" />

      <CTASection />
    </>
  )
}

export default Admission
