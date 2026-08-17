/**
 * Terms — Terms & Conditions legal page (route `/terms`).
 *
 * Long-form legal prose: one page `<h1>` from the shared `SectionHeading`, semantic
 * `<h2>` sections inside a reading-measure container, and the shared admission
 * `CTASection` close. It follows the same structure as the Privacy Policy page.
 *
 * Lazily loaded by `src/App.jsx` through the shared `lazyWithRetry` helper and rendered
 * INSIDE `<Layout>`, which owns the page chrome — the Navbar, the `<main>` landmark,
 * the Footer, the floating conversion widgets and scroll-to-top. This file renders page
 * CONTENT only; the document head belongs to `<Seo>` and `<StructuredData>`.
 *
 * ACCURATE TO THE SITE'S MODEL, which is what makes these terms defensible: this is a
 * static, client-only site with no accounts and no backend, so the enquiry forms open a
 * pre-filled WhatsApp chat or email draft on the visitor's own device rather than
 * transmitting anything to a CIBLE server. A dedicated "Communications & Privacy"
 * section discloses that third-party (WhatsApp/Meta, email) handling and the guardian
 * expectation for under-18 visitors, and links to the Privacy Policy.
 *
 * PENDING LEGAL APPROVAL: the copy is representative pre-launch text that has not been
 * reviewed by counsel or approved by the institute. That status is disclosed on the page
 * itself in a `role="note"` panel, and no effective date is asserted until publication.
 *
 * Accessibility (WCAG AA): one `<h1>`; every section title is a semantic `<h2>`; the
 * contact email and the Privacy Policy reference are real links, and the email link is
 * sized to the site's 44px minimum hit area.
 */
import { Link } from 'react-router-dom'
import Seo from '../components/seo/Seo.jsx'
import StructuredData from '../components/seo/StructuredData.jsx'
import Container from '../components/ui/Container.jsx'
import SectionHeading from '../components/ui/SectionHeading.jsx'
import Breadcrumbs from '../components/ui/Breadcrumbs.jsx'
import CTASection from '../components/common/CTASection.jsx'
import siteConfig from '../data/siteConfig.js'

// Module-local. The SAME `{ name, path }` shape feeds both the visible <Breadcrumbs>
// and the BreadcrumbList JSON-LD, so the two cannot diverge.
const crumbs = [
  { name: 'Home', path: '/' },
  { name: 'Terms & Conditions', path: '/terms' },
]

// Representative terms copy matching the site's client-only model, pending review by
// the institute's legal team. Module-local. The Communications & Privacy section is NOT
// in this array: it is rendered as explicit JSX below so it can carry a real <Link> to
// the Privacy Policy.
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

      <Container as="section" className="max-w-3xl pb-16 md:pb-20">
        {/* The pending-approval disclosure. No effective date is asserted until these
            terms are reviewed by counsel and published. */}
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

        {/* Explicit JSX rather than a `sections` entry so it can carry a real <Link> to
            the Privacy Policy alongside the third-party-handling and guardian
            disclosures. */}
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
          {/* `inline-flex` keeps the anchor inline-level while letting `min-h-11` raise
              it to the site's 44px minimum hit area, with `items-center` re-centring the
              label in that taller box. The same treatment is used for the Footer's
              address links and the Privacy Policy's contact address.

              The `whitespace-nowrap` wrapper is REQUIRED, not decorative: `inline-flex`
              makes the anchor an ATOMIC inline-level box, and CSS allows a soft-wrap
              opportunity immediately after such a box, so the trailing full stop can
              break onto a line of its own. Binding the two in one nowrap context keeps
              them together, as they were when the address was plain inline text. The
              space BEFORE the anchor stays outside the wrapper so the pair can still
              move to the next line together at narrow widths. This mirrors
              `src/pages/PrivacyPolicy.jsx` — one pattern for one problem. */}
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
