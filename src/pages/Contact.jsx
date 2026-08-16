import { useSearchParams } from 'react-router-dom'
import { FaPhone, FaWhatsapp, FaEnvelope, FaMapMarkerAlt, FaClock } from 'react-icons/fa'
import Seo from '../components/seo/Seo.jsx'
import StructuredData from '../components/seo/StructuredData.jsx'
import Container from '../components/ui/Container.jsx'
import SectionHeading from '../components/ui/SectionHeading.jsx'
import Breadcrumbs from '../components/ui/Breadcrumbs.jsx'
import Card from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import ContactForm from '../components/forms/ContactForm.jsx'
import GoogleMap from '../components/common/GoogleMap.jsx'
import CTASection from '../components/common/CTASection.jsx'
import siteConfig from '../data/siteConfig.js'
import events from '../data/events.js'

/**
 * Contact — the primary contact hub for the CIBLE School of Language SPA
 * (route `/contact`, lazy-loaded by `src/App.jsx` inside the shared `<Layout>`).
 * This component renders ONLY page content; the persistent Navbar, Footer and
 * floating conversion widgets are supplied by the Layout shell.
 *
 * Conversion-first composition (AAP §0.6.3 — every page leads toward admission):
 * a page header, five contact cards (Call / WhatsApp / Email / Visit / Hours),
 * the validated `ContactForm`, a lazy `GoogleMap` embed of the institute, and the
 * shared admission `CTASection` closing the page. FOUR of the five cards carry a
 * direct action — Call Now, Message on WhatsApp, Send Email and "Open in Google
 * Maps" (the Visit Us directions action, m11) — so every contact channel is
 * actionable at the ≥44px touch floor the `Button` primitive owns. The fifth
 * card, Office Hours, is informational and correctly carries none. That map
 * action is the ONLY one in this page's own content: the `GoogleMap` embed below
 * renders the frame alone and contributes no competing link.
 *
 * Reuse-first / zero duplication: every UI element is one of the canonical
 * primitives — `Container` (width + gutters), `SectionHeading` (the single
 * page `<h1>`), `Breadcrumbs`, `Card`, `Button` (polymorphic; `href` renders a
 * semantic `<a>`), plus the composite `ContactForm`, `GoogleMap` and
 * `CTASection`. No raw element is restyled to imitate a primitive.
 *
 * Single source of truth: all contact details (phone, WhatsApp/tel deep links,
 * email, address, opening hours, map embed) come from `siteConfig` — nothing is
 * hardcoded here, including the SEO meta description, which is composed from the
 * `siteConfig` locality/region/phone rather than duplicating those facts (m05).
 * The click-to-call (`tel:`) and email (`mailto:`) actions open in place while
 * the WhatsApp (`https://wa.me/…`) action opens in a new tab; that behaviour is
 * owned by the `Button` primitive from the scheme of `href`.
 *
 * Event-aware entry (M22): the page's only hook is `useSearchParams`, used to
 * read an optional `?event=<slug>` set by the Events "Register" CTAs. The slug
 * is validated against the `events` single source of truth (an allowlist), and a
 * matching event pre-fills the ContactForm's Subject so the event's identity
 * survives the handoff; an unknown/absent slug is ignored.
 *
 * SEO: a unique `<Seo>` head (title → "Contact | CIBLE School of Language",
 * description, canonical `/contact`, Open Graph / Twitter) plus `<StructuredData
 * localBusiness breadcrumbs={crumbs} />`, which emits BOTH a LocalBusiness and a
 * BreadcrumbList JSON-LD block for this page.
 *
 * Accessibility (WCAG AA): exactly ONE `<h1>` (the page header). The five
 * contact-card labels are genuine section subheadings rendered as plain `<h2>`
 * (NOT `SectionHeading`, which owns the page-level heading) so the outline stays
 * logical. Leading icons are decorative (`aria-hidden="true"`) and the opening
 * hours are a real `<ul>`. Styling is token-only on the 8px spacing scale with
 * static classNames.
 *
 * Card icon sizing (do not drop `shrink-0`): each card is a `flex items-start
 * gap-4` row, so a flex item's default `flex-shrink: 1` let the leading icon
 * donate width whenever the card's text column needed more than the card had —
 * and the icon is a replaced element with an intrinsic aspect ratio, so it lost
 * width rather than wrapping. That is a measured defect, not a hypothetical: the
 * "Visit Us" marker (`viewBox 0 0 384 512`, the only non-square glyph here)
 * computed 17.53×20 at 1280 and 9.58×20 at 390, dragging that card's text column
 * AND its "Open in Google Maps" button 2.47px / 10.42px left of the four
 * siblings, and at 390 the "Office Hours" clock shrank too (18.23×20, −1.77px),
 * leaving three ragged left edges down the stack. `shrink-0` on all five pins
 * every icon to its declared 20×20 box so the cards share one text origin.
 *
 * @returns {import('react').ReactElement} The Contact page content.
 */

// Module-local (NOT exported) so the module exposes only the default Contact
// component under `react/only-export-components`. The `{ name, path }` shape is
// the shared breadcrumb contract consumed by BOTH the visible <Breadcrumbs>
// trail and `breadcrumbSchema` (via <StructuredData breadcrumbs>), keeping the
// rendered trail and the BreadcrumbList JSON-LD in agreement.
const crumbs = [
  { name: 'Home', path: '/' },
  { name: 'Contact', path: '/contact' },
]

function Contact() {
  // Event-aware contact (M22): an Events "Register" CTA links here as
  // `/contact?event=<slug>`. Validate the slug against the events single source
  // of truth so ONLY a real event can pre-fill the form's Subject; any missing
  // or hand-edited value is ignored (undefined → the form's blank default). The
  // ContactForm keeps its Subject field in sync with this value, so navigating
  // between different event links (or to plain /contact) never leaves a stale
  // subject — the same integrity contract used by the Admission course preselect.
  const [searchParams] = useSearchParams()
  const requestedEvent = searchParams.get('event')
  const matchedEvent = requestedEvent
    ? events.find((event) => event.slug === requestedEvent)
    : undefined
  const eventSubject = matchedEvent ? `Event registration: ${matchedEvent.title}` : undefined

  // Meta description derived from the single source of truth (siteConfig) rather
  // than hardcoding the locality/phone again (m05 — no contact facts duplicated
  // outside siteConfig).
  const metaDescription = `Contact ${siteConfig.name} in ${siteConfig.addressParts.addressLocality}, ${siteConfig.addressParts.addressRegion}. Call ${siteConfig.phone}, message us on WhatsApp, email, or send an enquiry through our contact form.`

  return (
    <>
      <Seo title="Contact" canonical="/contact" description={metaDescription} />
      <StructuredData localBusiness breadcrumbs={crumbs} />

      {/* Page header */}
      <Container as="section" className="py-12 md:py-16">
        <Breadcrumbs items={crumbs} className="mb-6" />
        <SectionHeading
          as="h1"
          align="left"
          eyebrow="Get in Touch"
          title="Contact CIBLE"
          subtitle="We'd love to hear from you. Reach out for admissions, course details or a free counseling session."
        />
      </Container>

      {/* Contact info + form (two columns on lg) */}
      <Container as="section" className="pb-16 md:pb-20">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left: contact details */}
          <div className="flex flex-col gap-4">
            <Card className="flex items-start gap-4 p-6">
              <FaPhone aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-primary-600" />
              <div>
                <h2 className="text-lg font-semibold text-foreground">Call Us</h2>
                <p className="mt-1 text-muted">{siteConfig.phone}</p>
                <Button href={siteConfig.phoneHref} size="sm" className="mt-3">Call Now</Button>
              </div>
            </Card>

            <Card className="flex items-start gap-4 p-6">
              <FaWhatsapp aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-accent-600" />
              <div>
                <h2 className="text-lg font-semibold text-foreground">WhatsApp</h2>
                <p className="mt-1 text-muted">Chat with us for quick answers.</p>
                <Button variant="accent" href={siteConfig.whatsappHref} size="sm" className="mt-3">Message on WhatsApp</Button>
              </div>
            </Card>

            <Card className="flex items-start gap-4 p-6">
              <FaEnvelope aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-primary-600" />
              <div>
                <h2 className="text-lg font-semibold text-foreground">Email</h2>
                <p className="mt-1 text-muted">{siteConfig.email}</p>
                <Button variant="outline" href={siteConfig.emailHref} size="sm" className="mt-3">Send Email</Button>
              </div>
            </Card>

            <Card className="flex items-start gap-4 p-6">
              <FaMapMarkerAlt aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-secondary-500" />
              <div>
                <h2 className="text-lg font-semibold text-foreground">Visit Us</h2>
                <p className="mt-1 text-muted">{siteConfig.address}</p>
                {/* Directions action (m11): the single canonical "open the location in
                    Maps" action in this page's own content, and the replacement for the
                    20px-tall affordance gate G11 measured. `GoogleMap` below renders the
                    embed frame alone and exposes no link of its own (see its JSDoc), so
                    this card is the one owner and nothing is duplicated — a control under
                    an opaque cross-origin frame would be an invisible focus stop (WCAG
                    2.4.7 Focus Visible) rather than a usable alternative. The embed is
                    named separately by the `<iframe title>` that `GoogleMap` always
                    applies, so no link on this route doubles as the frame's label. The
                    Footer keeps its own site-wide map link, but that belongs to the
                    persistent Layout shell rather than this route's content; both resolve
                    to the one `siteConfig.mapLink`, so neither name leads anywhere
                    different.
                    Reuses the canonical `Button`, which supplies the ≥44px hit area
                    (`min-h-11 min-w-11` + `sm` = `h-11`), the shared :focus-visible ring,
                    the `sanitizeHref` scheme allowlist, and — because `mapLink` is an
                    external https URL — `target="_blank" rel="noopener noreferrer"`
                    applied AFTER the props spread. `outline`/`sm`/`mt-3` mirror the Email
                    sibling exactly, keeping this a low-emphasis location affordance that
                    never out-shouts the admission CTA. */}
                <Button variant="outline" href={siteConfig.mapLink} size="sm" className="mt-3">Open in Google Maps</Button>
              </div>
            </Card>

            <Card className="flex items-start gap-4 p-6">
              <FaClock aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-primary-600" />
              <div>
                <h2 className="text-lg font-semibold text-foreground">Office Hours</h2>
                <ul className="mt-1 space-y-1 text-muted">
                  {siteConfig.hours.map((slot) => (
                    <li key={slot.days}>
                      <span className="font-medium text-foreground">{slot.days}:</span> {slot.time}
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          </div>

          {/* Right: contact form. The visible <h2> names the form via
              `aria-labelledby={headingId}` (M17), giving it a programmatic
              accessible name and a correct outline ancestor for the form's
              result-panel <h3>s. */}
          <div>
            <h2 id="contact-form-heading" className="text-lg font-semibold text-foreground">
              Send us a message
            </h2>
            <ContactForm
              headingId="contact-form-heading"
              defaultSubject={eventSubject}
              className="mt-4"
            />
          </div>
        </div>
      </Container>

      {/* Map — a labelled landmark so assistive technology announces the region
          by name (m06). The heading is visually hidden to preserve the existing
          full-width map design (no Container is added, so the map's width is
          unchanged); the GoogleMap primitive owns its own responsive box and the
          embedded frame's own accessible name (its `title`). It contributes no
          action of its own, so the directions control stays in the Visit Us card
          above. */}
      <section aria-labelledby="contact-map-heading">
        <h2 id="contact-map-heading" className="sr-only">
          Our location on the map
        </h2>
        <GoogleMap />
      </section>

      <CTASection />
    </>
  )
}

export default Contact
