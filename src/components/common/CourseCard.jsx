import Card from '../ui/Card.jsx'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import { cn } from '../../lib/cn.js'
import { FiClock, FiUsers } from 'react-icons/fi'
import { FaCheck } from 'react-icons/fa'
import courseEnglish from '../../assets/course-english.svg'
import coursePersonality from '../../assets/course-personality.svg'
import courseScience from '../../assets/course-science.svg'
import courseComputer from '../../assets/course-computer.svg'
import courseCareer from '../../assets/course-career.svg'

/**
 * CourseCard
 *
 * The single canonical course tile for the CIBLE School of Language SPA. It is
 * driven entirely by a `course` object (single source of truth: src/data/courses.js)
 * and is composed from the shared primitives — <Card> (surface), <Badge> (category
 * pill) and <Button> (conversion CTA) — so it never restyles raw elements and stays
 * visually consistent with the rest of the product. It is consumed by CourseGrid and
 * by the course/category pages.
 *
 * Reuse & safety:
 * - No forked button/card markup: styling flows through the primitives + Tailwind
 *   `@theme` tokens (zero hardcoded values; only 0/auto/inherit/currentColor/transparent
 *   are exempt).
 * - Intentionally uses NO framer-motion so it is safe to mount inside grids, sliders
 *   and carousels; scroll-reveal is owned by the parent grid. The only motion here is
 *   a lightweight CSS `hover:-translate-y-1` lift.
 *
 * Image resolution (course → one of 5 illustrations):
 * There are only 5 illustrations, and `category` alone is ambiguous because the
 * "English" family spans TWO images (general English vs. personality/speaking). The
 * card therefore resolves the illustration by SLUG first (see {@link IMAGE_BY_SLUG}),
 * falls back to the category illustration (see {@link IMAGE_BY_CATEGORY}), and finally
 * defaults to the English illustration so a card never renders without media.
 *
 * CTA destination & label:
 * The CTA links to the most relevant existing route for the course's category (see
 * {@link ROUTE_BY_CATEGORY}), with a `/courses` fallback. The 'Career' category has
 * no dedicated page, so it routes to `/admission` (never back to the /courses
 * catalog the card sits in — that self-referential dead end was QA Issue 8).
 * Callers may override the destination with the `to` prop (the category landing
 * pages pass `to="/admission?course=<title>"` so their cards drive admission
 * instead of self-linking) and the visible/aria label via `ctaLabel`. The link is
 * produced by <Button to=...>, which renders a react-router <Link> — so this file
 * never imports Link directly.
 *
 * Course-discovery meta layer (level / eligibility / suitable-for / prerequisites):
 * These four fields are OPTIONAL by data contract — see the "OPTIONAL FIELDS" note
 * in src/data/courses.js — and when one does not apply to a course its key is
 * OMITTED from the record entirely rather than left empty. Every one is therefore
 * read behind a truthiness guard, exactly as `duration` and `summary` already were,
 * so an absent field renders nothing at all: no empty row, no orphaned label, no
 * dangling separator and no reserved blank space. `prerequisites` is the field this
 * matters most for (it is genuinely absent on several courses, matching the
 * "prerequisites where applicable" requirement), but all four are treated the same
 * way so the card also renders correctly for a record carrying none of them.
 *
 * The layer is deliberately built for information DENSITY, not height: the level is
 * a <Badge> chip rather than a labelled paragraph, duration and suitable-for SHARE a
 * single wrapping meta row rather than occupying one row each, and eligibility and
 * prerequisites are compact <dt>/<dd> pairs in small type rather than body-copy
 * paragraphs. The two wrapper elements are themselves guarded (not just their inner
 * rows), because an empty flex child would still consume the body's `gap-4` and so
 * reserve vertical space for a field the course does not have.
 *
 * Category is rendered EXACTLY ONCE, as the badge overlaid on the media. The level
 * chip lives in the body instead of joining it there: at the narrowest supported
 * width the overlay has roughly 208px of clear space between its left inset and the
 * floating icon disc, while a category + level badge pair needs appreciably more, so
 * co-locating them would wrap the pair over the illustration and collide with that
 * disc.
 *
 * Accessibility (WCAG AA):
 * - The illustration is decorative (the title conveys the meaning), so it uses an
 *   empty `alt` + `aria-hidden`; every icon is likewise decorative (`aria-hidden`).
 * - Every meta value is paired with readable text — an icon-led row always renders
 *   its value as text beside the glyph, and eligibility/prerequisites carry visible
 *   <dt> labels — so no information is conveyed by icon or color alone.
 * - The level chip shows only its value ("Beginner"), so the qualifying word is
 *   supplied as a visually hidden "Level: " text node inside the chip. It is NOT an
 *   `aria-label`: ARIA labels are ignored on elements that map to the `generic` role,
 *   which <Badge>'s bare <span> root does, so a label there is silently discarded and
 *   the chip would announce only "Beginner". Hidden text is honoured unconditionally,
 *   and because `.sr-only` is absolutely positioned it never becomes a flex item — so
 *   <Badge>'s `gap-2` does not apply to it and the prefix adds no visible width or
 *   height. Verified against the rendered accessibility tree, not assumed.
 * - The card title is an <h3> (cards sit beneath a section <h2>).
 * - The CTA label repeats across a page of many cards, so it carries a
 *   descriptive `aria-label` combining the label and the course title.
 * - The default root element is a semantic <article> (self-contained content);
 *   callers can override via the `as` prop forwarded through `...props`
 *   (e.g. `as="li"` inside a list).
 *
 * @param {object} props
 * @param {object} props.course The course record. Shape:
 *   `{ slug, title, category, level?, summary, duration, eligibility?, suitableFor?,
 *   prerequisites?, highlights, icon }` where `category` is one of
 *   `'English' | 'Science' | 'Computer' | 'Career'`, `highlights` is an array of short
 *   strings, and `icon` is a react-icons component REFERENCE (rendered, never called).
 *   `level`, `eligibility`, `suitableFor` and `prerequisites` are OPTIONAL: each is a
 *   single short string, each key may be absent from the record entirely (`prerequisites`
 *   is absent on the courses that have none), and each is rendered only when truthy.
 *   `level` comes from a fixed vocabulary — `'Beginner' | 'Beginner to Intermediate' |
 *   'Intermediate' | 'Intermediate to Advanced' | 'All levels'` — so it reads
 *   consistently across cards. When `course` is falsy the component renders `null`.
 * @param {string} [props.to] Optional explicit destination that overrides the
 *   category-derived route for the CTA.
 * @param {string} [props.ctaLabel='Learn more'] Visible CTA text (also used to
 *   build the descriptive `aria-label`). Category pages pass e.g. "Apply now".
 * @param {string} [props.className] Extra classes merged LAST onto the <Card> surface.
 * @param {object} [props] Any other props (`as`, `id`, `data-*`, …) are forwarded to
 *   the underlying <Card> root.
 * @returns {import('react').ReactElement|null} The rendered course card, or `null`.
 */

// slug → illustration. Resolved FIRST because the "English" category maps to two
// different illustrations (general English vs. personality / speaking). Module-scope
// constant map (allowed by oxlint react/only-export-components allowConstantExport).
const IMAGE_BY_SLUG = {
  'spoken-english': courseEnglish,
  'english-communication': courseEnglish,
  'personality-development': coursePersonality,
  'public-speaking': coursePersonality,
  'interview-preparation': coursePersonality,
  'pcm-coaching': courseScience,
  'pcb-coaching': courseScience,
  'basic-computer': courseComputer,
  'digital-literacy': courseComputer,
  'career-guidance': courseCareer,
}

// category → illustration. Fallback when a course slug is not in IMAGE_BY_SLUG.
const IMAGE_BY_CATEGORY = {
  English: courseEnglish,
  Science: courseScience,
  Computer: courseComputer,
  Career: courseCareer,
}

// category → existing in-app route for the CTA (with a /courses fallback). The
// three subject tracks point at their dedicated landing pages; 'Career' has no
// dedicated page in the frozen 17-route table, so — rather than link back to the
// same /courses catalog the card already sits in (a self-referential dead end,
// QA Issue 8) — it drives straight to the conversion-focused /admission page.
const ROUTE_BY_CATEGORY = {
  English: '/spoken-english',
  Science: '/science-coaching',
  Computer: '/computer-courses',
  Career: '/admission',
}

export default function CourseCard({
  course,
  to: toProp,
  ctaLabel = 'Learn more',
  className,
  ...props
}) {
  // Guard: nothing to render without a course record.
  if (!course) return null

  // Resolve media by slug first, then category, then a safe default.
  const image =
    IMAGE_BY_SLUG[course.slug] || IMAGE_BY_CATEGORY[course.category] || courseEnglish

  // Resolve the CTA destination: explicit prop wins, else category route, else /courses.
  const to = toProp || ROUTE_BY_CATEGORY[course.category] || '/courses'

  // react-icons component reference supplied via data — render, never call.
  const Icon = course.icon

  // Surface at most three highlights; tolerate a missing/empty highlights array.
  const highlights = course.highlights?.slice(0, 3) ?? []

  // Discovery-field guards. Every one of `level`, `duration`, `suitableFor`,
  // `eligibility` and `prerequisites` is optional, and an inapplicable key is absent
  // from the record rather than empty, so nothing may be read unguarded. These
  // booleans exist to guard the two WRAPPER elements as well as the rows inside them:
  // an empty flex child still consumes the body's `gap-4`, which would reserve blank
  // space for a field the course does not carry.
  const hasMetaRow = Boolean(course.duration || course.suitableFor)
  const hasMeta = Boolean(course.level) || hasMetaRow
  const hasDetails = Boolean(course.eligibility || course.prerequisites)

  return (
    <Card
      as="article"
      className={cn(
        'flex h-full flex-col overflow-hidden p-0 transition-transform duration-200 hover:-translate-y-1',
        className,
      )}
      {...props}
    >
      {/* Media block: 4:3 illustration (matches the SVG viewBox) with a category
          badge overlaid top-left and the course icon in a floating token circle
          top-right. The image is purely decorative — the title carries meaning. */}
      <div className="relative aspect-4-3 w-full bg-surface">
        <img
          src={image}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
        <span className="absolute left-4 top-4">
          <Badge variant="primary">{course.category}</Badge>
        </span>
        {Icon ? (
          <span className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-primary-600 shadow-sm">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
        ) : null}
      </div>

      {/* Body: icon + title, the compact discovery meta layer (level chip plus a
          shared duration / suitable-for row), summary, up to three highlights, the
          conditional eligibility / prerequisites detail, and the admission-oriented
          CTA pinned to the bottom of the card. */}
      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex items-center gap-2">
          {Icon ? <Icon className="h-6 w-6 shrink-0 text-primary-600" aria-hidden="true" /> : null}
          <h3 className="text-lg font-semibold text-foreground">{course.title}</h3>
        </div>

        {/* Discovery meta layer — ONE body child holding the level chip and the
            combined duration / suitable-for row, so the pair costs a single tight
            8px internal gap instead of two 16px body gaps. Both the chip row and
            the meta row wrap rather than overflow at the narrowest width. */}
        {hasMeta ? (
          <div className="flex flex-col gap-2">
            {course.level ? (
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="neutral">
                  {/* The chip shows only the value ("Beginner"), so the word it
                      qualifies is supplied as visually hidden text rather than as an
                      `aria-label`: ARIA labels are IGNORED on an element that maps to
                      the `generic` role, which a bare <span> like Badge's root does,
                      so a label there is silently dropped by the accessibility tree.
                      A real text node cannot be dropped. `.sr-only` is absolutely
                      positioned, so it is not a flex item and Badge's `gap-2` never
                      applies to it — the prefix costs zero visible width or height. */}
                  <span className="sr-only">Level: </span>
                  {course.level}
                </Badge>
              </div>
            ) : null}

            {hasMetaRow ? (
              <p className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
                {course.duration ? (
                  <span className="inline-flex items-center gap-2">
                    <FiClock className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {course.duration}
                  </span>
                ) : null}
                {course.suitableFor ? (
                  <span className="inline-flex items-center gap-2">
                    <FiUsers className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {course.suitableFor}
                  </span>
                ) : null}
              </p>
            ) : null}
          </div>
        ) : null}

        {course.summary ? (
          <p className="text-sm leading-relaxed text-muted">{course.summary}</p>
        ) : null}

        {highlights.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {highlights.map((highlight, index) => (
              <li
                key={highlight || index}
                className="flex items-start gap-2 text-sm text-foreground"
              >
                <FaCheck className="h-4 w-4 shrink-0 text-accent-600" aria-hidden="true" />
                {highlight}
              </li>
            ))}
          </ul>
        ) : null}

        {/* Conditional discovery detail, in small type below the outcomes. Real
            name/value pairs: each <dt> is a visible text label, so the value is never
            ambiguous and nothing depends on an icon or a color. The <div> groupings
            are the standard way to pair a <dt> with its <dd> inside a <dl>, and they
            let the label and value sit on one line instead of two. The whole list —
            hairline separator included — is omitted when the course carries neither
            field, so the separator can never dangle. */}
        {hasDetails ? (
          <dl className="flex flex-col gap-2 border-t border-border pt-2 text-xs text-muted">
            {course.eligibility ? (
              <div className="flex gap-2">
                <dt className="shrink-0 font-semibold text-foreground">Eligibility</dt>
                <dd>{course.eligibility}</dd>
              </div>
            ) : null}

            {course.prerequisites ? (
              <div className="flex gap-2">
                <dt className="shrink-0 font-semibold text-foreground">Prerequisites</dt>
                <dd>{course.prerequisites}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}

        <div className="mt-auto pt-2">
          <Button
            to={to}
            variant="primary"
            size="sm"
            aria-label={`${ctaLabel} — ${course.title}`}
          >
            {ctaLabel}
          </Button>
        </div>
      </div>
    </Card>
  )
}
