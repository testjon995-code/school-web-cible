import { useEffect, useRef, useState } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination, A11y, Autoplay, Keyboard } from 'swiper/modules'
import { FaPlay, FaPause, FaChevronLeft, FaChevronRight } from 'react-icons/fa'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import 'swiper/css/a11y'
import 'swiper/css/autoplay'
import ReviewCard from './ReviewCard.jsx'
import Button from '../ui/Button.jsx'
import { cn } from '../../lib/cn.js'
import { useReducedMotion } from '../../hooks/useScrollReveal.js'
import testimonials from '../../data/testimonials.js'

/**
 * TestimonialSlider — CIBLE School of Language.
 *
 * THE canonical student/parent testimonial carousel for the SPA (AAP §0.6.1
 * Group 7). It is a Swiper v14 carousel that renders one sibling <ReviewCard>
 * per slide from the shared `src/data/testimonials.js` single source of truth,
 * with arrow navigation, clickable pagination bullets, arrow-key keyboard
 * control (parity with the Gallery carousel), the Swiper a11y module enabled,
 * and reduced-motion-aware autoplay. It is consumed by the Home
 * testimonials section and the Success Stories page, and it stays fully
 * presentational — the review records are supplied by the caller (defaulting to
 * the shared data) and every slide reuses the canonical <ReviewCard>; this
 * component never forks a second review card or restyles a raw card.
 *
 * Responsive behaviour (Tailwind breakpoint scale → CIBLE mobile/tablet/laptop):
 * - base   : 1 slide  per view (mobile)
 * - >= 768 : 2 slides per view (`md` — tablet)
 * - >= 1024: 3 slides per view (`lg` — laptop/desktop)
 * `spaceBetween={24}` keeps a consistent 24px (8px-scale) gutter between slides.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE CASCADE CONSTRAINT — read this before changing any class on this file.
 *
 * Swiper's stylesheets are imported as plain CSS (see the five `swiper/css`
 * imports above) and are therefore UN-LAYERED, while Tailwind v4 emits every
 * utility inside `@layer utilities`. In the CSS cascade an un-layered
 * declaration beats a layered one regardless of selector specificity, so NO
 * Tailwind utility class on this component can override a Swiper base rule.
 *
 * That is not theoretical. Two utilities on this file were provably inert:
 *   • `pb-12` on the <Swiper> root computed to `padding-bottom: 0px`, because
 *     `swiper.css` declares `.swiper { padding: 0 }` un-layered — so the
 *     absolutely-positioned pagination band sat ON TOP of the cards.
 *   • `h-auto` on each <SwiperSlide> was equally inert against un-layered
 *     `.swiper-slide { height: 100% }`, so slides never shrank to content and
 *     never stretched to a shared height either.
 * Both classes have been REMOVED rather than "fixed", because no value of a
 * layered utility could ever have applied.
 *
 * Every Swiper-targeting declaration therefore lives in the single un-layered
 * third-party override zone of `src/index.css`, which is the only position in
 * the cascade that can win, and each rule there carries its own reason comment.
 * This component OWNS NO Swiper CSS: it opts into the stylesheet's mechanisms
 * and must not re-declare them, nor add a second competing one.
 *
 * What the stylesheet supplies, and what this component relies on:
 *   • `.swiper.swiper { padding-inline: .5rem; padding-block-end: 1rem }` —
 *     reserves the pagination band (replacing the inert `pb-12`) AND insets the
 *     slide row so <Card>'s `shadow-md` hover bleed is no longer clipped by
 *     Swiper's `overflow: hidden`, which is deliberately left in place because
 *     unclipping it would let off-screen slides reintroduce horizontal page
 *     overflow.
 *   • `.swiper > .swiper-pagination { position: static; margin-block-start: 1rem }`
 *     — returns Swiper's OWN pagination element to normal flow so the bullets
 *     render BELOW the cards. Overlap becomes structurally impossible instead of
 *     merely arithmetically avoided. This is why `pagination.el` is deliberately
 *     NOT supplied here: the placement rule is scoped to a DIRECT child of
 *     `.swiper`, the ~26px bullet tap-target rule is scoped to a DESCENDANT of
 *     `.swiper`, and the brand-colour custom properties reach the bullets by
 *     inheritance from `.swiper`. Relocating the element outside the slider root
 *     would silently break all three.
 *   • `.swiper, .swiper-button-prev, .swiper-button-next, .swiper-pagination { --swiper-*: … }`
 *     — repoints Swiper's control colours at `--color-primary-600` and lifts the
 *     inactive bullet to ≈3.59:1 (WCAG 1.4.11). No colour is set here.
 *   • `.swiper .swiper-wrapper { align-items: stretch }` +
 *     `.swiper .swiper-slide { height: auto }` — the equal-height chain, owned
 *     ENTIRELY by the stylesheet. Flexbox only stretches an item whose COMPUTED
 *     cross-size property is `auto`, and `height: 100%` computes to `100%`, so
 *     Swiper's own rule suppressed stretch outright and each slide shrank to its
 *     own card. With the slide back to `auto`, stretch applies and <ReviewCard>'s
 *     `h-full` below finally resolves against a definite parent height. Because
 *     `.swiper-wrapper` is a nowrap flex container, ALL slides share ONE flex
 *     line, so every card matches the tallest one at every `slidesPerView` —
 *     including 1-up mobile, where this also stops the container height jumping
 *     on each slide change. Solved purely in CSS: no measurement, no
 *     ResizeObserver, no layout thrash. Note that this component deliberately
 *     passes NO height or alignment class of its own for this: a `wrapperClass`
 *     utility would be redundant at best and inert at worst, which is exactly the
 *     trap the two deleted classes above fell into.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Motion / prefers-reduced-motion (WCAG AA — REQUIRED): autoplay advances slides
 * every 5s ONLY when the user has not requested reduced motion. The preference
 * is read REACTIVELY via the shared `useReducedMotion()` hook, so it is honoured
 * both on first paint AND when the user toggles the OS/browser setting while the
 * page is open. When reduced motion is preferred the `autoplay` prop is `false`
 * AND a top-level effect explicitly STOPS Swiper's autoplay controller on the
 * already-mounted instance (a prop change alone does not reliably halt a running
 * controller); when motion is allowed again the effect RESTARTS it. The carousel
 * therefore makes NO automatic (non-user-initiated) movement under reduced
 * motion; slide changes then happen only through the user's own actions (arrows,
 * pagination, drag/swipe), which is acceptable.
 *
 * ONE CONTROL CLUSTER: every control this carousel exposes lives in a single
 * zone directly beneath the slides — Swiper's in-flow pagination band first, then
 * one row holding the previous arrow, the next arrow and the Play/Pause toggle.
 * That single structural decision replaces three separate control locations (a
 * toggle floated above the slider, arrows overlaid at `top: 50%` on top of the
 * card text, and a pagination band painted over the last line of every card) and
 * resolves five reported symptoms at once: arrows overlapping content, arrow
 * positioning, arrows hard to tap on mobile, pagination mispositioned, and
 * controls behaving inconsistently.
 *
 * The arrows escape Swiper's absolute overlay because `navigation` receives
 * explicit `prevEl` / `nextEl` ELEMENTS instead of the bare `navigation` boolean.
 * Swiper's `position: absolute; top: 50%; left/right: 4px; z-index: 10` geometry
 * is scoped to its `.swiper-button-prev` / `.swiper-button-next` classes, which
 * these controls never carry, so they simply lay out in normal flow inside the
 * cluster; and supplying the elements also stops Swiper's React wrapper from
 * rendering its own overlay divs at all, so no overlapping arrow exists even on
 * the first frame. No `z-index` is introduced — the controls stay at Swiper's own
 * layer and never compete with the app's stacking ledger (skip link 1000, route
 * progress 60, sticky header/modals 50, conversion widgets 40).
 *
 * `rewind` is what keeps BOTH arrows permanently usable. Without it Swiper
 * disables the previous arrow at slide 0 and the next arrow at the last slide:
 * `Navigation.update()` sets the native `disabled` property on a <button>
 * element and `A11y.updateNavigation()` adds `tabindex="-1"` plus
 * `aria-disabled`, at 0.35 opacity (≈1.4:1, failing WCAG 1.4.11). Because
 * autoplay wraps back to the first slide, that made a control silently LEAVE the
 * tab order mid-session. Both `Navigation.update()` and `A11y.updateNavigation()`
 * short-circuit on `rewind`, so the arrows are never disabled, never leave the
 * tab order and always paint at full brand contrast — the defect is removed at
 * its root rather than restyled. Behaviourally the arrows now wrap exactly as
 * autoplay already wrapped, so the two controls finally agree.
 *
 * Pause / Stop control (WCAG 2.2.2 "Pause, Stop, Hide" — REQUIRED for auto-
 * advancing content that runs longer than 5s): when autoplay is active (motion
 * allowed) the cluster renders a visible, keyboard-operable Play/Pause toggle
 * (the canonical <Button>) that stops and restarts Swiper's autoplay controller
 * via a ref to the instance. It carries `aria-pressed` so the state is exposed
 * programmatically, not by the label text alone, and the visible label flips
 * ("Pause autoplay" ↔ "Play autoplay") so the available action is always
 * unambiguous. `pauseOnMouseEnter` additionally pauses rotation on hover (with
 * `disableOnInteraction: false` so a swipe never silently kills it). Under
 * reduced motion nothing auto-moves, so the toggle is intentionally not rendered.
 *
 * AUTOPLAY STATE TRUTH (why four event props, not two). `isPlaying` drives both
 * the label and `aria-pressed`, so it must never disagree with the controller.
 * Swiper exposes two flags: `running` (the toggle's own state — only `start()`
 * and `stop()` change it) and `paused` (a TRANSIENT suspension). They are
 * reconciled as follows:
 * - All four autoplay events — `autoplayStart`, `autoplayStop`, `autoplayPause`
 *   and `autoplayResume` — resync `isPlaying` from the LIVE controller, so it
 *   cannot drift down any code path, including the `pauseOnMouseEnter` pause that
 *   emits `autoplayPause` and never emits a stop event.
 * - `togglePlay` likewise reads the live controller rather than React state, so
 *   the button's ACTION can never contradict its label even for one frame. That
 *   stale-state hole was the real defect: a toggle showing "Pause autoplay" while
 *   the controller had already been suspended would previously call `start()` on
 *   an already-running controller and do nothing at all.
 * - The raw `paused` flag is deliberately NOT surfaced in the label. With
 *   `disableOnInteraction: false`, Swiper's own `beforeTransitionStart` handler
 *   calls `pause()` at the start of EVERY slide transition and resumes on
 *   `transitionend`, so `paused` toggles twice per rotation. Rendering it would
 *   flash the label and the icon for ~300ms of every 5s cycle — misinforming the
 *   user rather than informing them — while `running` is the state the control
 *   actually owns and the only one the user can change.
 *
 * Accessibility (WCAG AA):
 * - The carousel is exposed as a NAMED region: the `a11y` options set
 *   `role="group"`, an `aria-label`, and `aria-roledescription="carousel"` on the
 *   slider root, and `aria-roledescription="slide"` on every slide alongside
 *   Swiper's own `role="group"` and "N / M" slide label. Those four parameters
 *   default to `null`, which is why the widget was previously unnamed and its
 *   slides undescribed (W3C WAI Carousels Tutorial).
 * - `wrapperLiveRegion` is left at its default ON PURPOSE. Swiper resolves it to
 *   `aria-live="off"` while autoplay is enabled and `"polite"` when it is not,
 *   which is exactly the WAI recommendation: an auto-rotating carousel must not
 *   announce every slide, whereas a user-driven one should. The `off` value is
 *   correct behaviour, not a defect to "fix".
 * - Both arrows and the toggle are real <button> elements (via the shared
 *   <Button>, which guarantees a ≥44×44px target through `min-h-11 min-w-11` and
 *   `h-11`), permanently in the tab order, each with the one global
 *   `:focus-visible` ring — now unobstructed, because a control that overlays a
 *   card cannot show its own focus ring. Each arrow is icon-only, so it carries
 *   an explicit `aria-label`; the icons are decorative (`aria-hidden`).
 * - The `clickable` pagination bullets remain keyboard-focusable and operable,
 *   each carrying a "Go to slide N" label and `aria-current` on the active one, and
 *   each rendered as a real <button> (`bulletElement`) so BOTH Enter and Space
 *   activate it without the browser also page-scrolling the document out from
 *   under the focused control. Their ~26px tap area and their ≥3:1 inactive
 *   contrast are owned by the stylesheet.
 * - Each slide's <ReviewCard> carries the accessible testimonial structure
 *   (<figure>/<blockquote>/<figcaption>) and exposes its star score once as a
 *   single labelled `role="img"` — colour is never the sole indicator of meaning.
 *
 * Styling: every value resolves to a Tailwind `@theme` token / native utility
 * from `src/index.css` (`h-full`, `mt-2`, `gap-x-2`, `gap-y-4`) with zero
 * hardcoded style values and zero arbitrary bracket utilities; cluster spacing
 * composes even multiples of the 8px scale. The caller `className` is merged LAST
 * through the shared `cn()` helper onto the component's OUTER wrapper — not onto
 * the <Swiper> root — so it can position the whole widget (slides plus controls)
 * as one block. The numeric Swiper API values (`spaceBetween`, `slidesPerView`,
 * breakpoints) are carousel configuration, not CSS style values.
 *
 * Stable references (Swiper re-init safety): all static Swiper configuration
 * (`MODULES`, `BREAKPOINTS`, `PAGINATION`, `A11Y`, `KEYBOARD`, `AUTOPLAY`) is
 * hoisted to module scope so its references never change across re-renders —
 * Swiper's React wrapper re-initialises (resetting the active slide and
 * restarting autoplay) when it sees a new prop reference, which would otherwise
 * glitch the carousel whenever a parent (e.g. a framer-motion reveal section)
 * re-renders. The `Autoplay` module stays registered in every case; reduced motion
 * is honoured by toggling the stable `autoplay` prop between the hoisted
 * `AUTOPLAY` object and `false` AND by the explicit stop/start effect above, so no
 * prop reference is recreated per render.
 *
 * The one unavoidable exception is `navigation`, which must carry live DOM
 * elements and therefore cannot be a frozen module constant. It is safe for two
 * reasons. First, the arrow elements are held in STATE rather than in refs: the
 * control cluster is a later sibling than <Swiper>, and React attaches a later
 * sibling's refs only AFTER an earlier sibling's layout effect has run — which is
 * exactly when Swiper initialises — so a plain ref would still have been `null` at
 * init. Callback-ref setters re-render once, at mount, with the real nodes. Second,
 * Swiper's React wrapper diffs watched object params BY VALUE, not by identity, so
 * that one change re-runs `navigation.init()` alone (the active slide and the
 * autoplay controller are untouched) and every subsequent render — including every
 * ancestor re-render — sees identical values and re-initialises nothing.
 *
 * @param {object} props
 * @param {Array<{ name: string, role?: string, course?: string, rating: number,
 *   quote: string, image?: string|null }>} [props.items=testimonials] The review
 *   records to render (shape per `src/data/testimonials.js`); defaults to the
 *   shared testimonials data. When empty the component renders nothing.
 * @param {string} [props.className] Extra classes merged LAST onto the
 *   component's OUTER wrapper element, which contains both the slider and the
 *   control cluster, so the caller can place the whole widget as one block.
 * @param {object} [props] Any additional props are forwarded to the underlying
 *   <Swiper> (e.g. `loop`, `grabCursor`).
 * @returns {import('react').ReactElement|null} The testimonial carousel, or
 *   `null` when there are no items.
 */

// Swiper feature modules registered once at module scope so the array keeps a
// STABLE reference across renders (see JSDoc). The Autoplay module is always
// registered; reduced motion is honoured via the autoplay prop below, not by
// removing the module (which would create a new array reference and re-init).
// The Keyboard module adds arrow-key slide control for keyboard users (a11y
// parity with the Gallery carousel); it never moves slides on its own.
const MODULES = [Navigation, Pagination, A11y, Autoplay, Keyboard]

// The remaining Swiper configuration is fully static, so it is hoisted to module
// scope (stable references) for the same reason — a re-render of TestimonialSlider
// (or an ancestor) must never reset the carousel's active slide.
const BREAKPOINTS = { 768: { slidesPerView: 2 }, 1024: { slidesPerView: 3 } }
// Pagination config. `clickable` keeps every bullet focusable and operable, and
// Swiper's a11y module then gives each one a "Go to slide N" label and aria-current
// on the active bullet.
//
// `bulletElement: 'button'` renders each bullet as a REAL <button> instead of
// Swiper's default `<span role="button" tabindex="0">`. This is a keyboard fix, not
// a cosmetic one. A span with a button role is not natively activatable, and
// Swiper's a11y keydown handler does not call preventDefault() on Space — so
// pressing Space on a bullet navigated the carousel AND let the browser's default
// page-scroll fire as well. Measured at 1440x900: the document jumped 723px,
// carrying both the carousel and the focused bullet off-screen, which leaves the
// focus indicator invisible (WCAG 2.4.7) right after the keystroke that moved it.
// Space is the WAI-ARIA-conventional activation key for role="button", so that path
// is a realistic one. A native <button> consumes the keystroke, so navigation still
// happens and the page no longer scrolls — the same reason the pause toggle below
// was already immune. Verified after the change: the scroll delta is 0px where it
// was +723px, Space still moves the slide, and the focused bullet stays on screen
// with its ring painted. Swiper supports this first-class: its pagination stylesheet
// ships a dedicated `button&` reset, the container's click delegation resolves the
// bullet with closest() and so works identically for a button, and the stylesheet's
// ~26px tap-target rule still wins on specificity (`.swiper .swiper-pagination-bullet`
// at 0,2,0 over that reset's 0,1,1) — measured still 26x26 with `padding: 8px`.
// Two knock-on details, both benign and both measured: Swiper's a11y module applies
// `role="button"` unconditionally, so the bullets keep a role that is now redundant
// but harmless because it matches a <button>'s implicit one; and `bulletElement` only
// chooses the tag name, so the bullets carry no `type` attribute and default to
// `submit`. Nothing can be submitted today — this carousel is never rendered inside a
// form — so DO NOT nest it in one without first giving the bullets an explicit type.
// Neither is worth reaching for `renderBullet` to "fix": that would make Swiper skip
// its own bullet labelling and cost every bullet its "Go to slide N" accessible name.
//
// `el` is deliberately NOT set: Swiper's own pagination element must stay a DIRECT
// CHILD of the slider root, because all three of the stylesheet rules that make the
// band correct are scoped to that position — the static-flow placement
// (`.swiper > .swiper-pagination`), the ~26px bullet tap target
// (`.swiper .swiper-pagination-bullet`) and the brand colour / 3:1 inactive
// contrast, which reaches the bullets by custom-property inheritance from
// `.swiper`. See the cascade section of the JSDoc above.
const PAGINATION = { clickable: true, bulletElement: 'button' }
// Accessibility config. Swiper defaults these four parameters to `null`, which is
// why the carousel was previously an UNNAMED, UNDESCRIBED widget: its root had no
// role, no accessible name and no aria-roledescription, and its slides carried
// role="group" with an "N / M" label but nothing identifying them as slides.
// Setting them makes the slider a named region announced as a carousel whose
// children are announced as slides, which is the structure the W3C WAI Carousels
// Tutorial asks for. `slideRole` already defaults to 'group' and
// `wrapperLiveRegion` is left alone on purpose (see the JSDoc: Swiper correctly
// resolves it to `off` while autoplay runs and `polite` when it does not).
const A11Y = {
  enabled: true,
  containerRole: 'group',
  containerRoleDescriptionMessage: 'carousel',
  containerMessage: 'Student and parent testimonials',
  itemRoleDescriptionMessage: 'slide',
}
// Keyboard config (WCAG 2.1.1 keyboard operability — parity with the Gallery
// carousel): Left/Right arrow keys move to the previous/next slide. NOTE:
// Swiper v14's `onlyInViewport` gate compares the carousel's PAGE-coordinate
// offset against the window height, so a below-the-fold carousel (which this
// slider is on both the Home and Success Stories pages) would have its arrow
// keys silently ignored under `onlyInViewport: true`; `false` therefore keeps
// arrow-key control working wherever the slider sits on the page. `pageUpDown`
// is disabled so the module never hijacks the browser's native PageUp/PageDown
// scrolling. Keyboard navigation is user-initiated, so it stays fully allowed
// under prefers-reduced-motion (the reduced-motion rule only stops autoplay).
const KEYBOARD = { enabled: true, onlyInViewport: false, pageUpDown: false }
// Autoplay config (WCAG 2.2.2 "Pause, Stop, Hide"): `pauseOnMouseEnter` pauses
// the rotation while a pointer is over the carousel and resumes on leave, which
// requires `disableOnInteraction: false` so a swipe/arrow does not silently kill
// autoplay. The explicit, keyboard-operable Play/Pause toggle below is the
// primary, always-available mechanism to stop the automatic movement.
const AUTOPLAY = { delay: 5000, disableOnInteraction: false, pauseOnMouseEnter: true }

export default function TestimonialSlider({ items = testimonials, className, ...props }) {
  // Reactive reduced-motion (shared hook, single source of truth): re-renders
  // this component when the OS/browser setting changes WHILE the page is open,
  // so autoplay can be stopped/started live rather than being frozen at the
  // value read on first paint. When true, autoplay is disabled so the carousel
  // never moves on its own.
  const reduced = useReducedMotion()

  // Live handle to the Swiper instance so the Play/Pause toggle — and the
  // reduced-motion effect below — can drive its autoplay controller. Play/Pause
  // reflects whether autoplay is currently running; it starts running only when
  // motion is allowed. ALL hooks are declared UNCONDITIONALLY at the top level —
  // before the early return below — so hook order is stable every render
  // (react/rules-of-hooks).
  const swiperRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(!reduced)

  // The previous/next arrow ELEMENTS, handed to Swiper's `navigation` option so
  // the arrows render inside the control cluster below instead of Swiper's
  // absolutely-positioned overlay. Held in STATE, not in a ref, on purpose: the
  // cluster is a LATER SIBLING than <Swiper>, and React attaches a later
  // sibling's refs only after an earlier sibling's layout effect has already run
  // — which is precisely when Swiper's React wrapper initialises the instance —
  // so a plain ref would still read `null` at init and the arrows would never be
  // wired. These callback-ref setters trigger exactly one extra render at mount
  // with the real nodes, and Swiper's wrapper then re-runs `navigation.init()`
  // alone (the active slide and the autoplay controller are left untouched).
  // Every render after that passes identical values, and because the wrapper
  // diffs watched object params by VALUE rather than by identity, nothing is
  // re-initialised again — the same guarantee the hoisted constants above give.
  const [prevEl, setPrevEl] = useState(null)
  const [nextEl, setNextEl] = useState(null)

  // React to LIVE reduced-motion changes on the ALREADY-MOUNTED carousel (m12):
  // passing `autoplay={false}` alone does not reliably halt an autoplay
  // controller that is already running, so drive it explicitly — stop the moment
  // the user requests reduced motion, restart when they allow motion again.
  // Guarded for instance/controller readiness and SSR; the four autoplay events
  // wired below keep `isPlaying` (and so the toggle's label and `aria-pressed`) in
  // sync with the controller, so no manual state update is needed here.
  useEffect(() => {
    const swiper = swiperRef.current
    if (!swiper?.autoplay) return
    if (reduced) {
      swiper.autoplay.stop()
    } else {
      swiper.autoplay.start()
    }
  }, [reduced])

  // Render nothing when there is no content — AFTER the hooks so their order
  // never changes across renders. Keeps callers free of empty-state guards.
  if (!items?.length) return null

  // Single source of truth for the toggle's state: read it straight off the LIVE
  // autoplay controller rather than inferring it. `running` is the flag the toggle
  // owns — only `start()` and `stop()` change it — so it is stable, whereas the
  // sibling `paused` flag is a transient suspension that Swiper raises and clears
  // twice on every slide transition (see the JSDoc) and must not reach the label.
  // Wired to all four autoplay events below, so `isPlaying` cannot drift out of
  // sync down ANY path — including the `pauseOnMouseEnter` pause, which emits
  // `autoplayPause` and never emits the stop event the old two-event wiring
  // listened for.
  const syncPlayingState = (swiper) => {
    setIsPlaying(Boolean(swiper?.autoplay?.running))
  }

  // Explicit user control (WCAG 2.2.2): stop/start Swiper's autoplay. Reads the
  // LIVE controller instead of React state so the action can never contradict the
  // visible label, and guarded so it is a no-op if the instance or its autoplay
  // controller is not ready.
  const togglePlay = () => {
    const autoplay = swiperRef.current?.autoplay
    if (!autoplay) return
    if (autoplay.running) {
      // Clear a transient suspension (hover, backgrounded tab, in-flight
      // transition) BEFORE stopping. `stop()` only clears `running`, so stopping
      // while `paused` is set would leave that flag stuck true — and because
      // `pause()` bails out when it is already set, hover-pausing would stay dead
      // for the rest of the session even after autoplay is started again.
      if (autoplay.paused) autoplay.resume()
      autoplay.stop()
    } else {
      autoplay.start()
    }
  }

  return (
    <div className={cn('relative', className)}>
      <Swiper
        onSwiper={(swiper) => {
          swiperRef.current = swiper
        }}
        // All four autoplay events resync the toggle from the live controller, so
        // the label and `aria-pressed` can never contradict the real state — the
        // `pauseOnMouseEnter` pause emits `autoplayPause` and no stop event, which
        // the previous start/stop-only wiring could not observe.
        onAutoplayStart={syncPlayingState}
        onAutoplayStop={syncPlayingState}
        onAutoplayPause={syncPlayingState}
        onAutoplayResume={syncPlayingState}
        modules={MODULES}
        spaceBetween={24}
        slidesPerView={1}
        // Explicit arrow ELEMENTS (not the bare `navigation` boolean). This keeps
        // the arrows out of Swiper's absolute overlay — its `top: 50%` /
        // `left|right: 4px` / `z-index: 10` geometry is scoped to the
        // `.swiper-button-prev` / `.swiper-button-next` classes, which the cluster's
        // buttons never carry — and it also stops Swiper's React wrapper rendering
        // those overlay divs in the first place.
        navigation={{ prevEl, nextEl }}
        // Keeps BOTH arrows enabled, focusable and at full brand contrast for the
        // whole session: `Navigation.update()` and `A11y.updateNavigation()` both
        // short-circuit on `rewind`, so neither the native `disabled` property nor
        // `tabindex="-1"` / `aria-disabled` / 0.35 opacity is ever applied at the
        // first or last slide. The arrows now wrap exactly as autoplay already
        // wrapped, so the two controls agree instead of one going dead.
        rewind
        pagination={PAGINATION}
        a11y={A11Y}
        keyboard={KEYBOARD}
        autoplay={reduced ? false : AUTOPLAY}
        breakpoints={BREAKPOINTS}
        {...props}
      >
        {items.map((t, i) => (
          // No height utility here on purpose: `h-auto` used to sit on this slide
          // and was inert (see the cascade section of the JSDoc). The slide height
          // is owned by the un-layered `.swiper .swiper-slide { height: auto }`
          // rule, which lets the flex row stretch every slide to the tallest card
          // so <ReviewCard>'s `h-full` finally resolves against a definite height.
          <SwiperSlide key={t.name || i}>
            <ReviewCard review={t} className="h-full" />
          </SwiperSlide>
        ))}
      </Swiper>

      {/* ONE control cluster, immediately below Swiper's in-flow pagination band,
          so the dots, the arrows and the pause toggle read as a single control
          zone instead of the three separate locations they used to occupy. Wraps
          at narrow widths, so it fits 320px without horizontal overflow while
          every control keeps its ≥44×44px target. Rendered AFTER the slider in
          DOM order, which is also its visual order, so focus order matches what
          the user sees. */}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-4">
        {/* Icon-only arrows: the canonical <Button> renders a real, permanently
            focusable <button> with the ≥44px target and the shared focus ring,
            which is now unobstructed because these no longer overlay a card. The
            glyph is decorative, so each control carries its own `aria-label`
            (Swiper's a11y module labels only the arrows it owns at init time, and
            these are supplied afterwards — so nothing overwrites these names). */}
        <Button ref={setPrevEl} variant="outline" size="sm" aria-label="Previous testimonial">
          <FaChevronLeft aria-hidden="true" className="h-4 w-4" />
        </Button>
        <Button ref={setNextEl} variant="outline" size="sm" aria-label="Next testimonial">
          <FaChevronRight aria-hidden="true" className="h-4 w-4" />
        </Button>

        {/* Play/Pause toggle — the required mechanism to pause the auto-rotating
            content. Rendered only when autoplay is actually active (i.e. motion is
            allowed); under reduced motion nothing auto-moves, so no control is
            needed. `aria-pressed` exposes the autoplay state programmatically
            (pressed = autoplay engaged) so state is never carried by the label
            text alone, and the visible text still flips so the available action
            stays unambiguous for sighted users; both derive from the same
            controller-backed value, so they cannot disagree.

            `min-w-52` (208px, i.e. 26 steps of the 8px scale) reserves room for
            whichever of the two labels is wider, so pressing the toggle cannot
            change its own width. Without it the label swap resized the button by
            ~15px and the centred row re-flowed, nudging both arrows sideways under
            the user's pointer — the same class of instability this single cluster
            exists to remove. The width was chosen against measurement, not by
            eyeballing: the button's INTRINSIC width is 194.2px while showing
            "Pause autoplay" and 179.6px while showing "Play autoplay", so the
            floor has to clear 194.2px. A 48-step floor (192px) cleared only the
            narrower label and left the wider one to size itself, so the button
            still changed by 2.2px. 26 steps clears both — measured at a constant
            208.0px in each state, with the arrows beside it moving 0.0px — and
            leaves 13.8px of headroom above the wider label for font-metric
            variation. Being a floor rather than a fixed width, the control grows
            instead of clipping if a fallback font measures wider, and at 320px the
            reserved width still sits inside the content box.

            One authoring note, since it is invisible in the diff: the narrower
            utility is spelled out in prose above rather than as a class token,
            because Tailwind v4 scans raw source text for candidates and would
            otherwise emit a rule for a class nothing renders. */}
        {!reduced ? (
          <Button
            type="button"
            variant="outline"
            size="md"
            className="min-w-52"
            aria-pressed={isPlaying}
            onClick={togglePlay}
          >
            {isPlaying ? (
              <FaPause aria-hidden="true" className="h-4 w-4" />
            ) : (
              <FaPlay aria-hidden="true" className="h-4 w-4" />
            )}
            {isPlaying ? 'Pause autoplay' : 'Play autoplay'}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
