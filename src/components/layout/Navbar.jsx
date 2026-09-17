import { useCallback, useEffect, useRef, useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { FaBars, FaTimes, FaPhoneAlt, FaSearch, FaBookmark } from 'react-icons/fa'
import Container from '../ui/Container.jsx'
import Button from '../ui/Button.jsx'
import Dialog from '../ui/Dialog.jsx'
import Spinner from '../ui/Spinner.jsx'
import { useSavedCourses } from '../../hooks/useSavedCourses.js'
import { cn } from '../../lib/cn.js'
import { primaryNav } from '../../data/navigation.js'
import siteConfig from '../../data/siteConfig.js'
import logo from '../../assets/logo.svg'

/**
 * Navbar — the site-wide primary navigation bar for the CIBLE School of
 * Language SPA. It is rendered inside the sticky `<header>` owned by
 * `src/components/layout/Layout.jsx` and appears above every route, so ALL
 * header work in the application lands in this one file.
 *
 * Conversion-first: alongside the navigation links it surfaces a persistent
 * "Admission" call-to-action (the shared polymorphic `Button` routing to
 * `/admission`), a click-to-call action (`siteConfig.phoneHref`), a global
 * search trigger and a saved-courses count, keeping the primary admissions and
 * discovery intents reachable from every page. All brand, link and contact
 * content is read from `src/data/*` — nothing is hardcoded here.
 *
 * ---------------------------------------------------------------------------
 * THE THREE WIDTH BANDS — PLACEMENT IS ARITHMETIC, NOT TASTE
 *
 * At 320px the bar already carries a ~167px logo (`h-10 w-auto` on a 300×72
 * asset), the Admission CTA and the hamburger inside `Container`'s `px-4`
 * gutters. There is no room for a third 44px target without shrinking
 * something the brand depends on, and neither the brand nor the nav links may
 * shrink. So:
 *   • `< md`  — the bar is EXACTLY what it has always been (brand, Admission,
 *     hamburger). The search trigger and the saved-courses link are the
 *     DRAWER's first two items, above the navigation list. Nothing is lost: the
 *     drawer is one tap away and the sticky bottom CTA already provides call,
 *     WhatsApp and admission at that width.
 *   • `md` → `< lg` — both controls appear in the bar as icon-only targets with
 *     accessible names. There is room because the seven-link row has not
 *     returned yet.
 *   • `>= lg` — the seven-link row returns and width is genuinely contested, so
 *     THE CLICK-TO-CALL CONTROL COMPACTS TO ITS ICON: same `tel:` href, same
 *     44×44px target, same accessible name, only the visible number is dropped
 *     (`lg:hidden` on the number span), which the footer and the sticky CTA
 *     both still show in full. That recovers ~110px against the ~88px the two
 *     new icon controls consume, so the `lg` row is net NARROWER than it was.
 *     This is a deliberate, stated trade — a visible header phone number for
 *     two new capabilities — not a claim that everything simply fits.
 *
 * Two hazards of that compaction are handled explicitly, because both are
 * invisible in review and total at runtime:
 *   1. The call anchor never had an `aria-label`; its accessible name came
 *      ENTIRELY from the visible number. Hiding the number at `lg` would leave
 *      an icon-only link with NO name (WCAG 4.1.2), so an explicit
 *      `aria-label` that still CONTAINS the number is set on the anchor — it
 *      overrides descendant content, so the name is guaranteed at every width
 *      and stays recognisable. (The visible text remains part of the name below
 *      `lg`, satisfying WCAG 2.5.3.)
 *   2. The anchor carried `min-h-11` but no `min-w-11` — its width came from
 *      the visible number. Compacted it would collapse to ~32px, so `min-w-11`
 *      plus `lg:justify-center` keep a centred 44×44px target.
 *
 * ---------------------------------------------------------------------------
 * THE MOBILE DRAWER IS THE SHARED `Dialog` PRIMITIVE
 *
 * The drawer used to carry its own focus trap. The codebase had exactly TWO
 * such hand-rolled traps — this one and the portalled gallery lightbox — and
 * both are now re-expressed through `src/components/ui/Dialog.jsx` over
 * `src/hooks/useDialog.js`, so the codebase holds ONE trap rather than three.
 * Never fork a second overlay here: `Dialog` at `placement="right"` IS the
 * drawer, and its `right` placement carries this drawer's verified geometry
 * (`absolute right-0 top-0 flex h-full w-72 max-w-full flex-col gap-2 bg-white
 * p-6 shadow-md`) verbatim, so that string is deliberately NOT restated as a
 * `className` override — one source of truth, identical rendered classes.
 *
 * Everything the old effect did is now the hook's, and none of it is
 * reimplemented below: initial focus (the drawer's Close control, as its first
 * focusable), Escape to close, the Tab / Shift+Tab trap — now re-queried LIVE
 * on every keystroke rather than snapshotted once, which is an improvement, not
 * a regression — `inert` on `#root`, the body scroll lock that captures and
 * restores the prior inline `overflow`, and focus restoration that clears
 * `inert` BEFORE calling `focus()` (a focus call into an inert subtree is
 * silently dropped). The hamburger is passed as `returnFocusRef`, so focus
 * returns to it on close. If you find yourself adding a `keydown` listener, an
 * `inert` assignment or scroll handling to this file, you are duplicating the
 * hook.
 *
 * The portal is still load-bearing, and `Dialog` owns it. Two independent
 * properties depend on the overlay being a child of `document.body`:
 * (1) it escapes this bar's `backdrop-blur` — per the CSS spec any ancestor
 * with a non-`none` `backdrop-filter`/`filter`/`transform` becomes the
 * containing block for `position: fixed` descendants, so an in-tree drawer's
 * `fixed inset-0` would resolve against the ~64px bar box and collapse to a top
 * strip; and (2) it lives OUTSIDE the `#root` application subtree, which is
 * what lets the open drawer mark `#root` `inert` without disabling itself.
 *
 * WHAT DELIBERATELY STAYS HERE: THE `lg` AUTO-CLOSE.
 * `useDialog` documents the `matchMedia('(min-width: 64rem)')` auto-close as a
 * responsive POLICY that is NOT a dialog behaviour, so it remains this file's
 * own effect, which simply flips `open` and lets the unmounting `Dialog` release
 * the scroll lock and clear `inert`. Without it, resizing mobile → desktop with
 * the drawer open would leave `open === true` while the drawer is out of view,
 * stranding `overflow: hidden` on the body so the desktop page could never be
 * scrolled (the originally reported bug). Note that `Dialog` owns the overlay
 * wrapper, so the old `lg:hidden` on it is gone and this effect is now the
 * SINGLE mechanism that closes that case — strictly more load-bearing than
 * before, never less. Both halves are kept: the immediate check at open time
 * and the `change` listener, registered through `addEventListener` with the
 * legacy `addListener` fallback and the matching removal.
 *
 * ---------------------------------------------------------------------------
 * GLOBAL SEARCH IS REACHED BY AN EXPLICIT IMPORT STATE MACHINE, NOT `React.lazy`
 *
 * This component is mounted on every route, so a STATIC import of
 * `GlobalSearch` would pull `src/lib/search.js` — and with it every content
 * module the index reads — into the entry chunk, which is the exact opposite of
 * the intent. `React.lazy` is wrong for a second, independent reason: a Suspense
 * fallback can show pending UI but cannot turn a REJECTED import into a
 * message, and this bar sits OUTSIDE the shell's only error boundary, which
 * wraps just the `<Outlet />`. Wrapping the trigger in a boundary of its own to
 * catch one import rejection is more machinery than the case needs.
 *
 * So the trigger drives a plain four-state machine — `idle`, `loading`, `ready`,
 * `failed` — over a MODULE-LEVEL cache of the resolved component. The component
 * is never put into React state: `GlobalSearch` is a function, so
 * `setPanel(mod.default)` would be read as a state UPDATER and React would call
 * `GlobalSearch(previousState)`, throwing on its props destructure. Keeping the
 * component in the module cache and gating its render on `panelState` removes
 * that hazard by construction rather than by remembering a thunk.
 *   • `loading` — THE TRIGGER KEEPS FOCUS (which is also what lets the loaded
 *     panel capture the right opener for its own focus restoration) and the
 *     shared `Spinner` announces the wait through its own `role="status"`.
 *   • `ready`   — the panel mounts and moves focus to its input. It owns both
 *     halves of that contract, so nothing here touches its focus.
 *   • `failed`  — an adjacent `role="alert"` offers `/search` as a full-page
 *     fallback (which genuinely works: that route loads through `lazyWithRetry`
 *     and gets the retry-then-reload recovery this trigger cannot), and focus
 *     stays on the trigger so the message is the next tab stop. A later
 *     activation still re-attempts the import, but the copy deliberately does
 *     NOT offer that as the recovery: a failed module fetch is cached by the
 *     document's module map for its whole static dep subgraph, so the same
 *     specifier cannot succeed again in this document. That is measured, not
 *     assumed — see the comment on `requestSearch`.
 * `buildIndex()` is called inside the loaded module, so the index-building work
 * stays off the critical path too; `src/lib/search.js` is deliberately never
 * imported here. The measurable acceptance test is the build output: a SEPARATE
 * `GlobalSearch` chunk must appear in `dist/assets`.
 *
 * The pending and failed messages are hosted by whichever control is VISIBLE:
 * the drawer below `md`, the bar's `relative` wrapper from `md` up. That is why
 * the drawer stays open while the chunk is in flight and closes only once the
 * panel is ready — below `md` the bar's wrapper is `display: none`, so closing
 * the drawer first would leave a failed import with nowhere to report itself.
 *
 * EXACTLY ONE DIALOG IS EVER MOUNTED. Below `md` the search trigger lives
 * inside the drawer, and the drawer is itself a `Dialog`; two live instances
 * would contend over Escape, the focus trap, `#root`'s `inert` flag, the body
 * scroll lock and focus restoration. The drawer is therefore closed as the
 * panel becomes available, in the same interaction, and the panel's render is
 * additionally gated on the drawer being closed, so the invariant is structural
 * rather than a matter of ordering. The focus hand-off falls out of that
 * sequence: the drawer's teardown clears `inert` and hands focus to the
 * hamburger, the panel then captures it as its opener and focuses its own
 * input, and on close focus returns to the hamburger.
 *
 * A user dismissal of the drawer (Escape, the scrim, the Close control, or
 * following one of its links) also CANCELS a search import it was hosting — a
 * chunk that arrives later must not pop a panel open over a page the visitor
 * has already moved on to, and a failure message must not outlive its host. The
 * `lg` auto-close deliberately does not cancel: at that width the bar hosts the
 * trigger, so a pending import simply continues and reports there.
 *
 * ---------------------------------------------------------------------------
 * SAVED COURSES ARE LOCAL CLIENT STATE, NOT A SESSION
 *
 * The count comes from `useSavedCourses`, a subscriber store over one
 * device-local key, so the header agrees with the course cards and the
 * dashboard within the tab. This file reads ONLY `saved` — `toggle`, `clear` and
 * `persisted` belong to the card and the dashboard. There is no account, no
 * authentication and no server: the link is a plain route to `/dashboard`, and
 * the count is conveyed in the accessible name rather than by a bare glyph.
 *
 * Landmark, sticky & stacking coordination (IMPORTANT):
 *   • Layout owns the sticky `<header>` (`sticky top-0 z-50`); the visual bar
 *     here is a `<nav aria-label="Primary">` and MUST NOT add its own
 *     `<header>` or any `sticky`/`top-0` — a sticky element only travels within
 *     its parent's box, so the header (child of the full-height flex column) is
 *     what actually pins.
 *   • `Dialog` paints at `z-50`, the existing modal-overlay layer this drawer
 *     already used, so it sits above the root-level `z-40` floating widgets and
 *     sticky bottom bar. The widgets' wrapping `<aside>` is statically
 *     positioned and creates no stacking context, so no portal workaround is
 *     needed for them.
 *   • The search popover anchors `absolute right-0 top-full` against the
 *     `relative` wrapper around the bar trigger — a documented mounting
 *     obligation of `GlobalSearch`, whose panel is a fixed 24rem wide and grows
 *     leftward from its containing block's inline end. The header's right-hand
 *     cluster is always far enough from the inline start edge for that.
 *
 * Accessibility (WCAG AA):
 *   • Semantic `<nav aria-label="Primary">`; the drawer is a nested
 *     `<nav aria-label="Mobile">` inside the `Dialog` panel, which carries
 *     `role="dialog"`, `aria-modal="true"` and the "Site menu" name.
 *   • The hamburger exposes `aria-label`, `aria-expanded` and
 *     `aria-controls="mobile-nav"` (matching the drawer panel's `id`); both
 *     search triggers expose `aria-label`/visible text, `aria-expanded` and
 *     `aria-controls` pointing at the search panel's `id`, which is also how the
 *     popover recognises its own trigger and leaves that control's toggle alone.
 *   • While the drawer is open focus moves in, is trapped, Escape closes it,
 *     focus returns to the hamburger and `#root` is `inert`, so background
 *     focusables leave BOTH the tab order and the accessibility tree — all of it
 *     owned by `useDialog`.
 *   • Active route is conveyed by `NavLink` active styling (a token colour
 *     change); `end` on the Home link keeps `/` active only on the exact index.
 *   • Icons are decorative (`aria-hidden`); every control carries text or an
 *     `aria-label`, and the saved-courses count is part of the name rather than
 *     colour or shape alone.
 *   • Every interactive control meets the 44×44px touch-target guideline: the
 *     icon-only hamburger, search, saved-courses and drawer Close controls via
 *     `min-h-11 min-w-11`, the compacted call action via the same pair, and the
 *     text links via `min-h-11` with content vertically centred.
 *   • Focus indication is INHERITED from the single global `:focus-visible` rule
 *     in `src/index.css` and is never re-declared on the hand-written controls
 *     here. (`Button` carries its own ring in its base class; that is Button's
 *     business.)
 *
 * Styling is entirely token-driven (Tailwind v4 `@theme` tokens from
 * src/index.css) on the 8px spacing scale — every colour, radius, spacing and
 * shadow resolves to a design token/utility, with no hardcoded or arbitrary
 * `[..]` values, and `src/index.css` carries no diff for this work.
 *
 * @param {object} [props]
 * @param {string} [props.className] Extra classes merged LAST via {@link cn}
 *   onto the root `<nav>` (Layout renders this component with none).
 * @returns {import('react').ReactElement} The primary navigation bar.
 */

// Module-scope active-link class builder shared by the desktop and mobile
// `NavLink`s. React Router calls it with `{ isActive }`; the active route gets
// the deeper primary token, the rest get foreground text with a primary hover.
// Not exported (the file exposes only the Navbar component) — module-scope
// `const` is permitted by oxlint `allowConstantExport`.
const navLinkClass = ({ isActive }) =>
  cn(
    'inline-flex min-h-11 items-center rounded-md px-2 text-sm font-medium transition-colors',
    isActive ? 'text-primary-700' : 'text-foreground hover:text-primary-600'
  )

// The search panel's DOM id, written once because three places must agree on
// it: both triggers' `aria-controls`, and the `id` handed to the loaded panel.
// `GlobalSearch` reads that id back to recognise its own trigger, so an
// outside-press dismissal never fights the control that opened it.
const SEARCH_PANEL_ID = 'global-search-panel'

// Module-level cache of the dynamically imported search panel. Module-level so
// it outlives every re-render, and deliberately NOT React state: the component
// is a function, and handing a function to a state setter makes React treat it
// as an updater and call it with the previous state (see the JSDoc). Not
// exported — this module exposes only the Navbar component.
let searchPanelModule = null

/**
 * Phrase the saved-courses count as an accessible name.
 *
 * Written once and used by BOTH saved-courses affordances so the two bands
 * announce identically. Every phrasing begins with the visible label text
 * ("Saved courses"), which is what keeps the name compliant with WCAG 2.5.3
 * where that text is also rendered.
 *
 * @param {number} count How many courses are currently saved on this device.
 * @returns {string} The control's accessible name.
 */
function describeSavedCount(count) {
  if (count === 1) return 'Saved courses (1 saved)'
  if (count > 1) return `Saved courses (${count} saved)`
  return 'Saved courses (none saved yet)'
}

/**
 * The pending and failed presentations of the search-panel import, rendered by
 * whichever host is visible at the current width — the drawer below `md`, the
 * bar's anchored wrapper from `md` up. Renders nothing for `idle` and `ready`,
 * so both call sites can mount it unconditionally.
 *
 * `Spinner` is reused as the single canonical loading representation; its
 * wrapper bakes in `py-24` for full-page use, which would blow apart a 64px
 * header row, so `py-0` is merged last to neutralise it. The failed branch is a
 * `role="alert"` so the failure is announced without moving focus, and it is
 * rendered AFTER the trigger in DOM order so the offered escape route is the
 * next tab stop. Module-local and not exported.
 *
 * @param {object} props
 * @param {'idle'|'loading'|'ready'|'failed'} props.state Current import state.
 * @param {string} [props.className] Host-specific surface classes, merged last.
 * @param {() => void} [props.onNavigate] Called when the fallback link is
 *   followed, so the owner can dismiss the message and any host it sits in.
 * @returns {import('react').ReactElement|null} The status surface, or null.
 */
function SearchImportStatus({ state, className, onNavigate }) {
  if (state === 'loading') {
    return (
      <div className={cn('flex items-center gap-3', className)}>
        <Spinner size="sm" className="py-0" label="Loading search…" />
        <span className="text-sm text-muted">Loading search…</span>
      </div>
    )
  }

  if (state === 'failed') {
    return (
      <div role="alert" className={className}>
        {/* The copy offers the two recoveries that MEASURABLY work and promises
            nothing else — see the module-map note on `requestSearch`. The full
            search page is the primary way forward because it loads through
            `lazyWithRetry`, which owns the retry-then-reload recovery a header
            control cannot perform on the visitor's behalf. */}
        <p className="text-sm text-foreground">
          Search could not be loaded. Open the full search page instead, or reload this page to try
          again.
        </p>
        <Button to="/search" variant="outline" size="sm" className="mt-3" onClick={onNavigate}>
          Open search page
        </Button>
      </div>
    )
  }

  return null
}

function Navbar({ className }) {
  // All hooks are declared unconditionally at the top level, in a stable order
  // (oxlint `react/rules-of-hooks`). `open` toggles the mobile drawer;
  // `searchOpen` records that the visitor asked for the search panel and
  // `panelState` tracks the chunk that renders it; `toggleRef` is the drawer's
  // `returnFocusRef`, so focus lands back on the hamburger on close.
  const [open, setOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [panelState, setPanelState] = useState('idle')
  const toggleRef = useRef(null)
  // Only `saved` is read here: the toggle, the clear action and the `persisted`
  // disclosure belong to the course cards and the dashboard.
  const { saved } = useSavedCourses()

  const savedCount = saved.length
  // The panel may render only when the visitor asked for it, the chunk has
  // arrived, AND the drawer is closed. That last clause is what makes "exactly
  // one Dialog is mounted" structural rather than dependent on commit ordering.
  const searchPanelOpen = searchOpen && panelState === 'ready' && !open
  // Read from the module cache during render; it is always assigned before the
  // state that gates this transitions to `ready`.
  const SearchPanel = searchPanelModule

  // Dismissal of the panel. `panelState` is left at `ready` so re-opening is
  // instant and the chunk is fetched exactly once per session.
  const closeSearch = useCallback(() => {
    setSearchOpen(false)
  }, [])

  // The failed message offered `/search`; following it dismisses the message and
  // whichever host was showing it.
  const dismissSearch = useCallback(() => {
    setSearchOpen(false)
    setPanelState('idle')
    setOpen(false)
  }, [])

  // USER dismissal of the drawer — Escape, the scrim, the Close control, or
  // following one of its links. It also cancels a search import the drawer was
  // hosting (see the JSDoc): a `loading` chunk must not pop the panel open after
  // the menu has been closed, and a `failed` message must not outlive its host.
  // The `lg` auto-close and the success path call `setOpen(false)` directly
  // instead, precisely so neither cancels anything.
  const closeDrawer = useCallback(() => {
    setOpen(false)
    setSearchOpen(false)
    setPanelState((current) => (current === 'failed' ? 'idle' : current))
  }, [])

  // Resolve the search panel's chunk, then open it. The dynamic `import()` below
  // is the ONLY reference to `GlobalSearch` in this file, and awaiting it — even
  // on a cache hit, where it settles in a microtask — is also what keeps the
  // drawer's close out of the activating click's own commit.
  const requestSearch = useCallback(async () => {
    setSearchOpen(true)
    // A pending state is honest only while something is genuinely pending.
    if (!searchPanelModule) setPanelState('loading')
    try {
      const mod = await import('../common/GlobalSearch.jsx')
      searchPanelModule = mod.default
      setPanelState('ready')
      // Close the drawer as the panel becomes available, never before: below
      // `md` the drawer hosts both the trigger and the pending message, and it
      // is itself a `Dialog`, so it must be gone before the panel mounts.
      setOpen(false)
    } catch {
      // The chunk did not arrive. The drawer deliberately stays open so the
      // alert has a visible host beside the control that was activated.
      //
      // A LATER ACTIVATION STILL RE-ATTEMPTS THE IMPORT (see `onSearchTrigger`),
      // but the failed state's copy does NOT promise that as the recovery, and
      // that wording is load-bearing rather than cautious. Measured in Chrome
      // against the production build: once a module fetch fails, the document's
      // module map records the failure for that URL *and its whole static dep
      // subgraph* for the document's lifetime, so re-importing the same
      // specifier rejects again WITHOUT issuing a network request — even after
      // the network recovers, and even with a cache-busting query on the top
      // specifier, because the dependency entries are poisoned too. The
      // re-attempt is therefore kept (it is one microtask, and it is the right
      // shape if a rejection ever comes from something other than a failed
      // fetch) while the visitor is pointed at `/search` and a reload, which
      // are the two recoveries that actually work. Promising a retry that the
      // platform cannot honour would be exactly the kind of claim this codebase
      // does not make.
      setPanelState('failed')
    }
  }, [])

  // Shared by both triggers: close an open panel, otherwise ask for one. From
  // `failed` this is the retry. `requestSearch` handles its own rejection, so
  // the promise it returns is intentionally not awaited here.
  const onSearchTrigger = useCallback(() => {
    if (searchPanelOpen) {
      setSearchOpen(false)
      return
    }
    requestSearch()
  }, [searchPanelOpen, requestSearch])

  // Auto-close the drawer when the viewport grows to the `lg` breakpoint
  // (Tailwind default 64rem) — the width at which the hamburger is hidden and
  // the bar takes over. Without this, resizing mobile → desktop while the drawer
  // is open would leave `open === true`, so `Dialog` would keep the body
  // scroll-lock (`overflow: hidden`) applied and the desktop page could never be
  // scrolled (the reported bug). Setting `open` to false unmounts the dialog and
  // runs `useDialog`'s teardown, which restores `document.body.style.overflow`
  // and clears `inert`. This stays HERE rather than in the hook: it is a
  // responsive policy, not a dialog behaviour. The listener supports the modern
  // `addEventListener` API with the legacy `addListener` fallback.
  useEffect(() => {
    if (!open) return undefined

    const desktopQuery = window.matchMedia('(min-width: 64rem)')
    const onViewportChange = (event) => {
      if (event.matches) setOpen(false)
    }
    if (desktopQuery.matches) {
      // Already at/above `lg` when opened — close immediately.
      setOpen(false)
    }
    if (typeof desktopQuery.addEventListener === 'function') {
      desktopQuery.addEventListener('change', onViewportChange)
    } else {
      desktopQuery.addListener(onViewportChange)
    }

    return () => {
      if (typeof desktopQuery.removeEventListener === 'function') {
        desktopQuery.removeEventListener('change', onViewportChange)
      } else {
        desktopQuery.removeListener(onViewportChange)
      }
    }
  }, [open])

  return (
    <>
      <nav
        aria-label="Primary"
        className={cn('w-full border-b border-border bg-white/95 backdrop-blur', className)}
      >
        <Container>
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Brand — plain Link (not NavLink) so the logo never gets active styling */}
            <Link
              to="/"
              className="flex items-center"
              aria-label="CIBLE School of Language — home"
            >
              {/* Intrinsic width/height (the asset's 300×72 viewBox) reserve the
                  box at the rendered `h-10` (40px) height BEFORE the SVG loads,
                  preventing cumulative layout shift (m11). `w-auto` keeps the
                  aspect ratio. */}
              <img
                src={logo}
                alt="CIBLE School of Language"
                width={300}
                height={72}
                className="h-10 w-auto"
              />
            </Link>

            {/* Desktop link row (lg and up) */}
            <ul className="hidden items-center gap-2 lg:flex">
              {primaryNav.map((item) => (
                <li key={item.path}>
                  <NavLink to={item.path} end={item.path === '/'} className={navLinkClass}>
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>

            {/* Right cluster: search + saved courses + click-to-call + Admission
                CTA + hamburger. The first two are bar controls from `md` up only;
                below that they are the drawer's leading items (see JSDoc). */}
            <div className="flex items-center gap-2">
              {/* `relative` is a mounting requirement, not decoration: the loaded
                  panel positions itself `absolute right-0 top-full` against this
                  wrapper, and the pending/failed message is anchored the same way
                  so neither ever reflows the 64px bar row. */}
              <div className="relative hidden md:block">
                <button
                  type="button"
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md p-2 text-foreground transition-colors hover:bg-surface"
                  aria-label="Search this website"
                  aria-expanded={searchPanelOpen}
                  aria-controls={SEARCH_PANEL_ID}
                  onClick={onSearchTrigger}
                >
                  <FaSearch aria-hidden="true" className="h-5 w-5" />
                </button>

                {/* Hosted here whenever the drawer is not the visible host, so
                    exactly one status surface exists at any width. */}
                {open ? null : (
                  <SearchImportStatus
                    state={panelState}
                    onNavigate={dismissSearch}
                    className="absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-border bg-white p-4 shadow-md"
                  />
                )}

                {/* Below `md` this same element is a portalled dialog, so it
                    renders correctly even though this wrapper is hidden there. */}
                {searchPanelOpen && SearchPanel ? (
                  <SearchPanel id={SEARCH_PANEL_ID} onClose={closeSearch} />
                ) : null}
              </div>

              <Link
                to="/dashboard"
                aria-label={describeSavedCount(savedCount)}
                className="relative hidden min-h-11 min-w-11 items-center justify-center rounded-md p-2 text-foreground transition-colors hover:bg-surface md:inline-flex"
              >
                <FaBookmark aria-hidden="true" className="h-5 w-5" />
                {/* Decorative: the count is already in the accessible name, so
                    the marker is never the sole carrier of that information. */}
                {savedCount > 0 ? (
                  <span
                    aria-hidden="true"
                    className="absolute right-1 top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-primary-600 px-1 text-xs font-semibold text-white"
                  >
                    {savedCount}
                  </span>
                ) : null}
              </Link>

              {/* Click-to-call. `aria-label` carries the number so the name
                  survives the `lg` compaction of the visible text, and
                  `min-w-11` + `lg:justify-center` keep the icon-only rendering a
                  centred 44×44px target. */}
              <a
                href={siteConfig.phoneHref}
                aria-label={`Call CIBLE on ${siteConfig.phone}`}
                className="hidden min-h-11 min-w-11 items-center gap-2 rounded-md px-2 text-sm font-semibold text-primary-700 transition-colors hover:bg-surface md:inline-flex lg:justify-center"
              >
                <FaPhoneAlt aria-hidden="true" className="h-4 w-4" />
                <span className="lg:hidden">{siteConfig.phone}</span>
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

      {/* Mobile drawer (below lg) — the shared `Dialog` primitive at
          `placement="right"`, which supplies the portal into `document.body`,
          the focus trap, Escape, the scroll lock, `inert` on `#root` and focus
          restoration to the hamburger. `id="mobile-nav"` is forwarded to the
          panel, matching the hamburger's `aria-controls`; the scrim weight is
          stated explicitly because it is a per-caller decision; and the panel
          geometry is the `right` placement's own default, so it is not restated
          here. Renders nothing while closed. */}
      <Dialog
        open={open}
        onClose={closeDrawer}
        placement="right"
        label="Site menu"
        id="mobile-nav"
        returnFocusRef={toggleRef}
        scrimClassName="bg-foreground/60"
      >
        <button
          type="button"
          className="inline-flex min-h-11 min-w-11 items-center justify-center self-end rounded-md p-2 text-foreground hover:bg-surface"
          aria-label="Close menu"
          onClick={closeDrawer}
        >
          <FaTimes aria-hidden="true" className="h-6 w-6" />
        </button>

        {/* Search and saved courses lead the drawer BELOW `md`, where the bar has
            no room for a third 44px target. Hidden from `md` up, where the bar
            hosts both — so exactly one of the two hosts is live at any width. */}
        <button
          type="button"
          className="inline-flex min-h-11 items-center gap-3 rounded-md px-2 text-sm font-medium text-foreground transition-colors hover:bg-surface md:hidden"
          aria-expanded={searchPanelOpen}
          aria-controls={SEARCH_PANEL_ID}
          onClick={onSearchTrigger}
        >
          <FaSearch aria-hidden="true" className="h-4 w-4" />
          Search
        </button>

        {/* Only mounted while the drawer is open, which is exactly when the bar's
            copy is suppressed. */}
        <SearchImportStatus
          state={panelState}
          onNavigate={dismissSearch}
          className="rounded-2xl border border-border bg-surface p-4"
        />

        <Link
          to="/dashboard"
          aria-label={describeSavedCount(savedCount)}
          className="inline-flex min-h-11 items-center gap-3 rounded-md px-2 text-sm font-medium text-foreground transition-colors hover:bg-surface md:hidden"
          onClick={closeDrawer}
        >
          <FaBookmark aria-hidden="true" className="h-4 w-4" />
          Saved courses
          {savedCount > 0 ? (
            <span
              aria-hidden="true"
              className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-primary-600 px-1 text-xs font-semibold text-white"
            >
              {savedCount}
            </span>
          ) : null}
        </Link>

        <nav aria-label="Mobile" className="flex flex-col gap-2">
          {primaryNav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={navLinkClass}
              onClick={closeDrawer}
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

        <Button to="/admission" className="mt-2" onClick={closeDrawer}>
          Admission
        </Button>
      </Dialog>
    </>
  )
}

export default Navbar
