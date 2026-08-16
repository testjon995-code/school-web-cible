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
 *   • The 12-step bottom-padding utility on the <Swiper> root (spelled out rather
 *     than written as a class token, because Tailwind v4 scans raw source text —
 *     comments included — and would otherwise emit a rule no element uses)
 *     computed to `padding-bottom: 0px`, because `swiper.css` declares
 *     `.swiper { padding: 0 }` un-layered — so the absolutely-positioned
 *     pagination band sat ON TOP of the cards.
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
 *     insets the slide row so <Card>'s `shadow-md` hover bleed is no longer
 *     clipped by Swiper's `overflow: hidden`, which is deliberately left in place
 *     because unclipping it would let off-screen slides reintroduce horizontal
 *     page overflow. The block-end step is what contains that shadow's 14px tail —
 *     its deepest extent — and it is also the reservation the in-slider pagination
 *     band needs on the carousels that keep one (Gallery); it replaces the inert
 *     bottom-padding utility this root used to carry in both roles. (That utility
 *     is described rather than named here on purpose: Tailwind v4 scans raw source
 *     text for candidates, so writing the class token in prose would make the
 *     compiler emit a rule for a class nothing renders.)
 *   • `.swiper-pagination.swiper-pagination { position: static }` — takes Swiper's
 *     pagination element out of its absolute `bottom: 8px` / `z-index: 10` float
 *     and returns it to normal flow, so overlap with card content becomes
 *     structurally impossible instead of merely arithmetically avoided. This
 *     component supplies `pagination.el` (see the control cluster below), which
 *     hands Swiper an element inside the cluster INSTEAD of one inside `.swiper` —
 *     and that is exactly why the reset has to be selector-scoped to the element
 *     rather than to a child of the slider: the sibling rule
 *     `.swiper > .swiper-pagination` covers the in-slider default that Gallery
 *     still uses, and cannot reach this one. The bullet tap-target rule is
 *     likewise declared for BOTH positions, as is the non-colour CURRENT-slide cue
 *     that grows the active dot, and the brand colour variables are declared on
 *     `.swiper-pagination` as well as `.swiper` — so relocating the band costs it
 *     none of its geometry, tap area, state cue or colour.
 *   • `.swiper, .swiper-button-prev, .swiper-button-next, .swiper-pagination { --swiper-*: … }`
 *     — repoints Swiper's control colours at `--color-primary-600` and lifts the
 *     inactive bullet to ≈3.59:1 (WCAG 1.4.11). No colour is set here. The
 *     `.swiper-pagination` selector in that list is what carries the brand colour
 *     to the relocated band, which inherits nothing from `.swiper` any more.
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
 * ONE CONTROL CLUSTER: every control this carousel exposes lives inside ONE
 * container element directly beneath the slides — the pagination band on the first
 * row, then the previous arrow, the next arrow and the Play/Pause toggle on the
 * second. One DOM parent, not merely one screen region: the pagination element is
 * handed to Swiper through `pagination.el` rather than left inside `.swiper`, so a
 * reader of the markup, an assistive-technology user walking the tree and a
 * developer changing the layout all see the same single group. That structural
 * decision replaces three separate control locations (a toggle floated above the
 * slider, arrows overlaid at `top: 50%` on top of the card text, and a pagination
 * band painted over the last line of every card) and resolves five reported
 * symptoms at once: arrows overlapping content, arrow positioning, arrows hard to
 * tap on mobile, pagination mispositioned, and controls behaving inconsistently.
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
 * unambiguous. Hover still pauses rotation, but this component now OWNS that
 * behaviour rather than delegating it to Swiper (see AUTOPLAY STATE TRUTH below),
 * and `disableOnInteraction: false` still keeps a swipe from silently killing
 * autoplay. Under reduced motion nothing auto-moves, so the toggle is
 * intentionally not rendered.
 *
 * AUTOPLAY STATE TRUTH (why the hover pause is implemented here, not by Swiper).
 * `isRunning` drives the label, `aria-pressed` AND the wrapper's `aria-live`, so
 * it must never disagree with what the visitor can see happening. Swiper exposes
 * two flags: `running` (only `start()`/`stop()` change it) and `paused` (a
 * transient suspension). Neither one, alone, could tell the truth:
 * - `paused` is unusable as a signal. With `disableOnInteraction: false`, Swiper's
 *   own `beforeTransitionStart` handler calls `pause()` at the start of EVERY slide
 *   transition and resumes on `transitionend`, so `paused` flips twice per
 *   rotation. Measured: a ~316ms pause/resume pair on every 5s cycle. Rendering it
 *   would flash the label and icon for ~6% of every cycle — misinforming the
 *   visitor rather than informing them.
 * - `running` alone was ALSO untruthful, and that was the real defect. Swiper's
 *   `pauseOnMouseEnter` suspends rotation through the same `pause()` call, leaving
 *   `running === true`, so the toggle went on reading "Pause autoplay" with
 *   `aria-pressed="true"` while nothing was moving. Measured before this fix: a
 *   67.6s hover during which ZERO slides advanced and the control never changed.
 *   The two pause sources are indistinguishable from outside Swiper — both emit
 *   `autoplayPause` and nothing else — because the flag that separates them
 *   (`pausedByPointerEnter`) is a module-private closure variable.
 * - Worse, the mismatch could not be fixed by relabelling. While Swiper's own hover
 *   pause is in effect its `onTransitionEnd` handler refuses to resume, so a
 *   `resume()` (or a `stop()` + `start()`) advances exactly one slide and then
 *   freezes again. A control offering "Play autoplay" in that state could not have
 *   honoured its own label.
 * So `pauseOnMouseEnter` is set to `false` and this component performs the hover
 * pause itself, through the SAME `stop()`/`start()` controls the toggle uses, from
 * `pointerenter`/`pointerleave` listeners on the slider element (mouse pointers
 * only, mirroring Swiper's own `pointerType` guard). Nothing is withdrawn — hover
 * still suspends rotation and leaving still resumes it — but it now moves the one
 * flag that is observable, so `isRunning` is exactly "the content is auto-
 * advancing", every state the widget exposes derives from it, and only the two
 * events that can change it (`autoplayStart`, `autoplayStop`) are subscribed. The
 * transition-internal pause is therefore never observed at all, which is what keeps
 * the label free of per-rotation flicker. One deliberate behavioural nuance:
 * `stop()` resets the delay, so leaving the carousel restarts the full 5s rather
 * than resuming the remainder — the reader gets a whole interval back, which is the
 * kinder of the two behaviours for the audience WCAG 2.2.2 exists for.
 * `togglePlay` still reads the LIVE controller rather than React state, so the
 * button's ACTION can never contradict its label even for one frame, and it clears
 * the hover latch so an explicit press always wins over a pointer that is still
 * resting on the slider.
 *
 * Accessibility (WCAG AA):
 * - The carousel is exposed as a NAMED CAROUSEL GROUP: the `a11y` options set
 *   `role="group"`, an `aria-label`, and `aria-roledescription="carousel"` on the
 *   slider root, and `aria-roledescription="slide"` on every slide alongside
 *   Swiper's own `role="group"` and "N / M" slide label. `group` is deliberate
 *   rather than `region`: a named `region` is a landmark, and this widget sits
 *   inside a section that already has its own heading, so a landmark here would
 *   only add noise to the landmark list — `group` is the role the W3C WAI
 *   Carousels Tutorial uses for a carousel that is not itself a landmark. All four
 *   parameters default to `null`, which is why the widget was previously unnamed
 *   and its slides undescribed.
 * - The slide wrapper's `aria-live` FOLLOWS the rotation state instead of being
 *   frozen at its initial value. The WAI rule is that an auto-rotating carousel
 *   must not announce every slide whereas a user-driven one should, and Swiper's
 *   `wrapperLiveRegion` default implements exactly that — but only ONCE: its a11y
 *   module writes the attribute inside `init()` and never revisits it, so the value
 *   went stale the moment the rotation state changed. Measured in both directions:
 *   after pressing Pause the wrapper stayed `"off"`, and a slide the visitor then
 *   reached with the arrows was announced by nothing at all (Swiper's separate
 *   `.swiper-notification` region was empty too); and a carousel that mounted under
 *   reduced motion stayed `"polite"` after the visitor allowed motion again, so
 *   every automatic rotation was announced unsolicited every ~5s, indefinitely.
 *   Swiper never re-initialises on a prop change (the wrapper node is identical
 *   before and after), so its `init()` can never run a second time to correct
 *   itself. An effect therefore owns the attribute: `off` while automatic rotation
 *   is running, `polite` whenever it is stopped or disabled. Because it is keyed on
 *   the same `isRunning` value as the toggle, the announcement policy and the
 *   visible control can never disagree.
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
 * from `src/index.css` (`h-full`, `mt-4`, `gap-4`, `gap-x-2`, `gap-y-4`,
 * `min-w-52`) with zero hardcoded style values and zero arbitrary bracket
 * utilities; cluster spacing composes even multiples of the 8px scale. The one
 * non-Tailwind class in the markup is Swiper's own `swiper-pagination`, which is a
 * third-party API hook rather than a style declaration — the band's appearance
 * still comes entirely from the stylesheet's override zone. The caller `className`
 * is merged LAST
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
 * The two unavoidable exceptions are `navigation` and `pagination`, which must
 * carry live DOM elements and therefore cannot be frozen module constants
 * (`PAGINATION` still holds every static pagination option; only `el` is added per
 * render). They are safe for two reasons. First, the control elements are held in
 * STATE rather than in refs: the control cluster is a later sibling than <Swiper>,
 * and React attaches a later sibling's refs only AFTER an earlier sibling's layout
 * effect has run — which is exactly when Swiper initialises — so a plain ref would
 * still have been `null` at init. Callback-ref setters re-render once, at mount,
 * with the real nodes. Second, Swiper's React wrapper diffs watched object params
 * BY VALUE, not by identity, so that one change re-runs `navigation.init()` and
 * `pagination.init()` alone (the active slide and the autoplay controller are
 * untouched) and every subsequent render — including every ancestor re-render —
 * sees identical values and re-initialises nothing. Supplying `pagination.el` also
 * stops the wrapper rendering its own band inside `.swiper`, so no second,
 * overlapping set of bullets ever exists — the same guarantee the explicit arrow
 * elements give.
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
// `el` is deliberately NOT part of this constant: it is a live DOM node, so it is
// merged in at render time (see the `pagination` prop below) to keep this object
// static and its reference stable. The element it points at lives in the control
// cluster rather than inside `.swiper`, which is what makes the cluster ONE DOM
// group. Every stylesheet rule the band depends on is declared for that position
// too — `.swiper-pagination.swiper-pagination { position: static }` for the
// static-flow placement, the two-selector bullet rule for the ~26px tap target,
// and `.swiper-pagination` in the brand-colour selector list for the ≥3:1 inactive
// contrast — so nothing is lost by moving it out. See the cascade section of the
// JSDoc above.
const PAGINATION = { clickable: true, bulletElement: 'button' }

// The one thing `bulletElement: 'button'` does NOT fix, and the reason this
// handler exists. Swiper's a11y module attaches its own `keydown` listener to the
// pagination container whenever pagination is clickable, and that listener ends by
// calling `targetEl.click()` on the focused bullet WITHOUT calling
// `preventDefault()` (node_modules/swiper/modules/a11y.mjs — `onEnterOrSpaceKey`).
// With Swiper's default `<span role="button">` bullet that synthetic click is the
// only activation path, so upstream never hits the problem. A native <button>
// bullet has a second, built-in path — Enter activates on keydown, Space on keyup —
// so ONE key press produced TWO clicks and drove `slideTo()` twice. Measured
// before this handler: `clicks: 2, keydowns: 1` on both keys and on four different
// bullets, with a real mouse click producing exactly 1; measured after: 1 click per
// press. The duplicate was invisible on screen only because both clicks resolve to
// the same page index — an idempotence this component must not rely on.
//
// Note that Swiper guards the equivalent ARROW listener behind
// `el.tagName !== 'BUTTON'` for exactly this reason, but applies the pagination
// listener unconditionally; the arrows in the control cluster below are therefore
// unaffected and need no handling.
//
// Cancelling the NATIVE path (rather than suppressing Swiper's) is deliberate: it
// leaves the library owning navigation — no parallel `slideTo` call, no second
// pagination implementation — and it keeps the Space key from page-scrolling the
// document out from under the focused bullet, which is the other half of what the
// native <button> bought us (a measured 723px jump before it).
//
// Attachment is capture-phase, and it CANNOT be placed on the <Swiper> root:
// Swiper's React wrapper routes every prop matching /on[A-Z]/ into its own event
// map instead of onto the container element (shared/update-on-virtual-data.mjs),
// so an `onKeyDownCapture` there would silently never fire. It goes on the outer
// wrapper this component owns, which contains the slider, so React's capture pass
// runs before the pagination element's own bubble listener. Hoisted to module
// scope so the reference is stable across renders, matching every other Swiper
// option in this file. Gallery.jsx carries the identical handler for its own
// carousel — one shared pattern, deliberately not a shared abstraction, because
// each component owns its own root.
const BULLET_SELECTOR = '.swiper-pagination-bullet'
function preventDuplicateBulletActivation(event) {
  if (event.key !== 'Enter' && event.key !== ' ') return
  const target = event.target
  if (typeof target?.matches !== 'function' || !target.matches(BULLET_SELECTOR)) return
  event.preventDefault()
}

// Accessibility config. Swiper defaults these four parameters to `null`, which is
// why the carousel was previously an UNNAMED, UNDESCRIBED widget: its root had no
// role, no accessible name and no aria-roledescription, and its slides carried
// role="group" with an "N / M" label but nothing identifying them as slides.
// Setting them makes the slider a named GROUP announced as a carousel whose
// children are announced as slides, which is the structure the W3C WAI Carousels
// Tutorial asks for. `containerRole` is deliberately 'group' rather than 'region':
// a named `region` is a landmark, and this widget sits inside a section that
// already has its own heading, so a landmark here would only add noise to the
// landmark list. `slideRole` already defaults to 'group'. `wrapperLiveRegion`
// stays enabled so Swiper still CREATES the attribute and gives it a correct initial
// value, but its VALUE is owned from here on by the effect in the component below,
// because Swiper writes it once in `init()` and never revisits it (see the
// Accessibility section of the JSDoc for the measured consequences).
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
// Autoplay config (WCAG 2.2.2 "Pause, Stop, Hide"). `disableOnInteraction: false`
// keeps a swipe or an arrow press from silently killing autoplay for the rest of the
// session. The explicit, keyboard-operable Play/Pause toggle below is the primary,
// always-available mechanism to stop the automatic movement.
//
// `pauseOnMouseEnter` is set to FALSE deliberately, and the hover pause is NOT
// dropped with it — the component performs it itself, in `handlePointerEnter` /
// `handlePointerLeave` below, through the same `stop()`/`start()` calls the toggle
// uses. Swiper's own implementation suspends rotation through `pause()`, which
// leaves `autoplay.running` true and is indistinguishable from the pause it raises
// on every slide transition, so no truthful label, `aria-pressed` or `aria-live`
// value could be derived while it was in charge. See AUTOPLAY STATE TRUTH in the
// JSDoc above for the measurements behind that decision.
const AUTOPLAY = { delay: 5000, disableOnInteraction: false, pauseOnMouseEnter: false }

export default function TestimonialSlider({ items = testimonials, className, ...props }) {
  // Reactive reduced-motion (shared hook, single source of truth): re-renders
  // this component when the OS/browser setting changes WHILE the page is open,
  // so autoplay can be stopped/started live rather than being frozen at the
  // value read on first paint. When true, autoplay is disabled so the carousel
  // never moves on its own.
  const reduced = useReducedMotion()

  // Live handle to the Swiper instance so the Play/Pause toggle — and the
  // reduced-motion effect below — can drive its autoplay controller.
  // `isRunning` mirrors the controller's `running` flag; it starts running only
  // when motion is allowed. ALL hooks are declared UNCONDITIONALLY at the top
  // level — before the early return below — so hook order is stable every render
  // (react/rules-of-hooks).
  const swiperRef = useRef(null)
  // `isRunning` is the single exposed state: "the content is auto-advancing right
  // now". It mirrors `autoplay.running`, which — with `pauseOnMouseEnter` off — only
  // `start()`/`stop()` can change, and those are exactly the two calls the toggle,
  // the hover handlers and the reduced-motion effect make. So it drives the toggle's
  // label, its `aria-pressed` and the wrapper's `aria-live`, and all three agree by
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

  // The previous/next arrow and pagination ELEMENTS, handed to Swiper's
  // `navigation` and `pagination` options so all three render inside the control
  // cluster below instead of Swiper's absolutely-positioned overlays. Held in
  // STATE, not in refs, on purpose: the cluster is a LATER SIBLING than <Swiper>,
  // and React attaches a later sibling's refs only after an earlier sibling's
  // layout effect has already run — which is precisely when Swiper's React wrapper
  // initialises the instance — so a plain ref would still read `null` at init and
  // the controls would never be wired. These callback-ref setters trigger exactly
  // one extra render at mount with the real nodes, and Swiper's wrapper then
  // re-runs `navigation.init()` / `pagination.init()` alone (the active slide and
  // the autoplay controller are left untouched). Every render after that passes
  // identical values, and because the wrapper diffs watched object params by VALUE
  // rather than by identity, nothing is re-initialised again — the same guarantee
  // the hoisted constants above give.
  const [prevEl, setPrevEl] = useState(null)
  const [nextEl, setNextEl] = useState(null)
  const [paginationEl, setPaginationEl] = useState(null)

  // React to LIVE reduced-motion changes on the ALREADY-MOUNTED carousel (m12):
  // passing `autoplay={false}` alone does not reliably halt an autoplay
  // controller that is already running, so drive it explicitly — stop the moment
  // the user requests reduced motion, restart when they allow motion again.
  // Guarded for instance/controller readiness and SSR; the two autoplay events
  // wired below keep `isRunning` (and so the label, `aria-pressed` and `aria-live`)
  // in sync with the controller, so no manual state update is needed here.
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
  // Swiper's OWN root element, for two reasons: it scopes the pause to exactly the
  // area Swiper's `pauseOnMouseEnter` covered — the slides themselves, and NOT the
  // control cluster (a later sibling, which is also where `pagination.el` now puts
  // the bullets, so hovering a control is not a hover over the slides) — and it is
  // the only
  // way to reach that element, because Swiper's React wrapper swallows any prop
  // matching /on[A-Z]/ as a SWIPER event name instead of forwarding it to the
  // container, so an `onPointerEnter` prop would silently never fire.
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

  // Own the slide wrapper's `aria-live` value (see the Accessibility section of the
  // JSDoc). Swiper's a11y module writes it once during `init()` and never revisits
  // it, and it never re-initialises on a prop change, so the attribute went stale
  // the moment rotation started or stopped. Keyed on `isRunning`, it now says `off`
  // only while the content is genuinely auto-advancing — an auto-rotating carousel
  // must not announce every slide — and `polite` whenever rotation is stopped or
  // disabled, so a slide the visitor reaches with the arrows, the bullets or the
  // keyboard IS announced. Guarded for instance readiness and SSR.
  useEffect(() => {
    const wrapperEl = swiperRef.current?.wrapperEl
    if (!wrapperEl) return
    wrapperEl.setAttribute('aria-live', isRunning ? 'off' : 'polite')
  }, [isRunning])

  // Render nothing when there is no content — AFTER the hooks so their order
  // never changes across renders. Keeps callers free of empty-state guards.
  if (!items?.length) return null

  // Single source of truth for every exposed state: read `running` straight off the
  // LIVE autoplay controller rather than inferring it. With `pauseOnMouseEnter` off,
  // `running` is changed ONLY by `start()`/`stop()` — the toggle, the hover handlers
  // and the reduced-motion effect — so it now means exactly "the content is
  // auto-advancing", and the label, `aria-pressed` and `aria-live` all derive from
  // it. The sibling `paused` flag is deliberately never read: Swiper raises and
  // clears it twice on every slide transition (see the JSDoc), so surfacing it would
  // flicker the control ~6% of every cycle.
  const syncRunningState = (swiper) => {
    setIsRunning(Boolean(swiper?.autoplay?.running))
  }

  // Explicit user control (WCAG 2.2.2): stop/start Swiper's autoplay. Runs the
  // SAME derivation as the label against the LIVE controller — never React state
  // — so the action can never contradict the words on the button, not even for a
  // single frame. Guarded so it is a no-op if the instance or its autoplay
  // controller is not ready.
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
      // Clear a transient suspension (a backgrounded tab, a touch drag, an in-flight
      // transition) BEFORE stopping. `stop()` only clears `running`, so stopping
      // while `paused` is set would leave that flag stuck true — and because
      // `pause()` bails out when it is already set, the transition-internal pause
      // would stay dead for the rest of the session even after autoplay restarts.
      if (autoplay.paused) autoplay.resume()
      autoplay.stop()
      return
    }
    // The button reads "Play autoplay", so make it move. A controller that is
    // still engaged but suspended — the mouse is over the slides — needs the
    // suspension lifted; a stopped one needs starting. Either way the visitor
    // gets the movement the label promised, and the resulting `autoplayResume` /
    // `autoplayStart` event resyncs the label through `syncPlayingState`.
    if (autoplay.running) {
      autoplay.resume()
    } else {
      autoplay.start()
    }
  }

  return (
    // `onKeyDownCapture` cancels the browser's own Enter/Space activation of a
    // pagination bullet so Swiper's a11y module remains the single activation path
    // (see preventDuplicateBulletActivation above for the measured reasoning and
    // for why this cannot live on the <Swiper> root).
    <div className={cn('relative', className)} onKeyDownCapture={preventDuplicateBulletActivation}>
      <Swiper
        onSwiper={(swiper) => {
          swiperRef.current = swiper
        }}
        // Exactly the two events that can change `running` — the only flag any
        // exposed state derives from. `autoplayPause`/`autoplayResume` are
        // deliberately NOT subscribed: with `pauseOnMouseEnter` off, the only pauses
        // left are transition-internal (twice per rotation), a backgrounded tab and a
        // touch drag, none of which the visitor can act on, and observing them is
        // exactly what used to flicker the label.
        onAutoplayStart={syncRunningState}
        onAutoplayStop={syncRunningState}
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
        // Explicit pagination ELEMENT, for the same reason as the arrows: it makes
        // the control cluster ONE DOM group instead of a screen region that merely
        // looks like one, and it stops Swiper's React wrapper rendering a second
        // band inside the slider. Spread from the hoisted constant so every static
        // option stays in one place and only the live element is per-render.
        pagination={{ ...PAGINATION, el: paginationEl }}
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

      {/* ONE control cluster — a single container element holding every control this
          carousel exposes: the pagination band on the first row, then the arrows and
          the pause toggle on the second. Not just one screen region but one DOM
          parent, which is why the pagination element is handed to Swiper through
          `pagination.el` instead of being left inside `.swiper`. Rendered AFTER the
          slider in DOM order, which is also its visual order, so focus order
          matches what the user sees, and the rows are ordered dots → arrows →
          toggle so the most-used control is reached first. `gap-4` (16px) between
          the rows sits on the 8px scale and is the cluster's own spacing — the
          stylesheet deliberately adds no margin to a relocated band. */}
      <div className="mt-4 flex flex-col items-center gap-4">
        {/* Swiper populates this element with the pagination bullets. It carries the
            base `swiper-pagination` class because Swiper adds only its state and
            modifier classes (`-clickable`, `-bullets`, `-horizontal`), never the base
            one, and every stylesheet rule the band needs — static flow, the ~26px
            bullet tap target, the brand colour and the ≥3:1 inactive contrast — is
            declared for this position as well as for the in-slider one. Swiper's
            a11y module gives each bullet its own "Go to slide N" name, so this
            container needs no label of its own; it is left free of ARIA rather than
            given a redundant role. */}
        <div ref={setPaginationEl} className="swiper-pagination" />

        {/* Arrows and the pause toggle. Wraps at narrow widths, so the row fits
            320px without horizontal overflow while every control keeps its ≥44×44px
            target. */}
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-4">
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
            (pressed = the content is auto-advancing) so state is never carried by
            the label text alone, and the visible text still flips so the available
            action stays unambiguous for sighted users; both derive from the same
            controller-backed value, so they cannot disagree. Because the hover pause
            now moves that same value, resting the pointer on the slider flips the
            control to "Play autoplay" / `aria-pressed="false"` while the movement is
            suspended, and moving away flips it back — the control reports what is
            actually happening rather than what was last asked for. The icon carries
            the state as SHAPE as well (pause bars ↔ play triangle), so the control
            never leans on colour or on its text alone.

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
              aria-pressed={isRunning}
              onClick={togglePlay}
            >
              {isRunning ? (
                <FaPause aria-hidden="true" className="h-4 w-4" />
              ) : (
                <FaPlay aria-hidden="true" className="h-4 w-4" />
              )}
              {isRunning ? 'Pause autoplay' : 'Play autoplay'}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
