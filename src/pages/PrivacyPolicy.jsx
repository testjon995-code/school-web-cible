import Seo from '../components/seo/Seo.jsx'
import StructuredData from '../components/seo/StructuredData.jsx'
import Container from '../components/ui/Container.jsx'
import SectionHeading from '../components/ui/SectionHeading.jsx'
import Breadcrumbs from '../components/ui/Breadcrumbs.jsx'
import CTASection from '../components/common/CTASection.jsx'
import siteConfig from '../data/siteConfig.js'

// Module-local, not exported. The SAME array feeds both the visible <Breadcrumbs> and
// the BreadcrumbList JSON-LD, so the two cannot diverge.
const crumbs = [
  { name: 'Home', path: '/' },
  { name: 'Privacy Policy', path: '/privacy-policy' },
]

// Module-local. The copy describes how this website actually works — a static,
// client-only site with no backend or database, whose forms open a pre-filled WhatsApp
// chat or email draft on the visitor's own device rather than transmitting anything to a
// CIBLE server. It therefore discloses the third parties that process such a message
// (WhatsApp/Meta and email providers), the third-party content the site itself loads
// (Google Fonts on every page and the Contact page's embedded map, both of which send
// request data such as the visitor's IP address to Google), the absence of any analytics
// or tracking by CIBLE, and the guardian expectation for minors.
//
// PENDING LEGAL APPROVAL: this is representative pre-launch copy that has not been
// reviewed by counsel or approved by the institute. That status is disclosed to visitors
// in the notice panel below.
const sections = [
  {
    heading: 'How This Website Works',
    body: 'CIBLE School of Language operates this website as a static, client-side website with no backend server and no database. Nothing you type into a form is transmitted to, or stored on, a CIBLE server. Instead, our admission, contact and newsletter forms open a pre-filled message — a WhatsApp chat or an email draft — on your own device. That message is sent only if you choose to press send.',
  },
  {
    heading: 'Information You Choose to Share',
    body: 'The only personal information we receive is what you decide to send us through those channels: typically your name, phone number, email address and course of interest, plus anything you write in your message. We ask only for the details needed to respond to your enquiry, and you never have to submit a form to browse the site.',
  },
  {
    heading: 'Third-Party Processing (WhatsApp / Meta and Email)',
    body: 'Because your message is delivered through WhatsApp or email, your information is handled by those third parties. WhatsApp messages are processed by WhatsApp and Meta under the WhatsApp and Meta privacy policies; email is processed by your email provider and by the provider of the institute\u2019s inbox. Their handling of your data is governed by their own terms and privacy policies, which we do not control. Please review them before sending sensitive information.',
  },
  {
    heading: 'Content Delivered by Google (Fonts and Maps)',
    body: 'To present the site, we load the Inter typeface from Google Fonts on every page, and the Contact page embeds an interactive Google Map so visitors can find the institute. When your browser requests these resources, standard technical data \u2014 including your IP address, browser type and the page being viewed \u2014 is sent to Google in order to deliver them. This is inherent to how web fonts and embedded maps work; we do not use it to track or identify you. Google\u2019s handling of that data is governed by Google\u2019s own privacy policy, which we do not control.',
  },
  {
    heading: 'No Tracking or Analytics by CIBLE',
    body: 'CIBLE itself does not use analytics, advertising, tracking pixels, or cookies that identify you; we build no visitor profiles and keep no server-side log of your browsing. Aside from the technical request data sent to Google when the fonts and the Contact-page map load \u2014 described in the section above \u2014 no browsing data about you is collected by this website.',
  },
  {
    heading: 'How We Use Your Information',
    body: 'We use the details you send only to respond to your enquiry, provide course and admission guidance, and arrange counseling sessions or campus visits. We do not maintain a marketing database, and we do not sell or rent your personal information.',
  },
  {
    heading: 'Data Retention and Your Choices',
    body: 'Because we do not operate a server-side database, any message you send lives in WhatsApp, in your own email, and in the institute\u2019s inbox. To review, correct or remove information you have sent, contact us using the details below, or use the controls provided by WhatsApp/Meta or your email provider. You remain in control of what you choose to send.',
  },
  {
    heading: 'Children\u2019s Privacy',
    body: 'Our courses serve learners of many ages. If you are under 18, please involve a parent or guardian before sharing personal details or submitting a form, and share only the information necessary for an admission enquiry.',
  },
  {
    heading: 'Changes to This Policy',
    body: 'As the institute finalizes its operations, this policy will be reviewed by legal counsel and updated. Any changes will be posted on this page with a revised date once the policy is formally published.',
  },
]

/**
 * PrivacyPolicy — the `/privacy-policy` legal page for CIBLE School of Language.
 *
 * Long-form legal prose describing how the institute handles the personal information
 * visitors choose to share through the site's WhatsApp and email enquiry forms. What
 * makes the policy defensible is that it reflects the site's ACTUAL data flow: a static,
 * client-only site with no backend, whose forms open a pre-filled draft on the visitor's
 * device rather than transmitting anything to a CIBLE server (the `sections` array above
 * records the full set of disclosures that follow from this).
 *
 * PENDING LEGAL APPROVAL: representative pre-launch text that has not been reviewed by
 * counsel or approved by the institute. That status is disclosed on the page itself in a
 * `role="note"` panel, and no effective date is asserted until publication.
 *
 * Lazily loaded by `src/App.jsx` through the shared `lazyWithRetry` helper and rendered
 * INSIDE `<Layout>`, which owns the page chrome, so this file renders page CONTENT only.
 * It is assembled entirely from the canonical primitives — `<Seo>`/`<StructuredData>`,
 * `<Container>`, `<SectionHeading>`, `<Breadcrumbs>` and the shared `<CTASection>`
 * close.
 *
 * Accessibility (WCAG AA): one `<h1>`; every policy section title is a genuine `<h2>` in
 * document order; the body is real prose in semantic `<p>` elements at a narrow reading
 * measure; and the contact address is an actionable `mailto:` link sized to the site's
 * 44px minimum hit area.
 *
 * @returns {import('react').ReactElement} The rendered privacy policy page.
 */
function PrivacyPolicy() {
  return (
    <>
      <Seo
        title="Privacy Policy"
        canonical="/privacy-policy"
        description="How CIBLE School of Language handles the information you share through our website's WhatsApp and email enquiry forms — a static, client-only site with no backend data collection."
      />
      <StructuredData breadcrumbs={crumbs} />

      <Container as="section" className="py-12 md:py-16">
        <Breadcrumbs items={crumbs} className="mb-6" />
        <SectionHeading
          as="h1"
          align="left"
          eyebrow="Legal"
          title="Privacy Policy"
          subtitle="How CIBLE School of Language handles the information you choose to share."
        />
      </Container>

      <Container as="section" className="max-w-3xl pb-16 md:pb-20">
        {/* The pending-approval disclosure. No effective date is asserted until the
            policy is reviewed by counsel and published. */}
        <div role="note" className="rounded-lg border border-border bg-secondary-50 p-4">
          <p className="text-sm leading-relaxed text-foreground">
            <strong className="font-semibold">Draft for review.</strong> This Privacy Policy is a representative
            pre-launch draft that describes how the website currently works. It has not yet been reviewed by legal
            counsel or approved by CIBLE School of Language, and no effective date applies until it is published.
          </p>
        </div>

        {sections.map((section) => (
          <div key={section.heading}>
            <h2 className="mt-8 mb-3 text-xl font-semibold text-foreground md:text-2xl">
              {section.heading}
            </h2>
            <p className="text-muted leading-relaxed">{section.body}</p>
          </div>
        ))}
        <h2 className="mt-8 mb-3 text-xl font-semibold text-foreground md:text-2xl">
          Contact Us
        </h2>
        <p className="text-muted leading-relaxed">
          If you have any questions about this Privacy Policy, please contact us at{' '}
          {/* `inline-flex` keeps the anchor inline-level while letting `min-h-11` raise
              it to the site's 44px minimum hit area, with `items-center` re-centring the
              label in that taller box — the same treatment the Footer's address links
              use.

              The `whitespace-nowrap` wrapper is REQUIRED, not decorative: `inline-flex`
              makes the anchor an ATOMIC inline-level box, and CSS allows a soft-wrap
              opportunity immediately after such a box, so the trailing full stop can
              break onto a line of its own. Binding the two in one nowrap context keeps
              them together, as they were when the address was plain inline text. The
              space BEFORE the anchor stays outside the wrapper so the pair can still
              move to the next line together at narrow widths. */}
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

export default PrivacyPolicy
