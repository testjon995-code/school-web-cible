import { FaRegImages } from 'react-icons/fa'
import Seo from '../components/seo/Seo.jsx'
import StructuredData from '../components/seo/StructuredData.jsx'
import Container from '../components/ui/Container.jsx'
import SectionHeading from '../components/ui/SectionHeading.jsx'
import Breadcrumbs from '../components/ui/Breadcrumbs.jsx'
import Button from '../components/ui/Button.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import GalleryComponent from '../components/common/Gallery.jsx'
import CTASection from '../components/common/CTASection.jsx'
import { galleryImages } from '../data/gallery.js'

/**
 * Gallery — the `/gallery` route of the CIBLE School of Language website.
 *
 * Presentational page that showcases CIBLE's campus and classroom imagery
 * through the single canonical {@link GalleryComponent} composite (a Swiper
 * carousel with an accessible lightbox). It is lazy-loaded and rendered by
 * `src/App.jsx` inside the shared `<Layout>`, so it renders ONLY page content —
 * the navigation, footer and floating conversion widgets are owned by the
 * layout shell, and there is intentionally no `<main>` here.
 *
 * Naming note: the imported composite is also conceptually "Gallery"; it is
 * aliased to `GalleryComponent` so this page's own function can be named
 * `Gallery` and the `export default Gallery` reads naturally without an
 * identifier clash.
 *
 * Content source: the imagery comes from `src/data/gallery.js`, which owns both
 * the `{ src, alt, caption }` records and the `src/assets` SVG imports that Vite
 * resolves into fingerprinted URLs usable as an `<img src>`. Those records
 * were declared inline in this file until now — the recorded limitation that
 * gallery content lived in a page rather than a data module (AAP §0.3.4, §0.9.1
 * Group 8) — so this page declares no content structure of its own and imports
 * no asset directly; the asset-import exception moved to that data module with
 * the records. Editorial rules for the records, including why every `alt` opens
 * "Illustration representing …" rather than asserting a real photograph, are
 * documented beside them there and are deliberately not restated here.
 *
 * Empty state: the imported collection is treated as untrusted input, so when
 * it is missing, not an array or empty, the labelled region below renders the
 * shared {@link EmptyState} in place of the carousel (AAP §0.11.3) — an
 * explanation of what happened plus a next step, never a blank or collapsed
 * container. Both branches keep the region and its visually hidden heading, so
 * the section retains its accessible name either way.
 *
 * No fragment handling here, deliberately: `Faculty`, `Blog` and `Faq` each own
 * a hash-reveal effect because their individual items are addressable and are
 * indexed as such by `src/lib/search.js`. Gallery slides are neither, so this
 * page adds no `location.hash` effect and must not gain one for symmetry with
 * those pages (AAP §0.9.2).
 *
 * SEO: emits a unique `<Seo>` head (title/description/canonical/Open Graph/
 * Twitter) plus a BreadcrumbList JSON-LD block via {@link StructuredData}. The
 * `crumbs` array is the single source shared by the visible {@link Breadcrumbs}
 * trail and the structured data so both stay in agreement.
 *
 * Accessibility (WCAG AA): exactly one `<h1>` (rendered by `SectionHeading`
 * with `as="h1"`), every image carries a meaningful `alt`, and both content
 * blocks are semantic `<section>` landmarks. Every styling class resolves to a
 * Tailwind `@theme` token or native utility on the project's 8px spacing scale.
 *
 * @returns {import('react').ReactElement} The rendered Gallery page.
 */

// Breadcrumb trail for this page. Shared verbatim by the visible <Breadcrumbs>
// and the BreadcrumbList JSON-LD (identical { name, path } shape) so the
// rendered trail and the structured data never diverge.
const crumbs = [
  { name: 'Home', path: '/' },
  { name: 'Gallery', path: '/gallery' },
]

// Whether there is anything to render in the carousel. Derived once at module
// scope because it depends only on a static import, and written as an explicit
// `Array.isArray` check rather than a bare truthiness test: the records arrive
// from another module, so a malformed edit there (an object, a stray `null`, a
// renamed export resolving to `undefined`) must fall through to the empty state
// instead of reaching `images.length` inside the carousel. This mirrors the
// defensive posture the shared FAQ component already applies to its own
// caller-supplied `items`.
const hasImages = Array.isArray(galleryImages) && galleryImages.length > 0

function Gallery() {
  return (
    <>
      <Seo
        title="Gallery"
        canonical="/gallery"
        description="An illustrated gallery of CIBLE School of Language — depicting our campus, classrooms, spoken English sessions, science coaching, computer lab and student activities in Madhubani, Bihar."
      />
      <StructuredData breadcrumbs={crumbs} />

      <Container as="section" className="py-12 md:py-16">
        <Breadcrumbs items={crumbs} className="mb-6" />
        <SectionHeading
          as="h1"
          align="left"
          eyebrow="Life at CIBLE"
          title="Gallery"
          subtitle="An illustrated glimpse into our classrooms, activities and the CIBLE learning experience."
        />
      </Container>

      {/* Labelled region (m06): the gallery carousel has no heading of its own,
          so a visually-hidden <h2> referenced via `aria-labelledby` gives the
          section an accessible name without altering the visual design. The
          region and its heading wrap BOTH branches, so the section keeps that
          accessible name when the empty state is showing instead. */}
      <Container as="section" aria-labelledby="gallery-images-heading" className="pb-16 md:pb-20">
        <h2 id="gallery-images-heading" className="sr-only">Gallery images</h2>
        {hasImages ? (
          <GalleryComponent images={galleryImages} />
        ) : (
          /* Unavailable-content state, not a failure: nothing went wrong, there
             is simply nothing to show, so the tone is `neutral` and no `role` is
             set — this branch is decided by build-time content rather than by a
             live filter, unlike the shared FAQ component's `role="status"`
             no-results branch. `headingAs="h3"` seats the title one level below
             the region's hidden <h2>, keeping the outline h1 → h2 → h3 intact,
             and the glyph is decorative (EmptyState hides it from assistive
             technology). The copy answers WHAT HAPPENED and WHAT NEXT: the
             contact route is where the address, map and phone number live, so a
             visitor who wanted to see the place can still do so in person. */
          <EmptyState
            tone="neutral"
            headingAs="h3"
            icon={FaRegImages}
            title="No gallery images yet"
            description="There are no images to show here at the moment. You are welcome to see the institute in person — our address, map and phone number are on the contact page — or get in touch with any question about the classes."
            action={<Button to="/contact">Visit or contact us</Button>}
          />
        )}
      </Container>

      <CTASection />
    </>
  )
}

export default Gallery
