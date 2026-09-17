import { useCallback, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  FaRegBookmark,
  FaRegCalendarAlt,
  FaRegCommentDots,
  FaRegLightbulb,
  FaRoute,
} from 'react-icons/fa'

import Seo from '../components/seo/Seo.jsx'
import Container from '../components/ui/Container.jsx'
import SectionHeading from '../components/ui/SectionHeading.jsx'
import Breadcrumbs from '../components/ui/Breadcrumbs.jsx'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import CourseGrid from '../components/common/CourseGrid.jsx'
import EventCard from '../components/common/EventCard.jsx'
import Timeline from '../components/common/Timeline.jsx'
import TrustSection from '../components/common/TrustSection.jsx'
import RepresentativeNote from '../components/common/RepresentativeNote.jsx'
import CTASection from '../components/common/CTASection.jsx'
import { useSavedCourses } from '../hooks/useSavedCourses.js'
import { recommendCourses } from '../lib/recommend.js'
import { partitionEvents } from '../lib/eventSchedule.js'
import { learningJourney, learningPathQuestions } from '../data/learningPaths.js'
import { studentDashboardDemo } from '../data/studentDashboard.js'
import { courses } from '../data/courses.js'
import { events } from '../data/events.js'
import { cn } from '../lib/cn.js'

/**
 * Dashboard — the `/dashboard` "My Learning" route module for the CIBLE School
 * of Language SPA, lazy-loaded by `src/App.jsx` inside the shared `<Layout>`.
 * This component renders ONLY page content; the persistent Navbar, Footer and
 * floating conversion widgets belong to the shell.
 *
 * ===========================================================================
 * WHAT THIS PAGE IS, AND WHAT IT REFUSES TO PRETEND TO BE
 * ===========================================================================
 * It is the FRONTEND FOUNDATION for a learner area (AAP §0.6.5): the panel
 * structure a future, institute-managed learner area would fill, filled today
 * by the only two things a static site can honestly show — the courses the
 * visitor saved in this browser, and the questionnaire answers carried in this
 * page's own address.
 *
 * There is NO account, NO authentication, NO session and NO server anywhere in
 * this application, so this route is unauthenticated and says so in plain words
 * in its own subtitle and in the standing notice at the top of the page. It
 * names no person, shows no grade, completion figure, percentage, streak,
 * attendance record, fee, balance or enquiry reference, and asserts no
 * institutional claim — because no such record exists to report, and inventing
 * one would be exactly the fake authentication, fake statistics and fake
 * backend the plan forbids outright (AAP §0.10.4). There is no `fetch`, no
 * `axios`, no `XMLHttpRequest`, no `WebSocket` and no `EventSource` in this
 * file, and none may ever be added: the boundary of this feature is the browser
 * tab (AAP §0.6.1).
 *
 * ===========================================================================
 * THE PAGE OWNS NO DATA — EVERY PANEL NAMES ITS OWNER (AAP §0.5.2)
 * ===========================================================================
 * "Composition by derivation only": this module holds no store, introduces no
 * storage key, and caches nothing. Each panel reads from the module that
 * genuinely owns its subject, and each panel's `blurb` — authored in
 * `src/data/studentDashboard.js` — states that source to the visitor, so the
 * transparency is on the screen and not only in this comment:
 *
 *   `saved`    → {@link useSavedCourses} — genuinely persistent, one namespaced
 *                localStorage key (`cible:saved-courses:v1`), this device only.
 *                Rendered through the shared `CourseGrid` with pre-filtered
 *                `items`, and cleared through the hook's own `clear()`.
 *   `path`     → THE URL AND NOWHERE ELSE. The four questionnaire answers are
 *                read from this page's query string, validated, and scored by
 *                {@link recommendCourses}. The canonical six-stage
 *                `learningJourney` renders beneath it through `Timeline`.
 *   `events`   → `partitionEvents(events, now).upcoming` — real records from
 *                `src/data/events.js`, grouped by comparing each event's own
 *                date with today, never by a flag anybody maintains by hand.
 *   `nextStep` → derived from the two above, and from nothing else.
 *   `enquiry`  → NOTHING, deliberately. See below.
 *
 * The render order, the panel headings and every empty-state string come from
 * `studentDashboardDemo.panels`, whose five ids are a public contract; this file
 * iterates that array and resolves each panel's body by `id`, so the data module
 * owns the frame and this module owns only the wiring.
 *
 * "The selected course" is NOT separate state (AAP §0.5.2): the next-step panel
 * highlights the FIRST SAVED course, or the best-matching recommendation when
 * nothing is saved, or nothing at all. No selection concept, no
 * `?selected=` parameter and no second storage key is introduced for it.
 *
 * ===========================================================================
 * THE PATH RESULT IS URL-ONLY, AND THAT IS THE DESIGN
 * ===========================================================================
 * `/learning-path`'s result panel offers a deliberately NAVIGATIONAL link —
 * "View this result on My Learning" — that carries the same four answers here,
 * so arriving that way reproduces the recommendation DETERMINISTICALLY from the
 * address. Arriving any other way, including a bare reload of `/dashboard`,
 * shows the honest "no path result yet" empty state and offers the
 * questionnaire. That is a SPECIFIED PASS CONDITION, not a defect: no second
 * storage key exists for it, because persisting an answer set the visitor never
 * asked to store is worse than forgetting it, and because the privacy
 * disclosure in `src/pages/PrivacyPolicy.jsx` is written against exactly ONE
 * key. Do not "fix" this by remembering the answers.
 *
 * ===========================================================================
 * ENQUIRY STATUS IS NOT TRACKED, IN PLAIN WORDS
 * ===========================================================================
 * The admission and contact forms compose a message and hand it to the
 * visitor's own WhatsApp or email app; the handoff is where this website's
 * knowledge ends. So the enquiry panel reports no status of any kind — no
 * "submitted", no "pending", no reference number, no badge implying a round
 * trip — and says it is not tracked, which is the truth (AAP §0.5.2). Its
 * affordances are the two real ones: open the admission form, or contact the
 * institute.
 *
 * ===========================================================================
 * THE NOTICE USES `gate="always"`, AND THIS IS THE ONLY CALLER ON THE SITE
 * ===========================================================================
 * `RepresentativeNote` normally returns `null` once
 * `siteConfig.representativeContent` is cleared, which is exactly right for
 * copy awaiting the institute's confirmation. This notice is not awaiting
 * anything: the absence of an account, of authentication and of a server is an
 * ARCHITECTURAL FACT, and confirming the institute's course details does not
 * change it. Gating it on the content flag would silently delete the only
 * statement telling a visitor that this surface does not track a real
 * enrolment, at precisely the moment the site starts looking finished
 * (AAP §0.6.5). Hand-rolling a second `role="note"` block here was considered
 * and rejected as the duplication the prohibitions forbid — the one additive
 * `gate` prop is why the codebase still has exactly ONE disclosure component.
 *
 * ===========================================================================
 * HEAD TREATMENT: `noindex`, NO CANONICAL, NO JSON-LD (AAP §0.5.1, §0.12.5)
 * ===========================================================================
 * `/dashboard` is a control-reachable utility route whose content is the
 * visitor's own device-local state plus a demonstration label, so it is one of
 * the three routes excluded from the index:
 *   • `noindex` is passed to the canonical {@link Seo} component, the single
 *     noindex mechanism in the codebase; no Helmet block is hand-rolled here.
 *   • NO `canonical` is supplied, so `Seo`'s conditional rule emits neither a
 *     canonical `<link>` nor an `og:url`, exactly as it already does for
 *     `NotFound.jsx`.
 *   • NO structured data at all — not even BreadcrumbList. Markup on a page
 *     excluded from the index has no consumer, so `<StructuredData>` is
 *     deliberately not imported by this module; that is the decision, not an
 *     omission. The VISIBLE trail still renders from the module-local `crumbs`
 *     array below.
 * `/dashboard` is correspondingly absent from `public/sitemap.xml`, while
 * `public/robots.txt` deliberately stays `Allow: /` — disallowing a `noindex`
 * route would stop a crawler ever seeing the directive.
 *
 * ===========================================================================
 * LAYOUT, OUTLINE AND DESIGN SYSTEM (AAP §0.9.3, §0.15)
 * ===========================================================================
 * No design attachment exists for this project, so the visual reference is this
 * repository's own screens. Composition, in order: a tinted `bg-surface` header
 * band (the pattern `/admission` and `/success-stories` already use) carrying
 * the trail, the page `<h1>` and the standing notice; the five panels as shared
 * `Card` surfaces in a `md:grid-cols-2` grid; the shared `<TrustSection>`, one
 * of the four surfaces that composes it; and the shared `<CTASection>` that
 * closes every page.
 *
 * The three COLLECTION panels — saved, path and events — span both columns from
 * `md` up (`md:col-span-2`). That is a considered choice, not decoration: the
 * grids inside them (`CourseGrid`, and the event grid below) switch on the
 * VIEWPORT width, so a half-measure column at 1280px would ask three course
 * cards to share about 170px each. The two short text panels keep the
 * two-column row, and below `md` every panel is full width.
 *
 * Outline: one `<h1>` (the page header) → one `<h2>` per panel, from the data
 * module's `title` → `<h3>` for every card title (`CourseCard`, `EventCard`,
 * the recommendation and next-step cards, each `Timeline` stage and every
 * `EmptyState` heading) → `<h4>` only for the sub-labels inside a card. No level
 * is skipped. Zero new tokens and zero new utilities are introduced, so
 * `src/index.css` carries no diff; every class is a token-backed Tailwind
 * utility on the 8px scale, composed through {@link cn}.
 *
 * `Dashboard` is this file's ONLY export and a default export, so
 * `react/only-export-components` stays clean and `lazyWithRetry(() =>
 * import('./pages/Dashboard.jsx'))` resolves to the page component. This module
 * registers no route; `src/App.jsx` owns the route table.
 *
 * @module pages/Dashboard
 */

// Breadcrumb trail for this page. Module-local (never exported) and used ONLY
// by the visible <Breadcrumbs>: unlike every indexable route, this page emits no
// BreadcrumbList JSON-LD, because it is noindex (see the head-treatment note in
// the module JSDoc). Shape: { name, path }.
const crumbs = [
  { name: 'Home', path: '/' },
  { name: 'My Learning', path: '/dashboard' },
]

// The questionnaire route, spelled once: the empty state's affordance, the
// "change your answers" action and the no-match action all point at it.
const LEARNING_PATH_ROUTE = '/learning-path'

// One decorative glyph per panel, keyed by the panel id contract. Read by the
// panel's own EmptyState, which hides it from assistive technology — the meaning
// always lives in the title and description, never in the icon (WCAG 1.4.1).
// react-icons COMPONENT REFERENCES, per the house convention, and deliberately
// not stored in the data module: `src/data/studentDashboard.js` is a pure,
// serialisable ESM module with no imports at all.
const PANEL_ICONS = {
  saved: FaRegBookmark,
  path: FaRoute,
  events: FaRegCalendarAlt,
  nextStep: FaRegLightbulb,
  enquiry: FaRegCommentDots,
}

// Panels whose body hosts a responsive grid or the journey timeline, and which
// therefore take the full measure from `md` up. See the layout note in the
// module JSDoc for why this is arithmetic rather than taste.
const FULL_WIDTH_PANELS = new Set(['saved', 'path', 'events'])

// Slug → course record, built once at module load from the single catalogue
// source of truth. `useSavedCourses` already prunes slugs that no longer resolve
// to a course, so this map is the second, independent guard rather than the
// first: a slug it cannot resolve is dropped silently instead of rendering a
// hole (AAP §0.5.3 counts an unresolvable identifier among the invalid-data
// classes the empty states cover).
const COURSE_BY_SLUG = new Map(
  (Array.isArray(courses) ? courses : [])
    .filter((course) => course && typeof course === 'object' && typeof course.slug === 'string')
    .map((course) => [course.slug, course]),
)

/**
 * The four answer dimensions this page reads out of its own address, in the
 * order the questionnaire asks them, each carrying the value → label map that
 * both validates a parameter and renders it back to the visitor.
 *
 * Derived once at module load from `learningPathQuestions`, which is static
 * build-time data. The ALLOWLIST IS THAT QUESTION'S OWN OPTION SET, which is
 * deliberate: this page reproduces a questionnaire result, so the answers it
 * accepts are exactly the answers the questionnaire can produce. One documented
 * consequence — the legal course level `'All levels'` is not an option, because
 * `src/data/learningPaths.js` records that it describes a COURSE rather than a
 * learner, so a hand-edited `?level=All%20levels` is dropped here and simply
 * imposes no constraint on the scoring.
 *
 * A question with no usable string `id` is skipped, because a parameter with no
 * name cannot be read from a URL, and an option with no usable `value` is
 * skipped for the same reason. A label falls back to its own value so a
 * recap row can never render an empty gap.
 *
 * @type {ReadonlyArray<{id: string, question: string, labels: Map<string, string>}>}
 */
const ANSWER_DIMENSIONS = Object.freeze(
  (Array.isArray(learningPathQuestions) ? learningPathQuestions : [])
    .filter(
      (question) =>
        Boolean(question) &&
        typeof question === 'object' &&
        typeof question.id === 'string' &&
        question.id !== '',
    )
    .map((question) =>
      Object.freeze({
        id: question.id,
        question:
          typeof question.label === 'string' && question.label !== ''
            ? question.label
            : question.id,
        labels: new Map(
          (Array.isArray(question.options) ? question.options : [])
            .filter(
              (option) =>
                Boolean(option) &&
                typeof option === 'object' &&
                typeof option.value === 'string' &&
                option.value !== '',
            )
            .map((option) => [
              option.value,
              typeof option.label === 'string' && option.label !== ''
                ? option.label
                : option.value,
            ]),
        ),
      }),
    ),
)

// The six canonical journey stages, mapped onto `Timeline`'s item shape once at
// module load. `label` → `title`, `body` → `description`, and `href` straight
// through, so a stage that names a route renders its title as a real <Link>
// inside the same <h3> and a stage that does not renders exactly as every other
// Timeline step always has. The stages are NOT restated here: this page and the
// ten course detail routes render ONE definition (AAP §0.7.2), which is why
// `src/data/studentDashboard.js` deliberately carries no stage labels.
const JOURNEY_ITEMS = (Array.isArray(learningJourney) ? learningJourney : [])
  .filter(
    (stage) =>
      Boolean(stage) && typeof stage === 'object' && typeof stage.label === 'string' && stage.label !== '',
  )
  .map((stage) => ({
    title: stage.label,
    description: stage.body,
    href: typeof stage.href === 'string' && stage.href !== '' ? stage.href : undefined,
  }))

// Shared class strings for the two card shapes this page composes, so a title
// or a sub-label is styled once. Both match the families already used by
// `CourseCard`, `EventCard` and the learning-path result cards, which is what
// makes the panels read as one surface rather than five.
const CARD_TITLE = 'text-lg font-semibold text-foreground'
const CARD_SUBLABEL = 'text-xs font-semibold uppercase tracking-wide text-muted'
const CARD_LIST = 'mt-2 flex list-none flex-col gap-1 p-0 text-sm text-muted'

/**
 * Read the four questionnaire answers out of the address, validating every one.
 *
 * Read then validate, never trust. A value is accepted only when the question
 * that owns it declares it as an option; anything else — a typo, a renamed id
 * from an old shared link, a hand-edited experiment — is DROPPED, so the
 * question reads as unanswered and imposes no constraint on the scoring rule.
 * Surrounding whitespace is trimmed first, so `?level=%20Beginner` resolves to
 * the same view as `?level=Beginner` rather than to nothing. This mirrors the
 * discipline `/learning-path`, `/events` and `/admission` already apply to their
 * own parameters (AAP §0.5.2).
 *
 * @param {URLSearchParams} params - The current query parameters.
 * @returns {Record<string, string>} The accepted answers, keyed by question id.
 *   A question with no accepted value is absent rather than empty.
 */
function readAnswers(params) {
  /** @type {Record<string, string>} */
  const answers = {}
  for (const dimension of ANSWER_DIMENSIONS) {
    const raw = params.get(dimension.id)
    if (typeof raw !== 'string') continue
    const value = raw.trim()
    if (value !== '' && dimension.labels.has(value)) answers[dimension.id] = value
  }
  return answers
}

/**
 * Resolve the accepted answers into the rows the visible recap renders.
 *
 * Question order, not URL order, so the recap reads in the order the
 * questionnaire asked — and both the question wording and the answer wording
 * come from `src/data/learningPaths.js`, which is what stops a kebab-case
 * identifier ever reaching the screen.
 *
 * @param {Record<string, string>} answers - The validated answers.
 * @returns {{id: string, question: string, label: string}[]} One row per
 *   answered question; empty when the address carries no answers.
 */
function resolveSelections(answers) {
  return ANSWER_DIMENSIONS.filter((dimension) => Boolean(answers[dimension.id])).map(
    (dimension) => ({
      id: dimension.id,
      question: dimension.question,
      label: dimension.labels.get(answers[dimension.id]) ?? answers[dimension.id],
    }),
  )
}

/**
 * Compose the link back to the questionnaire, carrying the answers already
 * given so the visitor lands on their own result rather than on a blank first
 * question.
 *
 * Parameters are emitted in question declaration order and only when answered,
 * so one view has exactly one address. With nothing answered the bare route is
 * returned, which is the questionnaire's own starting point.
 *
 * @param {Record<string, string>} answers - The validated answers.
 * @returns {string} An in-app path for `Button`'s `to` prop.
 */
function questionnaireHref(answers) {
  const params = new URLSearchParams()
  for (const dimension of ANSWER_DIMENSIONS) {
    const value = answers[dimension.id]
    if (value) params.set(dimension.id, value)
  }
  const query = params.toString()
  return query ? `${LEARNING_PATH_ROUTE}?${query}` : LEARNING_PATH_ROUTE
}

/**
 * Resolve saved slugs into catalogue records, preserving save order.
 *
 * Save order is the visitor's own order and is what `useSavedCourses`
 * guarantees, so it is never re-sorted here. A slug that resolves to no course
 * is dropped rather than rendered.
 *
 * @param {ReadonlyArray<string>|unknown} slugs - The hook's saved list.
 * @returns {object[]} The matching course records, by reference.
 */
function resolveSavedCourses(slugs) {
  if (!Array.isArray(slugs)) return []
  /** @type {object[]} */
  const resolved = []
  for (const slug of slugs) {
    const course = COURSE_BY_SLUG.get(slug)
    if (course) resolved.push(course)
  }
  return resolved
}

/**
 * Compose a course's meta line from the fields the record actually carries.
 *
 * `level` is absent on nine of the ten catalogue records today and `duration` is
 * optional in the contract, so an absent value leaves no separator behind rather
 * than reading as "· ·".
 *
 * @param {{category?: string, duration?: string, level?: string}} course - A course record.
 * @returns {string} The meta line, or `''` when the record carries none of the three.
 */
function courseMeta(course) {
  return [course?.category, course?.duration, course?.level]
    .filter((value) => typeof value === 'string' && value.trim() !== '')
    .join(' · ')
}

/**
 * The saved-course count, phrased for the panel's polite live region.
 *
 * Singular and plural are both spelled out, and the zero case is a real
 * sentence rather than "0 courses", so the announcement is readable whichever
 * way the count moves.
 *
 * @param {number} count - How many saved courses the panel renders.
 * @returns {string} The count sentence.
 */
function describeSavedCount(count) {
  if (count === 0) return 'No courses saved in this browser'
  if (count === 1) return '1 course saved in this browser'
  return `${count} courses saved in this browser`
}

/**
 * Choose the one course the next-step panel highlights, and record where it came
 * from so the panel can say so.
 *
 * Saved first, because a save is a deliberate, durable act by the visitor and
 * AAP §0.5.2 states that this panel highlights the FIRST saved course. The
 * best-matching recommendation is the fallback when nothing is saved but the
 * address carries answers. With neither, `null` — and the panel renders its own
 * empty state rather than inventing a suggestion, a deadline or any urgency.
 *
 * @param {object[]} savedCourses - The resolved saved records, in save order.
 * @param {{course?: object}[]} recommendations - The scored recommendations, best first.
 * @returns {{course: object, source: 'saved'|'path'}|null} The highlighted course and its origin.
 */
function resolveNextStep(savedCourses, recommendations) {
  const [firstSaved] = savedCourses
  if (firstSaved) return { course: firstSaved, source: 'saved' }

  const [bestMatch] = recommendations
  if (bestMatch && bestMatch.course) return { course: bestMatch.course, source: 'path' }

  return null
}

// Where the highlighted next step came from, stated to the visitor. Keyed by the
// `source` {@link resolveNextStep} reports, so the sentence can never disagree
// with the derivation that produced it. Both sentences describe REAL local state
// and neither asserts urgency, a deadline, a place in a queue or an outcome.
const NEXT_STEP_SOURCE = {
  saved: 'The first course you saved in this browser — the rest of your saved list is above.',
  path: 'Nothing is saved yet, so this is the course that best matches the questionnaire answers carried in this page’s address.',
}

/**
 * The route to the institute's admission form, pre-selected for one course.
 *
 * `/admission?course=<Title>` is an established deep link: `src/pages/Admission.jsx`
 * validates the title against the catalogue and pre-selects only a known course,
 * so an unknown value degrades to the plain form. `courses[].title` is a public
 * contract, which is why the title — not the slug — is what this link carries.
 *
 * @param {{title?: string}} course - The course to pre-select.
 * @returns {string} The admission route, with the course parameter when there is a title to send.
 */
function admissionHref(course) {
  const title = typeof course?.title === 'string' ? course.title.trim() : ''
  return title ? `/admission?course=${encodeURIComponent(title)}` : '/admission'
}

/**
 * Decide whether a panel record from the data module can be rendered.
 *
 * The collection is treated as untrusted, exactly as `src/components/common/FAQ.jsx`
 * treats its `items` prop: a record needs a usable `id` to resolve its body and a
 * usable `title` to head its card, and anything else is skipped rather than
 * rendered as an empty surface.
 *
 * @param {unknown} panel - A candidate panel record.
 * @returns {boolean} `true` when the record can be rendered.
 */
function isRenderablePanel(panel) {
  if (!panel || typeof panel !== 'object') return false
  if (typeof panel.id !== 'string' || panel.id === '') return false
  return typeof panel.title === 'string' && panel.title !== ''
}

/**
 * Report how many catalogue courses the scored answers admitted.
 *
 * Count-derived and claim-free: it reports an arithmetic fact about the
 * catalogue and the four rules, and says nothing about accuracy, popularity,
 * suitability or what other learners chose — there is no model here, only the
 * fixed additive rule in `src/lib/recommend.js`, and each card below lists the
 * rules that actually fired for it.
 *
 * @param {number} count - How many recommendations the panel renders.
 * @returns {string} The count sentence.
 */
function describeMatchCount(count) {
  if (count === 1) return '1 course in the catalogue matches the answers above.'
  return `${count} courses in the catalogue match the answers above.`
}

/**
 * Read a course's detail route, when the record can address one.
 *
 * `courses[].slug` is a public contract and the `/courses/:slug` route segment,
 * so a record carrying one links to its own page; a record without one gets no
 * link at all rather than a broken `/courses/undefined`.
 *
 * @param {{slug?: string}} course - The course record.
 * @returns {string|null} The detail route, or `null` when the record has no slug.
 */
function courseDetailHref(course) {
  const slug = typeof course?.slug === 'string' ? course.slug.trim() : ''
  return slug ? `/courses/${slug}` : null
}

/**
 * One scored recommendation, rendered as a card inside the learning-path panel.
 *
 * The card shows only what the scoring genuinely produced: the course's own
 * title and meta fields, and one line per rule that fired — read from the
 * `reasons` the recommender returns, never composed here, so a future
 * server-side explanation drops in unchanged. Nothing is added about accuracy or
 * outcomes, and a course with no reasons (not reachable under the current rule,
 * which requires at least one) renders the title alone rather than an empty
 * heading.
 *
 * `Card as="li"` because the caller renders these inside a `<ul>`, matching the
 * learning-path results grid.
 *
 * @param {object} props
 * @param {{course: object, reasons?: string[]}} props.entry - One entry from `recommendCourses`.
 * @returns {import('react').ReactElement} The recommendation card.
 */
function RecommendationCard({ entry }) {
  const { course } = entry
  const meta = courseMeta(course)
  const detailHref = courseDetailHref(course)
  const reasons = Array.isArray(entry.reasons)
    ? entry.reasons.filter((reason) => typeof reason === 'string' && reason.trim() !== '')
    : []

  return (
    <Card as="li" className="flex min-w-0 flex-col gap-4">
      <div className="min-w-0">
        <h3 className={CARD_TITLE}>{course.title}</h3>
        {meta ? <p className="mt-1 break-words text-xs text-muted">{meta}</p> : null}
      </div>

      {reasons.length > 0 ? (
        <div className="min-w-0">
          <h4 className={CARD_SUBLABEL}>Why this matched</h4>
          <ul className={CARD_LIST}>
            {reasons.map((reason) => (
              <li key={reason} className="break-words">
                {reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {detailHref ? (
        // `mt-auto` pins the action to the bottom edge, so cards of different
        // heights in the same row still line their controls up.
        <div className="mt-auto flex flex-wrap gap-3">
          <Button
            size="sm"
            to={detailHref}
            aria-label={`View the full course details for ${course.title}`}
          >
            View course
          </Button>
        </div>
      ) : null}
    </Card>
  )
}

/**
 * The one course the next-step panel highlights, with where it came from.
 *
 * Deliberately flat and tinted (`bg-surface`, no elevation) so the panel looks
 * the same whether it is showing this card or its own empty state — the two
 * states of one panel, not two different surfaces. The origin sentence is read
 * from {@link NEXT_STEP_SOURCE} by the `source` the derivation reported, so the
 * card can never claim a provenance the derivation did not produce.
 *
 * No urgency is manufactured anywhere in here: no deadline, no countdown, no
 * "last few seats", no place in a queue. The two actions are the two real ones —
 * read the course, or start an enquiry about it.
 *
 * @param {object} props
 * @param {{slug?: string, title: string, category?: string, duration?: string, level?: string}} props.course
 *   The highlighted course record.
 * @param {'saved'|'path'} props.source - Which derivation chose it.
 * @returns {import('react').ReactElement} The next-step card.
 */
function NextStepCard({ course, source }) {
  const meta = courseMeta(course)
  const detailHref = courseDetailHref(course)
  // Own-property lookup rather than a bare index, so a `source` that happens to
  // name an Object.prototype member cannot resolve to an inherited function.
  const origin = Object.hasOwn(NEXT_STEP_SOURCE, source) ? NEXT_STEP_SOURCE[source] : ''

  return (
    <Card
      as="article"
      className="flex min-w-0 flex-col gap-4 bg-surface shadow-none hover:shadow-none"
    >
      <div className="min-w-0">
        <h3 className={CARD_TITLE}>{course.title}</h3>
        {meta ? <p className="mt-1 break-words text-xs text-muted">{meta}</p> : null}
      </div>

      {origin ? <p className="text-sm leading-relaxed text-muted">{origin}</p> : null}

      <div className="mt-auto flex flex-wrap gap-3">
        {detailHref ? (
          <Button
            size="sm"
            to={detailHref}
            aria-label={`View the full course details for ${course.title}`}
          >
            View course
          </Button>
        ) : null}
        <Button
          size="sm"
          variant="outline"
          to={admissionHref(course)}
          aria-label={`Start an admission enquiry about ${course.title}`}
        >
          Enquire about this course
        </Button>
      </div>
    </Card>
  )
}

function Dashboard() {
  // ---- hooks, all unconditional and at the top level -----------------------
  // `react/rules-of-hooks` is an ERROR in .oxlintrc.json, and every branch in
  // this component sits BELOW this block. Only the getter half of
  // `useSearchParams` is taken: this page READS the four answers and never
  // writes them — `/learning-path` owns that contract, and a dashboard that
  // rewrote the address would fight the link that brought the visitor here.
  const [searchParams] = useSearchParams()

  // The saved list, the clear action and the durability flag, from the one
  // module-level store every surface shares. `saved` and `persisted` arrive
  // together in a single frozen snapshot, so the list and its disclosure can
  // never be rendered out of step. `toggle` and `isSaved` belong to the course
  // cards and are deliberately not read here.
  const { saved, clear, persisted } = useSavedCourses()

  // Clearing removes the control that was clicked, which would drop focus to
  // <body>. The panel heading is the nearest stable ancestor of the removed
  // control, so focus lands there instead — the same "move focus somewhere
  // sensible" discipline the shell applies to <main> and the admission form
  // applies to its result panels.
  const savedHeadingRef = useRef(null)

  // ONE instant for the whole page, captured deliberately on mount: the event
  // partition below and every <EventCard>'s own badge and actions are classified
  // against this same Date, so no two surfaces here can disagree across a
  // midnight boundary. Not module scope, which would freeze the clock at import
  // time for the session; not a bare `new Date()` in the render body, which
  // would re-partition on every pass and hand a new object to every child.
  const now = useMemo(() => new Date(), [])

  // READ THEN VALIDATE. `searchParams` is a stable reference between
  // navigations, so this memo recomputes exactly when the address changes.
  const answers = useMemo(() => readAnswers(searchParams), [searchParams])

  // The answered questions, in question order — the visible recap, and the test
  // for "did the address carry a result at all", which is what separates the
  // honest "no path result yet" state from "these answers matched nothing".
  const selections = useMemo(() => resolveSelections(answers), [answers])

  // Pure, deterministic and memoised on its own input: the same address always
  // produces the same ranked list, which is what makes a shared link
  // reproducible. With no accepted answer nothing can reach the relevance
  // threshold, so this is `[]` — a real, expected result, never an error.
  const recommendations = useMemo(() => recommendCourses(answers, courses), [answers])

  // Saved slugs resolved to catalogue records, in save order.
  const savedCourses = useMemo(() => resolveSavedCourses(saved), [saved])

  // The REAL upcoming group, derived by comparing each event's own date with
  // today's civil day. `partitionEvents` never mutates or reorders the shared
  // `events` array, and 'today' counts as upcoming; a past event therefore
  // cannot appear here, and so cannot offer registration or a calendar export.
  const upcomingEvents = useMemo(() => partitionEvents(events, now).upcoming, [now])

  // Back to the questionnaire carrying the answers already given, so "change
  // your answers" lands on the visitor's own result rather than on a blank
  // first question.
  const answersHref = useMemo(() => questionnaireHref(answers), [answers])

  const nextStep = useMemo(
    () => resolveNextStep(savedCourses, recommendations),
    [savedCourses, recommendations],
  )

  // The frame: render order, headings, blurbs and empty copy all come from the
  // data module, treated as untrusted. `studentDashboardDemo` is a static import
  // and therefore a stable reference, so this is derived once for the life of
  // the component.
  const panels = useMemo(
    () =>
      Array.isArray(studentDashboardDemo?.panels)
        ? studentDashboardDemo.panels.filter(isRenderablePanel)
        : [],
    [],
  )

  const handleClearSaved = useCallback(() => {
    // The hook removes the one stored key and notifies every subscriber, so the
    // card toggles, the header count and this panel change together. It never
    // calls localStorage.clear(), which would destroy unrelated keys.
    clear()
    // Focus follows the removed control to the panel heading, which carries
    // tabIndex={-1} for exactly this purpose.
    savedHeadingRef.current?.focus()
  }, [clear])

  const notice = typeof studentDashboardDemo?.notice === 'string' ? studentDashboardDemo.notice : ''

  /**
   * Resolve one panel's body from its `id`.
   *
   * The five ids are a public contract, and each case reads from the owner named
   * in the module JSDoc and nowhere else. Every branch ends in either real
   * content or that panel's own `EmptyState` built from its authored
   * `emptyTitle`/`emptyBody` — there is no path through this function that
   * renders an empty container. Called directly rather than mounted as a
   * component, and it calls no hooks, so hook order is unaffected.
   *
   * @param {{id: string, emptyTitle?: string, emptyBody?: string}} panel - The panel record.
   * @returns {import('react').ReactNode} The panel body.
   */
  function renderPanelBody(panel) {
    // Own-property lookup: a panel id naming an Object.prototype member cannot
    // resolve to an inherited function and be rendered as an icon.
    const icon = Object.hasOwn(PANEL_ICONS, panel.id) ? PANEL_ICONS[panel.id] : undefined

    switch (panel.id) {
      // ---- SAVED — genuinely persistent, this device only -----------------
      case 'saved':
        return (
          <>
            {/* The count, visible AND polite: one element does both jobs, so a
                save or a clear is announced without a duplicate sr-only copy
                and without moving focus. Always mounted — a live region added to
                the DOM at the same time as its text is unreliable. PAGE-LOCAL:
                the shell's route-title announcer keeps its single meaning. */}
            <p role="status" aria-live="polite" aria-atomic="true" className="text-xs text-muted">
              {describeSavedCount(savedCourses.length)}
            </p>

            {persisted ? null : (
              /* The write was refused — storage denied by policy or an
                 extension, a full store, or private browsing where the quota is
                 effectively zero. The selection is still live for this session,
                 so the interface does not regress mid-session; what changes is
                 that the visitor is TOLD it will not survive a reload rather
                 than discovering it later. Token-only caution pairing
                 (`bg-secondary-50` with `text-secondary-800`), the same one
                 `EmptyState`'s caution tone uses. `role="status"` is polite on
                 purpose: this is a disclosure, not an alert, and it must not
                 interrupt. */
              <p role="status" className="rounded-lg bg-secondary-50 p-4 text-sm text-secondary-800">
                This browser would not store your saved list — private browsing
                and a full storage area both do that — so the list is live for
                this visit only and will not survive a reload. Saving still
                works while this page stays open.
              </p>
            )}

            {savedCourses.length > 0 ? (
              <>
                {/* The shared catalogue grid with pre-filtered `items`: one
                    course-card implementation across the site, so the save
                    toggle, the compare toggle and the destination on these cards
                    are the same ones the catalogue renders. No filter surface —
                    a saved list is already the visitor's own selection. */}
                <CourseGrid items={savedCourses} />

                <div className="flex flex-wrap gap-3">
                  {/* Clearing the WHOLE list, which is what
                      src/pages/PrivacyPolicy.jsx promises a visitor can do on
                      this page: "clear the whole list on the My Learning page".
                      Removing this control would make published copy false. */}
                  <Button type="button" variant="outline" onClick={handleClearSaved}>
                    Clear saved courses
                  </Button>
                  <Button variant="outline" to="/courses">
                    Browse all courses
                  </Button>
                </div>
              </>
            ) : (
              <EmptyState
                tone="neutral"
                icon={icon}
                headingAs="h3"
                title={panel.emptyTitle}
                description={panel.emptyBody}
                action={<Button to="/courses">Browse courses</Button>}
              />
            )}
          </>
        )

      // ---- PATH — read from the URL and nowhere else -----------------------
      case 'path':
        return (
          <>
            {selections.length === 0 ? (
              /* No answers in the address, so there is nothing to work out.
                 This is what a bare /dashboard shows, by design: the result is
                 not remembered anywhere, and the link on the questionnaire's
                 result is what carries it here. */
              <EmptyState
                tone="neutral"
                icon={icon}
                headingAs="h3"
                title={panel.emptyTitle}
                description={panel.emptyBody}
                action={<Button to={LEARNING_PATH_ROUTE}>Answer the four questions</Button>}
              />
            ) : (
              <>
                {/* The recap: the visitor's own answers, in the order the
                    questionnaire asks them, with both the question wording and
                    the answer wording read from src/data/learningPaths.js — so
                    no identifier ever reaches the screen and the result can be
                    checked against the answers that produced it. */}
                <dl className="grid gap-4 sm:grid-cols-2">
                  {selections.map((selection) => (
                    <div key={selection.id} className="min-w-0">
                      <dt className="break-words text-xs text-muted">{selection.question}</dt>
                      <dd className="mt-1 break-words text-sm font-semibold text-foreground">
                        {selection.label}
                      </dd>
                    </div>
                  ))}
                </dl>

                {recommendations.length > 0 ? (
                  <>
                    <p className="text-sm text-muted">
                      {describeMatchCount(recommendations.length)}
                    </p>

                    <ul className="m-0 grid list-none gap-6 p-0 sm:grid-cols-2 lg:grid-cols-3">
                      {recommendations.map((entry) => (
                        // `slug` is a public contract and present on every
                        // catalogue record; the title backs it up so a
                        // hand-edited record can never render an undefined key.
                        <RecommendationCard
                          key={entry.course.slug ?? entry.course.title}
                          entry={entry}
                        />
                      ))}
                    </ul>

                    <div className="flex flex-wrap gap-3">
                      <Button variant="outline" to={answersHref}>
                        Change your answers
                      </Button>
                    </div>
                  </>
                ) : (
                  /* Answers WERE carried here, and the catalogue admits none of
                     them — a different outcome from "no result yet", so it gets
                     its own explanation and its own next steps. The answers are
                     echoed back as text by React, so an echoed value cannot
                     inject markup. Nothing is substituted for the empty list:
                     no "closest match", no fallback course. */
                  <EmptyState
                    tone="neutral"
                    icon={icon}
                    headingAs="h3"
                    title="No course matches those answers"
                    description={`Nothing in the catalogue matches every answer carried in this page’s address (${selections
                      .map((selection) => selection.label)
                      .join(', ')}). Widening the narrowest answer usually brings courses back into range, and the full catalogue is always open.`}
                    action={
                      <>
                        <Button to={answersHref}>Change your answers</Button>
                        <Button variant="outline" to="/courses">
                          Browse all courses
                        </Button>
                      </>
                    }
                  />
                )}
              </>
            )}

            {JOURNEY_ITEMS.length > 0 ? (
              /* The canonical six-stage journey — ONE definition, shared with
                 the ten course detail routes, which is exactly why
                 src/data/studentDashboard.js carries no stage labels of its own.
                 Introduced by a paragraph rather than a heading, so the stages'
                 own <h3> titles nest directly under this panel's <h2> and no
                 heading level is skipped. */
              <div className="min-w-0">
                <p className="text-sm leading-relaxed text-muted">
                  These are the six stages every CIBLE course follows, from a
                  first browse to completing the course — the same six shown on
                  each course page.
                </p>
                <Timeline items={JOURNEY_ITEMS} className="mt-6 max-w-3xl" />
              </div>
            ) : null}
          </>
        )

      // ---- EVENTS — the real records, grouped by their own dates -----------
      case 'events':
        return upcomingEvents.length > 0 ? (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {upcomingEvents.map((event) => (
                // The card owns its lifecycle badge, its `/events/<slug>` detail
                // link and which actions it may offer; `now` is this page's
                // single instant, so the card's own classification matches the
                // partition that selected it. Nothing is gated from here.
                <EventCard key={event.slug ?? event.title} event={event} now={now} />
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <Button variant="outline" to="/events">
                See all events
              </Button>
            </div>
          </>
        ) : (
          <EmptyState
            tone="neutral"
            icon={icon}
            headingAs="h3"
            title={panel.emptyTitle}
            description={panel.emptyBody}
            action={
              <>
                <Button to="/events">See all events</Button>
                <Button variant="outline" to="/contact">
                  Ask what is planned
                </Button>
              </>
            }
          />
        )

      // ---- NEXT STEP — derived from the two panels above -------------------
      case 'nextStep':
        return nextStep ? (
          <NextStepCard course={nextStep.course} source={nextStep.source} />
        ) : (
          <EmptyState
            tone="neutral"
            icon={icon}
            headingAs="h3"
            title={panel.emptyTitle}
            description={panel.emptyBody}
            action={
              <>
                <Button to="/courses">Browse courses</Button>
                <Button variant="outline" to={LEARNING_PATH_ROUTE}>
                  Find your learning path
                </Button>
              </>
            }
          />
        )

      // ---- ENQUIRY — nothing to show, and that is the honest answer --------
      case 'enquiry':
        // There is no enquiry state to render: the forms hand a draft to the
        // visitor's own WhatsApp or email app, and this website's knowledge ends
        // at that handoff. So this panel's EMPTY STATE IS ITS CONTENT — it says
        // so in plain words and offers the two real affordances. No status, no
        // reference number and no badge implying a round trip is rendered here,
        // ever (AAP §0.5.2).
        return (
          <EmptyState
            tone="neutral"
            icon={icon}
            headingAs="h3"
            title={panel.emptyTitle}
            description={panel.emptyBody}
            action={
              <>
                <Button to="/admission">Open the admission form</Button>
                <Button variant="outline" to="/contact">
                  Contact CIBLE
                </Button>
              </>
            }
          />
        )

      default:
        // An id this page has no branch for — only reachable if the data module
        // gains a sixth panel without the matching branch here. Its own authored
        // empty copy still renders, so the surface explains itself instead of
        // showing an empty card.
        return (
          <EmptyState
            tone="neutral"
            headingAs="h3"
            title={panel.emptyTitle}
            description={panel.emptyBody}
          />
        )
    }
  }

  return (
    <>
      {/* noindex, and deliberately NO canonical — so neither a canonical link
          nor an og:url is emitted. The shared structured-data component is not
          imported by this module at all: this route emits no JSON-LD, not even
          BreadcrumbList (see the head-treatment note above). */}
      <Seo
        title="My Learning"
        noindex
        description="The frontend foundation for a CIBLE learner area — your saved courses and learning-path result, read from this browser and this page’s address. Nothing is tracked."
      />

      {/* Page header — the tinted band pattern /admission and /success-stories
          already use, carrying the trail, the page's single <h1> and the
          standing disclosure. */}
      <section className="bg-surface py-16 md:py-20">
        <Container>
          <Breadcrumbs items={crumbs} className="mb-6" />
          <SectionHeading
            as="h1"
            align="left"
            eyebrow="Frontend Foundation"
            title="My Learning"
            subtitle="Your saved courses and your learning-path result, read from this browser and from this page’s address. There is nothing to sign in to, and nothing here is tracked."
          />

          {notice ? (
            /* gate="always" — AND THIS IS THE ONLY CALL SITE ON THE SITE THAT
               PASSES IT (AAP §0.6.5). Every other disclosure uses the default
               `gate="content"` and retires itself when
               siteConfig.representativeContent is cleared, which is right for
               copy awaiting the institute's confirmation. This notice is not
               awaiting anything: the absence of an account, of authentication
               and of a server is an ARCHITECTURAL FACT, and confirming the
               institute's course details does not change it. DO NOT "fix" this
               back to the content gate — doing so would silently delete the only
               statement telling a visitor that this surface does not track a
               real enrolment, at precisely the moment the site starts looking
               finished. Hand-rolling a second role="note" block here instead was
               considered and rejected as duplication; this one additive prop is
               why the codebase still has exactly ONE disclosure component. */
            <RepresentativeNote gate="always" className="mt-8 max-w-4xl">
              {notice}
            </RepresentativeNote>
          ) : null}
        </Container>
      </section>

      {/* The five panels, in the data module's own declared order */}
      <Container as="section" className="py-16 md:py-20">
        {panels.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2">
            {panels.map((panel) => {
              // The saved panel's heading is the focus target after a clear, so
              // it — and only it — carries the ref and tabIndex.
              const isSavedPanel = panel.id === 'saved'

              return (
                <Card
                  key={panel.id}
                  as="section"
                  className={cn(
                    'flex min-w-0 flex-col gap-4',
                    // The three collection panels take the full measure from
                    // `md` up: the grids inside them switch on VIEWPORT width,
                    // so a half-measure column would squeeze three course cards
                    // into about 170px each at 1280px.
                    FULL_WIDTH_PANELS.has(panel.id) && 'md:col-span-2',
                  )}
                >
                  <div className="min-w-0">
                    <h2
                      ref={isSavedPanel ? savedHeadingRef : undefined}
                      tabIndex={isSavedPanel ? -1 : undefined}
                      className="text-xl font-bold text-foreground"
                    >
                      {panel.title}
                    </h2>
                    {panel.blurb ? (
                      // Every panel says where its contents came from. The
                      // transparency is the feature, so this is never dropped.
                      <p className="mt-2 text-sm leading-relaxed text-muted">{panel.blurb}</p>
                    ) : null}
                  </div>

                  {renderPanelBody(panel)}
                </Card>
              )
            })}
          </div>
        ) : (
          /* Defensive: only reachable if the data module's panel list is
             malformed. An explanation and two working next steps, never a blank
             region. */
          <EmptyState
            tone="neutral"
            headingAs="h2"
            className="max-w-3xl"
            title="My Learning has nothing to show"
            description="The panels for this page could not be read, so there is nothing to display here. The course catalogue, the events list and the admission form are unaffected and all still work."
            action={
              <>
                <Button to="/courses">Browse courses</Button>
                <Button variant="outline" to="/contact">
                  Contact CIBLE
                </Button>
              </>
            }
          />
        )}
      </Container>

      {/* The shared trust band — one of the four surfaces that composes it. No
          `sections` prop: it defaults to the canonical set in src/data/trust.js.
          `headingAs="h2"` because this page's own title is the <h1>. */}
      <TrustSection headingAs="h2" />

      <CTASection />
    </>
  )
}

export default Dashboard

