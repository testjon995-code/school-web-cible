import Seo from '../components/seo/Seo.jsx'
import Container from '../components/ui/Container.jsx'
import SectionHeading from '../components/ui/SectionHeading.jsx'
import Button from '../components/ui/Button.jsx'
import CTASection from '../components/common/CTASection.jsx'

/**
 * NotFound — the 404 catch-all page for the CIBLE School of Language SPA.
 *
 * Rendered by the catch-all route in `src/App.jsx`
 * (`<Route path="*" element={<NotFound />} />`) inside the persistent
 * `<Layout>`, so it emits ONLY page content — the Navbar, Footer and floating
 * conversion widgets are supplied by the shell. It is lazy-loaded via
 * `const NotFound = lazy(() => import('./pages/NotFound.jsx'))` for route-level
 * code splitting, hence the required `export default`.
 *
 * SEO — a 404 response must never be indexed, so the page passes `noindex` to
 * the canonical {@link Seo} head component, which emits
 * `<meta name="robots" content="noindex, follow" />`: search engines skip
 * indexing the page while still following its recovery links below. `Seo` is
 * the SINGLE noindex mechanism in the codebase — no page module hand-rolls a
 * sibling head block for it, which also guarantees the robots tag is emitted
 * exactly ONCE, because the underlying head manager appends tags rather than
 * replacing them. It still deliberately supplies NO `canonical`: the catch-all
 * renders under ANY unmatched path, so it has no canonical URL of its own, and
 * `Seo` emits a canonical `<link>` and `og:url` only for a page that provides
 * one — never self-canonicalising every unknown URL to the homepage.
 *
 * Conversion-first UX — rather than a dead end, the page offers three
 * token-styled {@link Button}s that route (client-side, via react-router
 * `<Link>`) back to the highest-value destinations (Home, Courses, Admission)
 * and closes with the reusable admission {@link CTASection} that ends every
 * page of the site, keeping the visitor on a path toward enrollment.
 *
 * Accessibility (WCAG AA) — the large "404" is decorative display text (a
 * `<p>`, deliberately NOT a heading) so it never pollutes the outline; the page
 * exposes exactly one `<h1>` ("Page Not Found") rendered through
 * {@link SectionHeading} `as="h1"`, followed by the CTASection's `<h2>`. All
 * styling flows through Tailwind `@theme` tokens on the project's 8px spacing
 * scale — there are no hardcoded or arbitrary values.
 *
 * @returns {import('react').ReactElement} The rendered 404 page content.
 */
function NotFound() {
  return (
    <>
      <Seo
        title="Page Not Found"
        description="The page you are looking for could not be found. Explore CIBLE School of Language courses or apply for admission."
        noindex
      />

      <Container as="section" className="py-20 text-center md:py-28">
        <p className="text-6xl font-extrabold text-primary-600 md:text-7xl">404</p>
        <div className="mx-auto mt-6 max-w-xl">
          <SectionHeading
            as="h1"
            align="center"
            title="Page Not Found"
            subtitle="Sorry, the page you're looking for doesn't exist or may have moved. Let's get you back on track."
          />
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button to="/">Back to Home</Button>
          <Button variant="outline" to="/courses">Browse Courses</Button>
          <Button variant="secondary" to="/admission">Apply Now</Button>
        </div>
      </Container>

      <CTASection />
    </>
  )
}

export default NotFound
