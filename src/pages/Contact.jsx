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
 * Contact — the contact hub for CIBLE School of Language (route `/contact`).
 *
 * Lazily loaded by `src/App.jsx` through the shared `lazyWithRetry` helper and rendered
 * INSIDE `<Layout>`, which owns the page chrome — the Navbar, the `<main>` landmark, the
 * Footer, the floating conversion widgets and scroll-to-top. This file renders page
 * CONTENT only.
 *
 * Composition: a page header, five contact cards (Call / WhatsApp / Email / Visit /
 * Hours), the validated `<ContactForm>`, a `<GoogleMap>` embed and the shared admission
 * `<CTASection>` close. FOUR of the five cards carry a direct action; Office Hours is
 * informational and correctly carries none.
 *
 * ACTION OWNERSHIP — the "Open in Google Maps" control in the Visit Us card is the only
 * map action in this route's content. `<GoogleMap>` renders the embed frame alone and
 * exposes no link of its own, so nothing is duplicated and no control sits under an
 * opaque cross-origin frame where it would be an invisible focus stop. The Footer's
 * site-wide map link belongs to the Layout shell rather than this route; both resolve to
 * the one `siteConfig.mapLink`.
 *
 * SINGLE SOURCE OF TRUTH: every contact detail — phone, WhatsApp and tel deep links,
 * email, address, opening hours and the map link — comes from `siteConfig`, including the
 * meta description, which is composed from its locality, region and phone rather than
 * restating them. Whether an action opens in place or in a new tab is decided by the
 * `Button` primitive from the scheme of `href`, not here.
 *
 * EVENT-AWARE ENTRY: the page's only hook is `useSearchParams`, reading an optional
 * `?event=<slug>` set by the Events "Register" CTAs. The slug is validated against the
 * `events` source of truth as an ALLOWLIST, so only a real event can pre-fill the form's
 * Subject; anything missing or hand-edited is ignored.
 *
 * SEO: a unique `<Seo>` head plus `<StructuredData localBusiness breadcrumbs>`, which
 * emits both a LocalBusiness and a BreadcrumbList block for this page.
 *
 * Accessibility (WCAG AA): one `<h1>` (the page header). The five card labels are plain
 * `<h2>` subheadings rather than `SectionHeading`, which owns the page-level heading, so
 * the outline stays logical; the form and the map section are each named by their own
 * `<h2>` through `aria-labelledby`; leading icons are decorative and the opening hours
 * are a real `<ul>`.
 *
 * @returns {import('react').ReactElement} The Contact page content.
 */

// Module-local (NOT exported) so the module exposes only the default Contact component
// under `react/only-export-components`. The identical array feeds both the visible
// <Breadcrumbs> and the BreadcrumbList JSON-LD, so the two cannot diverge.
const crumbs = [
  { name: 'Home', path: '/' },
  { name: 'Contact', path: '/contact' },
]

function Contact() {
  // An Events "Register" CTA links here as `/contact?event=<slug>`. The slug is checked
  // against the events source of truth as an ALLOWLIST, so only a real event can
  // pre-fill the Subject; anything missing or hand-edited resolves to undefined, which
  // is the form's blank default. <ContactForm> keeps its Subject in sync with this
  // value, so moving between event links — or to plain /contact — never leaves a stale
  // subject behind.
  const [searchParams] = useSearchParams()
  const requestedEvent = searchParams.get('event')
  const matchedEvent = requestedEvent
    ? events.find((event) => event.slug === requestedEvent)
    : undefined
  const eventSubject = matchedEvent ? `Event registration: ${matchedEvent.title}` : undefined

  // Composed from `siteConfig` so no contact fact is restated outside it.
  const metaDescription = `Contact ${siteConfig.name} in ${siteConfig.addressParts.addressLocality}, ${siteConfig.addressParts.addressRegion}. Call ${siteConfig.phone}, message us on WhatsApp, email, or send an enquiry through our contact form.`

  return (
    <>
      <Seo title="Contact" canonical="/contact" description={metaDescription} />
      <StructuredData localBusiness breadcrumbs={crumbs} />

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

      <Container as="section" className="pb-16 md:pb-20">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <Card className="flex items-start gap-4 p-6">
              <FaPhone aria-hidden="true" className="mt-1 h-5 w-5 text-primary-600" />
              <div>
                <h2 className="text-lg font-semibold text-foreground">Call Us</h2>
                <p className="mt-1 text-muted">{siteConfig.phone}</p>
                <Button href={siteConfig.phoneHref} size="sm" className="mt-3">Call Now</Button>
              </div>
            </Card>

            <Card className="flex items-start gap-4 p-6">
              <FaWhatsapp aria-hidden="true" className="mt-1 h-5 w-5 text-accent-600" />
              <div>
                <h2 className="text-lg font-semibold text-foreground">WhatsApp</h2>
                <p className="mt-1 text-muted">Chat with us for quick answers.</p>
                <Button variant="accent" href={siteConfig.whatsappHref} size="sm" className="mt-3">Message on WhatsApp</Button>
              </div>
            </Card>

            <Card className="flex items-start gap-4 p-6">
              <FaEnvelope aria-hidden="true" className="mt-1 h-5 w-5 text-primary-600" />
              <div>
                <h2 className="text-lg font-semibold text-foreground">Email</h2>
                <p className="mt-1 text-muted">{siteConfig.email}</p>
                <Button variant="outline" href={siteConfig.emailHref} size="sm" className="mt-3">Send Email</Button>
              </div>
            </Card>

            <Card className="flex items-start gap-4 p-6">
              <FaMapMarkerAlt aria-hidden="true" className="mt-1 h-5 w-5 text-secondary-500" />
              <div>
                <h2 className="text-lg font-semibold text-foreground">Visit Us</h2>
                <p className="mt-1 text-muted">{siteConfig.address}</p>
                {/* The route's one map action — see ACTION OWNERSHIP in the file header.
                    It reuses the canonical `Button`, so the hit area, focus ring, scheme
                    allowlist and external-link attributes all come from that primitive.
                    Its variant and size mirror the Email sibling, keeping this a
                    low-emphasis location affordance that never out-shouts the admission
                    CTA. */}
                <Button variant="outline" href={siteConfig.mapLink} size="sm" className="mt-3">Open in Google Maps</Button>
              </div>
            </Card>

            <Card className="flex items-start gap-4 p-6">
              <FaClock aria-hidden="true" className="mt-1 h-5 w-5 text-primary-600" />
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

          {/* The visible <h2> is passed to the form as `headingId`, which names it
              through `aria-labelledby` and gives the form's result-panel <h3>s a correct
              outline ancestor. */}
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

      {/* A labelled landmark, so assistive technology can announce the region by name.
          The heading is visually hidden because the map is deliberately full-width — no
          Container wraps it — and <GoogleMap> owns both its own responsive box and the
          embedded frame's accessible name. */}
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
