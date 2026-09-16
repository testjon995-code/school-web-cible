/**
 * JSON-LD structured-data builders for the CIBLE School of Language website (SEO).
 *
 * Pure, side-effect-free functions that return plain, JSON-serializable
 * schema.org objects. They are injected into the document head as
 * `<script type="application/ld+json">` payloads by
 * `src/components/seo/StructuredData.jsx`, and are also used directly by pages
 * that render course or breadcrumb structured data. The output follows the
 * search-engine structured-data types called for by the project SEO
 * requirements: Organization (as `EducationalOrganization`), LocalBusiness,
 * Course, and BreadcrumbList, plus two **gated** types — Event and FAQPage.
 *
 * Gated types: {@link eventSchema} and {@link faqPageSchema} build valid blocks
 * on demand, but the decision to emit one belongs to the CALLER, not to the
 * builder. `Event` is emitted only for a record whose `scheduleConfirmed` is
 * `true`; `FAQPage` only for a set in which EVERY question carries
 * `answerConfirmed === true`. Structured data asserts to a machine that the
 * marked-up content is accurate, and `src/data/events.js` and `src/data/faq.js`
 * both record in their own headers that their dates, timings, fees and
 * certificate details are representative and must be verified with the
 * institute before launch — so marking up provisional content is a policy
 * violation, not a stylistic choice. Every event record ships
 * `scheduleConfirmed: false` and every FAQ record `answerConfirmed: false`
 * today, so **no Event and no FAQPage block is emitted anywhere in the running
 * application**. That is the expected, verified outcome rather than a defect:
 * the builders are complete, and flipping one boolean per record is all that is
 * needed later, with no code change here. Keeping the gate in the caller is
 * also what keeps both builders pure and directly testable.
 *
 * Single source of truth: every brand, contact, and URL value is read from the
 * shared {@link module:data/siteConfig siteConfig} module — nothing here is
 * hardcoded. The only literal strings this module introduces are generic
 * schema.org vocabulary values (for example `'admissions'`, `'IN'`, and the
 * `['en', 'hi']` language list) plus the structural `@context` / `@type`
 * keywords required by the specification.
 *
 * Serialization safety: `siteConfig.social[].icon` and `course.icon` are
 * `react-icons` component *function references*, which are not
 * JSON-serializable. They are deliberately never copied into any returned
 * object — `sameAs`, for instance, maps social entries to their `href` only —
 * so that `JSON.stringify()` of any builder's output never emits an `"icon"`
 * key or a function value.
 *
 * Date semantics: {@link eventSchema} validates and normalizes its date through
 * {@link module:lib/dates.parseCivilDate}, the project's single owner of date
 * parsing. `new Date('YYYY-MM-DD')` parses as UTC midnight and shifts the
 * calendar day one earlier in any timezone west of UTC, so this module never
 * parses a date string itself — no second date path, no regex, no manual split.
 * `parseCivilDate` also rejects rollover values (`'2026-13-40'` yields `null`),
 * which is exactly the disqualification signal a required `startDate` needs.
 *
 * Every export is a plain function with no React, JSX, or hooks, which keeps
 * the module trivially compliant with the project's lint rules and safe to
 * import anywhere. All values are exported by name; there is no default export.
 *
 * @module lib/schema
 */

import { siteConfig } from '../data/siteConfig.js'
import { parseCivilDate } from './dates.js'

/**
 * The schema.org context IRI shared by every structured-data object.
 *
 * @type {string}
 */
const SCHEMA = 'https://schema.org'

/**
 * Resolve a path or URL to an absolute URL rooted at {@link siteConfig.siteUrl}.
 *
 * Behaviour:
 * - An empty / missing `path` resolves to the bare site URL (no trailing slash).
 * - A value already starting with `http` (an absolute URL) is returned as-is.
 * - A relative value is joined to the site URL, ensuring exactly one `/`
 *   between the origin and the path.
 *
 * `siteConfig.siteUrl` has no trailing slash, so joining is deterministic and
 * every result begins with the canonical origin.
 *
 * @param {string} [path] - An absolute URL, a root-relative path (`/og-image.jpg`),
 *   or a bare path segment (`courses`).
 * @returns {string} A fully-qualified absolute URL.
 */
const absoluteUrl = (path = '') => {
  if (!path) return siteConfig.siteUrl
  if (String(path).startsWith('http')) return path
  return `${siteConfig.siteUrl}${String(path).startsWith('/') ? path : `/${path}`}`
}

/**
 * Clean E.164 telephone number derived from the click-to-call deep link.
 *
 * `siteConfig.phoneHref` is `'tel:+919899315093'`; stripping the `tel:` scheme
 * yields `'+919899315093'`, the form expected by schema.org `telephone`.
 *
 * @type {string}
 */
const telephone = siteConfig.phoneHref.replace('tel:', '')

/**
 * Build the schema.org `PostalAddress` node from the structured address parts.
 *
 * Spreads {@link siteConfig.addressParts} (streetAddress, addressLocality,
 * addressRegion, postalCode, addressCountry) onto a typed object.
 *
 * @returns {{'@type': string, streetAddress: string, addressLocality: string, addressRegion: string, postalCode: string, addressCountry: string}}
 *   A schema.org PostalAddress object.
 */
const postalAddress = () => ({ '@type': 'PostalAddress', ...siteConfig.addressParts })

/**
 * True for a string carrying at least one non-whitespace character.
 *
 * Every optional field consumed by {@link eventSchema} and
 * {@link faqPageSchema} is validated through this predicate so a missing,
 * blank, or wrong-typed value causes the key to be OMITTED rather than emitted
 * as `null`, `undefined`, or an empty string. This follows the same
 * omit-rather-than-fabricate rule that already keeps `openingHoursSpecification`
 * out of {@link localBusinessSchema}.
 *
 * @param {unknown} value - The candidate value.
 * @returns {boolean} Whether the value is a non-blank string.
 */
const isFilledString = (value) => typeof value === 'string' && value.trim().length > 0

/**
 * True for a plain record-like value: a non-null object that is not an array.
 *
 * Used to reject malformed collection entries before they are mapped into
 * structured data, so one bad record cannot poison an entire block.
 *
 * @param {unknown} value - The candidate value.
 * @returns {boolean} Whether the value can be read as a data record.
 */
const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * Matches a strict 24-hour wall-clock time (`'HH:mm'`), the format declared by
 * `events[].startTime` / `events[].endTime`.
 *
 * This validates a TIME, not a date: `src/lib/dates.js` owns date parsing and
 * deliberately has no time concept, so there is no existing owner to reuse and
 * nothing here duplicates one. Hours are bounded to `00`–`23` and minutes to
 * `00`–`59` so an out-of-range value can never be assembled into an invalid
 * `startDate`.
 *
 * @type {RegExp}
 */
const TIME_24H_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/

/**
 * schema.org `eventAttendanceMode` enumeration members, keyed by the declared
 * `events[].attendanceMode` literal.
 *
 * Only these three keys resolve; anything else yields no attendance mode at
 * all, because the mode is DECLARED per record and must never be inferred from
 * `type` (a programme category) or parsed out of the free-text `location`.
 * Lookups go through `Object.hasOwn` so an inherited property name such as
 * `'toString'` can never resolve to a function value and breach the module's
 * serialization-safety contract.
 *
 * @type {Readonly<Record<string, string>>}
 */
const ATTENDANCE_MODES = Object.freeze({
  offline: 'OfflineEventAttendanceMode',
  online: 'OnlineEventAttendanceMode',
  mixed: 'MixedEventAttendanceMode',
})

/**
 * Normalize a value to a date-only ISO string (`'YYYY-MM-DD'`), or `null`.
 *
 * The value is parsed by {@link module:lib/dates.parseCivilDate} — the single
 * date-parsing owner in this project — and the result is then formatted from
 * that `Date`'s LOCAL year/month/day components. Reading the local components
 * is what preserves the civil day: `parseCivilDate` builds a date-only value
 * with `new Date(year, monthIndex, day)` (local time) and asserts the
 * components round-trip exactly, so the string this returns is the calendar day
 * the author intended in every timezone. Using `toISOString()` here would
 * reintroduce the very UTC day-shift `dates.js` exists to prevent.
 *
 * @param {string|Date|null|undefined} value - A date-only string, ISO date-time, or `Date`.
 * @returns {string|null} The civil date as `'YYYY-MM-DD'`, or `null` when unparseable.
 */
const civilIsoDate = (value) => {
  const date = parseCivilDate(value)
  if (!date) return null
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/**
 * Normalize a declared wall-clock time to `'HH:mm'`, or `null`.
 *
 * A missing, blank, wrong-typed, or out-of-range value yields `null`, which
 * callers treat as "no time was declared" — never as a default hour. No hour is
 * ever guessed.
 *
 * @param {unknown} value - A candidate `'HH:mm'` 24-hour time.
 * @returns {string|null} The trimmed `'HH:mm'` value, or `null`.
 */
const wallClockTime = (value) => {
  if (!isFilledString(value)) return null
  const time = value.trim()
  return TIME_24H_REGEX.test(time) ? time : null
}

/**
 * Resolve an event's schema.org `location`, or `null` when none can be stated
 * truthfully.
 *
 * `location` is a REQUIRED property of `Event`, and it must describe a real
 * place or a real virtual venue. Two independent nodes are possible:
 *
 * - A `Place`, when the record DECLARES `attendanceMode` as `'offline'` or
 *   `'mixed'` and carries a `location` string. The string names the CIBLE venue
 *   and is used as the place `name`, while the machine-readable address comes
 *   from {@link postalAddress} — the module's only `PostalAddress` builder — so
 *   the structured address is never re-typed and cannot drift from
 *   `siteConfig.addressParts`.
 * - A `VirtualLocation`, when the record carries a real `onlineUrl`. It is
 *   suppressed for a declared `'offline'` record, so virtual attendance is
 *   never asserted against an event the institute declared as in-person.
 *
 * A `'mixed'` record with both yields an array, physical venue first.
 *
 * When neither node is available the function returns `null` and the caller
 * emits NO Event block at all. This is the decisive rule: the free-text
 * `location` is authored for human reading, so a prose sentence describing an
 * arrangement — the webinar record's "Online via Google Meet (link shared after
 * registration)" — is never synthesized into a `Place`. That record therefore
 * stays breadcrumb-only until the institute supplies a joining URL that
 * resolves, which is the intended, documented outcome rather than a gap.
 *
 * @param {object} event - An `events[]` record.
 * @returns {object|object[]|null} A `Place`, a `VirtualLocation`, both, or `null`.
 */
const eventLocation = (event) => {
  const mode = isFilledString(event.attendanceMode) ? event.attendanceMode.trim() : null
  const nodes = []

  if ((mode === 'offline' || mode === 'mixed') && isFilledString(event.location)) {
    nodes.push({ '@type': 'Place', name: event.location, address: postalAddress() })
  }
  if (isFilledString(event.onlineUrl) && mode !== 'offline') {
    nodes.push({ '@type': 'VirtualLocation', url: event.onlineUrl })
  }

  if (nodes.length === 0) return null
  return nodes.length === 1 ? nodes[0] : nodes
}

/**
 * Build the site-wide Organization structured-data object.
 *
 * Emits an `EducationalOrganization` (a schema.org subtype of `Organization`)
 * describing the institute: name, branding logo/image, description, contact
 * channels, postal address, an admissions `ContactPoint`, and — only when the
 * profiles have been verified as owned by the institute — the social profile
 * URLs via `sameAs`.
 *
 * Structured-data truthfulness (review M15):
 * - `logo` is the institute's dedicated brand logo (`siteConfig.logo`, served
 *   from `/logo.svg`), NOT the Open Graph marketing image. The two are distinct
 *   assets: `logo` must be a recognizable brand mark, while `image` remains the
 *   Open Graph social-share graphic.
 * - `sameAs` is emitted **only** when `siteConfig.socialVerified` is `true`.
 *   Until the client confirms ownership of the social accounts, no unverified
 *   identity links are published as machine-readable structured data. Only
 *   social `href` values are ever mapped in — the non-serializable `icon`
 *   references are excluded.
 *
 * @returns {object} A schema.org EducationalOrganization JSON-LD object.
 */
export function organizationSchema() {
  return {
    '@context': SCHEMA,
    '@type': 'EducationalOrganization',
    name: siteConfig.name,
    alternateName: siteConfig.shortName,
    url: siteConfig.siteUrl,
    logo: absoluteUrl(siteConfig.logo),
    image: absoluteUrl(siteConfig.ogImage),
    description: siteConfig.description,
    email: siteConfig.email,
    telephone,
    address: postalAddress(),
    contactPoint: {
      '@type': 'ContactPoint',
      telephone,
      contactType: 'admissions',
      email: siteConfig.email,
      areaServed: 'IN',
      availableLanguage: ['en', 'hi'],
    },
    // Only publish verified social identities; omit the key entirely otherwise
    // so no unverified profile is asserted as the organization's own.
    ...(siteConfig.socialVerified ? { sameAs: siteConfig.social.map((s) => s.href) } : {}),
  }
}

/**
 * Build the LocalBusiness structured-data object.
 *
 * Emits a `LocalBusiness` node with the institute's name, canonical URL, Open
 * Graph image, contact details, postal address, and a `hasMap` link to the
 * pinned Google Maps location.
 *
 * `openingHoursSpecification` is intentionally omitted: `siteConfig.hours`
 * holds human-readable display strings (for example `'Monday – Saturday'` /
 * `'8:00 AM – 7:00 PM'`), not machine-parseable times, and fabricating
 * structured times would risk emitting invalid data. `priceRange` is likewise
 * omitted because no source value exists.
 *
 * @returns {object} A schema.org LocalBusiness JSON-LD object.
 */
export function localBusinessSchema() {
  return {
    '@context': SCHEMA,
    '@type': 'LocalBusiness',
    name: siteConfig.name,
    url: siteConfig.siteUrl,
    image: absoluteUrl(siteConfig.ogImage),
    telephone,
    email: siteConfig.email,
    address: postalAddress(),
    hasMap: siteConfig.mapLink,
  }
}

/**
 * Build a Course structured-data object for a single course.
 *
 * The `course` argument comes from `src/data/courses.js` and has the shape
 * `{ slug, title, category, summary, duration, highlights: string[], icon }`.
 * The builder maps `course.title` to `name` and `course.summary` to
 * `description`, and attaches the institute as the `provider`
 * (`EducationalOrganization`). The non-serializable `course.icon` reference is
 * never included.
 *
 * A falsy `course` yields `null` so callers can conditionally render the
 * structured data without additional guards.
 *
 * @param {{title: string, summary: string, [key: string]: unknown}} [course]
 *   A course record; `title` and `summary` are consumed.
 * @returns {object|null} A schema.org Course JSON-LD object, or `null` when no
 *   course is supplied.
 */
export function courseSchema(course) {
  if (!course) return null
  return {
    '@context': SCHEMA,
    '@type': 'Course',
    name: course.title,
    description: course.summary,
    provider: {
      '@type': 'EducationalOrganization',
      name: siteConfig.name,
      sameAs: siteConfig.siteUrl,
    },
  }
}

/**
 * Build an Event structured-data object for a single event.
 *
 * The `event` argument comes from `src/data/events.js`. Only fields that are
 * present and well-formed are emitted; nothing is inferred, defaulted, or
 * guessed.
 *
 * EMISSION IS GATED BY THE CALLER, NOT BY THIS BUILDER. This function never
 * reads `event.scheduleConfirmed`: it builds a valid block whenever the record
 * supports one, and the caller (`src/pages/EventDetail.jsx`) decides whether to
 * emit it, passing the block only when THAT record's
 * `scheduleConfirmed === true`. An absent flag counts as NOT confirmed. The
 * reason is policy rather than style — `src/data/events.js` records that the
 * institute must confirm and supply the final event media, exact dates and
 * times before launch, and structured data asserts to a machine that the
 * marked-up content is accurate, so marking up provisional dates would be a
 * violation. Every record ships `scheduleConfirmed: false` today, so no Event
 * block is emitted anywhere in the running application; that absence is the
 * verified expected outcome, and flipping one boolean per record is all that is
 * needed to publish, with no change here. Keeping the gate outside the builder
 * is also what keeps this function pure and directly testable.
 *
 * Eligibility — `name`, `startDate` and `location` are all REQUIRED for an
 * event rich result, and a record missing any one of them is disqualified
 * entirely. This builder therefore returns `null` rather than a partial block
 * when:
 * - `event` is falsy or not an object;
 * - `event.title` is missing or blank (no `name`);
 * - `event.date` cannot be parsed by {@link module:lib/dates.parseCivilDate},
 *   which includes rollover values such as `'2026-13-40'` (no `startDate`);
 * - no truthful `location` can be resolved — see {@link eventLocation}.
 *
 * Dates — `startDate` carries the wall-clock time only when `event.startTime`
 * declares a valid `'HH:mm'` value; otherwise it is date-only and NO hour is
 * invented. `endDate` is emitted only when `event.endTime` declares one, and
 * the key is omitted entirely otherwise. No UTC offset is appended, because the
 * data carries no timezone and fabricating one would assert an instant the
 * institute never stated; a local date-time is the honest ISO 8601 form here.
 *
 * Deliberately never emitted: `offers`, any price or fee field,
 * `aggregateRating`, `review`, `performer`, `sponsor`, accreditation, and any
 * attendance or capacity figure. The repository holds no basis for a single one
 * of them, so each is a claim this site will not make.
 *
 * Serialization safety: the returned object is composed only of strings and
 * nested plain objects/arrays. `eventAttendanceMode` resolves through an
 * own-property lookup on a frozen map, so no function value can ever leak in.
 *
 * @param {{title: string, date: string, location?: string, slug?: string,
 *   description?: string, startTime?: string, endTime?: string,
 *   attendanceMode?: ('offline'|'online'|'mixed'), onlineUrl?: string,
 *   image?: ?string, [key: string]: unknown}} [event] - An `events[]` record.
 * @returns {object|null} A schema.org Event JSON-LD object, or `null` when the
 *   record cannot support a complete, truthful block.
 */
export function eventSchema(event) {
  if (!isRecord(event)) return null
  // name — required.
  if (!isFilledString(event.title)) return null
  // startDate — required; the single date-parsing owner is the only validator.
  const day = civilIsoDate(event.date)
  if (!day) return null
  // location — required, and truthful or nothing.
  const location = eventLocation(event)
  if (!location) return null

  const startTime = wallClockTime(event.startTime)
  const endTime = wallClockTime(event.endTime)
  const mode = isFilledString(event.attendanceMode) ? event.attendanceMode.trim() : ''
  const attendanceMode = Object.hasOwn(ATTENDANCE_MODES, mode) ? ATTENDANCE_MODES[mode] : null

  return {
    '@context': SCHEMA,
    '@type': 'Event',
    name: event.title,
    startDate: startTime ? `${day}T${startTime}` : day,
    // Omit the key entirely when no end time was declared, rather than
    // repeating the start or guessing a duration.
    ...(endTime ? { endDate: `${day}T${endTime}` } : {}),
    location,
    // Only a DECLARED mode is published, as its full schema.org enumeration IRI.
    ...(attendanceMode ? { eventAttendanceMode: `${SCHEMA}/${attendanceMode}` } : {}),
    ...(isFilledString(event.description) ? { description: event.description } : {}),
    // Structured data belongs on the event's own detail page, so the canonical
    // URL is that route rather than the listing.
    ...(isFilledString(event.slug) ? { url: absoluteUrl(`/events/${event.slug}`) } : {}),
    // Every record ships `image: null` today, so this key is currently always
    // omitted; a client-supplied path resolves to an absolute URL.
    ...(isFilledString(event.image) ? { image: absoluteUrl(event.image) } : {}),
    organizer: {
      '@type': 'EducationalOrganization',
      name: siteConfig.name,
      url: siteConfig.siteUrl,
    },
  }
}

/**
 * Build a BreadcrumbList structured-data object from an ordered trail.
 *
 * Each input item is `{ name, path }`; positions are 1-based and every `item`
 * is resolved to an absolute URL rooted at {@link siteConfig.siteUrl} via
 * {@link absoluteUrl}. The parameter defaults to an empty array so a missing
 * argument still yields a valid (empty) `itemListElement` list.
 *
 * @param {Array<{name: string, path: string}>} [items] - The ordered breadcrumb trail.
 * @returns {object} A schema.org BreadcrumbList JSON-LD object.
 */
export function breadcrumbSchema(items = []) {
  return {
    '@context': SCHEMA,
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  }
}

/**
 * Build an FAQPage structured-data object from a set of question/answer records.
 *
 * Each input record comes from `src/data/faq.js` and is read for its `question`
 * and `answer` text only. Every question becomes a `Question` node with exactly
 * ONE `acceptedAnswer` — never an array of answers and never a
 * `suggestedAnswer` — which is what the FAQPage specification requires.
 *
 * EMISSION IS GATED BY THE CALLER, NOT BY THIS BUILDER. This function never
 * reads `answerConfirmed`: it shapes whatever set it is handed, and the caller
 * (`src/pages/Faq.jsx`, or a course detail route for that course's questions)
 * decides whether to emit the result. That gate is ALL-OR-NOTHING per emitted
 * set — the caller emits only when EVERY question in the set carries
 * `answerConfirmed === true`, because a partially marked-up FAQ page
 * misrepresents which answers are authoritative — and an absent flag counts as
 * NOT confirmed. The reason is policy rather than style: `src/data/faq.js`
 * records that its class timings, batch options, fee amounts, payment options,
 * trial availability and certificate details are representative and must be
 * verified and finalized with the institute before launch, and structured data
 * asserts to a machine that the marked-up content is accurate. Every record
 * ships `answerConfirmed: false` today, so no FAQPage block is emitted anywhere
 * in the running application; that absence is the verified expected outcome,
 * and flipping the flags is all that is needed to publish, with no change here.
 *
 * Robustness: a non-array argument is coerced to an empty list rather than
 * throwing, and any entry that is not a record or lacks non-blank `question`
 * and `answer` text is skipped, so one malformed record cannot poison the
 * block. `null` is returned when no valid question survives — an FAQPage with
 * an empty `mainEntity` asserts nothing — which lets callers render
 * conditionally with no additional guards, exactly as {@link courseSchema} and
 * {@link eventSchema} do.
 *
 * The FAQPage specification also requires that the questions and answers be
 * visible on the emitting page and authored by the site rather than
 * user-submitted; both hold for this content, and the caller is responsible for
 * not emitting this block on a page that presents the same content as a
 * search-results listing.
 *
 * No `author`, `dateCreated`, `upvoteCount` or any other engagement metric is
 * emitted: the repository holds no basis for such a claim.
 *
 * @param {Array<{question: string, answer: string, [key: string]: unknown}>} [items]
 *   The question/answer records to mark up.
 * @returns {object|null} A schema.org FAQPage JSON-LD object, or `null` when no
 *   valid question is supplied.
 */
export function faqPageSchema(items = []) {
  const list = Array.isArray(items) ? items : []
  const mainEntity = list
    .filter(
      (item) => isRecord(item) && isFilledString(item.question) && isFilledString(item.answer),
    )
    .map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    }))

  if (mainEntity.length === 0) return null

  return {
    '@context': SCHEMA,
    '@type': 'FAQPage',
    mainEntity,
  }
}
