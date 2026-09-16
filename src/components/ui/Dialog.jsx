import { createPortal } from 'react-dom'
import { useDialog } from '../../hooks/useDialog.js'
import { cn } from '../../lib/cn.js'

/**
 * Dialog — THE single overlay primitive for the CIBLE School of Language SPA:
 * modal, side drawer and bottom sheet in one component, over one focus trap.
 *
 * Before this primitive the codebase carried TWO hand-rolled focus traps — the
 * portalled gallery lightbox (`src/components/common/Gallery.jsx`) and the
 * mobile navigation drawer (`src/components/layout/Navbar.jsx`). Both are
 * re-expressed through this component, so the codebase ends with ONE trap
 * (`src/hooks/useDialog.js` behind this file) rather than three. Never fork a
 * second overlay: any new modal, drawer or sheet composes this component.
 *
 * Four call sites, one per placement need:
 *   • `right`  → the migrated mobile navigation drawer (`Navbar.jsx`).
 *   • `center` → the migrated gallery lightbox (`Gallery.jsx`) and the mobile
 *                global-search panel (`GlobalSearch.jsx`).
 *   • `bottom` → the mobile course-filter sheet (`CourseFilters.jsx`).
 *
 * ## Division of labour: the hook owns behaviour, this file owns presentation
 *
 * `useDialog` is the single owner of the WAI-ARIA modal contract and NOTHING it
 * owns is reimplemented here: initial focus placement (explicit ref → first
 * focusable → the panel itself), the document-level Escape handler, the
 * Tab/Shift+Tab focus trap (re-queried live on every keystroke, so a panel whose
 * contents change while open stays correct, and stray focus is pulled back in),
 * `inert` on `#root`, the background scroll lock that captures and restores the
 * prior `document.body.style.overflow`, and focus restoration that clears
 * `inert` BEFORE calling `focus()` (a focus call into an inert subtree is
 * silently dropped). `open`, `onClose`, `initialFocusRef` and `returnFocusRef`
 * are forwarded straight through to it. There is deliberately no `keydown`
 * listener, no `inert` assignment and no scroll handling in this file — if you
 * find yourself adding one, you are duplicating the hook.
 *
 * This file owns exactly four things the hook deliberately leaves out:
 *   1. The portal (below), which is a hard precondition of the hook.
 *   2. The accessible name (`label` / `labelledBy`).
 *   3. The three placements and their token-driven surfaces.
 *   4. The caller-settable scrim weight.
 *
 * ## The portal is a precondition, not a preference
 *
 * The overlay is rendered through `createPortal(…, document.body)` — a SIBLING
 * of `#root`. `useDialog` marks `#root` `inert` for the dialog's lifetime, so a
 * panel rendered inside `#root` would be disabled by the very guard meant to
 * protect it: no keyboard access, no assistive-technology access, and a focus
 * trap with nothing focusable in it. Both pre-existing implementations portalled
 * to `document.body` for the same reason. `typeof document` is checked first, so
 * a non-DOM environment (server rendering, a non-DOM test runner) renders
 * nothing instead of throwing.
 *
 * Nothing at all is rendered while `open` is false — the mount/unmount is what
 * drives the hook's effect lifecycle, exactly as both pre-existing
 * implementations did (`{open && createPortal(…)}`). `useDialog` is still called
 * UNCONDITIONALLY at the top level (oxlint `react/rules-of-hooks` is an error)
 * and is designed to be called with `open: false`; only the render is skipped.
 *
 * ## Structure, and why the scrim is a sibling of the panel
 *
 *   wrapper  `fixed inset-0 z-50` + the placement's layout classes
 *     ├─ scrim  `absolute inset-0` + `scrimClassName` (carries `scrimProps`)
 *     └─ panel  the placement's surface + `className` (carries `panelProps`)
 *
 * The scrim must NOT contain the panel, or a click inside the dialog would
 * bubble to the scrim and dismiss it. As siblings, a click on the scrim (which
 * spans the whole wrapper, including the placement's gutter) closes, and a click
 * on the panel does not — which is precisely the behaviour the lightbox achieved
 * with a scrim-level `onClick` plus `stopPropagation()` on its inner figure, now
 * obtained structurally instead. The panel is declared after the scrim, so with
 * both positioned and no explicit `z-index` it paints above it.
 *
 * `z-50` is the EXISTING modal-overlay layer — the layer the navigation drawer
 * already used — so the dialog paints above the `z-40` floating conversion
 * widgets and sticky bottom bar with no portal workaround (the widget `<aside>`
 * creates no stacking context), and below the `z-index: 1000` skip link, which
 * must always win when focused.
 *
 * ## Why the scrim weight is caller-settable
 *
 * The two migrations genuinely diverge: the drawer scrim is `bg-foreground/60`
 * and the lightbox scrim is `bg-foreground/90` (a heavier wash, so a photograph
 * reads against the page behind it). Both are existing design-system values. A
 * single hardcoded scrim would silently change one of the two, so `/60` is the
 * default and `scrimClassName` overrides it — merged through `cn()`, which
 * resolves the two conflicting opacity utilities rather than emitting both.
 *
 * ## Styling and override contract (zero new tokens, zero new utilities)
 *
 * Every value resolves to an existing Tailwind v4 `@theme` token from
 * `src/index.css` (`bg-foreground/60`, `bg-foreground/90`, `rounded-2xl`,
 * `shadow-md`), a built-in utility (`bg-white`, `z-50`, the default spacing
 * scale), or the project's existing named utility `max-h-screen-85`. There are
 * no hardcoded or arbitrary-value classes, and `src/index.css` is untouched by
 * this component. A `max-h-screen-70` sibling utility was considered and
 * rejected: 70vh appears nowhere in the token block, so it would be a hardcoded
 * value wearing a token's name.
 *
 * Focus rings are INHERITED from the global `:focus-visible` rule in
 * `src/index.css` and never re-declared here.
 *
 * `className` is merged LAST onto the panel via `cn()`, so callers always win
 * over the placement default. The lightbox migration, for example, needs a
 * full-area transparent panel that its `absolute right-4 top-4` Close button can
 * position against, which is a pure override:
 *
 *   <Dialog open={open} onClose={close} placement="center"
 *           label={image.alt} scrimClassName="bg-foreground/90"
 *           initialFocusRef={closeButtonRef} returnFocusRef={openerRef}
 *           className="h-full w-full max-w-full bg-transparent p-0 shadow-none">
 *
 * The `center` panel deliberately caps its height with the MERGEABLE `max-h-full`
 * rather than `max-h-screen-85`: `tailwind-merge` does not know the custom
 * utility conflicts with a caller's height classes, so a caller could not undo
 * it. The `bottom` sheet, whose cap is never overridden, uses `max-h-screen-85`
 * as the design system specifies and scrolls rather than overflowing.
 *
 * ## Motion
 *
 * Intentionally none. Neither pre-existing overlay animated, the brief forbids
 * giant animations and decorative effects, and the global
 * `prefers-reduced-motion` block in `src/index.css` would flatten a transition
 * to 0.01ms for reduced-motion users anyway. No new motion vocabulary is
 * introduced; a caller that wants an enter transition can add the shared
 * `duration-300 ease-out` step through `className` under the shell's existing
 * `MotionConfig reducedMotion="user"`.
 *
 * ## Responsive auto-close stays with the caller
 *
 * The navigation drawer closes itself at `matchMedia('(min-width: 64rem)')` —
 * the width at which the hamburger and drawer become `lg:hidden`. That is a
 * responsive POLICY, not a dialog behaviour: it lives in `Navbar.jsx`, which
 * flips its own `open` state and lets this component's unmount release the
 * scroll lock and clear `inert`. Neither this prop list nor the hook's accepts a
 * breakpoint, and the drawer's old `lg:hidden` wrapper class is redundant once
 * that effect owns the closing decision.
 *
 * ## Accessibility (WCAG AA)
 *
 * - `role="dialog"`, `aria-modal="true"` and `tabIndex={-1}` arrive on the panel
 *   from `panelProps`; the scrim is `aria-hidden` from `scrimProps`, since the
 *   dialog's own semantics already convey modality.
 * - The panel MUST be named: pass `label` (an `aria-label`) or `labelledBy` (an
 *   `aria-labelledby` pointing at a visible heading's id). `labelledBy` takes
 *   PRECEDENCE when both are given, because a visible heading is the better
 *   name; when neither is given, an `aria-label` supplied through `...rest`
 *   survives untouched.
 * - The Tab trap is escapable by Escape and by the scrim, which is what makes it
 *   WCAG 2.1.2-compliant rather than a keyboard trap.
 *
 * @param {object} props
 * @param {boolean} [props.open=false] Whether the dialog is open. While false
 *   the component renders nothing, which is what tears the hook's contract down.
 * @param {() => void} [props.onClose] Dismissal request — Escape or a scrim
 *   click. The caller owns the closing decision; this component never closes
 *   itself.
 * @param {'center'|'right'|'bottom'} [props.placement='center'] Presentation:
 *   centred modal, right-hand side drawer, or bottom sheet. An unrecognised
 *   value falls back to `'center'`.
 * @param {string} [props.label] Accessible name applied as `aria-label`. Used
 *   when the dialog has no visible heading (both pre-existing overlays name
 *   themselves this way).
 * @param {string} [props.labelledBy] Id of the element that names the dialog,
 *   applied as `aria-labelledby`. Wins over `label` when both are supplied.
 * @param {{current: HTMLElement|null}} [props.initialFocusRef] Element to focus
 *   on open (a Close button, a search input). Forwarded to `useDialog`.
 * @param {{current: HTMLElement|null}} [props.returnFocusRef] Element focus
 *   returns to on close — read at close time, so it can point at the exact
 *   control that opened this instance (the specific gallery thumbnail that was
 *   clicked, not a single fixed trigger). Forwarded to `useDialog`.
 * @param {import('react').ReactNode} [props.children] Dialog content.
 * @param {string} [props.className] Extra classes merged LAST onto the PANEL, so
 *   callers can override any placement default (geometry, surface, padding).
 * @param {string} [props.scrimClassName] Extra classes merged LAST onto the
 *   SCRIM. Pass `bg-foreground/90` for the lightbox weight.
 * @param {object} [props.rest] Any other props (`id`, `aria-describedby`,
 *   `data-*`, …) are forwarded to the panel. They are applied BEFORE the hook's
 *   props and the merged className, so the dialog's required semantics and its
 *   internal panel ref can never be clobbered.
 * @returns {import('react').ReactPortal|null} The portalled overlay, or `null`
 *   when closed or when there is no DOM.
 */

// Placement presentations. Each entry pairs the layout classes added to the
// fixed wrapper with the panel's own surface/geometry classes. Module-local and
// NOT exported so this file exposes only the Dialog component
// (react/only-export-components), matching how Button/Badge keep their variant
// maps private.
const placements = {
  // Centred modal. The wrapper gutter (`p-4`) keeps the panel off the viewport
  // edge at 320px; `max-h-full` + `overflow-y-auto` cap a tall panel to the
  // available height (the gutter is already excluded) and scroll it instead of
  // letting it run off screen. `max-w-lg` is a sensible modal measure that a
  // caller can widen or drop entirely.
  center: {
    wrapper: 'flex items-center justify-center p-4',
    panel: 'relative max-h-full w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-md',
  },
  // Right-hand side drawer, carrying the navigation drawer's verified geometry
  // verbatim (`absolute right-0 top-0 flex h-full w-72 max-w-full flex-col gap-2
  // bg-white p-6 shadow-md`). `max-w-full` is what keeps the 288px panel inside
  // a 320px viewport. `overflow-y-auto` is the one addition: background scroll
  // is locked while the dialog is open, so a drawer taller than a short viewport
  // would otherwise hold controls that cannot be reached by scroll. It is
  // invisible whenever the content fits.
  right: {
    wrapper: '',
    panel:
      'absolute right-0 top-0 flex h-full w-72 max-w-full flex-col gap-2 overflow-y-auto bg-white p-6 shadow-md',
  },
  // Bottom sheet. Full-width and flush to the bottom edge, with only the top
  // corners rounded so it reads as rising from the edge. Capped at the existing
  // `max-h-screen-85` ceiling and scrolled, never overflowed.
  bottom: {
    wrapper: 'flex items-end justify-center',
    panel:
      'relative max-h-screen-85 w-full overflow-y-auto rounded-t-2xl bg-white p-6 shadow-md',
  },
}

/**
 * Resolve a placement key to its class pair, tolerating anything a caller might
 * pass. Own-property lookup (rather than plain indexing) means an inherited name
 * such as `'constructor'` cannot resolve to a non-placement object.
 *
 * @param {unknown} placement Requested placement.
 * @returns {{wrapper: string, panel: string}} The matching entry, or `center`.
 */
function resolvePlacement(placement) {
  if (typeof placement === 'string' && Object.hasOwn(placements, placement)) {
    return placements[placement]
  }
  return placements.center
}

/**
 * Resolve the panel's accessible name into a spreadable attribute object.
 *
 * `labelledBy` wins over `label`: a visible heading is a better name than a
 * duplicated string. When neither is supplied the object is empty, so an
 * `aria-label` a caller passed through `...rest` is left in place rather than
 * being overwritten with `undefined`.
 *
 * @param {string|undefined} label Accessible name for `aria-label`.
 * @param {string|undefined} labelledBy Id of the naming element.
 * @returns {{'aria-label'?: string, 'aria-labelledby'?: string}} Attributes to spread.
 */
function resolveNaming(label, labelledBy) {
  if (labelledBy) return { 'aria-labelledby': labelledBy }
  if (label) return { 'aria-label': label }
  return {}
}

function Dialog({
  open = false,
  onClose,
  placement = 'center',
  label,
  labelledBy,
  initialFocusRef,
  returnFocusRef,
  children,
  className,
  scrimClassName,
  ...rest
}) {
  // Called UNCONDITIONALLY and first (react/rules-of-hooks). The hook accepts
  // `open: false` as a closed, do-nothing state; the early returns below skip
  // the RENDER, never the hook.
  const { panelProps, scrimProps } = useDialog({
    open,
    onClose,
    initialFocusRef,
    returnFocusRef,
  })

  // Mount the overlay only while open — the transition is what establishes and
  // tears down the hook's focus trap, scroll lock and `inert` flag.
  if (!open) return null
  // No DOM (server rendering, non-DOM test runner) → nothing to portal into.
  if (typeof document === 'undefined') return null

  const { wrapper, panel } = resolvePlacement(placement)

  return createPortal(
    <div className={cn('fixed inset-0 z-50', wrapper)}>
      {/* Presentational backdrop: dismisses on click (scrimProps) and stays out
          of the accessibility tree. A SIBLING of the panel, never its parent. */}
      <div {...scrimProps} className={cn('absolute inset-0 bg-foreground/60', scrimClassName)} />
      {/* Caller props first, then the hook's panel ref/semantics, then the
          accessible name, then the merged className — so none of the dialog's
          required wiring can be overridden by a caller. */}
      <div
        {...rest}
        {...panelProps}
        {...resolveNaming(label, labelledBy)}
        className={cn(panel, className)}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}

export default Dialog
