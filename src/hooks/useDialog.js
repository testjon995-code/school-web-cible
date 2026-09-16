import { useCallback, useEffect, useMemo, useRef } from 'react'

/**
 * useDialog — THE single owner of modal focus management for this SPA.
 *
 * Before this module the codebase carried TWO hand-rolled focus traps: the
 * portalled gallery lightbox (`src/components/common/Gallery.jsx`) and the
 * mobile navigation drawer (`src/components/layout/Navbar.jsx`). This hook is
 * the extraction of the more complete of the two — the lightbox sequence, which
 * implements every behaviour of the WAI-ARIA dialog pattern including the
 * ordering constraint that inerting must be lifted BEFORE focus is restored.
 * `src/components/ui/Dialog.jsx` is built on this hook, and both existing
 * implementations are re-expressed through that primitive, so the codebase ends
 * with ONE trap rather than three. Nothing here may regress either of them.
 *
 * Two defects of the drawer implementation are deliberately NOT carried
 * forward, and both matter for the surfaces this primitive now has to serve:
 * 1. Its focusable selector was the narrow `'a[href], button:not([disabled])'`,
 *    which drops `input`, `select` and `textarea`. The mobile course-filter
 *    sheet (search field, sort/goal selects, checkbox groups) and the global
 *    search panel (the combobox text input) consist almost entirely of exactly
 *    those, so the broad selector below is used instead.
 * 2. It captured its focusable list ONCE, at effect-setup time. A dialog's
 *    contents change while it is open — the filter sheet gains and loses a
 *    clear-all control as filters are applied, and the search listbox re-renders
 *    its options on every keystroke — so the list is re-queried LIVE on every
 *    Tab instead.
 *
 * @module hooks/useDialog
 */

/**
 * Focusable-descendant selector, taken verbatim from the verified lightbox
 * implementation. It is the BROAD form on purpose (see the module note above):
 * links with an `href`, enabled buttons, and every native form control, plus
 * anything given an explicit positive or zero `tabindex`.
 *
 * `[tabindex="-1"]` is excluded because a negative tabindex means
 * "programmatically focusable, but not part of the tab sequence" — which is
 * precisely what the dialog panel itself carries, so the panel can never appear
 * in its own trap cycle.
 */
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'

/**
 * Id of the application shell element that `index.html` declares and
 * `src/main.jsx` mounts React into. It is marked `inert` for the dialog's
 * lifetime so every background control drops out of BOTH the tab order and the
 * accessibility tree, which is what makes the dialog genuinely modal for
 * keyboard and screen-reader users rather than only visually.
 */
const APP_ROOT_ID = 'root'

/**
 * Live, DOM-ordered list of the focusable descendants of a panel.
 *
 * Called fresh on every Tab keystroke rather than memoised: the returned list is
 * only correct for the instant it is taken, because a dialog's contents change
 * while it is open.
 *
 * @param {HTMLElement|null|undefined} panel The element carrying `panelProps`.
 * @returns {HTMLElement[]} Focusable descendants in DOM order; empty when the
 *   panel is absent or contains nothing focusable.
 */
function getFocusables(panel) {
  if (!panel) return []
  return Array.from(panel.querySelectorAll(FOCUSABLE_SELECTOR))
}

/**
 * True when a value is a live DOM element that can actually take focus.
 *
 * Guards three distinct failure modes that all end in a silently dropped
 * `focus()` call: a non-element value (a consumer ref that was never attached,
 * or `document.activeElement` returning `null`), an element that has since been
 * removed from the document, and an object without a `focus` method (an
 * `SVGElement` in older engines, for example).
 *
 * `HTMLElement` is only referenced from inside the effect, never during render,
 * so it is guaranteed to exist by the time this runs.
 *
 * @param {unknown} node Candidate focus target.
 * @returns {boolean} True when `node.focus()` will have an effect.
 */
function isFocusable(node) {
  return node instanceof HTMLElement && node.isConnected && typeof node.focus === 'function'
}

/**
 * Enforce the full WAI-ARIA modal-dialog contract for an already-rendered
 * panel: move focus in on open, trap Tab and Shift+Tab, close on Escape, make
 * the rest of the application `inert`, lock background scroll, and restore focus
 * to the opener on close. Teardown follows one mandatory order — remove the key
 * listener, release the scroll lock, CLEAR `inert`, and only then restore focus —
 * because a `focus()` call into an inert subtree is silently dropped.
 *
 * ## Controlled, and stateless by design
 *
 * The hook owns NO open/closed state. `open` is supplied by the consumer and
 * Escape and the scrim click call `onClose`; the hook never sets state of its
 * own and never decides to close by itself. That keeps every closing policy
 * where it belongs — with the component that owns the trigger — and makes the
 * hook safe to drive from a URL parameter, a reducer or plain `useState`.
 *
 * ## Preconditions on the consumer (both load-bearing)
 *
 * 1. **The panel MUST be portalled OUTSIDE `#root`.** This hook sets `inert` on
 *    `#root` for the dialog's lifetime. A panel rendered *inside* `#root` would
 *    therefore be disabled by the very guard meant to protect it — no keyboard
 *    access, no screen-reader access, and a focus trap with nothing focusable in
 *    it. Both pre-existing implementations portal to `document.body`, a sibling
 *    of `#root`, and `Dialog.jsx` does the same. This hook portals nothing
 *    itself: `createPortal` is `Dialog.jsx`'s responsibility.
 * 2. **The panel needs an accessible name, which this hook does not supply.**
 *    `label` and `labelledBy` are deliberately absent from this signature: they
 *    are `Dialog.jsx` props. `Dialog.jsx` spreads `panelProps` and then adds its
 *    own `aria-label` / `aria-labelledby` alongside them. The division is
 *    intentional — this hook owns behaviour, the component owns naming and
 *    presentation — and it is why `panelProps` carries `role` and `aria-modal`
 *    but no naming attribute.
 *
 * ## The scroll lock (standardisation ruling)
 *
 * The two pre-existing implementations genuinely differed: the drawer captured
 * and restored `document.body.style.overflow`, while the lightbox toggled an
 * `overflow-hidden` class. This hook standardises on **capture-and-restore of
 * `document.body.style.overflow`**, because restoring the previous value
 * faithfully is correct even when something else on the page has already set an
 * inline overflow, whereas clearing a class (or blindly assigning `''`) throws
 * that value away. The consequence for the lightbox migration is explicit: once
 * `Gallery.jsx` consumes `Dialog.jsx`, it must STOP adding the
 * `overflow-hidden` class, and the migration check is that no stale
 * `overflow-hidden` class is left on `<body>` after a lightbox close.
 *
 * ## Responsive auto-close is NOT this hook's job (division ruling)
 *
 * The navigation drawer closes itself when the viewport reaches
 * `matchMedia('(min-width: 64rem)')` — the width at which both the hamburger and
 * the drawer become `lg:hidden`. Without it, resizing mobile → desktop with the
 * drawer open would visually hide the drawer but leave `open === true`, stranding
 * `overflow: hidden` on the body so the desktop page could never be scrolled.
 * That is a responsive POLICY, not a dialog behaviour: neither this signature nor
 * `Dialog.jsx`'s prop list accepts a breakpoint, so the media query stays in
 * `Navbar.jsx` as its own effect which flips `open` to false. Do not move it in
 * here. What this hook guarantees is the other half of that fix: its cleanup runs
 * reliably both when `open` transitions to false and on unmount, so the scroll
 * lock is ALWAYS released and the `inert` flag is ALWAYS cleared.
 *
 * ## SSR and non-DOM environments
 *
 * `document` is touched only inside the effect, never during render, and the
 * effect additionally guards on `typeof document`. `useEffect` is used rather
 * than `useLayoutEffect` (which warns during server rendering), matching the
 * verified in-repo behaviour.
 *
 * ## StrictMode
 *
 * `src/main.jsx` renders the app inside `<StrictMode>`, so in development every
 * effect is mounted, unmounted and mounted again. The setup/cleanup pairs here
 * are symmetric and idempotent by construction — the scroll lock captures and
 * restores the same prior value, `inert` is set and cleared, and the listener is
 * added and removed — so a dialog that mounts already open settles with focus
 * inside the panel and the body's overflow untouched, exactly as it does in a
 * production build.
 *
 * All hooks are called unconditionally at the top level, in a stable order, to
 * satisfy the Rules of Hooks (oxlint `react/rules-of-hooks`, configured as an
 * error). Only the effect BODY is conditional on `open`.
 *
 * @param {object} [args={}] Dialog wiring. Destructured with a default so a call
 *   with no argument degrades to a closed, do-nothing no-op instead of throwing.
 * @param {boolean} [args.open=false] Whether the dialog is currently open. The
 *   whole contract is wired on the transition to `true` and torn down on the
 *   transition to `false`.
 * @param {() => void} [args.onClose] Invoked when the user requests dismissal —
 *   Escape, or a click on the scrim. Called through a ref, so passing a fresh
 *   inline arrow on every render is safe and costs nothing.
 * @param {{current: HTMLElement|null}} [args.initialFocusRef] Optional ref to
 *   the element that should receive focus on open (a Close button, a search
 *   input). When omitted — or when it points at nothing focusable — focus falls
 *   back to the first focusable descendant of the panel, and then to the panel
 *   itself.
 * @param {{current: HTMLElement|null}} [args.returnFocusRef] Optional ref to the
 *   element focus must return to on close. The ref OBJECT is captured when the
 *   dialog opens, but its `.current` is read at CLEANUP time, so a consumer may
 *   point it at the exact control that opened this instance — the specific
 *   gallery thumbnail that was clicked, for example — rather than at a single
 *   fixed trigger, and may assign it at any point while the dialog is open. When
 *   omitted, or when it points at a node that has since left the document, focus
 *   returns to whatever was focused immediately before the dialog opened.
 * @returns {{
 *   panelProps: {
 *     ref: import('react').RefObject<HTMLElement>,
 *     role: 'dialog',
 *     'aria-modal': 'true',
 *     tabIndex: -1
 *   },
 *   scrimProps: { onClick: () => void, 'aria-hidden': 'true' }
 * }} Two stable prop bags:
 *   - `panelProps` — spread onto the dialog panel element. `ref` is the hook's
 *     internal panel ref, which it needs in order to scope its focusable query;
 *     `role="dialog"` and `aria-modal="true"` are the pattern's required
 *     semantics; `tabIndex={-1}` makes the panel programmatically focusable so
 *     it can hold focus itself when it contains nothing focusable. There is
 *     deliberately NO `onKeyDown` here — the key listener is attached to
 *     `document` (see below).
 *   - `scrimProps` — spread onto the backdrop element. `onClick` dismisses via
 *     `onClose`; `aria-hidden="true"` keeps the purely decorative scrim out of
 *     the accessibility tree, where the dialog's own semantics already convey
 *     modality. The scrim is a presentational sibling of the panel and must not
 *     contain it, or a click inside the dialog would bubble to the scrim and
 *     close it.
 *
 * Both bags keep a stable identity across renders, so spreading them causes no
 * prop churn.
 *
 * @example
 * // Inside src/components/ui/Dialog.jsx — the hook owns behaviour, the
 * // component owns portalling, naming and presentation:
 * const { panelProps, scrimProps } = useDialog({
 *   open,
 *   onClose,
 *   initialFocusRef,
 *   returnFocusRef,
 * })
 * // return open
 * //   ? createPortal(
 * //       <div className="fixed inset-0 z-50">
 * //         <div {...scrimProps} className="absolute inset-0 bg-foreground/60" />
 * //         <div
 * //           {...panelProps}
 * //           aria-label={labelledBy ? undefined : label}
 * //           aria-labelledby={labelledBy}
 * //           className="absolute ..."
 * //         >
 * //           {children}
 * //         </div>
 * //       </div>,
 * //       document.body, // OUTSIDE #root — see the portal precondition above
 * //     )
 * //   : null
 */
export function useDialog({ open = false, onClose, initialFocusRef, returnFocusRef } = {}) {
  // All hooks are declared unconditionally at the top level, in a stable order
  // (oxlint `react/rules-of-hooks`). `panelRef` is handed to the consumer
  // through `panelProps` so the trap can scope its focusable query to the panel.
  const panelRef = useRef(null)

  // Latest-value mirror of every input the effect and the scrim handler read.
  //
  // THIS IS THE LEAST OBVIOUS LINE IN THE FILE. The main effect below is keyed
  // on `open` ALONE and must never depend on `onClose`: a consumer may pass an
  // inline arrow, whose identity changes on every render, and with `onClose` in
  // the dependency array the entire trap would tear down and re-establish on
  // every render. That would re-fire initial focus continuously and — far worse
  // — re-capture `previouslyFocused` as an element INSIDE the panel, which
  // permanently destroys focus restoration: on close, focus would be handed back
  // to a node that no longer exists. Reading through a ref keeps the latest
  // callback available while the effect stays established exactly once per open
  // and torn down exactly once per close.
  const latestRef = useRef({ onClose, initialFocusRef, returnFocusRef })

  // Declared BEFORE the main effect on purpose. React runs all of a fiber's
  // effect destroy functions before any of its create functions, and runs each
  // group in declaration order. So on the render that opens the dialog this
  // mirror is refreshed BEFORE the trap is set up (initial focus sees the
  // current render's refs), while on the render that closes it the trap's
  // cleanup runs BEFORE this mirror is refreshed (focus restoration sees the
  // refs as they stood during the last open render). Both are what we want.
  useEffect(() => {
    latestRef.current = { onClose, initialFocusRef, returnFocusRef }
  })

  useEffect(() => {
    // The hook call is unconditional; only this BODY is conditional — the
    // rules-of-hooks-safe shape both pre-existing implementations use.
    if (!open) return undefined
    // Non-DOM environments (server rendering, non-DOM test runners) never get
    // this far in practice, because effects do not run there; the guard keeps
    // the module safe if one ever does.
    if (typeof document === 'undefined') return undefined

    // 1. CAPTURE BEFORE DISTURBING. Both values are read before any focus is
    // moved and before `#root` is inerted, and are copied into effect-local
    // consts so the cleanup closure can never observe a ref that changed
    // meanwhile.
    const previouslyFocused = document.activeElement
    const rootEl = document.getElementById(APP_ROOT_ID)
    const panelAtOpen = panelRef.current
    // Both consumer refs are copied out of the mirror here, at setup, as REF
    // OBJECTS rather than as their current nodes. That distinction is the whole
    // point: the object is captured once (refs are stable), while `.current` is
    // still read at the moment it is needed — `initialFocusRef` immediately
    // below, `returnFocusRef` in the cleanup — so the target is always the live
    // node the consumer last assigned, never a snapshot taken on open.
    const { initialFocusRef: initialRef, returnFocusRef: returnRef } = latestRef.current

    const onKeyDown = (event) => {
      // 3. ESCAPE CLOSES. Dismissal is the consumer's decision to execute; this
      // hook only reports the request.
      if (event.key === 'Escape') {
        latestRef.current.onClose?.()
        return
      }
      if (event.key !== 'Tab') return

      // The panel node is re-read on every keystroke rather than closed over:
      // a placement change or a remount replaces the node, and a stale
      // reference would trap focus against an element no longer on the page.
      const panel = panelRef.current
      if (!panel) return

      // 5. RE-QUERY LIVE, on every Tab. A snapshot taken when the dialog opened
      // goes stale as soon as the panel's contents change.
      const focusables = getFocusables(panel)

      // 6. NOTHING FOCUSABLE. Swallow the Tab so focus cannot leak to the
      // background, and pin it to the panel itself — possible because
      // `panelProps` carries `tabIndex={-1}`.
      if (focusables.length === 0) {
        event.preventDefault()
        if (!panel.contains(document.activeElement)) panel.focus()
        return
      }

      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement

      // 7. WRAP IN BOTH DIRECTIONS, AND RECOVER STRAY FOCUS. "Focus is outside
      // the panel" is treated identically to "focus is on the boundary
      // element", which is what pulls focus that has somehow escaped back in
      // rather than letting it walk the background.
      if (event.shiftKey) {
        if (active === first || !panel.contains(active)) {
          event.preventDefault()
          last.focus()
        }
      } else if (active === last || !panel.contains(active)) {
        event.preventDefault()
        first.focus()
      }
    }

    // 8. LISTEN ON `document`, NOT ON THE PANEL. This is load-bearing: a
    // panel-scoped `onKeyDown` stops firing the moment focus escapes the panel,
    // which is exactly the case the stray-focus recovery above exists to fix.
    // Hence no `onKeyDown` in `panelProps`.
    document.addEventListener('keydown', onKeyDown)

    // Scroll lock, per the standardisation ruling in this hook's JSDoc: capture
    // the prior inline value and restore it verbatim on close, so an overflow
    // set by something else on the page survives the dialog's lifetime.
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // 9. `inert` ON `#root` — the DOM property, assigned imperatively, because
    // `#root` lives outside React's tree. The panel is portalled outside `#root`
    // (see the portal precondition), so it stays fully interactive. Engines
    // without `inert` support simply ignore the assignment; the focus trap above
    // is what keeps those browsers correct for keyboard users.
    if (rootEl) rootEl.inert = true

    // 2. INITIAL FOCUS, in three tiers: the consumer's explicit target, then the
    // first focusable descendant, then the panel itself.
    const explicitTarget = initialRef?.current ?? null
    if (isFocusable(explicitTarget)) {
      explicitTarget.focus()
    } else {
      const firstFocusable = getFocusables(panelAtOpen)[0]
      if (isFocusable(firstFocusable)) {
        firstFocusable.focus()
      } else if (isFocusable(panelAtOpen)) {
        panelAtOpen.focus()
      }
    }

    // 10. CLEANUP ORDER IS MANDATORY:
    //     remove listener -> release scroll lock -> CLEAR inert -> restore focus.
    // A `focus()` call into an inert subtree is silently DROPPED, and the opener
    // almost always lives inside `#root`, so the shell must be live again before
    // anything in it is focused. Getting this order wrong is invisible in review
    // and total at runtime.
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      if (rootEl) rootEl.inert = false

      // Restore focus to the control that opened the dialog (WAI-ARIA dialog
      // pattern). This runs in React's passive phase, AFTER the portalled panel
      // has already been removed from the DOM — which blurs whatever was focused
      // inside it to `<body>` — so this is the final focus operation and its
      // target must be re-checked for liveness rather than trusted.
      //
      // `returnFocusRef.current` is read HERE, not at open time, so it can point
      // at the exact control that opened this instance — the specific gallery
      // thumbnail that was clicked, not a single fixed trigger. `document.body`
      // is excluded deliberately: focusing it is a no-op that would silently
      // leave the user at the start of the document.
      const returnTarget = returnRef?.current ?? null
      let restoreTarget = null
      if (isFocusable(returnTarget)) {
        restoreTarget = returnTarget
      } else if (isFocusable(previouslyFocused) && previouslyFocused !== document.body) {
        restoreTarget = previouslyFocused
      }
      restoreTarget?.focus()
    }
    // `open` is the ONLY dependency, deliberately — see `latestRef` above.
  }, [open])

  // Stable dismissal handler for the scrim. Reads `onClose` through the mirror
  // ref so its own identity never changes, which is what keeps `scrimProps`
  // stable even when the consumer passes a fresh inline `onClose`.
  const handleScrimClick = useCallback(() => {
    latestRef.current.onClose?.()
  }, [])

  // `panelRef` is stable for the component's lifetime, so this bag can be built
  // once. `role` and `aria-modal` are the pattern's required semantics;
  // `tabIndex: -1` lets the panel hold focus without joining the tab sequence.
  // Naming (`aria-label` / `aria-labelledby`) is `Dialog.jsx`'s to add.
  const panelProps = useMemo(
    () => ({
      ref: panelRef,
      role: 'dialog',
      'aria-modal': 'true',
      tabIndex: -1,
    }),
    [],
  )

  const scrimProps = useMemo(
    () => ({
      onClick: handleScrimClick,
      'aria-hidden': 'true',
    }),
    [handleScrimClick],
  )

  return { panelProps, scrimProps }
}
