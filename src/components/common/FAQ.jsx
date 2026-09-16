import { motion } from 'framer-motion'
import Container from '../ui/Container.jsx'
import SectionHeading from '../ui/SectionHeading.jsx'
import Accordion from '../ui/Accordion.jsx'
import Button from '../ui/Button.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import { cn } from '../../lib/cn.js'
import { useScrollReveal, prefersReducedMotion, fadeUp } from '../../hooks/useScrollReveal.js'
import faq from '../../data/faq.js'

/**
 * Clamp an arbitrary heading-level input into the valid HTML range h1–h6.
 *
 * Non-numeric / non-finite input falls back to 2 (the section default) so a
 * bad prop can never produce an invalid tag such as `h0` or `h7`.
 *
 * @param {number} level Desired heading level.
 * @returns {number} An integer in the inclusive range [1, 6].
 */
function clampHeadingLevel(level) {
  const n = Math.trunc(Number(level))
  if (!Number.isFinite(n)) return 2
  return Math.min(6, Math.max(1, n))
}

/**
 * Whether a raw FAQ entry can actually be rendered by `ui/Accordion`.
 *
 * An entry is renderable only when it is a plain (non-null) object that exposes
 * a non-empty string question (`question` or the tolerated `title` alias) AND a
 * usable answer (`answer` or the tolerated `content` alias) that is neither
 * `null`/`undefined` nor an empty/whitespace-only string. This is the guard for
 * I-57: it stops malformed data (null holes, missing/blank fields, wrong types)
 * from crashing `ui/Accordion` (which reads `item.question`) or emitting empty,
 * meaningless disclosures.
 *
 * @param {unknown} item Candidate FAQ entry.
 * @returns {boolean} True when the entry is safe to render.
 */
function isRenderableFaqItem(item) {
  if (!item || typeof item !== 'object') return false
  const question = item.question ?? item.title
  if (typeof question !== 'string' || question.trim() === '') return false
  const answer = item.answer ?? item.content
  if (answer === null || answer === undefined) return false
  if (typeof answer === 'string' && answer.trim() === '') return false
  return true
}

/**
 * FAQ — CIBLE School of Language.
 *
 * The canonical frequently-asked-questions SECTION for the SPA. It is a thin,
 * presentational composition layer: it owns the section chrome (vertical
 * rhythm, constrained reading width, an optional heading and a scroll-reveal
 * wrapper) and delegates ALL disclosure behavior to the shared `ui/Accordion`
 * primitive. The accordion — not this component — implements the WAI-ARIA
 * disclosure pattern (`<button aria-expanded aria-controls>`, labelled
 * `role="region"` panels, native keyboard activation and focus management), so
 * this component intentionally builds NO accordion markup of its own (reuse
 * first, zero duplication).
 *
 * Content comes from the single source of truth `src/data/faq.js`
 * (`{ question, answer, category }[]`). Callers may pass their own `items`, or
 * narrow the default list to a single `category` (e.g. `'Admissions'`,
 * `'Courses'`, `'Fees'`, `'General'`) — filtered objects are passed through
 * intact, so the extra `category` key is simply ignored by `ui/Accordion`
 * (which reads only `question`/`answer`).
 *
 * Robustness / empty state (I-57): the incoming `items` prop is treated as
 * untrusted. A non-array value is coerced to an empty list, and every entry is
 * validated with {@link isRenderableFaqItem} so malformed data can neither throw
 * nor render blank disclosures. When the (optionally category-filtered) list is
 * empty, a meaningful, accessible no-results message is shown instead of an
 * empty bordered accordion shell — and that message now renders through the
 * SHARED `ui/EmptyState` primitive rather than the bordered `<p>` this
 * component used to hand-roll. That is a de-duplication, not a new state: this
 * branch was the model `EmptyState` was extracted from, so once the primitive
 * existed, keeping a second implementation here would be exactly the duplicate
 * component the project forbids. It is fixed HERE, in the shared component,
 * precisely so every FAQ surface inherits it — the `/faq` page, a course detail
 * route's cross-referenced questions, and anything added later. A page-level
 * branch would have left this one alive and produced two implementations.
 *
 * Three details of that substitution are load-bearing:
 * - `role="status"` is passed explicitly and is PRESERVED, because the
 *   `'neutral'` tone forwards a caller-supplied role untouched through its
 *   `...rest` spread (only `'caution'` pins `role="alert"`). The polite
 *   announcement this branch has always made therefore survives verbatim.
 * - `tone="neutral"` is correct and deliberate: a category with no matches is
 *   nothing being wrong, so it must not be announced assertively as a failure.
 * - The state answers BOTH of the visitor's questions, which is the primitive's
 *   contract: the `title` says WHAT HAPPENED and the `emptyMessage`-backed
 *   `description` explains it, while the `action` row says WHAT TO DO NEXT
 *   using the shared `Button` (never a hand-rolled link, so the 44px target and
 *   the global focus ring are inherited). "See all questions" is offered only
 *   when the rendered set is actually NARROWED — a `category` filter, or
 *   caller-supplied `items` — because from the unfiltered `/faq` view that link
 *   would point back at the very page the visitor is already on. Contact is
 *   always offered, as a route (`/contact`); no phone number or email address
 *   is restated here, since those live only in `src/data/siteConfig.js`.
 *
 * State identity (I-58): `ui/Accordion` tracks its open panels by positional
 * index. To stop a stale index from staying open on a DIFFERENT question after
 * the visible set changes (category switch, reorder, replaced `items`), the
 * accordion is keyed by the identity of the current question set, so React
 * remounts it with a fresh, correct open state whenever that set changes.
 *
 * Fragment addressing: a single question can be addressed by URL as
 * `#faq-<id>`, where `<id>` is the record's own `faq[].id`. Two separate
 * mechanisms make that work, and they are NOT interchangeable with the
 * `listKey` above:
 * - `itemIds` (derived here, not a prop) makes each disclosure's DOM id
 *   PREDICTABLE. It is built as `list.map((f) => f.id ?? null)` — mapped over
 *   the ALREADY VALIDATED, already category-filtered `list`, i.e. the very array
 *   handed to `ui/Accordion` — because the accordion reads that array
 *   POSITIONALLY and requires it to be equal-length with `items`. Deriving it
 *   from `list` makes the alignment hold by construction. A record with no `id`
 *   contributes a `null` HOLE, and those holes must NEVER be filtered or
 *   compacted away: the accordion substitutes its generated `useId`-plus-index
 *   id for a `null` slot, whereas REMOVING a slot would shift every later id
 *   onto the wrong item. A mixed set (some records with ids, some without) is
 *   therefore fully supported, and callers that supply records with no ids at
 *   all get character-for-character the identifiers they always got.
 * - `openIds` (a pass-through prop) decides which of those addressed panels
 *   starts OPEN. `src/pages/Faq.jsx` passes the fragment's id so the panel is
 *   already open before anything is measured — the first step of its ordered
 *   open -> scroll -> focus sequence. The accordion treats it as an
 *   INITIAL-open set resolved against `itemIds`, not as full control, so this
 *   component owns no new state and a caller that passes nothing keeps the
 *   closed-on-mount behavior exactly.
 * `listKey` solves a third, unrelated problem — RESETTING open state when the
 * visible set changes — so it stays in place alongside both of them.
 *
 * Styling flows entirely through Tailwind `@theme` brand tokens/utilities on
 * the project's 8px spacing scale (`py-16`/`md:py-24`, `mt-8`, `max-w-3xl`,
 * `sr-only`); there are no hardcoded or arbitrary `[..]` values, and the caller
 * `className` is merged LAST via {@link cn} so callers can extend or override.
 * This component declares NO surface styling of its own: the disclosure surface
 * belongs to `ui/Accordion`, the no-results surface (radius, hairline border,
 * `bg-surface` fill, muted body copy) to `ui/EmptyState` over `ui/Card`, and the
 * next-step controls to `ui/Button` — so no token, utility or stylesheet rule is
 * added anywhere for this section.
 *
 * Accessibility (WCAG AA):
 * - Heading levels are configurable (I-59). By default `SectionHeading` renders
 *   the section's `<h2>` and each question sits inside an `<h3>`, keeping the
 *   outline logical (page `<h1>` -> section `<h2>` -> question `<h3>`). When the
 *   FAQ is embedded under an existing heading, or its own heading is hidden,
 *   callers pass `headingLevel`/`questionHeadingLevel` so the questions land at
 *   the correct depth for the surrounding document.
 * - Disclosure semantics, keyboard operability and focus rings are provided by
 *   `ui/Accordion`.
 * - Reduced motion (I-60): when the user prefers reduced motion the reveal
 *   wrapper is rendered statically with `initial={false}` (no fade/slide
 *   animation at all); otherwise it fades/slides in the first time it scrolls
 *   into view via `useScrollReveal`.
 *
 * @param {object} props
 * @param {Array<{question: string, answer: import('react').ReactNode, category?: string}>} [props.items=faq]
 *   FAQ entries to render. Defaults to the full site FAQ dataset. Untrusted:
 *   non-array or malformed entries are handled gracefully.
 * @param {string} [props.category] When provided, only entries whose
 *   `category` matches are rendered (objects are kept intact).
 * @param {import('react').ReactNode} [props.title='Frequently Asked Questions']
 *   Section heading title (rendered by `SectionHeading` at `headingLevel`).
 * @param {import('react').ReactNode} [props.subtitle] Optional supporting
 *   paragraph shown under the title.
 * @param {string} [props.eyebrow='FAQ'] Small uppercase kicker above the title.
 * @param {boolean} [props.showHeading=true] When `false`, the `SectionHeading`
 *   is omitted (useful when the FAQ is embedded under an existing heading).
 * @param {number} [props.headingLevel=2] Heading level (1–6) for the section
 *   title. Also the basis for the default question level.
 * @param {number} [props.questionHeadingLevel] Heading level (1–6) for each
 *   question. Defaults to `headingLevel + 1` (clamped) so questions nest one
 *   level below the section title.
 * @param {boolean} [props.allowMultiple=false] Forwarded to `ui/Accordion`:
 *   when `true`, multiple panels may be open at once; otherwise one at a time.
 * @param {string[]} [props.openIds=[]] Ids of questions — matched against each
 *   record's own `faq[].id` — that should START open, forwarded verbatim to
 *   `ui/Accordion`'s `openIds`. Intended for URL-fragment addressing
 *   (`/faq#faq-<id>`): supplying the id opens that panel on the FIRST paint, so
 *   the caller can scroll it into view and focus it with nothing to re-measure.
 *   It is an INITIAL-open set, not full control — the visitor's own toggling
 *   takes over afterwards, and the set is re-applied only when the request
 *   genuinely changes. Unknown, blank or duplicate-rejected ids are ignored
 *   silently, and the default empty array means "nothing requested", i.e. the
 *   unchanged closed-on-mount behavior.
 * @param {import('react').ReactNode} [props.emptyMessage] The explanatory
 *   sentence shown when there are no renderable questions (e.g. a category with
 *   no matches). Rendered as the `description` of the shared `ui/EmptyState`,
 *   beneath a short title and above the next-step actions, so custom wording
 *   from a caller keeps working and keeps its prominence.
 * @param {string} [props.className] Extra classes merged onto the root
 *   `<section>` after the defaults.
 * @returns {import('react').ReactElement} The rendered FAQ section.
 */
function FAQ({
  items = faq,
  category,
  title = 'Frequently Asked Questions',
  subtitle,
  eyebrow = 'FAQ',
  showHeading = true,
  headingLevel = 2,
  questionHeadingLevel,
  allowMultiple = false,
  openIds = [],
  emptyMessage = 'No questions are available here yet. Please call or WhatsApp us and we will be happy to help.',
  className,
  ...props
}) {
  // Reveal-on-scroll: `inView` flips true when the accordion enters the
  // viewport (and immediately when the user prefers reduced motion). Called
  // unconditionally at the top level to satisfy the Rules of Hooks.
  const { ref, inView } = useScrollReveal()
  // Synchronous, SSR-safe read of the OS "reduce motion" preference. This is a
  // plain helper (not a hook); `useScrollReveal` re-renders the component when
  // the preference is toggled at runtime, so this value stays in sync.
  const reduce = prefersReducedMotion()

  // I-57: treat `items` as untrusted. Coerce non-arrays to an empty list,
  // optionally narrow by category (guarding null holes), then keep only entries
  // `ui/Accordion` can actually render so malformed data never throws or emits
  // blank disclosures.
  const source = Array.isArray(items) ? items : []
  const scoped = category ? source.filter((f) => f && f.category === category) : source
  const list = scoped.filter(isRenderableFaqItem)

  // I-59: resolve the heading tags so the document outline stays correct whether
  // the FAQ owns its section heading or is embedded under another heading depth.
  const titleAs = `h${clampHeadingLevel(headingLevel)}`
  const questionAs = `h${clampHeadingLevel(questionHeadingLevel ?? clampHeadingLevel(headingLevel) + 1)}`
  // Capitalized alias so JSX can render the resolved section heading tag
  // dynamically (React treats a string-valued capitalized identifier as a host
  // element, the same pattern `SectionHeading` uses for its `as` prop). Consumed
  // only by the `showHeading === false` branch below to emit the visually-hidden
  // bridging heading with `sr-only` ON THE HEADING ELEMENT ITSELF.
  const HiddenSectionHeading = titleAs

  // I-58: identity of the current question set. Changing category, reordering,
  // or replacing `items` changes this string, remounting `ui/Accordion` with a
  // fresh open state so a positional index can never stay open on a different
  // question. It is deterministic, so it stays stable across renders when the
  // visible set is unchanged (no needless remounts).
  const listKey = `${category ?? 'all'}:${list.length}:${list.map((f) => f.question ?? f.title).join('\n')}`

  // Per-item id suffixes for `ui/Accordion`, so a question can be addressed by
  // the `#faq-<id>` URL fragment (and opened via `openIds`) instead of depending
  // on an unpredictable `useId()` value. Mapped over `list` — the exact array
  // passed to the accordion, AFTER category filtering and validation — because
  // the accordion reads this array POSITIONALLY and requires it to be
  // equal-length with `items`; deriving it from `list` makes that alignment hold
  // by construction. A record without an `id` contributes a `null` hole, which
  // the accordion fills with its generated `useId`-plus-index id. NEVER filter
  // or compact the holes out: removing a slot would shift every later id onto
  // the WRONG item, which is the precise failure this shape exists to prevent.
  const itemIds = list.map((f) => f.id ?? null)

  // Whether the rendered set is a NARROWED view of the site FAQ — either
  // explicitly filtered by `category`, or a caller-supplied subset (e.g. a
  // course detail route passing only its cross-referenced questions). It gates
  // the "See all questions" affordance in the empty state below: from the
  // unfiltered /faq view that link would point straight back at the page the
  // visitor is already on, which is not a next step.
  const isNarrowed = Boolean(category) || items !== faq

  // WHAT HAPPENED, stated accurately rather than generically: the reason the set
  // is empty differs between a category that matched nothing, a caller-supplied
  // subset with nothing renderable in it, and a genuinely empty FAQ dataset.
  // Naming the real reason is what makes this an explanation instead of a
  // placeholder; the WHAT-NEXT half is carried by the actions below.
  const emptyTitle = category
    ? 'No questions in this category yet'
    : isNarrowed
      ? 'No questions in this section yet'
      : 'No questions available yet'

  return (
    <section className={cn('py-16 md:py-24', className)} {...props}>
      <Container className="max-w-3xl">
        {showHeading ? (
          <SectionHeading eyebrow={eyebrow} title={title} subtitle={subtitle} as={titleAs} />
        ) : (
          // QA Issue 9: even when the visible section heading is suppressed
          // (e.g. the /faq page supplies its own page <h1> above), emit a
          // visually-hidden heading AT THE SECTION LEVEL so the accordion's
          // question headings (h3 by default) are NOT orphaned directly under
          // the page <h1> (an h1 -> h3 skip). The `sr-only` class sits on the
          // heading element itself (identical to the Courses/Faculty/Blog/Events
          // page fixes), so the heading is present in the accessibility tree and
          // the document outline while being removed from the visual layout.
          // Screen-reader users get a labelled section; sighted users see only
          // the surrounding page heading, unchanged.
          <HiddenSectionHeading className="sr-only">{title}</HiddenSectionHeading>
        )}
        <motion.div
          ref={ref}
          variants={fadeUp}
          initial={reduce ? false : 'hidden'}
          animate={inView ? 'visible' : 'hidden'}
          className="mt-8"
        >
          {list.length > 0 ? (
            <Accordion
              key={listKey}
              items={list}
              allowMultiple={allowMultiple}
              headingAs={questionAs}
              itemIds={itemIds}
              openIds={openIds}
            />
          ) : (
            // I-57: the no-results state renders through THE shared
            // `ui/EmptyState` primitive, so this component holds no second
            // empty-state implementation of its own.
            // - `role="status"` is passed explicitly and kept: the `neutral`
            //   tone forwards a caller role untouched, so the polite
            //   announcement this branch has always made is preserved. (Only
            //   `caution` pins `role="alert"`, which would wrongly frame "this
            //   category has no questions" as a failure.)
            // - `headingAs={questionAs}` puts the title at the depth the
            //   questions themselves would have occupied, so the outline stays
            //   correct whether this section owns its heading or is embedded.
            // - The caller's `emptyMessage` becomes the description, and the
            //   actions supply the next step. Contact is always offered as a
            //   ROUTE (no phone number or email restated here — those live only
            //   in siteConfig); "See all questions" appears only for a narrowed
            //   view, where widening it is genuinely a different destination.
            <EmptyState
              role="status"
              tone="neutral"
              headingAs={questionAs}
              title={emptyTitle}
              description={emptyMessage}
              action={
                <>
                  {isNarrowed ? (
                    <Button to="/faq" variant="primary">
                      See all questions
                    </Button>
                  ) : null}
                  <Button to="/contact" variant={isNarrowed ? 'outline' : 'primary'}>
                    Contact us
                  </Button>
                </>
              }
            />
          )}
        </motion.div>
      </Container>
    </section>
  )
}

export default FAQ
