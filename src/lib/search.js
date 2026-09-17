/**
 * search.js — the CIBLE School of Language client-side search index.
 *
 * ONE index over every content module, and one query function that answers with
 * results grouped by category. There is no server, no search service and no
 * search dependency: this module is the whole of the site's search capability
 * (AAP §0.6.1, §0.6.4).
 *
 * ── WHAT IT CLAIMS, AND WHAT IT DELIBERATELY DOES NOT ─────────────────────
 * Search claims only what substring matching over in-repo content can support.
 * There is no relevance model beyond substring matching plus a title-prefix
 * boost, no spelling suggestion, no usage-frequency or recency ordering, no
 * query logging, no persistence of recent searches and no network access — the
 * site has no analytics tier and none is introduced here (AAP §0.6.1, §0.13.2).
 * The no-results copy belongs to the consuming view, and its substance is
 * fixed: nothing in the COURSES, EVENTS, FACULTY, ARTICLES, FAQs or PAGES
 * matched. {@link SEARCH_GROUPS} is that sentence's group set, in that order,
 * so the copy and the index can never disagree.
 *
 * ── THE LAZY BOUNDARY THIS MODULE IS PART OF (AAP §0.6.4, §0.12.6) ────────
 * `GlobalSearch.jsx` is rendered by the ALWAYS-MOUNTED `Navbar`, so a static
 * import of it would pull this module — and with it every content module — into
 * the entry chunk, which is the opposite of the intent. `Navbar` therefore
 * loads `GlobalSearch` through an explicit dynamic `import()` state machine,
 * and `GlobalSearch` calls {@link buildIndex} on mount, so BOTH the code and
 * the index stay out of the entry chunk. Two obligations follow, and they are
 * the reason this module is shaped the way it is:
 *   1. NEVER import this module from anything eagerly mounted. Route modules
 *      (`/search`) and lazily imported components only.
 *   2. This module performs NO WORK AT IMPORT TIME. The top level holds
 *      imports, frozen constant tables, pure function declarations and one
 *      `null` cache slot — nothing that walks a content module. The index is
 *      built on the first {@link buildIndex} call and memoised thereafter.
 * The measurable consequence, checked in AAP §0.12.6, is a separate
 * `GlobalSearch` chunk in `dist/assets`; its absence would mean the boundary
 * was broken by a static import somewhere.
 *
 * ── WHY THERE IS NO INDEX STRUCTURE AND NO DEPENDENCY (AAP §0.3.3, F14) ───
 * The indexed content is ten courses, five events, six faculty members, six
 * articles, ten FAQs and eighteen pages — fifty-five records. At that scale a
 * linear pass over pre-normalised strings costs microseconds, so no inverted
 * index, no trigram table, no fuzzy-match library, no web worker and no
 * debounce timer is justified; adding one would be the premature optimisation
 * the brief forbids. The practices that DO apply are implemented here:
 *   • Normalisation happens ONCE, at index-build time, not per keystroke —
 *     that is the entire purpose of the `haystack` field.
 *   • The index is built lazily on first use and memoised for the session.
 *   • The result count is derived from the same pass that produces the
 *     results (see {@link searchAll}'s two-bucket collection).
 *
 * ── WHERE A RESULT GOES IS A CONSTRAINT, NOT A FREE CHOICE (AAP §0.6.4) ───
 * Four groups address a route; two deliberately address a URL FRAGMENT on a
 * listing page, because the route table has no per-record path for them and is
 * not being given one:
 *   • course   → `/courses/<slug>`        (per-course detail route)
 *   • event    → `/events/<slug>`         (per-event detail route)
 *   • page     → the route's own path     (derived from `navigation.js`)
 *   • article  → `/blog#post-<slug>`      — there is NO per-article route.
 *                `BlogCard` is intentionally non-interactive and its former
 *                "Read more" control was REMOVED as a QA fix because it linked
 *                back to the listing the card already sat in; `/blog/:slug` is
 *                explicitly out of scope (AAP §0.13.2). The `href` below is
 *                used by a search result row, never by `BlogCard`: no card
 *                gains a call to action it does not have today.
 *   • faculty  → `/faculty#faculty-<slug>` — faculty have no detail page and
 *                are not to be given one.
 *   • faq      → `/faq#faq-<id>`           — the one canonical fragment form,
 *                shared with `courses[].faqIds` and any external link.
 * Activating a fragment result depends on the destination page's hash-aware
 * effect (`Faq.jsx` opens the question, then scrolls, then focuses;
 * `Blog.jsx` and `Faculty.jsx` scroll and focus the anchored item). This
 * module only has to emit the agreed form.
 *
 * ── THE DECLARED FUTURE ADAPTER — NOT IMPLEMENTED HERE (AAP §0.6.1) ───────
 * A server-side index would attach behind {@link SearchRemote}, declared as a
 * type below and deliberately left unimplemented: a declared interface, not
 * dead code. The honest cost of adopting it is a PENDING state in the combobox
 * listbox and a FAILURE row — nothing more, because `SearchRecord` is
 * unchanged, so the result rows and their `href` derivation are unchanged.
 * That is what this seam preserves: the data shape and the failure vocabulary,
 * which are the expensive parts to retrofit. It is not claimed to be a
 * zero-diff substitution.
 *
 * Pure, deterministic and framework-free: no React, no JSX, no hooks, no
 * storage, no network, no mutation of any source array. Every value is
 * exported BY NAME; there is no default export (the `src/lib` convention, per
 * `schema.js`).
 *
 * @module lib/search
 */

import { courses } from '../data/courses.js'
import { events } from '../data/events.js'
import { faculty } from '../data/faculty.js'
import { blog } from '../data/blog.js'
import { faq } from '../data/faq.js'
import { primaryNav, footerNav } from '../data/navigation.js'
import { formatCivilDate } from './dates.js'

/**
 * One searchable record. The shape is the module's public contract, consumed
 * by the header suggestion panel and by the `/search` results page, and it is
 * unchanged by a future remote implementation.
 *
 * @typedef {Object} SearchRecord
 * @property {string} id       Stable and GROUP-PREFIXED (`'course:spoken-english'`),
 *                             so two records from different modules can never
 *                             collide and a consumer has a React key without
 *                             falling back to an array index.
 * @property {'course'|'event'|'faculty'|'article'|'faq'|'page'} group
 *                             The closed set of six categories. Also the key
 *                             under which {@link searchAll} groups the record.
 * @property {string} label    What the result row displays as its primary line.
 * @property {string} [context] A short secondary line — a category, a role, a
 *                             formatted date or a path. Absent when the source
 *                             record has nothing meaningful to show, so a
 *                             consumer must render it conditionally rather
 *                             than printing `undefined`.
 * @property {string} href     Where activating the result navigates. Always a
 *                             root-relative in-app path, sometimes carrying a
 *                             URL fragment (see the module header).
 * @property {string} haystack Pre-lowercased, whitespace-collapsed searchable
 *                             text, built ONCE at index time. It is built
 *                             LABEL-FIRST on purpose: that is what lets the
 *                             title-prefix boost be a `startsWith` over this
 *                             same string, with no per-keystroke
 *                             `toLowerCase()` anywhere in the query path.
 */

/**
 * The result shape a future server-backed search would resolve to.
 *
 * @typedef {{ ok: true, groups: Record<string, SearchRecord[]> }
 *          | { ok: false, reason: 'unavailable'|'network' }} RemoteSearchResult
 */

/**
 * DECLARED, NOT IMPLEMENTED — the remote search adapter (AAP §0.6.1).
 *
 * A real search service attaches by satisfying this signature. Adopting it
 * costs a pending state in the combobox listbox and a failure row in the
 * results view; `SearchRecord` is unchanged, so the result rows and their
 * `href` derivation are unchanged. Nothing in this module calls it and no
 * implementation is provided here.
 *
 * @callback SearchRemote
 * @param {string} query
 * @param {{ limit?: number }} [options]
 * @returns {Promise<RemoteSearchResult>}
 */

/**
 * The six groups, in CANONICAL ORDER, with the display label a consuming view
 * uses as its group heading.
 *
 * The order is load-bearing in two places: {@link searchAll} returns its keys
 * in exactly this sequence, so the suggestion panel and the results page
 * present categories consistently; and it matches the AAP's no-results
 * sentence ("courses, events, faculty, articles, FAQs or pages") so the copy
 * and the index cannot drift apart.
 *
 * @type {ReadonlyArray<{ id: SearchRecord['group'], label: string }>}
 */
export const SEARCH_GROUPS = Object.freeze([
  Object.freeze({ id: 'course', label: 'Courses' }),
  Object.freeze({ id: 'event', label: 'Events' }),
  Object.freeze({ id: 'faculty', label: 'Faculty' }),
  Object.freeze({ id: 'article', label: 'Articles' }),
  Object.freeze({ id: 'faq', label: 'FAQs' }),
  Object.freeze({ id: 'page', label: 'Pages' }),
])

/**
 * Just the group ids, in the same canonical order — the convenient form for
 * iterating the result object's keys.
 *
 * @type {ReadonlyArray<SearchRecord['group']>}
 */
export const SEARCH_GROUP_IDS = Object.freeze(SEARCH_GROUPS.map((group) => group.id))

/**
 * The per-group cap the header suggestion panel passes as `searchAll`'s
 * `limit`, so the panel stays calm rather than visually overwhelming (user
 * directive on F9). The full `/search` route passes no limit and shows every
 * match. Exported so the number lives in one place instead of being retyped
 * as a literal at the call site.
 *
 * @type {number}
 */
export const SUGGESTION_LIMIT = 3

/**
 * Coerce an unknown value to trimmed display text.
 *
 * Every content module is hand-authored ESM, so a field can legitimately be
 * absent (`faculty[].slug`, `faq[].id`, `events[].type`) and must never reach
 * the interface as the literal string `'undefined'`. Anything that is not a
 * non-empty string collapses to `''`, which every caller treats as "omit".
 *
 * @param {unknown} value
 * @returns {string} The trimmed string, or `''`.
 */
function text(value) {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * Join the parts of a secondary line, dropping the empty ones.
 *
 * Returns `''` rather than a dangling separator when every part is missing,
 * which is what makes `context` safely optional on the record.
 *
 * @param {unknown[]} parts
 * @returns {string} The joined line, or `''`.
 */
function contextLine(parts) {
  return parts.map(text).filter(Boolean).join(' · ')
}

/**
 * Build a record's `haystack`: one lowercased, whitespace-collapsed string.
 *
 * This is the module's single normalisation point — it runs once per record at
 * index-build time and never again, which is why {@link searchAll} can match
 * with a bare `String.prototype.includes`. Nested arrays are flattened so a
 * caller can pass `highlights` or `socials`-style lists directly, and
 * non-string members are ignored rather than stringified (a `react-icons`
 * component reference must never be folded into searchable text).
 *
 * The FIRST part must be the record's label: the title-prefix boost in
 * {@link searchAll} is a `startsWith` over this string, which is exact only
 * because the label leads it.
 *
 * @param {unknown[]} parts Label first, then any further searchable fields.
 * @returns {string} Lowercased searchable text.
 */
function haystackOf(parts) {
  /** @type {string[]} */
  const flat = []
  for (const part of parts) {
    if (Array.isArray(part)) {
      for (const member of part) {
        const value = text(member)
        if (value) flat.push(value)
      }
      continue
    }
    const value = text(part)
    if (value) flat.push(value)
  }
  return flat.join(' ').replace(/\s+/g, ' ').toLowerCase()
}

/**
 * Whether a value can be read as a content record.
 *
 * Guards the index build against a malformed entry (a `null` hole left by an
 * edit, a stray primitive) so one bad record degrades to being skipped rather
 * than throwing inside a module that the header search opens.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Read a content collection defensively.
 *
 * Each `src/data/*` module exports a module-level array. This returns the
 * array's plain-object members only, and an empty array for anything else, so
 * the index build never assumes a shape it has not checked.
 *
 * @param {unknown} collection
 * @returns {Record<string, unknown>[]}
 */
function records(collection) {
  if (!Array.isArray(collection)) return []
  return /** @type {Record<string, unknown>[]} */ (collection.filter(isRecord))
}

/**
 * Freeze a fully-built record so the memoised index cannot be mutated by a
 * consumer holding a reference to it.
 *
 * `context` is omitted entirely when empty, keeping the optional property
 * genuinely optional rather than present-but-blank.
 *
 * @param {{ id: string, group: SearchRecord['group'], label: string, context?: string, href: string, haystack: string }} record
 * @returns {SearchRecord}
 */
function sealRecord(record) {
  const { id, group, label, context, href, haystack } = record
  return Object.freeze(
    context
      ? { id, group, label, context, href, haystack }
      : { id, group, label, href, haystack },
  )
}

/* ── THE SIX GROUP BUILDERS ───────────────────────────────────────────────
 *
 * One builder per group, each reading exactly one content module. They share
 * three rules:
 *
 *   1. AN UNADDRESSABLE RECORD IS NEVER EMITTED WITH A BROKEN HREF. A course
 *      or event with no `slug` has no detail URL at all, so it is SKIPPED. A
 *      record whose destination is a FRAGMENT on a listing page degrades to
 *      that listing page with NO fragment — `/blog`, `/faculty`, `/faq` — so
 *      the result still navigates somewhere correct. `#post-undefined`,
 *      `#faculty-undefined` and `#faq-undefined` are therefore unreachable by
 *      construction, and the fallback is applied uniformly across all three
 *      fragment groups rather than differing per module.
 *   2. AN `id` IS NEVER `'<group>:undefined'`. Where the identifying field is
 *      missing, a positional suffix (`faculty:member-3`) keeps the id unique
 *      within the session. The position counts the READABLE records of that
 *      module, so it is only as stable as the module's own order — which is
 *      exactly why every record in the repository today carries its explicit
 *      identifier and why none of these fallbacks fires against real content.
 *   3. AN IDENTIFIER IS READ, NEVER DERIVED. `faculty[].slug` in particular is
 *      authored from that record's `/faculty/<slug>.jpg` asset path and must
 *      not be re-derived from the name: normalising a name would silently move
 *      a person's anchor when the name were corrected, and it would need a
 *      collision rule for two members sharing a surname. There is no slugify
 *      helper in this module, deliberately.
 */

/**
 * Course records → `/courses/<slug>`.
 *
 * `context` is the category, which is also in the haystack, so every string
 * the row displays is searchable. The haystack spans title, category, summary
 * and highlights — the fields that carry a course's meaning. `icon` is a
 * component reference and is never touched; the twelve optional
 * machine-readable fields belong to filtering and recommendation, not to
 * search, and a record missing any of them indexes identically.
 *
 * @returns {SearchRecord[]}
 */
function courseRecords() {
  /** @type {SearchRecord[]} */
  const built = []
  for (const course of records(courses)) {
    const slug = text(course.slug)
    // No slug means no `/courses/:slug` URL exists for this record at all.
    if (!slug) continue
    const label = text(course.title) || slug
    built.push(
      sealRecord({
        id: `course:${slug}`,
        group: 'course',
        label,
        context: contextLine([course.category]),
        href: `/courses/${slug}`,
        haystack: haystackOf([label, course.category, course.summary, course.highlights]),
      }),
    )
  }
  return built
}

/**
 * Event records → `/events/<slug>`.
 *
 * The date is formatted with {@link formatCivilDate} and NEVER with
 * `toLocaleDateString` over the raw string: `new Date('YYYY-MM-DD')` parses as
 * UTC midnight and shifts the day in every timezone west of UTC, which is the
 * precise defect `src/lib/dates.js` exists to prevent and which would surface
 * here as a wrong date on a search result row. An unparseable date formats to
 * `''` and is simply dropped from the line.
 *
 * Both the formatted date and the raw ISO value join the haystack, so "august"
 * and "2026-08" both find the workshop. Event LIFECYCLE is deliberately not
 * consulted: filtering search results by whether an event has passed is not a
 * requirement, and reaching for `eventSchedule.js` here would add a dependency
 * this module does not need.
 *
 * @returns {SearchRecord[]}
 */
function eventRecords() {
  /** @type {SearchRecord[]} */
  const built = []
  for (const event of records(events)) {
    const slug = text(event.slug)
    // No slug means no `/events/:slug` URL exists for this record at all.
    if (!slug) continue
    const label = text(event.title) || slug
    const formattedDate = formatCivilDate(
      typeof event.date === 'string' ? event.date : undefined,
    )
    built.push(
      sealRecord({
        id: `event:${slug}`,
        group: 'event',
        label,
        context: contextLine([formattedDate, event.type]),
        href: `/events/${slug}`,
        haystack: haystackOf([
          label,
          event.type,
          event.description,
          event.location,
          formattedDate,
          event.date,
        ]),
      }),
    )
  }
  return built
}

/**
 * Faculty records → `/faculty#faculty-<slug>`, or `/faculty` with no fragment
 * when the record carries no `slug`.
 *
 * Faculty members have no detail route and are not to be given one, so the
 * fragment addresses their card on the listing page, which resolves the hash,
 * scrolls the card into view and moves focus to it.
 *
 * @returns {SearchRecord[]}
 */
function facultyRecords() {
  /** @type {SearchRecord[]} */
  const built = []
  const list = records(faculty)
  for (let index = 0; index < list.length; index += 1) {
    const member = list[index]
    const slug = text(member.slug)
    const label = text(member.name)
    // A member with neither an explicit slug nor a name carries nothing a
    // result row could display, so there is nothing to index.
    if (!slug && !label) continue
    built.push(
      sealRecord({
        id: slug ? `faculty:${slug}` : `faculty:member-${index + 1}`,
        group: 'faculty',
        label: label || slug,
        context: contextLine([member.role]),
        href: slug ? `/faculty#faculty-${slug}` : '/faculty',
        haystack: haystackOf([label || slug, member.role, member.bio]),
      }),
    )
  }
  return built
}

/**
 * Article records → `/blog#post-<slug>`, or `/blog` with no fragment when the
 * record carries no `slug`.
 *
 * There is no per-article route, by design: `BlogCard` is non-interactive
 * because the route table has no `/blog/:slug`, its former "Read more" control
 * was removed as a QA fix for being a self-referential dead end, and adding
 * that route is explicitly out of scope. This `href` is consumed by a search
 * result row only — no card gains a call to action it lacks today.
 *
 * The full `content` body joins the haystack, which is what makes an article
 * findable by a phrase that appears nowhere in its title or excerpt.
 *
 * @returns {SearchRecord[]}
 */
function articleRecords() {
  /** @type {SearchRecord[]} */
  const built = []
  const list = records(blog)
  for (let index = 0; index < list.length; index += 1) {
    const post = list[index]
    const slug = text(post.slug)
    const label = text(post.title)
    if (!slug && !label) continue
    const formattedDate = formatCivilDate(
      typeof post.date === 'string' ? post.date : undefined,
    )
    built.push(
      sealRecord({
        id: slug ? `article:${slug}` : `article:post-${index + 1}`,
        group: 'article',
        label: label || slug,
        context: contextLine([post.category, formattedDate]),
        href: slug ? `/blog#post-${slug}` : '/blog',
        haystack: haystackOf([
          label || slug,
          post.excerpt,
          post.category,
          post.author,
          post.content,
          formattedDate,
        ]),
      }),
    )
  }
  return built
}

/**
 * FAQ records → `/faq#faq-<id>`, or `/faq` with no fragment when the record
 * carries no `id`.
 *
 * `#faq-<id>` is the one canonical fragment form, shared with
 * `courses[].faqIds` and any external link, and the FAQ page resolves it by
 * opening the question, then scrolling it into view, then focusing it.
 *
 * `answerConfirmed` is NOT read and NOT acted on: that flag gates FAQPage
 * structured data, which asserts accuracy to a machine, and has nothing to do
 * with whether a question is searchable. All ten questions are visibly
 * rendered today, so all ten are legitimately findable.
 *
 * @returns {SearchRecord[]}
 */
function faqRecords() {
  /** @type {SearchRecord[]} */
  const built = []
  const list = records(faq)
  for (let index = 0; index < list.length; index += 1) {
    const item = list[index]
    const id = text(item.id)
    const label = text(item.question)
    if (!id && !label) continue
    built.push(
      sealRecord({
        id: id ? `faq:${id}` : `faq:question-${index + 1}`,
        group: 'faq',
        label: label || id,
        context: contextLine([item.category]),
        href: id ? `/faq#faq-${id}` : '/faq',
        haystack: haystackOf([label || id, item.answer, item.category]),
      }),
    )
  }
  return built
}

/**
 * Page records → the route's own path.
 *
 * Derived from the UNION of `primaryNav` and every `footerNav[].links` entry,
 * de-duplicated by path with the first occurrence winning — which keeps the
 * header's wording ("About") over the footer's variant ("About Us") for a
 * route both surfaces list. Deriving from the navigation module rather than
 * hardcoding a route list is what makes the page group self-maintaining: when
 * `navigation.js` gained `/learning-path` in its "Courses" footer column, that
 * route joined the search index with no edit here, and any future navigation
 * entry does the same.
 *
 * The three control-reachable utility routes — `/compare`, `/search` and
 * `/dashboard` — are absent from `navigation.js` by design (each emits
 * `noindex` and renders query-determined or device-local content), so they are
 * absent here too. That is correct: a search result pointing at the search
 * page, or at an empty comparison, would be noise.
 *
 * The path joins the haystack twice: verbatim, so a query typed as `/faq` or
 * `spoken-english` matches, and with its separators expanded to spaces, so
 * `spoken english` matches the same route. Both forms are what a visitor
 * plausibly types for a URL they half-remember.
 *
 * @returns {SearchRecord[]}
 */
function pageRecords() {
  /** @type {SearchRecord[]} */
  const built = []
  const seen = new Set()
  /** @type {Record<string, unknown>[]} */
  const links = [...records(primaryNav)]
  for (const column of records(footerNav)) {
    links.push(...records(column.links))
  }
  for (const link of links) {
    const path = text(link.path)
    // Only an in-app, root-relative path is navigable from a result row.
    if (!path.startsWith('/') || seen.has(path)) continue
    seen.add(path)
    const label = text(link.label)
    if (!label) continue
    built.push(
      sealRecord({
        id: `page:${path}`,
        group: 'page',
        label,
        context: path,
        href: path,
        haystack: haystackOf([label, path, path.replace(/[/-]+/g, ' ')]),
      }),
    )
  }
  return built
}


/**
 * The memoised index, or `null` until the first {@link buildIndex} call.
 *
 * A module-scoped slot rather than an eagerly-initialised constant: assigning
 * it at the top level would walk every content module the instant this module
 * is imported, which is exactly what the lazy boundary in the header exists to
 * prevent.
 *
 * @type {SearchRecord[]|null}
 */
let cachedIndex = null

/**
 * Build — or return the already-built — client search index.
 *
 * The index spans all six groups in {@link SEARCH_GROUPS} order, and within a
 * group it preserves the source module's own order, so the whole structure is
 * deterministic: the same checkout always produces the same array.
 *
 * MEMOISED FOR THE SESSION. The first call builds; every later call returns
 * the SAME frozen array reference, which is what makes it safe to use directly
 * as a `useMemo` dependency. Rebuilding is pointless and there is deliberately
 * no invalidation hook: all content is build-time ESM, so it cannot change at
 * runtime, and a page reload is what picks up a new deployment.
 *
 * The returned array and every record in it are FROZEN, so a consumer cannot
 * corrupt the shared cache. A caller that needs to sort or splice must copy
 * first (`[...buildIndex()]`); {@link searchAll} always returns fresh arrays
 * for exactly this reason.
 *
 * @returns {SearchRecord[]} The frozen, memoised index — roughly fifty-five
 *                           records for the current content set.
 */
export function buildIndex() {
  if (cachedIndex) return cachedIndex
  cachedIndex = Object.freeze([
    ...courseRecords(),
    ...eventRecords(),
    ...facultyRecords(),
    ...articleRecords(),
    ...faqRecords(),
    ...pageRecords(),
  ])
  return cachedIndex
}

/**
 * Normalise a query exactly once per call: trim, lowercase, and collapse
 * internal runs of whitespace so a query matches a haystack that was
 * collapsed the same way at build time.
 *
 * A non-string — `null`, `undefined`, a number, an object — yields `''`, which
 * the caller treats as "no query" rather than as an error. Search is opened by
 * a keystroke; it must never throw.
 *
 * @param {unknown} query
 * @returns {string} The normalised query, or `''`.
 */
function normalizeQuery(query) {
  if (typeof query !== 'string') return ''
  return query.trim().replace(/\s+/g, ' ').toLowerCase()
}

/**
 * Resolve the per-group cap from a caller's options.
 *
 * Only a finite, non-negative number is honoured, and it is floored to a whole
 * number of rows. Anything else — a missing options object, a non-object, a
 * `NaN`, a negative, a numeric string — means NO cap, because silently showing
 * fewer results than exist is worse than showing them all. A cap of `0` is
 * legitimate and honoured as "no rows".
 *
 * @param {unknown} options
 * @returns {number} The per-group cap, or `Infinity` for no cap.
 */
function resolveLimit(options) {
  if (!isRecord(options)) return Number.POSITIVE_INFINITY
  const { limit } = /** @type {{ limit?: unknown }} */ (options)
  if (typeof limit !== 'number' || !Number.isFinite(limit) || limit < 0) {
    return Number.POSITIVE_INFINITY
  }
  return Math.floor(limit)
}

/**
 * A result object with every group present and empty, in canonical order.
 *
 * Returning a COMPLETE shape — rather than only the groups that matched — is
 * deliberate: a consumer can iterate {@link SEARCH_GROUPS} and read
 * `groups[id].length` without an existence check, group headings appear in one
 * fixed order everywhere, and "no results" is simply every array being empty.
 *
 * @returns {Record<string, SearchRecord[]>}
 */
function emptyGrouping() {
  /** @type {Record<string, SearchRecord[]>} */
  const grouping = {}
  for (const id of SEARCH_GROUP_IDS) grouping[id] = []
  return grouping
}

/**
 * Search every indexed record and return the matches grouped by category.
 *
 * MATCHING is a case-insensitive substring test of the normalised query
 * against each record's pre-lowercased `haystack`. Both directions are
 * therefore case-insensitive, and the only per-call normalisation is the one
 * pass over the query itself.
 *
 * RANKING is substring matching plus ONE refinement, the title-prefix boost: a
 * record whose `label` STARTS WITH the query outranks one that merely contains
 * the query somewhere. It is implemented as a `startsWith` over the same
 * `haystack` — which is built label-first precisely so that test is exact —
 * and collected into two buckets rather than sorted, so within each bucket the
 * index's own order survives untouched and the output is fully deterministic.
 * There is nothing else: no usage-frequency weighting, no recency ordering, no
 * fuzzy distance and no query-history signal.
 *
 * `limit` caps results PER GROUP, not in total. The header suggestion panel
 * passes {@link SUGGESTION_LIMIT} so it shows at most three rows per category
 * and stays calm; the `/search` route passes no limit and shows every match.
 *
 * AN EMPTY, WHITESPACE-ONLY OR NON-STRING QUERY RETURNS EVERY GROUP EMPTY —
 * never the whole index. A bare `/search` is meant to render a prompt naming
 * what can be searched, which is the view's job; dumping fifty-five records
 * into it would be the opposite of that.
 *
 * Returns FRESH arrays every call and never mutates the memoised index or any
 * source module array, so a consumer may sort, slice or splice the result
 * freely.
 *
 * @param {string} query The raw query text, straight from the input.
 * @param {{ limit?: number }} [options] `limit` caps each group independently.
 * @returns {Record<string, SearchRecord[]>} Matches keyed by group id, always
 *          containing all six keys in {@link SEARCH_GROUPS} order.
 */
export function searchAll(query, options) {
  const grouped = emptyGrouping()
  const needle = normalizeQuery(query)
  if (!needle) return grouped

  const limit = resolveLimit(options)
  if (limit === 0) return grouped

  // Two buckets per group: prefix matches first, then the remaining substring
  // matches. Collected in one pass over the index, which is also the pass the
  // consumer's result count is derived from.
  /** @type {Record<string, SearchRecord[]>} */
  const prefixed = {}
  /** @type {Record<string, SearchRecord[]>} */
  const contained = {}
  for (const id of SEARCH_GROUP_IDS) {
    prefixed[id] = []
    contained[id] = []
  }

  for (const record of buildIndex()) {
    const bucket = prefixed[record.group]
    // A group outside the declared set cannot be rendered by a consumer that
    // iterates SEARCH_GROUPS, so such a record is skipped rather than creating
    // a key nothing reads.
    if (!bucket) continue
    if (!record.haystack.includes(needle)) continue
    if (record.haystack.startsWith(needle)) {
      bucket.push(record)
    } else {
      contained[record.group].push(record)
    }
  }

  for (const id of SEARCH_GROUP_IDS) {
    const ranked = [...prefixed[id], ...contained[id]]
    grouped[id] = limit === Number.POSITIVE_INFINITY ? ranked : ranked.slice(0, limit)
  }
  return grouped
}

/**
 * Total number of results across every group of a {@link searchAll} object.
 *
 * The one number both consuming views need: it distinguishes "nothing matched"
 * — which renders the no-results state — from a populated panel, and it is
 * what the catalogue-style live count reports. Kept here so the two views
 * cannot count differently, and defensive about its argument so it can be
 * handed whatever a view is holding.
 *
 * @param {Record<string, SearchRecord[]>} groups A {@link searchAll} result.
 * @returns {number} The summed result count, or `0` for anything unusable.
 */
export function countResults(groups) {
  if (!isRecord(groups)) return 0
  let total = 0
  for (const value of Object.values(groups)) {
    if (Array.isArray(value)) total += value.length
  }
  return total
}

