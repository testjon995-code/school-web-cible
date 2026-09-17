import Seo from '../components/seo/Seo.jsx'
import StructuredData from '../components/seo/StructuredData.jsx'
import Container from '../components/ui/Container.jsx'
import SectionHeading from '../components/ui/SectionHeading.jsx'
import Breadcrumbs from '../components/ui/Breadcrumbs.jsx'
import Button from '../components/ui/Button.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import ReviewCard from '../components/common/ReviewCard.jsx'
import TestimonialSlider from '../components/common/TestimonialSlider.jsx'
import Statistics from '../components/common/Statistics.jsx'
import RepresentativeNote from '../components/common/RepresentativeNote.jsx'
import CTASection from '../components/common/CTASection.jsx'
import testimonials from '../data/testimonials.js'

/**
 * SuccessStories — CIBLE School of Language (route `/success-stories`).
 *
 * The site's social-proof page. It converts prospective students and parents by
 * showcasing CIBLE outcomes — spoken-English confidence, exam results and career
 * wins — through three reinforcing trust signals, then closes with the shared
 * admission CTA. The testimonials are polished REPRESENTATIVE samples (not
 * verified student records); a `RepresentativeNote` discloses this at the top of
 * the review grid and the site-wide Footer band reinforces it (M03, AAP §0.7.2):
 *
 *   1. A responsive grid of canonical <ReviewCard>s (one per testimonial), so
 *      every review is scannable at a glance on the initial viewport.
 *   2. The animated <Statistics> band (self-wrapping blue band + CountUp
 *      counters) for headline achievement numbers.
 *   3. The <TestimonialSlider> (Swiper carousel) on a tinted `bg-surface` band
 *      for a featured, swipeable highlight reel of the same reviews.
 *
 * Reuse-first / zero duplication (AAP §0.8): this page is purely presentational
 * and composes ONLY the shared primitives/components — it holds NO testimonial
 * content of its own. All review records come from the single source of truth
 * `src/data/testimonials.js`, which today backs BOTH the grid and the featured
 * band; see the empty-state note below for why each of those two render sites
 * nevertheless guards its own collection. The only module-local datum is the
 * breadcrumb trail (`crumbs`), which is intentionally NOT exported to keep the
 * file's public surface a single default component (clean under the
 * `react/only-export-components` lint rule).
 *
 * ## Empty states: TWO independent branches, deliberately not one
 *
 * This page renders TWO distinct collections, and they are counted as TWO
 * separate cases in the project's empty-state inventory (AAP §0.11.3) because
 * they fail differently and must be explained differently:
 *
 *   • The REVIEW GRID — the written, rated reviews. With no records the grid
 *     element rendered as an unexplained empty container, directly beneath a
 *     representative-content note asserting that the stories "shown here" are
 *     samples. This branch therefore replaces the grid with `ui/EmptyState` AND
 *     suppresses that note (nothing is shown, so the claim would be untrue),
 *     while keeping the labelled region and its `sr-only` <h2> so the section
 *     never loses its accessible name.
 *   • The FEATURED BAND — the highlight reel. One verified fact is worth
 *     recording here, because it is exactly what a future reader would
 *     otherwise re-investigate: `TestimonialSlider` ALREADY self-suppresses
 *     (`if (!items?.length) return null`, placed after its hooks and BEFORE
 *     both the Play/Pause toggle and the Swiper element), so an empty
 *     collection never produced an operable carousel, orphaned pagination
 *     bullets or a focusable control acting on nothing. The real observed
 *     defect was a blank tinted `bg-surface` band — a <SectionHeading>
 *     promising student voices above an empty `mt-10` wrapper. This branch
 *     fills that same wrapper with an `ui/EmptyState` under the retained
 *     heading; `TestimonialSlider` needs no change and is not touched.
 *
 * The two branches are written INDEPENDENTLY — each guards its own collection
 * at its own render site, with no shared `isEmpty` flag and no whole-page early
 * return — even though both collections resolve to `src/data/testimonials.js`
 * today and therefore empty together. That is deliberate: if the content source
 * ever splits into separate review and featured-story collections, each render
 * site already reads and guards its own, so neither branch has to be
 * re-derived. Both arrays are also derived defensively (`Array.isArray`), so a
 * malformed default export degrades to the empty state instead of throwing
 * inside `.map()` or inside the slider.
 *
 * Each state answers BOTH of the questions `ui/EmptyState` exists to answer —
 * what happened, and what to do next — with deliberately DIFFERENT copy per
 * branch, because the two describe different absences (no written reviews vs.
 * no featured learner stories); identical copy would defeat the purpose of
 * having two branches. Both use `tone="neutral"`, since nothing has failed —
 * there is simply nothing published yet — so neither is announced as an alert,
 * and both render their heading at `h3` beneath their section's <h2>. Neither
 * invents a learner count, a placement figure or a "coming soon" promise
 * (AAP §0.7.4): "no reviews are published yet" is the honest statement.
 *
 * Routing: lazy-loaded by `src/App.jsx`
 *   `const SuccessStories = lazy(() => import('./pages/SuccessStories.jsx'))`
 *   `<Route path="success-stories" element={<SuccessStories />} />`
 * rendered inside the shared <Layout> (which owns the Navbar/Footer/floating
 * CTAs), so this component renders ONLY page content — no page chrome.
 *
 * SEO: <Seo> emits the unique title ("Success Stories | CIBLE School of
 * Language"), description and canonical `/success-stories`; <StructuredData>
 * emits BreadcrumbList JSON-LD from the SAME `crumbs` array that drives the
 * visible <Breadcrumbs>, keeping the rendered trail and the structured data in
 * agreement (what search engines expect).
 *
 * Accessibility (WCAG AA): exactly ONE <h1> on the page — the header rendered by
 * <SectionHeading as="h1">. Every subsequent section heading is a <h2> (the
 * <SectionHeading> default) and each <ReviewCard> renders its own accessible
 * <figure>/<blockquote>/<figcaption> testimonial structure, so the heading
 * outline stays logical.
 *
 * Styling: 100% token-driven Tailwind utilities on the project's 8px spacing
 * scale (`py-12`/`md:py-16`, `pb-16`/`md:pb-20`, `gap-6`, `mt-10`, `bg-surface`)
 * with zero hardcoded values. Section rhythm alternates for visual clarity:
 * white header → white review grid → blue <Statistics> band → tinted
 * `bg-surface` slider band → <CTASection>. The empty branches preserve that
 * rhythm exactly and add ONE utility between them: `bg-white` on the featured
 * band's `ui/EmptyState`, which is the override that primitive documents for
 * sitting a neutral panel on a tinted section (its default fill IS
 * `bg-surface`, so on that band it would otherwise read as a borderline-only
 * shape). No new token and no new utility is introduced anywhere, so
 * `src/index.css` carries no diff.
 */

// Breadcrumb trail from the site root to this page. Module-local (never
// exported) and shared verbatim by the visible <Breadcrumbs> and the
// <StructuredData> BreadcrumbList so both stay in lock-step. Shape matches the
// `{ name, path }` contract consumed by `breadcrumbSchema` in src/lib/schema.js.
const crumbs = [
  { name: 'Home', path: '/' },
  { name: 'Success Stories', path: '/success-stories' },
]

function SuccessStories() {
  // The page's two collections, resolved and guarded SEPARATELY — one per
  // render site — even though both read the same module today and therefore
  // empty together. They are two distinct empty-state cases (AAP §0.11.3)
  // because they fail differently, so the logic is deliberately NOT hoisted
  // into a single shared `isEmpty` flag: should the content source later split
  // into a written-review collection and a curated featured-story collection,
  // each site already owns its own read and its own guard, and neither branch
  // has to be re-derived. `Array.isArray` treats the import as untrusted so a
  // malformed default export degrades to the empty state rather than throwing.
  const reviews = Array.isArray(testimonials) ? testimonials : []
  const featuredStories = Array.isArray(testimonials) ? testimonials : []

  return (
    <>
      <Seo
        title="Success Stories"
        canonical="/success-stories"
        description="Read success stories from CIBLE School of Language students — spoken English confidence, exam results and career wins from learners across Madhubani, Bihar."
      />
      <StructuredData breadcrumbs={crumbs} />

      {/* Page header — the single <h1> for this route. */}
      <Container as="section" className="py-12 md:py-16">
        <Breadcrumbs items={crumbs} className="mb-6" />
        <SectionHeading
          as="h1"
          align="left"
          eyebrow="Student Success"
          title="Success Stories"
          subtitle="See how CIBLE students build confidence, clear exams and shape their futures."
        />
      </Container>

      {/* Review grid — one canonical <ReviewCard> per testimonial. Labelled as a
          region (m06) with a visually-hidden <h2> referenced via
          `aria-labelledby`, because each ReviewCard renders a
          <figure>/<blockquote>/<figcaption> with no heading of its own, so the
          section would otherwise have no accessible name. */}
      <Container as="section" aria-labelledby="reviews-heading" className="pb-16 md:pb-20">
        {/* The region's accessible name is rendered OUTSIDE the branch, so the
            section keeps it whether or not there is anything to show. */}
        <h2 id="reviews-heading" className="sr-only">Student reviews</h2>
        {reviews.length ? (
          <>
            {/* The representative-content note belongs to the POPULATED branch
                only: its copy discloses that the stories "shown here" are
                samples, which is untrue when none are shown. Do not lift it back
                out of this arm. */}
            <RepresentativeNote className="mb-8">
              These success stories and reviews are representative samples for
              demonstration, not verified student records. They will be replaced with
              consent-approved outcomes before launch.
            </RepresentativeNote>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {reviews.map((review) => (
                <ReviewCard key={review.name} review={review} />
              ))}
            </div>
          </>
        ) : (
          /* EMPTY BRANCH ONE — no written reviews. Replaces the grid itself, so
             no empty container is left behind, and states both what happened and
             what to do instead. Wording is specific to written reviews and is
             intentionally different from the featured band's state below. */
          <EmptyState
            tone="neutral"
            headingAs="h3"
            title="No written reviews published yet"
            description="Reviews are only published here with the learner’s consent, and none are available at the moment. Each course page sets out exactly what its programme covers, and our team can answer questions about it directly."
            action={
              <>
                <Button to="/courses" variant="primary">
                  Browse our courses
                </Button>
                <Button to="/contact" variant="outline">
                  Contact us
                </Button>
              </>
            }
          />
        )}
      </Container>

      {/* Animated stats band (self-wrapping blue band + CountUp counters). */}
      <Statistics />

      {/* Featured testimonial slider on a tinted surface band. */}
      <section className="bg-surface py-16 md:py-20">
        <Container>
          <SectionHeading
            eyebrow="In Their Words"
            title="Hear From Our Students"
            subtitle="Swipe through highlights from the CIBLE learning community."
          />
          <div className="mt-10">
            {featuredStories.length ? (
              <TestimonialSlider items={featuredStories} />
            ) : (
              /* EMPTY BRANCH TWO — no featured learner stories. The slider
                 already returns null on an empty `items`, so the carousel, its
                 pagination bullets and its Play/Pause control were never
                 rendered; what remained was this tinted band standing empty
                 beneath a heading promising student voices. The state occupies
                 the SAME `mt-10` wrapper so the band's rhythm is unchanged, sits
                 on `bg-white` because the band itself is already `bg-surface`,
                 and explains a different absence in different words from the
                 review-grid state above. */
              <EmptyState
                tone="neutral"
                headingAs="h3"
                className="bg-white"
                title="No featured learner stories yet"
                description="A story is featured here only when a learner agrees to share their experience, so there is nothing to swipe through at the moment. You can still explore the courses these stories would describe, or ask us what CIBLE learners work towards."
                action={
                  <>
                    <Button to="/courses" variant="primary">
                      Explore the courses
                    </Button>
                    <Button to="/contact" variant="outline">
                      Ask about outcomes
                    </Button>
                  </>
                }
              />
            )}
          </div>
        </Container>
      </section>

      {/* Admission call-to-action closing every page. */}
      <CTASection />
    </>
  )
}

export default SuccessStories
