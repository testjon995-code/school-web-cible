import { useEffect, useId, useRef, useState } from 'react'
import { FaChevronDown } from 'react-icons/fa'
import { cn } from '../../lib/cn.js'

/**
 * Resolve the per-item id suffix for every disclosure, positionally.
 *
 * Trigger/panel ids are derived from `useId()` plus a per-item suffix. By
 * default that suffix is the item's positional index — the historic, stable
 * form `${accordionId}-trigger-${index}`, which is ALSO the React key of each
 * item wrapper, so it must never drift (a changed key remounts every item and
 * discards the open state). Callers that need a *predictable* id — so a URL
 * fragment such as `/faq#faq-<id>` can address one question — pass `itemIds`.
 *
 * Resolution rules, in order:
 * - `itemIds` is read POSITIONALLY and is never filtered or compacted; a `null`
 *   (or absent, or blank) slot falls back to that slot's index, so a hole can
 *   never shift a later id onto the wrong item.
 * - A supplied suffix is used only when it is a non-empty string once trimmed.
 * - A suffix that is already claimed falls back to the generated form, so no
 *   duplicate DOM id is ever rendered. The claimed set is SEEDED with the whole
 *   positional range, because the generated form is an immutable contract and
 *   cannot yield: that makes `['0']`-style input (a bare index) defer to the
 *   generated id rather than collide with another slot's fallback. Real ids are
 *   kebab-case (`class-timings`), so this only ever fires on degenerate input.
 * - Entries beyond `items.length` are simply never read.
 *
 * `explicitId` is the accepted caller id (or `null`), and is what `openIds`
 * matches against — a rejected duplicate therefore never resolves, so
 * `openIds: ['a']` against `itemIds: ['a', 'a']` opens only the first item.
 *
 * @param {number} count Number of rendered items.
 * @param {Array<string|null>|undefined} itemIds Caller-supplied suffixes.
 * @returns {Array<{suffix: string, explicitId: string|null}>} One entry per
 *   item, positionally aligned with `items`.
 */
function resolveItemIdentities(count, itemIds) {
  const supplied = Array.isArray(itemIds) ? itemIds : []
  const claimed = new Set()
  for (let index = 0; index < count; index += 1) claimed.add(String(index))

  const identities = []
  for (let index = 0; index < count; index += 1) {
    const raw = supplied[index]
    const candidate = typeof raw === 'string' ? raw.trim() : ''
    if (candidate !== '' && !claimed.has(candidate)) {
      claimed.add(candidate)
      identities.push({ suffix: candidate, explicitId: candidate })
    } else {
      identities.push({ suffix: String(index), explicitId: null })
    }
  }
  return identities
}

/**
 * Reduce the caller's requested open set to a STABLE STRING of indexes.
 *
 * The component tracks open panels by positional index, so the requested ids
 * are mapped onto indexes here. Returning a joined string (rather than an
 * array) is deliberate: it lets the initial-open effect depend on a value that
 * is equal across renders, so a caller passing a fresh `openIds={[id]}` literal
 * every render cannot re-open panels on every render and fight the visitor's
 * own toggling.
 *
 * An id that matches no slot — unknown, blank, or a rejected duplicate — is
 * ignored silently. An empty result yields `''`, which the caller treats as
 * "nothing requested" and therefore as "change nothing".
 *
 * @param {Array<{suffix: string, explicitId: string|null}>} identities Resolved
 *   item identities.
 * @param {string[]|undefined} openIds Ids requested open.
 * @param {boolean} allowMultiple When `false`, only the first resolved id is
 *   kept so the single-open invariant cannot be violated.
 * @returns {string} Comma-joined indexes, or `''` when nothing resolves.
 */
function resolveOpenKey(identities, openIds, allowMultiple) {
  if (!Array.isArray(openIds) || openIds.length === 0) return ''
  const resolved = []
  for (const rawId of openIds) {
    const wanted = typeof rawId === 'string' ? rawId.trim() : ''
    if (wanted === '') continue
    const index = identities.findIndex((identity) => identity.explicitId === wanted)
    if (index === -1 || resolved.includes(index)) continue
    resolved.push(index)
    if (!allowMultiple) break
  }
  return resolved.join(',')
}

/**
 * Expand a key produced by {@link resolveOpenKey} back into open indexes.
 *
 * @param {string} key Comma-joined indexes, possibly empty.
 * @returns {number[]} The open index list.
 */
function parseOpenKey(key) {
  return key === '' ? [] : key.split(',').map(Number)
}

/**
 * Accordion — CIBLE School of Language.
 *
 * THE canonical accessible disclosure/accordion primitive for the SPA. It
 * renders a vertical stack of question/answer disclosures following the
 * WAI-ARIA Accordion (disclosure) pattern, and is composed by higher-level
 * components (`src/components/common/FAQ.jsx`) and the FAQ page
 * (`src/pages/Faq.jsx`).
 *
 * Accessibility (WCAG AA):
 * - Each trigger is a real `<button type="button">`, so native Enter/Space
 *   activation, focusability and disabled semantics come for free — no custom
 *   key handling on a non-interactive element.
 * - `aria-expanded` reflects the open state and `aria-controls` points at the
 *   panel; the panel is a labelled `role="region"` (`aria-labelledby` -> the
 *   trigger id) so assistive technology announces the relationship. Trigger and
 *   panel ids are scoped with a `useId()` prefix so they stay globally unique
 *   even when multiple accordions are rendered on the same page.
 * - Collapsed panels use the native `hidden` attribute (`hidden={!isOpen}`),
 *   which removes them from both the visual layout and the accessibility tree
 *   while keeping the `aria-controls` target present in the DOM.
 * - Each trigger is wrapped in a real heading element (configurable via
 *   `headingAs`, default `<h3>`) so the document outline stays correct; `m-0`
 *   prevents the heading's default margins from leaking into the layout.
 * - The disclosure chevron is decorative (`aria-hidden`) and rotates to signal
 *   state; hover feedback (`hover:bg-surface`) is background-based, never a
 *   color-only signal. A visible keyboard focus ring is rendered via
 *   `focus-visible:ring-*`. Reduced-motion is honored globally in
 *   `src/index.css`, so transitions are neutralized there with no extra work.
 *
 * Styling:
 * - Every value resolves to a Tailwind `@theme` brand token defined in
 *   `src/index.css` (border, surface, foreground, muted, primary-600,
 *   radius-2xl) on the 8px spacing scale — there are no hardcoded or arbitrary
 *   `[..]` values. Class composition (including the caller `className`, merged
 *   last so it can override) flows through the shared `cn()` helper.
 *
 * @param {object} props
 * @param {Array<{question?: string, answer?: React.ReactNode, title?: string, content?: React.ReactNode}>} [props.items=[]]
 *   Disclosure items. `{ question, answer }` is canonical; `{ title, content }`
 *   is also tolerated (read via `??`) so flexible FAQ data shapes work as-is.
 * @param {boolean} [props.allowMultiple=false] When `false` (default) only one
 *   panel is open at a time; when `true` any number may be open simultaneously.
 * @param {React.ElementType} [props.headingAs='h3'] Heading element that wraps
 *   each trigger button, chosen to fit the surrounding document outline.
 * @param {string} [props.className] Extra classes merged last onto the outer
 *   wrapper.
 * @param {Array<string|null>} [props.itemIds=[]] Optional per-item id suffixes,
 *   EQUAL-LENGTH and positionally aligned with `items`; a slot may be `null` to
 *   keep that item's generated id. Supplying one makes a trigger's DOM id
 *   predictable, which is what lets a URL fragment address a single disclosure
 *   (e.g. `/faq#faq-<id>`) instead of guessing a `useId()` value. Suffixes are
 *   still namespaced with this instance's `useId()` prefix, so two accordions
 *   carrying the same `itemIds` on one page cannot collide, and a blank or
 *   duplicate entry falls back to the generated form so no duplicate DOM id is
 *   ever rendered. See {@link resolveItemIdentities} for the exact rules. When
 *   omitted, every id is character-for-character what it has always been.
 * @param {string[]} [props.openIds] Optional ids (matched against `itemIds`) to
 *   start open. This is an INITIAL-open set, not full control: it is applied on
 *   mount and whenever the requested set actually changes, after which the
 *   component's own toggle state takes over, so existing callers keep owning no
 *   state at all. Unknown ids are ignored silently, an empty or fully
 *   unresolvable set changes nothing, and when `allowMultiple` is `false` only
 *   the first resolved id is opened.
 * @returns {JSX.Element} The rendered accordion wrapper.
 */
function Accordion({
  items = [],
  allowMultiple = false,
  headingAs: Heading = 'h3',
  className,
  itemIds = [],
  openIds,
}) {
  // Resolve the id suffix of every item in ONE positional pass, before render,
  // so duplicate and blank entries can be detected against the slots that came
  // before them (which is impossible from inside `items.map`). Pure and cheap.
  const identities = resolveItemIdentities(items.length, itemIds)
  // The requested initial-open set, reduced to a string that is equal across
  // renders when the request has not changed (see `resolveOpenKey`).
  const requestedOpenKey = resolveOpenKey(identities, openIds, allowMultiple)
  // Seeded from the request so a panel addressed by `openIds` is already open on
  // the FIRST paint — no open-after-mount flash, and nothing to measure before
  // the caller scrolls it into view. Still `[]` (closed on mount) for every
  // caller that passes no `openIds`, exactly as before.
  const [openIndexes, setOpenIndexes] = useState(() => parseOpenKey(requestedOpenKey))
  // Tracks which request the open state already reflects, so the effect below
  // re-applies on a genuine change only and never overwrites a panel the
  // visitor has since toggled themselves.
  const appliedOpenKeyRef = useRef(requestedOpenKey)
  // Per-instance unique id prefix so trigger/panel ids stay globally unique when
  // several accordions render on the same page (valid HTML + correct
  // aria-controls / aria-labelledby resolution for assistive technology).
  const accordionId = useId()

  // Apply `openIds` when the requested set changes after mount (e.g. the visitor
  // follows a second `#faq-<id>` link on the same page). An empty key means
  // nothing resolved — unknown ids, or no request at all — and deliberately
  // leaves the current open state untouched rather than closing everything.
  useEffect(() => {
    if (requestedOpenKey === '' || appliedOpenKeyRef.current === requestedOpenKey) return
    appliedOpenKeyRef.current = requestedOpenKey
    setOpenIndexes(parseOpenKey(requestedOpenKey))
  }, [requestedOpenKey])

  const toggle = (index) => {
    setOpenIndexes((prev) => {
      if (prev.includes(index)) return prev.filter((i) => i !== index)
      return allowMultiple ? [...prev, index] : [index]
    })
  }

  return (
    <div className={cn('divide-y divide-border overflow-hidden rounded-2xl border border-border bg-white', className)}>
      {items.map((item, index) => {
        const isOpen = openIndexes.includes(index)
        // Falls back to the positional index, so with no `itemIds` these ids —
        // and therefore the wrapper's React key below — are byte-identical to
        // the historic form and no item is ever needlessly remounted.
        const suffix = identities[index]?.suffix ?? String(index)
        const triggerId = `${accordionId}-trigger-${suffix}`
        const panelId = `${accordionId}-panel-${suffix}`
        const question = item.question ?? item.title
        const answer = item.answer ?? item.content
        return (
          <div key={triggerId}>
            <Heading className="m-0">
              <button
                type="button"
                id={triggerId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(index)}
                className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left text-base font-medium text-foreground transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-600"
              >
                <span>{question}</span>
                <FaChevronDown
                  aria-hidden="true"
                  className={cn('h-4 w-4 shrink-0 text-muted transition-transform duration-200', isOpen && 'rotate-180')}
                />
              </button>
            </Heading>
            <div
              id={panelId}
              role="region"
              aria-labelledby={triggerId}
              hidden={!isOpen}
              className="px-6 pb-4 text-muted"
            >
              {answer}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default Accordion
