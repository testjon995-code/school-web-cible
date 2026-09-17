import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'

import { courses } from '../data/courses.js'

/**
 * useComparison — the course comparison working set (F2).
 *
 * A visitor picks courses on a surface that renders course cards and reads the
 * comparison on a different route: the toggle lives in
 * `src/components/common/CourseCard.jsx` on `/courses`, while the view is
 * `src/pages/Compare.jsx` on `/compare`. The working set therefore has to
 * survive a route change, which component state cannot do — an unmount on
 * navigation would discard the selection the visitor just built.
 *
 * The set is at most {@link MAX_COMPARISON} courses, held as an ordered list of
 * slugs from `src/data/courses.js`, and it is shareable: `/compare` carries it
 * in one `?courses=` parameter, and {@link buildShareHref} is the link that
 * produces it.
 *
 * ## Where the state lives, and why it is NOT persisted
 *
 * A single module-level store, read through
 * {@link https://react.dev/reference/react/useSyncExternalStore useSyncExternalStore},
 * so every consumer renders one value: a card's toggle, the grid's
 * "Compare selected (n)" control and the comparison view itself change together
 * in the same interaction rather than each holding a private copy.
 *
 * **This store deliberately has no storage key.** It is the one piece of
 * cross-route state in this work that is not persisted, and that is a decision
 * to preserve rather than improve (AAP §0.5.2): holding it in memory keeps the
 * application's storage surface to exactly ONE key —
 * `cible:saved-courses:v1`, owned by `src/hooks/useSavedCourses.js` — which is
 * what keeps the device-local storage disclosure in
 * `src/pages/PrivacyPolicy.jsx` to a single accurate statement. A second key
 * here would make published copy untrue.
 *
 * The accepted consequence, documented rather than papered over: **a full page
 * reload clears the working set**, because there is nothing on the device to
 * restore it from. The durable form is the `?courses=` URL — copy the link and
 * the comparison survives anything. Do not add persistence to "fix" this.
 *
 * The set is also deliberately absent from the `/courses` query string. Writing
 * it there would pollute every shared catalogue link with a selection the
 * recipient never made (AAP §0.5.2), so the set is memory-only on every route
 * and URL-backed on `/compare` alone.
 *
 * ## The referential-stability trap (do not "simplify" this away)
 *
 * `useSyncExternalStore` calls the snapshot getter on every render and compares
 * the result with `Object.is`. A getter that builds a fresh array each call
 * therefore reports a change on every render and React re-renders forever. So
 * the list is **cached in module scope**, {@link getStoreSnapshot} returns that
 * exact reference, and {@link commit} replaces the cache **only** when the
 * slugs genuinely change — an unchanged store keeps its existing array, so
 * `Object.is` sees no change and nothing re-renders. There is no other
 * `useSyncExternalStore` call in `src/` except the sibling store in
 * `useSavedCourses.js`, which solves the same problem the same way; the two are
 * independent stores and neither imports the other.
 *
 * ## The `?courses=` contract, in both directions (AAP §0.9.3)
 *
 * The governing requirement is that **a shared link and a locally built
 * selection are indistinguishable**, so both resolve through the same rules.
 *
 * `courses` is the ONE comma-joined parameter in this work — every other
 * multi-value parameter repeats its key. It is a short ordered sequence read as
 * one unit, and `?courses=a,b,c` is the shareable artifact the feature is named
 * for.
 *
 * **On read** ({@link parseCoursesParam}), in this exact order: split on
 * commas → trim → drop empties → drop any slug absent from
 * `src/data/courses.js` → de-duplicate keeping the FIRST occurrence → take the
 * first three and discard the rest. So an over-cap link loads a valid
 * three-course comparison instead of failing, and a hand-edited link degrades
 * instead of throwing. **URL order is preserved** — it is the order the sharer
 * chose, and it is never re-sorted into catalogue order.
 *
 * A link whose every slug is unknown yields an EMPTY set. That is not the same
 * condition as "nothing selected", and this hook does not conflate them: it
 * returns empty `slugs` without throwing, and `Compare.jsx` distinguishes the
 * two by reading the raw parameter itself — a present-but-unresolvable
 * `?courses=` value is the "no longer listed" empty state, an absent parameter
 * with an empty set is the "nothing selected" one (AAP §0.11.3).
 *
 * **On write**, every `toggle`, `remove` and `clear` performed while on
 * `/compare` rewrites the parameter through ONE batched
 * `setSearchParams(next, { replace: true, preventScrollReset: true })`, so the
 * address always reflects the working set and the link stays copyable
 * mid-session. `clear()` removes the parameter entirely rather than writing an
 * empty value. Off `/compare` nothing is written at all.
 *
 * Reading never writes. Arriving on a non-canonical link (over-cap, duplicated,
 * or carrying an unknown slug) renders the correctly reduced set without a
 * surprise navigation on mount; the address canonicalises on the first real
 * change. That is the same posture `useCourseFilters` takes, and it is what
 * makes a render→navigate loop impossible.
 *
 * ## What this hook deliberately does not do
 *
 * - **No presentation.** It returns the bare datum. The label, icon and button
 *   variant for each comparison state belong to `COMPARE_STATE` in
 *   `src/lib/states.js`, which the card and the comparison table read — which
 *   is what stops the same label being authored twice.
 * - **No enforcement by disabling.** The cap is expressed as a *returned
 *   refusal*, never as a disabled control: a natively disabled toggle cannot be
 *   focused or activated, so the refusal could never be triggered or announced.
 *   `CourseCard.jsx` keeps the fourth toggle focusable with
 *   `aria-disabled="true"` and announces what `toggle` hands back.
 * - **No cross-tab synchronisation and no network access of any kind.**
 *
 * @module hooks/useComparison
 */

/**
 * The most courses that may be compared at once.
 *
 * Three is a layout constraint as much as a product one: the comparison view
 * renders one column per course and is specified never to need horizontal
 * scrolling, which three columns satisfy at every supported width.
 *
 * Module-private on purpose — `isFull` is the question consumers actually ask,
 * and the user-facing wording ("You can compare up to 3 courses…") is owned by
 * `COMPARE_STATE.full` in `src/lib/states.js`, so the number is never written
 * twice in code a visitor can read.
 *
 * @type {number}
 */
const MAX_COMPARISON = 3

/**
 * The route on which the working set is mirrored into the query string.
 *
 * Compared against a normalised `location.pathname` by
 * {@link isComparePathname}, because the read-hydration and the write are
 * scoped to this one route while the store itself is route-agnostic.
 *
 * @type {string}
 */
const COMPARE_PATHNAME = '/compare'

/**
 * The query-parameter name — deliberately plural `courses`, which collides with
 * neither of the two deep-link parameters that already exist (`?course=` on
 * `/admission`, `?event=` on `/contact`).
 *
 * @type {string}
 */
const COURSES_PARAM = 'courses'

/**
 * The separator inside the parameter value.
 *
 * A comma, and this is the only parameter in this work that uses one: the value
 * is a short ordered sequence read as a single unit, so `?courses=a,b,c` is
 * both the natural encoding and the artifact people share. A slug is
 * `[a-z0-9-]` by contract, so it can never contain the separator.
 *
 * @type {string}
 */
const SLUG_SEPARATOR = ','

/**
 * The one empty list handed to every empty-set path — the initial store value,
 * the post-`clear` state, the all-unknown parse result and the server snapshot.
 *
 * Shared and frozen, so an empty set is always the same reference (an empty
 * render cannot churn) and so a consumer cannot mutate the store's array from
 * the outside.
 *
 * @type {ReadonlyArray<string>}
 */
const EMPTY_SELECTION = Object.freeze([])

/**
 * Subscriber callbacks registered by mounted consumers, in a `Set` so a double
 * subscription cannot fire twice and unsubscribing is O(1).
 *
 * @type {Set<() => void>}
 */
const subscribers = new Set()

/**
 * The cached snapshot — the single list every consumer renders, and the exact
 * reference {@link getStoreSnapshot} returns.
 *
 * Starts empty (not `null`): unlike the saved-courses store there is nothing to
 * read on first use, so there is no lazy initialisation step and importing this
 * module has no side effect whatsoever. Replaced only by {@link commit}, and
 * only when the slugs actually changed.
 *
 * @type {ReadonlyArray<string>}
 */
let snapshot = EMPTY_SELECTION

/**
 * Memoised set of every slug in the catalogue — the allowlist both the URL
 * parse and the toggle refusal are judged against.
 *
 * Derived from `src/data/courses.js` at runtime and never hardcoded, so adding
 * or retiring a course needs no change here. Built once, lazily, so a module
 * that merely imports this hook does no work.
 *
 * @type {Set<string>|null}
 */
let knownSlugs = null

/**
 * The outcome of a {@link toggleComparison} call.
 *
 * Deliberately the same shape `useSavedCourses`'s refusal uses, so the two card
 * toggles read alike at the call site. `reason` is present only when `ok` is
 * `false`:
 *
 *   - `'full'` — the set already holds {@link MAX_COMPARISON} courses and this
 *     slug is not one of them, so adding it would exceed the cap. This is the
 *     refusal a card surfaces through `COMPARE_STATE.full`.
 *   - `'unknown'` — the slug resolves to no record in `src/data/courses.js`.
 *
 * @typedef {Object} ComparisonToggleResult
 * @property {boolean} ok - Whether the working set changed.
 * @property {'full'|'unknown'} [reason] - Why it did not, when `ok` is `false`.
 */

/**
 * Build (once) and return the catalogue's slug allowlist.
 *
 * Defensive about the data module's shape — a non-array export, or a record
 * without a usable `slug`, yields a smaller allowlist rather than a throw,
 * because this runs on the URL read path that must never break a render.
 *
 * A plain helper, intentionally NOT named `use*`, so the linter does not read
 * it as a React hook called outside a component.
 *
 * @returns {Set<string>} Every slug currently in `src/data/courses.js`.
 */
function getKnownSlugs() {
  if (knownSlugs !== null) return knownSlugs

  const catalogue = Array.isArray(courses) ? courses : []
  const slugs = new Set()

  for (const course of catalogue) {
    if (course && typeof course.slug === 'string' && course.slug.length > 0) {
      slugs.add(course.slug)
    }
  }

  knownSlugs = slugs
  return knownSlugs
}

/**
 * Whether a value is a slug that resolves to a course record.
 *
 * Matched exactly, with no trimming or case folding at this point (the caller
 * trims first): a value that is not character-for-character a catalogue slug is
 * not a course, and silently repairing it would let the set hold an identifier
 * that no `/courses/:slug` route can resolve — which is precisely the invalid
 * data the comparison view's "no longer listed" empty state exists for.
 *
 * @param {unknown} slug - The candidate slug.
 * @returns {boolean} True when the slug is present in the catalogue.
 */
function isKnownSlug(slug) {
  return typeof slug === 'string' && slug.length > 0 && getKnownSlugs().has(slug)
}

/**
 * Reduce a candidate list to a valid working set, preserving the given order.
 *
 * Three rules, applied in this fixed order: drop anything that is not a
 * catalogue slug, drop a duplicate keeping the FIRST occurrence, then take the
 * first {@link MAX_COMPARISON} and discard the rest. Order is never changed —
 * for a shared link that order is the sharer's choice, and for a local
 * selection it is the order the visitor picked in.
 *
 * Taking the first three rather than rejecting an over-long list is deliberate:
 * an over-cap link must load a valid three-course comparison rather than fail
 * (AAP §0.9.3).
 *
 * Returns the shared empty list when nothing survives, and a frozen array
 * otherwise, so no caller can mutate the store's list in place.
 *
 * @param {ReadonlyArray<unknown>} list - Candidate slugs, in the order they were given.
 * @returns {ReadonlyArray<string>} The surviving slugs, in the same order, capped.
 */
function normalizeSelection(list) {
  const source = Array.isArray(list) ? list : []
  const seen = new Set()
  const kept = []

  for (const candidate of source) {
    if (kept.length >= MAX_COMPARISON) break
    if (!isKnownSlug(candidate) || seen.has(candidate)) continue
    seen.add(candidate)
    kept.push(candidate)
  }

  return kept.length === 0 ? EMPTY_SELECTION : Object.freeze(kept)
}

/**
 * Parse the raw `?courses=` value into a valid working set.
 *
 * The complete read contract: split on commas → trim each → drop empties →
 * then {@link normalizeSelection} for the allowlist, the de-duplication and the
 * cap. Nothing here can throw, so a hand-edited URL degrades to a smaller set
 * (or to none) rather than breaking the route: `''`, `',,'`, `'nope'` and a
 * value of the wrong type all resolve to the shared empty list.
 *
 * @param {unknown} raw - The value `URLSearchParams.get('courses')` returned.
 * @returns {ReadonlyArray<string>} The hydrated working set, in URL order.
 */
function parseCoursesParam(raw) {
  if (typeof raw !== 'string' || raw === '') return EMPTY_SELECTION

  const candidates = raw
    .split(SLUG_SEPARATOR)
    .map((entry) => entry.trim())
    .filter((entry) => entry !== '')

  return normalizeSelection(candidates)
}

/**
 * Whether two slug lists hold the same slugs in the same order.
 *
 * The equality test behind {@link commit}'s "did anything actually change?"
 * decision, and behind the hydration effect's no-op. Order is part of the
 * identity of a comparison, because the columns are rendered in list order, so
 * a reordering is a real change.
 *
 * @param {ReadonlyArray<string>} a - The current list.
 * @param {ReadonlyArray<string>} b - The candidate list.
 * @returns {boolean} True when the two are element-wise identical.
 */
function sameOrder(a, b) {
  if (a === b) return true
  if (a.length !== b.length) return false

  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) return false
  }

  return true
}

/**
 * Tell every subscriber that the snapshot changed.
 *
 * Iterates a copy of the set, because a subscriber may unsubscribe (React does,
 * on unmount) while it is being notified, and mutating a `Set` mid-iteration
 * would skip a later entry.
 *
 * A subscriber's own error is contained rather than propagated: the point of
 * this store is that the card, the grid's compare control and the comparison
 * view agree, so one failing consumer must not leave the others holding a stale
 * value — nor throw out of the click handler that triggered the change, which
 * would lose the interaction. React's own store callback does not throw, so in
 * practice this guard never fires.
 *
 * @returns {void}
 */
function notify() {
  for (const subscriber of Array.from(subscribers)) {
    try {
      subscriber()
    } catch {
      // Contained deliberately — see above. Every remaining subscriber is still
      // notified, so no surface is left disagreeing with the others.
    }
  }
}

/**
 * Replace the cached snapshot and notify, but ONLY when something changed.
 *
 * This is the guard on the referential-stability rule the module header
 * describes. An unchanged store keeps its existing array, so
 * `useSyncExternalStore`'s `Object.is` comparison sees no change and no
 * consumer re-renders — which is also what makes the hydration effect
 * idempotent: re-parsing the same URL commits nothing.
 *
 * @param {ReadonlyArray<string>} nextSlugs - The new list, already normalised.
 * @returns {ReadonlyArray<string>} The current cached snapshot.
 */
function commit(nextSlugs) {
  const next = nextSlugs.length === 0 ? EMPTY_SELECTION : Object.freeze(nextSlugs)

  if (sameOrder(snapshot, next)) return snapshot

  snapshot = next
  notify()

  return snapshot
}

/**
 * Register a consumer callback; returns its unsubscriber.
 *
 * The `subscribe` argument `useSyncExternalStore` requires. Module-level, so its
 * identity is stable for the lifetime of the page: a fresh `subscribe` on every
 * render would make React tear the subscription down and set it up again after
 * each one.
 *
 * @param {() => void} onStoreChange - Called after every real change.
 * @returns {() => void} Unsubscriber, safe to call more than once.
 */
function subscribe(onStoreChange) {
  if (typeof onStoreChange === 'function') {
    subscribers.add(onStoreChange)
  }

  return function unsubscribe() {
    subscribers.delete(onStoreChange)
  }
}

/**
 * Return the cached working set — the same reference every time until it
 * changes.
 *
 * The `getSnapshot` argument `useSyncExternalStore` requires. It must not
 * allocate: see the referential-stability trap in the module header. Do not
 * "helpfully" return a copy, a sorted view or a derived object from here.
 *
 * @returns {ReadonlyArray<string>} The current working set.
 */
function getStoreSnapshot() {
  return snapshot
}

/**
 * Return the DOM-less snapshot.
 *
 * The `getServerSnapshot` argument, which keeps the hook safe if it is ever
 * rendered without a browser. There is no server renderer in this project
 * today; this is the same defensive posture `prefersReducedMotion()` in
 * `src/hooks/useScrollReveal.js` takes. A comparison is built by interaction,
 * so the honest DOM-less value is an empty set, and it is the shared frozen
 * constant precisely so this getter is referentially stable too.
 *
 * @returns {ReadonlyArray<string>} The shared empty list.
 */
function getServerStoreSnapshot() {
  return EMPTY_SELECTION
}

/**
 * Add a course to the working set, or remove it if it is already there.
 *
 * **The cap gates the ADD branch alone**, and that is load-bearing rather than
 * incidental. A guard placed at the top of this function — "refuse everything
 * while the set is full" — would leave a visitor at three selections unable to
 * deselect anything, so the feature would deadlock and the refusal copy
 * ("Remove one to add another") would be advice they cannot follow. Removal is
 * therefore always permitted, at the cap included. `compareState()` in
 * `src/lib/states.js` encodes the same precedence on the presentation side.
 *
 * Module-level, so the identity behind the hook's `toggle` never changes.
 *
 * @param {unknown} slug - The course slug to add or remove.
 * @returns {ComparisonToggleResult} `{ ok: true }` when the set changed, else
 *   `{ ok: false, reason: 'unknown' }` for a slug that resolves to no course or
 *   `{ ok: false, reason: 'full' }` when adding would exceed the cap.
 */
function toggleComparison(slug) {
  // Refused at the boundary rather than stored and pruned later: an identifier
  // that resolves to nothing must never enter the set, because a comparison
  // column would then have no record to render.
  if (!isKnownSlug(slug)) return { ok: false, reason: 'unknown' }

  const current = snapshot

  // Already selected → ALWAYS remove, cap or no cap. See the note above.
  if (current.includes(slug)) {
    commit(current.filter((entry) => entry !== slug))
    return { ok: true }
  }

  // Adding is the only branch the cap constrains. The refusal is returned, not
  // silently swallowed, so the card has something concrete to announce.
  if (current.length >= MAX_COMPARISON) return { ok: false, reason: 'full' }

  commit([...current, slug])
  return { ok: true }
}

/**
 * Remove one course from the working set.
 *
 * A slug that is not in the set is a no-op, and {@link commit} makes that free:
 * the snapshot is unchanged, so nothing is notified and nothing re-renders.
 * Unlike {@link toggleComparison} this never refuses — removal is the action
 * that frees a slot, so it is always available.
 *
 * Module-level, so the identity behind the hook's `remove` never changes.
 *
 * @param {unknown} slug - The course slug to drop.
 * @returns {void}
 */
function removeFromComparison(slug) {
  if (typeof slug !== 'string' || !snapshot.includes(slug)) return

  commit(snapshot.filter((entry) => entry !== slug))
}

/**
 * Empty the working set.
 *
 * Nothing is removed from storage, because nothing was ever stored: this store
 * is memory-only by design (see the module header). On `/compare` the
 * accompanying URL write deletes the `?courses=` parameter entirely rather than
 * writing an empty value.
 *
 * Module-level, so the identity behind the hook's `clear` never changes.
 *
 * @returns {void}
 */
function clearComparison() {
  commit(EMPTY_SELECTION)
}

/**
 * Whether a pathname is the comparison route.
 *
 * Normalised before comparing, because react-router matches case-insensitively
 * by default and tolerates a trailing slash: `/Compare/` renders the same route
 * as `/compare`, so it must be recognised here too, or a visitor arriving on
 * that spelling would get a store that silently stops mirroring the URL.
 *
 * @param {unknown} pathname - `location.pathname`.
 * @returns {boolean} True on the comparison route.
 */
function isComparePathname(pathname) {
  if (typeof pathname !== 'string') return false

  return pathname.toLowerCase().replace(/\/+$/, '') === COMPARE_PATHNAME
}

/**
 * Compose the shareable `/compare` link for a working set.
 *
 * The bare route when the set is empty — a link to an empty comparison must not
 * carry a parameter, so it lands on the "nothing selected" empty state rather
 * than the "no longer listed" one. Otherwise one `?courses=` key holding the
 * slugs joined by commas, in working-set order.
 *
 * Each slug is percent-encoded individually and the separators are then joined
 * literally, which keeps the readable `?courses=a,b,c` form the feature is
 * named for while still being safe for a value that somehow needed escaping.
 * Catalogue slugs are kebab-case, so in practice encoding changes nothing.
 *
 * @param {ReadonlyArray<string>} slugs - The working set, in order.
 * @returns {string} A router-ready path: `/compare` or `/compare?courses=a,b`.
 */
function buildShareHref(slugs) {
  if (slugs.length === 0) return COMPARE_PATHNAME

  const value = slugs.map((slug) => encodeURIComponent(slug)).join(SLUG_SEPARATOR)

  return `${COMPARE_PATHNAME}?${COURSES_PARAM}=${value}`
}


/**
 * Subscribe to the course comparison working set.
 *
 * Every consumer renders one shared, at-most-three list, so a card's toggle,
 * the grid's "Compare selected (n)" control and the comparison view itself
 * change together in a single interaction. Takes no arguments: the route is
 * detected internally with `useLocation`, so a card does not have to know where
 * it is being rendered.
 *
 * On `/compare` the hook also owns the `?courses=` parameter in both
 * directions — it hydrates from the URL on arrival and on any later change to
 * that parameter, and it rewrites the URL after every mutation so the address
 * stays copyable mid-session. On every other route it is a pure in-memory
 * store and writes nothing, which is what keeps a shared `/courses` link free
 * of someone else's selection. See the module header for the full contract, the
 * parse rules and the no-storage-key decision.
 *
 * `slugs` is frozen: treat it as read-only and copy before sorting
 * (`[...slugs].sort()`), because mutating it in place would corrupt the value
 * every other surface is rendering. Resolve each slug against
 * `src/data/courses.js` to get the records — the hook deliberately returns
 * identifiers rather than course objects, so it never has to be re-run when a
 * record changes.
 *
 * A full page reload clears the set; the `?courses=` link is the durable form.
 * That is deliberate (AAP §0.5.2), not a gap to be closed with persistence.
 *
 * Every hook it uses — `useSyncExternalStore`, `useLocation`,
 * `useSearchParams`, one `useEffect`, five `useCallback`s and two `useMemo`s —
 * is called unconditionally at the top level, in a stable order, with no early
 * return anywhere above them, satisfying the Rules of Hooks
 * (`react/rules-of-hooks` is an error in this project). The store's own helpers
 * are plain module-level functions, deliberately not named `use*`, so they are
 * not read as hooks called outside a component.
 *
 * @returns {{
 *   slugs: ReadonlyArray<string>,
 *   has: (slug: unknown) => boolean,
 *   toggle: (slug: unknown) => ComparisonToggleResult,
 *   remove: (slug: unknown) => void,
 *   clear: () => void,
 *   isFull: boolean,
 *   shareHref: string,
 * }} The comparison working set and its writers:
 *   - `slugs` — the selected course slugs, in selection order (or, from a
 *     shared link, in the sharer's order), at most three, every one guaranteed
 *     to resolve to a record in `src/data/courses.js`.
 *   - `has(slug)` — whether that slug is in the rendered set.
 *   - `toggle(slug)` — add it, or remove it when it is already selected.
 *     Returns `{ ok: true }` when the set changed,
 *     `{ ok: false, reason: 'full' }` when adding would exceed three, or
 *     `{ ok: false, reason: 'unknown' }` for a slug that resolves to no
 *     course. Removal is never refused, so a visitor at the cap can always free
 *     a slot.
 *   - `remove(slug)` — drop one course; a slug that is not selected is a no-op.
 *   - `clear()` — empty the set, and on `/compare` remove the `?courses=`
 *     parameter entirely.
 *   - `isFull` — true at three. Render the refusal as a focusable control with
 *     `aria-disabled="true"`, never a natively `disabled` one, so the refusal
 *     `toggle` returns can actually be triggered and announced.
 *   - `shareHref` — the shareable destination: `/compare?courses=a,b,c`, or the
 *     bare `/compare` while the set is empty. This is the link the catalogue's
 *     "Compare selected" control navigates to.
 *
 * @example
 * // A card toggle. `COMPARE_STATE` in states.js owns the label, icon and
 * // variant; this hook owns the datum and the refusal.
 * const { has, toggle, isFull } = useComparison()
 * const selected = has(course.slug)
 * function onCompareClick() {
 *   const result = toggle(course.slug)
 *   if (!result.ok) announce(compareState(selected, isFull).label) // e.g. reason === 'full'
 * }
 * // <button aria-pressed={selected} aria-disabled={!selected && isFull} …>
 *
 * @example
 * // The catalogue's route into the comparison view, shown from two selections.
 * const { slugs, shareHref } = useComparison()
 * // {slugs.length >= 2 && (
 * //   <Button to={shareHref}>Compare selected ({slugs.length})</Button>
 * // )}
 *
 * @example
 * // /compare — hydrated from the URL, and rewriting it on every change.
 * const { slugs, remove, clear } = useComparison()
 * const records = slugs
 *   .map((slug) => courses.find((course) => course.slug === slug))
 *   .filter(Boolean)
 * // An empty `slugs` beside a present `?courses=` value is the "no longer
 * // listed" empty state; an empty set with no parameter is "nothing selected".
 */
export function useComparison() {
  // The module-level store is the source of truth for the set itself, so the
  // selection survives the navigation from a card to `/compare`. The getters
  // are module-level and non-allocating — see the referential-stability trap in
  // the module header.
  const slugs = useSyncExternalStore(subscribe, getStoreSnapshot, getServerStoreSnapshot)

  // Route scoping is detected here rather than passed in, because the §0.9.2
  // contract takes no arguments and a card must not have to know its route.
  const { pathname } = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const onComparePath = isComparePathname(pathname)

  // The RAW parameter string is the hydration key: `null` both off `/compare`
  // and when the parameter is absent, which is exactly the "use the in-memory
  // set as-is" case (a bare `/compare` arrived at from a card selection, or a
  // cold load that should show the empty state).
  const rawParam = onComparePath ? searchParams.get(COURSES_PARAM) : null

  useEffect(() => {
    if (rawParam === null) return

    // Keyed on the raw string, so this runs on mount and on a change to this
    // one parameter — never on every render. `commit` no-ops when the parsed
    // result equals the current set, so the write→read cycle converges on the
    // first pass instead of oscillating: a write changes the string, the effect
    // re-parses it, the result matches, nothing is committed and nothing
    // re-renders. Reading never writes, so a non-canonical link (over-cap,
    // duplicated, part-unknown) renders reduced and canonicalises the address
    // on the first real change rather than navigating on mount.
    commit(parseCoursesParam(rawParam))
  }, [rawParam])

  const writeSelection = useCallback(
    (nextSlugs) => {
      // ONE batched write per mutation. The complete next parameter set is
      // composed from scratch — `setSearchParams` does not queue within a tick
      // in react-router 7.18.1, so building on a previous call in the same tick
      // is not safe — and `clear()` reaches this with an empty list, which
      // writes no key at all rather than an empty `?courses=`.
      const next = new URLSearchParams()
      if (nextSlugs.length > 0) next.set(COURSES_PARAM, nextSlugs.join(SLUG_SEPARATOR))

      // Skip a navigation that would produce the identical query string, so a
      // no-op mutation costs nothing. Both sides are compared in
      // `URLSearchParams` serialisation, which percent-encodes the separator;
      // that is a serialisation detail only — `parseCoursesParam` reads the
      // decoded value, and `shareHref` keeps the literal `a,b,c` form.
      if (next.toString() === searchParams.toString()) return

      // `replace` so a comparison session does not fill the back stack with one
      // entry per click, and `preventScrollReset` so changing the set does not
      // jump the page to the top — the same discipline `useCourseFilters` uses.
      setSearchParams(next, { replace: true, preventScrollReset: true })
    },
    [searchParams, setSearchParams],
  )

  const toggle = useCallback(
    (slug) => {
      const result = toggleComparison(slug)

      // Mirror the new set into the URL only where the URL owns it, and only
      // when something actually changed. `getStoreSnapshot()` is read AFTER the
      // mutation because `commit` is synchronous, so this is the post-toggle
      // set rather than the one this render closed over.
      if (result.ok && onComparePath) writeSelection(getStoreSnapshot())

      return result
    },
    [onComparePath, writeSelection],
  )

  const remove = useCallback(
    (slug) => {
      removeFromComparison(slug)
      if (onComparePath) writeSelection(getStoreSnapshot())
    },
    [onComparePath, writeSelection],
  )

  const clear = useCallback(() => {
    clearComparison()
    // An empty set composes an empty parameter list, so the `?courses=` key is
    // removed entirely rather than written empty.
    if (onComparePath) writeSelection(getStoreSnapshot())
  }, [onComparePath, writeSelection])

  // Answered from the snapshot this render was given, not from module state, so
  // a consumer's list and its per-slug answers always come from one value.
  const has = useCallback((slug) => typeof slug === 'string' && slugs.includes(slug), [slugs])

  const shareHref = useMemo(() => buildShareHref(slugs), [slugs])

  // One stable object per snapshot: a consumer that passes the whole bag down,
  // or lists it as an effect dependency, is not woken by an unrelated render.
  // The writers' identities change only when the set or the address changes,
  // which is exactly when their behaviour would differ.
  return useMemo(
    () => ({
      slugs,
      has,
      toggle,
      remove,
      clear,
      isFull: slugs.length >= MAX_COMPARISON,
      shareHref,
    }),
    [slugs, has, toggle, remove, clear, shareHref],
  )
}

