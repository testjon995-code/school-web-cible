/**
 * CIBLE School of Language — Events data source
 *
 * Single source of truth for CIBLE's upcoming and recent events (workshops,
 * seminars, batch starts, competitions and webinars). Consumed by
 * `src/components/common/EventCard.jsx` and the `Events.jsx` page, which sort
 * and format each `date` for display (for example via `toLocaleDateString`).
 *
 * NOTE (client-supplied): The entries below are representative,
 * production-quality content that establishes real structure, layout and tone
 * for the events experience. The institute must confirm and supply the final
 * event media, exact dates and times before launch. Every `image` is
 * intentionally `null` so `EventCard` renders its branded gradient / date-badge
 * fallback header; drop real artwork at `/events/<slug>.jpg` (see the per-event
 * TODO notes) to override the fallback once assets are available.
 *
 * NOTE (additive machine-readable fields): `startTime`, `endTime`,
 * `attendanceMode`, `onlineUrl` and `scheduleConfirmed` are OPTIONAL companions
 * to the authored content below, and **no displayed value changed** when they
 * were introduced. `startTime` / `endTime` are a plain 24-hour transcription of
 * the already-authored `time` string — never a replacement for it: `time`
 * remains the value the UI renders, and the transcription exists so a calendar
 * export and `Event` structured data agree with what the page shows instead of
 * re-parsing display prose. `attendanceMode` is DECLARED per record and must
 * never be inferred: not from `type` (a programme category, not a delivery
 * mode — a 'Webinar' is not automatically online-only) and not by parsing the
 * human-readable `location` string. `onlineUrl` is omitted until a joining URL
 * actually resolves, because a placeholder would produce a broken entry in an
 * exported calendar. `scheduleConfirmed` ships `false` on every record, so no
 * `Event` JSON-LD is emitted while the exact dates and times above still await
 * the confirmation this notice requires; once the institute confirms a record,
 * opening the gate is a one-literal flip on that record with no code change.
 */

/**
 * A single CIBLE event.
 *
 * @typedef {Object} CibleEvent
 * @property {string} slug        Stable, URL-safe identifier. Used to build event-aware
 *                                Register links (`/contact?event=<slug>`) and validated as an
 *                                allowlist by the Contact page so an event's identity survives the
 *                                handoff. Must be unique and match the `/events/<slug>.jpg` asset path.
 * @property {string} title       Human-readable event name.
 * @property {string} date        ISO 'YYYY-MM-DD' date string. Parse for display with
 *                                {@link module:lib/dates.parseCivilDate} to avoid the UTC day-shift.
 * @property {string} [time]      Optional display time, e.g. '10:00 AM – 1:00 PM'.
 * @property {('Workshop'|'Seminar'|'Batch Start'|'Competition'|'Webinar')} [type] Optional category.
 * @property {string} description One–two inviting, admission-oriented sentences.
 * @property {string} location    Event-specific location text (never the full site address block).
 * @property {?string} image      Client-supplied image path, or `null` to use the branded fallback.
 * @property {string} [startTime] Optional machine-readable start time as 'HH:mm', 24-hour and
 *                                zero-padded (e.g. '09:00'), so the format is uniform and
 *                                lexicographically sortable. A transcription of `time`, not a
 *                                replacement: `time` stays the displayed value. Consumed by the
 *                                calendar export and as the `Event` `startDate`. WHERE ABSENT,
 *                                `buildIcs` emits an all-day `VEVENT` and `eventSchema` emits a
 *                                date-only `startDate` — neither guesses an hour.
 * @property {string} [endTime]   Optional machine-readable end time in the same 'HH:mm' 24-hour
 *                                format, and likewise never guessed when absent.
 * @property {('offline'|'online'|'mixed')} [attendanceMode] Optional delivery mode. DECLARED per
 *                                record and never derived — it is deliberately not inferred from
 *                                `type`, which is a programme category rather than a delivery mode,
 *                                and not parsed out of the free-text `location`.
 * @property {string} [onlineUrl] Optional joining or registration URL, present ONLY where a real URL
 *                                actually resolves. A placeholder is not acceptable: it would put a
 *                                broken link into an exported calendar entry.
 * @property {boolean} [scheduleConfirmed] Optional institute-confirmation flag gating `Event`
 *                                structured data. Consumers MUST treat an absent value as NOT
 *                                confirmed. `false` (or absent) means the record renders, filters and
 *                                exports normally but emits no `Event` JSON-LD.
 *
 * `location` is what the page displays and what a calendar entry exports — the free-text string as
 * authored, which is accurate for every record. `Event` structured-data eligibility is stricter and
 * additionally requires either a real `Place` (`attendanceMode` 'offline' or 'mixed' AND a `location`
 * naming an address) or a real `VirtualLocation` backed by a resolving `onlineUrl`; a prose sentence
 * describing an arrangement satisfies neither.
 */

/**
 * Upcoming CIBLE events, listed in chronological order so consuming components
 * can render them directly or re-sort/format `date` as needed.
 *
 * @type {CibleEvent[]}
 */
export const events = [
  {
    slug: 'free-spoken-english-workshop',
    title: 'Free Spoken English Workshop',
    date: '2026-08-16',
    time: '10:00 AM – 1:00 PM',
    startTime: '10:00',
    endTime: '13:00',
    type: 'Workshop',
    description:
      'A hands-on session where beginners practise everyday conversation, pronunciation and confidence-building drills with our English faculty. Seats are free but limited – register early to reserve your spot and take the first step toward fluent, confident English.',
    location: 'CIBLE Campus, Saharghat, Madhubani',
    attendanceMode: 'offline',
    scheduleConfirmed: false,
    // TODO(client): add real image at /events/free-spoken-english-workshop.jpg; EventCard shows gradient fallback when null
    image: null,
  },
  {
    slug: 'personality-development-seminar',
    title: 'Personality Development Seminar',
    date: '2026-08-30',
    time: '11:00 AM – 1:00 PM',
    startTime: '11:00',
    endTime: '13:00',
    type: 'Seminar',
    description:
      'An interactive seminar on communication, body language and interview-ready confidence for students and young professionals. Bring a friend, book your free seat and discover how CIBLE programmes shape a standout personality.',
    location: 'CIBLE Seminar Hall, Saharghat, Madhubani',
    attendanceMode: 'offline',
    scheduleConfirmed: false,
    // TODO(client): add real image at /events/personality-development-seminar.jpg; EventCard shows gradient fallback when null
    image: null,
  },
  {
    slug: 'pcm-pcb-batch-orientation',
    title: 'New PCM & PCB Science Batch Orientation',
    date: '2026-09-13',
    time: '9:00 AM – 11:00 AM',
    startTime: '09:00',
    endTime: '11:00',
    type: 'Batch Start',
    description:
      'Meet our science mentors and preview the PCM and PCB coaching roadmap for board and competitive-exam success. Attend the orientation, confirm your seat for the new batch and start strong this session.',
    location: 'CIBLE Science Wing, Saharghat, Madhubani',
    attendanceMode: 'offline',
    scheduleConfirmed: false,
    // TODO(client): add real image at /events/pcm-pcb-batch-orientation.jpg; EventCard shows gradient fallback when null
    image: null,
  },
  {
    slug: 'public-speaking-competition',
    title: 'Spoken English & Public Speaking Competition',
    date: '2026-09-27',
    time: '10:00 AM – 4:00 PM',
    startTime: '10:00',
    endTime: '16:00',
    type: 'Competition',
    description:
      'Take the stage in our friendly elocution and public-speaking contest, with certificates and prizes for every level. Entry is free for enrolled and prospective students alike – register now and turn practice into performance.',
    location: 'CIBLE Main Auditorium, Saharghat, Madhubani',
    attendanceMode: 'offline',
    scheduleConfirmed: false,
    // TODO(client): add real image at /events/public-speaking-competition.jpg; EventCard shows gradient fallback when null
    image: null,
  },
  {
    slug: 'digital-literacy-webinar',
    title: 'Digital Literacy & Online Interview Skills Webinar',
    date: '2026-10-18',
    time: '6:00 PM – 7:30 PM',
    startTime: '18:00',
    endTime: '19:30',
    type: 'Webinar',
    description:
      'A live online session covering essential computer skills, digital safety and how to ace video interviews. Join from anywhere, ask our trainers directly and enquire about admission to our Computer and Career Guidance courses.',
    location: 'Online via Google Meet (link shared after registration)',
    // The one online-only record. `onlineUrl` is deliberately ABSENT: the Meet link is issued after
    // registration and does not exist yet, and the `location` above is prose describing that
    // arrangement rather than a URL. Inventing a placeholder would put a broken link into an
    // exported calendar entry, so this record stays breadcrumb-only for structured data — no real
    // `VirtualLocation` can be built until the institute supplies a joining URL that resolves.
    attendanceMode: 'online',
    scheduleConfirmed: false,
    // TODO(client): add real image at /events/digital-literacy-webinar.jpg; EventCard shows gradient fallback when null
    image: null,
  },
]

export default events
