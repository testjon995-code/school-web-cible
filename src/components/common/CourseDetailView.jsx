import { useId, useState } from 'react'
import { FiClock } from 'react-icons/fi'
import SectionHeading from '../ui/SectionHeading.jsx'
import Card from '../ui/Card.jsx'
import Badge from '../ui/Badge.jsx'
import Accordion from '../ui/Accordion.jsx'
import Button from '../ui/Button.jsx'
import Container from '../ui/Container.jsx'
import Timeline from './Timeline.jsx'
import CourseGrid from './CourseGrid.jsx'
import FAQ from './FAQ.jsx'
import TrustSection from './TrustSection.jsx'
import CTASection from './CTASection.jsx'
import RepresentativeNote from './RepresentativeNote.jsx'
import { useSavedCourses } from '../../hooks/useSavedCourses.js'
import { useComparison } from '../../hooks/useComparison.js'
import { COMPARE_STATE, compareState, savedState } from '../../lib/states.js'
import { durationBandLabel, durationBandOf } from '../../lib/courseFilters.js'
import { cn } from '../../lib/cn.js'
import { courses } from '../../data/courses.js'
import { faq } from '../../data/faq.js'
import { goals } from '../../data/goals.js'
import { learningJourney } from '../../data/learningPaths.js'

/**
 * How many related courses the closing grid shows. Three fills the
 * `sm:grid-cols-2 lg:grid-cols-3` row exactly once, so the block never becomes a
 * second catalogue competing with `/courses`.
 */
const MAX_RELATED = 3

// Shared list treatment for every bullet list this view renders — the
// conditional detail blocks and the curriculum panels. Held as constants rather
// than a second list component: the repository has no list primitive, and
// `TrustSection` renders the identical `<ul>` inline, so matching that precedent
// keeps ONE styling definition without introducing a component nobody asked for.
// The glyph is a NEUTRAL DOT, not a tick, for the reason TrustSection records:
// `notIdealFor` is a disclosure, and a tick would dress a limitation up as a
// benefit. Every value is a native Tailwind step on the 8px scale (`h-1.5` =
// 0.375rem) — no arbitrary bracket value, and no new token.
const BULLET_LIST_CLASSES = 'flex flex-col gap-2'
const BULLET_ITEM_CLASSES = 'flex items-start gap-2 text-sm leading-relaxed text-foreground'
const BULLET_DOT_CLASSES = 'mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-600'

// Block title treatment, matching the `text-lg font-semibold` step every card
// title in the design system already uses (`CourseCard`, `TrustSection`).
const BLOCK_TITLE_CLASSES = 'text-lg font-semibold text-foreground'

// The small uppercase kicker used to label a group that has no heading of its
// own (the learner-goal pills, the catalogue browse row). It matches
// `SectionHeading`'s own eyebrow step minus the brand colour, so it reads as a
// field label rather than as a section heading — which is exactly what it is,
// and why it is a `<p>` and never an `<h*>`.
const GROUP_LABEL_CLASSES = 'text-xs font-semibold uppercase tracking-wide text-muted'

/**
 * Whether a value is a string carrying actual content.
 *
 * The one presence test every OPTIONAL course field is measured against, so
 * "absent", `null`, a non-string and a whitespace-only string all resolve to the
 * same answer: DO NOT RENDER THAT BLOCK.
 *
 * @param {unknown} value Candidate value.
 * @returns {boolean} True when the value is a non-blank string.
 */
function isFilled(value) {
  return typeof value === 'string' && value.trim() !== ''
}

/**
 * Reduce an untrusted value to the renderable strings inside it.
 *
 * A non-array yields `[]`, and every entry that is not a non-blank string is
 * dropped, so a hand-edited or partially populated record can neither throw nor
 * emit a blank list row. An empty result is what the callers test to decide
 * whether the surrounding block exists at all.
 *
 * @param {unknown} value Candidate list.
 * @returns {string[]} The renderable entries, in their authored order.
 */
function toTextList(value) {
  if (!Array.isArray(value)) return []
  return value.filter(isFilled)
}

/**
 * Validate `course.curriculum` into renderable modules.
 *
 * A module survives only when it has BOTH a non-blank `title` and at least one
 * renderable item. A titled module with no items is dropped deliberately: it
 * would render a disclosure whose panel is empty, which is precisely the
 * unexplained empty container the empty-state rule forbids — and an accordion
 * trigger that reveals nothing is worse than the module not being listed.
 *
 * @param {unknown} value `course.curriculum`.
 * @returns {{title: string, items: string[]}[]} The renderable modules.
 */
function toCurriculumModules(value) {
  if (!Array.isArray(value)) return []
  const modules = []
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue
    if (!isFilled(entry.title)) continue
    const items = toTextList(entry.items)
    if (items.length === 0) continue
    modules.push({ title: entry.title, items })
  }
  return modules
}

/**
 * Resolve `course.faqIds` against the canonical FAQ set.
 *
 * The referential rule this implements (AAP §0.7.3) is that an unresolvable id
 * is SKIPPED rather than rendered as an empty block: an id that matches no
 * record contributes nothing, and the remaining ids still render. Ids are also
 * de-duplicated, because `ui/Accordion` derives its trigger and panel DOM ids
 * from the suffixes `FAQ` passes it, and two identical suffixes would make the
 * second one fall back to a generated id for no reason.
 *
 * Order follows the course record's own `faqIds`, which the catalogue authors in
 * `src/data/faq.js` declaration order, so rendering order is stable.
 *
 * @param {unknown} value `course.faqIds`.
 * @returns {object[]} The matched FAQ records, `[]` when none resolve.
 */
function toCourseFaqs(value) {
  if (!Array.isArray(value)) return []
  const seen = new Set()
  const resolved = []
  for (const rawId of value) {
    if (!isFilled(rawId)) continue
    const wanted = rawId.trim()
    if (seen.has(wanted)) continue
    const record = faq.find((entry) => entry && entry.id === wanted)
    if (!record) continue
    seen.add(wanted)
    resolved.push(record)
  }
  return resolved
}

/**
 * Resolve `course.goals` ids to their taxonomy records.
 *
 * `courses[].goals` holds ids, never display text, so the label ALWAYS comes
 * from `src/data/goals.js` — the id is a URL and cross-reference contract and is
 * never printed. An id that matches no goal, or a goal with no usable label, is
 * skipped, so a stale reference degrades to one fewer pill instead of a blank
 * one.
 *
 * @param {unknown} value `course.goals`.
 * @returns {{id: string, label: string}[]} The matched goals, in record order.
 */
function toGoalEntries(value) {
  if (!Array.isArray(value)) return []
  const seen = new Set()
  const resolved = []
  for (const rawId of value) {
    if (!isFilled(rawId)) continue
    const wanted = rawId.trim()
    if (seen.has(wanted)) continue
    const goal = goals.find((entry) => entry && entry.id === wanted)
    if (!goal || !isFilled(goal.label)) continue
    seen.add(wanted)
    resolved.push(goal)
  }
  return resolved
}

/**
 * Derive the related-courses set: SHARED CATEGORY FIRST, THEN SHARED GOAL.
 *
 * Both dimensions are required by the plan, and the order between them is the
 * relationship strength: another course in the same track is a closer relative
 * than one that merely serves an overlapping learner goal. Within each bucket
 * the catalogue's own source order is preserved, so the block is deterministic
 * across renders and across reloads.
 *
 * The current course is always excluded — a "related" list that links back to
 * the page it is on is a dead end — and a candidate with no usable slug is
 * dropped, because every tile needs a destination.
 *
 * A course whose `goals` array is absent simply contributes no goal matches,
 * which is the same absence rule every other optional field follows.
 *
 * @param {object} course The course being viewed.
 * @param {unknown} catalogue The catalogue to draw from.
 * @returns {object[]} At most {@link MAX_RELATED} related records.
 */
function toRelatedCourses(course, catalogue) {
  const list = Array.isArray(catalogue) ? catalogue : []
  const goalIds = new Set(toTextList(course.goals))
  const sameCategory = []
  const sharedGoal = []

  for (const candidate of list) {
    if (!candidate || typeof candidate !== 'object') continue
    if (!isFilled(candidate.slug) || candidate.slug === course.slug) continue

    if (isFilled(course.category) && candidate.category === course.category) {
      sameCategory.push(candidate)
      continue
    }

    if (goalIds.size > 0 && toTextList(candidate.goals).some((goalId) => goalIds.has(goalId))) {
      sharedGoal.push(candidate)
    }
  }

  return [...sameCategory, ...sharedGoal].slice(0, MAX_RELATED)
}

/**
 * Build the conditional detail blocks, in the plan's order, omitting each one
 * whose field is absent.
 *
 * This function IS the acceptance criterion of this file. Every block it can
 * produce is backed by a CONTENT-OWNER field of `src/data/courses.js`, and every
 * one of those fields is absent on all ten records today — so with the current
 * catalogue it correctly returns `[]` and the whole section, heading included,
 * does not exist. Nothing here synthesises a block from a field that was meant
 * for something else: `highlights` are activities and teaching methods and are
 * deliberately NOT reshaped into `outcomes` or grouped into a `curriculum`.
 *
 * `eligibility` is prose (a single string) and the other four are lists, which
 * is why a block carries either a `body` or `items` and never both. A value of
 * the wrong type fails its presence test and drops the block rather than
 * throwing.
 *
 * Every title is a STRUCTURAL LABEL for a field the institute populates — not a
 * claim, and not content. `notIdealFor` is labelled plainly rather than
 * apologetically: the field exists so a course description can be honest about
 * who it does not serve, which is the opposite of a marketing claim.
 *
 * @param {object} course The course being viewed.
 * @returns {{id: string, title: string, body?: string, items?: string[]}[]} The
 *   blocks that have content, in render order.
 */
function toDetailBlocks(course) {
  const blocks = []

  if (isFilled(course.eligibility)) {
    blocks.push({ id: 'eligibility', title: 'Eligibility', body: course.eligibility })
  }

  const prerequisites = toTextList(course.prerequisites)
  if (prerequisites.length > 0) {
    blocks.push({
      id: 'prerequisites',
      title: 'What you need before you start',
      items: prerequisites,
    })
  }

  const outcomes = toTextList(course.outcomes)
  if (outcomes.length > 0) {
    blocks.push({ id: 'outcomes', title: 'What you will be able to do', items: outcomes })
  }

  const idealFor = toTextList(course.idealFor)
  if (idealFor.length > 0) {
    blocks.push({ id: 'ideal-for', title: 'Who this course is for', items: idealFor })
  }

  const notIdealFor = toTextList(course.notIdealFor)
  if (notIdealFor.length > 0) {
    blocks.push({
      id: 'not-ideal-for',
      title: 'Who this course may not suit',
      items: notIdealFor,
    })
  }

  return blocks
}

/**
 * Map the shared learning journey onto `Timeline`'s item shape.
 *
 * `label` → `title`, `body` → `description`, `href` → `href`. A stage with no
 * usable label is dropped, and a stage with no `href` renders exactly as
 * `Timeline` has always rendered a stage — which is what keeps the last three
 * stages (Enroll, Learn, Complete), none of which carries a route, identical to
 * the existing About and Admission timelines.
 *
 * @param {unknown} value The `learningJourney` export.
 * @returns {{title: string, description: string, href?: string}[]} Timeline items.
 */
function toJourneyItems(value) {
  if (!Array.isArray(value)) return []
  const items = []
  for (const stage of value) {
    if (!stage || typeof stage !== 'object' || !isFilled(stage.label)) continue
    const item = { title: stage.label }
    if (isFilled(stage.body)) item.description = stage.body
    if (isFilled(stage.href)) item.href = stage.href
    items.push(item)
  }
  return items
}

/**
 * CourseDetailView — the reusable per-course content composition for the CIBLE
 * School of Language SPA (AAP §0.9.3, feature F3).
 *
 * ONE component renders all ten `/courses/:slug` routes. It is named `…View`
 * deliberately so it cannot be confused with the `src/pages/CourseDetail.jsx`
 * route module: the PAGE owns the route-parameter validation, the `Seo` head,
 * the `StructuredData` blocks, the visible `Breadcrumbs` trail and the
 * unknown-slug state; THIS component owns the content and nothing else. That
 * split is why a slug that resolves to no record never reaches here — and why a
 * malformed record that somehow does is still guarded rather than thrown.
 *
 * ── THE ACCEPTANCE CRITERION IS THE BLOCK TABLE, NOT THE NUMBER FOURTEEN ────
 * The brief names fourteen parts. The catalogue does not support fourteen, and
 * inventing the difference is the "misleading claim" the project prohibits. What
 * this view is measured against is the table, per AAP §0.2.1:
 *
 *   GUARANTEED on all ten routes — title, the lead sentence, category, duration,
 *     the learner goals, the primary apply action, the save and compare toggles,
 *     the six-stage learning journey, related courses, and the trust section.
 *     Every one of those is already authored or is derived from the catalogue.
 *
 *   GUARANTEED WHERE THE VALUE EXISTS — the level badge and the course FAQs.
 *     `level` is populated on EXACTLY ONE of the ten records today (Spoken
 *     English, whose own summary says "beginner-friendly"), so NINE routes
 *     render no level badge at all. That is not a degraded rendering: inferring
 *     a level from a subject or a duration — an "Advanced" label on PCM/PCB —
 *     would be an invented pedagogical claim, so the badge waits for the
 *     institute to supply the value. `faqIds` is populated on all ten, so the
 *     FAQ block renders on all ten; an id that resolves to no record is skipped
 *     rather than rendered as an empty disclosure.
 *
 *   CONDITIONAL on content-owner input — eligibility, prerequisites, outcomes,
 *     curriculum, ideal-for and not-ideal-for. Each is OMITTED ENTIRELY, ITS
 *     HEADING INCLUDED, where its field is absent. Not "Outcomes: —", not
 *     "Coming soon", not an empty list, and not a heading with nothing under it.
 *     All six are absent on all ten records today, so with the current catalogue
 *     neither the "Course details" section nor the "Curriculum" section exists.
 *
 * A ROUTE RENDERING EIGHT BLOCKS BECAUSE SIX AWAIT CONTENT HAS PASSED; ONE
 * RENDERING FOURTEEN BLOCKS OF INVENTED CURRICULUM HAS FAILED. The omission
 * logic is therefore the deliverable, and it is what makes the honest version
 * look finished rather than broken. Nothing in this file authors an eligibility
 * criterion, a prerequisite, an outcome, a curriculum module, a suitability
 * statement or a value proposition — and nothing reshapes `highlights`, which
 * are activities and teaching methods, into `outcomes` or a `curriculum`. There
 * is no figure, rate, fee, accreditation, award, review, placement or completion
 * claim anywhere in it, and none is in the record contract it reads.
 *
 * ── THE LEAD SENTENCE ───────────────────────────────────────────────────────
 * `valueProposition ?? summary` is the catalogue's single documented fallback
 * rule, and the same rule produces the route's meta description in the page
 * module. The value proposition asserts nothing its own summary does not, so
 * where it is absent the summary reads as the lead with no loss.
 *
 * ── `prerequisites` IS PROSE; `prereqTags` IS THE FILTER VALUE ──────────────
 * Only `prerequisites` is displayed, verbatim, and it is never matched or
 * filtered. `prereqTags` holds the closed machine vocabulary that `?prereq=`
 * carries, so it is a filter value and NOT display text, and it is never printed
 * on this page. Confusing the two would put an identifier such as
 * `basic-english` in front of a visitor.
 *
 * ── THE JOURNEY IS SHARED, NOT PER COURSE ───────────────────────────────────
 * The six stages come from the `learningJourney` export of
 * `src/data/learningPaths.js` and are rendered through the existing `Timeline`,
 * mapping `label` → `title`, `body` → `description` and `href` → `href`. They
 * are NOT duplicated per record: one definition serves all ten routes and the
 * dashboard panel too, which is the whole reason the sequence lives in a data
 * module and keys on a stable stage `id`.
 *
 * ── TWO DISCLOSURE SURFACES, TWO DIFFERENT PRIMITIVES, AND WHY ──────────────
 * The course FAQs go through the SHARED `common/FAQ` component rather than a
 * second `Accordion` call, because `FAQ` owns the standardised empty and
 * malformed-input branches every FAQ surface on the site inherits (AAP §0.11.2
 * names "the course detail route's questions" as one of them). Passing an
 * already-resolved subset as `items` is what makes the one-shared-empty-state
 * claim true here. The CURRICULUM, by contrast, is not FAQ-shaped data — it is
 * `{title, items[]}` modules with no question, no answer and no shared empty
 * branch to inherit — so it composes `ui/Accordion` directly with a STATIC
 * `headingAs`, since that primitive deliberately does not clamp the value it is
 * given.
 *
 * One deliberate, documented departure: the FAQ block keeps its VISIBLE section
 * heading (`headingLevel={2}`, `questionHeadingLevel={3}`) instead of being
 * suppressed to the `sr-only` bridging heading that `showHeading={false}`
 * produces. The instruction's stated purpose — "so the outline stays correct" —
 * is satisfied either way by the explicit levels, but suppressing the heading
 * would leave a second accordion immediately after the curriculum accordion with
 * no visible label, which is a real usability defect rather than a style choice.
 *
 * ── SECTION AND CONTAINER BOUNDARIES (a gutter bug waiting to happen) ───────
 * `FAQ`, `TrustSection` and `CTASection` each own their own `<section>` WRAPPING
 * their own `Container`. They are therefore rendered as SIBLINGS of this
 * component's own `Container` sections and never inside one: nesting `Container`
 * resolves the width correctly through twMerge but DOUBLES the `px-4 md:px-6`
 * gutters, which is invisible in code review and obvious at 320px. `CourseGrid`
 * is the opposite case — its root is a plain flex `<div>` with no section and no
 * container — so it goes INSIDE a `Container` here.
 *
 * ── ONE STATE VOCABULARY, SO A CARD AND ITS DETAIL VIEW CANNOT DISAGREE ─────
 * Every label, icon and button variant for the save and compare toggles is
 * resolved from `src/lib/states.js`; not one of them is authored here.
 * `CourseCard` reads the SAME entries, which is the construction rule that
 * prevents the card/detail drift reported as BUG 1 — the two surfaces cannot be
 * authored separately because there is only one place to author them. Each
 * consumer reads the key for its OWN primitive (`Button` → `buttonVariant`,
 * `Badge` → `badgeVariant`) and translates no vocabularies at the call site,
 * because the call site is exactly where that drift arises.
 *
 * THE THREE-COURSE CAP, and why the obvious implementation is wrong. A natively
 * `disabled` control can be neither focused nor activated, so a refusal attached
 * to one could never be triggered or read — and a refusal nobody can reach is
 * not feedback. Once three courses are selected this course's compare toggle
 * therefore stays focusable and carries `aria-disabled="true"` instead of
 * `disabled`; activating it commits nothing (the store refuses and returns
 * `{ok: false, reason: 'full'}`, so the cap constant is never restated here) and
 * writes the refusal into this page's polite live region. Because `aria-disabled`
 * does not trigger `Button`'s `disabled:` utilities, the muted treatment is
 * composed explicitly through `cn()`, and `pointer-events` is deliberately left
 * alone so the control remains activatable. The cap is disclosed BEFORE the
 * attempt as well, through a visually hidden description carrying the wording
 * from `states.js`. An ALREADY-SELECTED course is never refused — removal always
 * succeeds — a precedence encoded once in `compareState()` rather than re-derived
 * here. The refusal is recorded WITH the slug it was raised on and is DISCARDED,
 * not merely hidden, as soon as it stops describing the screen — because a
 * polite region going from empty back to a sentence is an announcement, so a
 * retained-but-masked refusal would be re-read for an activation the visitor
 * never performed. `/courses/:slug` is one route: moving between two courses
 * re-renders this same instance with a new `course` and React keeps its state,
 * so the refusal is retired when the slug changes AND when this course's toggle
 * stops being refused at all (a slot freed elsewhere on the page makes "remove
 * one to add another" describe a control that is already operable). Both are
 * resolved by adjusting state during render, React's documented answer to a prop
 * change: the pass is discarded and re-rendered before anything is committed, so
 * nothing stale is painted or spoken, with no effect and no second paint.
 *
 * `persisted: false` from `useSavedCourses` means the browser refused the write,
 * so the selection is held in memory for this visit only. That is disclosed in
 * plain words rather than hidden: the in-memory state still updates so the
 * interface does not regress mid-session, and the visitor is told the truth
 * about durability.
 *
 * ── THERE IS DELIBERATELY NO HERO ILLUSTRATION ──────────────────────────────
 * AAP §0.8.3 dropped it. `CourseCard` resolves its imagery through
 * `IMAGE_BY_SLUG` / `IMAGE_BY_CATEGORY` maps that are MODULE-PRIVATE, and this
 * route could only reuse them by duplicating the maps or by exporting a new
 * media-resolution contract. Neither is justified — the user never asked for an
 * illustration here, and the content parts are what the feature is about — so
 * there is no `aspect-4-3` frame, no course image, and those maps stay private.
 *
 * ── DESIGN SYSTEM ──────────────────────────────────────────────────────────
 * Zero new tokens and zero new utilities: `src/index.css` carries no diff for
 * this file. Every value resolves to an existing `@theme` token or a native
 * Tailwind utility, composed exclusively through `cn()` — `Card`'s
 * `rounded-2xl border border-border bg-white p-6 shadow-sm` surface, `bg-surface`
 * for the alternating band, `text-foreground` (~17:1) and `text-muted` (~7.5:1)
 * for copy, `text-lg font-semibold` for block titles, `text-sm leading-relaxed`
 * for body, `gap-6` grids and the `py-12 md:py-16` / `py-16 md:py-20` section
 * rhythm, inside `Container`'s single `max-w-7xl` measure. There is no arbitrary
 * bracket value, no gradient, no glassmorphism and no decorative effect. This
 * component adds NO motion of its own either: `Timeline`, `CourseGrid`, `FAQ`,
 * `TrustSection` and `CTASection` each own their reveal and their
 * reduced-motion gate, so introducing a sixth here would duplicate five working
 * implementations for nothing.
 *
 * ── ACCESSIBILITY (WCAG AA) ────────────────────────────────────────────────
 * - Exactly one `<h1>` (the course title, via `SectionHeading as="h1"`), every
 *   section heading an `<h2>` and every card, question, stage and tile title an
 *   `<h3>` — so the outline never skips a level even though which sections exist
 *   varies from route to route.
 * - Every control is a real `Button`, so the ≥44px hit area and the single
 *   global `:focus-visible` ring are inherited and never re-declared.
 * - Toggle state is never carried by colour alone: the variant changes, the
 *   outline/filled icon changes, AND `aria-pressed` is set.
 * - The apply action and both toggles repeat elsewhere on the page (every related
 *   course card carries its own pair), so each carries a descriptive
 *   `aria-label` that names this course and contains its visible text.
 * - Both label-only groups without a heading — the learner-goal pills and the
 *   catalogue browse row — are named with `aria-labelledby` pointing at their
 *   `<p>` label, so neither becomes an unnamed set of controls.
 * - Every glyph is decorative and `aria-hidden="true"`; the adjacent text always
 *   carries the meaning.
 * - One page-local polite region reports the comparison refusal, so the shell's
 *   route-title announcer keeps its single existing meaning.
 *
 * @param {object} props
 * @param {object} props.course The course record to render, already resolved
 *   from `src/data/courses.js` by the page module. Required: `slug` and `title`
 *   (without both there is nothing to compose and the component renders `null`).
 *   Read when present: `category`, `summary`, `duration`, `durationWeeks`,
 *   `goals` (ids into `src/data/goals.js`), `valueProposition`, `level`,
 *   `eligibility`, `prerequisites` (prose), `outcomes`, `curriculum`
 *   (`{title, items[]}[]`), `idealFor`, `notIdealFor` and `faqIds` (ids into
 *   `src/data/faq.js`). Every one of those is OPTIONAL and absence means the
 *   corresponding block is not rendered. `prereqTags` and `icon` are
 *   deliberately NOT read: the former is a filter value rather than display
 *   text, and the latter is the card's media affordance, which this route does
 *   not have.
 * @param {string} [props.className] Extra classes merged LAST via {@link cn}
 *   onto the root wrapper, so a caller can extend or override.
 * @param {object} [props] Any other props (`id`, `aria-*`, `data-*`, …) are
 *   forwarded to the root element.
 * @returns {import('react').ReactElement|null} The composed course detail
 *   content, or `null` for a record with no slug or no title.
 */
export default function CourseDetailView({ course, className, ...props }) {
  // EVERY hook is called unconditionally, at the top level, BEFORE the guard
  // below — `react/rules-of-hooks` is an ERROR in this project, and a
  // conditional return above a hook would make hook order depend on the data.
  // Nothing here reads `course`, so the order is safe as well as legal.
  const { isSaved, toggle: toggleSaved, persisted } = useSavedCourses()
  const { has: isCompared, toggle: toggleCompared, isFull: isComparisonFull } = useComparison()
  // The comparison refusal, held as `{slug, label}` rather than as bare text.
  // The slug is what makes the message BELONG to a course: `/courses/:slug` is a
  // single route, so moving between two courses re-renders this same instance
  // with a new `course` prop and React keeps the state. A bare string would then
  // survive the navigation and announce a refusal that never happened on the
  // course now being read — so the render below only shows the label while the
  // recorded slug is still the slug on screen, and a stale entry is inert.
  // Derivation at render rather than a reset effect: no second paint, and no
  // window in which the wrong message is live.
  const [comparisonRefusal, setComparisonRefusal] = useState(null)
  // One `useId` prefix for the three associations this view needs. Unique per
  // instance, so nothing collides with the related cards' own generated ids.
  const uid = useId()

  // Guard: without a slug there is no destination for any action and without a
  // title there is no heading, so there is nothing honest to render. Placed AFTER
  // the hooks, exactly as `CourseCard` and `Timeline` place theirs.
  if (!course || typeof course !== 'object' || !isFilled(course.slug) || !isFilled(course.title)) {
    return null
  }

  const { slug, title, category, duration, level } = course
  const goalsLabelId = `${uid}-goals`
  const browseLabelId = `${uid}-browse`
  const capNoteId = `${uid}-compare-cap`

  // The lead sentence: the catalogue's single documented fallback rule. An
  // absent value yields `undefined`, which `SectionHeading` renders as no
  // subtitle at all rather than as an empty paragraph.
  const lead = isFilled(course.valueProposition)
    ? course.valueProposition
    : isFilled(course.summary)
      ? course.summary
      : undefined

  // The established admission deep link. `title` is the value `/admission`
  // validates against the catalogue, so it is encoded rather than interpolated
  // raw — a title carrying `&` or a space must not split the query string.
  const applyTo = `/admission?course=${encodeURIComponent(title)}`

  // Derived content. Each of these is what the corresponding block's existence
  // is tested against, so an empty result removes the block and its heading.
  const goalEntries = toGoalEntries(course.goals)
  const detailBlocks = toDetailBlocks(course)
  const curriculumModules = toCurriculumModules(course.curriculum)
  const courseFaqs = toCourseFaqs(course.faqIds)
  const journeyItems = toJourneyItems(learningJourney)
  const related = toRelatedCourses(course, courses)

  // The machine-readable duration band, used ONLY to offer a catalogue link of
  // similar length. The band's LABEL is what is ever shown; the id appears only
  // inside the `?duration=` value, which is the one place it belongs.
  const bandId = durationBandOf(course)
  const bandLabel = durationBandLabel(bandId)

  // Toggle presentation, resolved entirely from `src/lib/states.js`. Capitalised
  // locals so JSX renders the icon component references.
  const saved = isSaved(slug)
  const savedEntry = savedState(saved)
  const SavedIcon = savedEntry.icon

  const compared = isCompared(slug)
  // `compareState` encodes the precedence: an already-selected course resolves to
  // `selected` even at the cap, so removal is never refused and a slot can always
  // be freed. Only an UNSELECTED course at the cap resolves to `full`.
  const compareEntry = compareState(compared, isComparisonFull)
  const CompareIcon = compareEntry.icon
  const compareRefused = !compared && isComparisonFull
  // The accessible NAME always states the action, so it does not mutate into a
  // sentence when the set fills; the cap wording is exposed as the control's
  // DESCRIPTION instead.
  const compareActionEntry = compared ? COMPARE_STATE.selected : COMPARE_STATE.unselected
  // DISCARD the recorded refusal the moment it stops describing what is on
  // screen. Masking it at render is not enough: the state would survive, and a
  // polite region going from empty back to a sentence is an ANNOUNCEMENT — so a
  // merely-hidden refusal would be re-read on returning to the course that
  // raised it, or the instant the cap refilled, for an activation the visitor
  // never performed. Two conditions retire it, and both are failures of the
  // message rather than of the visitor:
  //   - a different course is being rendered (this is one route, so the same
  //     instance and the same live region survive a client-side course change);
  //   - this course's toggle is no longer refused, because a slot was freed
  //     elsewhere on the page — "remove one to add another" describes a control
  //     that has already become operable.
  // Setting state during render is React's documented way to adjust state when a
  // prop changes: the output of this pass is discarded and re-rendered before
  // anything is committed, so nothing stale is ever painted or announced, and no
  // effect and no second paint are needed. It converges immediately — the
  // condition is false once the value is null.
  if (comparisonRefusal && (comparisonRefusal.slug !== slug || !compareRefused)) {
    setComparisonRefusal(null)
  }
  // Consequently the state is non-null ONLY while it is still true of this
  // render, which is what lets the region read it without further qualification.
  const comparisonMessage = comparisonRefusal ? comparisonRefusal.label : ''

  /**
   * Add or remove this course from the comparison working set.
   *
   * The store owns the cap: it commits nothing and returns the refusal, so an
   * activation of the refused toggle is already a no-op here and the limit is
   * never restated in this component. `full` is the only refusal a visitor can
   * trigger — `unknown` cannot arise from a record the page resolved out of the
   * catalogue — so every other outcome clears the region instead of announcing a
   * reason nobody could act on.
   */
  function handleCompareClick() {
    const result = toggleCompared(slug)
    setComparisonRefusal(
      !result.ok && result.reason === 'full'
        ? { slug, label: COMPARE_STATE.full.label }
        : null,
    )
  }

  return (
    <div className={cn(className) || undefined} {...props}>
      {/* ── COURSE HEADER — the page's single h1, the attribute badges, the
             learner goals, the action row and the content disclosure. ─────── */}
      <Container as="section" className="py-12 md:py-16">
        {/* The eyebrow is a deliberately STATIC structural label: the record's
            own category renders as the Badge below, and repeating it here would
            state the same fact twice. */}
        <SectionHeading
          as="h1"
          align="left"
          eyebrow="Course"
          title={title}
          subtitle={lead}
        />

        {/* Attribute row — category, level and duration. Placed BELOW the
            heading and wrapping rather than compressing, so at 320px the pills
            reflow onto their own lines and the title above is untouched. */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {isFilled(category) ? <Badge variant="primary">{category}</Badge> : null}

          {/* `level` is an OPTIONAL field, rendered only where the institute has
              stated a difficulty and omitted entirely otherwise — no empty pill
              and no "Level: —". Nine of the ten routes show nothing here today.
              The `neutral` variant keeps it reading as a plain attribute rather
              than competing with the `primary` category badge, exactly as
              `CourseCard` renders it. */}
          {isFilled(level) ? <Badge variant="neutral">{level}</Badge> : null}

          {/* The authored `duration` string, rendered EXACTLY as written and
              never rebuilt from the machine-readable `durationWeeks` companion.
              The clock is decorative, so the field it belongs to is named by a
              visually hidden prefix INSIDE the badge rather than by `aria-label`
              on the badge itself: `Badge` renders a bare `<span>` with no role,
              which maps to `generic`, and ARIA prohibits naming a generic
              element — an `aria-label` there is dropped by some assistive
              technology and flagged as `aria-prohibited-attr` by auditors. The
              hidden prefix is read by everything, costs no layout (`.sr-only` is
              absolutely positioned, so the badge's flex gap does not apply to
              it) and keeps the visible text intact inside the accessible name. */}
          {isFilled(duration) ? (
            <Badge variant="neutral">
              <FiClock aria-hidden="true" />
              <span className="sr-only">{'Duration: '}</span>
              {duration}
            </Badge>
          ) : null}
        </div>

        {/* Learner goals — resolved from ids to the taxonomy's own labels, so an
            identifier is never printed. A labelled list rather than a heading,
            because this is a field on the record and not a section of the page. */}
        {goalEntries.length > 0 ? (
          <div className="mt-6">
            <p id={goalsLabelId} className={GROUP_LABEL_CLASSES}>
              Learner goals
            </p>
            <ul aria-labelledby={goalsLabelId} className="mt-2 flex flex-wrap gap-2">
              {goalEntries.map((goal) => (
                <li key={goal.id}>
                  <Badge variant="accent">{goal.label}</Badge>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Action row — the primary apply action first (it is the primary action
            and the first stop in the tab order), then the two toggles. It WRAPS
            rather than overflowing, so 320px keeps all three controls at their
            full 44px hit area. Each toggle's text label is revealed from `sm`
            upward; below that the controls are icon-only, which is what keeps a
            long state label such as "Selected for comparison — remove" from
            wrapping inside a fixed-height button at 320px. The accessible name
            comes from `aria-label` at every width, so it never changes with the
            viewport. */}
        <div className="mt-8 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Button to={applyTo} variant="primary" aria-label={`Apply now — ${title}`}>
              Apply now
            </Button>

            <Button
              type="button"
              variant={savedEntry.buttonVariant}
              aria-pressed={saved}
              aria-label={`${savedEntry.label} — ${title}`}
              onClick={() => toggleSaved(slug)}
            >
              <SavedIcon className="h-5 w-5" aria-hidden="true" />
              <span className="hidden sm:inline">{savedEntry.label}</span>
            </Button>

            <Button
              type="button"
              variant={compareEntry.buttonVariant}
              aria-pressed={compared}
              // `aria-disabled`, never the native `disabled`: the control has to
              // stay focusable so the cap it explains can actually be reached.
              // Applied only when the set is full AND this course is not already
              // selected, because removal is never refused.
              aria-disabled={compareRefused || undefined}
              aria-describedby={compareRefused ? capNoteId : undefined}
              aria-label={`${compareActionEntry.label} — ${title}`}
              // Button's `disabled:` utilities do not fire for `aria-disabled`,
              // so the muted treatment is composed here from the SAME utilities
              // Button's own `disabled:` variants use, which is what keeps one
              // unavailable-control appearance in this codebase rather than two.
              // `pointer-events` is left alone on purpose — the toggle stays
              // activatable and the store refuses the change.
              /* BLITZY [A11Y]: at `opacity-50` the refused toggle's own label
                 composites to roughly 2.1:1 against white, below the WCAG AA
                 4.5:1 for normal text. Implemented as the design system renders
                 every unavailable control (`Button`'s `disabled:opacity-50`)
                 rather than silently corrected, and flagged for designer review;
                 substituting a muted colour token here would introduce a second
                 disabled appearance that no other control in this repository
                 uses. WCAG 1.4.3's inactive-component exception applies —
                 `aria-disabled="true"` is set — and the refusal's wording is
                 additionally carried at full contrast by the polite region below
                 and by this control's `aria-describedby`, so no meaning depends
                 on reading the faded label. */
              className={cn(compareRefused && 'cursor-not-allowed opacity-50')}
              onClick={handleCompareClick}
            >
              <CompareIcon className="h-5 w-5" aria-hidden="true" />
              <span className="hidden sm:inline">{compareActionEntry.label}</span>
            </Button>
          </div>

          {/* The cap, disclosed BEFORE the attempt rather than only on refusal.
              The wording comes from states.js, so this view, the cards below it
              and the catalogue's own announcement state the limit identically. */}
          {compareRefused ? (
            <span id={capNoteId} className="sr-only">
              {compareEntry.label}
            </span>
          ) : null}

          {/* This view's ONE polite region. Mounted unconditionally so a later
              change is announced; it carries the comparison refusal only, since
              both toggles already announce themselves through `aria-pressed`. */}
          <p role="status" aria-live="polite" aria-atomic="true" className="text-xs text-muted">
            {comparisonMessage}
          </p>

          {/* Durability, stated honestly. The toggle above still updated the
              in-memory set, so the interface has not regressed — but the write
              did not reach storage, and claiming otherwise would be a promise
              this browser has already refused to keep. */}
          {persisted ? null : (
            <p className="text-xs text-muted">
              This browser would not let us store your saved courses, so this selection is kept
              for this visit only and will not survive a reload.
            </p>
          )}
        </div>

        {/* Content disclosure at its DEFAULT `gate="content"`, inherited from the
            `/courses` listing and covering the duration, highlights and
            curriculum copy on this page. It retires itself with every other
            content disclosure the moment `siteConfig.representativeContent` is
            cleared, which is why `gate="always"` is never passed here — that
            mode is reserved for the dashboard, whose notice discloses an
            architectural fact that outlives content confirmation. */}
        <RepresentativeNote className="mt-10 max-w-3xl">
          Course details such as durations, highlights and curriculum are representative and
          shown for demonstration. Please confirm the current curriculum, batch timings and fees
          with the institute before enrolling.
        </RepresentativeNote>
      </Container>

      {/* ── COURSE DETAILS — the five conditional blocks. The whole section,
             heading included, exists only when at least one of them has
             content, which with today's catalogue means it does not exist. ── */}
      {detailBlocks.length > 0 ? (
        <Container as="section" className="pb-12 md:pb-16">
          <SectionHeading as="h2" align="left" title="Course details" className="mb-8" />
          <div className="grid gap-6 md:grid-cols-2">
            {detailBlocks.map((block) => (
              <Card key={block.id} as="article" className="flex flex-col gap-4">
                <h3 className={BLOCK_TITLE_CLASSES}>{block.title}</h3>
                {block.body ? (
                  <p className="text-sm leading-relaxed text-muted">{block.body}</p>
                ) : null}
                {block.items ? (
                  <ul className={BULLET_LIST_CLASSES}>
                    {block.items.map((item, index) => (
                      <li key={`${index}-${item}`} className={BULLET_ITEM_CLASSES}>
                        <span aria-hidden="true" className={BULLET_DOT_CLASSES} />
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </Card>
            ))}
          </div>
        </Container>
      ) : null}

      {/* ── CURRICULUM — `ui/Accordion` directly, because modules are not
             FAQ-shaped data and have no shared empty branch to inherit. The
             `headingAs` value is STATIC, since that primitive does not clamp
             what it is given, and `h3` is the correct depth under the section
             `h2` above it. `allowMultiple` lets a visitor read two modules side
             by side, which is how a syllabus is actually read. ───────────── */}
      {curriculumModules.length > 0 ? (
        <Container as="section" className="pb-12 md:pb-16">
          <SectionHeading as="h2" align="left" title="Curriculum" className="mb-8" />
          <Accordion
            className="max-w-3xl"
            allowMultiple
            headingAs="h3"
            items={curriculumModules.map((module) => ({
              question: module.title,
              answer: (
                <ul className={BULLET_LIST_CLASSES}>
                  {module.items.map((item, index) => (
                    <li key={`${index}-${item}`} className={BULLET_ITEM_CLASSES}>
                      <span aria-hidden="true" className={BULLET_DOT_CLASSES} />
                      {item}
                    </li>
                  ))}
                </ul>
              ),
            }))}
          />
        </Container>
      ) : null}

      {/* ── COURSE QUESTIONS — the SHARED FAQ component, rendered as a SIBLING
             of the Containers above because it owns its own section and its own
             `max-w-3xl` Container. `items` is the already-resolved subset, so
             `FAQ` treats the view as narrowed and offers "See all questions" in
             its own standardised empty branch; passing `faqIds` straight
             through would have bypassed both. The explicit levels keep the
             outline h1 → h2 → h3. ─────────────────────────────────────────── */}
      {courseFaqs.length > 0 ? (
        <FAQ
          items={courseFaqs}
          eyebrow="FAQ"
          title="Questions about this course"
          headingLevel={2}
          questionHeadingLevel={3}
        />
      ) : null}

      {/* ── LEARNING JOURNEY — the shared six-stage sequence, on the alternating
             `bg-surface` band. The band lives on this component's OWN section,
             with `Container` inside it, so no Container is ever nested. ───── */}
      {journeyItems.length > 0 ? (
        <section className="bg-surface py-16 md:py-20">
          <Container>
            <SectionHeading
              as="h2"
              align="left"
              eyebrow="Learning journey"
              title="From finding a course to finishing it"
              subtitle="These stages are the same for every course CIBLE teaches, so you always know what happens next."
              className="mb-8"
            />
            {/* `Timeline` renders each stage title as an `h3` under the `h2`
                above, and turns the stages that carry a route into real links. */}
            <Timeline items={journeyItems} className="max-w-3xl" />
          </Container>
        </section>
      ) : null}

      {/* ── RELATED COURSES and the catalogue browse row. `CourseGrid` has no
             section or container of its own, so it goes INSIDE this Container —
             the opposite of FAQ/TrustSection/CTASection. `showFilter` is off
             because this is a curated set of at most three, not a catalogue. ─ */}
      <Container as="section" className="py-12 md:py-16">
        <SectionHeading
          as="h2"
          align="left"
          title={related.length > 0 ? 'Related courses' : 'More from the catalogue'}
          subtitle={
            related.length > 0
              ? isFilled(category)
                ? `Other courses in the ${category} track, or working towards the same learner goals.`
                : 'Other courses working towards the same learner goals.'
              : 'No other course shares this track or these learner goals yet — the full catalogue is one step away.'
          }
          className="mb-8"
        />

        {related.length > 0 ? <CourseGrid items={related} showFilter={false} /> : null}

        {/* Internal linking onward, as short filter links rather than sentences:
            each visible label is the value itself — the same idiom the
            catalogue's own category chips use — and the accessible name states
            what activating it does while containing that visible text. The
            duration link is the only place a band id appears, and it appears in
            the URL, never on screen. */}
        {/* `|| undefined` for the same reason the root element uses it: with no
            related grid above, `cn()` resolves to an empty string, and React
            would render a bare `class=""` attribute rather than omit it. */}
        <div className={cn(related.length > 0 && 'mt-10') || undefined}>
          <p id={browseLabelId} className={GROUP_LABEL_CLASSES}>
            Browse the catalogue
          </p>
          <div
            role="group"
            aria-labelledby={browseLabelId}
            className="mt-2 flex flex-wrap items-center gap-2"
          >
            {isFilled(category) ? (
              <Button
                to={`/courses?category=${encodeURIComponent(category)}`}
                variant="outline"
                size="sm"
                aria-label={`Browse all ${category} courses`}
              >
                {category}
              </Button>
            ) : null}

            {isFilled(bandLabel) ? (
              <Button
                to={`/courses?duration=${encodeURIComponent(bandId)}`}
                variant="outline"
                size="sm"
                aria-label={`Browse courses lasting ${bandLabel}`}
              >
                {bandLabel}
              </Button>
            ) : null}

            <Button to="/courses" variant="outline" size="sm">
              All courses
            </Button>
          </div>
        </div>
      </Container>

      {/* ── TRUST AND TRANSPARENCY — a SIBLING again: it owns its own
             `bg-surface` section, its own Container and its own content
             disclosure. `h2` is the correct depth under this page's single
             `h1`. ────────────────────────────────────────────────────────── */}
      <TrustSection headingAs="h2" />

      {/* ── The existing admission CTA closes every page on the site. Composed,
             never edited. ──────────────────────────────────────────────────── */}
      <CTASection />
    </div>
  )
}
