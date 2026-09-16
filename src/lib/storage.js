/**
 * Browser-storage boundary for the CIBLE School of Language website.
 *
 * This module is the **single** place in the codebase permitted to touch
 * `window.localStorage`. Every other module — hooks, components, pages — reaches
 * device-local persistence through the three functions exported here, so all
 * storage access shares one set of guards, one key namespace, and one versioned
 * envelope. Scattered `localStorage` calls are exactly what this boundary
 * exists to prevent: a single missing `try` anywhere else would crash the
 * application on a browser that denies storage.
 *
 * ## The two storage areas are disjoint, and conflating them is a defect
 *
 * This module owns `localStorage` and **nothing else**. The separate
 * session-storage key `cible:chunk-reload` belongs to
 * {@link module:lib/routeLoading lib/routeLoading}, which continues to own it
 * and is deliberately not migrated here. The two are different storage areas:
 * a `localStorage` call cannot read, write, or destroy anything held in
 * session storage, and this module never reaches into that area at all. The
 * never-bulk-`clear` rule below therefore concerns *unrelated `localStorage`
 * keys on this origin* — it is not about the chunk-reload flag, which is out of
 * reach by construction. A future reader should not "unify" the two modules on
 * the mistaken assumption that they share an area.
 *
 * ## The bulk `clear` API is never called
 *
 * `localStorage`'s bulk-clear method destroys every key on the origin rather
 * than the one that failed, including keys belonging to other applications
 * served from the same host. It is never called from this module, in any
 * branch, including recovery paths: a corrupt value is discarded with
 * `removeItem` on that one key and nothing else. There is deliberately no
 * `clearAll`, no key enumeration, and no export that reaches beyond a single
 * named key.
 *
 * ## The versioned envelope
 *
 * Values are not stored bare. {@link writeJson} wraps the caller's payload as
 * `{ v: <version>, data: <payload> }` and {@link readJson} requires that
 * envelope back. The version field is what lets a future shape change discard
 * a stale payload instead of crashing on it — an envelope whose `v` does not
 * match is treated as unreadable and removed, so an old release's data can
 * never be handed to code that expects a new shape.
 *
 * ## The application's one key
 *
 * `cible:saved-courses:v1`, holding `{ v: 1, data: string[] }`, where `data` is
 * an ordered list of course slugs and nothing else — no name, no contact
 * detail, no free text, no timestamp. Course slugs are identifiers already
 * public in the URL of every course detail page, the value never leaves the
 * device, and it identifies no person. The *existence* of device-local storage
 * is nonetheless disclosed to visitors in `src/pages/PrivacyPolicy.jsx` and in
 * `README.md`, because published copy that claimed otherwise would be untrue.
 *
 * ## What this module deliberately does not do
 *
 * - **It never writes on read.** {@link readJson} returns a value; it does not
 *   repair one. A sanitised list is handed back to the caller and persisted
 *   only when the visitor's next write happens. A well-meaning "self-heal on
 *   read" would silently rewrite storage during a render pass.
 * - **It imports nothing**, in particular no module from `src/data`, which is
 *   what keeps it generic and testable. Domain validation is the caller's
 *   business: the rule that a saved slug no longer present in
 *   `src/data/courses.js` must be dropped is implemented by
 *   `src/hooks/useSavedCourses.js`, through the `validate` predicate it passes
 *   to {@link readJson} and the filtering it applies to the returned array.
 * - **It exposes no cross-tab synchronisation.** The `storage` event fires only
 *   in *other* tabs, never in the one that performed the write, so a consumer
 *   that needs every subscriber in the *same* tab to agree must hold a
 *   module-level subscriber store of its own above this boundary.
 *
 * Every export is a plain function or constant with no React, JSX, or hooks,
 * which keeps the module trivially lint-compliant and safe to import anywhere.
 * All values are exported by name; there is no default export.
 *
 * @module lib/storage
 */

/**
 * The shared key namespace for everything this site persists in the browser.
 *
 * It is the same `cible:` namespace already established by the session-storage
 * flag `cible:chunk-reload` in {@link module:lib/routeLoading lib/routeLoading},
 * so all of this application's keys are greppable and no key can collide with
 * another application served from the same origin.
 *
 * **Key convention — callers pass the FULL key.** Every function in this module
 * takes a complete key string such as `'cible:saved-courses:v1'`; none of them
 * prefixes a suffix for you. This constant is exported so a caller can compose
 * its key from it (`` `${STORAGE_PREFIX}saved-courses:v1` ``) or simply assert
 * against it. Composing at the call site keeps the literal key visible where it
 * is used and greppable across the codebase, which a hidden prefix would
 * defeat. The application's only key today is `cible:saved-courses:v1`.
 *
 * @type {string}
 */
export const STORAGE_PREFIX = 'cible:'

/**
 * The envelope schema version this build reads and writes.
 *
 * {@link writeJson} stamps every payload with this value and {@link readJson}
 * accepts only an exact match, discarding anything else. Bumping it is the
 * mechanism by which a future shape change abandons stale data safely rather
 * than handing an old shape to new code: no migration branch is needed, because
 * a mismatched envelope degrades to the caller's fallback.
 *
 * Kept module-private on purpose — the envelope is an implementation detail of
 * this boundary, and a caller that could read or set it would be able to defeat
 * the very check it exists to enforce.
 *
 * @type {number}
 */
const ENVELOPE_VERSION = 1

/**
 * The outcome of a write or a removal. Returned rather than thrown, so a
 * failing storage layer degrades the interface instead of breaking a render.
 *
 * `reason` is present only when `ok` is `false`, and is one of:
 *
 * - `'unavailable'` — storage cannot be used at all: the `window.localStorage`
 *   property read threw (a `SecurityError`, raised when storage is disabled by
 *   browser policy or an extension), there is no `window` (a non-browser
 *   environment), or the supplied key was not a usable string.
 * - `'quota'` — the write itself was rejected: `setItem` threw a
 *   `QuotaExceededError`. This covers both a genuinely full store and Safari
 *   private browsing, where the quota is effectively zero and so the *very
 *   first* write throws with nothing stored. Existing data is left untouched.
 * - `'serialize'` — the value could not be turned into JSON at all
 *   (`JSON.stringify` threw on a circular structure or a `BigInt`). Detected
 *   before storage is touched, so nothing was written and nothing was lost.
 *
 * Consumers surface this: `src/hooks/useSavedCourses.js` derives its `persisted`
 * flag from `ok`, updating its in-memory state regardless so the interface does
 * not regress mid-session, while disclosing that the selection will not survive
 * a reload. That flag is only as reliable as this field, so `ok` is `true` if
 * and only if the value actually reached storage.
 *
 * @typedef {Object} StorageResult
 * @property {boolean} ok - Whether the operation completed.
 * @property {'unavailable'|'quota'|'serialize'} [reason] - Why it did not, when `ok` is `false`.
 */

/**
 * Read, unwrap, and validate a value previously stored by {@link writeJson}.
 *
 * **This function never throws, for any input.** That is its acceptance bar:
 * it is called during render and initial state setup, where a throw would take
 * the whole route down. Four independent failure modes are therefore handled
 * inside one guarded block, because each throws differently and any one of them
 * escaping would defeat the guarantee:
 *
 * 1. The `window.localStorage` **property read** — a `SecurityError` when
 *    storage is disabled by browser policy or an extension. The property access
 *    itself is inside the guard, not just the method call on it.
 * 2. `getItem` — may throw for the same reason.
 * 3. `JSON.parse` — a `SyntaxError` on a value hand-edited in devtools,
 *    truncated by a failed write, or written as a raw non-JSON string.
 * 4. The envelope **version check** and **shape check**, including the caller's
 *    own `validate` predicate, which is invoked defensively.
 *
 * The parsed value is shape-checked, never trusted: it must be a plain object
 * carrying both `v` and `data`, its `v` must equal the version this build
 * writes, and `validate` (when supplied) must accept `data`.
 *
 * Outcomes:
 *
 * - **Value present and valid** → the unwrapped `data` is returned.
 * - **Key absent** → `fallback` is returned and storage is left untouched. A
 *   key that was never written is not a corrupt key and must not be removed.
 * - **Any failure above** → `fallback` is returned and *only that one key* is
 *   removed, so a poisoned value cannot fail every subsequent read.
 *
 * **It never writes.** A rejected or sanitised value is returned to the caller,
 * not repaired in place: discarding a broken key is a removal, not a write, and
 * re-serialising a cleaned payload back into storage during a read is
 * deliberately not done. The cleaned value is persisted only when the visitor's
 * next {@link writeJson} happens.
 *
 * Domain validation belongs to the caller. This module imports no data module,
 * so pruning identifiers that no longer exist in the catalogue is expressed by
 * the `validate` predicate and by filtering the returned array in
 * `src/hooks/useSavedCourses.js`.
 *
 * @template T
 * @param {string} key - The full key, for example `'cible:saved-courses:v1'`.
 * @param {T} fallback - Returned verbatim on absence or any failure. Supply the
 *   caller's typed empty value (for example `[]`), never `undefined`.
 * @param {(data: unknown) => boolean} [validate] - Optional shape predicate
 *   applied to the unwrapped payload. Its return value is evaluated for
 *   truthiness, and a predicate that throws is treated exactly as a rejection.
 *   Supply one whenever the shape matters: without it, any JSON value found
 *   inside a matching envelope is returned as-is.
 * @returns {T} The stored payload, or `fallback`.
 */
export function readJson(key, fallback, validate) {
  if (typeof window === 'undefined') return fallback
  if (!isUsableKey(key)) return fallback

  let corrupt = false

  try {
    // The property read sits inside the guard on purpose: reaching for
    // `window.localStorage` can itself throw a SecurityError.
    const storage = window.localStorage
    const raw = storage.getItem(key)

    // Never written — not a corruption. Return the fallback and remove nothing.
    if (raw === null || raw === undefined) return fallback

    const parsed = JSON.parse(raw)

    if (
      isEnvelope(parsed) &&
      parsed.v === ENVELOPE_VERSION &&
      accepts(validate, parsed.data)
    ) {
      return parsed.data
    }

    // Parsed, but the envelope is a stale version or the payload failed its
    // shape check. Unreadable to this build, so it is discarded below.
    corrupt = true
  } catch {
    // Property read, getItem, or JSON.parse threw. Same outcome: unusable.
    corrupt = true
  }

  if (corrupt) {
    // Discard ONLY the key that failed. The bulk-clear method is never called
    // here or anywhere else in this module — it would destroy every unrelated
    // key on this origin, including other applications' data. Do not add it as
    // a "reset" shortcut.
    removeKey(key)
  }

  return fallback
}

/**
 * Serialise a value into the versioned envelope and store it under one key.
 *
 * **This function never throws.** It reports its outcome as a
 * {@link StorageResult} so a caller can keep its in-memory state and disclose
 * that the value will not survive a reload, rather than losing a user
 * interaction to an exception.
 *
 * The three failure reasons are distinguished by *where* the failure happens,
 * which is why serialisation is performed before storage is touched at all and
 * why the storage property read is guarded separately from the write:
 *
 * - `'serialize'` — the value cannot become JSON. Nothing was written.
 * - `'unavailable'` — storage cannot be reached: no `window`, an unusable key,
 *   or a `SecurityError` from the property read.
 * - `'quota'` — `setItem` rejected the write. Both a full store and Safari
 *   private browsing (an effectively zero quota, where the *first* write
 *   throws with nothing stored) land here. Existing data is left unchanged;
 *   no key is removed to make room.
 *
 * @param {string} key - The full key, for example `'cible:saved-courses:v1'`.
 * @param {unknown} value - The payload to wrap as `{ v, data: value }`. Must be
 *   JSON-representable; `undefined`, functions, and symbols are rejected.
 * @returns {StorageResult} `{ ok: true }`, or `{ ok: false, reason }`.
 */
export function writeJson(key, value) {
  if (typeof window === 'undefined') return { ok: false, reason: 'unavailable' }
  if (!isUsableKey(key)) return { ok: false, reason: 'unavailable' }

  // `undefined`, functions, and symbols are silently dropped from an object
  // during serialisation, which would store an envelope carrying no `data`
  // field at all — a value the next read would rightly reject and discard.
  // Report the serialisation failure instead of writing a self-corrupting
  // envelope.
  if (value === undefined || typeof value === 'function' || typeof value === 'symbol') {
    return { ok: false, reason: 'serialize' }
  }

  // Serialise BEFORE touching storage: it isolates 'serialize' from any storage
  // failure, and a doomed write never runs.
  let payload
  try {
    payload = JSON.stringify({ v: ENVELOPE_VERSION, data: value })
  } catch {
    // Circular structure, a BigInt, or a throwing `toJSON`.
    return { ok: false, reason: 'serialize' }
  }

  // Defensive: a polluted `Object.prototype.toJSON` can make `stringify`
  // return `undefined` instead of throwing. Storing the literal string
  // "undefined" would poison the next read.
  if (typeof payload !== 'string') return { ok: false, reason: 'serialize' }

  let storage
  try {
    storage = window.localStorage
  } catch {
    // The property read itself threw: storage is denied by policy.
    return { ok: false, reason: 'unavailable' }
  }
  if (!storage) return { ok: false, reason: 'unavailable' }

  try {
    storage.setItem(key, payload)
    return { ok: true }
  } catch (error) {
    // The write was rejected. Existing data is untouched: nothing is removed
    // and the bulk-clear method is never called to free space.
    return { ok: false, reason: classifyWriteError(error) }
  }
}


/**
 * Remove exactly one key, and never more than one.
 *
 * Used by a visitor-facing "clear" action and internally by {@link readJson}
 * when a stored value proves unreadable. Never throws, and reports its outcome
 * in the same {@link StorageResult} shape {@link writeJson} uses so callers
 * handle both identically.
 *
 * A key that was already absent is a success: `removeItem` on a missing key is
 * a no-op by specification, and the caller's intent — that the key not be
 * present — is satisfied either way.
 *
 * This is the module's only deletion path. There is deliberately no
 * bulk-removal counterpart: the bulk-clear method would destroy every unrelated
 * key on the origin, so removal is always addressed to one named key.
 *
 * @param {string} key - The full key, for example `'cible:saved-courses:v1'`.
 * @returns {StorageResult} `{ ok: true }`, or `{ ok: false, reason: 'unavailable' }`.
 */
export function removeKey(key) {
  if (typeof window === 'undefined') return { ok: false, reason: 'unavailable' }
  if (!isUsableKey(key)) return { ok: false, reason: 'unavailable' }

  try {
    // One key, by name. Never the bulk-clear method.
    window.localStorage.removeItem(key)
    return { ok: true }
  } catch {
    return { ok: false, reason: 'unavailable' }
  }
}

/**
 * `DOMException` names browsers use to signal an exhausted storage quota.
 *
 * Chromium and WebKit raise `QuotaExceededError`; Firefox has historically
 * raised `NS_ERROR_DOM_QUOTA_REACHED`. Both are matched so the reported reason
 * is accurate across engines.
 *
 * @type {ReadonlyArray<string>}
 */
const QUOTA_ERROR_NAMES = Object.freeze(['QuotaExceededError', 'NS_ERROR_DOM_QUOTA_REACHED'])

/**
 * Legacy numeric `DOMException` codes for the same condition, checked as a
 * fallback for engines that report a code but an unexpected name: `22` is
 * `QUOTA_EXCEEDED_ERR` and `1014` is Firefox's quota code.
 *
 * @type {ReadonlyArray<number>}
 */
const QUOTA_ERROR_CODES = Object.freeze([22, 1014])

/**
 * Classify a rejection thrown by `setItem` into a {@link StorageResult} reason.
 *
 * The classification is itself wrapped, because inspecting an arbitrary thrown
 * value must not become a second failure: a caller could in principle throw an
 * object whose `name` getter throws. An unclassified rejection is reported as
 * `'quota'`, which is the overwhelmingly likely cause of a `setItem` that
 * fails after the property read already succeeded.
 *
 * @param {unknown} error - The value thrown by `setItem`.
 * @returns {'unavailable'|'quota'} The reason to report.
 */
function classifyWriteError(error) {
  try {
    const name = error && typeof error.name === 'string' ? error.name : ''
    if (name === 'SecurityError') return 'unavailable'
    if (QUOTA_ERROR_NAMES.includes(name)) return 'quota'

    const code = error && typeof error.code === 'number' ? error.code : 0
    if (QUOTA_ERROR_CODES.includes(code)) return 'quota'

    return 'quota'
  } catch {
    return 'quota'
  }
}

/**
 * Whether a key is a usable, non-empty string.
 *
 * Guarded explicitly rather than left to coercion: `getItem(undefined)` would
 * silently address a key literally named `"undefined"`, and a write to it would
 * be a real defect that goes unnoticed until someone inspects storage.
 *
 * @param {unknown} key - The candidate key.
 * @returns {boolean} True when the key can address a storage entry.
 */
function isUsableKey(key) {
  return typeof key === 'string' && key.length > 0
}

/**
 * Whether a parsed value is a versioned envelope this module could have
 * written: a plain object — not `null`, not an array — carrying both `v` and
 * `data` as its own properties.
 *
 * Requiring an own `data` property is what closes the otherwise-silent hole
 * where a truncated `{"v":1}` would unwrap to `undefined` and be handed back to
 * the caller in place of its fallback. `hasOwnProperty` is called off
 * `Object.prototype` so a payload carrying its own `hasOwnProperty` key cannot
 * influence the check.
 *
 * @param {unknown} value - The result of `JSON.parse`.
 * @returns {boolean} True when the value has the envelope shape.
 */
function isEnvelope(value) {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.prototype.hasOwnProperty.call(value, 'v') &&
    Object.prototype.hasOwnProperty.call(value, 'data')
  )
}

/**
 * Apply a caller's optional shape predicate defensively.
 *
 * No predicate means no shape constraint, so the payload is accepted. A
 * predicate's return value is evaluated for truthiness — a predicate that
 * forgets to return therefore rejects — and a predicate that *throws* is
 * treated exactly as a rejection, so a bug in a caller's validator can never
 * propagate out of {@link readJson}.
 *
 * @param {((data: unknown) => boolean)|undefined} validate - The predicate, if any.
 * @param {unknown} data - The unwrapped payload to check.
 * @returns {boolean} True when the payload may be returned to the caller.
 */
function accepts(validate, data) {
  if (typeof validate !== 'function') return true
  try {
    return Boolean(validate(data))
  } catch {
    return false
  }
}

