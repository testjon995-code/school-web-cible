import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Seo from '../components/seo/Seo.jsx'
import StructuredData from '../components/seo/StructuredData.jsx'
import Container from '../components/ui/Container.jsx'
import SectionHeading from '../components/ui/SectionHeading.jsx'
import Breadcrumbs from '../components/ui/Breadcrumbs.jsx'
import Button from '../components/ui/Button.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import BlogCard from '../components/common/BlogCard.jsx'
import RepresentativeNote from '../components/common/RepresentativeNote.jsx'
import CTASection from '../components/common/CTASection.jsx'
import blog from '../data/blog.js'
import { prefersReducedMotion } from '../hooks/useScrollReveal.js'

/**
 * Blog — the CIBLE School of Language article listing (route `/blog`).
 *
 * Lazy-loaded by `src/App.jsx` inside the shared `<Layout>`
 * (`const Blog = lazy(() => import('./pages/Blog.jsx'))`,
 * `<Route path="blog" element={<Blog />} />`), so this component renders ONLY
 * the page's own content — the Navbar, Footer and floating conversion widgets
 * are supplied by the surrounding layout shell.
 *
 * Composition (reuse-first, zero duplication — every element is a shared
 * primitive, never hand-rolled markup):
 * - `<Seo>`            : per-page head. This is the blog LISTING (a collection),
 *                        not an individual article, so it uses the default
 *                        `og:type=website` — emitting `og:type=article` here
 *                        would misrepresent a listing as a single article (m04);
 *                        the title resolves to "Blog | CIBLE School of Language".
 * - `<StructuredData>` : emits BreadcrumbList JSON-LD from the same `crumbs`
 *                        trail rendered visibly by `<Breadcrumbs>`, keeping the
 *                        visible trail and structured data in agreement.
 * - `<Container as="section">` : the canonical width/gutter wrapper, rendered as
 *                        the correct semantic landmark.
 * - `<SectionHeading as="h1">` : the page's SINGLE `<h1>`. A visually-hidden
 *                        `<h2 class="sr-only">` ("Latest articles") precedes the
 *                        grid so each `BlogCard`'s `<h3>` title nests under an
 *                        `<h2>` (outline h1 -> h2 -> h3, no skipped level — QA
 *                        Issue 9).
 * - `<BlogCard>`       : one presentational preview card per post; each renders
 *                        its own semantic `<article>` with the post title as an
 *                        `<h3>`, and carries this page's per-article anchor (see
 *                        "Fragment anchors" below).
 * - `<EmptyState>`     : the shared unavailable-content state, rendered IN PLACE
 *                        OF the grid when no article is listed, so the region
 *                        never collapses into an empty container.
 * - `<CTASection>`     : the admission call-to-action that closes every page.
 *
 * Fragment anchors (`#post-<slug>`) — a PUBLIC CONTRACT:
 * Each card is rendered with `id={`post-${post.slug}`}` plus `tabIndex={-1}` so
 * an individual article can be addressed by URL fragment and can then take
 * programmatic focus. `src/lib/search.js` depends on exactly this form: its
 * `article` group emits `href: '/blog#post-<slug>'` (and plain `/blog`, with no
 * fragment, for a record that has no slug — which is why a slug-less record here
 * receives NO `id`, never the string `post-undefined`). Renaming the prefix or
 * the slug would silently break every global-search article result.
 *
 * Hash-aware reveal — why this page owns it, and why the order matters:
 * `<ScrollToTop>` in the layout shell is deliberately scoped to
 * pathname-change scroll-to-top and explicitly does NOT handle hash anchors or
 * scroll-to-element behaviour, and it fires a scroll to the top on EVERY
 * pathname change. Widening that shared component for one page would be the
 * wrong owner, so the destination page handles its own fragment: one effect,
 * keyed on `location.hash`, resolves the target by id and reveals it.
 * - The body runs inside a `requestAnimationFrame` so it lands AFTER the
 *   shell's own scroll (and after the layout's `#main` focus move) rather than
 *   racing them; the frame is cancelled on cleanup.
 * - Scroll FIRST, focus SECOND. A focus-only implementation — particularly with
 *   `preventScroll` — reveals nothing. `preventScroll` is used on the focus call
 *   only once `scrollIntoView` has been issued, so the focus call cannot cancel
 *   the smooth scroll that is already animating; when `scrollIntoView` is
 *   unavailable, a plain `focus()` does the revealing instead.
 * - `block: 'start'` is paired with a `scroll-mt-20` scroll margin on each
 *   anchored card so the revealed card clears the shell's 64px sticky header
 *   instead of landing underneath it (measured at 65px including its border).
 * - Reduced motion is honoured through the shared synchronous
 *   `prefersReducedMotion()` reader (instant `'auto'` jump instead of `'smooth'`).
 * - A fragment that matches nothing is ignored silently: no console noise, and
 *   the page renders normally at the top.
 *
 * The cards stay deliberately NON-INTERACTIVE. The frozen route table has no
 * per-article path, and `BlogCard`'s former "Read more" control linked back to
 * the very `/blog` listing the card already sat in — a self-referential dead end
 * removed as a prior QA fix. Do not re-add a link, button or `onClick`, and do
 * not render `post.content` here: `/blog/:slug` is explicitly out of scope, so
 * the unrendered article body is a recorded known limitation rather than a gap
 * to fill on this page.
 *
 * Data comes exclusively from `src/data/blog.js` (single source of truth) and is
 * treated as untrusted at the boundary: a non-array import and falsy entries are
 * normalised away, and an empty result renders the empty state. The page holds
 * no state of its own; its only hooks are `useLocation` (the fragment) and the
 * single `useEffect` above. Styling is 100% token-driven Tailwind on the
 * project's 8px spacing scale — no hardcoded values, no new token, no new
 * utility, so `src/index.css` carries no diff.
 *
 * @returns {import('react').ReactElement} The blog listing page.
 */

// Breadcrumb trail for this page. Module-local (never exported) and shared by
// both the visible <Breadcrumbs> and the BreadcrumbList JSON-LD via
// <StructuredData>. Shape is the shared { name, path } contract consumed by
// `Breadcrumbs` and `breadcrumbSchema` alike.
const crumbs = [
  { name: 'Home', path: '/' },
  { name: 'Blog', path: '/blog' },
]

// The article list, normalised once at module scope (the import is a static
// build-time ESM constant, so there is nothing to recompute per render).
// Module-local and never exported, exactly like `crumbs`, so this file keeps
// `Blog` as its only export (`react/only-export-components`).
//
// The import is treated as UNTRUSTED at this boundary, mirroring the shared FAQ
// component: a non-array value coerces to `[]` and falsy holes are dropped, so a
// malformed data module degrades to the empty state below instead of throwing on
// `.map` or rendering gaps. `BlogCard`'s own `if (!post) return null` guard stays
// as the second layer for any non-falsy but unusable entry.
const articles = Array.isArray(blog) ? blog.filter(Boolean) : []

function Blog() {
  // The fragment that addresses a single article (`#post-<slug>`). `useLocation`
  // is called unconditionally at the top level of the component body, per the
  // Rules of Hooks (oxlint `react/rules-of-hooks` is an error here), and only
  // `hash` is destructured so the effect below depends on a primitive that
  // changes exactly when the fragment does.
  const { hash } = useLocation()

  useEffect(() => {
    // Strip the leading '#'. An absent or bare-'#' fragment is a no-op: there is
    // nothing to reveal, and the shell's <ScrollToTop> has already placed the
    // page at the top, which is the correct landing position.
    const targetId = typeof hash === 'string' && hash.startsWith('#') ? hash.slice(1) : ''
    if (!targetId) return undefined

    // Defensive environment guard in the style <ScrollToTop> already uses: at
    // runtime in this browser-only SPA both globals always exist, so this only
    // keeps the module safe if it is ever evaluated outside a browser.
    if (typeof window === 'undefined' || typeof document === 'undefined') return undefined

    // Deferred by one frame so this reveal lands AFTER <ScrollToTop>'s
    // pathname-change scroll to the top and after <Layout>'s `#main` focus move
    // — both of which run as commit-phase effects — instead of racing them.
    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById(targetId)
      // A fragment that matches no card is ignored silently: the page simply
      // renders at the top. No console noise, no thrown error.
      if (!target) return

      const canScroll = typeof target.scrollIntoView === 'function'
      if (canScroll) {
        target.scrollIntoView({
          block: 'start',
          behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        })
      }
      if (typeof target.focus === 'function') {
        // Scroll first, focus second. `preventScroll` is safe — and necessary —
        // only because the scroll above has already been issued: without it the
        // focus call performs its own instant scroll and cancels the smooth
        // animation. With no `scrollIntoView` available, plain `focus()` is what
        // brings the card into view.
        target.focus(canScroll ? { preventScroll: true } : undefined)
      }
    })

    return () => window.cancelAnimationFrame(frame)
  }, [hash])

  return (
    <>
      <Seo
        title="Blog"
        canonical="/blog"
        description="Read the CIBLE School of Language blog — tips on spoken English, exam preparation, personality development, computer skills and career guidance for students in Bihar."
      />
      <StructuredData breadcrumbs={crumbs} />

      {/* Page header */}
      <Container as="section" className="py-12 md:py-16">
        <Breadcrumbs items={crumbs} className="mb-6" />
        <SectionHeading
          as="h1"
          align="left"
          eyebrow="Insights & Tips"
          title="CIBLE Blog"
          subtitle="Guidance on English, exams, personality and careers from the CIBLE teaching team."
        />
      </Container>

      {/* Blog grid */}
      <Container as="section" className="pb-16 md:pb-20">
        {/* Visually-hidden section heading so each BlogCard's <h3> title nests
            under an <h2>, keeping the outline h1 -> h2 -> h3 with no skipped
            level for assistive tech (QA Issue 9). */}
        <h2 className="sr-only">Latest articles</h2>
        {articles.length > 0 ? (
          <>
            <RepresentativeNote className="mb-8">
              These articles are representative sample content written for
              demonstration and are not verified publications. They will be replaced
              with the institute's own posts before launch.
            </RepresentativeNote>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {articles.map((post) => (
                // `id` / `tabIndex` are forwarded by BlogCard onto its Card root
                // (the semantic <article>), so the anchor needs no wrapper
                // element and the grid layout is untouched. A record with no
                // slug gets NEITHER: `undefined` keeps the attributes off the
                // element entirely, so `#post-undefined` can never exist and a
                // non-addressable card never becomes a focus stop.
                //
                // `scroll-mt-20` (5rem = 80px, a plain step on the project's
                // spacing scale — no new token, no arbitrary value) is what makes
                // `block: 'start'` land the card BELOW the shell's sticky header
                // rather than behind it: the header is `sticky top-0 z-50` over a
                // 64px (`h-16`) bar, so without a scroll margin the revealed
                // card's top edge sits at viewport y=0 and its first 65px are
                // covered. It is applied only to cards that are scroll targets,
                // and scroll-margin has no effect outside a scroll-into-view, so
                // the rendered appearance is byte-for-byte unchanged.
                <BlogCard
                  key={post.slug}
                  post={post}
                  id={post.slug ? `post-${post.slug}` : undefined}
                  tabIndex={post.slug ? -1 : undefined}
                  className={post.slug ? 'scroll-mt-20' : undefined}
                />
              ))}
            </div>
          </>
        ) : (
          // The <RepresentativeNote> is deliberately NOT rendered in this branch:
          // its copy describes "these articles" shown on this page, which would be
          // untrue when none are listed. Do not restore it here.
          <EmptyState
            tone="neutral"
            // Explicit h3 keeps the outline h1 -> h2 (the sr-only heading above)
            // -> h3, exactly as the BlogCard titles it replaces.
            headingAs="h3"
            title="No articles published yet"
            // Answers WHAT HAPPENED and WHAT TO DO NEXT, per the project's
            // empty-state rule. Kept on one line because a multi-line JSX string
            // attribute would carry its own newlines and indentation into the DOM.
            description="No articles have been published to the CIBLE blog yet, so there is nothing to read on this page for now. New posts will appear here as the teaching team publishes them — in the meantime you can browse the course catalogue or ask the team a question directly."
            action={
              <>
                <Button to="/courses" variant="primary">
                  Browse courses
                </Button>
                <Button to="/contact" variant="outline">
                  Contact us
                </Button>
              </>
            }
          />
        )}
      </Container>

      <CTASection />
    </>
  )
}

export default Blog
