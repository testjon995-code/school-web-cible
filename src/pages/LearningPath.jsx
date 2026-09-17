/**
 * LearningPath — CIBLE School of Language "Find Your Learning Path" page
 * (route `/learning-path`).
 *
 * A four-question course-guidance route: the visitor answers what they want to
 * achieve, where they are starting from, how much time they can give and which
 * kind of learning they are after, and the page shows which courses in
 * `src/data/courses.js` may be relevant — each one carrying the matches that
 * produced it. It is lazy-loaded by the application route table in
 * `src/App.jsx`
 * (`const LearningPath = lazyWithRetry(() => import('./pages/LearningPath.jsx'))`,
 * `<Route path="learning-path" element={<LearningPath />} />`) and rendered
 * inside the shared `<Layout>`, so this module renders ONLY page content — the
 * persistent Navbar, Footer and floating conversion widgets belong to the shell.
 * This module registers no route of its own and exports nothing but the page.
 *
 * ===========================================================================
 * WHAT THIS IS, AND WHAT IT IS NOT — READ BEFORE EDITING ANY STRING
 * ===========================================================================
 * The suggestions come from `recommendCourses` in `src/lib/recommend.js`, which
 * is a fixed additive sum over the shipped catalogue: +3 when the course lists
 * the chosen goal, +2 when its level equals the chosen level or is
 * `'All levels'`, +2 when its duration band matches the chosen time commitment,
 * +1 when its category matches the chosen kind of learning, with ties broken on
 * catalogue source order so the ranking is stable across runs.
 *
 * The chosen goal is the single HARD constraint: a course is eligible only when
 * `Array.isArray(course.goals) && course.goals.includes(answers.goal)`, and an
 * ineligible course is dropped however well it matches everything else. Because
 * that gate has already removed every course that did not match, its +3 shifts
 * the whole surviving set by the same constant and cannot discriminate between
 * two survivors — so qualification is measured on the rules that do: the
 * minimum relevance of 3 is earned from level, duration band and category, which
 * is exactly "at least two of those three". The returned score still reports the
 * full total including the goal's +3, because that is what orders the results.
 * That reading is the scorer's own documented contract, and it is what makes the
 * plan's worked no-match case genuinely reachable: with `?goal=`
 * `interview-preparation&level=Advanced&time=upto-1-month&mode=Science`, the
 * goal gate admits only courses outside the Science track, `upto-1-month` is
 * shorter than any authored duration and `Advanced` matches no record, so no
 * survivor reaches the minimum and the result is honestly empty.
 *
 * There is no server behind this page, no model, no profile of the visitor and
 * no tailoring of any kind — the whole rule is the sum above, and the same
 * answers always produce the same ranking in the same order. So NOTHING here —
 * copy, heading, label, comment or JSDoc — may present this as machine
 * cognition, a prediction, or a result computed about the person rather than
 * about the catalogue. That vocabulary would describe software this repository
 * does not contain, which is exactly the claim the client-only boundary exists
 * to prevent, and the copy audit greps this file for it. State the rule
 * positively instead: every suggestion shows the matches that produced it.
 *
 * ===========================================================================
 * THE FOUR ANSWERS LIVE IN THE URL, AND THIS PAGE OWNS THEM
 * ===========================================================================
 * Holding the answers in the address is the feature rather than an
 * implementation detail: it makes a result shareable and reproducible, so a
 * reader of the address can see exactly which answers produced it, and a fresh
 * load of the same URL reproduces the identical ranking because the rule is
 * deterministic. It also means the page keeps no answer state of its own and
 * needs no store: the address IS the state, and `<LearningPathWizard>` is
 * stateless over it (it owns only which screen is showing).
 *
 * One single-valued parameter per question, each read with
 * `URLSearchParams.get` — never `getAll`, because none of these questions is
 * multi-select — and each validated against an allowlist owned by the module
 * that declares those values:
 *
 *   ?goal=<id>      goal ids from `src/data/goals.js`
 *   ?level=<value>  the course level literals, from `LEVELS` in
 *                   `src/lib/courseFilters.js`
 *   ?time=<id>      duration band ids, from `DURATION_BAND_IDS` in
 *                   `src/lib/courseFilters.js`
 *   ?mode=<value>   the `courses[].category` literals, derived from
 *                   `src/data/courses.js` (no module exports that union, so it
 *                   is read off the catalogue rather than restated here)
 *
 * No allowlist is written as a literal in this file, so a value added to or
 * removed from one of those modules changes what this route accepts without a
 * second edit here — and a value can never be offered by the questionnaire yet
 * rejected by the route, or the reverse. An unrecognised value is DROPPED
 * rather than rendered, so a hand-edited or stale URL degrades to the
 * unanswered state instead of showing an option that does not exist. Neither
 * name collides with an existing deep link: `?course=` belongs to `/admission`
 * and `?event=` to `/contact`, and neither is read here.
 *
 * ── WRITE DISCIPLINE ───────────────────────────────────────────────────────
 * Every write is ONE batched
 * `setSearchParams(next, { replace: true, preventScrollReset: true })`:
 *   • `replace` so answering four questions leaves one history entry instead of
 *     four, and Back returns to wherever the visitor came from;
 *   • `preventScrollReset` so choosing an answer does not throw the page back
 *     to the top mid-questionnaire;
 *   • batched, and built from the COMPLETE next state, because
 *     `setSearchParams` in react-router 7.18.1 does not queue within a tick —
 *     two writes in one tick would lose one another, so the functional-updater
 *     form is deliberately NOT used.
 * The next query is composed in question declaration order from the already
 * validated answers, which canonicalises the address on the first real change:
 * an unrecognised or oddly ordered set of parameters resolves to exactly one
 * spelling of the view rather than several. A write that would produce the
 * identical query string is skipped, so re-choosing the option already selected
 * costs no navigation.
 *
 * ===========================================================================
 * NO CURATED PATH SHIPS TODAY, AND THE RANKED LIST IS STILL THE WHOLE OUTCOME
 * ===========================================================================
 * `learningPaths` in `src/data/learningPaths.js` is an EMPTY ARRAY, because a
 * suggested ordering of courses is a pedagogical claim and the repository holds
 * no approved one. That is the shipping configuration and not a gap: the flat
 * ranked list of individual courses, each with the matches that produced it, IS
 * the complete and honest result of this route. A curated sequence is an
 * enhancement over it and never a precondition for it, so nothing on this page
 * announces a missing path, and no placeholder stands in for one.
 *
 * ===========================================================================
 * COMPOSITION, AND THE ONE HAND-OFF LINK
 * ===========================================================================
 *   1. <Seo>            — title, description, and an explicit canonical: this
 *                         route IS indexable (its questionnaire and the
 *                         explanation band below are authored content), unlike
 *                         `/compare`, `/search` and `/dashboard`, so it passes a
 *                         `canonical` and deliberately passes NO `noindex`.
 *   2. <StructuredData> — BreadcrumbList JSON-LD, and nothing else. It is built
 *                         from the SAME `crumbs` array that feeds the visible
 *                         trail, so the two cannot drift. No Course block (the
 *                         catalogue page and the course detail routes own that),
 *                         no FAQPage, and — per the content-truthfulness rule —
 *                         no rating, review, offer or credential of any kind.
 *   3. Page header      — <Breadcrumbs> and the page's single <h1>
 *                         (<SectionHeading as="h1">).
 *   4. Questionnaire    — <LearningPathWizard>, which owns the whole visible
 *                         questionnaire and result presentation: the progress
 *                         indicator, one real radio group per question, focus
 *                         movement and the polite announcement on every
 *                         transition, the verbatim results sentence, each
 *                         result's reasons and prerequisites, its next step to
 *                         `/courses/<slug>`, the navigational hand-off to
 *                         `/dashboard`, and its own no-match empty state. This
 *                         page passes `questions`, `answers`, `onAnswer` and
 *                         `results` and restates none of that copy.
 *   5. Explanation band — how a course qualifies, in plain words, from the
 *                         question set itself rather than from a second copy of
 *                         it. This is the authored content that makes the bare
 *                         URL worth indexing.
 *   6. <CTASection>     — the reusable admission call to action that closes
 *                         every page of this site.
 *
 * ── THE HAND-OFF TO `/dashboard` IS RENDERED EXACTLY ONCE, BY THE WIZARD ────
 * The result panel carries a "View this result on My Learning" link that puts
 * the same four answers on `/dashboard`, so arriving that way reproduces this
 * recommendation from the address. It is deliberately NAVIGATIONAL and NOT a
 * save: nothing is persisted, a bare reload of `/dashboard` will not show it,
 * and calling it a save would be a claim the implementation does not honour.
 * This page introduces no storage key — `cible:saved-courses:v1` is the only
 * key this work creates, and a second one for path answers was explicitly
 * refused; the accepted trade-off is the honest empty state on a bare
 * `/dashboard`.
 *
 * That link belongs to the RESULT PANEL, and the result panel is the wizard's
 * screen: `LearningPathWizard` renders it gated on its own resolved result
 * count, beside "Back to the questions". This page therefore renders NO second
 * copy, on purpose and after checking. A page-level copy could only be gated on
 * "some course matches", which is true the moment a goal is answered — so it
 * would appear underneath question two, inviting the visitor to "view this
 * result" before any result has been shown, and two such links must never
 * render at once. If a future change moves the hand-off out of the wizard, add
 * it here gated on `results.length > 0` and delete it there in the same edit,
 * so exactly one always exists.
 *
 * ===========================================================================
 * ACCESSIBILITY AND DESIGN SYSTEM
 * ===========================================================================
 * Exactly one <h1> (the page header). The questionnaire region is introduced by
 * a visually hidden <h2> so the wizard's own result heading and result cards
 * nest as h2 -> h3 with no skipped level, which is the same technique the
 * events and courses grids already use. Keyboard operation, focus movement, the
 * step announcement and the 44px targets all arrive from the composed
 * primitives — `RadioGroup`, `Stepper`, `Button` — and from the single global
 * `:focus-visible` rule, and none of them is re-declared here.
 *
 * Every class resolves to a Tailwind v4 `@theme` token from `src/index.css` or
 * to a stock utility on the project's 8px spacing scale: no hardcoded value, no
 * arbitrary bracket value, no new token and no new utility, so `src/index.css`
 * carries no diff. There is no gradient, no glass effect and no decorative
 * motion on this page: a questionnaire that moves focus on every transition has
 * nothing to gain from animation.
 *
 * @returns {import('react').ReactElement} The rendered Learning Path page.
 */
import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

import CTASection from '../components/common/CTASection.jsx'
import LearningPathWizard from '../components/common/LearningPathWizard.jsx'
import Seo from '../components/seo/Seo.jsx'
import StructuredData from '../components/seo/StructuredData.jsx'
import Breadcrumbs from '../components/ui/Breadcrumbs.jsx'
import Container from '../components/ui/Container.jsx'
import SectionHeading from '../components/ui/SectionHeading.jsx'
import { courses } from '../data/courses.js'
import { goals } from '../data/goals.js'
import { learningPathQuestions } from '../data/learningPaths.js'
import { DURATION_BAND_IDS, LEVELS } from '../lib/courseFilters.js'
import { recommendCourses } from '../lib/recommend.js'

// Breadcrumb trail for this page. Module-local (never exported) and shared by
// both the visible <Breadcrumbs> and the BreadcrumbList JSON-LD via
// <StructuredData>, so the trail on screen and the trail a crawler reads can
// never disagree. Shape: { name, path }.
const crumbs = [
  { name: 'Home', path: '/' },
  { name: 'Find Your Learning Path', path: '/learning-path' },
]

/**
 * The `courses[].category` literals, in catalogue declaration order.
 *
 * The `?mode=` allowlist. `src/data/courses.js` owns this union in its `Course`
 * typedef but exports no array of it, so it is READ OFF the catalogue here
 * rather than restated as four string literals: a category added to or renamed
 * in the catalogue then changes what this route accepts with no second edit,
 * and a value can never be offered by the questionnaire yet rejected here.
 * Non-string and empty values are skipped so a malformed record cannot put an
 * unusable value into the allowlist.
 *
 * @type {ReadonlyArray<string>}
 */
const CATEGORY_VALUES = Object.freeze([
  ...new Set(
    courses
      .map((course) => (course && typeof course === 'object' ? course.category : null))
      .filter((category) => typeof category === 'string' && category !== ''),
  ),
])

/**
 * The allowlist that owns each question's values, keyed by question id.
 *
 * The ids themselves come from `learningPathQuestions`; this map only says
 * WHICH module declares the legal values for each of them, which is the one
 * thing the question set cannot state about itself. A question id absent from
 * this map falls back to its own declared option values (see
 * {@link allowlistFor}), so an added question is validated rather than silently
 * accepting anything.
 *
 * @type {Readonly<Record<string, ReadonlyArray<string>>>}
 */
const ALLOWLIST_BY_QUESTION = Object.freeze({
  goal: Object.freeze(goals.map((goal) => goal.id)),
  level: LEVELS,
  time: DURATION_BAND_IDS,
  mode: CATEGORY_VALUES,
})

/**
 * The option values one question actually offers.
 *
 * Used as the fallback allowlist for a question no canonical module claims.
 *
 * @param {unknown} question - A `learningPathQuestions` entry.
 * @returns {ReadonlyArray<string>} Its non-empty option values, or `[]`.
 */
function optionValues(question) {
  const options =
    question && typeof question === 'object' && Array.isArray(question.options)
      ? question.options
      : []
  return Object.freeze(
    options
      .map((option) => (option && typeof option === 'object' ? option.value : option))
      .filter((value) => typeof value === 'string' && value !== ''),
  )
}

/**
 * The allowlist for one question: the owning module's list where there is one,
 * and the question's own options otherwise.
 *
 * The lookup is an OWN-property check rather than a bare index, so a question
 * whose id happens to name an `Object.prototype` member cannot resolve to an
 * inherited function and be used as an allowlist.
 *
 * @param {{id: string}} question - A renderable question.
 * @returns {ReadonlyArray<string>} The legal values for that question.
 */
function allowlistFor(question) {
  if (Object.hasOwn(ALLOWLIST_BY_QUESTION, question.id)) {
    return ALLOWLIST_BY_QUESTION[question.id]
  }
  return optionValues(question)
}

/**
 * The URL dimensions this route owns: one per question, in the order the
 * questions are asked, each with the allowlist that validates it.
 *
 * Derived once at module load — the question set is static build-time data, so
 * there is nothing to recompute per render. An entry with no usable string `id`
 * is dropped, because a parameter with no name cannot be read from a URL.
 *
 * @type {ReadonlyArray<{id: string, allowlist: ReadonlyArray<string>}>}
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
    .map((question) => Object.freeze({ id: question.id, allowlist: allowlistFor(question) })),
)

/**
 * Read the four answers out of the address, validating every one.
 *
 * Read then validate, never trust: a value is accepted only when the module
 * that declares that question's values lists it. Anything else — a typo, a
 * renamed id from an old shared link, a hand-edited experiment — is DROPPED, so
 * the question reads as unanswered and imposes no constraint on the scoring
 * rule. Surrounding whitespace is trimmed first, so `?level=%20Beginner`
 * resolves to the same view as `?level=Beginner` rather than to nothing.
 *
 * @param {URLSearchParams} params - The current query parameters.
 * @returns {Record<string, string>} The accepted answers, keyed by question id.
 *   A question with no accepted value is absent rather than empty.
 */
function readAnswers(params) {
  /** @type {Record<string, string>} */
  const answers = {}
  for (const { id, allowlist } of ANSWER_DIMENSIONS) {
    const raw = params.get(id)
    if (typeof raw !== 'string') continue
    const value = raw.trim()
    if (value !== '' && allowlist.includes(value)) answers[id] = value
  }
  return answers
}

/**
 * Compose the complete next query from the current answers plus one change.
 *
 * The whole next state is built here and written once by the caller, because
 * `setSearchParams` does not queue within a tick. Parameters are emitted in
 * question declaration order and only when answered, which is what gives one
 * view exactly one canonical address.
 *
 * @param {Record<string, string>} answers - The current validated answers.
 * @param {string} questionId - The question being answered.
 * @param {string} value - The chosen value; `''` (or an unrecognised value)
 *   clears that answer.
 * @returns {URLSearchParams} The complete next query.
 */
function nextSearchParams(answers, questionId, value) {
  const next = new URLSearchParams()
  for (const { id, allowlist } of ANSWER_DIMENSIONS) {
    let answer = answers[id] ?? ''
    if (id === questionId) {
      const candidate = typeof value === 'string' ? value.trim() : ''
      answer = candidate !== '' && allowlist.includes(candidate) ? candidate : ''
    }
    if (answer !== '') next.set(id, answer)
  }
  return next
}

function LearningPath() {
  // `useSearchParams` is called unconditionally at the top level, as the rules
  // of hooks require (and as the lint gate enforces as an error).
  const [searchParams, setSearchParams] = useSearchParams()

  // The four answers, read from the address and validated on the way in. The
  // memo is keyed on `searchParams`, whose reference is stable between
  // navigations, so the object identity changes only when the address does —
  // which matters because the wizard memoises its own derived values on it.
  const answers = useMemo(() => readAnswers(searchParams), [searchParams])

  // The ranked suggestions for those answers: a fixed additive sum over the
  // shipped catalogue, deterministic and stable in order, returning `[]` when
  // nothing clears the minimum relevance. See the module header for the rule
  // and for what this deliberately is not.
  const results = useMemo(() => recommendCourses(answers), [answers])

  /**
   * Record one answer in the address.
   *
   * The wizard reports a chosen option — or an empty string to clear one, which
   * is how its "show results without …" control widens the search — and this is
   * where that becomes the page's state, because the address IS the state. The
   * complete next query is composed first and written exactly ONCE; a write
   * that would not change the query string is skipped entirely.
   *
   * @param {string} questionId - The question being answered.
   * @param {string} value - The chosen value, or `''` to clear the answer.
   * @returns {void}
   */
  const handleAnswer = useCallback(
    (questionId, value) => {
      // An id this route does not own cannot become a parameter: it would be a
      // query key nothing validates and nothing reads back.
      if (!ANSWER_DIMENSIONS.some((dimension) => dimension.id === questionId)) return
      const next = nextSearchParams(answers, questionId, value)
      if (next.toString() === searchParams.toString()) return
      setSearchParams(next, { replace: true, preventScrollReset: true })
    },
    [answers, searchParams, setSearchParams],
  )

  return (
    <>
      <Seo
        title="Find Your Learning Path"
        canonical="/learning-path"
        description="Answer four questions — your main goal, your current level, how much time you can dedicate, and the type of learning you are interested in — to see which CIBLE courses may be relevant, with the matches behind every suggestion."
      />
      <StructuredData breadcrumbs={crumbs} />

      {/* Page header */}
      <Container as="section" className="py-12 md:py-16">
        <Breadcrumbs items={crumbs} className="mb-6" />
        <SectionHeading
          as="h1"
          align="left"
          eyebrow="Course Guidance"
          title="Find Your Learning Path"
          subtitle="Four questions — your goal, your current level, the time you can give and the kind of learning you want. Your answers stay in this page's address, so a result can be shared or opened again exactly as it was."
        />
      </Container>

      {/* Questionnaire and its results */}
      <Container as="section" className="pb-16 md:pb-20">
        {/* Visually hidden, so the wizard's own results heading and its result
            cards nest under an <h2> and the outline steps h1 -> h2 -> h3 with no
            skipped level — the same technique the events and courses grids use —
            without stating the section a second time on screen. */}
        <h2 className="sr-only">Learning path questionnaire</h2>
        {/* A capped, centred measure. A question's options and a result's
            reasons are prose, and prose set across the full 1280px container
            reads poorly; this is the measure the admission form already uses. */}
        <div className="mx-auto max-w-3xl">
          <LearningPathWizard
            questions={learningPathQuestions}
            answers={answers}
            onAnswer={handleAnswer}
            results={results}
          />
        </div>
      </Container>

      {/* How this works — the authored explanation that makes the bare URL
          worth indexing, and this page's own plain account of the rule. */}
      <section className="bg-surface py-16 md:py-20">
        <Container>
          <SectionHeading
            eyebrow="How This Works"
            title="Where these suggestions come from"
            subtitle="A fixed rule compares your four answers with the course records on this site. Nothing is guessed, so the same answers always produce the same suggestions in the same order."
          />
          <div className="mx-auto mt-10 grid max-w-4xl gap-8 md:grid-cols-2">
            <div>
              <h3 className="text-lg font-semibold text-foreground">The four questions</h3>
              {/* Listed from the question set itself, so this summary and the
                  questions actually asked above cannot drift apart. */}
              <ol className="m-0 mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted">
                {learningPathQuestions.map((question) => (
                  <li key={question.id}>{question.label}</li>
                ))}
              </ol>
              {/* Accurate about the rule rather than merely encouraging: the
                  relevance a course needs is earned from the level, time and
                  track answers, so an unanswered question genuinely leaves the
                  rule with less to credit. Saying it "widens the search" would
                  be the opposite of what the scorer does. */}
              <p className="mt-4 text-sm leading-relaxed text-muted">
                Answering all four is what produces suggestions: each answer is
                something a course can be matched against, and a question left
                unanswered gives the rule nothing to credit. You can go back and
                change any answer at any time.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">How a course qualifies</h3>
              <ul className="m-0 mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted">
                <li>
                  The goal you choose must be listed on the course itself. A
                  course that does not carry it is never suggested, however well
                  it matches everything else.
                </li>
                <li>
                  A matching starting level, a matching time commitment and a
                  matching subject track each add to a course&rsquo;s relevance,
                  and a course has to clear a fixed minimum to be shown at all.
                </li>
                <li>
                  Every suggestion lists the matches that produced it, so you can
                  see why it appears and judge it for yourself.
                </li>
                <li>
                  When no course clears that minimum we say so, and point you to
                  the full course list and to our team. A suggestion is never
                  invented to fill the space.
                </li>
              </ul>
            </div>
          </div>
          <p className="mx-auto mt-8 max-w-4xl text-sm leading-relaxed text-muted">
            Your answers are held in the address of this page and nowhere else:
            nothing is saved to your device and nothing is sent anywhere, so we
            only know what you are looking for when you get in touch.
          </p>
        </Container>
      </section>

      <CTASection />
    </>
  )
}

export default LearningPath
