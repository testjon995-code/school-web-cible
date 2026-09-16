import { useEffect, useId, useRef, useState } from 'react'
import Input from './Input.jsx'
import { cn } from '../../lib/cn.js'

/**
 * Combobox — the type-ahead search widget for the CIBLE School of Language SPA.
 * ----------------------------------------------------------------------------
 * This is the ONE place in the codebase where a hand-built ARIA widget is
 * justified, and it is worth saying why, because the sibling `Select` primitive
 * argues the exact opposite for its own case: a single-choice dropdown maps
 * cleanly onto a native `<select>`, so `Select` renders one and inherits the
 * platform's keyboard interaction, type-ahead and screen-reader announcements
 * for free. A type-ahead search field has NO native equivalent — the user must
 * keep typing into a real text field while a filtered list of suggestions
 * updates beneath it, and no HTML element provides that. (`<input list>` plus
 * `<datalist>` is the closest thing and is unusable here: its popup is not
 * styleable, its behaviour differs materially between engines, and it cannot
 * render a two-line result row with secondary context text.) So this component
 * implements the W3C WAI-ARIA Authoring Practices "combobox with list
 * autocomplete" pattern by hand — and implements it in full, because "no ARIA
 * is better than bad ARIA" cuts both ways: a half-built combobox is worse for a
 * screen-reader user than a plain text input would have been.
 *
 * Scope — what this primitive does NOT do:
 *   It owns the text field, the popup, the ARIA wiring and the keyboard
 *   interaction, and nothing else. It does not search, filter, group, cap or
 *   NAVIGATE. The consumer (`components/common/GlobalSearch.jsx`) passes an
 *   already filtered, already ordered, already capped `options` array and
 *   decides what a selection MEANS by handling `onSelect` — typically routing to
 *   the selected record's own page. Keeping navigation out of here is what lets
 *   the same widget serve the header popover and the full `/search` results
 *   route without either of them re-implementing the pattern.
 *
 * THE decisive behaviour — DOM focus NEVER leaves the textbox:
 *   • Arrow keys move an ACTIVE INDEX held in component state. No option is ever
 *     focused, and options are deliberately not focusable (they are not buttons
 *     and carry no `tabIndex`), so `document.activeElement` is the `<input>`
 *     from the first keystroke to the last. That is what keeps typing and
 *     browsing the suggestions one uninterrupted interaction instead of two.
 *   • The active option is exposed programmatically through
 *     `aria-activedescendant` on the input, pointing at that option's DOM id —
 *     and the attribute is OMITTED entirely while no option is active.
 *   • Because the option is not genuinely focused, no browser scrolls it into
 *     view: engines manage visibility for real focus, never for
 *     `aria-activedescendant`. This component therefore scrolls the active
 *     option into view ITSELF whenever the active index changes, with
 *     `scrollIntoView({ block: 'nearest' })`. Without that call a keyboard user
 *     arrowing past the bottom of the capped, scrolling list sees nothing move —
 *     the most commonly omitted half of this pattern. `'nearest'` is
 *     deliberate: an option that is already visible does not move, so the list
 *     never jumps under the reader. The default (instant) scrolling behaviour is
 *     used rather than smooth scrolling, so there is no animation to suppress
 *     and no reduced-motion branch that could get it wrong.
 *
 * ARIA surface, exactly — and nothing beyond it:
 *   • input : `role="combobox"`, `aria-expanded`, `aria-autocomplete="list"`
 *     (correct here because the suggestions are filtered by what was typed),
 *     `aria-controls` referencing the popup ONLY while the popup is rendered,
 *     and `aria-activedescendant` only while an option is active.
 *   • popup : `role="listbox"` on the `<ul>` with `role="option"` on each
 *     `<li>`, `aria-selected` on the active option only, and `aria-disabled` on
 *     any option the caller marked unavailable. No group roles, no decoration.
 *     The `<ul>` carries `tabIndex={-1}` so the popup is never a sequential tab
 *     stop — see the comment on that attribute, which explains the concrete
 *     Chrome focus bug it prevents. The OPTIONS have no `tabIndex` at all.
 *   • `aria-haspopup` is deliberately ABSENT: `role="combobox"` already carries
 *     an implicit `aria-haspopup="listbox"`, so restating it is redundant noise.
 *
 * Keyboard contract:
 *   • Down / Up  — move the active option, wrapping at both ends and skipping
 *     disabled rows; open the popup first when it is closed. Both keys call
 *     `preventDefault()` so the text caret does not jump to the start/end of the
 *     query and the page does not scroll. Alt+Down opens the popup without
 *     making any option active (the Authoring Practices "just show me" gesture).
 *   • Enter — accepts the active option and closes the popup, calling
 *     `preventDefault()` as it does so. With NO active option the key is left
 *     completely alone. That pairing is what lets a consumer keep its own
 *     free-text behaviour ("search everything for what I typed") without this
 *     component knowing anything about it: wrap the field in a `<form>` and
 *     handle `onSubmit`, because Enter implicitly submits a text field and the
 *     `preventDefault()` above suppresses exactly the case where a suggestion
 *     was accepted instead. Note that a caller's own `onKeyDown` deliberately
 *     runs BEFORE this handler (see below), so it cannot be used to detect
 *     whether the suggestion list claimed the key — the form's `onSubmit` is
 *     the seam for that, not the keydown.
 *   • Escape — closes the popup and leaves focus in the textbox. It is swallowed
 *     (`stopPropagation`) ONLY when it actually closed an open popup, so an
 *     enclosing `Dialog` still receives Escape once the popup is shut: one key,
 *     two layers, no ambiguity and no swallowed dismissal.
 *   • Tab — never intercepted. There is no focus trap here; focus leaves
 *     normally and the popup closes on blur.
 *   • Home / End — deliberately NOT intercepted. In an editable combobox these
 *     belong to the text caret, and hijacking them would break ordinary editing.
 *   • Typing — re-opens the popup and clears the active option, so the first
 *     Down after a keystroke lands on the new list's first row rather than on
 *     whatever happened to sit at the old index.
 *
 * Pointer behaviour keeps the same invariant: the popup cancels the default
 * action of `mousedown`, so clicking a suggestion never blurs the textbox, and a
 * pointer-down inside the popup suppresses the blur-close that would otherwise
 * unmount the row before its click could fire. Hover is purely visual — the
 * active option stays keyboard-driven, so moving the mouse never scrolls the
 * list or changes what `aria-activedescendant` reports.
 *
 * Empty list: when `options` holds no usable entry the popup is NOT rendered at
 * all — `aria-expanded` stays `false` and `aria-controls` is omitted. An empty
 * listbox announces "listbox, 0 items" and helps nobody, and the "nothing
 * matched" copy belongs to the consumer, which alone knows whether the list is
 * empty because the query found nothing or because nothing has been typed yet.
 *
 * Accessible name: pass EITHER `labelledBy` (the id of an existing visible
 * heading or label, applied to both the textbox and the listbox) OR `Input`'s
 * own `label` prop — never both, because `aria-labelledby` wins over a native
 * `<label>` and supplying both leaves the field with two competing names. With
 * neither, pass an `aria-label` through `...rest`. `type` is left at `Input`'s
 * `'text'` default on purpose: `type="search"` makes some browsers clear the
 * field on Escape, which would fight this widget's Escape-closes-the-popup rule.
 *
 * Design system (tokens from `src/index.css`, composed through `cn()`):
 *   • Popup   — `bg-white`, `border-border`, `rounded-2xl`, `shadow-md`, `z-50`
 *     (the existing overlay layer), i.e. the same calm chrome as `Card`, which
 *     is what "do not make search visually overwhelming" asks for.
 *   • Height  — capped by the existing named utility `max-h-screen-85` (85vh)
 *     with `overflow-y-auto`, so a long list SCROLLS instead of overflowing at
 *     every viewport width. No new utility or token is introduced. The cap is
 *     measured against the VIEWPORT, not against the space below the field, so
 *     on a very short viewport (under roughly 610px tall) the panel's lower edge
 *     can sit below the fold and the page scrolls to reach it; every option
 *     stays reachable, and expressing the cap any other way would mean an
 *     arbitrary `calc()` value, which this codebase does not permit.
 *     `scroll-py-2` keeps the scroll-into-view call from parking the active row
 *     flush against the panel's inner edge, so its own padding is preserved.
 *   • Rows    — `min-h-11` (44px) so every suggestion is a comfortable pointer
 *     target even though it is not focusable; label `text-sm`, secondary context
 *     `text-xs text-muted`, and `break-words` so a long title wraps rather than
 *     forcing the row to overflow horizontally.
 *   • State   — the active row is tinted `bg-primary-50` AND carries a heavier
 *     label weight, and it is additionally exposed through
 *     `aria-activedescendant` / `aria-selected`: colour is never the sole
 *     carrier of state.
 *   • Focus   — inherited. Focus stays in the textbox, so the visible indicator
 *     is the one `Input` already renders for its own `:focus-visible` state (a
 *     2px `primary-600` ring, which `Input` substitutes for the global
 *     `:focus-visible` outline). Nothing about focus styling is declared here,
 *     and neither the panel nor a row ever renders a ring, because neither ever
 *     holds focus.
 * Every class resolves to a theme token or a built-in utility — there are no
 * arbitrary bracket values — and the caller's `className` is merged LAST onto
 * the wrapper so it can override any default.
 * ----------------------------------------------------------------------------
 */

/**
 * Normalise the caller's `options` into render-ready descriptors.
 *
 * Module-local and unexported so this file exposes only the component
 * (react/only-export-components), and defensive by design: `options` arrives
 * from whatever the consumer's search pass produced, so a non-array, a hole, a
 * `null` entry or a record with no label must degrade to "fewer rows" rather
 * than to a thrown render.
 *
 * Each descriptor carries:
 *   • `domId`       — the unique DOM id `aria-activedescendant` points at. It is
 *     built from the component's `useId` prefix plus the option's OWN stable
 *     identifier (search records use group-prefixed ids such as
 *     `'course:spoken-english'`), never the array index, because indices shift
 *     as the query narrows and a shifting id makes the attribute lie.
 *   • `label` / `context` — the primary and optional secondary line. `context`
 *     falls back to a record's `group`, so a grouped search record still reads
 *     usefully in this flat list.
 *   • `disabled`    — `true` only when the caller said so explicitly.
 *   • `source` / `sourceIndex` — the caller's ORIGINAL entry and its position in
 *     the array they passed, which is what `onSelect` reports back so the
 *     consumer never has to map an internal shape onto its own records.
 *
 * @param {unknown} options - Candidate option list; entries may be records
 *   (`{ id, label, context, group, disabled }`) or plain strings.
 * @param {string} idPrefix - Stable per-instance prefix from `useId`.
 * @returns {Array<{domId: string, label: import('react').ReactNode, context?: import('react').ReactNode, disabled: boolean, source: unknown, sourceIndex: number}>}
 *   Render-ready descriptors, in the caller's order, with unique DOM ids.
 */
function normalizeOptions(options, idPrefix) {
  if (!Array.isArray(options)) return []

  const usedSuffixes = new Set()
  const items = []

  options.forEach((option, sourceIndex) => {
    if (option == null) return

    const isRecord = typeof option === 'object'
    const label = isRecord ? option.label : option
    // A row with nothing to read is not a suggestion: drop it instead of
    // rendering an empty 44px target (and never print "null"/"undefined").
    if (label == null || label === '') return

    const rawId = isRecord ? (option.id ?? sourceIndex) : option
    // Ids may not contain whitespace, so collapse it; fall back to the index if
    // the identifier was whitespace only.
    const suffix = String(rawId).trim().replace(/\s+/g, '-') || String(sourceIndex)

    // Guarantee uniqueness even when two records share an identifier: duplicate
    // DOM ids would make `aria-activedescendant` ambiguous and could scroll the
    // wrong row into view.
    let unique = suffix
    let collisions = 0
    while (usedSuffixes.has(unique)) {
      collisions += 1
      unique = `${suffix}-${collisions}`
    }
    usedSuffixes.add(unique)

    items.push({
      domId: `${idPrefix}-option-${unique}`,
      label,
      context: isRecord ? (option.context ?? option.group) : undefined,
      disabled: isRecord ? option.disabled === true : false,
      source: option,
      sourceIndex,
    })
  })

  return items
}

/**
 * Find the next selectable option in a direction, wrapping at both ends.
 *
 * Module-local and unexported. Disabled rows are stepped over, and the walk is
 * bounded by the list length so an all-disabled list terminates with "nothing
 * active" instead of looping forever.
 *
 * @param {Array<{disabled: boolean}>} items - Normalised descriptors.
 * @param {number} activeIndex - Current active index, or `-1` when none is.
 * @param {1|-1} step - `1` for Down, `-1` for Up.
 * @returns {number} The next selectable index, or `-1` when there is none.
 */
function nextEnabledIndex(items, activeIndex, step) {
  const count = items.length
  if (count === 0) return -1

  // With nothing active yet, Down must land on the FIRST row and Up on the
  // LAST, so start the walk just outside the list in the direction of travel.
  let index = activeIndex >= 0 ? activeIndex : step > 0 ? -1 : 0

  for (let hop = 0; hop < count; hop += 1) {
    index = (index + step + count) % count
    if (!items[index].disabled) return index
  }

  return -1
}

/**
 * @param {object} props
 * @param {string} [props.value=''] - The query text. This is a controlled
 *   field: the caller owns the string and re-renders with the next one.
 *   Non-string values are coerced for display so `null`/`undefined` can never
 *   surface as visible text.
 * @param {(event: import('react').ChangeEvent<HTMLInputElement>) => void} [props.onChange]
 *   Fired on every keystroke with the NATIVE change event (the same contract as
 *   `Input`, `Select` and react-hook-form's `register`), so the caller reads
 *   `event.target.value`. Typing also re-opens the popup and clears the active
 *   option.
 * @param {(option: unknown, index: number) => void} [props.onSelect] - Fired
 *   when an option is accepted by Enter or by a click, with the caller's
 *   ORIGINAL option entry and its index in the array they passed. Navigation is
 *   the caller's job; this component only reports the selection and closes.
 * @param {Array<{id?: string|number, label: import('react').ReactNode, context?: import('react').ReactNode, group?: import('react').ReactNode, disabled?: boolean}|string>} [props.options=[]]
 *   Suggestions to offer, already filtered, ordered and capped by the caller.
 *   Plain strings are accepted as a shorthand for `{ label }`. An empty (or
 *   malformed) list renders NO popup — the caller owns any "nothing matched"
 *   messaging.
 * @param {string} [props.labelledBy] - Id of the element that names this
 *   widget; applied as `aria-labelledby` to both the textbox and the listbox.
 *   Use this OR `Input`'s `label` prop, never both.
 * @param {string} [props.placeholder] - Native placeholder for the textbox.
 * @param {string} [props.className] - Extra classes for the positioned wrapper,
 *   merged LAST so a caller can override any default.
 * @param {(event: import('react').KeyboardEvent<HTMLInputElement>) => void} [props.onKeyDown]
 *   Optional caller key handler. It runs FIRST, and calling
 *   `event.preventDefault()` in it suppresses this component's own handling of
 *   that key, so a consumer can layer its own shortcut without forking the
 *   widget. Because it runs first it cannot observe whether this component went
 *   on to claim the key; for free-text Enter use a wrapping `<form>`'s
 *   `onSubmit` instead, as described in the keyboard contract above.
 * @param {(event: import('react').FocusEvent<HTMLInputElement>) => void} [props.onBlur]
 *   Optional caller blur handler; runs before the popup closes.
 * @param {(event: import('react').MouseEvent<HTMLInputElement>) => void} [props.onClick]
 *   Optional caller click handler; `preventDefault()` in it suppresses the
 *   click-to-reopen behaviour.
 * @param {object} props... - Everything else is forwarded to `Input` and, from
 *   there, onto the native `<input>` (`id`, `name`, `aria-label`, `ref`,
 *   `label`, `hint`, `error`, `inputClassName`, `autoFocus`, …). The pattern's
 *   own attributes are applied AFTER this spread so they cannot be clobbered.
 * @returns {import('react').ReactElement} The combobox textbox, plus its
 *   listbox popup while there are suggestions to show.
 */
function Combobox({
  value = '',
  onChange,
  onSelect,
  options = [],
  labelledBy,
  placeholder,
  className,
  onKeyDown,
  onBlur,
  onClick,
  ...rest
}) {
  // Hooks must run unconditionally at the top level (react/rules-of-hooks).
  const baseId = useId()
  const [open, setOpen] = useState(false)
  // `-1` means "no option is active". Held separately from the derived value
  // below so a narrowing list can never leave a stale index in state.
  const [requestedIndex, setRequestedIndex] = useState(-1)
  // Set on pointer-down inside the popup and consumed by the blur handler, so a
  // click on a suggestion is never swallowed by the popup closing first.
  const pointerInPopupRef = useRef(false)

  const listboxId = `${baseId}-listbox`
  const items = normalizeOptions(options, baseId)

  // The popup exists only when there is something to put in it.
  const isOpen = open && items.length > 0

  // Clamp the active index DURING RENDER rather than in an effect. The consumer
  // recomputes `options` on every keystroke, so the array identity changes on
  // every render; an effect keyed on it would reset the active option each time
  // and arrow navigation would never move. Deriving it here is also cheaper and
  // strictly safer: an index left pointing past the end of a narrowed list
  // simply resolves to "nothing active".
  const activeIndex = requestedIndex >= 0 && requestedIndex < items.length ? requestedIndex : -1
  const activeDomId = isOpen && activeIndex >= 0 ? items[activeIndex].domId : undefined

  // Manual scroll-into-view. Browsers reveal a genuinely focused element but
  // never the `aria-activedescendant` target, so the widget must do it or a
  // keyboard user arrowing below the fold of the capped list sees nothing move.
  // The node is resolved by id rather than through a ref map so the lookup
  // cannot go stale when the filtered list re-renders, and `block: 'nearest'`
  // leaves an already-visible row exactly where it is.
  useEffect(() => {
    if (!activeDomId || typeof document === 'undefined') return
    const optionEl = document.getElementById(activeDomId)
    if (optionEl && typeof optionEl.scrollIntoView === 'function') {
      optionEl.scrollIntoView({ block: 'nearest' })
    }
  }, [activeDomId])

  // Release the pointer-in-popup guard as soon as the press ends, wherever it
  // ends. Listening on the document (rather than on the popup) is what makes the
  // guard self-healing: a press that starts on a suggestion and is released
  // outside it still clears, so a later Tab-away cannot find a stale flag and
  // leave an orphaned popup behind. The cleanup also clears it, so closing the
  // popup by any route resets the guard.
  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return undefined

    const release = () => {
      pointerInPopupRef.current = false
    }

    document.addEventListener('mouseup', release)
    document.addEventListener('touchend', release)

    return () => {
      document.removeEventListener('mouseup', release)
      document.removeEventListener('touchend', release)
      pointerInPopupRef.current = false
    }
  }, [isOpen])

  // The field is controlled, and its value is echoed straight into the DOM, so
  // coerce anything non-string rather than letting "undefined" become visible.
  const text = value == null ? '' : String(value)

  const closePopup = () => {
    setOpen(false)
    setRequestedIndex(-1)
  }

  const selectAt = (index) => {
    const item = items[index]
    if (!item || item.disabled) return
    closePopup()
    // Report the caller's own entry (and its index in the array they passed),
    // never the internal descriptor: deciding what the selection means — which
    // route to open, which filter to apply — belongs to the consumer.
    onSelect?.(item.source, item.sourceIndex)
  }

  const handleChange = (event) => {
    setOpen(true)
    // A new query means a new list, so the previous active row is meaningless.
    setRequestedIndex(-1)
    onChange?.(event)
  }

  const handleKeyDown = (event) => {
    // Give the caller first refusal, and honour a key it says it has handled.
    onKeyDown?.(event)
    if (event.defaultPrevented) return

    const isDown = event.key === 'ArrowDown'
    const isUp = event.key === 'ArrowUp'

    if (isDown || isUp) {
      // Keep the caret where it is and keep the page from scrolling.
      event.preventDefault()
      if (items.length === 0) return

      // Alt+Down is the "open the popup, choose nothing yet" gesture.
      const openOnly = isDown && event.altKey

      if (!isOpen) {
        setOpen(true)
        if (!openOnly) setRequestedIndex(nextEnabledIndex(items, -1, isDown ? 1 : -1))
        return
      }

      if (openOnly) return
      setRequestedIndex(nextEnabledIndex(items, activeIndex, isDown ? 1 : -1))
      return
    }

    if (event.key === 'Enter') {
      // Only claim Enter when there is a suggestion to accept; otherwise the
      // caller's free-text submit must still reach its own handler.
      if (isOpen && activeIndex >= 0) {
        event.preventDefault()
        selectAt(activeIndex)
      }
      return
    }

    if (event.key === 'Escape' && isOpen) {
      // Swallow Escape ONLY when it actually closed this popup, so an enclosing
      // Dialog keeps its own Escape dismissal once the popup is shut.
      event.preventDefault()
      event.stopPropagation()
      closePopup()
    }
  }

  const handleBlur = (event) => {
    onBlur?.(event)
    // A pointer-down inside the popup must not close it: the click that selects
    // the row has not fired yet, and unmounting the row now would swallow it.
    if (pointerInPopupRef.current) {
      pointerInPopupRef.current = false
      return
    }
    closePopup()
  }

  const handleClick = (event) => {
    onClick?.(event)
    if (event.defaultPrevented) return
    // Let a pointer user reopen a popup they dismissed with Escape without
    // having to retype the query.
    if (items.length > 0) setOpen(true)
  }

  return (
    <div className={cn('relative', className)}>
      {/* The pattern's own wiring is applied AFTER `...rest`: these attributes
          and handlers ARE the widget, so a caller cannot clobber them by
          accident — the same defensive ordering `Button` uses for its href
          security props. `aria-haspopup` is intentionally absent because
          `role="combobox"` already implies a listbox popup. */}
      <Input
        autoComplete="off"
        placeholder={placeholder}
        aria-labelledby={labelledBy}
        {...rest}
        role="combobox"
        aria-expanded={isOpen}
        aria-autocomplete="list"
        aria-controls={isOpen ? listboxId : undefined}
        aria-activedescendant={activeDomId}
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onClick={handleClick}
      />

      {isOpen ? (
        <ul
          id={listboxId}
          role="listbox"
          aria-labelledby={labelledBy}
          // The popup must never be a SEQUENTIAL tab stop, and saying so
          // explicitly is load-bearing rather than decorative: Chrome 127+ makes
          // a scroll container keyboard-focusable when it has no focusable
          // children ("keyboard-focusable scrollers"), and this list is exactly
          // that — capped height plus `overflow-y-auto`, with deliberately
          // non-focusable options. Without this opt-out, Tab out of the textbox
          // moves focus INTO this element, the blur-close then unmounts it in
          // the same turn, and focus falls to <body> with no visible ring —
          // observed and reproduced in Chrome before this line was added. Nothing
          // is lost by opting out, because the list is already fully keyboard
          // operable through the textbox: the arrow keys move the active option
          // and scroll it into view. `-1` keeps it programmatically focusable,
          // and this is the CONTAINER — the options themselves never get a
          // tabIndex at all.
          tabIndex={-1}
          // `scroll-py-2` mirrors the panel's own `p-2`: without it the
          // scroll-into-view call aligns the active row's border box to the
          // scrollport edge and eats that padding, so the highlighted row ends
          // up flush against the panel's inner border. Built-in Tailwind
          // scroll-padding, so no token or utility is added for it.
          className="absolute inset-x-0 top-full z-50 mt-2 max-h-screen-85 overflow-y-auto scroll-py-2 rounded-2xl border border-border bg-white p-2 shadow-md"
          // The pointer half of "focus never leaves the textbox": cancelling the
          // default action of mousedown stops the browser blurring the input
          // when a suggestion is clicked. Handled on the list so it covers the
          // rows and the padding between them.
          onMouseDown={(event) => event.preventDefault()}
          onPointerDown={() => {
            pointerInPopupRef.current = true
          }}
        >
          {items.map((item, index) => {
            const isActive = index === activeIndex

            return (
              // An option is NOT focusable and carries no `tabIndex` by design:
              // every keystroke is handled on the textbox, which is where focus
              // stays. Activation by pointer is therefore a click handler on a
              // non-interactive element, which is correct for this pattern.
              <li
                key={item.domId}
                id={item.domId}
                role="option"
                aria-selected={isActive ? true : undefined}
                aria-disabled={item.disabled ? true : undefined}
                onClick={item.disabled ? undefined : () => selectAt(index)}
                className={cn(
                  'flex min-h-11 flex-col justify-center gap-1 rounded-lg px-3 py-2',
                  item.disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-surface',
                  isActive && !item.disabled && 'bg-primary-50',
                )}
              >
                <span
                  className={cn(
                    'break-words text-sm',
                    item.disabled ? 'text-muted' : 'text-foreground',
                    isActive ? 'font-semibold' : 'font-medium',
                  )}
                >
                  {item.label}
                </span>
                {item.context ? <span className="break-words text-xs text-muted">{item.context}</span> : null}
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}

export default Combobox

