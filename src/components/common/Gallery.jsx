import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination, A11y, Keyboard } from 'swiper/modules'
import { FiX } from 'react-icons/fi'
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa'
import Button from '../ui/Button.jsx'
import { cn } from '../../lib/cn.js'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import 'swiper/css/a11y'

/**
 * Gallery — CIBLE School of Language.
 *
 * THE canonical responsive, accessible image gallery for the SPA (campus,
 * classrooms, events). It is a Swiper v14 carousel with arrow navigation,
 * clickable pagination bullets, keyboard control, and the a11y module enabled,
 * plus an OPTIONAL lightbox that opens the clicked slide in an accessible modal
 * dialog. It is consumed by the Gallery page and any section that needs an
 * image carousel, and it stays fully presentational — every image is supplied
 * by the caller through the `images` prop (single source of truth in
 * `src/data`).
 *
 * Responsive behaviour (Tailwind breakpoint scale):
 * - base   : 1 slide  per view (mobile)
 * - >= 640 : 2 slides per view (`sm` — tablet)
 * - >= 1024: 3 slides per view (`lg` — laptop/desktop)
 * `spaceBetween={16}` keeps a consistent 16px (8px-scale) gutter between slides.
 * This ladder is deliberately NOT the same as TestimonialSlider's (768/1024):
 * a 4:3 illustration stays legible two-up earlier than a block of quote text
 * does, so the two carousels are intentionally tuned apart. Do not "harmonise"
 * them.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE CASCADE CONSTRAINT — read this before changing any class on this file.
 *
 * Swiper's stylesheets are imported as plain CSS (see the four `swiper/css`
 * imports above) and are therefore UN-LAYERED, while Tailwind v4 emits every
 * utility inside `@layer utilities`. In the CSS cascade an un-layered
 * declaration beats a layered one regardless of selector specificity, so NO
 * Tailwind utility class on this component can override a Swiper base rule —
 * `swiper.css` declares `.swiper { padding: 0 }` and `.swiper-slide
 * { height: 100% }` outside every layer. A `pb-12` class on a slider root
 * therefore computes to `padding-bottom: 0px`: present in the markup, inert in
 * the cascade. This carousel never even had that class, so Swiper's pagination —
 * absolutely positioned at `bottom: 8px`, `z-index: 10` — sat directly ON the
 * slide media by default.
 *
 * Every Swiper-targeting declaration consequently lives in the single un-layered
 * third-party override zone of `src/index.css`, which is the only position in the
 * cascade that can win, and each rule there carries its own reason comment. This
 * component OWNS NO Swiper CSS: it opts into the stylesheet's mechanisms and must
 * not re-declare them, nor add a second competing one. Those rules are scoped to
 * `.swiper` rather than to either carousel, so this gallery and
 * TestimonialSlider share ONE remediation instead of carrying two divergent ones.
 *
 * What the stylesheet supplies, and what this component relies on:
 *   • `.swiper.swiper { padding-inline: .5rem; padding-block-end: 1rem }` —
 *     RESERVES the pagination band below the slides and insets the slide row.
 *     `overflow: hidden` on the root is deliberately left in place: unclipping it
 *     would let off-screen slides escape and reintroduce horizontal page
 *     overflow, which measures clean at every width today. Breathing room is
 *     therefore bought by insetting the content, never by removing the clip.
 *   • `.swiper > .swiper-pagination { position: static; margin-block-start: 1rem }`
 *     — returns Swiper's OWN pagination element to normal flow so the bullets
 *     render BELOW the media instead of on top of it, which makes overlap
 *     structurally impossible rather than merely arithmetically avoided. This is
 *     why `pagination.el` is deliberately NOT supplied here: that placement rule
 *     is scoped to a DIRECT child of `.swiper`, the ~26px bullet tap-target rule
 *     is scoped to a DESCENDANT of `.swiper`, and the brand-colour custom
 *     properties reach the bullets by inheritance from `.swiper`. Relocating the
 *     element outside the slider root would silently break all three.
 *   • `.swiper, .swiper-button-prev, .swiper-button-next, .swiper-pagination`
 *     `{ --swiper-*: … }` — repoints Swiper's control colours from its default
 *     `#007aff` at the brand `--color-primary-600` and lifts the inactive bullet
 *     from ≈1.4:1 to ≈3.59:1 (WCAG 1.4.11 Non-text Contrast). No colour and no
 *     opacity is set here.
 *   • `.swiper .swiper-wrapper { align-items: stretch }` +
 *     `.swiper .swiper-slide { height: auto }` — the equal-height chain, owned
 *     ENTIRELY by the stylesheet. Every slide in this gallery frames its image
 *     with the shared `aspect-4-3` utility, so the slides were already equal and
 *     stay equal; the rule simply means a longer caption can no longer make one
 *     slide shrink-wrap out of line with its neighbours. Solved purely in CSS: no
 *     measurement, no ResizeObserver, no layout thrash.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * ONE CONTROL CLUSTER: every navigation control lives in a single zone directly
 * beneath the slides — Swiper's in-flow pagination band first, then one row
 * holding the previous and next arrows. Swiper's defaults instead float those
 * arrows at `position: absolute; top: 50%; left|right: 4px; z-index: 10`, i.e.
 * 44×44px of chrome painted over the first and last visible images — and here
 * each image is itself a lightbox trigger button, so the overlay also covered a
 * control and the focus ring it needs to show. The arrows escape that overlay
 * because `navigation` receives explicit `prevEl` / `nextEl` ELEMENTS instead of
 * the bare `navigation` boolean: Swiper's absolute geometry is scoped to its
 * `.swiper-button-prev` / `.swiper-button-next` classes, which these controls
 * never carry, so they simply lay out in normal flow inside the cluster; and
 * supplying the elements also stops Swiper's React wrapper from rendering its own
 * overlay divs at all, so no overlapping arrow exists even on the first frame.
 * Both arrows keep full function — nothing is hidden or removed. No `z-index` is
 * introduced: the controls stay at Swiper's own layer and never compete with the
 * app's stacking ledger (skip link 1000, route progress 60, sticky header and
 * modals 50, conversion widgets 40). The lightbox below is a genuine modal and
 * keeps its own `z-50` tier.
 *
 * `rewind` is what keeps BOTH arrows permanently usable. Without it Swiper
 * disables the previous arrow at slide 0 and the next arrow at the last slide:
 * `Navigation.update()` sets the native `disabled` property on a <button>
 * element and `A11y.updateNavigation()` adds `tabindex="-1"` plus
 * `aria-disabled`, at 0.35 opacity (≈1.4:1, failing WCAG 1.4.11) — so a control
 * left the tab order and dropped below the contrast floor purely because of which
 * slide was showing. Both methods short-circuit on `rewind`, so the arrows are
 * never disabled, never leave the tab order and always paint at full brand
 * contrast. The defect is removed at its ROOT rather than restyled, which is why
 * no "disabled" treatment (colour or otherwise) is declared below: there is no
 * disabled state left to communicate. Behaviourally the arrows now wrap from the
 * last image back to the first and vice versa, so browsing is continuous in both
 * directions.
 *
 * Swiper still owns one legitimate hidden state: when a caller supplies no more
 * images than fit at once, `watchOverflow` marks the instance locked and Swiper
 * adds its own `swiper-button-lock` / `swiper-pagination-lock` classes, hiding
 * controls that have nothing to navigate. That is Swiper's behaviour for a
 * degenerate carousel, not a workaround for overlap, and the `/gallery` route
 * never reaches it (six images against a maximum of three per view).
 *
 * Accessibility (WCAG AA):
 * - Every `<img>` carries a meaningful `alt` supplied by the data.
 * - The carousel is exposed as a NAMED region: the `a11y` options set
 *   `role="group"`, an `aria-label` and `aria-roledescription="carousel"` on the
 *   slider root, and `aria-roledescription="slide"` on every slide alongside
 *   Swiper's own `role="group"` and "N / M" slide label. Those four parameters
 *   default to `null`, which is why the widget was previously unnamed and its
 *   slides undescribed (W3C WAI Carousels Tutorial).
 * - `wrapperLiveRegion` is left at its default ON PURPOSE. Swiper resolves it to
 *   `aria-live="polite"` when no autoplay is running, which is exactly what the
 *   WAI recommends for a user-driven carousel: because every slide change here is
 *   the user's own action, announcing the new slide is informative rather than
 *   interruptive.
 * - Both arrows are real `<button>` elements (via the shared {@link Button},
 *   which guarantees a ≥44×44px target through `min-h-11 min-w-11` and `h-11`),
 *   permanently in the tab order, each showing the one global `:focus-visible`
 *   ring — now unobstructed, because a control that overlays the media cannot
 *   show its own focus ring. Each arrow is icon-only, so it carries an explicit
 *   `aria-label`; the chevrons are decorative (`aria-hidden`).
 * - The `Keyboard` module enables arrow-key slide control, and the `clickable`
 *   pagination bullets stay keyboard-focusable and operable, each carrying a
 *   "Go to slide N" label from Swiper's a11y module and `aria-current` on the
 *   active one. Each bullet is rendered as a real `<button>` (`bulletElement`)
 *   so BOTH Enter and Space activate it without the browser also page-scrolling
 *   the document out from under the focused control — Swiper's default
 *   `<span role="button">` is not natively activatable and its a11y keydown
 *   handler does not call `preventDefault()` on Space, so the keystroke navigated
 *   the carousel AND scrolled the page, carrying the focused bullet off-screen
 *   and leaving its focus indicator invisible (WCAG 2.4.7) immediately after the
 *   key that moved it. Their ~26px tap area and their ≥3:1 inactive contrast are
 *   owned by the stylesheet. Note the bullets inherit no `type` attribute and so
 *   default to `submit`: nothing can be submitted today because this carousel is
 *   never rendered inside a form, so DO NOT nest it in one without first giving
 *   the bullets an explicit type.
 * - Each lightbox trigger is a real `<button type="button">` with a descriptive
 *   `aria-label` ("View image: <alt>"), so activation, focusability and focus
 *   rings (global `:focus-visible` in `src/index.css`) come for free.
 * - The lightbox is a `role="dialog" aria-modal="true"` labelled by the image
 *   `alt`, PORTALLED to `<body>` (a sibling of `#root`) so it can escape the app
 *   shell's stacking/inert scope. It can be dismissed via the labelled Close
 *   button, the Escape key, or a click on the backdrop scrim. It implements the
 *   full modal contract for keyboard and screen-reader users (WCAG 2.1.2 /
 *   4.1.2): on open, focus moves into the dialog (the Close button); Tab and
 *   Shift+Tab are TRAPPED so focus cycles only among the dialog's focusable
 *   elements and can never reach the background; the entire app shell (`#root`)
 *   is made `inert` while the dialog is open so neither the keyboard nor
 *   assistive technology can reach the page behind it; background scroll is
 *   locked; and on close the `inert` flag is cleared BEFORE focus is restored to
 *   the element that opened the dialog (focusing an element inside an inert tree
 *   is a no-op, so order matters).
 * - The Close button is a comfortably tappable target: it is centred via
 *   `inline-flex` and sized to a 44×44px minimum (`min-h-11 min-w-11`) so it
 *   meets the touch-target guideline on mobile.
 * - Slide captions use semantic `<figure>` / `<figcaption>`.
 *
 * Motion:
 * - There is intentionally NO `autoplay`; the carousel is entirely
 *   user-driven, so there is no continuous motion to suppress. Any slide/modal
 *   transitions are user-initiated and are additionally neutralised for users
 *   who request reduced motion via the global rule in `src/index.css`.
 *
 * Styling:
 * - Every value resolves to a Tailwind `@theme` brand token defined in
 *   `src/index.css` (`bg-surface`, `bg-foreground/90`, `text-muted`,
 *   `rounded-2xl`), a built-in utility (`text-white`, `bg-white/10`, `z-50`,
 *   `mt-2`, `gap-x-2`, `gap-y-4`), or one of the project's custom named utilities
 *   from `src/index.css` (the 4:3 thumbnail-frame utility and the lightbox
 *   max-height ceiling utility). There are no hardcoded or arbitrary-value style
 *   classes, and cluster spacing composes even multiples of the 8px scale. The
 *   numeric Swiper API values (`spaceBetween`, `slidesPerView`, breakpoints) are
 *   carousel configuration, not CSS style values.
 * - The caller `className` is merged LAST through the shared `cn()` helper onto
 *   the component's OUTER wrapper — not onto the `<Swiper>` root — so it can
 *   position the whole widget (slides plus controls) as one block rather than
 *   only the slide row. Everything a caller could previously reach it can still
 *   reach; the target is simply the element that now bounds the entire carousel.
 *
 * Stable references (Swiper re-init safety): all static Swiper configuration
 * (`MODULES`, `BREAKPOINTS`, `PAGINATION`, `KEYBOARD`, `A11Y`) is hoisted to
 * module scope so its references never change across re-renders — Swiper's React
 * wrapper re-initialises (resetting the active slide) when it sees a new prop
 * reference, which would otherwise reset the carousel every time this component
 * re-renders, e.g. on lightbox open/close. The one unavoidable exception is
 * `navigation`, which must carry live DOM elements and so cannot be a frozen
 * constant. It is safe for two reasons. First, the arrow elements are held in
 * STATE rather than in refs: the control cluster is a LATER SIBLING than
 * `<Swiper>`, and React attaches a later sibling's refs only AFTER an earlier
 * sibling's layout effect has run — which is exactly when Swiper initialises — so
 * a plain ref would still have read `null` at init and the arrows would never have
 * been wired. Callback-ref setters re-render once, at mount, with the real nodes.
 * Second, Swiper's React wrapper diffs watched object params BY VALUE, not by
 * identity, so that one change re-runs `navigation.init()` alone and every
 * subsequent render — including every ancestor re-render — sees identical values
 * and re-initialises nothing.
 *
 * @param {object} props
 * @param {Array<{src: string, alt: string, caption?: string}>} [props.images=[]]
 *   Images to display. `alt` is required and must be meaningful; `caption` is
 *   optional. When empty the component renders nothing.
 * @param {string} [props.className] Extra classes merged LAST onto the
 *   component's OUTER wrapper element, which contains both the slider and the
 *   control cluster, so the caller can place the whole widget as one block.
 * @param {boolean} [props.lightbox=true] When `true` (default) each slide is a
 *   button that opens the image in the modal lightbox; when `false` slides are
 *   static, non-interactive images.
 * @param {object} [props.props] Any additional props are forwarded to the
 *   underlying `<Swiper>` (e.g. `loop`, `grabCursor`).
 * @returns {import('react').ReactElement|null} The rendered gallery, or `null`
 *   when there are no images.
 */

// Swiper feature modules registered once at module scope so the array keeps a
// STABLE reference across renders — Swiper diffs its props and would otherwise
// re-initialise when Gallery re-renders (e.g. on lightbox open/close).
const MODULES = [Navigation, Pagination, A11y, Keyboard]

// The remaining Swiper configuration is fully static, so it is also hoisted to
// module scope (stable references) for the same reason: a re-render of Gallery
// must never reset the carousel's active slide.
const BREAKPOINTS = { 640: { slidesPerView: 2 }, 1024: { slidesPerView: 3 } }
// Pagination config. `clickable` keeps every bullet focusable and operable, and
// Swiper's a11y module then gives each one a "Go to slide N" label plus
// aria-current on the active bullet.
//
// `bulletElement: 'button'` renders each bullet as a REAL <button> instead of
// Swiper's default `<span role="button" tabindex="0">`. This is a keyboard fix,
// not a cosmetic one, and it is the same remediation the sibling
// TestimonialSlider carries — see the accessibility section of the JSDoc for the
// full reasoning. Swiper supports this first-class: its pagination stylesheet
// ships a dedicated `button&` reset, the container's click delegation resolves
// the bullet with closest() and so works identically for a button, and the
// stylesheet's ~26px tap-target rule still wins on specificity
// (`.swiper .swiper-pagination-bullet` at 0,2,0 over that reset's 0,1,1).
//
// `el` is deliberately NOT set: Swiper's own pagination element must stay a
// DIRECT CHILD of the slider root, because all three of the stylesheet rules
// that make the band correct are scoped to that position — the static-flow
// placement (`.swiper > .swiper-pagination`), the ~26px bullet tap target
// (`.swiper .swiper-pagination-bullet`) and the brand colour / 3:1 inactive
// contrast, which reaches the bullets by custom-property inheritance from
// `.swiper`. See the cascade section of the JSDoc above.
const PAGINATION = { clickable: true, bulletElement: 'button' }
// Arrow-key control for the carousel. `onlyInViewport` MUST be false: Swiper
// v14's in-viewport gate compares the carousel's PAGE-coordinate offset against
// the window height, so a carousel below the fold (as on the Gallery page) never
// passes the check and arrow keys are silently ignored. `pageUpDown` is disabled
// so the module never hijacks the browser's native PageUp/PageDown scrolling.
const KEYBOARD = { enabled: true, onlyInViewport: false, pageUpDown: false }
// Accessibility config. Swiper defaults these four parameters to `null`, which is
// why the carousel was previously an UNNAMED, UNDESCRIBED widget: its root had no
// role, no accessible name and no aria-roledescription, and its slides carried
// role="group" with an "N / M" label but nothing identifying them as slides.
// Setting them makes the gallery a named region announced as a carousel whose
// children are announced as slides, which is the structure the W3C WAI Carousels
// Tutorial asks for. The name describes the WIDGET, not its contents — the images
// themselves are supplied by the caller and each carries its own `alt`, so no
// claim about what they depict is authored here. `slideRole` already defaults to
// 'group' and `wrapperLiveRegion` is left alone on purpose (see the JSDoc:
// without autoplay Swiper correctly resolves it to `polite`).
const A11Y = {
  enabled: true,
  containerRole: 'group',
  containerRoleDescriptionMessage: 'carousel',
  containerMessage: 'Image gallery',
  itemRoleDescriptionMessage: 'slide',
}

export default function Gallery({ images = [], className, lightbox = true, ...props }) {
  // `null` = lightbox closed; a number = index of the image currently viewed.
  const [openIndex, setOpenIndex] = useState(null)
  // Ref to the lightbox Close button so focus can be moved into the dialog when
  // it opens (WCAG AA modal focus management).
  const closeButtonRef = useRef(null)
  // Ref to the dialog container so the keyboard handler can scope the Tab focus
  // trap to the elements INSIDE the modal.
  const dialogRef = useRef(null)
  // Ref to the exact trigger element that opened the dialog. Captured from the
  // click's `currentTarget` (NOT `document.activeElement`, which can already be
  // `<body>` — e.g. a programmatic click that never set focus), so focus can be
  // reliably RESTORED to the opener on close (WAI-ARIA dialog pattern).
  const openerRef = useRef(null)
  // The previous/next arrow ELEMENTS, handed to Swiper's `navigation` option so
  // the arrows render inside the control cluster below instead of Swiper's
  // absolutely-positioned overlay on top of the media. Held in STATE, not in a
  // ref, on purpose: the cluster is a LATER SIBLING than <Swiper>, and React
  // attaches a later sibling's refs only after an earlier sibling's layout effect
  // has already run — which is precisely when Swiper's React wrapper initialises
  // the instance — so a plain ref would still read `null` at init and the arrows
  // would never be wired. These callback-ref setters trigger exactly one extra
  // render at mount with the real nodes, and Swiper's wrapper then re-runs
  // `navigation.init()` alone (the active slide is left untouched). Every render
  // after that passes identical values, and because the wrapper diffs watched
  // object params by VALUE rather than by identity, nothing is re-initialised
  // again — the same guarantee the hoisted constants above give. ALL hooks are
  // declared UNCONDITIONALLY here, before the early return below, so hook order is
  // stable every render (react/rules-of-hooks).
  const [prevEl, setPrevEl] = useState(null)
  const [nextEl, setNextEl] = useState(null)

  // Stable close handler shared by the Escape listener, the scrim click, and the
  // Close button; memoised so the effect dependency below stays stable.
  const close = useCallback(() => setOpenIndex(null), [])

  // While the lightbox is open, enforce the full modal contract (WCAG 2.1.2
  // "No Keyboard Trap" done RIGHT — i.e. a deliberate, escapable focus trap —
  // and 4.1.2): close on Escape; TRAP Tab / Shift+Tab so focus cycles only among
  // the dialog's focusable elements and can never reach the background; make the
  // rest of the app (`#root`) `inert` so neither the keyboard nor assistive tech
  // can reach it (the dialog itself is portalled to <body>, OUTSIDE #root, so it
  // stays interactive); lock background scroll; move focus into the dialog on
  // open; and restore focus to the opener on close. `document` is only ever
  // touched here, inside the effect (never during render).
  useEffect(() => {
    if (openIndex === null) return undefined
    const previouslyFocused = document.activeElement
    const rootEl = document.getElementById('root')

    const onKey = (e) => {
      if (e.key === 'Escape') {
        close()
        return
      }
      if (e.key !== 'Tab') return
      const dialog = dialogRef.current
      if (!dialog) return
      // Focusable descendants of the dialog, in DOM order. In this modal that is
      // just the Close button, but the trap is written generically so it stays
      // correct if the dialog ever gains more controls.
      const focusables = Array.from(
        dialog.querySelectorAll(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
        ),
      )
      if (focusables.length === 0) {
        // Nothing focusable inside — keep focus pinned to the dialog itself.
        e.preventDefault()
        return
      }
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement
      if (e.shiftKey) {
        // Shift+Tab off the first element (or from outside) wraps to the last.
        if (active === first || !dialog.contains(active)) {
          e.preventDefault()
          last.focus()
        }
      } else if (active === last || !dialog.contains(active)) {
        // Tab off the last element (or from outside) wraps to the first.
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    document.body.classList.add('overflow-hidden')
    // Hide the entire app shell from AT and remove it from the tab order. The
    // dialog is portalled to <body> (a sibling of #root), so it is unaffected.
    if (rootEl) rootEl.inert = true
    closeButtonRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.classList.remove('overflow-hidden')
      // Clear inert BEFORE restoring focus — focus() on an element inside an
      // inert subtree is a no-op, so the opener must be focusable again first.
      if (rootEl) rootEl.inert = false
      // Restore focus to the control that opened the dialog (WAI-ARIA dialog
      // pattern). This cleanup runs in React's passive phase, AFTER the portal
      // dialog has been removed from the DOM (which blurs the Close button to
      // <body>), so this is the final focus operation and it must target a LIVE,
      // focusable node. Prefer the explicitly-captured opener; fall back to the
      // element that was focused before opening. `document.body` is skipped
      // (focusing it is a no-op and would leave the user at the document start).
      const opener = openerRef.current
      const restoreTarget =
        opener && opener.isConnected
          ? opener
          : previouslyFocused instanceof HTMLElement &&
              previouslyFocused.isConnected &&
              previouslyFocused !== document.body
            ? previouslyFocused
            : null
      restoreTarget?.focus()
    }
  }, [openIndex, close])

  // Render nothing when there is no content — keeps callers free of guards.
  if (!images.length) return null

  // Guard against a stale index if the `images` prop shrinks while the lightbox
  // is open, so we never dereference an out-of-bounds element.
  const activeImage = openIndex === null ? null : images[openIndex]

  return (
    <>
      {/* Outer wrapper: bounds the slides AND the control cluster, so the caller's
          `className` (merged last) positions the whole widget as one block. */}
      <div className={cn('relative', className)}>
        <Swiper
          modules={MODULES}
          spaceBetween={16}
          slidesPerView={1}
          // Explicit arrow ELEMENTS (not the bare `navigation` boolean). This keeps
          // the arrows out of Swiper's absolute overlay — its `top: 50%` /
          // `left|right: 4px` / `z-index: 10` geometry is scoped to the
          // `.swiper-button-prev` / `.swiper-button-next` classes, which the
          // cluster's buttons never carry — and it also stops Swiper's React
          // wrapper rendering those overlay divs in the first place, so no arrow is
          // ever painted over the images (each of which is itself a button).
          navigation={{ prevEl, nextEl }}
          // Keeps BOTH arrows enabled, focusable and at full brand contrast for the
          // whole session: `Navigation.update()` and `A11y.updateNavigation()` both
          // short-circuit on `rewind`, so neither the native `disabled` property
          // nor `tabindex="-1"` / `aria-disabled` / 0.35 opacity is ever applied at
          // the first or last image. Browsing simply wraps in both directions.
          rewind
          pagination={PAGINATION}
          keyboard={KEYBOARD}
          a11y={A11Y}
          breakpoints={BREAKPOINTS}
          // Internal only. The CALLER's `className` is merged onto the wrapper
          // above, not here, so it can position the slides and the controls as one
          // block; this static class just keeps the slider's own declared
          // full-width intent explicit on the element it applies to.
          className="w-full"
          {...props}
        >
          {images.map((img, i) => {
            // Build the media element once and reuse it in both the interactive
            // (lightbox trigger) and static branches — no duplicated markup.
            const media = (
              <img
                src={img.src}
                alt={img.alt}
                loading="lazy"
                className="aspect-4-3 h-full w-full object-cover"
              />
            )
            return (
              // No height utility here on purpose: slide height is owned by the
              // un-layered `.swiper .swiper-slide { height: auto }` rule, which
              // lets the flex row stretch every slide to the tallest one. A
              // layered utility could never have applied (see the cascade section
              // of the JSDoc).
              <SwiperSlide key={img.src || i}>
                <figure className="m-0">
                  {lightbox ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        // Capture the exact trigger node so focus can be restored
                        // to it when the lightbox closes (see the effect cleanup).
                        openerRef.current = e.currentTarget
                        setOpenIndex(i)
                      }}
                      aria-label={`View image: ${img.alt}`}
                      className="block w-full overflow-hidden rounded-2xl bg-surface"
                    >
                      {media}
                    </button>
                  ) : (
                    <div className="overflow-hidden rounded-2xl bg-surface">{media}</div>
                  )}
                  {img.caption ? (
                    <figcaption className="mt-2 text-center text-sm text-muted">
                      {img.caption}
                    </figcaption>
                  ) : null}
                </figure>
              </SwiperSlide>
            )
          })}
        </Swiper>

        {/* ONE control cluster, immediately below Swiper's in-flow pagination
            band, so the dots and the arrows read as a single control zone instead
            of arrows floating on top of the images and dots painted over them.
            Wraps at narrow widths, so it fits 320px without horizontal overflow
            while every control keeps its ≥44×44px target. Rendered AFTER the
            slider in DOM order, which is also its visual order, so focus order
            matches what the user sees. */}
        <div className="mt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-4">
          {/* Icon-only arrows: the canonical <Button> renders a real, permanently
              focusable <button> with the ≥44px target and the shared focus ring,
              which is now unobstructed because these no longer overlay the media.
              The glyph is decorative, so each control carries its own
              `aria-label` (Swiper's a11y module labels only the arrows it owns at
              init time, and these are supplied afterwards — so nothing overwrites
              these names). */}
          <Button ref={setPrevEl} variant="outline" size="sm" aria-label="Previous image">
            <FaChevronLeft aria-hidden="true" className="h-4 w-4" />
          </Button>
          <Button ref={setNextEl} variant="outline" size="sm" aria-label="Next image">
            <FaChevronRight aria-hidden="true" className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {lightbox && activeImage && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-label={activeImage.alt}
              onClick={close}
              className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/90 p-4"
            >
              <button
                ref={closeButtonRef}
                type="button"
                onClick={close}
                aria-label="Close image viewer"
                className="absolute right-4 top-4 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
              >
                <FiX className="h-6 w-6" aria-hidden="true" />
              </button>
              <figure
                className="m-0 flex flex-col items-center gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                <img
                  src={activeImage.src}
                  alt={activeImage.alt}
                  className="max-h-screen-85 max-w-full rounded-2xl object-contain"
                />
                {activeImage.caption ? (
                  <figcaption className="text-center text-sm text-white/80">
                    {activeImage.caption}
                  </figcaption>
                ) : null}
              </figure>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
