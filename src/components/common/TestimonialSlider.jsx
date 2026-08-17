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
 * The canonical student/parent testimonial carousel for the SPA: a Swiper v14
 * carousel that renders one shared <ReviewCard> per slide, with arrow navigation,
 * clickable pagination bullets, arrow-key control, the Swiper a11y module enabled
 * and reduced-motion-aware autoplay. The Home testimonials section and the Success
 * Stories page consume it. It stays fully presentational: records come from the
 * caller (defaulting to `src/data/testimonials.js`) and every slide reuses
 * <ReviewCard>, so this component never forks a second review card.
 *
 * Responsive behaviour: 1 slide per view on mobile, 2 from `md`, 3 from `lg`, with a
 * 24px gutter on the 8px scale.
 *
 * CASCADE OWNERSHIP — read before adding a class here. Swiper's stylesheets are
 * imported as plain CSS and are therefore un-layered, while Tailwind emits utilities
 * inside `@layer utilities`, so an un-layered Swiper base rule beats any utility
 * class this component could carry. EVERY Swiper-targeting declaration consequently
 * lives in the un-layered third-party override zone of `src/index.css`, which
 * documents each rule and is the single owner of slide padding, pagination
 * placement, bullet geometry, control colour and the equal-height chain. This
 * component owns no Swiper CSS: it opts into those mechanisms and must not
 * re-declare them or add a competing rule — in particular it passes no slide-height,
 * wrapper-alignment or slider-padding class, because such a class would be inert.
 * <ReviewCard>'s full-height class is the one exception, and it works because the
 * stylesheet's `height: auto` rule is what gives it a definite parent height.
 *
 * One authoring constraint follows from that: Tailwind v4 scans raw source text for
 * class candidates, comments included, so a utility named in prose here would make
 * the compiler emit a rule no element renders. Classes this file does not render are
 * therefore described rather than spelled.
 *
 * Motion / prefers-reduced-motion (WCAG AA): autoplay advances slides every 5s ONLY
 * when the visitor has not requested reduced motion. The preference is read
 * REACTIVELY through the shared `useReducedMotion()` hook, so it is honoured on
 * first paint and when the OS/browser setting changes while the page is open. Under
 * reduced motion the `autoplay` prop is `false` AND an effect explicitly stops the
 * controller on the already-mounted instance, because a prop change alone does not
 * reliably halt a running controller; allowing motion again restarts it. Nothing
 * then moves without a user action — arrows, bullets, keyboard and drag still work.
 *
 * ONE CONTROL CLUSTER: every control lives inside ONE container directly beneath the
 * slides — the pagination band on the first row, then the arrows and the Play/Pause
 * toggle on the second. One DOM parent, not merely one screen region: the pagination
 * element is handed to Swiper through `pagination.el` rather than left inside
 * `.swiper`, so the markup, the accessibility tree and any future layout change all
 * see a single group.
 *
 * The arrows stay out of Swiper's absolute overlay because `navigation` receives
 * explicit `prevEl` / `nextEl` ELEMENTS instead of the bare boolean. Swiper's
 * overlay geometry is scoped to its own arrow classes, which these controls never
 * carry, so they lay out in normal flow inside the cluster; supplying the elements
 * also stops the React wrapper rendering overlay divs at all, so no overlapping
 * arrow exists even on the first frame. No `z-index` is introduced — the controls
 * stay on Swiper's own layer and never compete with the app's stacking ledger (skip
 * link 1000, route progress 60, sticky header/modals 50, conversion widgets 40).
 *
 * `rewind` is what keeps BOTH arrows permanently usable. Without it Swiper disables
 * the previous arrow at the first slide and the next arrow at the last:
 * `Navigation.update()` sets the native `disabled` property and
 * `A11y.updateNavigation()` adds `tabindex="-1"` plus `aria-disabled` at a low
 * opacity that fails WCAG 1.4.11 — and because autoplay wraps, a control would leave
 * the tab order mid-session. Both methods short-circuit on `rewind`, so the arrows
 * never disable, never leave the tab order and always paint at full brand contrast.
 * They then wrap exactly as autoplay already wraps, so the two controls agree.
 *
 * Pause / Stop control (WCAG 2.2.2, required for content that auto-advances for more
 * than 5s): when autoplay is active the cluster renders a visible, keyboard-operable
 * Autoplay toggle (the canonical <Button>) that stops and starts the controller
 * through a ref to the instance. It is one coherent toggle-button pattern — a STABLE
 * accessible name ("Autoplay") naming the thing being toggled, `aria-pressed`
 * carrying its on/off state, and the icon carrying that same state as shape (pause
 * bars against play triangle) so nothing depends on colour or on label text. Naming
 * the action instead of the object would announce as "Pause autoplay, toggle button,
 * pressed", leaving it ambiguous whether the pause or the rotation is the pressed
 * state. Under reduced motion nothing auto-moves, so the toggle is deliberately not
 * rendered.
 *
 * Rotation hands over to the visitor rather than competing with them, and all three
 * paths move the same single flag through `stop()`: hover on the slides (owned here —
 * see AUTOPLAY STATE TRUTH), focus arriving into the widget from outside
 * (`handleFocusEnter`), and `disableOnInteraction: true` for a drag or any other
 * user-initiated transition. That is an ANNOUNCEMENT requirement rather than a
 * preference: the slide wrapper is `aria-live="off"` while rotation runs, so a slide
 * the visitor reaches with the arrows, the bullets, the arrow keys or a swipe would
 * otherwise be announced by nothing at all. Stopping first flips the wrapper to
 * `polite`, the toggle simultaneously reports the stop, and one press puts rotation
 * back.
 *
 * AUTOPLAY STATE TRUTH — why the hover pause is implemented here rather than by
 * Swiper. `isRunning` drives `aria-pressed`, the toggle's icon AND the wrapper's
 * `aria-live`, so it must never disagree with what the visitor can see. Swiper
 * exposes two flags, and neither can tell the truth on its own:
 * - `paused` is unusable as a signal. Swiper's own `beforeTransitionStart` handler
 *   calls `pause()` at the start of every AUTOPLAY-driven transition (those pass
 *   `internal: true`, so `disableOnInteraction` does not apply to them) and resumes
 *   on `transitionend`, so `paused` flips twice per rotation; rendering it would
 *   flicker the icon on every cycle.
 * - `running` alone is untruthful while Swiper owns the hover pause, because
 *   `pauseOnMouseEnter` suspends rotation through that same transient pause and
 *   leaves `running` true — so the control would keep showing pause bars with
 *   `aria-pressed="true"` while nothing moved. The two pause sources are
 *   indistinguishable from outside Swiper: both emit `autoplayPause` and the flag
 *   that separates them is a module-private closure variable.
 * - Relabelling could not fix it either: while Swiper's hover pause is in effect its
 *   own transition handler refuses to resume, so a resume (or a stop/start pair)
 *   advances one slide and freezes again — a control offering to start rotation there
 *   could not honour what it was showing.
 * `pauseOnMouseEnter` is therefore `false` and this component performs the hover
 * pause itself, through the SAME `stop()`/`start()` calls the toggle uses, from
 * `pointerenter`/`pointerleave` listeners on the slider element (mouse pointers only,
 * mirroring Swiper's own `pointerType` guard). Nothing is withdrawn — hover still
 * suspends rotation and leaving resumes it — but it now moves the one observable
 * flag, so `isRunning` means exactly "the content is auto-advancing", every exposed
 * state derives from it, and only the two events that can change it
 * (`autoplayStart`, `autoplayStop`) are subscribed, which is what keeps the control
 * free of per-rotation flicker. One deliberate nuance: `stop()` resets the delay, so
 * leaving the carousel restarts the full interval rather than resuming the remainder
 * — the reader gets a whole interval back, the kinder behaviour for the audience
 * WCAG 2.2.2 exists for. `togglePlay` reads the LIVE controller rather than React
 * state, so the button's action cannot contradict the state it reports even for one
 * frame, and it clears the hover latch so an explicit press always outranks a pointer
 * still resting on the slider.
 *
 * Accessibility (WCAG AA):
 * - The carousel is exposed as a NAMED CAROUSEL GROUP: the `a11y` options set
 *   `role="group"`, an `aria-label` and `aria-roledescription="carousel"` on the
 *   slider root, and `aria-roledescription="slide"` on every slide alongside
 *   Swiper's own `role="group"` and "N / M" slide label. `group` is deliberate
 *   rather than `region`: a named `region` is a landmark, and this widget sits inside
 *   a section that already has a heading, so a landmark here would only add noise to
 *   the landmark list — `group` is the role the W3C WAI Carousels Tutorial uses for a
 *   carousel that is not itself a landmark. All four parameters default to `null`.
 * - The slide wrapper's `aria-live` FOLLOWS the rotation state. The WAI rule is that
 *   an auto-rotating carousel must not announce every slide whereas a user-driven one
 *   should, and Swiper's `wrapperLiveRegion` default implements exactly that — but it
 *   writes the attribute once inside `init()` and never revisits it, so the value
 *   goes stale as soon as the rotation state changes, and no prop change makes
 *   `init()` run again. `setWrapperLive` therefore owns the attribute: `off` while
 *   automatic rotation is running, `polite` whenever it is stopped or disabled.
 *   Because it is driven by the same value as the toggle, the announcement policy and
 *   the visible control cannot disagree. It is written from two places on purpose —
 *   synchronously inside `syncRunningState` for every rotation change Swiper reports,
 *   and from an effect for mount and live reduced-motion changes, which report none.
 *   The synchronous half matters because Swiper's `slideTo` runs
 *   `updateActiveIndex()` and `updateSlidesClasses()` BEFORE emitting
 *   `beforeTransitionStart`: a value applied on the next React commit would land
 *   after the slide mutation it was meant to make announceable, so the first
 *   user-driven slide would still be silent. Combined with the focus and interaction
 *   handovers above, rotation is already stopped and the wrapper already `polite`
 *   before any user-initiated slide change reaches the accessibility tree.
 * - Both arrows and the toggle are real <button> elements (through the shared
 *   <Button>, which guarantees a ≥44×44px target), permanently in the tab order,
 *   each showing the one global `:focus-visible` ring — unobstructed, because a
 *   control that overlays a card cannot show its own focus ring. Each arrow is
 *   icon-only, so it carries an explicit `aria-label`; the icons are decorative.
 * - The `clickable` pagination bullets are keyboard-focusable AND keyboard-operable,
 *   each carrying a "Go to slide N" label and `aria-current` on the active one, and
 *   each rendered as a real <button> (`bulletElement`). Both Enter and Space move the
 *   carousel, exactly once per press, without the browser also page-scrolling the
 *   document out from under the focused control — see `activateBulletOnce`, which
 *   owns that activation because relocating the pagination band out of `.swiper`
 *   costs the bullets Swiper's own key handling (its a11y module binds that listener
 *   only inside `init()`, when this component's `pagination.el` is still `null`), so
 *   without it they would be focusable but inert, a WCAG 2.1.1 Level A failure. Their
 *   tap area and their ≥3:1 inactive contrast are owned by the stylesheet.
 * - Each slide's <ReviewCard> carries the accessible testimonial structure
 *   (<figure>/<blockquote>/<figcaption>) and exposes its star score once as a single
 *   labelled `role="img"` — colour is never the sole indicator of meaning.
 *
 * Styling: every value resolves to a Tailwind `@theme` token or native utility from
 * `src/index.css`, with no hardcoded style values and no arbitrary bracket
 * utilities; cluster spacing composes even multiples of the 8px scale. The one
 * non-Tailwind class in the markup is Swiper's own `swiper-pagination`, an API hook
 * rather than a style declaration. The caller `className` is merged LAST through
 * `cn()` onto the component's OUTER wrapper — not onto the <Swiper> root — so it can
 * position the whole widget, slides plus controls, as one block. The numeric Swiper
 * values (`spaceBetween`, `slidesPerView`, breakpoints) are carousel configuration,
 * not CSS.
 *
 * STABLE OPTION REFERENCES: all static Swiper configuration (`MODULES`,
 * `BREAKPOINTS`, `PAGINATION`, `A11Y`, `KEYBOARD`, `AUTOPLAY`) is hoisted to module
 * scope so its references never change across renders. Swiper's React wrapper
 * watches a fixed set of parameters and, when it sees a change, shallow-compares the
 * watched values and updates the affected pieces of the instance — re-running module
 * initialisation for what changed rather than rebuilding the carousel. Hoisting keeps
 * those comparisons trivially equal, so an ancestor re-render (a motion reveal
 * section, say) triggers no update work at all. The `Autoplay` module stays
 * registered in every case; reduced motion is honoured by swapping the stable
 * `autoplay` prop between the hoisted object and `false` and by the explicit
 * stop/start effect, so no prop reference is recreated per render.
 *
 * `navigation` and `pagination` are the two unavoidable exceptions, because they
 * must carry live DOM elements (`PAGINATION` still holds every static option; only
 * `el` is added per render). They are safe for two reasons. First, the control
 * elements are held in STATE rather than in refs: the cluster is a later sibling than
 * <Swiper>, and React attaches a later sibling's refs only after an earlier
 * sibling's layout effect has run — which is exactly when Swiper initialises — so a
 * plain ref would still read `null` at init. Callback-ref setters re-render once, at
 * mount, with the real nodes, and the wrapper then re-runs `navigation.init()` /
 * `pagination.init()` alone, leaving the active slide and the autoplay controller
 * untouched. Second, every render after that passes equal values, so nothing is
 * updated again. Supplying `pagination.el` also stops the wrapper rendering its own
 * band inside `.swiper`, so no second, overlapping set of bullets can exist — the
 * same guarantee the explicit arrow elements give.
 *
 * @param {object} props
 * @param {Array<{ name: string, role?: string, course?: string, rating: number,
 *   quote: string, image?: string|null }>} [props.items=testimonials] The review
 *   records to render (shape per `src/data/testimonials.js`); defaults to the shared
 *   testimonials data. When empty the component renders nothing.
 * @param {string} [props.className] Extra classes merged LAST onto the component's
 *   OUTER wrapper element, which contains both the slider and the control cluster,
 *   so the caller can place the whole widget as one block.
 * @returns {import('react').ReactElement|null} The testimonial carousel, or `null`
 *   when there are no items.
 *
 * Any other props are forwarded to the underlying <Swiper> (e.g. `loop`,
 * `grabCursor`).
 */

// Registered once at module scope so the array keeps a STABLE reference across
// renders (see the JSDoc). The Autoplay module stays registered even under reduced
// motion, which is honoured through the autoplay prop instead; removing it would
// create a new array reference. The Keyboard module adds arrow-key slide control and
// never moves slides on its own.
const MODULES = [Navigation, Pagination, A11y, Autoplay, Keyboard]

const BREAKPOINTS = { 768: { slidesPerView: 2 }, 1024: { slidesPerView: 3 } }
// Pagination config. `clickable` keeps every bullet focusable and operable, and
// Swiper's a11y module then gives each one a "Go to slide N" label plus
// `aria-current` on the active bullet.
//
// `bulletElement: 'button'` renders each bullet as a REAL <button> instead of
// Swiper's default span with a button role. This is a keyboard fix, not a cosmetic
// one: a span with a button role is not natively activatable, and Swiper's a11y
// keydown handler does not call preventDefault() on Space, so pressing Space on a
// bullet navigated the carousel AND let the browser's default page-scroll fire,
// carrying the focused bullet off-screen and leaving its focus indicator invisible
// (WCAG 2.4.7). Space is the WAI-ARIA-conventional activation key for a button role,
// so that path is a realistic one, and a native <button> consumes the keystroke.
// Swiper supports this first-class: its pagination stylesheet ships a dedicated
// `button&` reset, its click delegation resolves the bullet with closest() and so
// works identically for a button, and the stylesheet's tap-target rule still outranks
// that reset.
//
// Two knock-on details, both benign. Swiper's a11y module applies `role="button"`
// unconditionally, so the bullets keep a role that is now redundant but matches a
// <button>'s implicit one. And `bulletElement` only chooses the tag name, so the
// bullets carry no `type` attribute and default to `submit`: nothing can be submitted
// today because this carousel is never rendered inside a form, so DO NOT nest it in
// one without first giving the bullets an explicit type. Neither is worth reaching
// for `renderBullet` to "fix" — that would make Swiper skip its own bullet labelling
// and cost every bullet its accessible name.
//
// `el` is deliberately NOT part of this constant: it is a live DOM node, merged in at
// render time (see the `pagination` prop) so this object stays static and its
// reference stable. The element it points at lives in the control cluster rather than
// inside `.swiper`, which is what makes the cluster ONE DOM group; every stylesheet
// rule the band depends on is declared for that position too, so nothing is lost by
// moving it out.
const PAGINATION = { clickable: true, bulletElement: 'button' }

// Keyboard activation for the pagination bullets — ONE owner, exactly ONE activation
// per key press. Supplying an EXTERNAL `pagination.el` (the price of putting the
// bullets in the control cluster) costs the bullets Swiper's own keyboard support,
// while a native <button> bullet has a built-in activation path of its own. Left
// alone those two facts combine into either two activations or none.
//
// What Swiper does, read from the installed 14.0.6 sources:
//   • `modules/a11y.mjs` attaches its Enter/Space `keydown` listener to
//     `pagination.el` in ONE place — inside `init()`, behind `hasClickablePagination()`,
//     which requires `pagination.bullets.length`.
//   • `pagination.el` here comes from STATE (see `paginationEl` below), so it is still
//     `null` when Swiper's React wrapper constructs the instance. Pagination does not
//     initialise, `bullets` is empty, that guard is false, and the listener is NEVER
//     attached.
//   • The element arrives one render later and `shared/update-swiper.mjs` re-runs
//     `pagination.init()/render()/update()` alone. That emits `paginationUpdate`,
//     which a11y answers with `updatePagination()` — it labels the bullets, makes them
//     focusable and sets `aria-current`, but attaches no listener. The bullets end up
//     focusable, ringed and named, with no library key handling: focusable but inert,
//     a WCAG 2.1.1 Keyboard (Level A) failure, and silent in the console.
//   • Swiper's ARROW listener is guarded by `el.tagName !== 'BUTTON'`; the pagination
//     one is not. The cluster's arrows are <button>s Swiper never key-binds, so they
//     keep their native activation and need nothing from here.
//
// So the handler performs the whole activation itself, in this order:
//   1. `preventDefault()` — kills the native <button> path (Enter on keydown, Space on
//      keyup) so it cannot add a second activation, and keeps Space from page-scrolling
//      the document out from under the focused bullet.
//   2. `stopPropagation()` — the event never reaches the pagination element, so if
//      Swiper's own listener is ever attached after all (a future refactor binding the
//      element before init would do it) it cannot fire a second click. That is what
//      makes "exactly one activation" true by construction rather than by relying on
//      the lifecycle above.
//   3. one explicit `target.click()` — Swiper's own pagination `click` delegate
//      (`modules/pagination.mjs` — `onBulletClick`) resolves the bullet and calls
//      `slideTo`. The LIBRARY still owns navigation: no parallel `slideTo` here, no
//      second pagination implementation.
// Auto-repeat keydowns are swallowed rather than re-fired, so holding a key cannot
// queue one click per repeat; a native <button> activates once per press too.
//
// Attachment is capture-phase, and it CANNOT sit on the <Swiper> root: Swiper's React
// wrapper routes every prop matching /on[A-Z]/ into its own event map instead of onto
// the container element, so an `onKeyDownCapture` there would silently never fire. It
// goes on the outer wrapper this component owns, which contains both the slider and
// the cluster, so React's capture pass runs before the bullet is reached. Hoisted to
// module scope for a stable reference, matching every other Swiper option here.
//
// Gallery.jsx deliberately keeps the `preventDefault()`-ONLY form and must not be
// changed to match: it does not supply `pagination.el`, so Swiper creates that element
// inside `.swiper` before a11y `init()` runs, its listener IS attached there, and a
// `click()` from this side would be the duplicate. Same symptom, opposite cause —
// which is exactly why the two are not a shared abstraction.
const BULLET_SELECTOR = '.swiper-pagination-bullet'
function activateBulletOnce(event) {
  if (event.key !== 'Enter' && event.key !== ' ') return
  const target = event.target
  if (typeof target?.matches !== 'function' || !target.matches(BULLET_SELECTOR)) return
  event.preventDefault()
  event.stopPropagation()
  if (event.repeat) return
  target.click()
}

// Accessibility config. Swiper defaults these four parameters to `null`, so without
// them the slider root would carry no role, no accessible name and no
// aria-roledescription, and its slides nothing identifying them as slides. Set, they
// make the slider a named GROUP announced as a carousel whose children are announced
// as slides — the structure the W3C WAI Carousels Tutorial asks for. `containerRole`
// is 'group' rather than 'region' because a named region is a landmark and this widget
// sits inside a section that already has a heading. `slideRole` already defaults to
// 'group'. `wrapperLiveRegion` stays enabled so Swiper creates the attribute with a
// correct initial value, but its VALUE is owned from there on by the effect below,
// because Swiper writes it once in `init()` and never revisits it.
const A11Y = {
  enabled: true,
  containerRole: 'group',
  containerRoleDescriptionMessage: 'carousel',
  containerMessage: 'Student and parent testimonials',
  itemRoleDescriptionMessage: 'slide',
}
// Keyboard config (WCAG 2.1.1): Left/Right arrow keys move between slides.
// `onlyInViewport` must stay false — Swiper v14's gate compares the carousel's
// page-coordinate offset against the window height, so a below-the-fold carousel,
// which this slider is on both pages that use it, would have its arrow keys silently
// ignored. `pageUpDown` is disabled so the module never hijacks native PageUp/PageDown
// scrolling. Keyboard navigation is user-initiated, so it stays fully allowed under
// prefers-reduced-motion, which only stops autoplay.
const KEYBOARD = { enabled: true, onlyInViewport: false, pageUpDown: false }
// Autoplay config (WCAG 2.2.2 "Pause, Stop, Hide"). The explicit, keyboard-operable
// Autoplay toggle below is the primary, always-available mechanism for stopping and
// restarting the automatic movement; these two flags decide who else may stop it.
//
// `disableOnInteraction: true` hands rotation over to the visitor the moment they
// drive the carousel themselves, and it is set for an ANNOUNCEMENT reason rather than
// a cosmetic one. An auto-rotating carousel must not announce every slide, so the
// slide wrapper is `aria-live="off"` while rotation runs — which also silences the
// slides the VISITOR reaches with the arrows, the bullets, the arrow keys or a swipe.
// Stopping rotation flips the wrapper to `polite` (see `setWrapperLive` and
// `syncRunningState` below), so their next move is announced. Swiper implements this
// flag through `stop()` — not `pause()` — for every non-internal transition and for
// `sliderFirstMove` (`modules/autoplay.mjs`), so `autoplayStop` fires and the toggle's
// `aria-pressed` and icon follow honestly. Autoplay-driven transitions pass
// `internal: true` and are still only `pause()`d, so the rotation itself is unaffected.
//
// A drag is the one user gesture that moves no focus, which is why the flag is needed
// at all: `sliderFirstMove` fires at the START of the drag, well before the slide
// changes, so the wrapper is already `polite` by the time it does. Every other path
// moves focus into the widget first and is caught by `handleFocusEnter` below, the
// earlier and therefore safer of the two hooks — `beforeTransitionStart` (where this
// flag acts) is emitted AFTER `updateActiveIndex()` and `updateSlidesClasses()` in
// Swiper's `slideTo`, so on its own it would flip the attribute one mutation too late.
//
// `pauseOnMouseEnter` is FALSE deliberately, and the hover pause is not dropped with
// it — the component performs it in `handlePointerEnter`/`handlePointerLeave` below,
// through the same `stop()`/`start()` calls the toggle uses. See AUTOPLAY STATE TRUTH
// in the JSDoc for why Swiper's own implementation cannot yield a truthful
// `aria-pressed`, icon or `aria-live` value.
const AUTOPLAY = { delay: 5000, disableOnInteraction: true, pauseOnMouseEnter: false }

// The single writer of the slide wrapper's `aria-live` value, and the single place the
// rule lives: `off` only while the content is genuinely auto-advancing, `polite`
// whenever rotation is stopped or disabled, so a slide the visitor reaches with the
// arrows, the bullets, the arrow keys or a swipe IS announced. Swiper's a11y module
// writes this attribute once during `init()` and never revisits it, so without this
// the value would go stale the moment rotation started or stopped. Called from BOTH
// the effect keyed on `isRunning` (which covers mount and live reduced-motion changes)
// and `syncRunningState` (which runs synchronously inside Swiper's `autoplayStart` /
// `autoplayStop` emit, so the attribute is correct before the slide DOM mutates rather
// than one React commit later). Module scope keeps it a stable reference and out of the
// render body; guarded for instance readiness and SSR.
function setWrapperLive(swiper, running) {
  const wrapperEl = swiper?.wrapperEl
  if (!wrapperEl) return
  wrapperEl.setAttribute('aria-live', running ? 'off' : 'polite')
}

// Stop rotation the way this component always stops it, in one place, so the
// visitor-initiated stop (`handleFocusEnter`), the explicit toggle press
// (`togglePlay`) and the hover pause cannot drift apart.
//
// `resume()` before `stop()` clears a transient suspension (a backgrounded tab, a
// touch drag, an in-flight transition). `stop()` only clears `running`, so stopping
// while `paused` is set would leave that flag stuck true — and because `pause()` bails
// out when it is already set, the transition-internal pause would stay dead for the
// rest of the session even after autoplay restarts. `stop()` is also the ONLY call
// that emits `autoplayStop`, which is what keeps `aria-pressed`, the icon and the
// wrapper's `aria-live` honest; `pause()` would leave `running` true and all three
// wrong.
function stopAutoplay(autoplay) {
  if (!autoplay?.running) return
  if (autoplay.paused) autoplay.resume()
  autoplay.stop()
}

export default function TestimonialSlider({ items = testimonials, className, ...props }) {
  // Reactive reduced-motion, so autoplay can be stopped and started live rather than
  // frozen at the value read on first paint.
  const reduced = useReducedMotion()

  // Live handle to the Swiper instance, so the toggle, the hover handlers and the
  // reduced-motion effect can drive its autoplay controller. Every hook here is
  // declared UNCONDITIONALLY, before the early return below, so hook order is stable
  // on every render.
  const swiperRef = useRef(null)
  // The single exposed state: "the content is auto-advancing right now". It mirrors
  // `autoplay.running`, which with `pauseOnMouseEnter` off only `start()`/`stop()` can
  // change — exactly the calls this component makes — so the toggle's label, its
  // `aria-pressed` and the wrapper's `aria-live` all derive from it and agree by
  // construction.
  const [isRunning, setIsRunning] = useState(!reduced)
  // Whether a mouse pointer is currently resting on the slider. A ref, not state:
  // nothing renders from it, and `togglePlay` must read its LIVE value.
  const pointerInsideRef = useRef(false)
  // Latch: true only when the hover handler is what stopped autoplay, so leaving
  // restarts it while an autoplay the visitor stopped on purpose — or one disabled by
  // reduced motion — stays stopped. Any explicit toggle press clears it, so a
  // deliberate choice always outranks a pointer that never moved.
  const resumeOnPointerLeaveRef = useRef(false)

  // The previous/next arrow and pagination ELEMENTS, handed to Swiper's `navigation`
  // and `pagination` options so all three render inside the control cluster below
  // instead of Swiper's absolutely-positioned overlays. Held in STATE, not in refs, on
  // purpose: the cluster is a LATER SIBLING than <Swiper>, and React attaches a later
  // sibling's refs only after an earlier sibling's layout effect has run — which is
  // precisely when Swiper initialises — so a plain ref would still read `null` at init
  // and the controls would never be wired. These callback-ref setters trigger one extra
  // render at mount with the real nodes, and the wrapper then re-runs
  // `navigation.init()` / `pagination.init()` alone, leaving the active slide and the
  // autoplay controller untouched. Every render after that passes equal values, so
  // nothing is updated again.
  const [prevEl, setPrevEl] = useState(null)
  const [nextEl, setNextEl] = useState(null)
  const [paginationEl, setPaginationEl] = useState(null)

  // React to LIVE reduced-motion changes on the ALREADY-MOUNTED carousel: passing
  // `autoplay={false}` alone does not reliably halt a controller that is already
  // running, so drive it explicitly — stop the moment the visitor requests reduced
  // motion, restart when they allow motion again. Guarded for instance/controller
  // readiness and SSR; the two autoplay events wired below keep `isRunning` in sync
  // with the controller, so no manual state update is needed here.
  //
  // The hover latch is reconciled here too, in both directions. Turning reduced
  // motion ON clears it, so a pointer that happens to be resting on the slider
  // cannot restart autoplay when it eventually leaves. Turning motion back ON while
  // the pointer is still inside ARMS it instead of starting — the visitor is hovering,
  // so honouring the hover pause is the truthful behaviour, and leaving the carousel
  // will start the rotation exactly as it would have any other time.
  useEffect(() => {
    const swiper = swiperRef.current
    if (!swiper?.autoplay) return
    if (reduced) {
      resumeOnPointerLeaveRef.current = false
      swiper.autoplay.stop()
    } else if (pointerInsideRef.current) {
      resumeOnPointerLeaveRef.current = true
    } else {
      swiper.autoplay.start()
    }
  }, [reduced])

  // Own the hover pause (see AUTOPLAY STATE TRUTH in the JSDoc). Native listeners on
  // Swiper's OWN root element, for two reasons: it scopes the pause to exactly the area
  // Swiper's `pauseOnMouseEnter` covers — the slides themselves, NOT the control
  // cluster, which is a later sibling and is where `pagination.el` puts the bullets, so
  // hovering a control is not a hover over the slides — and it is the only way to reach
  // that element, because Swiper's React wrapper swallows any prop matching /on[A-Z]/ as
  // a Swiper event name instead of forwarding it to the container.
  //
  // `[]` deps: the instance arrives through `onSwiper`, which Swiper's wrapper calls
  // from its own mount layout effect — and a child's layout effect runs before a
  // parent's passive effect, so `swiperRef.current` is already populated here. The
  // listeners are removed on unmount.
  //
  // The `pointerType` guard mirrors Swiper's own: a hover pause is meaningless on
  // touch, where there is no persistent pointer to rest on the carousel.
  useEffect(() => {
    const swiper = swiperRef.current
    const el = swiper?.el
    if (!el) return

    const handlePointerEnter = (event) => {
      if (event.pointerType !== 'mouse') return
      pointerInsideRef.current = true
      const autoplay = swiperRef.current?.autoplay
      // Only suspend rotation that is actually running. If it is already stopped —
      // by the visitor or by reduced motion — leave it alone and, crucially, leave
      // the latch clear so moving away does not silently restart it.
      if (!autoplay?.running) return
      resumeOnPointerLeaveRef.current = true
      autoplay.stop()
    }

    const handlePointerLeave = (event) => {
      if (event.pointerType !== 'mouse') return
      pointerInsideRef.current = false
      if (!resumeOnPointerLeaveRef.current) return
      resumeOnPointerLeaveRef.current = false
      swiperRef.current?.autoplay?.start()
    }

    el.addEventListener('pointerenter', handlePointerEnter)
    el.addEventListener('pointerleave', handlePointerLeave)
    return () => {
      el.removeEventListener('pointerenter', handlePointerEnter)
      el.removeEventListener('pointerleave', handlePointerLeave)
    }
  }, [])

  // Own the slide wrapper's `aria-live` value (see `setWrapperLive` above and the
  // Accessibility section of the JSDoc). This effect covers the paths no autoplay
  // event reports: the first paint, and a live reduced-motion change that renders the
  // widget with rotation already disabled. Every rotation state change Swiper DOES
  // report is written synchronously by `syncRunningState`, so the attribute is never a
  // commit behind the slide it describes. Guarded for instance readiness and SSR.
  useEffect(() => {
    setWrapperLive(swiperRef.current, isRunning)
  }, [isRunning])

  // Render nothing when there is no content — AFTER the hooks so their order
  // never changes across renders. Keeps callers free of empty-state guards.
  if (!items?.length) return null

  // Single source of truth for every exposed state: read `running` straight off the
  // LIVE autoplay controller rather than inferring it. With `pauseOnMouseEnter` off,
  // `running` changes ONLY through `start()`/`stop()` — the toggle, the hover handlers,
  // the focus handover, the reduced-motion effect and Swiper's own
  // `disableOnInteraction` stop, which is also a `stop()` — so it means exactly "the
  // content is auto-advancing", and `aria-pressed`, the toggle's icon and the wrapper's
  // `aria-live` all derive from it. The sibling `paused` flag is deliberately never
  // read: Swiper raises and clears it twice on every autoplay transition, so surfacing
  // it would flicker the control on every cycle.
  const syncRunningState = (swiper) => {
    const running = Boolean(swiper?.autoplay?.running)
    // Written SYNCHRONOUSLY, inside Swiper's own `autoplayStart` / `autoplayStop`
    // emit, and deliberately not left to the effect above. Swiper's `slideTo` runs
    // `updateActiveIndex()` and `updateSlidesClasses()` BEFORE it emits
    // `beforeTransitionStart` — the hook `disableOnInteraction` stops rotation from —
    // so a value applied on the next React commit would arrive after the very slide
    // mutation it is supposed to make announceable. Writing it here keeps the
    // attribute at most one emit, never one commit, behind the truth.
    setWrapperLive(swiper, running)
    setIsRunning(running)
  }

  // Explicit user control (WCAG 2.2.2): stop/start Swiper's autoplay. Reads the LIVE
  // controller — never React state — so the action can never contradict the state the
  // button reports, not even for a single frame. Guarded so it is a no-op if the
  // instance or its autoplay controller is not ready. `autoplayStart` / `autoplayStop`
  // then resync everything through `syncRunningState`.
  //
  // Either branch clears the hover latch, so an explicit press always outranks a
  // pointer still resting on the slider: pressing Play means play until told
  // otherwise, and moving the mouse away afterwards must not stop or restart
  // anything the visitor did not ask for.
  const togglePlay = () => {
    const autoplay = swiperRef.current?.autoplay
    if (!autoplay) return
    resumeOnPointerLeaveRef.current = false
    if (autoplay.running) {
      stopAutoplay(autoplay)
      return
    }
    // The controller is stopped here — the branch above returns for a running one — so
    // `start()` is what honours the toggle. `start()` emits `autoplayStart`, which is
    // subscribed below and resyncs `isRunning` through `syncRunningState`, so
    // `aria-pressed`, the icon and the wrapper's `aria-live` all follow the controller
    // rather than this call site.
    autoplay.start()
  }

  // Hand rotation over to the visitor the moment they take keyboard or pointer control
  // of the widget — the W3C WAI carousel pattern's "stop the rotation when it receives
  // focus", and the half of the announcement fix `AUTOPLAY`'s `disableOnInteraction`
  // cannot cover on its own.
  //
  // Why focus and not the navigation itself: focus ALWAYS lands before activation.
  // Tabbing to an arrow or a bullet focuses it before Enter or Space fires, and a mouse
  // press focuses the button before the click. Stopping here therefore flips the slide
  // wrapper to `aria-live="polite"` BEFORE the slide changes, so the very first slide
  // the visitor reaches is announced rather than the one after it.
  //
  // React's `onFocus` is `focusin`, so it also fires as focus moves BETWEEN the
  // controls inside this widget. Only an arrival from OUTSIDE counts as taking control:
  // without the `contains` guard, pressing the toggle and then moving to an arrow would
  // stop the rotation the visitor had just explicitly asked for. Leaving the widget and
  // coming back is a fresh arrival and does stop it again. `relatedTarget` is the
  // element losing focus and is `null` when focus enters from outside the document,
  // which `contains` correctly treats as an arrival.
  const handleFocusEnter = (event) => {
    if (event.currentTarget.contains(event.relatedTarget)) return
    resumeOnPointerLeaveRef.current = false
    stopAutoplay(swiperRef.current?.autoplay)
  }

  return (
    // `onKeyDownCapture` makes this wrapper the single Enter/Space activation path for
    // the pagination bullets (see `activateBulletOnce` above, including why it cannot
    // live on the <Swiper> root). `onFocus` is React's `focusin`, so it fires for the
    // whole widget and is where rotation hands over to the visitor (see
    // `handleFocusEnter` above).
    <div
      className={cn('relative', className)}
      onKeyDownCapture={activateBulletOnce}
      onFocus={handleFocusEnter}
    >
      <Swiper
        onSwiper={(swiper) => {
          swiperRef.current = swiper
        }}
        // Exactly the two events that can change `running` — the only flag any exposed
        // state derives from. `autoplayPause`/`autoplayResume` are deliberately NOT
        // subscribed: with `pauseOnMouseEnter` off, the only pauses left are
        // transition-internal (twice per rotation), a backgrounded tab and a touch drag,
        // none of which the visitor can act on, and observing them would flicker the
        // label.
        onAutoplayStart={syncRunningState}
        onAutoplayStop={syncRunningState}
        modules={MODULES}
        spaceBetween={24}
        slidesPerView={1}
        // Explicit arrow ELEMENTS, not the bare `navigation` boolean: this keeps the
        // arrows out of Swiper's absolute overlay, whose geometry is scoped to arrow
        // classes the cluster's buttons never carry, and it stops the React wrapper
        // rendering those overlay divs at all.
        navigation={{ prevEl, nextEl }}
        // Keeps BOTH arrows enabled, focusable and at full brand contrast for the whole
        // session: `Navigation.update()` and `A11y.updateNavigation()` both short-circuit
        // on `rewind`, so neither the native `disabled` property nor the
        // `tabindex="-1"` / `aria-disabled` / low-opacity treatment is applied at the
        // first or last slide. The arrows wrap exactly as autoplay wraps, so the two
        // controls agree.
        rewind
        // Explicit pagination ELEMENT, for the same reason as the arrows: it makes the
        // cluster ONE DOM group rather than a screen region that merely looks like one,
        // and it stops the wrapper rendering a second band inside the slider. Spread
        // from the hoisted constant so only the live element is per-render.
        pagination={{ ...PAGINATION, el: paginationEl }}
        a11y={A11Y}
        keyboard={KEYBOARD}
        autoplay={reduced ? false : AUTOPLAY}
        breakpoints={BREAKPOINTS}
        {...props}
      >
        {items.map((t, i) => (
          // No height utility here on purpose: slide height is owned by the un-layered
          // `.swiper .swiper-slide { height: auto }` rule in src/index.css, which lets
          // the flex row stretch every slide to the tallest card so <ReviewCard>'s
          // full-height class resolves against a definite height. A utility here would
          // be inert (see the cascade section of the JSDoc).
          <SwiperSlide key={t.name || i}>
            <ReviewCard review={t} className="h-full" />
          </SwiperSlide>
        ))}
      </Swiper>

      {/* ONE control cluster — a single container holding every control this carousel
          exposes: the pagination band on the first row, then the arrows and the pause
          toggle on the second. One DOM parent, not merely one screen region, which is
          why the pagination element is handed to Swiper through `pagination.el`.
          Rendered AFTER the slider in DOM order, which is also its visual order, so
          focus order matches what the visitor sees, and the rows run dots → arrows →
          toggle so the most-used control is reached first. The row gap is the cluster's
          own spacing — the stylesheet deliberately adds no margin to a relocated
          band. */}
      <div className="mt-4 flex flex-col items-center gap-4">
        {/* Swiper populates this element with the pagination bullets. It carries the
            base `swiper-pagination` class because Swiper adds only its state and
            modifier classes, never the base one, and every stylesheet rule the band
            needs — static flow, the bullet tap target, the brand colour and the ≥3:1
            inactive contrast — is declared for this position as well as the in-slider
            one. Swiper's a11y module names each bullet, so this container needs no
            label and is deliberately left free of ARIA. */}
        <div ref={setPaginationEl} className="swiper-pagination" />

        {/* Arrows and the pause toggle. The row wraps at narrow widths, so it fits the
            smallest supported viewport without horizontal overflow while every control
            keeps its ≥44×44px target. */}
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-4">
          {/* Icon-only arrows: the canonical <Button> renders a real, permanently
              focusable <button> with the ≥44px target and the shared focus ring, which is
              unobstructed because these do not overlay a card. The glyph is decorative,
              so each control carries its own `aria-label` — Swiper's a11y module labels
              only the arrows it owns at init time, and these are supplied afterwards, so
              nothing overwrites these names. */}
          <Button ref={setPrevEl} variant="outline" size="sm" aria-label="Previous testimonial">
            <FaChevronLeft aria-hidden="true" className="h-4 w-4" />
          </Button>
          <Button ref={setNextEl} variant="outline" size="sm" aria-label="Next testimonial">
            <FaChevronRight aria-hidden="true" className="h-4 w-4" />
          </Button>

          {/* Autoplay toggle — the required mechanism for stopping auto-rotating
              content. Rendered only when autoplay is actually active; under reduced
              motion nothing auto-moves, so no control is needed.

              ONE coherent toggle-button pattern: a STABLE name naming the thing being
              toggled, plus `aria-pressed` carrying its on/off state (pressed = the
              content is auto-advancing). Naming the ACTION instead would announce as
              "Pause autoplay, toggle button, pressed" and leave it ambiguous whether
              "pressed" meant pausing was in effect or rotation was; naming the object
              has exactly one reading, and the programmatic state is kept rather than
              dropped. Sighted users get the state as SHAPE from the icon, so it never
              rides on colour or on label text: pause bars while it is running, play
              triangle while it is stopped. Both the icon and `aria-pressed` derive from
              the same controller-backed `isRunning`, so they cannot disagree — and
              because the hover pause, the focus handover and `disableOnInteraction` all
              move that same value through `stop()`, the control reports what is
              actually happening rather than what was last asked for.

              A stable label is also a stable WIDTH, which is why no minimum-width
              reservation is needed here any more: the two icons share one box and the
              text no longer changes, so pressing the toggle cannot resize it or re-flow
              the centred row and nudge the arrows sideways under the pointer.

              The wrapper below `sm` is a NON-OVERLAP reservation, not decoration, and
              it is the one piece of geometry the stable label cost us. At the narrowest
              supported widths an inline arrows-plus-toggle row centres wide enough to
              park the toggle's right end under the fixed WhatsApp widget's column,
              leaving its trailing glyph covered and its right edge pointer-dead.
              `basis-full` on this WRAPPER forces the flex line to break, and because
              the wrapper — not the button — is what stretches, the button keeps its
              intrinsic width and `justify-center` re-centres it clear of that column.
              `basis-full` on the button itself does not work: it either stretches to
              the full line and sits further under the widget, or a `max-w-max` clamp
              holds its hypothetical size inside the line's capacity so the break never
              happens. `sm:contents` then removes the wrapper from layout entirely from
              640px up, where there is room for the single row the one-cluster design
              calls for, so the arrows and the toggle sit together again with no
              offset. */}
          {!reduced ? (
            <div className="flex basis-full justify-center sm:contents">
              <Button
                type="button"
                variant="outline"
                size="md"
                aria-pressed={isRunning}
                onClick={togglePlay}
              >
                {isRunning ? (
                  <FaPause aria-hidden="true" className="h-4 w-4" />
                ) : (
                  <FaPlay aria-hidden="true" className="h-4 w-4" />
                )}
                Autoplay
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
