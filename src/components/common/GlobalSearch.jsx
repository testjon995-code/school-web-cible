import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Combobox from '../ui/Combobox.jsx'
import Dialog from '../ui/Dialog.jsx'
import Button from '../ui/Button.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import {
  SEARCH_GROUPS,
  SUGGESTION_LIMIT,
  buildIndex,
  countResults,
  searchAll,
} from '../../lib/search.js'
import { cn } from '../../lib/cn.js'

/**
 * GlobalSearch — the site-wide search panel for the CIBLE School of Language
 * SPA (F9). It is the suggestion surface behind the header's search control: a
 * text field, a grouped suggestion list, and the two states that surface when
 * there is nothing to list.
 * ----------------------------------------------------------------------------
 * THIS FILE IS A LAZY BOUNDARY, AND THAT IS ITS MOST IMPORTANT PROPERTY
 *
 * `src/components/layout/Navbar.jsx` is rendered by the shell on every one of
 * the site's routes, so it is ALWAYS MOUNTED. A static `import` of this
 * component from there would pull `src/lib/search.js` into the entry chunk —
 * and with it every content module the index reads (courses, events, faculty,
 * blog, faq, navigation) — which is the exact opposite of what the search
 * feature is supposed to cost a visitor who never opens it. `Navbar` therefore
 * reaches this module through an explicit dynamic `import()`, and two rules
 * follow that must not be relaxed:
 *
 *   1. THIS FILE HAS A SINGLE DEFAULT EXPORT AND NOTHING ELSE. `Navbar` awaits
 *      `import('../common/GlobalSearch.jsx')` and renders `.default`. Every
 *      helper below is module-local and unexported, which also keeps the file
 *      clean under oxlint's `react/only-export-components`.
 *   2. {@link buildIndex} IS CALLED INSIDE THIS MODULE, ON MOUNT. That is what
 *      keeps the index-BUILDING work — not only the code — off the critical
 *      path: `search.js` performs no work at import time, and the index is
 *      built when this panel first appears. `buildIndex` memoises for the
 *      session, so re-opening the panel is free and no cache layer belongs
 *      here.
 *
 * The measurable acceptance test is the build output: `npm run build` must emit
 * a SEPARATE `GlobalSearch` chunk in `dist/assets`. Its absence means someone
 * statically imported this module from an eagerly mounted component, and the
 * whole rationale above has quietly collapsed.
 *
 * WHERE THE CONTRACT WITH `Navbar` IS DRAWN
 *   • `Navbar` owns the trigger, the `'idle' | 'loading' | 'ready' | 'failed'`
 *     import state machine, the `Spinner` shown while the chunk is in flight,
 *     the `role="alert"` message that offers `/search` when the import fails,
 *     and the focus hand-off from the mobile navigation drawer.
 *   • This component owns everything from the moment it mounts, including both
 *     halves of the `ready` state's focus contract: MOVING FOCUS TO THE INPUT
 *     on mount, and RETURNING IT TO THE OPENER on close. Each half has a
 *     different owner per presentation — `Dialog`'s `initialFocusRef` and
 *     `useDialog`'s teardown below `md`, an explicit mount effect above it —
 *     and both presentations end up behaving identically.
 *   • Dismissal is always a REQUEST: this panel calls `onClose` and never
 *     unmounts itself, because `Navbar` holds the state that mounted it.
 *
 *   Three caller obligations follow from that split, and each one has bitten:
 *
 *   1. STORE THE IMPORTED COMPONENT WITH A THUNK. `GlobalSearch` is a
 *      function, so `setPanel(mod.default)` makes React treat it as a STATE
 *      UPDATER and call `GlobalSearch(previousState)` — which throws
 *      immediately on the props destructure below, taking the route into the
 *      error boundary. `useState(componentFn)` has the same hazard as a lazy
 *      initialiser. The import state machine must use
 *      `setPanel(() => mod.default)` and `useState(() => cached)`. This is not
 *      hypothetical: it was observed and root-caused in a browser during this
 *      component's own validation.
 *   2. CLOSE THE DRAWER FIRST, below `md`. The trigger lives inside the
 *      navigation drawer, and the drawer is itself a `Dialog`. `Navbar` must
 *      close it BEFORE mounting this panel so exactly one dialog exists at any
 *      moment, handing focus straight across in the same interaction. Two live
 *      `Dialog` instances would contend over Escape, the focus trap, `#root`'s
 *      `inert` flag, the body scroll lock and focus restoration; `useDialog`
 *      documents that hazard and this component cannot police it from inside.
 *   3. MOUNT THE POPOVER AGAINST A RIGHT-HAND CONTROL, from `md` up. The panel
 *      positions itself `absolute right-0 top-full` and is a fixed 24rem
 *      (384px) wide, so it grows LEFTWARD from its containing block's inline
 *      end. Put it in a `relative` wrapper around the trigger — and that
 *      trigger must sit at least 384px from the viewport's inline start edge,
 *      which the header's right-hand cluster always satisfies (at the `md`
 *      breakpoint itself the bar is 768px wide, so the panel lands around
 *      x=360). There is deliberately no flip-or-shift collision handling: it
 *      would need measured inline styles, which this codebase does not permit,
 *      and the design fixes the trigger's position anyway. A trigger placed
 *      near the LEFT edge is therefore a mounting error, not a layout bug —
 *      measured in a browser, a left-edge trigger puts the panel at x=-278.
 *      Mounted with no positioned wrapper at all, the panel anchors to the
 *      sticky header instead (its `backdrop-blur` makes it a containing block)
 *      and still renders correctly under the bar's right edge.
 *
 * WHAT IT SEARCHES, AND WHO DECIDES WHERE A RESULT GOES
 *   `searchAll` returns matches already grouped by the six categories in
 *   {@link SEARCH_GROUPS} — courses, events, faculty, articles, FAQs and pages.
 *   `src/lib/search.js` IS THE SINGLE AUTHORITY ON `href`: it derives
 *   `/courses/<slug>`, `/events/<slug>`, a page's own path, and — for the two
 *   groups that have no per-record route — a URL FRAGMENT on the listing page
 *   (`/blog#post-<slug>`, `/faculty#faculty-<slug>`, `/faq#faq-<id>`). This
 *   file renders `record.href` EXACTLY AS GIVEN and derives, rewrites,
 *   normalises and special-cases nothing.
 *
 *   The fragment forms are a deliberate constraint rather than a shortcut.
 *   There is no `/blog/:slug` and no per-faculty route, and neither is being
 *   invented here: `BlogCard` is intentionally non-interactive and its former
 *   "Read more" control was REMOVED as a prior QA fix, so a search result row
 *   is the only thing that ever carries these hrefs — NO CARD GAINS A CALL TO
 *   ACTION IT DOES NOT HAVE TODAY. Landing correctly is then the destination
 *   page's job: the hash-aware effects on `Faq.jsx` (which opens the question
 *   first), `Blog.jsx` and `Faculty.jsx` scroll the anchored item into view and
 *   focus it.
 *
 * "DO NOT MAKE SEARCH VISUALLY OVERWHELMING" — HOW THAT IS HONOURED
 *   • AT MOST THREE SUGGESTIONS PER GROUP, passed as `searchAll`'s `limit` from
 *     the exported {@link SUGGESTION_LIMIT} so the number lives in one place.
 *     Six groups of three is a short, structured list; the uncapped view is
 *     `/search`, which Enter on the free text opens.
 *   • Rows are emitted in canonical group order and each group's first row
 *     carries a small section label, so the list reads as sections rather than
 *     as eighteen undifferentiated rows. The section label is part of that
 *     row's content, NOT a heading row of its own: `Combobox` renders a flat
 *     `role="listbox"` with no group roles, so a heading injected as an
 *     (`aria-disabled`) option would be announced as a selectable row — worse
 *     for a screen-reader user than the labelled row it replaced. Every row
 *     also carries its own `context` line, falling back to the group label when
 *     a record has none, so no row is ever bare and the raw group id is never
 *     displayed.
 *   • The list is capped with the EXISTING `max-h-screen-85` utility (inside
 *     `Combobox`) and scrolls. A tighter 70vh sibling utility was proposed and
 *     RETRACTED — that height appears nowhere in the token block, so a named
 *     utility wrapping it would be a hardcoded value wearing a token's name.
 *     Nothing here adds a token or a utility, and `src/index.css` has no diff.
 *
 * WHAT THIS SEARCH CLAIMS, AND WHAT IT DOES NOT
 *   Substring matching over in-repo content, plus the title-prefix boost
 *   `search.js` applies. That is the whole model. There is no spelling
 *   suggestion, no usage-frequency or engagement ordering, no most-searched
 *   list, no query logging, no recent-search history, no model of any kind and
 *   no network access whatsoever — no HTTP client, no socket, no server-sent
 *   stream. The site has no backend, and nothing in this panel pretends
 *   otherwise. The no-results copy names exactly the six groups that were
 *   searched, so what was looked at is never overstated.
 *
 *   THE DECLARED FUTURE SEAM is `SearchRemote` in `src/lib/search.js`:
 *   `searchRemote(query, options) => Promise<{ok: true, groups} | {ok: false,
 *   reason}>`. Adopting a real service costs this component a PENDING state in
 *   the listbox and a FAILURE row — and nothing else, because `SearchRecord` is
 *   unchanged, so the result rows, the grouping and the `href` derivation all
 *   stay exactly as they are. That is the part the seam preserves; it is not
 *   claimed to be a zero-diff substitution.
 *
 * SCALE, AND WHY THERE IS NO OPTIMISATION HERE
 *   The index is roughly fifty-five records, normalised once at build time into
 *   each record's `haystack`. A linear pass costs microseconds, so this is a
 *   plain controlled input that filters on every keystroke: no debounce, no
 *   worker, no fuzzy-match dependency, no index structure and no virtualisation.
 *   The two `useMemo` calls exist to keep the option array's identity stable
 *   between unrelated re-renders, not because the pass is expensive.
 *
 * RESPONSIVE PRESENTATION — ONE BODY, TWO CONTAINERS
 *   • From `md` up: an inline popover anchored under the trigger
 *     (`absolute right-0 top-full z-50`), dismissed by Escape, by a pointer
 *     press outside it, or by focus leaving it. It is deliberately NOT a modal:
 *     the page behind it stays usable.
 *   • Below `md`: the same body inside a centre-placed `Dialog`, which brings
 *     the focus trap, the scrim, the scroll lock, Escape and focus restoration
 *     with it. The panel is full height because the suggestion list floats
 *     inside the panel's own scroll container — a content-hugging panel would
 *     clip a 400px list into a ~110px scrollport. It also carries a visible
 *     Close control, because a full-height panel leaves only the wrapper's 16px
 *     gutter of scrim to tap.
 *   • The presentation is decided ONCE, at mount. Crossing the `md` boundary
 *     while the panel is open calls `onClose` rather than swapping containers
 *     mid-life: the trigger itself moves across that boundary (drawer item
 *     below `md`, bar control above it), so the control that opened this panel
 *     no longer exists in the new layout. Closing is the same decision the
 *     navigation drawer and the course-filter sheet already make at `lg`.
 *
 * ACCESSIBILITY
 *   • `Combobox` owns the WAI-ARIA wiring: `role="combobox"`, `aria-expanded`,
 *     `aria-autocomplete="list"`, `aria-controls` only while the popup is
 *     visible, and `aria-activedescendant` tracking the active option. DOM
 *     FOCUS NEVER LEAVES THE TEXTBOX — the active option is never focused and
 *     is scrolled into view by the widget itself. Nothing here interferes with
 *     that, which is why option rows are plain data and navigation happens in
 *     `onSelect`.
 *   • Escape works in two layers and in the right order: `Combobox` swallows it
 *     ONLY when it closed an open popup, so the first press closes the
 *     suggestion list and the second reaches this panel (its own key handler
 *     above `md`, `useDialog`'s document handler below it) and closes it.
 *   • Free-text Enter is a real form submission: the field is wrapped in
 *     `<form role="search">` and `Combobox` claims Enter only when a suggestion
 *     is active, which is precisely the case `onSubmit` must not see.
 *   • Focus returns to the control that opened the panel when it closes while
 *     holding focus — Escape, or accepting a suggestion — in both
 *     presentations. When the visitor has already moved focus elsewhere (an
 *     outside press on a link, a Tab away) the popover deliberately leaves it
 *     alone rather than yanking it back; see the cleanup comment for how that
 *     distinction is actually detected.
 *   • The suggestion count is announced through a page-local visually hidden
 *     polite region, leaving the shell's title-mirroring announcer with its
 *     single existing meaning.
 *   • The panel's accessible name is one visually hidden `<p>`, referenced by
 *     the textbox, the listbox and (below `md`) the dialog. It is deliberately
 *     not a heading, and `EmptyState` is asked for `headingAs="p"`, so this
 *     transient panel never injects a heading into the header region ahead of
 *     the page's `h1`.
 *   • Every control is a `Button` or the native textbox, so the 44px floor and
 *     the single global `:focus-visible` ring are inherited, never redeclared.
 *
 * DESIGN SYSTEM
 *   `bg-white` surface, `border-border` hairline, `rounded-2xl` radius,
 *   `shadow-md` elevation, `z-50` overlay layer, `text-foreground` labels and
 *   `text-xs text-muted` secondary lines — every one an existing token,
 *   composed through {@link cn}, with the caller's `className` merged LAST. No
 *   arbitrary bracket value, no gradient, no glass effect, no decorative
 *   animation: the panel's only motion is the `Dialog`'s, under the shell's
 *   `MotionConfig reducedMotion="user"`.
 *
 * @param {object} props
 * @param {() => void} [props.onClose] Dismissal request — Escape, a scrim
 *   click, a pointer press outside the popover, focus leaving the popover, a
 *   viewport crossing of the `md` boundary, the mobile Close control, or a
 *   navigation away from the panel. The caller owns the state that mounted this
 *   component, so it owns the closing. A non-function value is ignored rather
 *   than called.
 * @param {string} [props.className] Extra classes merged LAST onto the panel
 *   (the popover root above `md`, the `Dialog` panel below it), so a caller can
 *   retune the anchoring or the measure without forking the component.
 * @param {object} [props.rest] Anything else — `id`, `aria-*`, `data-*` — is
 *   forwarded to the panel. Passing an `id` is worth doing: the trigger's
 *   `aria-controls` should reference it, and the popover reads it back to
 *   recognise its own trigger and leave that control's toggle alone.
 * @returns {import('react').ReactElement} The popover panel, or the portalled
 *   centre dialog below `md`.
 */

/**
 * The record shape this panel renders, owned and documented by
 * `src/lib/search.js`. Repeated here only as the contract these rows read.
 *
 * @typedef {Object} SearchRecord
 * @property {string} id       Stable, group-prefixed (`'course:spoken-english'`).
 * @property {'course'|'event'|'faculty'|'article'|'faq'|'page'} group
 * @property {string} label    The row's primary line.
 * @property {string} [context] Short secondary line — a category, a role, a
 *                             formatted date or a path. Absent when the source
 *                             record has nothing meaningful to show.
 * @property {string} href     Where activating the row navigates. RENDERED AS
 *                             GIVEN; never derived or rewritten here.
 * @property {string} haystack Pre-lowercased searchable text. Matching input
 *                             only — never displayed.
 */

// The `md` breakpoint, as a media query. Tailwind's default `md` is 48rem and
// `src/index.css` declares no `--breakpoint-*` override, so the JS boundary and
// the CSS boundary are the same number — the discipline the navigation drawer
// applies at `64rem` for `lg`.
const MD_QUERY = '(min-width: 48rem)'

// Destinations this panel navigates to by itself (a selected suggestion uses
// the record's own `href`). Named so the strings are not retyped inline.
const SEARCH_ROUTE = '/search'
const CATALOGUE_ROUTE = '/courses'
const CONTACT_ROUTE = '/contact'

// The panel surface, shared by both presentations: the same calm chrome as
// `Card` and as the suggestion popup, so the two read as one object.
const PANEL_SURFACE = 'rounded-2xl border border-border bg-white shadow-md'

// Popover geometry from `md` up. `w-96` (24rem) is a fixed measure rather than
// a percentage on purpose: `max-w-full` would resolve against the containing
// block, which may be a 44px trigger wrapper, and would collapse the panel.
// At `md` the viewport is at least 768px, so 384px anchored to the right edge
// always fits.
const POPOVER_GEOMETRY = 'absolute right-0 top-full z-50 mt-2 w-96 p-4'

// How much of a long query is echoed back in the no-results copy. `EmptyState`
// already breaks long words, so this is about keeping the sentence readable
// rather than about preventing overflow.
const QUERY_ECHO_LIMIT = 60

/**
 * Decide the presentation from the viewport, defensively.
 *
 * Returns `true` for the compact (below `md`) dialog presentation. With no DOM
 * or no `matchMedia` the answer is `false`, i.e. the popover — the branch that
 * needs no portal and no focus trap, so it is the safer default in an
 * environment that cannot answer the question.
 *
 * @returns {boolean} Whether the compact dialog presentation applies.
 */
function isCompactViewport() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return !window.matchMedia(MD_QUERY).matches
}

/**
 * Whether an element (or one of its ancestors) declares itself the control for
 * a given panel id, via `aria-controls`.
 *
 * This is what stops the popover's outside-dismissal fighting its own trigger:
 * a pointer press on the trigger would otherwise close the panel here, and the
 * trigger's own click would reopen it a frame later. Walking ancestors with
 * `getAttribute` rather than interpolating the id into a `closest()` selector
 * is deliberate — an id containing a quote or a bracket would make that
 * selector throw.
 *
 * @param {unknown} node Event target to test.
 * @param {string} panelId The panel's DOM id; an empty id matches nothing.
 * @returns {boolean} `true` when the node is inside this panel's own control.
 */
function ownsPanel(node, panelId) {
  if (!panelId) return false
  let current = node instanceof Element ? node : null
  while (current) {
    if (current.getAttribute('aria-controls') === panelId) return true
    current = current.parentElement
  }
  return false
}

/**
 * Clamp a query for display inside the no-results sentence.
 *
 * @param {string} query The trimmed query.
 * @returns {string} The query, shortened with an ellipsis when very long.
 */
function echoQuery(query) {
  return query.length <= QUERY_ECHO_LIMIT ? query : `${query.slice(0, QUERY_ECHO_LIMIT)}…`
}

/**
 * Describe the suggestion count for the polite live region.
 *
 * The count is of the rows actually OFFERED, which the per-group cap may hold
 * below the number of records that matched — so the wording says
 * "suggestions", never "results", and never implies a total this panel does not
 * display. With nothing typed there is no event to announce and the region
 * stays empty.
 *
 * @param {string} query The trimmed query.
 * @param {number} count Rows offered across all groups.
 * @returns {string} The announcement, or `''` for "say nothing".
 */
function describeSuggestionCount(query, count) {
  if (!query) return ''
  if (count === 0) return 'No suggestions'
  return count === 1 ? '1 suggestion' : `${count} suggestions`
}

/**
 * Flatten `searchAll`'s grouped result into the ordered option array
 * `Combobox` consumes.
 *
 * Three things happen here and nothing else:
 *   • ORDER — groups are walked in {@link SEARCH_GROUPS} order, so categories
 *     always appear in the same sequence as on `/search`.
 *   • SECTION LABEL — the first row of each group carries the group's display
 *     label as a leading line, which is what makes the flat listbox read as
 *     sections. See the module header for why this is part of the row rather
 *     than a heading row of its own.
 *   • `href` CARRIED THROUGH UNCHANGED — `Combobox` hands the original option
 *     object back to `onSelect`, so the destination travels with the row and no
 *     lookup (or re-derivation) is needed at selection time. A record with no
 *     usable `href` is skipped rather than rendered as a row that goes nowhere.
 *
 * Module-local and unexported, so this file exposes only the component.
 *
 * @param {Record<string, SearchRecord[]>} groups A `searchAll` result.
 * @returns {Array<{id: string, href: string, label: import('react').ReactNode, context: string}>}
 *   Render-ready options in canonical group order.
 */
function buildSuggestionOptions(groups) {
  const options = []

  for (const group of SEARCH_GROUPS) {
    const rows = groups && Array.isArray(groups[group.id]) ? groups[group.id] : []

    for (let index = 0; index < rows.length; index += 1) {
      const record = rows[index]
      // Defensive: the index is frozen and well-formed, but this row is only
      // renderable if it can actually navigate somewhere.
      if (!record || typeof record.href !== 'string' || !record.href) continue

      // `index` counts within the group, so its first row is the section's
      // first row — and a group with no matches contributes nothing at all, so
      // an empty category never leaves an orphaned label behind.
      const isFirstOfGroup = index === 0

      options.push({
        id: record.id,
        href: record.href,
        label: isFirstOfGroup ? (
          <>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
              {group.label}
            </span>
            <span className="block">{record.label}</span>
          </>
        ) : (
          record.label
        ),
        // Never the raw group id: `Combobox` falls back to `option.group` when
        // `context` is absent, and "course" is not a line worth showing.
        context: typeof record.context === 'string' && record.context ? record.context : group.label,
      })
    }
  }

  return options
}

function GlobalSearch({ onClose, className, ...props }) {
  // Every hook is declared unconditionally, at the top level, before any
  // branch — `react/rules-of-hooks` is an oxlint ERROR and the two
  // presentations below are early RETURNS, never conditional hooks.
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  // Decided once, at mount, and deliberately never updated: crossing the `md`
  // boundary closes the panel (see the effect below) rather than swapping
  // containers under a live focus trap. No setter is destructured because
  // there is nothing that may legitimately call one.
  const [compact] = useState(isCompactViewport)
  // The native <input>: `Combobox` forwards `ref` through `Input` onto the
  // element itself, which is what makes it usable both as `Dialog`'s
  // `initialFocusRef` and as this component's own focus target.
  const inputRef = useRef(null)
  // The popover root, used only above `md` for outside-press containment. The
  // dialog presentation needs no equivalent: `useDialog` owns the panel node
  // and the scrim owns dismissal.
  const panelRef = useRef(null)
  const labelId = useId()

  const requestClose = useCallback(() => {
    if (typeof onClose === 'function') onClose()
  }, [onClose])

  // Warm the client index once, on mount. This is the other half of the lazy
  // boundary described in the module header: the dynamic import keeps the CODE
  // out of the entry chunk, and calling `buildIndex` here — rather than
  // letting the first keystroke pay for it — keeps the index-building WORK off
  // the critical path. `buildIndex` memoises for the session, so this is a
  // cheap no-op on every later open and needs no cache of its own.
  useEffect(() => {
    buildIndex()
  }, [])

  // `searchAll` normalises its own input, but memoising on the TRIMMED query
  // keeps a trailing space from producing a new result object — and therefore a
  // new option array identity — for a search that has not actually changed.
  const trimmedQuery = query.trim()
  const groups = useMemo(
    () => searchAll(trimmedQuery, { limit: SUGGESTION_LIMIT }),
    [trimmedQuery],
  )
  const options = useMemo(() => buildSuggestionOptions(groups), [groups])
  const suggestionCount = countResults(groups)
  const announcement = describeSuggestionCount(trimmedQuery, suggestionCount)

  // The `ready` state's focus obligation, for the popover presentation, plus
  // its matching focus RESTORATION. Below `md` both halves belong to `Dialog`
  // (`initialFocusRef` in, `useDialog`'s teardown out) and doing either here
  // would fight the hook's own sequencing — so the two presentations end up
  // with the same behaviour by different owners.
  //
  // `preventScroll` on the way in because the panel hangs off the sticky
  // header and is already in view; scrolling the document to "reveal" it would
  // only jolt the page.
  useEffect(() => {
    if (compact) return undefined

    // Captured BEFORE focus moves, so it is the control that opened this panel
    // — in practice the header's search trigger, which `Navbar` keeps focused
    // through the `loading` state precisely so this capture is correct.
    const opener = document.activeElement
    const input = inputRef.current
    if (input && typeof input.focus === 'function') input.focus({ preventScroll: true })

    return () => {
      // WHY THE TEST IS "IS FOCUS ORPHANED?" AND NOT "WAS FOCUS IN THE PANEL?":
      // this is a passive effect cleanup, so by the time it runs React has
      // already detached the ref and removed the panel from the document —
      // and removing the focused input is exactly what makes the browser fall
      // back to `<body>`. An orphaned `activeElement` therefore IS the signal
      // that the panel was holding focus when it closed (Escape, or accepting
      // a suggestion), which is the case the APG says must return focus to the
      // trigger. Anything else means the visitor has already moved on — an
      // outside press on a link, a Tab away — and pulling focus back would
      // steal it from where they just went.
      const active = document.activeElement
      if (active && active !== document.body) return
      if (
        opener instanceof HTMLElement &&
        opener !== document.body &&
        opener.isConnected &&
        typeof opener.focus === 'function'
      ) {
        opener.focus({ preventScroll: true })
      }
    }
  }, [compact])

  // Close when the viewport crosses the `md` boundary. The control that opened
  // this panel is a drawer item below `md` and a bar control above it, so after
  // a crossing the opener is not the one the layout shows; dismissing is
  // honest, and it is the same call the navigation drawer and the course-filter
  // sheet make at `lg`. Below `md` the unmounting `Dialog` also restores focus
  // to whatever it captured on open, so focus is never left floating.
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined

    const mediaQuery = window.matchMedia(MD_QUERY)
    const onViewportChange = (event) => {
      // A change event fires only when the match state flips, and `compact` was
      // read from this same query at mount — so comparing the two is an exact
      // test of "are we still on the side we opened on?".
      if (!event.matches === compact) return
      requestClose()
    }

    // The guarded `addEventListener` / `addListener` pair mirrors the shape the
    // navigation drawer uses, for the same Safari-era fallback reason.
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', onViewportChange)
    } else {
      mediaQuery.addListener(onViewportChange)
    }

    return () => {
      if (typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', onViewportChange)
      } else {
        mediaQuery.removeListener(onViewportChange)
      }
    }
  }, [compact, requestClose])

  // Outside-press dismissal, popover only. The dialog presentation has a scrim
  // for this. `pointerdown` rather than `click` so the panel goes away with the
  // press, and the trigger is exempted so its own toggle is the one that runs —
  // closing here first would let that click reopen the panel a frame later.
  useEffect(() => {
    if (compact) return undefined
    if (typeof document === 'undefined') return undefined

    const onPointerDown = (event) => {
      const panel = panelRef.current
      if (!panel) return
      const target = event.target
      if (!(target instanceof Node)) return
      if (panel.contains(target)) return
      if (ownsPanel(target, panel.id)) return
      requestClose()
    }

    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [compact, requestClose])

  const handleQueryChange = (event) => {
    const next = event && event.target && typeof event.target.value === 'string' ? event.target.value : ''
    setQuery(next)
  }

  // A suggestion was accepted (Enter on the active option, or a click).
  // `record.href` travels on the option, so it is used VERBATIM — `search.js`
  // is the only place that decides where a result goes.
  const handleSelect = (option) => {
    const href = option && typeof option.href === 'string' ? option.href.trim() : ''
    if (!href) return
    requestClose()
    navigate(href)
  }

  // Free-text Enter — the uncapped view. `Combobox` claims Enter only when a
  // suggestion is active, so this handler sees exactly the case it should.
  // `URLSearchParams` does the encoding, so a query with spaces, an ampersand
  // or a hash cannot corrupt the URL.
  const handleSubmit = (event) => {
    event.preventDefault()
    if (!trimmedQuery) return
    requestClose()
    navigate(`${SEARCH_ROUTE}?${new URLSearchParams({ q: trimmedQuery }).toString()}`)
  }

  const handleClear = () => {
    setQuery('')
    const input = inputRef.current
    if (input && typeof input.focus === 'function') input.focus({ preventScroll: true })
  }

  // Escape, popover branch only. `Combobox` swallows the key while its popup is
  // open, so this runs on the SECOND press — first the suggestion list closes,
  // then the panel. Below `md` the equivalent handler is `useDialog`'s.
  const handlePanelKeyDown = (event) => {
    if (event.key !== 'Escape') return
    event.stopPropagation()
    requestClose()
  }

  // Focus-leave dismissal, popover branch only: React's `onBlur` bubbles, so
  // this fires for focus moving out of anything inside the panel. A `null`
  // `relatedTarget` (a window blur, or a press on something unfocusable) is
  // left alone — the outside-press listener above covers that case, and
  // closing on a window blur would dismiss the panel when the visitor merely
  // switched applications.
  const handlePanelBlur = (event) => {
    const panel = panelRef.current
    const next = event.relatedTarget
    if (!panel || !next) return
    if (panel.contains(next)) return
    if (ownsPanel(next, panel.id)) return
    requestClose()
  }

  // Both empty branches are `tone="neutral"`: nothing has failed here. Each
  // answers what happened AND what to do next, and `headingAs="p"` keeps a
  // transient panel from injecting a heading into the header region ahead of
  // the page's own `h1`.
  let emptyBranch = null
  if (!trimmedQuery) {
    emptyBranch = (
      <EmptyState
        tone="neutral"
        headingAs="p"
        title="Search this website"
        description="Type a word or two to search courses, events, faculty, articles, FAQs and pages."
      />
    )
  } else if (suggestionCount === 0) {
    emptyBranch = (
      <EmptyState
        tone="neutral"
        headingAs="p"
        title="Nothing matched that search"
        description={`No course, event, faculty member, article, FAQ or page matches “${echoQuery(trimmedQuery)}”. Try a shorter or different word, or pick a next step below.`}
        action={
          <>
            <Button type="button" variant="outline" size="sm" onClick={handleClear}>
              Clear search
            </Button>
            <Button to={CATALOGUE_ROUTE} variant="primary" size="sm" onClick={requestClose}>
              Browse all courses
            </Button>
            <Button to={CONTACT_ROUTE} variant="outline" size="sm" onClick={requestClose}>
              Contact us
            </Button>
          </>
        }
      />
    )
  }

  // ONE body, rendered into either container. The visually hidden `<p>` is the
  // accessible name for the textbox, the listbox and — below `md` — the dialog,
  // so all three read the same string and it is written once.
  const body = (
    <>
      {compact ? (
        <div className="mb-4 flex items-center justify-between gap-3">
          <p id={labelId} className="text-sm font-semibold text-foreground">
            Search this website
          </p>
          {/* The full-height mobile panel leaves only the wrapper's gutter of
              scrim to tap, so an explicit Close control is not optional here.
              The accessible name contains the visible text (WCAG 2.5.3). */}
          <Button type="button" variant="outline" size="sm" onClick={requestClose} aria-label="Close search">
            Close
          </Button>
        </div>
      ) : (
        <p id={labelId} className="sr-only">
          Search this website
        </p>
      )}

      {/* A real form, because free-text Enter is a real submission — and
          `role="search"` is the one landmark this panel is entitled to. */}
      <form role="search" onSubmit={handleSubmit}>
        <Combobox
          ref={inputRef}
          name="q"
          value={query}
          onChange={handleQueryChange}
          onSelect={handleSelect}
          options={options}
          labelledBy={labelId}
          placeholder="Search the site"
          // Rendered by `Input` between the field and the popup, and wired as
          // the field's `aria-describedby`, so the uncapped view is
          // discoverable without a control competing for space.
          hint="Press Enter for all results."
          // Mobile keyboards then offer a Search key, which submits the form.
          enterKeyHint="search"
        />
      </form>

      {/* The count changes as the visitor types, so it is announced politely
          and page-locally, leaving the shell's route announcer untouched. */}
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>

      {emptyBranch ? <div className="mt-4">{emptyBranch}</div> : null}
    </>
  )

  // Below `md`: the centre-placed dialog. `h-full` makes the panel a tall
  // scroll container so the floating suggestion list is reachable inside it,
  // and `p-4` trims the default `p-6` for a 320px viewport. `initialFocusRef`
  // is this presentation's focus obligation.
  if (compact) {
    return (
      <Dialog
        {...props}
        open
        onClose={requestClose}
        placement="center"
        labelledBy={labelId}
        initialFocusRef={inputRef}
        className={cn('h-full p-4', className)}
      >
        {body}
      </Dialog>
    )
  }

  // From `md` up: the inline popover. Non-modal by design — the page behind it
  // stays usable — so dismissal is Escape, an outside press, or focus leaving.
  return (
    <div
      {...props}
      ref={panelRef}
      onKeyDown={handlePanelKeyDown}
      onBlur={handlePanelBlur}
      className={cn(POPOVER_GEOMETRY, PANEL_SURFACE, className)}
    >
      {body}
    </div>
  )
}

export default GlobalSearch
