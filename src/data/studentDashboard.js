/**
 * CIBLE School of Language — My Learning (dashboard) structural copy
 * ------------------------------------------------------------------
 * Single source of truth for the FRAME of the `/dashboard` route: the panel
 * headings, the render order, the one sentence that tells a visitor where each
 * panel's contents came from, and the wording each panel shows when it has
 * nothing to show. Consumed by `src/pages/Dashboard.jsx` (AAP §0.9.1 Group 1,
 * record contract in AAP §0.7.2).
 *
 * Pure ESM data module: no React, no JSX and NO imports, so it stays
 * dependency-free and trivially serializable. Every value below is a plain
 * string.
 *
 * ── STRUCTURE, NOT PEOPLE — THE GOVERNING CONSTRAINT (AAP §0.6.5) ──────────
 * This module holds STRUCTURAL COPY ONLY. It carries no personal information
 * and no fabricated progress of any kind, and it never may. Named explicitly so
 * a future editor cannot drift: no person's name or initials, no email address,
 * no phone number, no street address, no photograph, avatar or image path, no
 * greeting that names anybody, no grade, score, mark, completion percentage,
 * lesson or module count, attendance figure, streak, badge or certificate
 * status, and no enquiry reference, ticket number or application id. No such
 * record exists to report: there is no account, no authentication and no server
 * behind this surface. Inventing one would be precisely the fake backend, fake
 * authentication and fake student statistics the plan forbids outright
 * (AAP §0.10.4), and it would turn the one honest page on the site into the
 * least honest one.
 *
 * ── EVERY VALUE THAT LOOKS LIKE DATA IS SUPPLIED AT RUNTIME ────────────────
 * `Dashboard.jsx` owns no store of its own and composes by derivation only
 * (AAP §0.5.2), so each panel's contents come from the module that genuinely
 * owns that subject — never from here:
 *   - the saved course set     → `useSavedCourses()` in src/hooks/useSavedCourses.js
 *                                (one namespaced localStorage key, this device only)
 *   - the questionnaire result → `recommendCourses()` in src/lib/recommend.js,
 *                                over the four answers read from THIS PAGE'S URL
 *   - the upcoming events      → `partitionEvents()` in src/lib/eventSchedule.js,
 *                                over the real records in src/data/events.js
 * What this file supplies is the wording around those three, plus the honest
 * statement that the fate of an enquiry is not knowable to a website whose
 * forms only open a draft in the visitor's own app.
 *
 * ── THE FIVE PANEL IDS ARE A PUBLIC CONTRACT ───────────────────────────────
 * `panels` is ordered and ARRAY ORDER IS RENDER ORDER: saved → path → events →
 * nextStep → enquiry, laid out as cards in a two-column grid from the `md`
 * breakpoint up. `Dashboard.jsx` matches each panel to its runtime data source
 * and to its empty state on the `id`, so these five ids are never renamed, and
 * a sixth panel is never added here without the matching branch in that page.
 *
 * ── `notice` IS A PERMANENT ARCHITECTURAL DISCLOSURE, NOT A CONTENT CAVEAT ─
 * `Dashboard.jsx` renders `notice` through `RepresentativeNote` with
 * `gate="always"`, and it is the ONLY caller on the site that passes that value
 * (AAP §0.6.5). Every other disclosure uses the default `gate="content"` and
 * retires itself the moment `siteConfig.representativeContent` is cleared,
 * which is exactly right for copy awaiting the institute's confirmation. This
 * one is not awaiting anything: the absence of an account, of authentication
 * and of a server is an architectural fact, and confirming the institute's
 * course details does not change it. Gating this notice on the content flag
 * would silently delete the only statement telling a visitor that the page does
 * not track a real enrollment, at precisely the moment the site starts looking
 * finished. `notice` is therefore written to read correctly AFTER every other
 * disclosure on the site has disappeared — a standing statement about how the
 * page works, never a temporary placeholder caveat.
 *
 * `notice` MUST stay ONE plain-text paragraph in ONE string: not an array, no
 * markup, no newline. That is mechanical rather than stylistic —
 * `RepresentativeNote` renders its children inside a single `<p>`, so any
 * multi-block value would produce invalid nested markup.
 *
 * ── THE SIX JOURNEY STAGES DELIBERATELY LIVE ELSEWHERE ─────────────────────
 * The learner-journey stages are NOT in this file. They are the single
 * `learningJourney` export in `src/data/learningPaths.js`, rendered through
 * `Timeline` by both the ten course detail routes and this dashboard's path
 * panel, so one definition serves every surface (AAP §0.7.2). Do not restate
 * those stage labels, ids or bodies here; a second copy is exactly the drift
 * the single-owning-module discipline exists to prevent.
 *
 * ── VOICE AND CONTENT BOUNDS ───────────────────────────────────────────────
 * Warm, plain and second-person, matching `src/data/faq.js`. No contact fact is
 * restated here — the phone number, WhatsApp link, email address and street
 * address live ONLY in `src/data/siteConfig.js` and are surfaced by components
 * — and no claim of tracking, syncing, notifications or real-time behaviour
 * appears anywhere, because none of it exists. Note for anyone auditing this
 * file for authentication vocabulary: the only "session" named below is the
 * institute's free counseling session, a standing admissions call-to-action
 * evidenced by `src/data/faq.js`. It is an appointment with a person, never a
 * sign-in session; this surface has neither a session to resume nor anything to
 * sign in to, and the `notice` says so in as many words.
 *
 * @module data/studentDashboard
 */

/**
 * One panel of the My Learning dashboard: its heading, the sentence explaining
 * where its contents come from, and the copy shown when it has nothing to show.
 *
 * `emptyTitle` and `emptyBody` feed the shared `src/components/ui/EmptyState.jsx`
 * primitive as its `title` and `description`. That primitive's contract is that
 * an empty state answers BOTH what happened AND what to do next (AAP §0.9.2),
 * so every `emptyBody` below names a next action in prose, while the affordance
 * itself — the link or button that performs it — is rendered by
 * `Dashboard.jsx` as the primitive's `action`.
 *
 * @typedef {Object} DashboardPanel
 * @property {'saved'|'path'|'events'|'nextStep'|'enquiry'} id
 *   PUBLIC CONTRACT — the render order key. `Dashboard.jsx` resolves each
 *   panel's runtime data source and empty state from this value, so it is never
 *   renamed and the declaration order below is the order the panels appear in.
 * @property {string} title      Panel heading. Short, heading-safe, carrying no
 *                               markup and no trailing punctuation, because it
 *                               is rendered as a heading inside a `Card`.
 * @property {string} blurb      One sentence saying what the panel shows AND
 *                               where that came from. The transparency is the
 *                               feature, so a blurb never omits its source.
 * @property {string} emptyTitle The empty state's title: what happened.
 * @property {string} emptyBody  The empty state's description: why the panel is
 *                               empty, and what the visitor can do next.
 */

/** @type {{notice: string, panels: DashboardPanel[]}} */
export const studentDashboardDemo = {
  // The frontend-foundation disclosure. One paragraph, one string — see the
  // header for why that is a mechanical requirement and why this notice is the
  // site's single `gate="always"` call site.
  notice:
    'My Learning is the frontend foundation for a learner area: this website is a set of static files with no server behind it, so there is nothing to sign in to, nothing here is tracked, and the institute never sees what appears on it. What you see is entirely your own — the courses you saved in this browser, and the questionnaire answers carried in this page\u2019s address — arranged in the structure a future, institute-managed learner area would fill, which is why every panel below says where its contents came from. Nothing on this page reflects a real enrollment, payment, attendance or result, so please speak to CIBLE directly for anything official.',

  panels: [
    {
      // Genuinely persistent local state, and the only panel whose contents
      // survive a reload. The copy deliberately says "in this browser on this
      // device" rather than promising the save always succeeds: a write can be
      // refused (a full store, or private browsing where the quota is
      // effectively zero), in which case `useSavedCourses` reports
      // `persisted: false` and the page discloses that separately. An absolute
      // promise here would contradict that disclosure.
      id: 'saved',
      title: 'Saved Courses',
      blurb:
        'The courses you saved while browsing the catalog, kept in this browser on this device — save or unsave from any course card and this list follows.',
      emptyTitle: 'No courses saved yet',
      emptyBody:
        'You have not saved a course yet. Open the course catalog and use the save control on any course you want to return to, and it will be waiting here on this device.',
    },
    {
      // Read from the URL and nowhere else (AAP §0.5.2). The result panel on
      // /learning-path offers a navigational "View this result on My Learning"
      // link that carries the four answers here, so the recommendation is
      // reproduced deterministically from the address. No second storage key
      // exists for it and a bare reload will not show it, so this copy must not
      // imply the result is remembered, saved or restored.
      id: 'path',
      title: 'Your Learning Path Result',
      blurb:
        'The questionnaire result you brought here from Find Your Learning Path, worked out again from the answers in this page\u2019s address — nothing is stored, so the link is what keeps it.',
      emptyTitle: 'No path result yet',
      emptyBody:
        'This page\u2019s address carries no questionnaire answers, so there is no result to work out. Answer the four questions on Find Your Learning Path, then use the link on its result to bring the suggestions here.',
    },
    {
      // Real records, not demonstration data: the events come from
      // src/data/events.js and the upcoming group is derived by comparing each
      // event's own date with today. Phrased so it stays true whichever events
      // the institute publishes next.
      id: 'events',
      title: 'Upcoming Events',
      blurb:
        'The events CIBLE has published that still lie ahead of today, worked out from the event dates themselves rather than from anything held on this device.',
      emptyTitle: 'No upcoming events are scheduled',
      emptyBody:
        'Nothing on the published events list falls on or after today. Past events are listed on the events page, and CIBLE can tell you what is being planned next.',
    },
    {
      // A suggestion derived from what the page can already see — whether
      // anything is saved, and whether the questionnaire answers are in the
      // address. It never assumes knowledge of an enrollment, a payment or a
      // class in progress, because the browser has no way to know any of that.
      id: 'nextStep',
      title: 'Your Next Step',
      blurb:
        'One suggestion drawn from what this page can already see — whether anything is saved, and whether questionnaire answers are in the address — so it changes as those do.',
      emptyTitle: 'No next step to suggest yet',
      emptyBody:
        'Nothing is saved here and no questionnaire result is in this page\u2019s address, so there is nothing to base a suggestion on. Browsing the course catalog is the usual place to start, and CIBLE offers a free counseling session if you would rather talk it through with someone first.',
    },
    {
      // Labelled not tracked, in plain words, because that is the truth
      // (AAP §0.5.2): the admission and contact forms compose a message and
      // hand it to the visitor's own WhatsApp or email app, and the handoff is
      // where this website's knowledge ends. Claiming a delivery, a read or a
      // reply would be the fake backend the prohibitions forbid, so no status
      // of any kind is asserted or implied here.
      id: 'enquiry',
      title: 'Enquiries — Not Tracked',
      blurb:
        'Not tracked, and that is deliberate: the admission and contact forms open a draft in your own WhatsApp or email app, so this website never learns whether you sent it or whether CIBLE has replied.',
      emptyTitle: 'Enquiry status is not tracked',
      emptyBody:
        'This website keeps no record of any enquiry, because its forms only prepare a draft in your own WhatsApp or email app and what happens after that stays between you and the institute. Start one from the admission form, or reach CIBLE on WhatsApp or by phone to follow up on an enquiry you have already sent.',
    },
  ],
}

export default studentDashboardDemo
