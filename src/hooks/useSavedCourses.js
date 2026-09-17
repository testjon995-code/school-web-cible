import { useCallback, useMemo, useSyncExternalStore } from 'react'

import { courses } from '../data/courses.js'
import { STORAGE_PREFIX, readJson, removeKey, writeJson } from '../lib/storage.js'

/**
 * useSavedCourses — the visitor's saved-course list, and the FIRST persistence
 * this application acquires.
 *
 * A visitor can mark a course on any surface that renders a course card and
 * find it again later: the selection is held in the browser's own local storage
 * on the visitor's own device, under one namespaced, versioned key, and it holds
 * course slugs and nothing else.
 *
 * ## Why the state lives in module scope rather than in the hook
 *
 * Three unrelated component trees read this one list: the save toggle on
 * `src/components/common/CourseCard.jsx`, the count in
 * `src/components/layout/Navbar.jsx`, and the saved panel on
 * `src/pages/Dashboard.jsx`. A `useState` inside the hook would give each of
 * them a private copy, so saving from a card would leave the header count and
 * the dashboard stale until something else happened to re-render them — the
 * three surfaces would disagree about the same fact.
 *
 * The state is therefore a single module-level store, read through
 * {@link https://react.dev/reference/react/useSyncExternalStore useSyncExternalStore},
 * and every consumer subscribes to it. Saving from a card updates the card, the
 * header count and the dashboard panel in the same interaction, because all
 * three are rendering one value.
 *
 * ## The referential-stability trap (do not "simplify" this away)
 *
 * `useSyncExternalStore` calls the snapshot getter on every render and compares
 * the result with `Object.is`. A getter that builds a fresh array or object each
 * call therefore reports a change on every render, and React re-renders
 * forever. So the snapshot object is **cached in module scope**, the getter
 * returns that exact reference, and the cache is replaced **only** when the data
 * genuinely changes — {@link commit} compares the new list and the new
 * `persisted` flag against the cached ones and keeps the old object when they
 * match. Returning `{ saved: [...] }` from the getter, or rebuilding the array
 * per call, reintroduces the infinite loop.
 *
 * The cached snapshot carries `saved` and `persisted` **together**, in one
 * frozen object, so the two can never be read out of step: a consumer that
 * renders a list and a "not saved on this device" disclosure always sees a
 * matching pair.
 *
 * ## The storage contract
 *
 * One key — `cible:saved-courses:v1`, composed from `STORAGE_PREFIX` so the
 * namespace stays greppable — joining the `cible:` namespace the session-storage
 * flag `cible:chunk-reload` already established. This work introduces no second
 * key anywhere, which is what keeps the privacy disclosure in
 * `src/pages/PrivacyPolicy.jsx` to a single accurate statement.
 *
 * All access goes through {@link module:lib/storage lib/storage}, the one module
 * permitted to touch `window.localStorage`. It owns the guarded property read,
 * `JSON.parse`, the `{ v, data }` envelope, and the removal of a single failing
 * key; it never throws and never writes during a read. This hook adds the two
 * domain rules that boundary deliberately does not know about:
 *
 * 1. **Shape** — the payload must be an array of strings ({@link isSlugArray},
 *    passed to `readJson` as its `validate` predicate).
 * 2. **Provenance** — every slug must still resolve to a record in
 *    `src/data/courses.js`. A slug that does not is dropped on read
 *    ({@link pruneSlugs}), and one that does not is refused on write
 *    ({@link toggleSavedCourse} returns `{ ok: false, reason: 'unknown' }`), so
 *    an identifier that resolves to nothing never enters the set in the first
 *    place.
 *
 * A sanitised list is **returned, not rewritten**: nothing is written during a
 * read, and the pruned list reaches storage only when the visitor's next toggle
 * writes. The bulk-clear API is never called — {@link clearSavedCourses}
 * removes this one key by name, leaving every unrelated key on the origin
 * untouched — and session storage is never reached at all, so
 * `cible:chunk-reload` remains the exclusive property of
 * `src/lib/routeLoading.js`.
 *
 * ## Honesty: `persisted` is a claim this module can actually support
 *
 * A write can fail — storage denied by browser policy or an extension, a full
 * store, or Safari private browsing, where the quota is effectively zero and so
 * the *first* write throws with nothing stored. When it does, the in-memory
 * state still updates, so the interface does not regress mid-session and the
 * visitor's click is not lost; `persisted` becomes `false`, and that is the
 * signal a surface renders to disclose that **the selection will not survive a
 * reload**. A failed write is never reported as a failed toggle.
 *
 * Nothing here leaves the device: no network call, no identifier, no timestamp.
 * Course slugs are already public in the URL of every course detail page.
 *
 * ## What this module deliberately does not do
 *
 * - **No cross-tab synchronisation.** The `storage` event fires only in *other*
 *   tabs, and the guarantee made here is agreement **within one tab**. A
 *   listener would be unrequested behaviour.
 * - **No presentation.** The hook returns the bare datum. Labels, icons and
 *   badge/button variants for the saved state belong to `SAVED_STATE` in
 *   `src/lib/states.js`, which the card reads — which is what stops the same
 *   label being authored twice.
 * - **Nothing at import time.** The module is inert until first use; the one
 *   read of storage happens on the first subscription or snapshot request
 *   ({@link ensureStoreInitialised}).
 *
 * @module hooks/useSavedCourses
 */

/**
 * The application's only browser-storage key, composed from the shared
 * namespace rather than retyping the `cible:` literal.
 *
 * Module-private on purpose: the key is an implementation detail of this store,
 * and a consumer able to address it directly would be a second storage path
 * around the boundary this hook exists to be.
 *
 * @type {string}
 */
const SAVED_COURSES_KEY = `${STORAGE_PREFIX}saved-courses:v1`

/**
 * The one empty list handed to every empty-set path — the `readJson` fallback,
 * the post-`clear` state, and the server snapshot.
 *
 * Shared and frozen so an empty set is always the same reference (an empty
 * render cannot churn) and so a consumer cannot mutate the store's array from
 * the outside.
 *
 * @type {ReadonlyArray<string>}
 */
const EMPTY_SAVED_LIST = Object.freeze([])

/**
 * The snapshot returned when the hook renders without a DOM.
 *
 * Matches the SSR-safe posture of `prefersReducedMotion()` in
 * `src/hooks/useScrollReveal.js`: device-local storage cannot be read where
 * there is no browser, so the honest value is an empty set. `persisted` is
 * `true` because nothing has failed to persist — no write has been attempted —
 * and a surface must not disclose a storage failure that did not happen.
 *
 * A module constant, so `getServerStoreSnapshot` is referentially stable for
 * exactly the reason the live getter is.
 *
 * @type {Readonly<SavedCoursesSnapshot>}
 */
const SERVER_SNAPSHOT = Object.freeze({ saved: EMPTY_SAVED_LIST, persisted: true })

/**
 * Subscriber callbacks registered by mounted consumers, in a `Set` so a double
 * subscription cannot fire twice and unsubscribing is O(1).
 *
 * @type {Set<() => void>}
 */
const subscribers = new Set()

/**
 * The cached snapshot — the single value every consumer renders, and the exact
 * reference {@link getStoreSnapshot} returns.
 *
 * `null` means "not initialised yet", which is what makes importing this module
 * inert: the first read of storage is deferred to first use. It is replaced only
 * by {@link commit}, and only when the data actually changed.
 *
 * @type {Readonly<SavedCoursesSnapshot>|null}
 */
let snapshot = null

/**
 * Memoised set of every slug in the catalogue — the allowlist both the read
 * prune and the write refusal are judged against.
 *
 * Derived from `src/data/courses.js` at runtime and never hardcoded, so adding
 * or retiring a course needs no change here. Built once, lazily, for the same
 * reason the storage read is lazy.
 *
 * @type {Set<string>|null}
 */
let knownSlugs = null

/**
 * The outcome of a {@link toggleSavedCourse} call.
 *
 * Deliberately the same shape `useComparison`'s refusal uses, so the two card
 * toggles read alike at the call site.
 *
 * `reason` is present only when `ok` is `false`, and its only value today is
 * `'unknown'` — the slug does not resolve to a record in `src/data/courses.js`.
 * A **persistence** failure is not a refusal: the set still changed, so `ok` is
 * `true` and the failure is disclosed through `persisted` instead.
 *
 * @typedef {Object} ToggleResult
 * @property {boolean} ok - Whether the saved set changed.
 * @property {'unknown'} [reason] - Why it did not, when `ok` is `false`.
 */

/**
 * The store's value: the saved list and the persistence flag, always together.
 *
 * @typedef {Object} SavedCoursesSnapshot
 * @property {ReadonlyArray<string>} saved - Course slugs, in save order.
 * @property {boolean} persisted - Whether the last mutation reached storage.
 */

/**
 * Whether a parsed payload has the shape this store stores.
 *
 * Passed to `readJson` as its `validate` predicate, so a value of any other
 * shape is rejected by the boundary and this hook receives its fallback. It
 * checks the shape only, **not** provenance: an array of strings containing a
 * slug that no longer exists is a valid shape whose unknown entries are pruned
 * by {@link pruneSlugs}, which is what lets the known slugs in a part-stale
 * payload survive instead of the whole list being discarded.
 *
 * @param {unknown} data - The unwrapped payload from the storage envelope.
 * @returns {boolean} True when every entry is a string.
 */
function isSlugArray(data) {
  return Array.isArray(data) && data.every((entry) => typeof entry === 'string')
}

/**
 * Build (once) and return the catalogue's slug allowlist.
 *
 * Defensive about the data module's shape — a non-array export, or a record
 * without a usable `slug`, yields a smaller allowlist rather than a throw,
 * because this runs on the read path that must never break a render.
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
 * Matched exactly, with no trimming or case folding: a stored value that is not
 * character-for-character a catalogue slug is not a course, and silently
 * repairing it would mean the set could hold an identifier no route resolves.
 *
 * @param {unknown} slug - The candidate slug.
 * @returns {boolean} True when the slug is present in the catalogue.
 */
function isKnownSlug(slug) {
  return typeof slug === 'string' && slug.length > 0 && getKnownSlugs().has(slug)
}

/**
 * Drop everything a saved list must not contain, preserving save order.
 *
 * Two classes are removed: a slug that no longer resolves to a course record —
 * exactly the invalid-data class the empty-state defect work covers, since a
 * card rendered from it would link to a route that cannot resolve — and a
 * duplicate, keeping the first occurrence so the order the visitor saved in
 * survives.
 *
 * Returns the shared empty list when nothing survives, and a frozen array
 * otherwise, so no caller can mutate the store's list in place.
 *
 * @param {ReadonlyArray<string>} list - Candidate slugs, in order.
 * @returns {ReadonlyArray<string>} The surviving slugs, in the same order.
 */
function pruneSlugs(list) {
  const seen = new Set()
  const kept = []

  for (const slug of list) {
    if (!isKnownSlug(slug) || seen.has(slug)) continue
    seen.add(slug)
    kept.push(slug)
  }

  return kept.length === 0 ? EMPTY_SAVED_LIST : Object.freeze(kept)
}

/**
 * Read the saved list from storage, shape-checked and pruned.
 *
 * Every failure mode — storage denied, key absent, non-JSON value, a stale
 * envelope version, a payload of the wrong shape — is already handled by
 * `readJson`, which returns the fallback rather than throwing, so this function
 * cannot throw either. The `Array.isArray` guard is belt-and-braces for the
 * fallback path and costs nothing.
 *
 * **Nothing is written here.** A part-stale payload is pruned for this session
 * and reaches storage only when the visitor's next toggle writes; rewriting a
 * cleaned value during a read would mean storage was mutated by a render.
 *
 * @returns {ReadonlyArray<string>} The stored slugs that still resolve, in order.
 */
function readSavedFromStorage() {
  const stored = readJson(SAVED_COURSES_KEY, EMPTY_SAVED_LIST, isSlugArray)

  return pruneSlugs(Array.isArray(stored) ? stored : EMPTY_SAVED_LIST)
}

/**
 * Whether two slug lists hold the same slugs in the same order.
 *
 * The equality test behind {@link commit}'s "did anything actually change?"
 * decision, which is what keeps the cached snapshot — and therefore every
 * consumer's render — stable when a mutation turns out to be a no-op.
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
 * this store is that the card, the header count and the dashboard agree, and
 * one failing consumer must not leave the others holding a stale value — nor
 * throw out of the click handler that triggered the change, which would lose the
 * interaction. React's own store callback does not throw, so in practice this
 * guard never fires.
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
 * describes: an unchanged store keeps its existing snapshot object, so
 * `useSyncExternalStore`'s `Object.is` comparison sees no change and no
 * consumer re-renders. Always allocating here would make every no-op mutation
 * (re-saving what is already saved, clearing an already empty set) a render of
 * every consumer, and a fresh object per *getter call* would loop forever.
 *
 * The list is frozen on the way in, so the value handed to consumers cannot be
 * mutated from the outside afterwards.
 *
 * @param {ReadonlyArray<string>} nextSaved - The new list, already pruned.
 * @param {boolean} nextPersisted - Whether the mutation reached storage.
 * @returns {Readonly<SavedCoursesSnapshot>} The current cached snapshot.
 */
function commit(nextSaved, nextPersisted) {
  const saved = Object.freeze(nextSaved)
  const previous = snapshot

  if (previous !== null && previous.persisted === nextPersisted && sameOrder(previous.saved, saved)) {
    return previous
  }

  snapshot = Object.freeze({ saved, persisted: nextPersisted })
  notify()

  return snapshot
}

/**
 * Populate the snapshot on first use, and return it.
 *
 * The one read of `localStorage` this store performs happens here, on the first
 * subscription or snapshot request — never as a side effect of importing the
 * module, so a module that merely imports this hook touches no storage at all.
 * Idempotent: every later call returns the cached snapshot untouched.
 *
 * `persisted` starts `true` because no write has been attempted, so there is
 * nothing to disclose yet. A surface must not warn about a storage failure that
 * has not happened; the flag flips only when a real write or removal fails.
 *
 * The initial snapshot deliberately does not notify — there is nothing to
 * notify, since this runs before or during the first consumer's own render.
 *
 * @returns {Readonly<SavedCoursesSnapshot>} The initialised snapshot.
 */
function ensureStoreInitialised() {
  if (snapshot === null) {
    snapshot = Object.freeze({ saved: readSavedFromStorage(), persisted: true })
  }

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
  ensureStoreInitialised()

  if (typeof onStoreChange === 'function') {
    subscribers.add(onStoreChange)
  }

  return function unsubscribe() {
    subscribers.delete(onStoreChange)
  }
}

/**
 * Return the cached snapshot — the same reference every time until the data
 * changes.
 *
 * The `getSnapshot` argument `useSyncExternalStore` requires. It must not
 * allocate: see the referential-stability trap in the module header. Do not
 * "helpfully" return a copy or a derived object from here.
 *
 * @returns {Readonly<SavedCoursesSnapshot>} The current store value.
 */
function getStoreSnapshot() {
  return ensureStoreInitialised()
}

/**
 * Return the DOM-less snapshot.
 *
 * The `getServerSnapshot` argument, which keeps the hook safe if it is ever
 * rendered without a browser (there is no server renderer in this project
 * today; this is the same defensive posture the rest of `src/hooks` takes).
 * Returns a module constant, so it is referentially stable.
 *
 * @returns {Readonly<SavedCoursesSnapshot>} The empty, nothing-failed snapshot.
 */
function getServerStoreSnapshot() {
  return SERVER_SNAPSHOT
}

/**
 * Write the list to storage and commit it to memory either way.
 *
 * The ordering is the honest one: the in-memory commit happens regardless of the
 * write's outcome, so a denied or quota-exceeded store never loses the
 * visitor's interaction, and `persisted` carries the truth about durability
 * instead. Both values are committed in one snapshot, so a consumer can never
 * render a new list beside a stale disclosure.
 *
 * @param {ReadonlyArray<string>} nextSaved - The new list, already pruned.
 * @returns {void}
 */
function persistSaved(nextSaved) {
  const result = writeJson(SAVED_COURSES_KEY, nextSaved)

  commit(nextSaved, result.ok === true)
}

/**
 * Add a course to the saved set, or remove it if it is already there.
 *
 * Refuses a slug that does not resolve to a record in `src/data/courses.js`,
 * rather than storing it and pruning it on some later read: an identifier that
 * resolves to nothing is invalid data, and refusing it at the boundary is what
 * keeps the stored list meaningful. A **persistence** failure is not a refusal —
 * the set changed, so this returns `{ ok: true }` and the failure surfaces
 * through `persisted`.
 *
 * Module-level, so the identity handed to consumers as `toggle` never changes.
 *
 * @param {unknown} slug - The course slug to add or remove.
 * @returns {ToggleResult} `{ ok: true }`, or `{ ok: false, reason: 'unknown' }`.
 */
function toggleSavedCourse(slug) {
  const current = ensureStoreInitialised()

  if (!isKnownSlug(slug)) return { ok: false, reason: 'unknown' }

  const next = current.saved.includes(slug)
    ? current.saved.filter((entry) => entry !== slug)
    : [...current.saved, slug]

  persistSaved(next.length === 0 ? EMPTY_SAVED_LIST : next)

  return { ok: true }
}

/**
 * Empty the saved set and remove the stored key.
 *
 * Removal is addressed to this one key by name. The bulk-clear API is never
 * called, here or in `src/lib/storage.js`, because it would destroy every
 * unrelated key on the origin — including another application's data — rather
 * than the one this store owns. Session storage, and therefore
 * `cible:chunk-reload`, is out of reach by construction.
 *
 * `persisted` is taken from the removal's outcome for the same reason a write's
 * is: if the key could not be removed, the cleared state will not survive a
 * reload, and the surface should say so.
 *
 * Module-level, so the identity handed to consumers as `clear` never changes.
 *
 * @returns {void}
 */
function clearSavedCourses() {
  ensureStoreInitialised()

  const result = removeKey(SAVED_COURSES_KEY)

  commit(EMPTY_SAVED_LIST, result.ok === true)
}

/**
 * Subscribe to the visitor's saved courses.
 *
 * Every consumer of this hook renders one shared, device-local list, so the card
 * toggle, the header count and the dashboard panel change together in a single
 * interaction. Takes no arguments.
 *
 * `saved` is frozen: treat it as read-only and copy before sorting
 * (`[...saved].sort()`), because mutating it in place would corrupt the value
 * every other surface is rendering.
 *
 * When `persisted` is `false`, the write failed — storage denied, a full store,
 * or Safari private browsing — and the selection is live for this session but
 * **will not survive a reload**. That is a disclosure the surface is expected to
 * render; it is never reported as a failed toggle.
 *
 * @returns {{
 *   saved: ReadonlyArray<string>,
 *   isSaved: (slug: unknown) => boolean,
 *   toggle: (slug: unknown) => ToggleResult,
 *   clear: () => void,
 *   persisted: boolean,
 * }} `saved` — the saved slugs in save order, pruned of anything no longer in
 *   the catalogue. `isSaved(slug)` — whether that slug is in the rendered set.
 *   `toggle(slug)` — add or remove it, returning `{ ok: true }` on change or
 *   `{ ok: false, reason: 'unknown' }` for a slug that resolves to no course.
 *   `clear()` — empty the set and remove the stored key. `persisted` — whether
 *   the last mutation reached device storage.
 *
 * @example
 * // A card toggle. `states.js` owns the label and icon; the hook owns the datum.
 * const { isSaved, toggle } = useSavedCourses()
 * const saved = isSaved(course.slug)
 * // <button aria-pressed={saved} onClick={() => toggle(course.slug)}>…</button>
 *
 * @example
 * // A header count and the durability disclosure.
 * const { saved, persisted } = useSavedCourses()
 * // {saved.length > 0 && <span>{saved.length}</span>}
 * // {!persisted && <p>Saved for this visit only — this browser blocked storage.</p>}
 */
export function useSavedCourses() {
  // Every hook below is called unconditionally, at the top level, in a stable
  // order, with no early return above it — the Rules of Hooks
  // (`react/rules-of-hooks`, an error in `.oxlintrc.json`). The store's own
  // helpers are plain module-level functions, deliberately not named `use*`, so
  // they are not read as hooks called outside a component.
  const store = useSyncExternalStore(subscribe, getStoreSnapshot, getServerStoreSnapshot)

  // Derived from the snapshot this render was given, not from module state, so a
  // consumer's list and its per-slug answers always come from the same value.
  // Re-created only when the snapshot changes, which is exactly when the answers
  // can differ.
  const isSaved = useCallback(
    (slug) => typeof slug === 'string' && store.saved.includes(slug),
    [store],
  )

  // One stable object per snapshot: a consumer that passes the whole bag down, or
  // lists it as an effect dependency, is not woken by an unrelated render.
  // `toggle` and `clear` are module-level, so their identities never change.
  return useMemo(
    () => ({
      saved: store.saved,
      isSaved,
      toggle: toggleSavedCourse,
      clear: clearSavedCourses,
      persisted: store.persisted,
    }),
    [store, isSaved],
  )
}

