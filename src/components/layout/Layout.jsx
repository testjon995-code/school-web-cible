import { Suspense, useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Navbar from './Navbar.jsx'
import Footer from './Footer.jsx'
import ScrollToTop from './ScrollToTop.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'
import FloatingWhatsApp from '../cta/FloatingWhatsApp.jsx'
import FloatingCall from '../cta/FloatingCall.jsx'
import StickyBottomCTA from '../cta/StickyBottomCTA.jsx'
import Spinner from '../ui/Spinner.jsx'

// The FAB pair is parked only for content that is interactive or whose
// legibility is specifically protected by the QA contract. Broadly treating
// every paragraph/image as an exclusion target would hide the mobile conversion
// affordance for most of a page; this focused selector prevents tap theft while
// keeping the actions present whenever their fixed footprints are genuinely free.
const FLOATING_ACTION_COLLISION_SELECTOR = [
  'main a[href]',
  'main button',
  'main input',
  'main textarea',
  'main select',
  'main summary',
  'main iframe',
  'main label',
  'main [role="button"]',
  'main [role="link"]',
  'main [contenteditable="true"]',
  'main h3',
  'main [data-floating-actions-exclusion] h2',
  'main [data-floating-actions-exclusion] p',
  'footer a[href]',
  'footer button',
  'footer input',
  'footer textarea',
  'footer select',
  'footer summary',
  'footer iframe',
  'footer label',
  'footer [role="button"]',
  'footer [role="link"]',
  'footer h2',
  'footer h3',
  'footer p',
  'footer li',
].join(', ')

const FLOATING_ACTION_REVEAL_DELAY_MS = 160
const FLOATING_ACTION_SETTLE_RECHECK_MS = 250

function rectsOverlap(first, second) {
  return (
    Math.min(first.right, second.right) > Math.max(first.left, second.left) &&
    Math.min(first.bottom, second.bottom) > Math.max(first.top, second.top)
  )
}

/**
 * Layout — the single persistent application shell for the CIBLE School of
 * Language SPA (AAP §0.6.1 Group 5 / §0.6.3 "Layout shell"). It hosts ALL 17
 * pages plus the 404 view: `src/App.jsx` mounts it as the element of a parent
 * route (`<Route element={<Layout/>}>…children…</Route>`), so this component
 * renders a React Router `<Outlet/>` where the active page appears.
 *
 * Responsibilities:
 *   • Provides the semantic page landmarks — exactly one `<header>`, one
 *     `<main>` and one `<footer>` at this level (Navbar's root is `<nav>` and
 *     Footer's root is a `<div>`, so no landmark is nested/duplicated).
 *   • Renders a working skip-to-content link as the FIRST focusable element.
 *   • Owns the sticky navigation header and the footer.
 *   • Groups the conversion widgets — FloatingWhatsApp, FloatingCall and the
 *     mobile StickyBottomCTA — inside a single labelled complementary `<aside>`
 *     landmark, mounted on every route so Call & WhatsApp stay prominent.
 *   • Parks the duplicate floating pair only while one of their fixed footprints
 *     would cover an interactive control or protected CTA/footer copy. The mobile
 *     StickyBottomCTA and the in-flow page actions remain available throughout.
 *   • Restores scroll to the top on every client-side navigation via
 *     `<ScrollToTop/>` (which renders `null`).
 *   • Manages route-change focus: moves keyboard focus into `<main>` and
 *     announces the new page title through a polite live region on navigation.
 *
 * This is the conversion backbone of the site — the shell that guarantees the
 * primary admissions intents (Call / WhatsApp / Admission) stay available as a
 * visitor moves between pages without letting a fixed overlay steal another
 * control's pointer target.
 *
 * Reuse-first composition (AAP rule: never duplicate components): Layout does
 * NOT re-implement navigation, footer or the widgets — it composes the existing
 * canonical sibling components, each a self-contained default export that reads
 * its own content from `src/data/*`. Layout takes NO props; its local state is
 * limited to route-change focus/announcement bookkeeping and the shared FAB
 * collision flag below. All hooks are declared unconditionally at the top level
 * (oxlint `react/rules-of-hooks`).
 *
 * Route-change focus & announcement (WCAG 2.4.3 Focus Order / 4.1.3 Status
 * Messages): React Router swaps the routed content without moving focus, so a
 * keyboard user would be left on the now-removed link (desktop) or returned to
 * the hamburger (mobile drawer), and a screen-reader user would get no signal
 * that the page changed — restoring scroll alone is not enough. On each pathname
 * change (after the initial render) this component therefore focuses the
 * `<main>` region — which carries `tabIndex={-1}` and a visible
 * `#main:focus-visible` indicator (src/index.css) — using `preventScroll` so it
 * cooperates with `<ScrollToTop/>`, and mirrors the new `document.title` into a
 * visually-hidden `aria-live="polite"` region so the new page context is both
 * focused and announced. The existing skip-link behaviour (Enter → focus
 * `<main>`) is preserved and now shares the same visible focus indicator.
 *
 * Sticky header + stacking coordination (IMPORTANT — do not relocate):
 *   • The sticky positioning lives HERE on `<header className="sticky top-0
 *     z-50">`, NOT on Navbar's `<nav>`. A `sticky` element only travels within
 *     its own parent's box; the header's parent is this full-height flex column,
 *     so the header is what actually pins to the top of the scroll container.
 *   • `z-50` is REQUIRED. The header establishes a stacking context, and
 *     Navbar's mobile drawer (rendered inside it as `fixed inset-0 z-50`) must
 *     paint ABOVE the `z-40` floating/sticky conversion widgets. The widgets'
 *     wrapping `<aside>` is statically positioned and creates NO stacking
 *     context, so the widgets keep competing at their own `z-40`; with header
 *     `z-50` > widgets `z-40`, the drawer overlays everything without a portal.
 *
 * Sticky footer behaviour: the root is a `flex min-h-screen flex-col` column and
 * `<main>` carries `flex-1`, so `main` grows to absorb spare height and the
 * footer sinks to the bottom of the viewport on short pages (e.g. the 404 view)
 * instead of floating mid-screen.
 *
 * Fixed-widget clearance & safe area: the root also carries
 * `shell-bottom-clearance` (src/index.css), which reserves
 * `calc(--cta-sticky-height + safe-area-inset-bottom)` of bottom padding on
 * mobile so the fixed StickyBottomCTA bar and a device home-indicator overlay
 * empty space rather than the footer's last actions; the clearance is dropped at
 * `lg`, where the bar is hidden. The offset comes from a SHARED design variable
 * so the shell and the bar stay in lock-step (no per-widget magic numbers).
 *
 * Floating-action collision guard: a single requestAnimationFrame-throttled,
 * passive scroll/resize check compares the two unchanged 56×56 FAB rectangles
 * with visible semantic targets in `<main>` / `<footer>`. ResizeObserver and
 * child-list MutationObserver hooks on those landmarks run the same check
 * synchronously when a lazy route or dynamic form content arrives without a
 * viewport event, so the wrapper is parked before that new content is painted.
 * On collision, the shared STATIC wrapper receives `visibility:hidden` +
 * `pointer-events:none`; this preserves the exact fixed geometry for responsive
 * validation, creates no stacking context, causes no layout shift, and lets
 * pointer hit-testing reach the underlying control. The wrapper is never parked
 * while it contains focus, and `aria-hidden` mirrors the painted state for
 * assistive technology. A short clear-state delay prevents edge flicker;
 * parking itself is immediate and uses no transform/transition, so
 * reduced-motion behavior is unchanged.
 *
 * In-shell Suspense + error boundary: `src/App.jsx` wraps the routes in an outer
 * Suspense boundary; this inner boundary around `<Outlet/>` gives a smooth
 * in-shell fallback (the nav + footer stay visible) while a lazy page chunk
 * resolves. The fallback centres the canonical `Spinner` in a `min-h-screen`
 * box (a native token utility — no arbitrary values) so it reads as a page-level
 * loader rather than a tiny glyph. The `<Outlet/>` is additionally wrapped in an
 * `ErrorBoundary` keyed by pathname (M18), so a rejected/stale page chunk or a
 * page render error surfaces an accessible recovery UI inside the shell and
 * resets on the next navigation.
 *
 * Committed-route binding (m01): `src/App.jsx` drives a controlled
 * `<Routes location={displayLocation}>`, so `useLocation()` here returns the
 * location currently COMMITTED to the screen. The route-change focus move, the
 * polite title announcement and `<ScrollToTop/>` therefore fire when the new
 * page actually renders — never mid-transition while the previous page is still
 * visible.
 *
 * Accessibility (WCAG AA):
 *   • The `.skip-link` (global class from src/index.css — hidden off-screen
 *     until focused) is the first focusable element; its `href="#main"` matches
 *     `<main id="main">`, satisfying the bypass-blocks requirement (SC 2.4.1).
 *   • `<main>` carries `id="main"` + `tabIndex={-1}` so both the skip link and
 *     the route-change effect can move focus into the content region; a visible
 *     keyboard-focus indicator is provided by the tokenized `#main:focus-visible`
 *     rule (SC 2.4.7) — individual controls keep their global `:focus-visible`
 *     rings.
 *   • The conversion widgets live in a labelled complementary `<aside>` so no
 *     interactive content sits outside a landmark (axe "region").
 *   • Tab order is skip-link → nav → main content → footer → visible widgets.
 *     Parked FABs are hidden from pointer, keyboard and AT traversal; the guard
 *     never removes a FAB that already owns focus. The mobile drawer (inside
 *     Navbar) traps focus while open and restores it on close.
 *
 * Styling is entirely token-driven (Tailwind v4 `@theme` tokens from
 * src/index.css) on the project's 8px spacing scale — `bg-background` /
 * `text-foreground` resolve to design tokens, and every other value is a native
 * utility or a shared design-system class (`shell-bottom-clearance`); there are
 * no hardcoded or arbitrary (`[..]`) utility values.
 *
 * @returns {import('react').ReactElement} The persistent shell wrapping the
 *   routed page `<Outlet/>`, the navigation/footer landmarks and the labelled
 *   conversion-widget aside.
 */
function Layout() {
  // Route-change focus/announcement bookkeeping. All hooks are declared
  // unconditionally at the top level (oxlint `react/rules-of-hooks`). `pathname`
  // is the only reactive input; the refs are stable handles to the <main>
  // landmark, the polite live region, and the previously-seen pathname.
  const { pathname } = useLocation()
  const mainRef = useRef(null)
  const footerRef = useRef(null)
  const announcerRef = useRef(null)
  const previousPathnameRef = useRef(pathname)
  const floatingActionsRef = useRef(null)
  const floatingActionsParkedRef = useRef(false)
  const [floatingActionsParked, setFloatingActionsParked] = useState(false)

  useEffect(() => {
    // No-op on the initial render (and on React StrictMode's dev remount, where
    // the pathname is unchanged) so arriving at the site never pulls focus past
    // the skip link / nav. Act only once the pathname actually changes.
    if (previousPathnameRef.current === pathname) return
    previousPathnameRef.current = pathname

    // Move keyboard focus into the newly-rendered page's <main> region so
    // keyboard and screen-reader users land in the new content instead of being
    // left on the now-removed link (desktop) or bounced to the hamburger (mobile
    // drawer). `preventScroll` keeps this from fighting <ScrollToTop/>'s scroll
    // restoration; the visible indicator is the tokenized #main:focus-visible
    // rule in src/index.css.
    const main = mainRef.current
    if (main) main.focus({ preventScroll: true })

    // Announce the new page politely. The active page's <Seo> (react-helmet-async)
    // writes document.title in its own effect; a requestAnimationFrame lets that
    // settle before we mirror it into the live region, so assistive technology
    // hears the new page name. The frame is cancelled on cleanup.
    const frame = window.requestAnimationFrame(() => {
      const announcer = announcerRef.current
      if (announcer) announcer.textContent = document.title
    })
    return () => window.cancelAnimationFrame(frame)
  }, [pathname])

  useEffect(() => {
    const wrapper = floatingActionsRef.current
    if (!wrapper) return

    let frameId = 0
    let revealTimerId = 0
    let settleTimerId = 0

    const updateParking = (nextParked) => {
      if (floatingActionsParkedRef.current === nextParked) return
      floatingActionsParkedRef.current = nextParked

      // Apply the accessibility/paint state synchronously before asking React to
      // reconcile it. MutationObserver runs between the lazy route's DOM commit
      // and the next paint; toggling the classes here closes the otherwise
      // possible one-frame window in which newly inserted content could appear
      // beneath still-active FABs.
      wrapper.classList.toggle('invisible', nextParked)
      wrapper.classList.toggle('pointer-events-none', nextParked)
      wrapper.dataset.floatingActionsParked = nextParked ? 'true' : 'false'
      if (nextParked) {
        wrapper.setAttribute('aria-hidden', 'true')
      } else {
        wrapper.removeAttribute('aria-hidden')
      }

      setFloatingActionsParked(nextParked)
    }

    const clearRevealTimer = () => {
      if (!revealTimerId) return
      window.clearTimeout(revealTimerId)
      revealTimerId = 0
    }

    const evaluateCollisions = () => {
      frameId = 0

      const fabRects = Array.from(wrapper.querySelectorAll('a')).map((anchor) =>
        anchor.getBoundingClientRect()
      )

      // Both FABs remain mounted even while the wrapper is invisible, so their
      // fixed rectangles stay measurable. If composition changes unexpectedly,
      // fail open rather than suppressing unrelated controls.
      if (fabRects.length !== 2 || fabRects.some((rect) => rect.width === 0 || rect.height === 0)) {
        clearRevealTimer()
        updateParking(false)
        return
      }

      // Never hide a control that currently owns keyboard focus. Once focus
      // leaves, focusout schedules another collision check and parking can apply.
      const focusInside = wrapper.contains(document.activeElement)
      let collision = false

      if (!focusInside) {
        const targets = document.querySelectorAll(FLOATING_ACTION_COLLISION_SELECTOR)

        for (const target of targets) {
          const targetRect = target.getBoundingClientRect()
          if (
            targetRect.width === 0 ||
            targetRect.height === 0 ||
            !fabRects.some((fabRect) => rectsOverlap(fabRect, targetRect))
          ) {
            continue
          }

          const style = window.getComputedStyle(target)
          if (
            style.display === 'none' ||
            style.visibility === 'hidden' ||
            Number.parseFloat(style.opacity) === 0 ||
            target.getAttribute('aria-hidden') === 'true'
          ) {
            continue
          }

          collision = true
          break
        }
      }

      if (collision) {
        clearRevealTimer()
        updateParking(true)
        return
      }

      if (floatingActionsParkedRef.current && !revealTimerId) {
        revealTimerId = window.setTimeout(() => {
          revealTimerId = 0
          updateParking(false)
        }, FLOATING_ACTION_REVEAL_DELAY_MS)
      }
    }

    const scheduleFrame = () => {
      if (!frameId) frameId = window.requestAnimationFrame(evaluateCollisions)
    }

    const evaluateImmediately = () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId)
        frameId = 0
      }
      evaluateCollisions()
    }

    const handleViewportChange = () => {
      scheduleFrame()
      if (settleTimerId) window.clearTimeout(settleTimerId)
      // Re-check after scroll-reveal/layout transitions settle so the decision
      // reflects the final painted rectangles, not an intermediate transform.
      settleTimerId = window.setTimeout(scheduleFrame, FLOATING_ACTION_SETTLE_RECHECK_MS)
    }

    handleViewportChange()
    window.addEventListener('scroll', handleViewportChange, { passive: true })
    window.addEventListener('resize', handleViewportChange, { passive: true })
    wrapper.addEventListener('focusin', scheduleFrame)
    wrapper.addEventListener('focusout', scheduleFrame)

    const observedLandmarks = [mainRef.current, footerRef.current].filter(Boolean)
    const handleLandmarkChange = () => {
      evaluateImmediately()
      if (settleTimerId) window.clearTimeout(settleTimerId)
      settleTimerId = window.setTimeout(scheduleFrame, FLOATING_ACTION_SETTLE_RECHECK_MS)
    }
    const resizeObserver =
      typeof window.ResizeObserver === 'function'
        ? new window.ResizeObserver(handleLandmarkChange)
        : null
    const mutationObserver =
      typeof window.MutationObserver === 'function'
        ? new window.MutationObserver(handleLandmarkChange)
        : null

    for (const landmark of observedLandmarks) {
      resizeObserver?.observe(landmark)
      mutationObserver?.observe(landmark, { childList: true, subtree: true })
    }

    return () => {
      if (frameId) window.cancelAnimationFrame(frameId)
      clearRevealTimer()
      if (settleTimerId) window.clearTimeout(settleTimerId)
      resizeObserver?.disconnect()
      mutationObserver?.disconnect()
      window.removeEventListener('scroll', handleViewportChange)
      window.removeEventListener('resize', handleViewportChange)
      wrapper.removeEventListener('focusin', scheduleFrame)
      wrapper.removeEventListener('focusout', scheduleFrame)
    }
  }, [pathname])

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground shell-bottom-clearance">
      {/* Route-change scroll restoration; renders null, so placement is free. */}
      <ScrollToTop />

      {/* Bypass-blocks: first focusable element, visible on focus, targets #main. */}
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      {/* Layout owns the sticky positioning + z-50 stacking (see JSDoc). */}
      <header className="sticky top-0 z-50">
        <Navbar />
      </header>

      {/* flex-1 lets main grow so the footer sinks to the bottom on short pages.
          id/tabIndex are the skip-link + route-change focus target; the visible
          indicator is the tokenized #main:focus-visible rule in src/index.css. */}
      <main id="main" ref={mainRef} tabIndex={-1} className="flex-1">
        {/* Polite route announcer: mirrors the new document.title on navigation.
            Visually hidden and kept INSIDE the <main> landmark so it introduces
            no content outside a landmark (axe "region"). */}
        <div ref={announcerRef} aria-live="polite" aria-atomic="true" className="sr-only" />

        <Suspense
          fallback={
            <div className="flex min-h-screen items-center justify-center">
              <Spinner size="lg" />
            </div>
          }
        >
          {/* Route render-error safety net (M18): a rejected/stale page chunk
              (after `lazyWithRetry` exhausts its retry + one-time reload) or a
              runtime error thrown while a page renders is caught HERE — inside
              the shell — so Navbar, Footer and the conversion widgets stay
              mounted and the visitor can recover or navigate away. Keyed by the
              committed `pathname`, so the boundary resets on every navigation
              and leaving a broken route automatically clears the error. */}
          <ErrorBoundary key={pathname}>
            <Outlet />
          </ErrorBoundary>
        </Suspense>
      </main>

      {/* Layout owns the contentinfo landmark; Footer's own root is a <div>. */}
      <footer ref={footerRef}>
        <Footer />
      </footer>

      {/* Conversion widgets grouped in one labelled complementary landmark.
          The FAB wrapper remains static (no transform/filter/z-index), so it
          creates no stacking context: both anchors stay self-positioned at z-40
          and the mobile drawer at z-50 still paints above them. When either FAB
          would cover a protected target, the wrapper becomes invisible and
          pointer-transparent while retaining its measurable fixed geometry.
          StickyBottomCTA is outside that wrapper and remains available below lg. */}
      <aside aria-label="Quick contact actions">
        <div
          ref={floatingActionsRef}
          className={floatingActionsParked ? 'invisible pointer-events-none' : undefined}
          aria-hidden={floatingActionsParked ? 'true' : undefined}
          data-floating-actions-parked={floatingActionsParked ? 'true' : 'false'}
        >
          <FloatingWhatsApp />
          <FloatingCall />
        </div>
        <StickyBottomCTA />
      </aside>
    </div>
  )
}

export default Layout
