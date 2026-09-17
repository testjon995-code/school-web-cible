import { useState, useCallback, useRef } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination, A11y, Keyboard } from 'swiper/modules'
import { FiX } from 'react-icons/fi'
import Dialog from '../ui/Dialog.jsx'
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
 *
 * Accessibility (WCAG AA):
 * - Every `<img>` carries a meaningful `alt` supplied by the data.
 * - Swiper's `A11y` module labels the navigation/pagination controls, the
 *   `Keyboard` module enables arrow-key control, and pagination bullets are
 *   `clickable` and keyboard-focusable.
 * - Each lightbox trigger is a real `<button type="button">` with a descriptive
 *   `aria-label` ("View image: <alt>"), so activation, focusability and focus
 *   rings (global `:focus-visible` in `src/index.css`) come for free.
 * - The lightbox is the SHARED `Dialog` primitive
 *   (`src/components/ui/Dialog.jsx`) at `placement="center"`, labelled by the
 *   image `alt` (there is no visible heading to point `aria-labelledby` at), so
 *   it arrives with `role="dialog"`, `aria-modal="true"` and a portal to
 *   `<body>` — a sibling of `#root`, which is what lets it escape the app
 *   shell's stacking and `inert` scope. It can be dismissed via the labelled
 *   Close button, the Escape key, or a click on the backdrop scrim.
 * - The full modal contract for keyboard and screen-reader users (WCAG 2.1.2 /
 *   4.1.2) is owned by `src/hooks/useDialog.js` behind that primitive, and this
 *   component no longer implements any of it: on open, focus moves into the
 *   dialog — here explicitly to the Close button via `initialFocusRef`; Tab and
 *   Shift+Tab are TRAPPED so focus cycles only among the dialog's focusable
 *   elements and can never reach the background; the entire app shell (`#root`)
 *   is made `inert` while the dialog is open so neither the keyboard nor
 *   assistive technology can reach the page behind it; background scroll is
 *   locked (by capturing and restoring `document.body.style.overflow` — this
 *   component deliberately no longer toggles an `overflow-hidden` class, so the
 *   two mechanisms can never fight or strand page scroll); and on close the
 *   `inert` flag is cleared BEFORE focus is restored (focusing an element inside
 *   an inert tree is a no-op, so the ORDER is load-bearing — this note is the
 *   record of why, and deleting it invites the regression back).
 * - Focus is restored to the EXACT thumbnail that opened the lightbox, via
 *   `returnFocusRef={openerRef}`. `openerRef` is captured from the click's
 *   `currentTarget` rather than from `document.activeElement` (which can already
 *   be `<body>`), and the hook reads `.current` at close time, so a second,
 *   third or sixth slide returns focus to its own button rather than to a single
 *   fixed trigger.
 * - This component and the mobile navigation drawer
 *   (`src/components/layout/Navbar.jsx`) now share that ONE focus-trap
 *   implementation. Both previously carried their own; neither may fork it again.
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
 *   `rounded-2xl`), a built-in utility (`text-white`, `bg-white/10`,
 *   `pointer-events-none`), or one of the project's custom named utilities from
 *   `src/index.css` (the 4:3 thumbnail-frame utility and the lightbox
 *   max-height ceiling utility). There are no hardcoded or arbitrary-value
 *   style classes, and `src/index.css` is untouched by this component. Class
 *   composition (including the caller `className`, merged last so it can
 *   override) flows through the shared `cn()` helper; the lightbox's panel and
 *   scrim class strings are merged last by `Dialog` through the same helper.
 * - The lightbox scrim weight is passed EXPLICITLY as `bg-foreground/90`,
 *   because `Dialog` defaults to the navigation drawer's lighter
 *   `bg-foreground/60`. Both are existing design-system values; omitting the
 *   override would silently lighten this overlay, and a photograph needs the
 *   heavier wash to read against the page behind it. The `z-50` modal-overlay
 *   layer now arrives from `Dialog` rather than being declared here.
 *
 * @param {object} props
 * @param {Array<{src: string, alt: string, caption?: string}>} [props.images=[]]
 *   Images to display. `alt` is required and must be meaningful; `caption` is
 *   optional. When empty the component renders nothing.
 * @param {string} [props.className] Extra classes merged last onto the Swiper
 *   root element.
 * @param {boolean} [props.lightbox=true] When `true` (default) each slide is a
 *   button that opens the image in the modal lightbox; when `false` slides are
 *   static, non-interactive images.
 * @param {object} [props.props] Any additional props are forwarded to the
 *   underlying `<Swiper>` (e.g. `loop`, `grabCursor`).
 * @returns {JSX.Element|null} The rendered gallery, or `null` when there are no
 *   images.
 */

// Swiper feature modules registered once at module scope so the array keeps a
// STABLE reference across renders — Swiper diffs its props and would otherwise
// re-initialise when Gallery re-renders (e.g. on lightbox open/close).
const MODULES = [Navigation, Pagination, A11y, Keyboard]

// The remaining Swiper configuration is fully static, so it is also hoisted to
// module scope (stable references) for the same reason: a re-render of Gallery
// must never reset the carousel's active slide.
const BREAKPOINTS = { 640: { slidesPerView: 2 }, 1024: { slidesPerView: 3 } }
const PAGINATION = { clickable: true }
// Arrow-key control for the carousel. `onlyInViewport` MUST be false: Swiper
// v14's in-viewport gate compares the carousel's PAGE-coordinate offset against
// the window height, so a carousel below the fold (as on the Gallery page) never
// passes the check and arrow keys are silently ignored. `pageUpDown` is disabled
// so the module never hijacks the browser's native PageUp/PageDown scrolling.
const KEYBOARD = { enabled: true, onlyInViewport: false, pageUpDown: false }
const A11Y = { enabled: true }

export default function Gallery({ images = [], className, lightbox = true, ...props }) {
  // `null` = lightbox closed; a number = index of the image currently viewed.
  const [openIndex, setOpenIndex] = useState(null)
  // Ref to the lightbox Close button, handed to `Dialog` as `initialFocusRef`
  // so focus lands there when the dialog opens (WCAG AA modal focus
  // management). The dialog PANEL needs no ref here — `useDialog` owns it and
  // supplies it through `panelProps`.
  const closeButtonRef = useRef(null)
  // Ref to the exact trigger element that opened the dialog, handed to `Dialog`
  // as `returnFocusRef`. Captured from the click's `currentTarget` (NOT
  // `document.activeElement`, which can already be `<body>` — e.g. a
  // programmatic click that never set focus), and read by `useDialog` at CLOSE
  // time, so focus is reliably RESTORED to the thumbnail that was actually
  // clicked rather than to a single fixed trigger (WAI-ARIA dialog pattern).
  const openerRef = useRef(null)

  // Stable close handler shared by the dialog's dismissal paths (Escape and the
  // scrim, both routed through `Dialog`'s `onClose`) and the Close button.
  // Memoised purely to keep that prop identity stable across re-renders; the
  // modal behaviour it used to coordinate now lives in `useDialog`.
  const close = useCallback(() => setOpenIndex(null), [])

  // There is deliberately NO modal effect here. Escape, the Tab/Shift+Tab focus
  // trap, `inert` on `#root`, the background scroll lock, the initial focus move
  // and the focus restoration (with `inert` cleared BEFORE `focus()`, because a
  // focus call into an inert subtree is silently dropped) are ALL owned by
  // `src/hooks/useDialog.js` behind the shared `Dialog` primitive. This
  // component's only modal responsibility is to say which image is open and to
  // hand over the two focus refs. Re-adding any part of that contract here
  // would recreate the duplicate focus trap this migration removed.

  // Render nothing when there is no content — keeps callers free of guards.
  if (!images.length) return null

  // Guard against a stale index if the `images` prop shrinks while the lightbox
  // is open, so we never dereference an out-of-bounds element.
  const activeImage = openIndex === null ? null : images[openIndex]

  return (
    <>
      <Swiper
        modules={MODULES}
        spaceBetween={16}
        slidesPerView={1}
        navigation
        pagination={PAGINATION}
        keyboard={KEYBOARD}
        a11y={A11Y}
        breakpoints={BREAKPOINTS}
        className={cn('w-full', className)}
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
            <SwiperSlide key={img.src || i}>
              <figure className="m-0">
                {lightbox ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      // Capture the exact trigger node so focus can be restored
                      // to THIS thumbnail when the lightbox closes. `useDialog`
                      // reads `returnFocusRef.current` at close time, so the
                      // assignment order (capture, then open) is all that is
                      // needed — see the `returnFocusRef` prop below.
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

      {/* The lightbox mounts only while there is an image to show, exactly as the
          hand-rolled portal did: the mount/unmount is what establishes and tears
          down `useDialog`'s focus trap, scroll lock and `inert` flag. `Dialog`
          owns the portal to <body>, the `role`/`aria-modal` semantics, the
          `z-50` overlay layer and the scrim element. */}
      {lightbox && activeImage ? (
        <Dialog
          open
          onClose={close}
          placement="center"
          // Named by the image `alt` — this dialog has no visible heading, so
          // `label` (aria-label) is correct here and `labelledBy` is not.
          label={activeImage.alt}
          initialFocusRef={closeButtonRef}
          returnFocusRef={openerRef}
          // The heavier lightbox wash. `Dialog` defaults to the navigation
          // drawer's `bg-foreground/60`, so omitting this would silently lighten
          // the overlay a photograph has to read against.
          scrimClassName="bg-foreground/90"
          // Override the centred placement's white card into the full-area,
          // transparent panel this overlay needs: the image centres in the
          // viewport and the Close button positions against the panel's own
          // corner (`absolute right-4 top-4`), well clear of the image even at
          // 320px. `pointer-events-none` is what keeps backdrop dismissal intact
          // — a full-area panel would otherwise cover the scrim and swallow
          // those clicks — while the two children below re-enable pointer events
          // for themselves, so a click on the surrounding wash closes and a
          // click on the image does not. That is the behaviour the old markup got
          // from `stopPropagation()` on its figure, now obtained structurally.
          className="pointer-events-none flex h-full w-full max-w-full items-center justify-center bg-transparent p-0 shadow-none"
        >
          <button
            ref={closeButtonRef}
            type="button"
            onClick={close}
            aria-label="Close image viewer"
            className="pointer-events-auto absolute right-4 top-4 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          >
            <FiX className="h-6 w-6" aria-hidden="true" />
          </button>
          <figure className="pointer-events-auto m-0 flex flex-col items-center gap-2">
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
        </Dialog>
      ) : null}
    </>
  )
}
