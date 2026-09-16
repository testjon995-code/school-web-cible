import Container from '../ui/Container.jsx'
import SectionHeading from '../ui/SectionHeading.jsx'
import Card from '../ui/Card.jsx'
import FeatureCard from './FeatureCard.jsx'
import RepresentativeNote from './RepresentativeNote.jsx'
import { cn } from '../../lib/cn.js'
import { trustSections } from '../../data/trust.js'

/* ===========================================================================
   Structural chrome — the ONLY literal strings in this file.

   Every substantive claim this block makes lives in src/data/trust.js (F17:
   content is separated from UI). The three strings below are the section's own
   chrome — a kicker, the section label, and the content-status disclosure — for
   which `trust.js` deliberately carries no field: its records are the trust
   POSITIONS, not the frame around them. They are hoisted to module scope so an
   auditor can read every word this component can possibly render without
   walking the JSX, and so it is obvious that none of them asserts anything
   about the institute. Each is checkable:

   - The kicker and label name the section. They promise nothing measurable —
     no accreditation, placement, completion, learner count, award, partnership
     or review — and deliberately avoid a subtitle, which would be prose rather
     than a label.
   - The disclosure is the same register the site's other point-of-claim notes
     use (compare About.jsx, Blog.jsx, Career.jsx): it says the course, schedule
     and admission copy is representative pending the institute's confirmation,
     which is exactly what src/data/courses.js, src/data/faq.js and trust.js
     already record about themselves, and it separates that from the
     accessibility and privacy positions, which describe THIS CODEBASE's own
     behaviour and are evidenced by README.md plus the implementation itself.

   No contact fact appears here by design. The phone number, WhatsApp link,
   email address and street address live only in src/data/siteConfig.js and are
   surfaced by the Navbar, Footer and Contact page; trust.js names the channels
   and points at the pages that publish them, so nothing is duplicated and
   nothing can drift.
   =========================================================================== */

const SECTION_EYEBROW = 'Trust & Transparency'
const SECTION_TITLE = 'What You Can Rely On'
const CONTENT_DISCLOSURE =
  'The course, schedule, timing and admission details above are representative samples and will be confirmed with the institute before launch. The accessibility and privacy positions describe how this website itself is built and behaves.'

/**
 * Heading tags this block may render for its own section heading.
 *
 * Restricted to `h2` and `h3` because the cards beneath are fixed at `h3`:
 * `FeatureCard` hard-codes its title as an `<h3>` and is explicitly out of
 * scope for editing, so the block heading must sit at or above that depth for
 * the outline to stay legal. Anything else — a typo, `h4`, a number, an
 * unexpected type — resolves to `h2`, the safe default, rather than emitting an
 * invalid tag.
 *
 * @type {readonly ['h2', 'h3']}
 */
const HEADING_TAGS = ['h2', 'h3']

/**
 * Resolve the caller's `headingAs` into a tag this block is allowed to render.
 *
 * @param {unknown} headingAs Caller-supplied heading tag.
 * @returns {'h2' | 'h3'} A legal heading tag; `'h2'` when the input is not one.
 */
function resolveHeadingTag(headingAs) {
  return HEADING_TAGS.includes(headingAs) ? headingAs : 'h2'
}

/**
 * Narrow a record's `body` to renderable prose.
 *
 * @param {unknown} body Raw `body` value from a trust record.
 * @returns {string|undefined} The prose, or `undefined` when there is none to
 *   render — so the caller omits the paragraph instead of emitting an empty one.
 */
function toRenderableBody(body) {
  return typeof body === 'string' && body.trim() !== '' ? body : undefined
}

/**
 * Narrow a record's `items` to the supporting points that can actually be shown.
 *
 * A non-array (including `undefined`, which the contract permits) becomes an
 * empty list, and every entry that is not a non-empty string is dropped, so a
 * malformed record can never render a bullet with no text.
 *
 * @param {unknown} items Raw `items` value from a trust record.
 * @returns {string[]} Zero or more non-empty supporting points.
 */
function toRenderableItems(items) {
  if (!Array.isArray(items)) return []
  return items.filter((item) => typeof item === 'string' && item.trim() !== '')
}

/**
 * Whether a raw trust record has enough content to be worth a card.
 *
 * A record qualifies only when it is a plain (non-null) object carrying a
 * non-empty string `title` AND at least one thing to say beneath it — prose, or
 * one supporting point. A title with nothing under it is dropped rather than
 * rendered, because a card containing only a heading is precisely the
 * "unexplained empty container" this work exists to remove. Mirrors the
 * defensive-validation precedent in src/components/common/FAQ.jsx, which
 * likewise treats its incoming collection as untrusted.
 *
 * @param {unknown} section Raw record from the `sections` prop.
 * @returns {boolean} `true` when the record can be rendered.
 */
function isRenderableSection(section) {
  if (!section || typeof section !== 'object') return false
  if (typeof section.title !== 'string' || section.title.trim() === '') return false
  return toRenderableBody(section.body) !== undefined || toRenderableItems(section.items).length > 0
}

/**
 * TrustSection — the ONE trust-and-transparency block for the CIBLE School of
 * Language SPA (AAP §0.9.1 F10).
 *
 * It answers the questions a visitor asks before they enquire — what can I
 * expect, how am I supported, how are courses structured, can I actually use
 * this site, how do I reach a person, what happens to my information, and how
 * does admission work — and it answers every one of them from content the
 * repository can already evidence. The same block renders on FOUR surfaces from
 * this single module (AAP §0.5.1 / §0.10.2):
 *
 *   /courses         src/pages/Courses.jsx       the catalogue
 *   /courses/:slug   src/pages/CourseDetail.jsx  every course detail route
 *   /admission       src/pages/Admission.jsx     the admission page
 *   /dashboard       src/pages/Dashboard.jsx     the My Learning dashboard
 *
 * WHY `headingAs` EXISTS. Those four surfaces sit at different outline depths:
 * a page whose own `<h1>` is followed by top-level sections wants this block's
 * heading at `h2`, while a surface that nests it beneath an existing `<h2>`
 * wants `h3`. The cards beneath are fixed at `h3` — `FeatureCard` hard-codes
 * its title as an `<h3>` and must not be edited — so `h2` (the default) yields
 * the textbook outline `h1 → h2 → h3`, and `h3` yields a flat but still legal
 * `h1 → h2 → h3 → h3`. No value skips a level, which is what WCAG asks (AAP
 * §0.12.4). The block's own `Card` variant therefore renders its title at `h3`
 * unconditionally, so both kinds of record sit at the SAME depth on a given
 * surface and the two never disagree.
 *
 * WHY TWO CARD SHAPES FOR ONE RECORD TYPE. `FeatureCard` is the house tile for
 * "a title and a line or two", and it is reused verbatim for records that are
 * exactly that. It cannot, however, render a record's supporting `items`: it
 * composes explicit JSX children into `<Card>`, and JSX children always beat a
 * `children` prop forwarded through `...props`, so passing children to it is
 * silently ignored. Rather than fork `FeatureCard`'s markup or edit a component
 * this work is not permitted to touch, a record WITH items composes the shared
 * `Card` surface directly and adds the list itself — matching FeatureCard's own
 * internal treatment (`text-lg font-semibold text-foreground` title, `text-sm
 * leading-relaxed text-muted` body) so the two read as one family rather than
 * two components. The split is therefore:
 *
 *   items present → <Card>: h3 title, optional body, <ul> of points
 *   items empty   → <FeatureCard>: title + body, and NO icon, because a trust
 *                   record carries no icon field and FeatureCard renders no
 *                   badge when `icon` is omitted
 *
 * CONTENT TRUTHFULNESS IS A HARD BOUND, NOT A PREFERENCE (AAP §0.7.4). Every
 * substantive string shown here comes from src/data/trust.js; this component
 * declares only the three structural strings documented at the top of the file.
 * It asserts NO accreditation, affiliation or recognition, NO placement, pass or
 * completion figure, NO learner or alumni count, NO award, ranking or
 * partnership, and NO rating, review or testimonial — not in a default prop, not
 * in a fallback string, and not in a comment that could be mistaken for copy. It
 * restates no phone number, email address or street address: those live only in
 * src/data/siteConfig.js, and a trust point that needs a contact affordance
 * names the channel and points at the Contact page instead of printing a number.
 * There is no filler prose anywhere; where `trust.js` supplies nothing, nothing
 * is rendered.
 *
 * DEFENSIVE BY CONTRACT. `sections` is treated as untrusted, exactly as
 * `FAQ.jsx` treats its `items`: a non-array is coerced to an empty list,
 * malformed records are skipped, a missing `body` omits the paragraph rather
 * than emitting an empty one, and a missing or malformed `items` omits the list
 * rather than emitting an empty `<ul>` or a bullet with no text. When nothing
 * survives that filter the component renders `null` — an eyebrow and a heading
 * standing over an empty grid would be the unexplained empty container this work
 * exists to remove, and this block is supplementary content whose absence costs
 * its host page nothing.
 *
 * LAYOUT OWNERSHIP — READ BEFORE COMPOSING. This component owns its own
 * `<section>` and its own {@link Container}, following the site's tinted-band
 * idiom (`bg-surface py-16 md:py-20`, as on Home, About, Career and Admission).
 * Consumers must therefore render it as a SIBLING of their own `Container`,
 * never inside one: nesting `Container` within `Container` doubles the `px-4
 * md:px-6` gutters, because tailwind-merge resolves the duplicated max-width but
 * has no way to collapse padding applied by two separate elements. A caller that
 * needs a different band colour or rhythm passes `className` — it is merged LAST
 * through {@link cn}, so `className="bg-white"` or `className="py-12"` wins over
 * the default without forking the component.
 *
 * STYLING. 100% Tailwind v4 `@theme` tokens from src/index.css — `bg-surface`
 * for the band, the `Card` surface for each tile, `text-foreground` (~17:1) and
 * `text-muted` (~7.5:1) for type, `gap-6`/`mt-10` on the 8px spacing scale, and
 * the canonical `grid gap-6 sm:grid-cols-2 lg:grid-cols-3` shape. There are no
 * new tokens, no new named utilities, no arbitrary `[..]` bracket values, no
 * inline styles and no second class-merging path — `src/index.css` needs no
 * change for this component to exist.
 *
 * MOTION. Deliberately none of its own. The repository's reveal vocabulary
 * (`useScrollReveal` + framer-motion) is not among this file's declared
 * dependencies, and a trust disclosure is the last thing that should fade in
 * late or be missed; `Card`'s own 200ms hover shadow is the only transition
 * present, and it already honours the global reduced-motion reset.
 *
 * ACCESSIBILITY (WCAG AA). One section heading at the caller's chosen depth with
 * card titles a level below or beside it, never skipping a level. Real semantic
 * elements throughout — `<section>`, `<article>` cards, a genuine `<ul>`/`<li>`
 * list — so no ARIA is added where the platform already carries the meaning; the
 * section takes no `aria-label` because its visible heading names it, matching
 * every other titled band on the site (an `aria-labelledby` or `id` can still be
 * passed through `...props`). The list marker is a decorative dot, `aria-hidden`
 * and never the sole carrier of meaning: it is deliberately a neutral bullet
 * rather than a tick, because several of these points are DISCLOSURES rather
 * than benefits — third-party request data, representative timings — and a
 * green check beside them would frame a caveat as a selling point. Both text
 * colours clear AA on the white card, and the component renders no white-on-
 * colour fill, so the `secondary-600` contrast trap (≈3.56:1, documented in
 * src/index.css and Button.jsx) cannot arise here.
 *
 * @param {object} props
 * @param {Array<{id?: string, title: string, body?: string, items?: string[]}>} [props.sections=trustSections]
 *   Ordered trust records, defaulting to the canonical set in
 *   src/data/trust.js. Each record supplies a stable kebab-case `id` (the render
 *   key), a short heading-safe `title`, one or two sentences of `body` prose,
 *   and an `items` array of supporting points that MAY be empty. Treated as
 *   untrusted: a non-array becomes an empty list, and a record without a
 *   non-empty `title` and at least one of `body`/`items` is skipped.
 * @param {'h2' | 'h3'} [props.headingAs='h2'] Heading tag for this block's own
 *   section heading, so the document outline stays correct on each of the four
 *   surfaces. Any other value falls back to `'h2'`.
 * @param {string} [props.className] Extra classes merged LAST via {@link cn}, so
 *   a caller can retune the band colour or vertical rhythm.
 * @param {object} [props] Any remaining props (`id`, `aria-*`, `data-*`, …) are
 *   forwarded to the root `<section>`.
 * @returns {import('react').ReactElement|null} The trust block, or `null` when
 *   no supplied record has renderable content.
 */
function TrustSection({ sections = trustSections, headingAs = 'h2', className, ...props }) {
  // Treat the incoming collection as untrusted (FAQ.jsx precedent): coerce a
  // non-array to an empty list, then keep only records that can actually be
  // rendered. No hooks are used in this component, so the empty-input early
  // return below is unconditionally safe for the Rules of Hooks.
  const source = Array.isArray(sections) ? sections : []
  const list = source.filter(isRenderableSection)

  // Nothing to say: render nothing at all rather than a heading over an empty
  // grid. This block is supplementary, so its absence degrades the host page
  // gracefully instead of leaving an unexplained empty container.
  if (list.length === 0) return null

  // Lowercase local: this is a prop VALUE handed to SectionHeading, which owns
  // rendering the tag, not a component rendered directly here (FAQ.jsx draws the
  // same distinction between its `titleAs` value and its capitalized alias).
  const titleAs = resolveHeadingTag(headingAs)

  return (
    <section className={cn('bg-surface py-16 md:py-20', className)} {...props}>
      <Container>
        {/* No subtitle by design: the kicker and the label frame the section,
            and every substantive sentence belongs to trust.js. */}
        <SectionHeading eyebrow={SECTION_EYEBROW} title={SECTION_TITLE} as={titleAs} />

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((section, index) => {
            const body = toRenderableBody(section.body)
            const items = toRenderableItems(section.items)
            // Stable `id` when the record carries one (it is the documented
            // render-order key); the positional index only ever backs up a
            // malformed record that reached here without one.
            const key = section.id || index

            // No supporting points: this record IS a house feature tile, so
            // reuse FeatureCard verbatim. `icon` is intentionally omitted — a
            // trust record carries none, and FeatureCard renders no badge
            // without one. `body` is guaranteed non-empty on this branch by
            // isRenderableSection, so FeatureCard's unconditional description
            // paragraph can never come out blank.
            if (items.length === 0) {
              return <FeatureCard key={key} title={section.title} description={body} />
            }

            // Supporting points present: compose the shared Card surface and
            // render the list here, because FeatureCard cannot accept children.
            // The title and body classes match FeatureCard's own so both card
            // shapes read as one family. The title is `h3` on every surface,
            // level with the FeatureCard branch above it.
            return (
              <Card key={key} as="article" className="flex flex-col gap-4">
                <h3 className="text-lg font-semibold text-foreground">{section.title}</h3>
                {body ? <p className="text-sm leading-relaxed text-muted">{body}</p> : null}
                <ul className="flex flex-col gap-2">
                  {items.map((item, itemIndex) => (
                    <li
                      key={`${itemIndex}-${item}`}
                      className="flex items-start gap-2 text-sm text-foreground"
                    >
                      {/* Decorative neutral bullet — a dot rather than a tick,
                          so a disclosure is never dressed up as a benefit. */}
                      <span
                        aria-hidden="true"
                        className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-600"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </Card>
            )
          })}
        </div>

        {/* Point-of-claim disclosure, rendered ONCE beneath the cards through
            the site's single note primitive under its DEFAULT `gate="content"`
            behaviour — no `gate` prop is passed. That is correct here because
            this block does sit alongside representative course, schedule and
            timing copy, so the note must retire itself automatically the moment
            `siteConfig.representativeContent` is cleared. `gate="always"` is
            reserved for the dashboard alone, whose notice discloses an
            architectural fact that outlives content confirmation (AAP §0.6.5);
            passing it here would strand a stale caveat in production. */}
        <RepresentativeNote className="mt-10">{CONTENT_DISCLOSURE}</RepresentativeNote>
      </Container>
    </section>
  )
}

export default TrustSection
