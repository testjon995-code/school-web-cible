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
 * The canonical responsive, accessible image gallery for the SPA (campus,
 * classrooms, events): a Swiper v14 carousel with arrow navigation, clickable
 * pagination bullets, keyboard control and the a11y module enabled, plus an optional
 * lightbox that opens the clicked slide in an accessible modal dialog. It stays fully
 * presentational — every image comes from the caller through the `images` prop, and
 * the consuming route owns that array (`src/pages/Gallery.jsx` declares its own list;
 * there is no gallery module in `src/data`). Any section needing an image carousel
 * composes this component rather than forking one.
 *
 * Responsive behaviour: 1 slide per view on mobile, 2 from `sm`, 3 from `lg`, with a
 * 16px gutter on the 8px scale. That ladder is deliberately NOT the sibling
 * TestimonialSlider's (768/1024): a 4:3 illustration stays legible two-up earlier
 * than a block of quote text does, so the two carousels are tuned apart. Do not
 * "harmonise" them.
 *
 * CASCADE OWNERSHIP — read before adding a class here. Swiper's stylesheets are
 * imported as plain CSS and are therefore un-layered, while Tailwind emits utilities
 * inside `@layer utilities`, so an un-layered Swiper base rule beats any utility class
 * this component could carry. EVERY Swiper-targeting declaration consequently lives in
 * the un-layered third-party override zone of `src/index.css`, which documents each
 * rule and owns slide padding, pagination placement, bullet geometry, control colour
 * and the equal-height chain. This component owns no Swiper CSS: it opts into those
 * mechanisms and must not re-declare them or add a competing rule.
 *
 * Two consequences of that ownership are load-bearing here. The slider root keeps
 * `overflow: hidden`, because unclipping it would let off-screen slides escape and
 * reintroduce horizontal page overflow — breathing room is bought by insetting the
 * content instead. And `pagination.el` is deliberately NOT supplied, because the
 * placement rule is scoped to a DIRECT child of the slider root, the bullet
 * tap-target rule to a descendant of it, and the brand colour reaches the bullets by
 * custom-property inheritance from it; relocating the element would silently break
 * all three.
 *
 * ONE CONTROL CLUSTER: every navigation control sits directly beneath the slides —
 * Swiper's in-flow pagination band first, then one row holding the previous and next
 * arrows. Swiper's own defaults would float those arrows over the first and last
 * visible images, and here each image is itself a lightbox trigger button, so an
 * overlay would cover a control and the focus ring it needs to show. The arrows escape
 * that overlay because `navigation` receives explicit `prevEl` / `nextEl` ELEMENTS
 * instead of the bare boolean: Swiper's absolute geometry is scoped to its own arrow
 * classes, which these controls never carry, so they lay out in normal flow inside the
 * cluster, and supplying the elements also stops the React wrapper rendering overlay
 * divs at all. Both arrows keep full function — nothing is hidden or removed. No
 * `z-index` is introduced: the controls stay on Swiper's own layer and never compete
 * with the app's stacking ledger (skip link 1000, route progress 60, sticky header and
 * modals 50, conversion widgets 40). The lightbox is a genuine modal and keeps its own
 * `z-50` tier.
 *
 * `rewind` is what keeps BOTH arrows permanently usable. Without it Swiper disables the
 * previous arrow at the first slide and the next arrow at the last:
 * `Navigation.update()` sets the native `disabled` property and
 * `A11y.updateNavigation()` adds `tabindex="-1"` plus `aria-disabled` at a low opacity
 * that fails WCAG 1.4.11, so a control would leave the tab order and drop below the
 * contrast floor purely because of which slide was showing. Both methods short-circuit
 * on `rewind`, so the arrows never disable, never leave the tab order and always paint
 * at full brand contrast — which is also why no disabled treatment is declared below:
 * there is no disabled state left to communicate. Browsing simply wraps in both
 * directions.
 *
 * Swiper still owns one legitimate hidden state: when a caller supplies no more images
 * than fit at once, `watchOverflow` marks the instance locked and Swiper adds its own
 * lock classes, hiding controls that have nothing to navigate. That is its behaviour
 * for a degenerate carousel, not a workaround for overlap.
 *
 * Accessibility (WCAG AA):
 * - Every `<img>` carries a meaningful `alt` supplied by the caller's data.
 * - The carousel is exposed as a NAMED CAROUSEL GROUP — `role="group"` (not
 *   `role="region"`, so no landmark is added) carrying an `aria-label` and
 *   `aria-roledescription="carousel"` on the slider root, with
 *   `aria-roledescription="slide"` on every slide alongside Swiper's own
 *   `role="group"` and "N / M" slide label. `group` is the role the W3C WAI Carousels
 *   Tutorial uses for a carousel that is not itself a landmark, and the consuming page
 *   already names the section with its own heading.
 * - `wrapperLiveRegion` is left at its default ON PURPOSE. Swiper resolves it to
 *   `aria-live="polite"` when no autoplay is running, which is what the WAI recommends
 *   for a user-driven carousel: every slide change here is the visitor's own action,
 *   so announcing the new slide is informative rather than interruptive.
 * - Both arrows are real `<button>` elements (through the shared {@link Button}, which
 *   guarantees a ≥44×44px target), permanently in the tab order, each showing the one
 *   global `:focus-visible` ring — unobstructed, because a control that overlays the
 *   media cannot show its own focus ring. Each arrow is icon-only, so it carries an
 *   explicit `aria-label`; the chevrons are decorative.
 * - The `Keyboard` module enables arrow-key slide control, and the `clickable`
 *   pagination bullets stay keyboard-focusable and operable, each carrying a "Go to
 *   slide N" label from Swiper's a11y module and `aria-current` on the active one. Each
 *   bullet is a real `<button>` (`bulletElement`) so both Enter and Space activate it
 *   without the browser also page-scrolling the document out from under the focused
 *   control — Swiper's default span is not natively activatable and its a11y keydown
 *   handler does not call `preventDefault()` on Space, which would carry the focused
 *   bullet off-screen and leave its focus indicator invisible (WCAG 2.4.7) right after
 *   the key that moved it. The bullets' tap area and their ≥3:1 inactive contrast are
 *   owned by the stylesheet. Note that they inherit no `type` attribute and so default
 *   to `submit`: nothing can be submitted today because this carousel is never
 *   rendered inside a form, so DO NOT nest it in one without first giving the bullets
 *   an explicit type.
 * - Each lightbox trigger is a real `<button type="button">` with a descriptive
 *   `aria-label`, so activation, focusability and focus rings come for free.
 * - The lightbox is a `role="dialog" aria-modal="true"` labelled by the image `alt`,
 *   PORTALLED to `<body>` (a sibling of `#root`) so it escapes the app shell's
 *   stacking and inert scope. It can be dismissed with the labelled Close button, the
 *   Escape key or a click on the backdrop scrim, and it implements the full modal
 *   contract (WCAG 2.1.2 / 4.1.2): on open focus moves into the dialog; Tab and
 *   Shift+Tab are TRAPPED so focus cycles only among the dialog's focusable elements;
 *   the app shell is made `inert` so neither the keyboard nor assistive technology can
 *   reach the page behind it; background scroll is locked; and on close the inert flag
 *   is cleared BEFORE focus returns to the element that opened the dialog, because
 *   focusing an element inside an inert tree is a no-op.
 * - The Close button is sized to a 44×44px minimum so it meets the touch-target
 *   guideline, and slide captions use semantic `<figure>` / `<figcaption>`.
 *
 * Motion: there is intentionally NO `autoplay` — the carousel is entirely user-driven,
 * so there is no continuous motion to suppress, and any slide or modal transition is
 * additionally neutralised for visitors who request reduced motion by the global rule
 * in `src/index.css`.
 *
 * Styling: every value resolves to a Tailwind `@theme` brand token from
 * `src/index.css`, a built-in utility, or one of the project's named utilities (the
 * 4:3 thumbnail frame and the lightbox max-height ceiling). There are no hardcoded or
 * arbitrary-value classes, and cluster spacing composes even multiples of the 8px
 * scale; the numeric Swiper values (`spaceBetween`, `slidesPerView`, breakpoints) are
 * carousel configuration, not CSS. The caller `className` is merged LAST through
 * `cn()` onto the component's OUTER wrapper — not onto the `<Swiper>` root — so it
 * positions the whole widget, slides plus controls, as one block. A class that styles
 * the widget from the outside (margin, width, alignment, a positioning context, a
 * scoped custom property) is what this prop is for; the slider root's own geometry
 * belongs to the un-layered override zone, not to a caller class, because Swiper's
 * un-layered CSS beats any utility wherever it is applied.
 *
 * STABLE OPTION REFERENCES: all static Swiper configuration (`MODULES`,
 * `BREAKPOINTS`, `PAGINATION`, `KEYBOARD`, `A11Y`) is hoisted to module scope so its
 * references never change across renders. Swiper's React wrapper watches a fixed set
 * of parameters and, when it sees a change, shallow-compares the watched values and
 * updates the affected pieces of the instance — re-running module initialisation for
 * what changed rather than rebuilding the carousel. Hoisting keeps those comparisons
 * trivially equal, so a re-render of this component (on lightbox open or close, say)
 * triggers no update work at all.
 *
 * `navigation` is the one unavoidable exception, because it must carry live DOM
 * elements. It is safe for two reasons. First, the arrow elements are held in STATE
 * rather than in refs: the control cluster is a LATER SIBLING than `<Swiper>`, and
 * React attaches a later sibling's refs only after an earlier sibling's layout effect
 * has run — which is exactly when Swiper initialises — so a plain ref would still read
 * `null` at init and the arrows would never be wired. Callback-ref setters re-render
 * once, at mount, with the real nodes, and the wrapper then re-runs
 * `navigation.init()` alone, leaving the active slide untouched. Second, every render
 * after that passes equal values, so nothing is updated again.
 *
 * @param {object} props
 * @param {Array<{src: string, alt: string, caption?: string}>} [props.images=[]]
 *   Images to display. `alt` is required and must be meaningful; `caption` is
 *   optional. When empty the component renders nothing.
 * @param {string} [props.className] Extra classes merged LAST onto the component's
 *   OUTER wrapper element, which contains both the slider and the control cluster, so
 *   the caller can place the whole widget as one block.
 * @param {boolean} [props.lightbox=true] When `true` (default) each slide is a button
 *   that opens the image in the modal lightbox; when `false` slides are static,
 *   non-interactive images.
 * @returns {import('react').ReactElement|null} The rendered gallery, or `null` when
 *   there are no images.
 *
 * Any other props are forwarded to the underlying `<Swiper>` (e.g. `loop`,
 * `grabCursor`).
 */

// Registered once at module scope so the array keeps a STABLE reference across
// renders and a re-render of Gallery — on lightbox open or close, say — leaves the
// carousel's watched parameters equal (see the JSDoc).
const MODULES = [Navigation, Pagination, A11y, Keyboard]

const BREAKPOINTS = { 640: { slidesPerView: 2 }, 1024: { slidesPerView: 3 } }
// Pagination config. `clickable` keeps every bullet focusable and operable, and
// Swiper's a11y module then gives each one a "Go to slide N" label plus
// aria-current on the active bullet.
//
// `bulletElement: 'button'` renders each bullet as a REAL <button> instead of Swiper's
// default span with a button role — a keyboard fix, not a cosmetic one, and the same
// treatment the sibling TestimonialSlider carries (see the accessibility section of the
// JSDoc). Swiper supports it first-class: its pagination stylesheet ships a dedicated
// `button&` reset, its click delegation resolves the bullet with closest() and so works
// identically for a button, and the stylesheet's tap-target rule still outranks that
// reset.
//
// `el` is deliberately NOT set: Swiper's own pagination element must stay a DIRECT
// CHILD of the slider root, because that is the position the placement rule, the
// bullet tap-target rule and the inherited brand colour are all scoped to. See the
// cascade section of the JSDoc.
const PAGINATION = { clickable: true, bulletElement: 'button' }

// The one thing `bulletElement: 'button'` does NOT settle, and the reason this handler
// exists. Swiper's a11y module attaches its own `keydown` listener to the pagination
// container whenever pagination is clickable and ends it by calling `click()` without
// `preventDefault()` (node_modules/swiper/modules/a11y.mjs — `onEnterOrSpaceKey`). With
// Swiper's default span bullet that synthetic click is the only activation path; a
// native <button> adds the browser's own — Enter on keydown, Space on keyup — so one key
// press yields TWO clicks to the same index. Swiper guards its equivalent ARROW listener
// behind a non-BUTTON tag check but applies the pagination one unconditionally, so the
// cluster's arrows need no handling.
//
// Cancelling the NATIVE path rather than Swiper's keeps the library owning navigation
// (no second pagination implementation, no parallel `slideTo`) and keeps Space from
// page-scrolling the document out from under the focused bullet. Capture-phase
// attachment cannot go on the <Swiper> root, because Swiper's React wrapper routes every
// prop matching /on[A-Z]/ into its own event map rather than onto the container element;
// it therefore sits on the outer wrapper this component owns, whose capture pass runs
// before the pagination element's bubble listener. Hoisted to module scope for a stable
// reference, like every other option here.
//
// The sibling TestimonialSlider deliberately carries the OPPOSITE form — a handler that
// performs the activation itself — and the two must not be aligned on one shared
// abstraction. That component hands Swiper an EXTERNAL `pagination.el` so its bullets
// can live in the control cluster, and that element is still `null` at Swiper's `init()`,
// which is the one place the a11y module binds this listener; its bullets therefore get
// no library key handling at all, so cancelling the native path there would leave them
// inert. Here `el` is not set, Swiper creates the pagination element inside the slider
// root before a11y `init()` runs, the listener IS attached, and a `click()` from this
// side would be the duplicate. Same symptom, opposite cause.
const BULLET_SELECTOR = '.swiper-pagination-bullet'
function preventDuplicateBulletActivation(event) {
  if (event.key !== 'Enter' && event.key !== ' ') return
  const target = event.target
  if (typeof target?.matches !== 'function' || !target.matches(BULLET_SELECTOR)) return
  event.preventDefault()
}

// Arrow-key control. `onlyInViewport` MUST be false: Swiper v14's in-viewport gate
// compares the carousel's page-coordinate offset against the window height, so a
// carousel below the fold — as this one is on its route — never passes the check and its
// arrow keys are silently ignored. `pageUpDown` is disabled so the module never hijacks
// native PageUp/PageDown scrolling.
const KEYBOARD = { enabled: true, onlyInViewport: false, pageUpDown: false }
// Accessibility config. Swiper defaults these four parameters to `null`, so without
// them the slider root would carry no role, no accessible name and no
// aria-roledescription, and its slides nothing identifying them as slides. Set, they
// make the gallery a named GROUP announced as a carousel whose children are announced
// as slides — the structure the W3C WAI Carousels Tutorial asks for. `containerRole` is
// 'group' rather than 'region' because a named region is a landmark and the consuming
// page already names this section with its own heading. The name describes the WIDGET,
// not its contents: the images are the caller's and each carries its own `alt`, so no
// claim about what they depict is authored here. `slideRole` already defaults to
// 'group', and `wrapperLiveRegion` is left alone on purpose (see the JSDoc).
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
  // Focus is moved to the Close button when the dialog opens (WCAG AA modal focus
  // management).
  const closeButtonRef = useRef(null)
  // Scopes the Tab focus trap to the elements INSIDE the modal.
  const dialogRef = useRef(null)
  // Ref to the exact trigger element that opened the dialog. Captured from the
  // click's `currentTarget` (NOT `document.activeElement`, which can already be
  // `<body>` — e.g. a programmatic click that never set focus), so focus can be
  // reliably RESTORED to the opener on close (WAI-ARIA dialog pattern).
  const openerRef = useRef(null)
  // The previous/next arrow ELEMENTS, handed to Swiper's `navigation` option so the
  // arrows render inside the control cluster below instead of Swiper's
  // absolutely-positioned overlay on top of the media. Held in STATE, not in a ref, on
  // purpose: the cluster is a LATER SIBLING than <Swiper>, and React attaches a later
  // sibling's refs only after an earlier sibling's layout effect has run — which is
  // precisely when Swiper initialises — so a plain ref would still read `null` at init
  // and the arrows would never be wired. These callback-ref setters trigger one extra
  // render at mount with the real nodes, and the wrapper then re-runs
  // `navigation.init()` alone, leaving the active slide untouched. Every render after
  // that passes equal values, so nothing is updated again. Every hook here is declared
  // UNCONDITIONALLY, before the early return below, so hook order is stable.
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
          `className` (merged last) positions the whole widget as one block. Its
          `onKeyDownCapture` cancels the browser's own Enter/Space activation of a
          pagination bullet so Swiper's a11y module stays the single activation path
          (see preventDuplicateBulletActivation above, including why this cannot live
          on the <Swiper> root). */}
      <div className={cn('relative', className)} onKeyDownCapture={preventDuplicateBulletActivation}>
        <Swiper
          modules={MODULES}
          spaceBetween={16}
          slidesPerView={1}
          // Explicit arrow ELEMENTS, not the bare `navigation` boolean: this keeps the
          // arrows out of Swiper's absolute overlay, whose geometry is scoped to arrow
          // classes the cluster's buttons never carry, and it stops the React wrapper
          // rendering those overlay divs at all — so no arrow is ever painted over the
          // images, each of which is itself a button.
          navigation={{ prevEl, nextEl }}
          // Keeps BOTH arrows enabled, focusable and at full brand contrast for the
          // whole session: `Navigation.update()` and `A11y.updateNavigation()` both
          // short-circuit on `rewind`, so neither the native `disabled` property nor the
          // `tabindex="-1"` / `aria-disabled` / low-opacity treatment is applied at the
          // first or last image. Browsing wraps in both directions.
          rewind
          pagination={PAGINATION}
          keyboard={KEYBOARD}
          a11y={A11Y}
          breakpoints={BREAKPOINTS}
          // Internal only: the caller's `className` is merged onto the wrapper above,
          // not here, so it positions the slides and the controls as one block. This
          // static class states the slider's own full-width intent.
          className="w-full"
          {...props}
        >
          {images.map((img, i) => {
            // Built once and reused in both the interactive (lightbox trigger) and
            // static branches, so the media markup exists in one place.
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
              // un-layered `.swiper .swiper-slide { height: auto }` rule in
              // src/index.css, which lets the flex row stretch every slide to the
              // tallest one. A layered utility would be inert (see the cascade section
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

        {/* ONE control cluster, immediately below Swiper's in-flow pagination band, so
            the dots and the arrows read as a single control zone. The row wraps at
            narrow widths, so it fits the smallest supported viewport without horizontal
            overflow while every control keeps its ≥44×44px target, and it is rendered
            AFTER the slider in DOM order, which is also its visual order, so focus
            order matches what the visitor sees. */}
        <div className="mt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-4">
          {/* Icon-only arrows: the canonical <Button> renders a real, permanently
              focusable <button> with the ≥44px target and the shared focus ring, which is
              unobstructed because these do not overlay the media. The glyph is
              decorative, so each control carries its own `aria-label` — Swiper's a11y
              module labels only the arrows it owns at init time, and these are supplied
              afterwards, so nothing overwrites these names. */}
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
