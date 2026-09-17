import { useLayoutEffect, useMemo, useRef, useState } from 'react'

import Button from '../ui/Button.jsx'
import Card from '../ui/Card.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import RadioGroup from '../ui/RadioGroup.jsx'
import SectionHeading from '../ui/SectionHeading.jsx'
import Stepper from '../ui/Stepper.jsx'
import { courses } from '../../data/courses.js'
import { goals } from '../../data/goals.js'
import { learningPathQuestions, learningPaths } from '../../data/learningPaths.js'
import { cn } from '../../lib/cn.js'
import { recommendCourses } from '../../lib/recommend.js'

/**
 * LearningPathWizard — the four-question learning-path questionnaire and the
 * ranked, self-explaining results it presents, for the CIBLE School of Language
 * SPA. It is the whole visible surface of `/learning-path`, and it is rendered
 * by `src/pages/LearningPath.jsx`, which owns the answers.
 *
 * ===========================================================================
 * TWO COPY RULES. THEY ARE CONTRACTUAL. READ THEM BEFORE EDITING ANY STRING.
 * ===========================================================================
 *
 * 1. The results are introduced by EXACTLY this sentence, character for
 *    character, and it lives in {@link TRANSPARENCY_SENTENCE} so there is one
 *    copy of it:
 *
 *        "Based on your selections, these courses may be relevant."
 *
 *    Not paraphrased, not re-punctuated, not upgraded to "these courses are
 *    perfect for you". The hedge IS the point: a fixed scoring rule can report
 *    which of its rules fired, and it cannot know whether a course is right for
 *    a person. Softening or strengthening that sentence misrepresents what the
 *    code behind it actually does.
 *
 * 2. Nothing in this file — heading, label, hint, button, comment or JSDoc —
 *    may claim machine cognition, a model, a profile of the visitor, or
 *    tailoring of any kind. There is no such thing behind this screen:
 *    `src/lib/recommend.js` is a deterministic additive score (+3 goal,
 *    +2 level, +2 duration band, +1 category, minimum relevance 3, ties broken
 *    on catalogue source order). Dressing that up in the vocabulary of machine
 *    cognition would be precisely the dishonesty the client-only boundary
 *    exists to prevent, and the copy audit greps for it.
 *
 *    The rule is stated positively instead, and it is the feature: EVERY result
 *    shows the rules that produced it. `recommendCourses` returns a
 *    `reasons: string[]` per result — "Matches your goal: …", "Suited to a …
 *    starting point", "Fits about …", "In the … track you chose" — and this
 *    component renders those sentences AS GIVEN. It does not summarise them,
 *    re-order them, re-rank them, or generate prose around them.
 *
 * ===========================================================================
 * THE ANSWERS LIVE IN THE URL. THIS COMPONENT IS STATELESS OVER THEM.
 * ===========================================================================
 * `src/pages/LearningPath.jsx` holds the four answers as the query parameters
 * `?goal=`, `?level=`, `?time=`, `?mode=` — one per question `id` — and passes
 * them down as `answers`, together with an `onAnswer` callback and the `results`
 * the scorer produced. That is what makes a recommendation shareable and
 * reproducible: a reader of the address can see exactly which answers produced
 * the result, and a fresh load of the same URL reproduces it exactly, because
 * the scorer is deterministic.
 *
 * So this component NEVER holds an answer in local state and NEVER calls
 * `useSearchParams`. The only state it owns is presentation: which question is
 * on screen, and the text currently in its polite region. Two consequences
 * worth knowing:
 *   • Moving back re-reads the answer from the props, so nothing is lost. The
 *     stored answer is reflected onto the native radios by the effect below.
 *   • Selection is reported upward through `onAnswer(questionId, value)`, and
 *     an EMPTY STRING clears an answer — which is how the no-match state's
 *     "relax one answer" control widens the search.
 *
 * ===========================================================================
 * WHY A REAL RADIO GROUP, AND WHY THE GROUP IS UNCONTROLLED
 * ===========================================================================
 * Each question is a `RadioGroup`: a real `<fieldset>` with a real `<legend>`
 * over native same-name `<input type="radio">` controls. Four behaviours must
 * come from the platform rather than from hand-written ARIA — group semantics,
 * a group label, single selection, and arrow-key traversal that MOVES AND
 * SELECTS — and a row of `aria-pressed` buttons supplies none of them. This is
 * the one place in this codebase where a radio group is required rather than
 * merely preferred.
 *
 * `RadioGroup` spreads its remaining props onto EVERY radio (that is how
 * react-hook-form's `register` result reaches all of them), so a per-option
 * `checked` cannot be expressed through it: one `checked` would land on all
 * options at once. The group is therefore UNCONTROLLED, and the answer held in
 * the URL is reflected onto it by setting `.checked` on each radio in the
 * transition effect. That is deliberate, not a workaround looking for a fix —
 * it keeps `RadioGroup` free of a second selection model, and the DOM's own
 * checked state stays the single source of what is selected on screen.
 *
 * The question text is the `<legend>`, so it is the group's accessible name and
 * is announced with every option. It is styled up to the panel-title step
 * through a child `<span>` rather than by restyling the legend, so the question
 * reads as the screen's subject without a second copy of it as a heading — one
 * question on screen, stated once.
 *
 * ===========================================================================
 * FOCUS MOVES DELIBERATELY, AND THIS COMPONENT OWNS THE ANNOUNCEMENT
 * ===========================================================================
 * A transition that left focus on a now-unmounted Next control would strand
 * both keyboard and screen-reader users, so every transition moves focus:
 *   • to a question → the group's checked radio, or its first radio. Focusing a
 *     radio reads the legend (the question), then the option and its position,
 *     which is the most useful announcement available on a question screen.
 *     Focusing an unchecked radio does NOT select it.
 *   • to the results → the results heading block, which carries `tabIndex={-1}`
 *     and is not otherwise focusable.
 * The very first render deliberately does NOT move focus (`initialFocusSkipped`
 * below): arriving on a page must never yank focus from wherever the visitor
 * already is.
 *
 * `Stepper` deliberately owns no live region, so the step change is announced
 * by THIS component's own visually hidden polite region — one region, mounted
 * at the root and never unmounted, so a change to it is always announced. The
 * shell's title-mirroring announcer in `src/components/layout/Layout.jsx` keeps
 * its single existing meaning (route changes) and is never repurposed here.
 *
 * ===========================================================================
 * `learningPaths` SHIPS EMPTY, AND THE FLAT RANKED LIST IS THE WHOLE OUTCOME
 * ===========================================================================
 * `learningPaths` in `src/data/learningPaths.js` is an EMPTY ARRAY, because a
 * suggested ordering of courses is a pedagogical claim and the repository holds
 * no approved one. That is the shipping configuration, not an edge case, so
 * this component is designed for it: the ranked list of individual courses,
 * each with the rules that matched, IS the complete and honest result. The
 * curated-path block is an enhancement over it and never a precondition for it.
 *
 * Therefore, when no path applies — because none is defined, or because no
 * path's `goals` include the answered goal — this component renders the ranked
 * list and says NOTHING about a missing path. There is no placeholder path
 * card, no "no path found" message and no heading for an empty section:
 * nothing is missing, so nothing is claimed.
 *
 * ===========================================================================
 * WHAT IS RENDERED FROM THE RECORD, AND WHAT IS OMITTED
 * ===========================================================================
 * A result card shows the course title, a short meta line, the `reasons` as
 * given, that course's own `prerequisites`, and one next step to
 * `/courses/<slug>`. `prerequisites` is a RECORD FIELD and free-text prose for
 * display only — it is never matched, filtered or scored, and it is not
 * generated here. It is absent on all ten catalogue records today, and an
 * absent optional field is omitted CLEANLY: no empty heading, no "not
 * specified" filler, no invented sentence.
 *
 * The hand-off at the foot of the results is deliberately navigational: "View
 * this result on My Learning" carries the four answers to `/dashboard`, and it
 * is NOT a save. Nothing is persisted, and a bare reload of `/dashboard` will
 * not show this result — calling it a save would be a claim the implementation
 * does not honour.
 *
 * ===========================================================================
 * THE NO-MATCH BRANCH IS REAL, REACHABLE AND VERIFIED
 * ===========================================================================
 * Because of the minimum relevance threshold and the hard goal constraint, an
 * empty result set is genuinely producible. The named case is
 *
 *     { goal: 'interview-preparation', level: 'Advanced',
 *       time: 'upto-1-month',          mode: 'Science' }   →   []
 *
 * because the goal gate admits only courses whose `goals` include interview
 * preparation (none of which sit in the Science track), `upto-1-month` matches
 * no course in the catalogue at all, and `Advanced` matches none either — so no
 * survivor reaches the threshold.
 *
 * That renders a NEUTRAL empty state: no course matching a combination of
 * answers is a legitimate outcome, not a failure. It explains that nothing in
 * the catalogue matches, and offers three next steps — the full catalogue,
 * contact, and an actionable offer to relax the narrowest answer. "Narrowest"
 * is measured, not guessed: see {@link buildRelaxation}. Nothing is ever
 * fabricated to fill the space — no "popular courses" fallback, no lowered
 * threshold, and no sub-threshold course presented as if it had matched. A
 * degenerate or malformed catalogue reaches the same state, because
 * `recommendCourses` returns `[]` rather than throwing.
 *
 * ===========================================================================
 * DESIGN SYSTEM
 * ===========================================================================
 * Every class resolves to a Tailwind v4 `@theme` token from `src/index.css` or
 * to a stock utility: there are no hardcoded or arbitrary bracket values, no
 * new token and no new utility, so `src/index.css` carries no diff. The
 * primitives do the work — `Stepper`, `RadioGroup`, `SectionHeading`, `Card`,
 * `Button` and `EmptyState` — so this file re-declares neither the 44px touch
 * target nor the focus ring, both of which arrive from `Button`'s base class
 * and from the single global `:focus-visible` rule. Colour never carries state
 * on its own, and there is no gradient, no glass effect, no decorative
 * animation and no reveal: a wizard that moves focus on every transition has
 * nothing to gain from motion, and adds none.
 *
 * @param {object} props
 * @param {Array<{id: string, label?: string, options: Array<{value: string, label?: string}>}>} [props.questions=learningPathQuestions]
 *   The questions to ask, in order. Defaults to the shipped set so the
 *   component is never rendered without one. Entries that are not objects, or
 *   carry no string `id` or no non-empty `options` array, are dropped rather
 *   than rendered as an unanswerable step.
 * @param {Record<string, string>} [props.answers] The current answers, keyed by
 *   question `id` — owned by the page and read from the URL. A missing or
 *   empty-string value means "not answered", which imposes no constraint on the
 *   scorer.
 * @param {(questionId: string, value: string) => void} [props.onAnswer] Called
 *   when the visitor chooses an option, and called with an EMPTY STRING to
 *   clear an answer (the "relax one answer" control). The page is expected to
 *   write the value into the URL; this component holds no answer of its own.
 * @param {Array<{course: object, score: number, reasons: string[]}>} [props.results]
 *   The scorer's output for `answers`. Presentation is this component's job and
 *   scoring is not, so the array is rendered as given. When it is absent or not
 *   an array the component consults `recommendCourses(answers)` itself rather
 *   than claiming that nothing matched — a view must never report an empty
 *   result it did not actually obtain.
 * @param {string} [props.className] Extra classes merged LAST onto the root
 *   via {@link cn}, so a caller's utility wins.
 * @param {object} [props] Any other props (`id`, `aria-*`, `data-*`, …) are
 *   forwarded to the root element.
 * @returns {import('react').ReactElement} The questionnaire, or its results.
 */

/**
 * The results introduction, verbatim. One copy, referenced once — see copy
 * rule 1 in the header before touching it.
 */
const TRANSPARENCY_SENTENCE = 'Based on your selections, these courses may be relevant.'

/**
 * Short step titles, keyed by question `id`.
 *
 * These are PRESENTATION labels for the progress indicator and the polite
 * announcement, not a rewording of the questions: the question itself is always
 * asked in its own authored wording, as the group's `<legend>`. A horizontal
 * row of four full questions cannot render at 320px, which is why the indicator
 * needs a short form at all. An id that is not listed here falls back to the
 * question's own label, so an added question still renders correctly.
 *
 * Module-local and NOT exported, so this file's only export stays the component
 * (`react/only-export-components`).
 */
const STEP_TITLES = {
  goal: 'Your goal',
  level: 'Your current level',
  time: 'Your time commitment',
  mode: 'Type of learning',
}

// One honest sentence per question group, announced with the group through
// RadioGroup's `aria-describedby` wiring. It promises nothing and explains the
// one thing a visitor cannot see: that an answer is not final.
const QUESTION_HINT = 'Choose one option. You can change it later.'

// Shared class recipes, so the two screens cannot drift apart. `min-w-0` is not
// cosmetic on the step root: a `<fieldset>` carries a UA `min-width:
// min-content` that Tailwind's preflight does not reset, which would push a long
// option label past a 320px viewport.
const SCREEN_ROOT = 'flex min-w-0 flex-col gap-6'

// A card's own title, and the small sub-label above a list inside it. The
// sub-label reuses the eyebrow treatment `SectionHeading` already establishes.
const CARD_TITLE = 'text-lg font-semibold text-foreground break-words'
const CARD_SUBLABEL = 'text-xs font-semibold uppercase tracking-wide text-muted'
const CARD_LIST = 'm-0 mt-2 flex list-none flex-col gap-1 p-0 text-sm leading-relaxed text-muted'

/**
 * Is this entry a question this component can actually ask?
 *
 * A malformed entry is dropped rather than rendered, because a step with no
 * options would render an empty screen with a Next button and no way to answer
 * (`RadioGroup` itself returns `null` when it has no renderable option).
 *
 * @param {unknown} question - Candidate entry of the `questions` array.
 * @returns {boolean} `true` when the entry can be rendered as a step.
 */
function isRenderableQuestion(question) {
  return (
    Boolean(question) &&
    typeof question === 'object' &&
    !Array.isArray(question) &&
    typeof question.id === 'string' &&
    question.id !== '' &&
    Array.isArray(question.options) &&
    question.options.length > 0
  )
}

/**
 * Is this entry a recommendation this component can actually render?
 *
 * The two fields the presentation cannot do without are the course's `slug`
 * (the next step's destination) and its `title` (the card's heading and every
 * action's accessible name). An entry missing either is dropped rather than
 * rendered as a nameless card linking nowhere.
 *
 * @param {unknown} entry - Candidate entry of the `results` array.
 * @returns {boolean} `true` when the entry can be rendered as a result card.
 */
function isRenderableResult(entry) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return false
  const { course } = /** @type {{course?: unknown}} */ (entry)
  return (
    Boolean(course) &&
    typeof course === 'object' &&
    typeof course.slug === 'string' &&
    course.slug !== '' &&
    typeof course.title === 'string' &&
    course.title !== ''
  )
}

/**
 * Read one answer, tolerating anything the page might hand over.
 *
 * Only a non-empty string counts as answered: an absent answer, an empty one,
 * or a value of any other type imposes no constraint on the scorer and must not
 * be reported as a selection.
 *
 * @param {unknown} answers - The `answers` prop.
 * @param {string} id - The question id to read.
 * @returns {string} The answer, or `''` when the question is unanswered.
 */
function answerFor(answers, id) {
  if (!answers || typeof answers !== 'object') return ''
  const value = /** @type {Record<string, unknown>} */ (answers)[id]
  return typeof value === 'string' && value !== '' ? value : ''
}

/**
 * The short step title for a question.
 *
 * The lookup is an OWN-property check rather than a bare index, so a question
 * whose id happens to name an `Object.prototype` member cannot resolve to an
 * inherited function and be rendered as a label.
 *
 * @param {unknown} question - The question record.
 * @param {number} [index=0] - Its position, used only for the last-resort label.
 * @returns {string} A short, non-empty label.
 */
function stepTitle(question, index = 0) {
  const id = question && typeof question === 'object' ? question.id : ''
  if (typeof id === 'string' && Object.hasOwn(STEP_TITLES, id)) return STEP_TITLES[id]
  const label = question && typeof question === 'object' ? question.label : ''
  if (typeof label === 'string' && label.trim()) return label.trim()
  return `Step ${index + 1}`
}

/**
 * The visitor-facing label for an answered value.
 *
 * Falls back to the raw value, so a hand-edited URL that survived the page's
 * allowlist validation still reads as something rather than as nothing. Values
 * are compared as strings because that is what the DOM submits.
 *
 * @param {unknown} question - The question the value answers.
 * @param {string} value - The answered value.
 * @returns {string} The option's label, or the value itself.
 */
function optionLabelFor(question, value) {
  const options =
    question && typeof question === 'object' && Array.isArray(question.options) ? question.options : []
  const match = options.find((option) => option && String(option.value) === value)
  if (match && typeof match.label === 'string' && match.label.trim()) return match.label.trim()
  return value
}

/**
 * The options for one question, with the goal question's per-option hints.
 *
 * `learningPathQuestions` carries the four questions and their values; the
 * one-sentence description of each learner goal is owned by
 * `src/data/goals.js`, so the goal question's hints are read from there rather
 * than restated. Every other question's options pass through untouched.
 *
 * @param {{id: string, options: Array<{value: string, label?: string}>}} question
 * @returns {Array<{value: string, label?: string, description?: string}>} Options
 *   ready for `RadioGroup`.
 */
function optionsForQuestion(question) {
  const options = Array.isArray(question.options) ? question.options : []
  if (question.id !== 'goal') return options
  return options.map((option) => {
    if (!option || typeof option !== 'object') return option
    const goal = goals.find((candidate) => candidate.id === option.value)
    return goal ? { ...option, description: goal.description } : option
  })
}

/**
 * The polite-region sentence for a result set.
 *
 * @param {number} count - How many courses matched.
 * @returns {string} One sentence, hedged exactly as the results themselves are.
 */
function resultCountSentence(count) {
  if (count === 0) return 'No course in the catalogue matches your selections.'
  if (count === 1) return '1 course may be relevant to your selections.'
  return `${count} courses may be relevant to your selections.`
}

/**
 * Trim a record's string list down to what can actually be rendered.
 *
 * @param {unknown} value - Candidate array of strings.
 * @returns {string[]} The non-empty strings, or `[]`.
 */
function stringList(value) {
  if (!Array.isArray(value)) return []
  return value.filter((entry) => typeof entry === 'string' && entry.trim() !== '')
}

/**
 * The questions this component can actually ask, in the order given.
 *
 * @param {unknown} questions - The `questions` prop.
 * @returns {Array<{id: string, label?: string, options: Array<{value: string, label?: string}>}>}
 */
function renderableQuestions(questions) {
  return Array.isArray(questions) ? questions.filter(isRenderableQuestion) : []
}

/**
 * Which screen a visitor should land on, derived ONCE from the answers they
 * arrived with.
 *
 * Arriving with every question answered — which is what a shared result URL
 * looks like — lands on the results directly, so the address reproduces the
 * recommendation rather than the first question. Arriving with a partial set
 * lands on the first question still unanswered. Arriving with none lands on the
 * first question.
 *
 * This is deliberately derived once, in the state initialiser, and not on every
 * render: re-deriving it would auto-advance the screen the instant a visitor
 * answered the question in front of them, which is not what a Next control is
 * for.
 *
 * @param {unknown} questions - The `questions` prop.
 * @param {unknown} answers - The `answers` prop.
 * @returns {number} A question index, or the question count for the results.
 */
function initialStepIndex(questions, answers) {
  const list = renderableQuestions(questions)
  const firstUnanswered = list.findIndex((question) => answerFor(answers, question.id) === '')
  return firstUnanswered === -1 ? list.length : firstUnanswered
}

/**
 * Find the curated path that applies to an answered goal, if any.
 *
 * `learningPaths` ships EMPTY, so today this always returns `null` and the
 * results are the flat ranked list — which is the complete, honest outcome, not
 * a degraded one. The lookup is written for the day records arrive, and it
 * requires a usable `title`: a record without one would render as an untitled
 * block, so it is skipped exactly as an unresolvable course slug is.
 *
 * @param {string} goalId - The answered goal id, or `''`.
 * @returns {{id?: string, title: string, description?: string, courseSlugs?: string[]}|null}
 */
function findCuratedPath(goalId) {
  if (!goalId) return null
  const paths = Array.isArray(learningPaths) ? learningPaths : []
  return (
    paths.find(
      (path) =>
        Boolean(path) &&
        typeof path === 'object' &&
        typeof path.title === 'string' &&
        path.title.trim() !== '' &&
        Array.isArray(path.goals) &&
        path.goals.includes(goalId),
    ) ?? null
  )
}

/**
 * Which single answer is the narrowest — MEASURED, not guessed.
 *
 * The no-match state must offer to relax the narrowest answer, and "narrowest"
 * has to mean something checkable. So each answered dimension is probed in
 * turn: the scorer is re-run with that one answer removed, and the removal that
 * would yield the MOST courses is the narrowest constraint. Ties keep the
 * earlier question, so the offer is deterministic for a given answer set.
 *
 * A removal that still yields nothing is not offered, because a control that
 * changes the screen to the same empty state is not a next step. When no single
 * removal helps — which is exactly the case for the named no-match tuple in the
 * header — this returns `null` and the empty state offers to change the answers
 * instead. Nothing is invented to fill the gap either way.
 *
 * MEASURED PROPERTY OF THE CURRENT SCORER, worth knowing but deliberately NOT
 * hard-coded here: today only the GOAL answer can ever win this probe. The
 * other three rules only ADD weight, so dropping one can never raise a score —
 * whereas the goal is also the hard constraint, and its weight is excluded from
 * the relevance threshold, so dropping it admits courses that were gated out
 * without lowering anyone's relevance. Verified against the shipped catalogue:
 * `{goal: 'computer-skills', level: 'Beginner', time: '1-3-months', mode:
 * 'English'}` returns nothing and yields five courses once the goal is removed,
 * while the named no-match tuple in the header yields nothing under every one
 * of the four removals. The loop still probes all four rather than shortcutting
 * to the goal, because the offer must stay true to whatever the scorer does
 * rather than to what it does today.
 *
 * The probe is cheap and deliberately unmemoised beyond its caller: it is at
 * most four passes over a ten-record catalogue of pre-resolved values.
 *
 * @param {Array<{id: string}>} questionList - The renderable questions.
 * @param {unknown} answers - The current answers.
 * @returns {{question: {id: string, label?: string}, value: string, count: number}|null}
 */
function buildRelaxation(questionList, answers) {
  let best = null
  for (const question of questionList) {
    const value = answerFor(answers, question.id)
    if (!value) continue
    const probe = {}
    for (const other of questionList) {
      if (other.id === question.id) continue
      const otherValue = answerFor(answers, other.id)
      if (otherValue) probe[other.id] = otherValue
    }
    const count = recommendCourses(probe).length
    if (count > 0 && (best === null || count > best.count)) {
      best = { question, value, count }
    }
  }
  return best
}

/**
 * One curated path, rendered above the individual results when it applies.
 *
 * Module-local, so this file's only export stays the wizard itself. It renders
 * the path's own authored title, description and ordered course sequence, and
 * nothing else: no progress, no duration total and no claim about where the
 * sequence leads. A slug that no longer resolves to a catalogue record is
 * skipped rather than rendered as an empty row.
 *
 * @param {object} props
 * @param {{title: string, description?: string, courseSlugs?: string[]}} props.path
 *   The path record, already confirmed to carry a usable title.
 * @returns {import('react').ReactElement} The curated-path card.
 */
function CuratedPathCard({ path }) {
  const slugs = Array.isArray(path.courseSlugs) ? path.courseSlugs : []
  const pathCourses = slugs
    .map((slug) => courses.find((course) => course.slug === slug))
    .filter((course) => Boolean(course))
  const [firstCourse] = pathCourses

  return (
    <Card className="flex min-w-0 flex-col gap-4">
      <div className="min-w-0">
        <h3 className={CARD_TITLE}>{path.title}</h3>
        {typeof path.description === 'string' && path.description.trim() ? (
          <p className="mt-2 break-words text-sm leading-relaxed text-muted">{path.description}</p>
        ) : null}
      </div>

      {pathCourses.length ? (
        // A path is a SEQUENCE, so it is an ordered list and the numbers are
        // the content rather than decoration.
        <ol className="m-0 flex list-decimal flex-col gap-1 pl-5 text-sm leading-relaxed text-foreground">
          {pathCourses.map((course) => (
            <li key={course.slug} className="break-words">
              {course.title}
            </li>
          ))}
        </ol>
      ) : null}

      {firstCourse ? (
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            size="sm"
            to={`/courses/${firstCourse.slug}`}
            aria-label={`Start this path with ${firstCourse.title}`}
          >
            Start with {firstCourse.title}
          </Button>
        </div>
      ) : null}
    </Card>
  )
}

/**
 * One recommendation: the course, the rules that matched, its own
 * prerequisites, and one next step.
 *
 * Module-local for the same reason as {@link CuratedPathCard}. Three rules
 * govern what appears here:
 *   • `reasons` are rendered AS GIVEN by `src/lib/recommend.js`. They are not
 *     re-worded, re-ordered or summarised, and no reason is added.
 *   • `prerequisites` is a RECORD FIELD — free-text prose for display only,
 *     never matched or filtered — and it is absent on all ten catalogue records
 *     today, so the block is omitted entirely rather than rendered empty or
 *     filled with a stand-in sentence.
 *   • the action names its course in its accessible name, following the
 *     established `CourseCard` / `EventCard` pattern, because a grid of
 *     identically labelled "View course" controls is unusable by voice or by
 *     screen reader.
 *
 * The score itself is deliberately NOT shown. It is an internal weight with no
 * meaning to a visitor, and a number on a card reads as a rating; the reasons
 * are the honest, legible form of the same information.
 *
 * @param {object} props
 * @param {{course: {slug: string, title: string, category?: string, duration?: string, level?: string, prerequisites?: string[]}, reasons?: string[]}} props.entry
 *   One entry of the scorer's output, already confirmed renderable.
 * @returns {import('react').ReactElement} The recommendation card.
 */
function RecommendationCard({ entry }) {
  const { course } = entry
  const reasons = stringList(entry.reasons)
  const prerequisites = stringList(course.prerequisites)
  // The meta line is composed only from fields the record actually carries:
  // `level` is absent on nine of the ten records today, and a missing value
  // leaves no separator behind rather than reading as "· ·".
  const meta = stringList([course.category, course.duration, course.level]).join(' · ')

  return (
    <Card as="li" className="flex min-w-0 flex-col gap-4">
      <div className="min-w-0">
        <h3 className={CARD_TITLE}>{course.title}</h3>
        {meta ? <p className="mt-1 break-words text-xs text-muted">{meta}</p> : null}
      </div>

      {reasons.length ? (
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

      {prerequisites.length ? (
        <div className="min-w-0">
          <h4 className={CARD_SUBLABEL}>Prerequisites</h4>
          <ul className={CARD_LIST}>
            {prerequisites.map((item) => (
              <li key={item} className="break-words">
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* `mt-auto` keeps the action on the bottom edge of every card in the
          grid, so two cards of different heights still line their controls up. */}
      <div className="mt-auto flex flex-wrap gap-3">
        <Button
          size="sm"
          to={`/courses/${course.slug}`}
          aria-label={`View the full course details for ${course.title}`}
        >
          View course
        </Button>
      </div>
    </Card>
  )
}

function LearningPathWizard({
  questions = learningPathQuestions,
  answers,
  onAnswer,
  results,
  className,
  ...props
}) {
  // ---- presentation state, and nothing else -------------------------------
  // The answers are the page's, held in the URL. The only things owned here are
  // which screen is showing and what the polite region is currently saying.
  const [stepIndex, setStepIndex] = useState(() => initialStepIndex(questions, answers))
  const [announcement, setAnnouncement] = useState('')

  const stepRef = useRef(null)
  const resultsRef = useRef(null)
  // Set by a deliberate transition and consumed by the layout effect below.
  // It starts FALSE, which is what stops the first render stealing focus from
  // wherever the visitor already is.
  const pendingFocusRef = useRef(false)

  const questionList = useMemo(() => renderableQuestions(questions), [questions])
  const total = questionList.length

  // `stepIndex` is clamped on read rather than corrected in state, so a
  // `questions` array that shrinks between renders cannot leave the wizard
  // pointing at a step that no longer exists. `total` is the results screen.
  const step = Math.min(Math.max(stepIndex, 0), total)
  const showResults = step >= total
  const currentQuestion = showResults ? null : questionList[step]
  const currentAnswer = currentQuestion ? answerFor(answers, currentQuestion.id) : ''

  // Presentation is this component's job; scoring is not. The provided array is
  // rendered as given. The fallback exists so this view can never report "no
  // course matches" without having actually consulted the scorer — a false
  // statement is worse than a missing prop.
  const resolvedResults = useMemo(() => {
    const provided = Array.isArray(results) ? results : recommendCourses(answers ?? {})
    return provided.filter(isRenderableResult)
  }, [results, answers])
  const resultCount = resolvedResults.length

  // The answers actually given, in question order — used for the visible recap,
  // the dashboard hand-off and the "nothing answered yet" branch.
  const answeredSelections = useMemo(
    () =>
      questionList
        .map((question) => ({ question, value: answerFor(answers, question.id) }))
        .filter((entry) => entry.value !== ''),
    [questionList, answers],
  )
  const answeredCount = answeredSelections.length

  const curatedPath = useMemo(() => findCuratedPath(answerFor(answers, 'goal')), [answers])

  // Probed only where it can be acted on: on the results screen, with nothing
  // matching, and with at least one answer to remove.
  const relaxation = useMemo(() => {
    if (!showResults || resultCount > 0 || answeredCount === 0) return null
    return buildRelaxation(questionList, answers)
  }, [showResults, resultCount, answeredCount, questionList, answers])

  // The hand-off carries the four answers so `/dashboard` reproduces this exact
  // result from the address. It is navigation, not a save — see the header.
  const dashboardHref = useMemo(() => {
    const params = new URLSearchParams()
    for (const { question, value } of answeredSelections) params.set(question.id, value)
    const query = params.toString()
    return query ? `/dashboard?${query}` : '/dashboard'
  }, [answeredSelections])

  const stepLabels = useMemo(
    () => questionList.map((question, index) => stepTitle(question, index)),
    [questionList],
  )

  // ---- the two DOM jobs of a transition, both BEFORE the next paint --------
  // A layout effect rather than `useEffect` on purpose. Both jobs write to the
  // DOM, and doing either after the paint is visible: the answer would flash
  // unselected on the way back to an answered question, and the focus ring
  // would flash on the control that has just been left.
  useLayoutEffect(() => {
    // 1. Reflect the answer held in the URL onto the uncontrolled native radios.
    //    `RadioGroup` spreads group-level props onto EVERY radio, so a per-option
    //    `checked` cannot be passed through it (see the header); the DOM's own
    //    checked state is therefore what carries the selection, and this is
    //    where it is kept in step with the props.
    const root = stepRef.current
    if (root) {
      root.querySelectorAll('input[type="radio"]').forEach((radio) => {
        radio.checked = radio.value === currentAnswer
      })
    }

    // 2. Move focus, but only after a deliberate transition.
    if (!pendingFocusRef.current) return
    pendingFocusRef.current = false
    if (showResults) {
      resultsRef.current?.focus()
      return
    }
    // The checked radio is the group's natural tab stop, so focus lands there
    // when there is one and on the first option otherwise. Focusing a radio
    // reads the legend — the question — with the option, and focusing an
    // unchecked radio never selects it.
    const target =
      root?.querySelector('input[type="radio"]:checked') ?? root?.querySelector('input[type="radio"]')
    target?.focus()
  }, [step, currentAnswer, showResults, resultCount])

  /**
   * Move to a screen and announce the new position.
   *
   * @param {number} next - Requested index; clamped into `0..total`, where
   *   `total` is the results screen.
   * @returns {void}
   */
  const goToStep = (next) => {
    const target = Math.min(Math.max(next, 0), total)
    pendingFocusRef.current = true
    setStepIndex(target)
    setAnnouncement(
      target >= total
        ? resultCountSentence(resultCount)
        : `Step ${target + 1} of ${total}: ${stepTitle(questionList[target], target)}`,
    )
  }

  /**
   * Report a chosen option upward. The value is not stored here: the page
   * writes it to the URL and hands it back as `answers`.
   *
   * @param {{id: string}} question - The question being answered.
   * @param {string} value - The chosen option value.
   * @returns {void}
   */
  const handleSelect = (question, value) => {
    if (typeof onAnswer === 'function') onAnswer(question.id, value)
  }

  /**
   * Widen the search by clearing the narrowest answer, and say what that did.
   *
   * The count is the one the probe measured, so the announcement is accurate
   * the moment the control is pressed rather than a render later. Focus moves
   * to the results heading because this control is about to be replaced by the
   * results it produced.
   *
   * @returns {void}
   */
  const handleRelax = () => {
    if (!relaxation || typeof onAnswer !== 'function') return
    onAnswer(relaxation.question.id, '')
    pendingFocusRef.current = true
    setAnnouncement(resultCountSentence(relaxation.count))
  }

  // ---- copy for the no-match state, composed from what is actually true ----
  const relaxationQuestionLabel = relaxation
    ? (typeof relaxation.question.label === 'string' && relaxation.question.label.trim()
        ? relaxation.question.label.trim()
        : stepTitle(relaxation.question))
    : ''
  const relaxationValueLabel = relaxation ? optionLabelFor(relaxation.question, relaxation.value) : ''

  let emptyTitle = 'No answers chosen yet'
  let emptyDescription =
    'Answering the questions is what produces suggestions. Your answers stay in the page address, so you can change them or share them at any time.'
  if (answeredCount > 0 && relaxation) {
    emptyTitle = 'No course matches that combination'
    emptyDescription =
      'No course in the catalogue matches every one of your selections. Removing one answer widens the search — or browse the full course list and tell us what you need.'
  } else if (answeredCount > 0) {
    emptyTitle = 'No course matches that combination'
    emptyDescription =
      'No course in the catalogue matches your selections, and removing any single answer does not widen the search enough to match one. Changing your answers may help — or browse the full course list and tell us what you need.'
  }

  // One primary next step, then the two standing ones. The primary is the
  // measured relaxation where there is one, and otherwise a route back to the
  // questions — never a fabricated suggestion.
  let primaryEmptyAction = null
  if (relaxation) {
    primaryEmptyAction = (
      <Button
        onClick={handleRelax}
        aria-label={`Show results without your answer to the question: ${relaxationQuestionLabel}`}
      >
        {`Show results without “${relaxationValueLabel}”`}
      </Button>
    )
  } else if (total > 0) {
    primaryEmptyAction = (
      <Button onClick={() => goToStep(answeredCount > 0 ? total - 1 : 0)}>
        {answeredCount > 0 ? 'Back to the questions' : 'Answer the questions'}
      </Button>
    )
  }

  const questionLegend =
    currentQuestion &&
    typeof currentQuestion.label === 'string' &&
    currentQuestion.label.trim()
      ? currentQuestion.label.trim()
      : stepTitle(currentQuestion, step)

  return (
    <div className={cn('flex min-w-0 flex-col gap-6', className)} {...props}>
      {/* This wizard's OWN polite region, mounted at the root and never
          unmounted, so every change to it is announced. `Stepper` deliberately
          owns no live region, and the shell's title-mirroring announcer in
          layout/Layout.jsx keeps its single existing meaning. */}
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>

      {showResults ? (
        <div className={SCREEN_ROOT}>
          {/* The focus destination on entering the results. `tabIndex={-1}`
              makes the block programmatically focusable without adding it to
              the tab sequence; the focus ring is inherited from the single
              global `:focus-visible` rule and is not re-declared. */}
          <div ref={resultsRef} tabIndex={-1}>
            <SectionHeading
              as="h2"
              align="left"
              title="Suggested courses"
              // VERBATIM, and the reason it is a constant. See copy rule 1.
              subtitle={TRANSPARENCY_SENTENCE}
            />
          </div>

          {answeredCount > 0 ? (
            // The selections, on screen rather than only in the address bar, so
            // the result explains itself to a reader who never looks at the URL.
            <dl className="m-0 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted">
              {answeredSelections.map(({ question, value }) => (
                <div key={question.id} className="min-w-0">
                  <dt className="font-semibold text-foreground">{stepTitle(question)}</dt>
                  <dd className="m-0 break-words">{optionLabelFor(question, value)}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          {/* Rendered only when a curated path genuinely applies. `learningPaths`
              ships empty, so nothing is rendered here today and — deliberately —
              nothing is said about that: no placeholder, no heading, no "no path
              found". The ranked list below is the complete outcome. */}
          {curatedPath ? <CuratedPathCard path={curatedPath} /> : null}

          {resultCount > 0 ? (
            <>
              <ul className="m-0 grid list-none gap-6 p-0 md:grid-cols-2">
                {resolvedResults.map((entry) => (
                  <RecommendationCard key={entry.course.slug} entry={entry} />
                ))}
              </ul>

              <div className="flex flex-wrap gap-3">
                {/* Navigational, NOT a save: it carries the four answers so the
                    dashboard can reproduce this result from the address. Nothing
                    is persisted, and the label must never imply otherwise. */}
                <Button variant="outline" to={dashboardHref}>
                  View this result on My Learning
                </Button>
                {total > 0 ? (
                  <Button variant="outline" onClick={() => goToStep(total - 1)}>
                    Back to the questions
                  </Button>
                ) : null}
              </div>
            </>
          ) : (
            // `neutral`, not `caution`: no course matching a combination of
            // answers is a legitimate outcome of an honest rule, not a failure.
            <EmptyState
              tone="neutral"
              headingAs="h3"
              title={emptyTitle}
              description={emptyDescription}
              action={
                <>
                  {primaryEmptyAction}
                  <Button variant="outline" to="/courses">
                    Browse all courses
                  </Button>
                  <Button variant="outline" to="/contact">
                    Contact us
                  </Button>
                </>
              }
            />
          )}
        </div>
      ) : (
        <div ref={stepRef} className={SCREEN_ROOT}>
          <Stepper steps={stepLabels} current={step} />

          {/* One question per screen, as a real `<fieldset>` with a real
              `<legend>`: grouping, single selection and arrow-key traversal all
              come from the platform. The question is the legend — the group's
              accessible name — raised to the panel-title step by its own span
              rather than restated as a heading, so it is asked exactly once.
              The `key` gives each question its own inputs instead of reusing the
              previous question's nodes with their checked state. */}
          <RadioGroup
            key={currentQuestion.id}
            legend={<span className="text-lg font-semibold text-foreground">{questionLegend}</span>}
            name={currentQuestion.id}
            options={optionsForQuestion(currentQuestion)}
            hint={QUESTION_HINT}
            onChange={(event) => handleSelect(currentQuestion, event.target.value)}
          />

          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => goToStep(step - 1)} disabled={step === 0}>
              Back
            </Button>
            {/* No per-step gate: every answer is optional by the scorer's own
                contract, so Next moves on and the results stay honest about
                what was actually answered. */}
            <Button onClick={() => goToStep(step + 1)}>
              {step === total - 1 ? 'See results' : 'Next'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default LearningPathWizard

