import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, Link } from 'react-router-dom'
import { FaBars, FaTimes, FaPhoneAlt } from 'react-icons/fa'
import Container from '../ui/Container.jsx'
import Button from '../ui/Button.jsx'
import { cn } from '../../lib/cn.js'
import { primaryNav } from '../../data/navigation.js'
import siteConfig from '../../data/siteConfig.js'
import logo from '../../assets/logo.svg'

/**
 * Navbar — the site-wide primary navigation bar for the CIBLE School of Language
 * SPA. It is rendered inside the sticky `<header>` owned by
 * `src/components/layout/Layout.jsx` and appears above every route.
 *
 * Conversion-first: alongside the navigation links it surfaces a persistent
 * "Admission" call-to-action (the shared polymorphic `Button` routing to
 * `/admission`) and a click-to-call action (`siteConfig.phoneHref`), keeping
 * the primary admissions intents reachable from every page. All brand, link and
 * contact content is read from `src/data/*` — nothing is hardcoded here.
 *
 * Responsive behaviour (mobile-first, native Tailwind breakpoints):
 *   • `< md`  — brand + Admission CTA + hamburger (call text hidden to save room)
 *   • `md`    — the inline click-to-call action appears
 *   • `>= lg` — the full link row appears and the hamburger is hidden
 * The `< lg` experience opens a right-anchored slide-in drawer that repeats the
 * links, the call action and the Admission CTA. A `matchMedia` listener closes
 * the drawer if the viewport reaches the `lg` breakpoint while it is open, which
 * is what releases the body scroll-lock; without it the drawer would hide with
 * the breakpoint but leave scrolling locked on desktop.
 *
 * Landmark, sticky & stacking coordination (IMPORTANT):
 *   • Layout owns the sticky `<header>` (`sticky top-0 z-50`); the visual bar
 *     here is a `<nav aria-label="Primary">` and MUST NOT add its own
 *     `<header>` or any `sticky`/`top-0` — a sticky element only travels within
 *     its parent's box, so the header (child of the full-height flex column) is
 *     what actually pins.
 *   • The mobile drawer is rendered through a React portal into `document.body`
 *     (see the render below). Two independent properties depend on this:
 *     (1) it escapes the bar's `backdrop-blur` — per the CSS spec any ancestor
 *     with a non-`none` `backdrop-filter`/`filter`/`transform` becomes the
 *     containing block for `position: fixed` descendants, so an in-tree drawer's
 *     `fixed inset-0` would resolve against the ~64px bar box and collapse to a
 *     top strip; portalled to `body` it fills the viewport. (2) it lives OUTSIDE
 *     the `#root` application subtree, which is what lets the open drawer mark
 *     `#root` `inert` (see the effect) without disabling itself. (Do NOT move
 *     the drawer back inside `<nav>` / `#root`.)
 *   • At `body` level the `fixed inset-0 z-50` drawer paints above the
 *     root-level `z-40` floating widgets / sticky bottom bar.
 *
 * Scroll-aware elevation (IMPORTANT — non-layout properties only):
 *   • Past `SCROLL_ELEVATION_THRESHOLD_PX` of page scroll the bar lifts off the
 *     page with the brand `shadow-md` token; at rest it stays flat
 *     (`shadow-none`). That is the whole visual contract — it reuses the
 *     existing card elevation vocabulary rather than inventing a new one.
 *   • ONLY the box-shadow changes. The 1px hairline border is declared in the
 *     BASE class list, so it is present and identical in BOTH states, and
 *     nothing here touches height, padding, `position`, `top` or font size. The
 *     bar's height is therefore the same at every scroll offset, which is what
 *     makes this feature incapable of regressing CLS. Do NOT grow it into a
 *     shrinking or height-animating header, and do NOT drop or widen the border
 *     in either state — each of those would move the height.
 *   • The subscription lives in its OWN effect. It must not be folded into the
 *     drawer effect below, which early-returns while the drawer is closed and
 *     so would never run in the common case.
 *   • The listener is `passive` (it never calls `preventDefault`, so scrolling
 *     stays on the compositor) and coalesced through `requestAnimationFrame`,
 *     and the setter is crossing-guarded, so a long scroll commits no re-render
 *     until the threshold is actually crossed — the INP half of the same Core
 *     Web Vitals budget. Cleanup removes the listener AND cancels any frame
 *     still booked.
 *   • Reduced-motion users need nothing extra here: the global
 *     `prefers-reduced-motion` block in src/index.css already neutralises every
 *     `transition-duration` to 0.01ms, so the state still applies instantly
 *     while the fade does not play. No JS preference read is duplicated.
 *
 * Accessibility (WCAG AA):
 *   • Semantic `<nav aria-label="Primary">`; the drawer is a nested
 *     `<nav aria-label="Mobile">` inside a `role="dialog" aria-modal="true"`
 *     container labelled "Site menu".
 *   • The hamburger exposes `aria-label`, `aria-expanded` and
 *     `aria-controls="mobile-nav"` (matching the drawer `id`).
 *   • While the drawer is open, focus moves in, is trapped (Tab / Shift+Tab
 *     wrap), Esc closes it, and focus returns to the hamburger on close — except
 *     on the resize-to-`lg` auto-close, where the hamburger has itself become
 *     `lg:hidden` and so cannot take focus; focus then lands on the `<main>`
 *     landmark instead of falling to `<body>`. The
 *     rest of the application (`#root`) is marked `inert` meanwhile, so every
 *     background focusable is removed from BOTH the tab order and the
 *     accessibility tree — defence in depth alongside the manual Tab trap. The
 *     prior body `overflow` is captured and restored, so scroll is locked only
 *     for the drawer's lifetime.
 *   • Active route is signalled on TWO independent channels, never colour alone
 *     (WCAG 1.4.1 Use of Color): a persistent underline — the same shape cue
 *     `Button`'s `tertiary` variant uses to lower emphasis — plus the deeper
 *     primary text token, with `NavLink` emitting `aria-current="page"` for
 *     assistive technology on top of both. Text decoration is paint-only, so the
 *     indicator adds no height to the 44px link box (see the scroll-aware note
 *     above for why that matters). The underline is unprefixed rather than a
 *     `hover:` treatment — a cue that only appears on hover is unavailable to
 *     touch and keyboard users, and would read as "active" on the wrong link.
 *     `end` on the Home link keeps `/` active only on the exact index.
 *   • Icons are decorative (`aria-hidden`); every control carries text or an
 *     `aria-label`. The global `:focus-visible` ring (src/index.css) is left
 *     intact for keyboard users.
 *   • Every interactive control meets the 44×44px touch-target guideline: the
 *     icon-only hamburger and drawer Close controls via `min-h-11 min-w-11`, and
 *     the text nav links + the click-to-call action via `min-h-11` with content
 *     vertically centred (`inline-flex items-center`), all on the 8px scale.
 *
 * Styling is entirely token-driven (Tailwind v4 `@theme` tokens from
 * src/index.css) on the 8px spacing scale — every colour, radius, spacing and
 * shadow resolves to a design token/utility, with no hardcoded or arbitrary
 * `[..]` values.
 *
 * @param {object} [props]
 * @param {string} [props.className] Extra classes merged LAST via {@link cn}
 *   onto the root `<nav>` (Layout renders this component with none).
 * @returns {import('react').ReactElement} The primary navigation bar.
 */

// Page-scroll offset (px) at which the bar switches to its elevated state. Kept
// deliberately small — the base step of the project's 8px scale — so the shadow
// appears as soon as content begins to travel underneath the bar rather than
// after a perceptible lag.
const SCROLL_ELEVATION_THRESHOLD_PX = 8

// Active-link class builder shared by the desktop and mobile `NavLink`s. React
// Router calls it with `{ isActive }`.
//
// The underline is the NON-COLOUR half of the active signal (WCAG 1.4.1): colour
// alone must not carry state, so the active route also differs in shape. The
// underline and its thickness are paint-only properties — they add no content
// height, so the 44px target and the bar's constant height are untouched. The
// inactive branch states the other side of the pair explicitly, so the two states
// are guaranteed to differ in the decoration channel regardless of any inherited
// `text-decoration`. Do not move the underline behind `hover:` (see the JSDoc)
// and do not add height, padding or leading utilities here.
const navLinkClass = ({ isActive }) =>
  cn(
    'inline-flex min-h-11 items-center rounded-md px-2 text-sm font-medium transition-colors',
    isActive
      ? 'text-primary-700 underline decoration-2 underline-offset-4'
      : 'text-foreground no-underline hover:text-primary-600'
  )

function Navbar({ className }) {
  // The refs let the drawer effect trap focus inside the drawer and restore it to
  // the hamburger on close.
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const drawerRef = useRef(null)
  const toggleRef = useRef(null)

  // Drawer behaviour, wired only while `open`: initial focus, Esc-to-close, a
  // Tab focus trap, body scroll lock, and — on cleanup — listener removal,
  // scroll restore and focus return to the hamburger.
  useEffect(() => {
    if (!open) return

    // Capture the ref nodes at effect run time. `toggle` is used in cleanup to
    // restore focus; copying it into a local avoids reading a possibly-changed
    // `ref.current` inside the cleanup closure (react-hooks/exhaustive-deps).
    const node = drawerRef.current
    const toggle = toggleRef.current
    // The application root, made `inert` while the drawer is open so every
    // background control drops out of the tab order AND the accessibility tree.
    // The drawer is portalled into `document.body` — OUTSIDE `#root` — so
    // inerting the root never disables the drawer itself.
    const rootEl = document.getElementById('root')
    const focusables = node
      ? node.querySelectorAll('a[href], button:not([disabled])')
      : []
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    if (first) first.focus()

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false)
        return
      }
      if (event.key === 'Tab' && focusables.length > 0) {
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', onKeyDown)
    // Capture the prior inline overflow so it is faithfully restored on close
    // instead of being blindly cleared to '' — the drawer locks scroll only for
    // its own lifetime.
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    if (rootEl) rootEl.inert = true

    // Auto-close the drawer when the viewport reaches the `lg` breakpoint (Tailwind
    // default 64rem) — the width at which both the hamburger and the drawer are
    // hidden. Resizing mobile → desktop while the drawer is open would otherwise
    // hide it visually but leave `open === true`, so this effect would hold the
    // body scroll-lock and the desktop page could not be scrolled. Setting `open`
    // to false unmounts the drawer and runs the cleanup below, which restores
    // `document.body.style.overflow`. The listener supports the modern
    // `addEventListener` API with the legacy `addListener` fallback.
    const desktopQuery = window.matchMedia('(min-width: 64rem)')
    const onViewportChange = (event) => {
      if (event.matches) setOpen(false)
    }
    if (desktopQuery.matches) {
      setOpen(false)
    }
    if (typeof desktopQuery.addEventListener === 'function') {
      desktopQuery.addEventListener('change', onViewportChange)
    } else {
      desktopQuery.addListener(onViewportChange)
    }

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prevOverflow
      if (typeof desktopQuery.removeEventListener === 'function') {
        desktopQuery.removeEventListener('change', onViewportChange)
      } else {
        desktopQuery.removeListener(onViewportChange)
      }
      // Clear inert BEFORE restoring focus: the hamburger lives inside `#root`,
      // and focusing an element inside an inert subtree is a no-op.
      if (rootEl) rootEl.inert = false
      if (toggle) toggle.focus()
      // Fallback for the one close path where the line above cannot land: the
      // viewport-grew-to-`lg` auto-close handled by the matchMedia listener above.
      // The hamburger is `lg:hidden`, so by the time this cleanup runs it is
      // already `display: none` and `.focus()` on it is a silent no-op — focus
      // would drop to <body>, restarting the tab order at the skip link and losing
      // the reader's place (WCAG 2.4.3 Focus Order). `<main>` carries
      // `tabindex="-1"` — Layout declares it for exactly this kind of programmatic
      // focus, and the skip link targets the same element — so focus always lands
      // on a visible element inside the page. `preventScroll` keeps a resize from
      // also yanking the page to the top: `#main` starts directly below the sticky
      // header, so a default scroll-into-view would jump the reader to the very top
      // of the document.
      if (document.activeElement !== toggle) {
        document.getElementById('main')?.focus({ preventScroll: true })
      }
    }
  }, [open])

  // Scroll-aware elevation. Deliberately a SEPARATE effect from the drawer one
  // above: that effect early-returns while the drawer is closed, so a
  // subscription placed inside it would only be live in the rare open state. It
  // runs once, because it needs nothing from the render scope but the setter and a
  // module-scope constant.
  useEffect(() => {
    // `frame` is both the "a measurement is already booked" flag and the handle the
    // cleanup cancels. `scroll` can fire many times per frame; the handler only
    // books, so the read happens once per painted frame.
    let frame = 0

    const measure = () => {
      frame = 0
      const isScrolled = window.scrollY > SCROLL_ELEVATION_THRESHOLD_PX
      // Crossing guard: returning the previous value lets React bail out of the
      // render, so the component re-renders only when the threshold is crossed.
      setScrolled((prev) => (prev === isScrolled ? prev : isScrolled))
    }

    const onScroll = () => {
      if (frame) return
      frame = window.requestAnimationFrame(measure)
    }

    // Measure once on mount so a reload part-way down a page — or a deep link
    // whose scroll position is restored — paints the correct state immediately
    // instead of waiting for the first scroll event.
    measure()
    // `passive`: this handler never calls `preventDefault`, and saying so keeps
    // scrolling on the compositor instead of waiting on the main thread.
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <>
      <nav
        aria-label="Primary"
        className={cn(
          // The hairline border lives HERE, in the base, so it is identical in both
          // scroll states and the bar's height never changes.
          'w-full border-b border-border bg-white/95 backdrop-blur transition-shadow duration-200',
          // The only property the scroll state changes. The flat state is declared
          // explicitly so the two states interpolate cleanly, and the elevation is
          // the shared card step — the floating tier is reserved for the fixed
          // conversion widgets and does not belong on the bar.
          scrolled ? 'shadow-md' : 'shadow-none',
          className
        )}
      >
        <Container>
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Brand — a plain Link, not a NavLink, so the logo never takes active
                styling on the home route. */}
            <Link
              to="/"
              className="flex items-center"
              aria-label="CIBLE School of Language — home"
            >
              {/* The intrinsic width/height match the asset's viewBox and reserve
                  the rendered box before the SVG loads, preventing layout shift;
                  the width is left automatic so the aspect ratio holds. */}
              <img
                src={logo}
                alt="CIBLE School of Language"
                width={300}
                height={72}
                className="h-10 w-auto"
              />
            </Link>

            <ul className="hidden items-center gap-2 lg:flex">
              {primaryNav.map((item) => (
                <li key={item.path}>
                  <NavLink to={item.path} end={item.path === '/'} className={navLinkClass}>
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>

            <div className="flex items-center gap-2">
              <a
                href={siteConfig.phoneHref}
                className="hidden min-h-11 items-center gap-2 rounded-md px-2 text-sm font-semibold text-primary-700 transition-colors hover:bg-surface md:inline-flex"
              >
                <FaPhoneAlt aria-hidden="true" className="h-4 w-4" />
                <span>{siteConfig.phone}</span>
              </a>

              <Button to="/admission" size="sm">
                Admission
              </Button>

              <button
                type="button"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md p-2 text-foreground hover:bg-surface lg:hidden"
                aria-label="Open menu"
                aria-expanded={open}
                aria-controls="mobile-nav"
                onClick={() => setOpen(true)}
                ref={toggleRef}
              >
                <FaBars aria-hidden="true" className="h-6 w-6" />
              </button>
            </div>
          </div>
        </Container>
      </nav>

      {/* Mobile drawer (below lg) — portalled into `document.body` (see JSDoc):
          escapes the bar's backdrop-filter containing block so the overlay
          fills the viewport, AND sits outside `#root` so the root can be marked
          `inert` while it is open. Rendered only while open. */}
      {open &&
        createPortal(
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-foreground/60"
              aria-hidden="true"
              onClick={() => setOpen(false)}
            />
            <div
              id="mobile-nav"
              ref={drawerRef}
              role="dialog"
              aria-modal="true"
              aria-label="Site menu"
              className="absolute right-0 top-0 flex h-full w-72 max-w-full flex-col gap-2 bg-white p-6 shadow-md"
            >
              <button
                type="button"
                className="inline-flex min-h-11 min-w-11 items-center justify-center self-end rounded-md p-2 text-foreground hover:bg-surface"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
              >
                <FaTimes aria-hidden="true" className="h-6 w-6" />
              </button>

              <nav aria-label="Mobile" className="flex flex-col gap-2">
                {primaryNav.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/'}
                    className={navLinkClass}
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>

              <a
                href={siteConfig.phoneHref}
                className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary-700"
              >
                <FaPhoneAlt aria-hidden="true" className="h-4 w-4" />
                {siteConfig.phone}
              </a>

              <Button to="/admission" className="mt-2" onClick={() => setOpen(false)}>
                Admission
              </Button>
            </div>
          </div>,
          document.body
        )}
    </>
  )
}

export default Navbar
