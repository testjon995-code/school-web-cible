/**
 * Calendar export helpers for the CIBLE School of Language website — the
 * "Add to Calendar" seam.
 *
 * This module does two genuine things and claims nothing beyond them:
 *
 * 1. {@link buildIcs} composes a real **RFC 5545** `VCALENDAR` payload in the
 *    browser, which {@link downloadIcs} hands to the visitor as a `.ics` file.
 * 2. {@link googleCalendarUrl} composes a real provider *template* URL that
 *    opens the provider's own event-creation form with the details pre-filled.
 *
 * Nothing here is a simulated integration. There is no backend, no API call, no
 * key, no token, no OAuth and no account access anywhere in this file — a
 * downloaded file and a pre-filled provider form are behaviours the browser
 * performs by itself. Accordingly, the only claims any string produced here may
 * support are exactly these two: **a calendar file downloaded**, or **a provider
 * opened with the details pre-filled**. Nothing was synced, nothing was
 * connected to an account, and nothing "was added" to anyone's calendar — this
 * module cannot know whether the visitor kept the entry, so it never says so.
 *
 * What is deliberately NOT emitted, because the repository holds no basis for
 * it: an attendee list, an RSVP / `PARTSTAT` status, a `SEQUENCE` bump implying
 * a revision history, a recurrence rule, a `STATUS:CONFIRMED` assertion (every
 * event record ships `scheduleConfirmed: false` while the institute confirms
 * its exact dates and times), an iTIP `METHOD`, and any price, fee or offer.
 *
 * Time handling — the honesty rule. A record carries a machine-readable
 * `startTime` / `endTime` only where the institute has supplied one. Where
 * `startTime` is absent, an **all-day** `VEVENT` is emitted rather than a
 * guessed hour, and the free-text `time` display string (for example
 * `'10:00 AM – 1:00 PM'`) is **never parsed** to recover one: it is authored for
 * human reading, and `startTime` / `endTime` exist precisely so that nothing has
 * to derive a machine value from display prose.
 *
 * Timezone handling. Timed events are emitted in RFC 5545 §3.3.5 form #1,
 * "DATE-TIME with local time" (`DTSTART:20260816T100000` — no `Z`, no `TZID`),
 * because neither {@link module:data/siteConfig siteConfig} nor the event
 * records declare a timezone. A `TZID` parameter would require an accompanying
 * `VTIMEZONE` component, and authoring one would mean inventing offset and
 * daylight-rule data the institute never supplied; converting to UTC would mean
 * inventing the same offset. Form #1 asserts only what is actually known — the
 * wall-clock time the institute published — so the emitted calendar day is
 * identical regardless of the viewer's timezone. `DTSTAMP` remains in UTC, which
 * RFC 5545 §3.8.7.2 requires of that property specifically.
 *
 * Dates are always resolved through {@link module:lib/dates.parseCivilDate}, so
 * the UTC-midnight day-shift that `new Date('YYYY-MM-DD')` introduces west of
 * UTC cannot reach a `DTSTART`. An unparseable date means no calendar export is
 * possible at all: {@link buildIcs} returns an empty string and
 * {@link downloadIcs} reports the failure rather than emitting a broken
 * `VEVENT`.
 *
 * Every function is pure except {@link downloadIcs}, which is the single
 * platform touchpoint in this module.
 *
 * Lifecycle gating is deliberately NOT implemented here. Whether a past or
 * undated event should offer a calendar action at all is a presentation
 * decision owned by the consuming component reading `EVENT_LIFECYCLE` from
 * `src/lib/states.js`; this module exports the capability and imposes no policy
 * on when it is offered.
 *
 * All values are exported by name; there is no default export.
 *
 * @module lib/calendar
 */

import { parseCivilDate } from './dates.js'
import { siteConfig } from '../data/siteConfig.js'

/**
 * The line terminator RFC 5545 §3.1 mandates for every content line: CRLF, not
 * a bare LF. Some calendar clients reject an LF-only payload outright.
 *
 * @type {string}
 */
const ICS_LINE_BREAK = '\r\n'

/**
 * The maximum length of a content line in **octets**, excluding the line break
 * (RFC 5545 §3.1). Longer lines are folded by {@link foldIcsLine}.
 *
 * This is a byte limit, not a character limit, which matters because the event
 * copy is UTF-8 and contains en dashes (`–`, three octets each).
 *
 * @type {number}
 */
const MAX_LINE_OCTETS = 75

/**
 * The published event-creation template endpoint of the Google Calendar web UI.
 *
 * This is the one URL literal the module introduces, and it is unavoidable: a
 * provider template URL is by definition the provider's own address. It is not
 * a CIBLE brand, contact or site value — every one of those is read from
 * {@link module:data/siteConfig siteConfig} — and it is not an API endpoint. No
 * request is ever made to it from this code; the string is handed to the
 * visitor's browser as a link they choose to follow, which then renders the
 * provider's ordinary "create event" form with the fields pre-filled.
 *
 * @type {string}
 */
const GOOGLE_CALENDAR_TEMPLATE_URL = 'https://calendar.google.com/calendar/render'

/**
 * The route prefix of an event's own detail page, matching the `/events/:slug`
 * route. Used to build the absolute `URL` property of the `VEVENT` and the link
 * embedded in the provider form's details field, so a visitor who opens the
 * calendar entry months later can still reach the page it came from.
 *
 * @type {string}
 */
const EVENT_ROUTE_BASE = '/events'

/**
 * Resolution context for every export in this module: who is publishing the
 * calendar entry, and which site it links back to.
 *
 * Every field is optional. A caller that supplies nothing gets values derived
 * from {@link module:data/siteConfig siteConfig}, which the config module's own
 * header requires ("Consumers MUST read brand/contact values from here rather
 * than hardcoding them"); a caller that supplies some fields gets those merged
 * over the defaults. Both halves are deliberate: assembling an `ORGANIZER`
 * block is not something every call site should have to do, so defaulting keeps
 * the consuming component a one-liner — while honouring an explicitly supplied
 * context keeps these functions testable, because a test can pin the organiser
 * and the clock and assert on an exact payload.
 *
 * Note that `siteConfig.siteUrl` is a documented placeholder domain the client
 * must replace at launch. Reading it through this context — rather than
 * embedding it — is what makes that replacement a single-file change.
 *
 * @typedef {Object} CalendarContext
 * @property {string} [organiserName]  Display name of the publishing organisation,
 *   emitted as the `ORGANIZER` `CN` parameter. Defaults to `siteConfig.name`.
 * @property {string} [organiserEmail] Contact address for the organiser, emitted as
 *   the `ORGANIZER` `mailto:` value. Accepted either bare or already carrying the
 *   `mailto:` scheme, which is stripped before re-composition. Defaults to
 *   `siteConfig.email`.
 * @property {string} [siteUrl]        Absolute origin used to build the event's detail
 *   URL and to domain-qualify the `UID`. Defaults to `siteConfig.siteUrl`.
 * @property {string} [prodId]         The `PRODID` identifying the software that produced
 *   the payload. Defaults to a value composed from the site's own name.
 * @property {Date}   [now]            The instant recorded as `DTSTAMP`. Defaults to the
 *   current time. Exposed only so a test can assert a byte-exact payload; production
 *   call sites should omit it.
 */

/**
 * The outcome of a {@link downloadIcs} attempt.
 *
 * `reason` is present only on failure and is drawn from a closed set:
 * - `'invalid-event'` — nothing exportable: the event is missing, or its `date`
 *   is absent or unparseable, so no valid `DTSTART` can be written. The DOM is
 *   never touched in this case.
 * - `'unavailable'` — the platform cannot perform a download: this is not a
 *   browser, or `Blob` / `URL.createObjectURL` is absent or disabled.
 * - `'error'` — the download sequence threw. Any throw is converted into this
 *   result; no exception ever escapes {@link downloadIcs}.
 *
 * @typedef {{ok: true} | {ok: false, reason: 'invalid-event'|'unavailable'|'error'}} DownloadResult
 */

/**
 * Join a path onto an absolute origin with exactly one separating slash, and
 * strip any trailing slash from the origin first so the result is stable
 * whether or not the configured value carries one.
 *
 * @param {string} origin - An absolute origin, for example `'https://example.org'`.
 * @param {string} [path] - A root-relative path, for example `'/events/my-event'`.
 * @returns {string} The joined absolute URL, or `''` when `origin` is unusable.
 */
const joinUrl = (origin, path = '') => {
  const base = typeof origin === 'string' ? origin.trim().replace(/\/+$/, '') : ''
  if (!base) return ''
  if (!path) return base
  const suffix = String(path)
  return `${base}${suffix.startsWith('/') ? suffix : `/${suffix}`}`
}

/**
 * Extract the host of an absolute URL, for domain-qualifying a `UID`.
 *
 * Falls back to a conservative sanitisation of the raw value when the input is
 * not a parseable URL, so a misconfigured `siteUrl` degrades the `UID` rather
 * than throwing during an export.
 *
 * @param {string} url - An absolute URL.
 * @returns {string} The host, or `''` when none can be determined.
 */
const hostOf = (url) => {
  const value = typeof url === 'string' ? url.trim() : ''
  if (!value) return ''
  try {
    const host = new URL(value).host
    if (host) return host
  } catch {
    // Not a parseable absolute URL — fall through to the textual fallback.
  }
  return value
    .replace(/^[a-z][a-z0-9+.-]*:\/\//i, '')
    .replace(/[/?#].*$/, '')
    .replace(/[^A-Za-z0-9.:-]/g, '')
}

/**
 * Normalise an email address for use as a `mailto:` calendar address.
 *
 * Strips an already-present `mailto:` scheme and reduces the value to an
 * allowlist of characters that are safe inside a calendar address, then returns
 * `''` unless what remains still looks like an address — so a malformed value
 * causes the `ORGANIZER` property to be omitted rather than producing a broken
 * one. An allowlist is used rather than a denylist so that no control
 * character, quote or property-parameter delimiter can survive by omission.
 *
 * @param {string} value - A bare address or a `mailto:` URI.
 * @returns {string} The bare address, or `''` when it is unusable.
 */
const normaliseEmail = (value) => {
  if (typeof value !== 'string') return ''
  const bare = value
    .trim()
    .replace(/^mailto:/i, '')
    .replace(/[^A-Za-z0-9!#$%&'*+/=?^_`{|}~.@-]/g, '')
  return /^[^@]+@[^@]+\.[^@]+$/.test(bare) ? bare : ''
}

/**
 * Merge a caller-supplied {@link CalendarContext} over the defaults derived from
 * {@link module:data/siteConfig siteConfig}.
 *
 * Partial contexts are supported field by field: an empty or non-string value
 * falls back to the configured default, so a caller can override the organiser
 * without also having to restate the site URL. No brand, contact or URL literal
 * appears here — every default reads through the config module.
 *
 * @param {CalendarContext} [context] - Zero or more overrides.
 * @returns {{organiserName: string, organiserEmail: string, siteUrl: string, prodId: string, now: Date}}
 *   A fully populated context, safe to read without further guarding.
 */
const resolveContext = (context) => {
  const overrides = context && typeof context === 'object' ? context : {}
  const pick = (value, fallback) => {
    const candidate = typeof value === 'string' ? value.trim() : ''
    return candidate || fallback
  }

  const organiserName = pick(overrides.organiserName, siteConfig.name)
  const siteUrl = pick(overrides.siteUrl, siteConfig.siteUrl)
  const organiserEmail =
    normaliseEmail(overrides.organiserEmail) || normaliseEmail(siteConfig.email) || normaliseEmail(siteConfig.emailHref)
  const now =
    overrides.now instanceof Date && !Number.isNaN(overrides.now.getTime()) ? overrides.now : new Date()

  return {
    organiserName,
    organiserEmail,
    siteUrl,
    // `-//Organisation//Product//Language` is the FPI shape RFC 5545 §3.7.3
    // expects. The organisation and product halves are composed from the site's
    // own name rather than naming a third-party vendor that had no part in it.
    prodId: pick(overrides.prodId, `-//${siteConfig.name}//${siteConfig.shortName} Website//EN`),
    now,
  }
}

/* ------------------------------------------------------------------------- *
 * Text encoding
 *
 * RFC 5545 has three distinct escaping domains, and conflating them is the
 * usual source of calendar files that import with visible stray backslashes:
 *
 * - TEXT property values (SUMMARY, DESCRIPTION, LOCATION, UID, PRODID) escape
 *   `\`, `;`, `,` and newlines — {@link escapeIcsText}.
 * - Property PARAMETER values (the `CN` of ORGANIZER) are not TEXT. They use
 *   RFC 6868 caret escaping and are double-quoted when they contain a
 *   delimiter — {@link escapeParamValue}.
 * - URI values (URL, and ORGANIZER's CAL-ADDRESS) are not TEXT either, so
 *   TEXT-escaping them would corrupt the address — {@link sanitiseUriValue}.
 * ------------------------------------------------------------------------- */

/**
 * Remove characters that may not appear in a content line.
 *
 * C0 and C1 control characters are dropped; TAB survives because RFC 5545
 * counts it as legal white space. Line breaks are kept only when the caller
 * intends to convert them into an escape sequence, and dropped otherwise.
 *
 * Implemented as a code-point walk rather than a regular expression so that no
 * literal control character appears in this source file and so surrogate pairs
 * are never split.
 *
 * @param {string} value - The raw value.
 * @param {{keepLineBreaks?: boolean}} [options] - Whether CR and LF survive.
 * @returns {string} The value with disallowed characters removed.
 */
const stripControlCharacters = (value, options = {}) => {
  const keepLineBreaks = options.keepLineBreaks === true
  let output = ''
  for (const character of value) {
    const code = character.codePointAt(0)
    if (code === 0x0a || code === 0x0d) {
      if (keepLineBreaks) output += character
      continue
    }
    if (code === 0x09) {
      output += character
      continue
    }
    if (code < 0x20 || code === 0x7f || (code >= 0x80 && code <= 0x9f)) continue
    output += character
  }
  return output
}

/**
 * Escape a value for use as an RFC 5545 §3.3.11 TEXT property value.
 *
 * The order of substitutions is load-bearing: the backslash **must** be escaped
 * first, because every later rule introduces backslashes of its own and running
 * the backslash rule last would double-escape all of them. Newlines become the
 * literal two-character sequence `\n`, which is how a multi-line description
 * survives a format whose own line breaks are structural.
 *
 * A colon is deliberately not escaped — RFC 5545 dropped that requirement from
 * RFC 2445, and escaping it makes a stray backslash visible after import.
 *
 * @param {unknown} value - Any value; non-strings are coerced, null/undefined yield `''`.
 * @returns {string} The escaped value, safe to place after a property name.
 */
const escapeIcsText = (value) => {
  if (value === null || value === undefined) return ''
  return stripControlCharacters(String(value), { keepLineBreaks: true })
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n')
}

/**
 * Escape a value for use as a property **parameter** value, per RFC 6868.
 *
 * A parameter value is not a TEXT value: the TEXT rules would emit a literal
 * backslash that calendar clients then display. The correct treatment is caret
 * escaping (`^^` for a caret, `^'` for a double quote, `^n` for a newline) plus
 * double-quoting whenever the value contains `;`, `:` or `,`, which a quoted
 * parameter value is permitted to carry. Quoting preserves the organiser's name
 * exactly instead of deleting punctuation from it.
 *
 * As with {@link escapeIcsText}, the caret rule runs first because the rules
 * after it introduce carets.
 *
 * @param {unknown} value - Any value; null/undefined yield `''`.
 * @returns {string} The escaped parameter value, quoted when required.
 */
const escapeParamValue = (value) => {
  if (value === null || value === undefined) return ''
  const escaped = stripControlCharacters(String(value), { keepLineBreaks: true })
    .replace(/\^/g, '^^')
    .replace(/"/g, "^'")
    .replace(/\r\n|\r|\n/g, '^n')
  if (!escaped) return ''
  return /[;:,]/.test(escaped) ? `"${escaped}"` : escaped
}

/**
 * Sanitise a value for use as a URI property value (URL, CAL-ADDRESS).
 *
 * A URI cannot contain raw white space or control characters, and must not be
 * TEXT-escaped. Anything this module builds is already composed from a
 * configured origin and a URL-safe slug, so sanitising is a guard against a
 * misconfigured value rather than a transformation of a valid one.
 *
 * @param {unknown} value - The candidate URI.
 * @returns {string} The sanitised URI, or `''` when nothing usable remains.
 */
const sanitiseUriValue = (value) => {
  if (typeof value !== 'string') return ''
  return stripControlCharacters(value).replace(/\s+/g, '')
}

/**
 * The number of octets a single code point occupies when encoded as UTF-8.
 *
 * Computed arithmetically rather than through `TextEncoder` so that folding
 * stays a pure, allocation-free calculation available in any environment.
 *
 * @param {number} codePoint - A Unicode code point.
 * @returns {number} 1, 2, 3 or 4.
 */
const codePointOctets = (codePoint) => {
  if (codePoint <= 0x7f) return 1
  if (codePoint <= 0x7ff) return 2
  if (codePoint <= 0xffff) return 3
  return 4
}

/**
 * The UTF-8 length of a string in octets.
 *
 * @param {string} value - The string to measure.
 * @returns {number} The number of octets the string occupies as UTF-8.
 */
const utf8Octets = (value) => {
  let total = 0
  for (const character of value) total += codePointOctets(character.codePointAt(0))
  return total
}

/**
 * Count the backslashes at the end of a code-point array.
 *
 * Used by {@link foldIcsLine} to decide whether a candidate break point would
 * separate a two-character escape sequence from its opener.
 *
 * @param {string[]} characters - Code points, in order.
 * @returns {number} How many trailing entries are a backslash.
 */
const trailingBackslashes = (characters) => {
  let count = 0
  for (let index = characters.length - 1; index >= 0 && characters[index] === '\\'; index -= 1) count += 1
  return count
}

/**
 * Fold a content line to the RFC 5545 §3.1 line-length limit.
 *
 * A line longer than 75 **octets** is split, and each continuation line begins
 * with exactly one space, which an unfolding parser removes. Three details make
 * this correct rather than approximate:
 *
 * - The budget is measured in octets, not characters. The event copy contains en
 *   dashes (three octets each), so a character-based fold would emit lines that
 *   exceed the limit and, worse, could split a multi-byte sequence into two
 *   invalid halves. Iterating code points and accumulating their encoded length
 *   makes both impossible.
 * - A continuation line spends one of its 75 octets on the mandatory leading
 *   space, so only 74 are available for its content.
 * - A break is never taken immediately after an unpaired backslash. Unfolding
 *   precedes unescaping, so splitting an escape sequence is legal in principle,
 *   but keeping each `\\`, `\;`, `\,` or `\n` pair intact costs nothing and
 *   avoids depending on that ordering in every client.
 *
 * @param {string} line - One unfolded content line.
 * @returns {string} The line, folded with CRLF + space where required.
 */
const foldIcsLine = (line) => {
  const text = String(line)
  if (utf8Octets(text) <= MAX_LINE_OCTETS) return text

  const segments = []
  let current = []
  let octets = 0
  let budget = MAX_LINE_OCTETS

  for (const character of text) {
    const size = codePointOctets(character.codePointAt(0))
    if (current.length > 0 && octets + size > budget) {
      if (current.length > 1 && trailingBackslashes(current) % 2 === 1) {
        const carried = current.pop()
        segments.push(current.join(''))
        current = [carried]
        octets = codePointOctets(carried.codePointAt(0))
      } else {
        segments.push(current.join(''))
        current = []
        octets = 0
      }
      // Every line after the first pays one octet for its leading space.
      budget = MAX_LINE_OCTETS - 1
    }
    current.push(character)
    octets += size
  }
  if (current.length > 0) segments.push(current.join(''))

  return segments.map((segment, index) => (index === 0 ? segment : ` ${segment}`)).join(ICS_LINE_BREAK)
}

/* ------------------------------------------------------------------------- *
 * Date and time values
 * ------------------------------------------------------------------------- */

/**
 * Zero-pad a number to two digits.
 *
 * @param {number} value - A non-negative integer.
 * @returns {string} The value as at least two digits.
 */
const pad2 = (value) => String(value).padStart(2, '0')

/**
 * Format a `Date` as an RFC 5545 DATE value (`YYYYMMDD`).
 *
 * Reads the **local** calendar components, which is what
 * {@link module:lib/dates.parseCivilDate} produces: the day the author wrote,
 * not a UTC reinterpretation of it. Using `getUTC*` here would reintroduce
 * exactly the day-shift that helper exists to prevent.
 *
 * @param {Date} date - A date produced by `parseCivilDate`.
 * @returns {string} The date as `YYYYMMDD`.
 */
const formatIcsDate = (date) =>
  `${String(date.getFullYear()).padStart(4, '0')}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}`

/**
 * Format a `Date` as an RFC 5545 §3.3.5 form #1 DATE-TIME value — local time
 * with no `Z` suffix and no `TZID` parameter (`YYYYMMDDTHHMMSS`).
 *
 * See the module header for why floating local time is the only form this data
 * can honestly support. Seconds are always `00`, because the machine time
 * fields carry hours and minutes only and inventing a seconds component would
 * be as unfounded as inventing an hour.
 *
 * @param {Date} date - A local date-time.
 * @returns {string} The value as `YYYYMMDDTHHMMSS`.
 */
const formatIcsDateTime = (date) =>
  `${formatIcsDate(date)}T${pad2(date.getHours())}${pad2(date.getMinutes())}00`

/**
 * Format an instant as a UTC DATE-TIME value (`YYYYMMDDTHHMMSSZ`).
 *
 * Used only for `DTSTAMP`, which RFC 5545 §3.8.7.2 requires to be in UTC. This
 * is an instant, not a calendar day, so no day-shift concern applies.
 *
 * @param {Date} instant - The moment the payload was produced.
 * @returns {string} The instant as `YYYYMMDDTHHMMSSZ`.
 */
const formatIcsUtcTimestamp = (instant) =>
  `${String(instant.getUTCFullYear()).padStart(4, '0')}${pad2(instant.getUTCMonth() + 1)}${pad2(
    instant.getUTCDate(),
  )}T${pad2(instant.getUTCHours())}${pad2(instant.getUTCMinutes())}${pad2(instant.getUTCSeconds())}Z`

/**
 * The civil day after the given date, in local time.
 *
 * `new Date(year, monthIndex, day + 1)` is defined to normalise an overflowing
 * day, so month and year boundaries are handled by the language rather than by
 * arithmetic here. Adding 24 hours to a timestamp would not be equivalent
 * across a daylight-saving transition.
 *
 * @param {Date} date - Any local date.
 * @returns {Date} Local midnight on the following day.
 */
const nextCivilDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)

/**
 * Parse a machine-readable 24-hour time of day.
 *
 * Accepts `'HH:mm'` as the event record's contract specifies, and tolerates a
 * missing leading zero (`'9:00'`) so a hand-edited record degrades to the
 * correct hour rather than silently falling back to an all-day entry. Anything
 * that is not a real 24-hour time — including the free-text display string
 * `'10:00 AM – 1:00 PM'` — is rejected, because no hour may ever be guessed.
 *
 * @param {unknown} value - The candidate `'HH:mm'` string.
 * @returns {{hours: number, minutes: number}|null} The parsed time, or `null`.
 */
const parseTimeOfDay = (value) => {
  if (typeof value !== 'string') return null
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null
  return { hours, minutes }
}

/**
 * Combine a civil date with a time of day, in local time.
 *
 * @param {Date} date - The civil date.
 * @param {{hours: number, minutes: number}} time - The time of day.
 * @returns {Date} The combined local date-time.
 */
const atTime = (date, time) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), time.hours, time.minutes, 0, 0)

/**
 * Resolve an event's schedule into the values a calendar entry needs.
 *
 * Returns `null` — meaning no export is possible — when the event is not a
 * record or its `date` cannot be parsed as a civil date. Otherwise:
 *
 * - No usable `startTime` yields an **all-day** entry, whose end is the
 *   following civil day because an all-day `DTEND` is exclusive.
 * - A usable `startTime` yields a **timed** entry. `DTEND` is carried only when
 *   `endTime` is itself usable *and* lands strictly after the start: RFC 5545
 *   requires `DTEND` to be later than `DTSTART`, so a malformed pair is dropped
 *   rather than emitted as an invalid range, and an absent one is never
 *   replaced by a guessed duration.
 *
 * @param {import('../data/events.js').CibleEvent|unknown} event - The event record.
 * @returns {{allDay: boolean, start: Date, end: Date|null}|null} The resolved schedule.
 */
const resolveSchedule = (event) => {
  if (!event || typeof event !== 'object') return null
  const day = parseCivilDate(event.date)
  if (!day) return null

  const startTime = parseTimeOfDay(event.startTime)
  if (!startTime) {
    return { allDay: true, start: day, end: nextCivilDay(day) }
  }

  const start = atTime(day, startTime)
  const endTime = parseTimeOfDay(event.endTime)
  const end = endTime ? atTime(day, endTime) : null
  return { allDay: false, start, end: end && end.getTime() > start.getTime() ? end : null }
}

/* ------------------------------------------------------------------------- *
 * Stable identity
 * ------------------------------------------------------------------------- */

/**
 * Reduce a value to a lowercase, URL-safe slug.
 *
 * @param {unknown} value - The candidate slug.
 * @returns {string} A `[a-z0-9-]` slug, or `''` when nothing usable remains.
 */
const toSafeSlug = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .slice(0, 80)
    .replace(/-+$/, '')

/**
 * A deterministic 32-bit FNV-1a hash, rendered in base 36.
 *
 * Used only as a last-resort identity component for a record that carries no
 * `slug`. It is deliberately a hash and not a random or time-based value: the
 * same input must always produce the same output, because that is what keeps a
 * re-downloaded entry recognisable as the same event.
 *
 * @param {string} value - The seed.
 * @returns {string} A short, stable, alphanumeric digest.
 */
const hashString = (value) => {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash.toString(36)
}

/**
 * The stable key identifying an event across exports.
 *
 * Prefers `event.slug`, which is a public contract elsewhere in the codebase
 * (route segment and deep-link value) and is therefore already stable. A record
 * without one falls back to a deterministic digest of its title and date, so
 * even an unslugged record keeps one identity rather than acquiring a new one
 * per download.
 *
 * @param {Object} event - The event record.
 * @returns {string} The key, or `''` when the record carries nothing to key on.
 */
const stableEventKey = (event) => {
  const slug = toSafeSlug(event.slug)
  if (slug) return slug
  const seed = `${event.title ?? ''}|${event.date ?? ''}`.trim()
  return seed === '|' || !seed ? '' : `event-${hashString(seed)}`
}

/**
 * The `UID` for an event's calendar entry.
 *
 * RFC 5545 §3.8.4.7 asks for a globally unique, persistent identifier, and the
 * conventional shape is a local identifier qualified by a domain. Persistence
 * is the point: a visitor who downloads the same event twice must end up with
 * one entry in their calendar, not two, which is why no random or clock-derived
 * component appears anywhere in this value.
 *
 * @param {Object} event - The event record.
 * @param {{siteUrl: string}} resolved - The resolved calendar context.
 * @returns {string} The UID, or `''` when the record cannot be keyed.
 */
const eventUid = (event, resolved) => {
  const key = stableEventKey(event)
  if (!key) return ''
  const host = hostOf(resolved.siteUrl)
  return host ? `${key}@${host}` : key
}

/**
 * The absolute URL of the event's own detail page.
 *
 * Falls back to the events listing when the record has no slug, so the entry
 * still links somewhere real rather than to a route that cannot resolve.
 *
 * @param {Object} event - The event record.
 * @param {{siteUrl: string}} resolved - The resolved calendar context.
 * @returns {string} An absolute URL, or `''` when no site URL is configured.
 */
const eventDetailUrl = (event, resolved) => {
  const slug = toSafeSlug(event.slug)
  return joinUrl(resolved.siteUrl, slug ? `${EVENT_ROUTE_BASE}/${slug}` : EVENT_ROUTE_BASE)
}

/**
 * Build the `ORGANIZER` content line, or `''` when no usable address exists.
 *
 * The address is a `mailto:` URI (a CAL-ADDRESS), so it is sanitised rather than
 * TEXT-escaped; the display name is a property parameter, so it takes the
 * RFC 6868 treatment. Without a valid address the property is omitted entirely
 * — a calendar entry with no organiser is ordinary, whereas one with a
 * malformed organiser is a parse error.
 *
 * @param {{organiserName: string, organiserEmail: string}} resolved - The resolved context.
 * @returns {string} The content line, unfolded.
 */
const organiserLine = (resolved) => {
  if (!resolved.organiserEmail) return ''
  const address = sanitiseUriValue(`mailto:${resolved.organiserEmail}`)
  if (!address) return ''
  const displayName = escapeParamValue(resolved.organiserName)
  return displayName ? `ORGANIZER;CN=${displayName}:${address}` : `ORGANIZER:${address}`
}

/* ------------------------------------------------------------------------- *
 * Public API
 * ------------------------------------------------------------------------- */

/**
 * Build a complete RFC 5545 `VCALENDAR` payload for one event.
 *
 * Pure: it reads no DOM, writes nothing and has no side effect, so it is safe
 * to call during render, in a test, or from {@link downloadIcs}.
 *
 * The payload carries exactly one `VEVENT`, and every property in it traces to
 * a field the event record actually holds. Optional properties are omitted when
 * their field is absent rather than emitted empty, which keeps a
 * partially-populated record valid instead of producing a blank `SUMMARY` or a
 * `LOCATION` with nothing in it.
 *
 * `LOCATION` is emitted as the free-text string the record authored, verbatim.
 * For the one online-only event that means exporting the sentence describing how
 * the joining link is issued, which is precisely correct here: a human reads a
 * calendar entry's location. The stricter requirement that a location resolve to
 * a structured place applies to structured data, not to this format, and the two
 * are deliberately not unified.
 *
 * Returns `''` when no export is possible — a missing record, or a `date` that
 * {@link module:lib/dates.parseCivilDate} cannot resolve. A `VEVENT` without a
 * valid `DTSTART` is not a calendar entry, so nothing is emitted and
 * {@link downloadIcs} reports the failure instead.
 *
 * @param {import('../data/events.js').CibleEvent} event - The event to export.
 * @param {CalendarContext} [context] - Organiser and site overrides; defaults are
 *   derived from {@link module:data/siteConfig siteConfig}.
 * @returns {string} The `VCALENDAR` text with CRLF terminators, or `''`.
 *
 * @example
 * const text = buildIcs(events[0])
 * // 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\n…\r\nEND:VCALENDAR\r\n'
 */
export function buildIcs(event, context) {
  const schedule = resolveSchedule(event)
  if (!schedule) return ''

  const resolved = resolveContext(context)
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${escapeIcsText(resolved.prodId)}`,
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
  ]

  const uid = eventUid(event, resolved)
  if (uid) lines.push(`UID:${escapeIcsText(uid)}`)
  lines.push(`DTSTAMP:${formatIcsUtcTimestamp(resolved.now)}`)

  if (schedule.allDay) {
    // An all-day DTEND is exclusive, so a single-day event ends on the next day.
    lines.push(`DTSTART;VALUE=DATE:${formatIcsDate(schedule.start)}`)
    lines.push(`DTEND;VALUE=DATE:${formatIcsDate(schedule.end)}`)
  } else {
    lines.push(`DTSTART:${formatIcsDateTime(schedule.start)}`)
    if (schedule.end) lines.push(`DTEND:${formatIcsDateTime(schedule.end)}`)
  }

  const summary = escapeIcsText(event.title)
  if (summary) lines.push(`SUMMARY:${summary}`)

  const description = escapeIcsText(event.description)
  if (description) lines.push(`DESCRIPTION:${description}`)

  const location = escapeIcsText(event.location)
  if (location) lines.push(`LOCATION:${location}`)

  const detailUrl = sanitiseUriValue(eventDetailUrl(event, resolved))
  if (detailUrl) lines.push(`URL:${detailUrl}`)

  const organiser = organiserLine(resolved)
  if (organiser) lines.push(organiser)

  lines.push('END:VEVENT', 'END:VCALENDAR')

  // Every content line, including the last, is CRLF-terminated.
  return `${lines.map(foldIcsLine).join(ICS_LINE_BREAK)}${ICS_LINE_BREAK}`
}


/**
 * Build the provider template URL that opens Google Calendar's own
 * event-creation form with this event's details pre-filled.
 *
 * Pure: it composes and returns a string. It opens nothing, navigates nowhere
 * and performs no request — the consumer renders the result as a link the
 * visitor chooses to follow. There is no API key, no access token, no OAuth
 * grant and no account access involved, because a template URL is simply a
 * pre-filled form address; the visitor still reviews the entry and decides
 * whether to save it. That is why the only claim this supports is that the
 * provider opened with the details filled in.
 *
 * The schedule is resolved through the same {@link resolveSchedule} used by
 * {@link buildIcs}, so the two exports can never disagree about an event's day
 * or hour:
 *
 * - An all-day event uses the `YYYYMMDD/YYYYMMDD` range form, whose end is the
 *   following civil day because the provider treats an all-day end as exclusive,
 *   exactly as RFC 5545 does.
 * - A timed event uses the `YYYYMMDDTHHMMSS/YYYYMMDDTHHMMSS` form with no `Z`
 *   and no `ctz` parameter, which the provider interprets in the visitor's own
 *   calendar timezone. This matches the floating local time the `.ics` emits, and
 *   for the same reason: no timezone is declared anywhere in the source data, so
 *   none is asserted here.
 * - A timed event with no usable `endTime` repeats its start as the end, which
 *   pre-fills the known start without inventing a duration the record does not
 *   state.
 *
 * Every interpolated value is encoded by `URLSearchParams`, so punctuation,
 * spaces and newlines in the authored copy cannot corrupt the query string.
 *
 * Returns `''` when the event's date cannot be resolved, so a consumer can omit
 * the control entirely rather than render a link that would open an empty form.
 *
 * @param {import('../data/events.js').CibleEvent} event - The event to pre-fill.
 * @param {CalendarContext} [context] - Site overrides; defaults are derived from
 *   {@link module:data/siteConfig siteConfig}.
 * @returns {string} An absolute provider URL, or `''` when the date is unusable.
 *
 * @example
 * const href = googleCalendarUrl(events[0])
 * // 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=…&dates=…'
 */
export function googleCalendarUrl(event, context) {
  const schedule = resolveSchedule(event)
  if (!schedule) return ''

  const resolved = resolveContext(context)

  const dates = schedule.allDay
    ? `${formatIcsDate(schedule.start)}/${formatIcsDate(schedule.end)}`
    : `${formatIcsDateTime(schedule.start)}/${formatIcsDateTime(schedule.end ?? schedule.start)}`

  const title = typeof event.title === 'string' ? event.title.trim() : ''
  const location = typeof event.location === 'string' ? event.location.trim() : ''
  // The details field carries the authored description followed by a link back
  // to the event's own page, so the saved entry stays traceable to its source.
  const details = [
    typeof event.description === 'string' ? event.description.trim() : '',
    eventDetailUrl(event, resolved),
  ]
    .filter(Boolean)
    .join('\n\n')

  const params = new URLSearchParams()
  params.set('action', 'TEMPLATE')
  if (title) params.set('text', title)
  params.set('dates', dates)
  if (details) params.set('details', details)
  if (location) params.set('location', location)

  return `${GOOGLE_CALENDAR_TEMPLATE_URL}?${params.toString()}`
}


/* ------------------------------------------------------------------------- *
 * The single platform touchpoint
 * ------------------------------------------------------------------------- */

/**
 * The IANA media type of an iCalendar payload, with the charset the payload is
 * actually encoded in.
 *
 * @type {string}
 */
const ICS_MIME_TYPE = 'text/calendar;charset=utf-8'

/**
 * How long to wait before releasing the object URL, in milliseconds.
 *
 * Revoking immediately after the programmatic click is the tempting shape and
 * is unreliable: some browsers cancel a download whose blob URL is revoked
 * while the transfer is still being handed off. Deferring by one short timer
 * lets the download start, and the release still always happens — nothing is
 * leaked for the lifetime of the page, which is the failure this guards against
 * in the other direction.
 *
 * @type {number}
 */
const OBJECT_URL_RELEASE_DELAY_MS = 250

/**
 * Detach a node from its parent, swallowing any failure.
 *
 * Cleanup runs from a `finally` block, where an exception would *replace* the
 * result the `try`/`catch` already produced and escape the function. Guarding
 * each cleanup step individually is what makes the never-throws guarantee on
 * {@link downloadIcs} hold even when the DOM misbehaves.
 *
 * @param {Node|null} node - The node to remove, if any.
 * @returns {void}
 */
const removeNode = (node) => {
  try {
    if (node && node.parentNode) node.parentNode.removeChild(node)
  } catch {
    // A node already detached by something else is not a failure worth surfacing.
  }
}

/**
 * Release an object URL, deferring by {@link OBJECT_URL_RELEASE_DELAY_MS} so an
 * in-flight download is not cancelled, and swallowing any failure for the
 * reason given on {@link removeNode}.
 *
 * @param {string} objectUrl - The URL returned by `URL.createObjectURL`, if any.
 * @returns {void}
 */
const releaseObjectUrl = (objectUrl) => {
  if (!objectUrl) return
  const revoke = () => {
    try {
      if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
        URL.revokeObjectURL(objectUrl)
      }
    } catch {
      // Nothing further can be done, and the page is no worse off for trying.
    }
  }
  try {
    if (typeof setTimeout === 'function') {
      setTimeout(revoke, OBJECT_URL_RELEASE_DELAY_MS)
    } else {
      revoke()
    }
  } catch {
    revoke()
  }
}

/**
 * The download filename for an event's calendar file.
 *
 * Derived from the event's own stable key — normally its `slug`, which is
 * already URL-safe and is a public contract elsewhere — so the saved file is
 * predictable and recognisable. The fallback is purely structural; like every
 * other string this module produces, it describes a file and claims nothing
 * about a calendar, an account or a sync.
 *
 * @param {Object} event - The event record.
 * @returns {string} A safe `.ics` filename.
 */
const icsFileName = (event) => `${stableEventKey(event) || 'calendar-event'}.ics`

/**
 * Download this event as a `.ics` file, using only the browser.
 *
 * This is the one function in the module that touches the platform. It builds
 * the payload with {@link buildIcs}, wraps it in a `Blob`, creates an object
 * URL, clicks a programmatically created anchor and then releases both the
 * anchor and the URL.
 *
 * **Call this synchronously inside the user gesture** — directly in the click
 * handler, with nothing awaited first. The same discipline the existing enquiry
 * forms document for their outbound deep links applies here: once the call
 * stack has left the gesture, a browser may treat the resulting download as
 * unsolicited and block it. The function is deliberately synchronous so a
 * consumer cannot accidentally break that by awaiting it.
 *
 * It never throws. Every outcome is reported as a {@link DownloadResult}, which
 * the consuming component renders: `'invalid-event'` when there is nothing
 * exportable (checked *before* the DOM is touched at all), `'unavailable'` when
 * the platform cannot perform a download, and `'error'` when the download
 * sequence itself failed. Success means the file was handed to the browser —
 * nothing more is claimed, because nothing more is knowable from here: whether
 * the visitor then keeps the entry is theirs to decide and this code cannot
 * observe it.
 *
 * @param {import('../data/events.js').CibleEvent} event - The event to export.
 * @param {CalendarContext} [context] - Organiser and site overrides; defaults are
 *   derived from {@link module:data/siteConfig siteConfig}.
 * @returns {DownloadResult} The outcome; never a thrown exception.
 *
 * @example
 * // Inside a click handler, with nothing awaited before it:
 * const result = downloadIcs(event)
 * if (!result.ok) setFailureReason(result.reason)
 */
export function downloadIcs(event, context) {
  // Build first: a record with no usable date must fail without ever reaching
  // the DOM, so a broken export cannot leave an anchor or an object URL behind.
  const text = buildIcs(event, context)
  if (!text) return { ok: false, reason: 'invalid-event' }

  if (
    typeof document === 'undefined' ||
    typeof Blob === 'undefined' ||
    typeof URL === 'undefined' ||
    typeof URL.createObjectURL !== 'function'
  ) {
    return { ok: false, reason: 'unavailable' }
  }

  let objectUrl = ''
  let anchor = null

  try {
    const blob = new Blob([text], { type: ICS_MIME_TYPE })
    objectUrl = URL.createObjectURL(blob)

    anchor = document.createElement('a')
    anchor.href = objectUrl
    anchor.download = icsFileName(event)
    // Hidden, but still appended: some browsers only honour a programmatic
    // click on an anchor that is actually part of the document.
    anchor.hidden = true
    const host = document.body || document.documentElement
    if (!host) return { ok: false, reason: 'unavailable' }
    host.appendChild(anchor)

    anchor.click()
    return { ok: true }
  } catch {
    return { ok: false, reason: 'error' }
  } finally {
    removeNode(anchor)
    releaseObjectUrl(objectUrl)
  }
}


/* ------------------------------------------------------------------------- *
 * The declared future adapter — an interface, not an implementation
 *
 * If a server-issued calendar feed is ever introduced, it attaches through the
 * adapter declared below rather than by replacing the three signatures above.
 * Both remain: the local functions keep working with no network at all, and the
 * adapter is the asynchronous seam a remote implementation satisfies.
 *
 *   resolveCalendarUrl(event)
 *     → Promise<{ok: true, url: string}
 *              | {ok: false, reason: 'unavailable'|'network'|'not-found'}>
 *
 * The honest account of what that would cost, rather than a claim that it is
 * free: the only consumer change it forces is **awaiting the result before the
 * download**. `downloadIcs` already returns `{ok, reason}` and the consuming
 * `AddToCalendar` component already renders that failure, so only the `await`
 * is new — the result shape, the failure vocabulary and the rendering of both
 * are unchanged. That is the expensive part to retrofit, and it is already in
 * place.
 *
 * It is deliberately NOT implemented here. A server integration is out of
 * scope for this work, and a stub that resolved to a fabricated URL would be
 * exactly the fake integration this module exists to avoid. Declaring the
 * interface costs nothing and fixes the shape; implementing it against no
 * server would cost correctness.
 * ------------------------------------------------------------------------- */

