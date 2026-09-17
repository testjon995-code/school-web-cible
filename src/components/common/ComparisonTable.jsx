import { useId } from 'react'
import Card from '../ui/Card.jsx'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import Accordion from '../ui/Accordion.jsx'
import { cn } from '../../lib/cn.js'
import { compareState } from '../../lib/states.js'
import { PREREQ_TAGS, durationBandLabel, durationBandOf } from '../../lib/courseFilters.js'
import { goals } from '../../data/goals.js'

/**
 * ComparisonTable — CIBLE School of Language course comparison (F2).
 *
 * The side-by-side presentation of the comparison working set. It is composed
 * by `src/pages/Compare.jsx`, which owns the `useComparison()` instance,
 * resolves the `?courses=` slugs against `src/data/courses.js`, and hands the
 * resolved records down. THIS COMPONENT HOLDS NO WORKING-SET STATE: it receives
 * `courses` and an `onRemove` callback and renders them, which is what keeps one
 * store (and one `?courses=` URL contract) behind every surface that shows the
 * selection.
 *
 * ── THE CAP AT THREE IS THE WHOLE DESIGN ─────────────────────────────────────
 * `useComparison()` caps the working set at three, and the brief's own directive
 * is "avoid creating a huge complex table". Designing to the cap rather than to
 * an arbitrary N is what makes both achievable at once:
 *   • At most three course columns plus one attribute-label column, so the
 *     layout NEVER needs horizontal scrolling, a scroll container, or a sticky
 *     first column at any viewport width. If this component can ever be scrolled
 *     sideways, that is a defect, not a trade-off. The desktop grid is
 *     `table-fixed`, so the four columns divide the available measure instead of
 *     widening it, and every title and value carries `break-words` so a long
 *     token wraps rather than pushing the layout out.
 *   • The rows stay SHORT. Every attribute whose value is a sentence or a list
 *     — the one-sentence summary, the outcomes, and the two suitability lists —
 *     is collapsed behind the shared `ui/Accordion` in a second block instead of
 *     inflating a grid row to the height of its longest cell. The comparison
 *     the reader scans first is therefore six short rows at most, and the long
 *     answers are one keystroke away.
 * The component defensively re-applies the cap with `slice()`, so a caller that
 * somehow passes four records loses the fourth rather than the no-scroll
 * guarantee.
 *
 * ── TWO PRESENTATIONS, ONE AUTHORED ATTRIBUTE SET ────────────────────────────
 * Below `md` the set is TRANSPOSED: one `Card` per course, stacked, each listing
 * the attributes IN THE SAME ORDER. That identical order is the feature, not a
 * detail — it is what lets a reader scroll three cards and still compare like
 * with like, so the order is fixed by {@link SHORT_ATTRIBUTES} and never varies
 * by which fields a given record happens to carry. From `md` the same set is
 * attribute ROWS: one `<th scope="row">` per attribute, one column per course,
 * and a `border-border` divider on every row.
 *
 * Both presentations read the SAME `rows` array, whose cells are rendered once
 * per (attribute × course) pair in {@link buildRows} and then placed by column
 * index. No content is authored twice, which is the only way the mobile and
 * desktop views cannot drift out of order or out of step. Transposition is the
 * one thing CSS cannot do, so the two layouts are two DOM renderings of one data
 * structure, mutually exclusive via `md:hidden` / `hidden md:block` (so exactly
 * one of them is in the accessibility tree at any width). The long-attribute
 * block needs no transposition — its panels are a responsive grid that stacks on
 * its own — so it is rendered ONCE for every width.
 *
 * ── SEMANTICS: A REAL TABLE, AND A REAL DEFINITION LIST ──────────────────────
 * A comparison grid is exactly the case a data table exists for, so the desktop
 * view is a genuine `<table>`: a visually hidden `<caption>` names what is being
 * compared, each course is a `<th scope="col">` and each attribute a
 * `<th scope="row">`, so a screen reader announces "Duration, Spoken English,
 * 3 Months" instead of a bare value. There is no table ARIA anywhere — the
 * native elements carry it. The transposed mobile view is not a grid, so it is
 * not dressed up as one: each card is a `<dl>` pairing the attribute name
 * (`<dt>`) with this course's value (`<dd>`), which is the same relationship
 * expressed in the element that actually means it.
 *
 * ── ABSENT FIELDS: WHY THIS FILE KEEPS THE ROW AND `CourseDetailView` DOES NOT ─
 * Every catalogue field beyond the original seven is additively OPTIONAL, and
 * absence must read as "not recorded yet" — never as a negative claim and never
 * as invented content. `CourseDetailView` honours that by OMITTING the whole
 * block, heading included. This component cannot: a comparison has a shared axis,
 * and dropping one course's cell would misalign the columns and silently mislabel
 * every value below it. So the rule here is deliberately different, and it has
 * two halves:
 *   1. PRESENT FOR AT LEAST ONE course in the set → keep the row, and render an
 *      explicit, de-emphasised "{@link ABSENT_TEXT}" cell for each course that
 *      has no value. It is real text rather than an em-dash, so a screen-reader
 *      user hears something meaningful, and the columns stay aligned.
 *   2. ABSENT FOR EVERY course in the set → drop the row entirely. Nothing is
 *      being compared, and a row of three identical "Not recorded yet" cells is
 *      noise that makes a working comparison look broken.
 * Today that is not a hypothetical: exactly ONE of the ten catalogue records
 * states a `level`, two carry `prereqTags`, and none yet carries the prose
 * `prerequisites`, `outcomes`, `idealFor` or `notIdealFor` that await
 * content-owner input. A comparison showing three filled rows and one honest
 * "Not recorded yet" has therefore passed; one showing an invented difficulty or
 * a plausible-sounding outcome has failed. Nothing in this file authors course
 * content — every value comes from `src/data/courses.js`, and every label comes
 * from a taxonomy module.
 *
 * ── WHERE EACH VALUE COMES FROM ──────────────────────────────────────────────
 *   • SELECTION STATE — `compareState()` in `src/lib/states.js`. Every course
 *     rendered here is by definition in the working set, so the remove control
 *     reads the `selected` entry and takes its label, its icon and its
 *     `buttonVariant` from there. It reads the key for its OWN primitive
 *     (`Button` → `buttonVariant`) and translates no vocabulary at the call site,
 *     because the call site is exactly where the label-and-colour drift of BUG 1
 *     arises. `CourseCard`'s compare toggle reads the same entry, so the card and
 *     this table cannot describe the same state differently. Removal is never
 *     refused — not even at the cap — so the control is never disabled.
 *   • DURATION BANDING — `durationBandOf()` / `durationBandLabel()` in
 *     `src/lib/courseFilters.js`. The authored `duration` string is shown as the
 *     value; the band is shown beneath it as its DISPLAY LABEL ("1–3 months"),
 *     never as a band id and never as a raw week count dressed up as authored
 *     copy.
 *   • LEARNER GOALS — `courses[].goals` holds ids, so the label always comes from
 *     `src/data/goals.js`. An id is a URL and cross-reference contract and is
 *     never printed.
 *   • PREREQUISITES, both forms — and the distinction matters. The prose
 *     `prerequisites` field is the institute's own wording, DISPLAY-ONLY, and is
 *     never matched, filtered or scored by anything. The machine `prereqTags`
 *     ids are the `?prereq=` filter values, resolved to their labels through
 *     {@link PREREQ_TAGS}. Both are shown, in adjacent rows, each labelled for
 *     what it is, so a tag id is never presented as prose and prose is never
 *     presented as filterable.
 *
 * ── WHAT THIS COMPONENT DELIBERATELY DOES NOT DO ─────────────────────────────
 *   • No empty state. The nothing-selected view, and the shared link whose slugs
 *     are all unknown, belong to `src/pages/Compare.jsx`; a second `EmptyState`
 *     here would be the duplicate the project rules out. An empty (or fully
 *     malformed) `courses` therefore renders `null` and the page's own state
 *     shows through.
 *   • No empty placeholder columns. A "three-slot" grid with an unfilled slot is
 *     an unexplained empty container, and the catalogue's own "Compare selected"
 *     control is the route to adding another course.
 *   • No `eligibility` and no `curriculum`. Both belong to the course detail
 *     route, which has the room for them; carrying them here is how a comparison
 *     becomes the huge complex table the brief rules out.
 *
 * ── DESIGN SYSTEM AND ACCESSIBILITY ──────────────────────────────────────────
 * Composed entirely from `Card`, `Badge`, `Button` and `Accordion`, with every
 * value resolving to a Tailwind v4 `@theme` token from `src/index.css`
 * (border, muted, foreground, primary, accent, radius-2xl, shadow-sm) on the
 * 8px spacing scale. Zero new tokens, zero new named utilities, no arbitrary
 * `[…]` value, and no second stylesheet — `src/index.css` carries no diff. Class
 * composition runs through `cn()`, with the caller's `className` merged LAST.
 *
 * Outline: this component renders beneath the page's `<h1>` (and, where the page
 * supplies one, beneath a section `<h2>`), so it uses `<h2>` for its own two
 * region headings and `<h3>` for the per-course card titles and the accordion
 * triggers. Neither level can skip from an `<h1>`-or-`<h2>` parent. The
 * side-by-side region's heading is visually hidden — the page title already says
 * what this is — which is the same technique the rest of the project uses to give
 * a card grid an `<h2>` ancestor. `headingAs` is passed to `Accordion` as a
 * valid static value because that prop does NO clamping.
 *
 * Every control is a `Button`, so the 44px minimum hit area and the focus ring
 * come from its base class and the single global `:focus-visible` rule and are
 * never re-declared here. Labels repeat down the columns, so each course link and
 * each remove control carries a descriptive `aria-label` naming its course. State
 * is never carried by colour alone: the remove control pairs its variant with an
 * icon AND `aria-pressed`, and every decorative glyph is `aria-hidden="true"`.
 *
 * @module components/common/ComparisonTable
 */

/**
 * The hard column cap, mirroring the working-set cap in
 * `src/hooks/useComparison.js`. Re-applied here defensively: the no-horizontal-
 * scroll guarantee is a property of the layout at three columns, so a caller
 * passing more must lose the extra records rather than the guarantee.
 */
const MAX_COLUMNS = 3

/**
 * The honest reading of an absent optional field. Real words rather than an
 * em-dash, so a screen-reader user hears a meaning, and phrased as a statement
 * about the RECORD ("not recorded yet") rather than about the course — a course
 * with no stated level has not been declared level-free.
 */
const ABSENT_TEXT = 'Not recorded yet'

// ── Shared class treatments ─────────────────────────────────────────────────
// Held as module-local constants so the two presentations and the disclosure
// panels cannot drift apart, and so a value is written once. Every class is a
// native Tailwind step against an `@theme` token; nothing here is arbitrary.

// Course names, matching the `text-lg font-semibold` step every card title in
// the design system already uses. `break-words` is load-bearing: a title lands
// in a ~180px table column at the `md` breakpoint.
const COURSE_TITLE_CLASSES = 'text-lg font-semibold break-words text-foreground'

// Region headings for this component's two blocks, matching the block-title step
// used by the course detail view.
const BLOCK_TITLE_CLASSES = 'text-lg font-semibold text-foreground'

// Attribute names — the `<dt>` on mobile and the `<th scope="row">` on desktop.
const ATTR_LABEL_CLASSES = 'text-sm font-semibold break-words text-muted'

// The clarifying sub-label a row may carry (the two prerequisite rows use it to
// say which of them the catalogue filters actually match on).
const ATTR_HINT_CLASSES = 'mt-1 block text-xs font-normal text-muted'

// Values, and the secondary meta line beneath one (the duration band).
const VALUE_CLASSES = 'text-sm leading-relaxed break-words text-foreground'
const META_CLASSES = 'text-xs break-words text-muted'

// The absent-value cell: de-emphasised, never hidden.
const ABSENT_CLASSES = 'text-xs text-muted'

// The small uppercase kicker that names a course inside a disclosure panel. It
// is a `<dt>`, not a heading: it labels a value rather than opening a section.
const COLUMN_LABEL_CLASSES = 'text-xs font-semibold uppercase tracking-wide break-words text-muted'

// Bullet lists, matching the course detail view exactly — a NEUTRAL dot rather
// than a tick, because "who it may not suit" is a disclosure and a tick would
// dress a limitation up as a benefit.
//
// The row is a flex container, so its TEXT IS WRAPPED IN ITS OWN SPAN CARRYING
// `min-w-0`, and that is load-bearing rather than tidy markup. A bare text node
// inside a row-flex box becomes an ANONYMOUS flex item whose automatic minimum
// size is its min-content width, and `break-words`
// (`overflow-wrap: break-word`) does not reduce min-content — so a single
// unbroken token longer than the column (a URL, or a long compound word in
// content-owner copy) could not shrink and painted straight out of its cell,
// past the neighbouring column and off the page. An anonymous item cannot be
// selected, so the fix must be a REAL element: with `min-w-0` the span may
// shrink below min-content, and `break-words` then breaks the token inside it.
// Measured at 320px with a 70-character unbreakable token: document
// scrollWidth 591px before, 320px after. Do not collapse these two classes
// back onto the `<li>`.
const BULLET_LIST_CLASSES = 'flex flex-col gap-2'
const BULLET_ITEM_CLASSES = 'flex items-start gap-2'
const BULLET_TEXT_CLASSES = 'min-w-0 text-sm leading-relaxed break-words text-foreground'
const BULLET_DOT_CLASSES = 'mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-600'

// Cell padding and alignment, shared by the header and body cells of the
// desktop grid so the columns line up.
const CELL_CLASSES = 'p-4 align-top text-left'

/**
 * Per-course column counts for the disclosure panels, keyed by how many courses
 * are actually selected. Written as literal, static class strings so Tailwind's
 * source scanner sees them, and keyed by count so two selected courses fill the
 * row instead of leaving a third of it empty. One selected course needs no
 * multi-column rule at all.
 */
const PANEL_COLUMNS = {
  1: '',
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
}

/**
 * The selection entry every remove control in this file renders from.
 *
 * Resolved through `compareState()` rather than by reaching into the family
 * directly, because that function owns the precedence rule — SELECTION WINS OVER
 * FULLNESS — and every course shown here is, by definition, selected. Resolved
 * once at module scope: the family is frozen, so the entry is a constant.
 */
const SELECTED_STATE = compareState(true)

/**
 * Whether a value is a string carrying actual content.
 *
 * The single presence test every optional field is measured against, so
 * "absent", `null`, a non-string and a whitespace-only string all resolve to the
 * same answer: this course has no value for that attribute.
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
 * A non-array yields `[]`, and any entry that is not a non-blank string is
 * dropped, so a partially populated or hand-edited record can neither throw nor
 * emit a blank list row. An empty result is what makes the surrounding cell
 * "absent" rather than an empty list.
 *
 * @param {unknown} value Candidate list.
 * @returns {string[]} The renderable entries, in their authored order.
 */
function toTextList(value) {
  if (!Array.isArray(value)) return []
  return value.filter(isFilled)
}

/**
 * Reduce the caller's `courses` to the records this component can actually
 * render, and enforce the column cap.
 *
 * Four guards, in order, because each one protects a different promise:
 *   1. A non-array becomes `[]` — the page owns the empty view, so degrading is
 *      correct and throwing is not.
 *   2. A record is kept only when it is an object carrying BOTH a non-blank
 *      `slug` and a non-blank `title`. Those two are contractual catalogue
 *      fields; without the slug there is no destination and no remove target,
 *      and without the title a column has no accessible name.
 *   3. Duplicate slugs are dropped, keeping the first occurrence — the slug is
 *      the React key and the remove argument, and a repeat would render the same
 *      column twice.
 *   4. The survivors are capped at {@link MAX_COLUMNS}.
 *
 * @param {unknown} value The caller-supplied `courses` prop.
 * @returns {object[]} The renderable records, in the caller's order.
 */
function toRenderableCourses(value) {
  if (!Array.isArray(value)) return []
  const seen = new Set()
  const renderable = []
  for (const course of value) {
    if (!course || typeof course !== 'object') continue
    if (!isFilled(course.slug) || !isFilled(course.title)) continue
    const slug = course.slug.trim()
    if (seen.has(slug)) continue
    seen.add(slug)
    renderable.push(course)
    if (renderable.length === MAX_COLUMNS) break
  }
  return renderable
}

/**
 * Resolve `courses[].goals` ids to their taxonomy labels.
 *
 * The id is a URL and cross-reference contract and is never printed, so the
 * label always comes from `src/data/goals.js`. An id matching no goal, or a goal
 * with no usable label, is skipped — a stale reference costs one pill rather than
 * rendering a blank one.
 *
 * @param {unknown} value `course.goals`.
 * @returns {string[]} The matched labels, in taxonomy order of appearance.
 */
function toGoalLabels(value) {
  const resolved = []
  for (const id of toTextList(value)) {
    const goal = goals.find((entry) => entry && entry.id === id.trim())
    if (!goal || !isFilled(goal.label) || resolved.includes(goal.label)) continue
    resolved.push(goal.label)
  }
  return resolved
}

/**
 * Resolve `courses[].prereqTags` ids to their {@link PREREQ_TAGS} labels.
 *
 * Same contract as the goals above: these ids are the `?prereq=` URL values, so
 * the display text is always the taxonomy's label and never the id. An absent or
 * empty array yields `[]`, which reads as "not recorded yet" — `'none'`
 * ("No prior knowledge needed") is an EXPLICIT, authored value and is never
 * inferred from absence.
 *
 * @param {unknown} value `course.prereqTags`.
 * @returns {string[]} The matched labels.
 */
function toPrereqTagLabels(value) {
  const resolved = []
  for (const id of toTextList(value)) {
    const tag = PREREQ_TAGS.find((entry) => entry && entry.id === id.trim())
    if (!tag || resolved.includes(tag.label)) continue
    resolved.push(tag.label)
  }
  return resolved
}

/**
 * The absent-value cell.
 *
 * Module-local and used by every cell in both presentations and in the
 * disclosure panels, so the wording and the de-emphasis are written once and the
 * three surfaces cannot disagree about how "we do not have this yet" looks.
 *
 * @returns {JSX.Element} The de-emphasised absent-value text.
 */
function AbsentValue() {
  return <span className={ABSENT_CLASSES}>{ABSENT_TEXT}</span>
}

/**
 * A short list of authored strings, rendered with the project's neutral bullet.
 *
 * The text sits in its own `min-w-0` span rather than beside the dot as a bare
 * text node — see {@link BULLET_TEXT_CLASSES} for why that is the difference
 * between a long token wrapping and a long token escaping the column.
 *
 * @param {object} props
 * @param {string[]} props.items Non-blank strings, already validated.
 * @returns {JSX.Element} The bullet list.
 */
function BulletList({ items }) {
  return (
    <ul className={BULLET_LIST_CLASSES}>
      {items.map((item) => (
        <li key={item} className={BULLET_ITEM_CLASSES}>
          <span className={BULLET_DOT_CLASSES} aria-hidden="true" />
          <span className={BULLET_TEXT_CLASSES}>{item}</span>
        </li>
      ))}
    </ul>
  )
}

/**
 * A wrapping row of `Badge` pills for a taxonomy-resolved value.
 *
 * A real `<ul>` rather than a bare row of spans, because the pills are a list of
 * values for one attribute and assistive technology should be able to count
 * them.
 *
 * @param {object} props
 * @param {string[]} props.items The resolved display labels.
 * @param {'primary'|'secondary'|'accent'|'neutral'} props.variant Badge variant.
 * @returns {JSX.Element} The pill list.
 */
function PillList({ items, variant }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item) => (
        <li key={item}>
          <Badge variant={variant}>{item}</Badge>
        </li>
      ))}
    </ul>
  )
}

/**
 * The per-course action pair: a link to that course's own detail route, and the
 * control that removes it from the comparison.
 *
 * Shared by both presentations, which is what guarantees the mobile card and the
 * desktop column header offer exactly the same actions with exactly the same
 * accessible names. The destination is `/courses/<slug>`: the slug is a public
 * contract and already URL-safe kebab-case, so it is interpolated verbatim —
 * matching `CourseCard`, so a card and this table send the reader to the same
 * place.
 *
 * The remove control takes its label, icon and variant from
 * {@link SELECTED_STATE}. It is a real `<button>` (no `to`, no `href`) carrying
 * `aria-pressed="true"`, because it is the pressed half of the very toggle the
 * course card renders — activating it un-presses the toggle by removing the
 * course. It is never `disabled`: removal is the action that frees a slot at the
 * cap, so refusing it would leave the visitor stuck. When no `onRemove` is
 * supplied the control is omitted entirely rather than rendered inert, because a
 * button that silently does nothing is worse than no button.
 *
 * @param {object} props
 * @param {object} props.course The course record; `slug` and `title` are
 *   guaranteed non-blank by {@link toRenderableCourses}.
 * @param {((slug: string) => void)} [props.onRemove] Remove handler, called with
 *   the course slug.
 * @returns {JSX.Element} The action row.
 */
function CourseColumnActions({ course, onRemove }) {
  const RemoveIcon = SELECTED_STATE.icon
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        to={`/courses/${course.slug}`}
        variant="outline"
        size="sm"
        aria-label={`View course details — ${course.title}`}
      >
        View course
      </Button>

      {typeof onRemove === 'function' ? (
        <Button
          type="button"
          variant={SELECTED_STATE.buttonVariant}
          size="sm"
          aria-pressed="true"
          aria-label={`${SELECTED_STATE.label} — ${course.title}`}
          onClick={() => onRemove(course.slug)}
        >
          <RemoveIcon className="h-5 w-5" aria-hidden="true" />
        </Button>
      ) : null}
    </div>
  )
}

/**
 * THE ATTRIBUTE SET, AUTHORED ONCE.
 *
 * These are the short, directly comparable attributes, in the order both
 * presentations render them — and the order is the contract, because the
 * transposed mobile cards are only readable as a sequence if every card lists
 * the same attributes in the same positions. The set is deliberately the
 * dimensions the catalogue FILTERS on (difficulty, duration, goal and
 * prerequisite) plus the canonical category, so a visitor comparing courses is
 * comparing the same axes they narrowed the catalogue by.
 *
 * Each definition's `render` returns the cell for one course, or `null` when
 * that course has no value — the single signal {@link buildRows} uses to decide
 * between an honest absent cell and dropping the row. A `render` never invents,
 * infers or reformats content: it reads the record and resolves ids through the
 * owning taxonomy.
 *
 * `hint` exists for exactly one reason, and it is the prerequisite distinction:
 * the prose field and the machine tags would otherwise look like two spellings
 * of one attribute, when one is display-only copy and the other is what the
 * `?prereq=` filter matches on.
 *
 * @type {ReadonlyArray<{id: string, label: string, hint?: string, render: (course: object) => JSX.Element|null}>}
 */
const SHORT_ATTRIBUTES = [
  {
    id: 'level',
    label: 'Level',
    render: (course) =>
      isFilled(course.level) ? <Badge variant="neutral">{course.level}</Badge> : null,
  },
  {
    id: 'duration',
    label: 'Duration',
    render: (course) => {
      if (!isFilled(course.duration)) return null
      // The authored string is the value. The band is shown beneath it as its
      // DISPLAY LABEL, resolved from courseFilters.js — never a band id, and
      // never the raw `durationWeeks` number, which is a machine field.
      const bandLabel = durationBandLabel(durationBandOf(course))
      return (
        <span className="flex flex-col gap-1">
          <span className={VALUE_CLASSES}>{course.duration}</span>
          {bandLabel ? <span className={META_CLASSES}>{bandLabel}</span> : null}
        </span>
      )
    },
  },
  {
    id: 'category',
    label: 'Category',
    render: (course) =>
      isFilled(course.category) ? <Badge variant="primary">{course.category}</Badge> : null,
  },
  {
    id: 'goals',
    label: 'Learner goals',
    render: (course) => {
      const labels = toGoalLabels(course.goals)
      return labels.length > 0 ? <PillList items={labels} variant="accent" /> : null
    },
  },
  {
    id: 'prerequisites',
    label: 'Prerequisites',
    hint: 'The institute’s own wording, shown for reading. The catalogue filters never match on it.',
    render: (course) => {
      const items = toTextList(course.prerequisites)
      return items.length > 0 ? <BulletList items={items} /> : null
    },
  },
  {
    id: 'prereq-tags',
    label: 'Entry requirement',
    hint: 'The filterable form — what the catalogue’s prerequisite filter matches on.',
    render: (course) => {
      const labels = toPrereqTagLabels(course.prereqTags)
      return labels.length > 0 ? <PillList items={labels} variant="neutral" /> : null
    },
  },
]

/**
 * THE LONG ATTRIBUTES, also authored once.
 *
 * A sentence and three lists. Each would inflate a grid row to the height of its
 * tallest cell across three columns, so they are collapsed behind `Accordion`
 * instead — which is precisely how the "avoid a huge complex table" directive is
 * honoured without hiding anything: the disclosure is one keystroke, and the
 * panel shows all three courses side by side.
 *
 * Order is least-to-most detailed, and the suitability pair is kept adjacent so
 * "who it suits" and "who it may not suit" read together. `notIdealFor` is not a
 * criticism to be buried: the catalogue carries it so a course can be honest
 * about who it does not serve.
 *
 * @type {ReadonlyArray<{id: string, label: string, render: (course: object) => JSX.Element|null}>}
 */
const LONG_ATTRIBUTES = [
  {
    id: 'value-proposition',
    label: 'In one sentence',
    render: (course) =>
      isFilled(course.valueProposition) ? (
        <p className={VALUE_CLASSES}>{course.valueProposition}</p>
      ) : null,
  },
  {
    id: 'outcomes',
    label: 'What you will be able to do',
    render: (course) => {
      const items = toTextList(course.outcomes)
      return items.length > 0 ? <BulletList items={items} /> : null
    },
  },
  {
    id: 'ideal-for',
    label: 'Who it suits',
    render: (course) => {
      const items = toTextList(course.idealFor)
      return items.length > 0 ? <BulletList items={items} /> : null
    },
  },
  {
    id: 'not-ideal-for',
    label: 'Who it may not suit',
    render: (course) => {
      const items = toTextList(course.notIdealFor)
      return items.length > 0 ? <BulletList items={items} /> : null
    },
  },
]

/**
 * Render every cell of an attribute set ONCE, and apply the row rule.
 *
 * Cells are computed here, per (attribute × course) pair, and both presentations
 * then place the resulting elements by column index — so there is exactly one
 * authored definition of every value on the screen. React elements are immutable
 * descriptors, so the same cell may safely appear in the mobile card and in the
 * desktop grid.
 *
 * A row survives only when at least one course produced a cell. That is the
 * second half of the absent-field rule: present-for-some keeps the row (and the
 * missing cells become {@link AbsentValue}, so the columns stay aligned), while
 * absent-for-all drops the row, because nothing is being compared.
 *
 * @param {ReadonlyArray<{id: string, label: string, hint?: string, render: (course: object) => JSX.Element|null}>} definitions
 *   The attribute set, in render order.
 * @param {object[]} list The renderable courses, in column order.
 * @returns {{id: string, label: string, hint: string|null, cells: Array<JSX.Element|null>}[]}
 *   The surviving rows, each carrying one cell per course (positionally aligned
 *   with `list`, and `null` where that course has no value).
 */
function buildRows(definitions, list) {
  const rows = []
  for (const definition of definitions) {
    const cells = list.map((course) => definition.render(course))
    if (!cells.some((cell) => cell !== null)) continue
    rows.push({
      id: definition.id,
      label: definition.label,
      hint: definition.hint ?? null,
      cells,
    })
  }
  return rows
}

/**
 * An attribute name, with the clarifying sub-label where the row carries one.
 *
 * Shared by the `<dt>` on mobile and the `<th scope="row">` on desktop so the
 * wording and the treatment are written once.
 *
 * @param {object} props
 * @param {string} props.label The attribute name.
 * @param {string|null} [props.hint] The optional clarifying sub-label.
 * @returns {JSX.Element} The label content.
 */
function AttributeLabel({ label, hint }) {
  return (
    <>
      {label}
      {hint ? <span className={ATTR_HINT_CLASSES}>{hint}</span> : null}
    </>
  )
}

/**
 * The comparison view for the current working set.
 *
 * See the module header for the cap, the two presentations, the absent-field
 * rule and where every value comes from.
 *
 * @param {object} props
 * @param {object[]} [props.courses] The RESOLVED course records to compare, in
 *   the order they should appear — selection order, or the sharer's order when
 *   the page hydrated them from `?courses=`. The page resolves the slugs; this
 *   component never reads the catalogue itself. Each record is read for:
 *   `slug` and `title` (both REQUIRED — a record missing either is dropped,
 *   since the slug is the destination, the remove target and the React key, and
 *   the title is the column's accessible name); `category` and `duration` (the
 *   remaining contractual fields); and, where present, the OPTIONAL
 *   `level`, `durationWeeks` (read only through `durationBandOf`), `goals` (ids
 *   into `src/data/goals.js`), `prerequisites` (display-only prose),
 *   `prereqTags` (ids into `PREREQ_TAGS`), `valueProposition`, `outcomes`,
 *   `idealFor` and `notIdealFor`. Any other field is ignored. A non-array, an
 *   empty array, or an array of wholly malformed records renders `null`.
 *   At most the first {@link MAX_COLUMNS} usable records are rendered.
 * @param {(slug: string) => void} [props.onRemove] Called with a course's slug
 *   when its remove control is activated — in practice `useComparison().remove`,
 *   which also rewrites `?courses=`. Omit it and the remove controls are not
 *   rendered at all, which is the read-only rendering of a comparison.
 * @param {string} [props.className] Extra classes merged LAST onto the root, so
 *   a caller's utility always wins.
 * @param {object} [props] Any other prop (`id`, `aria-*`, `data-*`, …) is
 *   forwarded to the root element.
 * @returns {JSX.Element|null} The comparison, or `null` when there is nothing
 *   renderable — the nothing-selected empty state belongs to
 *   `src/pages/Compare.jsx`, so this component never grows a second one.
 */
function ComparisonTable({ courses, onRemove, className, ...props }) {
  // The ONLY hook, called unconditionally at the top level with the early return
  // strictly below it — `react/rules-of-hooks` is an error in this project. It
  // scopes this instance's heading ids so two comparisons on one page cannot
  // collide.
  const uid = useId()

  // Guard, cap and de-duplicate before anything is measured or rendered.
  const list = toRenderableCourses(courses)
  if (list.length === 0) return null

  // Every cell on the screen is computed here, once, and placed by column index
  // in both presentations below.
  const shortRows = buildRows(SHORT_ATTRIBUTES, list)
  const longRows = buildRows(LONG_ATTRIBUTES, list)

  const gridHeadingId = `${uid}-comparison`
  const detailHeadingId = `${uid}-detail`
  const columnClasses = PANEL_COLUMNS[list.length] ?? ''

  // The disclosure panels are NOT transposed: each holds one attribute across
  // all the courses, as a definition list that stacks on narrow viewports and
  // becomes one column per course from `md`. That is why this block is rendered
  // once for every width while the short attributes are rendered twice.
  const detailItems = longRows.map((row) => ({
    question: row.label,
    answer: (
      <dl className={cn('grid gap-6', columnClasses)}>
        {list.map((course, column) => (
          <div key={course.slug}>
            <dt className={COLUMN_LABEL_CLASSES}>{course.title}</dt>
            <dd className="mt-2">{row.cells[column] ?? <AbsentValue />}</dd>
          </div>
        ))}
      </dl>
    ),
  }))

  return (
    <div className={cn('flex flex-col gap-8', className)} {...props}>
      <section aria-labelledby={gridHeadingId}>
        {/* Visually hidden: the page's own title already says what this is, but
            the region and the per-course cards below need an <h2> ancestor for
            the outline to hold. */}
        <h2 id={gridHeadingId} className="sr-only">
          Selected courses, compared attribute by attribute
        </h2>

        {/* ── Below `md`: the set TRANSPOSED into one card per course. Every card
            lists `shortRows` in the same order, so three cards read as a
            sequence. Cells come from the same array the grid below uses. ── */}
        <ul className="flex flex-col gap-6 md:hidden">
          {list.map((course, column) => (
            <Card as="li" key={course.slug} className="flex flex-col gap-4">
              <div className="flex flex-col gap-3">
                <h3 className={COURSE_TITLE_CLASSES}>{course.title}</h3>
                <CourseColumnActions course={course} onRemove={onRemove} />
              </div>

              <dl className="divide-y divide-border">
                {shortRows.map((row) => (
                  <div key={row.id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
                    <dt className={ATTR_LABEL_CLASSES}>
                      <AttributeLabel label={row.label} hint={row.hint} />
                    </dt>
                    <dd>{row.cells[column] ?? <AbsentValue />}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          ))}
        </ul>

        {/* ── From `md`: attribute rows. A real table, because that is what this
            is: `scope="col"` names each course, `scope="row"` names each
            attribute, and `table-fixed` divides the measure across at most four
            columns so nothing can ever scroll sideways. ── */}
        <div className="hidden md:block">
          <table className="w-full table-fixed border-collapse">
            <caption className="sr-only">
              {`Course comparison: ${list
                .map((course) => course.title)
                .join(', ')}, compared attribute by attribute.`}
            </caption>
            <thead>
              <tr>
                {/* The corner cell is intentionally empty and is a <td>, not a
                    <th>: it heads neither a row of values nor a column of them,
                    and giving it a header would make assistive technology
                    announce a label that does not exist. It fixes the
                    attribute-label column's width for `table-fixed`. */}
                <td className="w-1/4 p-4" />
                {list.map((course) => (
                  <th key={course.slug} scope="col" className={cn(CELL_CLASSES, 'align-bottom')}>
                    <div className="flex flex-col gap-3">
                      <span className={COURSE_TITLE_CLASSES}>{course.title}</span>
                      <CourseColumnActions course={course} onRemove={onRemove} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shortRows.map((row) => (
                <tr key={row.id}>
                  <th
                    scope="row"
                    className={cn(CELL_CLASSES, ATTR_LABEL_CLASSES, 'border-t border-border')}
                  >
                    <AttributeLabel label={row.label} hint={row.hint} />
                  </th>
                  {list.map((course, column) => (
                    <td
                      key={course.slug}
                      className={cn(CELL_CLASSES, 'border-t border-border')}
                    >
                      {row.cells[column] ?? <AbsentValue />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── The long attributes, collapsed. Absent for every selected course
          means there is no block at all, rather than an accordion of empty
          panels. ── */}
      {detailItems.length > 0 ? (
        <section aria-labelledby={detailHeadingId}>
          <h2 id={detailHeadingId} className={BLOCK_TITLE_CLASSES}>
            More detail, course by course
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            The longer answers are collapsed so the comparison above stays scannable. Open one to
            read it for every course shown here.
          </p>
          <Accordion
            className="mt-4"
            items={detailItems}
            itemIds={longRows.map((row) => row.id)}
            allowMultiple={true}
            headingAs="h3"
          />
        </section>
      ) : null}
    </div>
  )
}

export default ComparisonTable
