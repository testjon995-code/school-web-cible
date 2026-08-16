/**
 * Terms — Terms & Conditions legal page (route `/terms`).
 *
 * A readable, long-form legal-prose page presenting the terms that govern use
 * of the CIBLE School of Language website. It mirrors the structural pattern of
 * the Privacy Policy page: a single page `<h1>` supplied by the shared
 * `SectionHeading` primitive, followed by semantic `<h2>` prose sections inside
 * a reading-measure `max-w-3xl` container, and closing with the reusable
 * admission `CTASection` that ends every page of the site.
 *
 * Accurate to the site's model (M07 / M09): the terms reflect that this is a
 * static, client-only website with no accounts and no backend — enquiries open
 * a pre-filled WhatsApp/email draft on the visitor's device rather than being
 * transmitted to a CIBLE server — and a dedicated "Communications & Privacy"
 * section discloses the third-party (WhatsApp/Meta, email) handling and the
 * guardian expectation for under-18 visitors, linking to the Privacy Policy.
 * The copy is representative pre-launch text pending legal counsel / client
 * approval; that status is surfaced in a `role="note"` disclosure and no
 * effective date is asserted until publication.
 *
 * Rendering contract: this component renders ONLY page content. The persistent
 * shell (Navbar, Footer, floating conversion widgets, ScrollToTop) is provided
 * by the routing `<Layout>`, while per-page document `<head>` output is handled
 * by the `<Seo>` and `<StructuredData>` helpers. It is lazy-loaded by
 * `src/App.jsx`:
 *   const Terms = lazy(() => import('./pages/Terms.jsx'))
 *   <Route path="terms" element={<Terms />} />
 *
 * Accessibility (WCAG AA): exactly one `<h1>` (the page header); every section
 * title is a semantic `<h2>`; the contact email and the Privacy Policy
 * reference are real links, and the contact address is sized to the site's 44px
 * minimum hit area (M12) so it is comfortably tappable. All styling flows
 * through the Tailwind `@theme` brand tokens defined in `src/index.css` on the
 * 8px spacing scale — radius included, so surfaces use the declared
 * `--radius-lg`/`--radius-2xl` steps rather than Tailwind's stock scale — with
 * no hardcoded or arbitrary values.
 */
import { Link } from 'react-router-dom'
import Seo from '../components/seo/Seo.jsx'
import StructuredData from '../components/seo/StructuredData.jsx'
import Container from '../components/ui/Container.jsx'
import SectionHeading from '../components/ui/SectionHeading.jsx'
import Breadcrumbs from '../components/ui/Breadcrumbs.jsx'
import CTASection from '../components/common/CTASection.jsx'
import siteConfig from '../data/siteConfig.js'

// Breadcrumb trail — the SAME `{ name, path }` shape is consumed by both the
// visible <Breadcrumbs> trail and the Breadcrumb JSON-LD emitted by
// <StructuredData>, keeping the rendered trail and structured data in agreement.
const crumbs = [
  { name: 'Home', path: '/' },
  { name: 'Terms & Conditions', path: '/terms' },
]

// Representative terms copy, rewritten to match the site's actual client-only
// model (M07 / M09). MUST be reviewed and finalized by the institute's legal
// team before launch (AAP §0.7.2). Module-local. The Communications & Privacy
// cross-reference to the Privacy Policy is rendered as explicit JSX below (so it
// can carry a real <Link>), not from this string array.
const sections = [
  {
    heading: 'Acceptance of Terms',
    body: 'By accessing and using the CIBLE School of Language website, you agree to be bound by these Terms & Conditions. If you do not agree, please do not use this website.',
  },
  {
    heading: 'Use of the Website',
    body: 'This website is provided for informational purposes about our courses, admissions and activities. You agree to use it only for lawful purposes and not to misuse or disrupt the website or its content.',
  },
  {
    heading: 'Enquiries & Admissions',
    body: 'This website has no user accounts and no backend server. Our admission, contact and newsletter forms do not transmit data to CIBLE; they open a pre-filled WhatsApp chat or email draft on your own device, which is sent only if you choose to send it. Submitting an enquiry does not guarantee enrolment — course availability, batch timings, fees and schedules are subject to confirmation by CIBLE School of Language and may change.',
  },
  {
    heading: 'Intellectual Property',
    body: 'The CIBLE School of Language name, logo, course descriptions and the original written content on this website belong to CIBLE School of Language and may not be reproduced without permission. This website also uses third-party assets under their own licenses — the icon set (react-icons, MIT License), the Inter typeface (SIL Open Font License) and representative illustrations — which remain the property of their respective owners. Rights to any genuine institute photographs added before launch rest with CIBLE School of Language.',
  },
  {
    heading: 'Limitation of Liability',
    body: 'While we strive to keep information accurate and up to date, CIBLE School of Language is not liable for any errors, omissions, or outcomes arising from the use of this website.',
  },
  {
    heading: 'Changes to These Terms',
    body: 'We may revise these Terms & Conditions at any time. Continued use of the website after changes are posted constitutes acceptance of the updated terms.',
  },
]

function Terms() {
  return (
    <>
      <Seo
        title="Terms & Conditions"
        canonical="/terms"
        description="The terms governing use of the CIBLE School of Language website — a static, client-only site whose enquiry forms open a pre-filled WhatsApp or email draft on your device."
      />
      <StructuredData breadcrumbs={crumbs} />

      {/* Page header */}
      <Container as="section" className="py-12 md:py-16">
        <Breadcrumbs items={crumbs} className="mb-6" />
        <SectionHeading
          as="h1"
          align="left"
          eyebrow="Legal"
          title="Terms & Conditions"
          subtitle="The terms that govern your use of the CIBLE School of Language website."
        />
      </Container>

      {/* Prose body */}
      <Container as="section" className="max-w-3xl pb-16 md:pb-20">
        {/* Draft / pending-approval disclosure (M09). No effective date is
            asserted until these terms are reviewed by counsel and published. */}
        <div role="note" className="rounded-lg border border-border bg-secondary-50 p-4">
          <p className="text-sm leading-relaxed text-foreground">
            <strong className="font-semibold">Draft for review.</strong> These Terms &amp; Conditions are a
            representative pre-launch draft. They have not yet been reviewed by legal counsel or approved by CIBLE
            School of Language, and no effective date applies until they are published.
          </p>
        </div>

        {sections.map((section) => (
          <div key={section.heading}>
            <h2 className="mt-8 mb-3 text-xl font-semibold text-foreground md:text-2xl">{section.heading}</h2>
            <p className="text-muted leading-relaxed">{section.body}</p>
          </div>
        ))}

        {/* Communications & Privacy — explicit JSX so it can link to the Privacy
            Policy and disclose third-party handling and the guardian expectation
            for minors (M07). */}
        <h2 className="mt-8 mb-3 text-xl font-semibold text-foreground md:text-2xl">Communications &amp; Privacy</h2>
        <p className="text-muted leading-relaxed">
          When you contact us through WhatsApp or email, your message is handled by those third-party providers
          (WhatsApp/Meta and your email provider) under their own terms. If you are under 18, please involve a parent
          or guardian before contacting us. See our{' '}
          <Link to="/privacy-policy" className="font-medium text-primary-600 hover:underline">
            Privacy Policy
          </Link>{' '}
          for details on how the information you choose to share is handled.
        </p>

        <h2 className="mt-8 mb-3 text-xl font-semibold text-foreground md:text-2xl">Contact Us</h2>
        <p className="text-muted leading-relaxed">
          For questions about these Terms &amp; Conditions, contact us at{' '}
          {/* Contact deep-link carries a 44px min hit area (M12), matching the
              treatment Footer's <address> links and the Privacy Policy's contact
              address already use: `inline-flex` keeps the anchor inline-level,
              `min-h-11` (11 x 0.25rem = 44px on the 8px scale) grows the tap
              target, and `items-center` re-centres the label inside that taller
              box. No arbitrary value is involved — `min-h-11` is a declared step.

              The `whitespace-nowrap` wrapper is the same guard the Privacy Policy
              page carries, and it is deliberate rather than decorative. Giving the
              anchor `inline-flex` makes it an ATOMIC inline-level box, and CSS
              allows a soft-wrap opportunity immediately after such a box — so the
              trailing full stop can break onto a line of its own. (As plain
              `inline` text the address and the full stop were a single unbreakable
              run, since UAX #14 permits no break before FULL STOP.) Keeping both
              inside one nowrap context restores that unbreakable pairing.

              Measured honestly: on the Privacy Policy page that orphan is ACTIVE —
              its longer sentence leaves only ~2px after the address, and the period
              did drop to its own line at 414/768/1024/1280/1440px before the
              wrapper. On THIS page the hazard is currently LATENT: the shorter
              sentence leaves 85–105px of slack, so the period stays put at all
              eight verified widths (320→1440) with or without the wrapper. It is
              kept for parity and as insurance — the copy above is an unapproved
              draft pending legal review, so this sentence is expected to change,
              and any lengthening (or a font-metric shift) makes the wrapper
              load-bearing exactly as it already is on the sibling page.

              The space before the anchor stays OUTSIDE the wrapper so the pair can
              still move to the next line together at narrow widths — verified: at
              320px and 360px the address and period wrap down as one unit. */}
          <span className="whitespace-nowrap">
            <a
              href={siteConfig.emailHref}
              className="inline-flex min-h-11 items-center font-medium text-primary-600 hover:underline"
            >
              {siteConfig.email}
            </a>
            .
          </span>
        </p>
      </Container>

      <CTASection />
    </>
  )
}

export default Terms
