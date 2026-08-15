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
 * so an absent field renders nothing at all: no empty pair, no orphaned label and no
 * reserved blank space. `prerequisites` is the field this
 * matters most for (it is genuinely absent on several courses, matching the
 * "prerequisites where applicable" requirement), but all four are treated the same
 * way so the card also renders correctly for a record carrying none of them.
 *
 * The layer is deliberately built for information DENSITY, not height, and the
 * mechanism is that it costs the card body exactly ONE child and ONE gap pair:
 *   • `level` is a <Badge> chip in the media chip row beside the category chip, so
 *     it consumes NO body height at all.
 *   • `duration`, `suitableFor`, `eligibility` and `prerequisites` share ONE
 *     wrapping <dl>. Each is a <dt>/<dd> pair that flows inline and sits on the
 *     same line as its neighbours whenever there is room, so four fields cost the
 *     height of the lines they actually fill — not one row each. `gap-x-4` (16px)
 *     separates neighbours on a line, `gap-y-2` (8px) separates the lines, and both
 *     are even multiples of the project's 8px scale.
 *   • Duration and Suitable-for stay icon-led because a 16px glyph is far narrower
 *     than a written label, which is what lets them share the first line at mobile
 *     widths; the two conditions carry visible labels because their meaning is not
 *     self-evident from a glyph.
 * The <dl> wrapper is itself guarded, not just the pairs inside it, because an empty
 * flex child would still consume one of the body's `gap-4` slots and so reserve
 * vertical space for fields the course does not have.
 *
 * Category is rendered EXACTLY ONCE, in the media chip row, and the level chip joins
 * it there. That row is bounded `left-4 right-16`, which stops it 8px short of the
 * floating icon disc's left edge (the disc is a 40px circle at a 16px inset), so a
 * long level value — the widest in the vocabulary is "Intermediate to Advanced" —
 * wraps onto a second line INSIDE the row rather than running under the disc. The
 * pair is therefore collision-free at every supported width, including 320px where
 * the row is at its narrowest.
 *
 * Accessibility (WCAG AA):
 * - The illustration is decorative (the title conveys the meaning), so it uses an
 *   empty `alt` + `aria-hidden`; every icon is likewise decorative (`aria-hidden`).
 * - Every meta value is paired with readable text — an icon-led pair always renders
 *   its value as text beside the glyph, and eligibility/prerequisites carry visible
 *   <dt> labels — so no information is conveyed by icon or color alone. The two
 *   icon-led pairs put the glyph in the <dt> and add an `sr-only` term ("Duration",
 *   "Suitable for") beside it, so assistive technology hears a real name for a value
 *   whose visual label is a picture.
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

  // Discovery-field guard. `level`, `suitableFor`, `eligibility` and `prerequisites`
  // are the four fields `src/data/courses.js` declares OPTIONAL by contract: an
  // inapplicable key is omitted from the record rather than left empty, so none of
  // them may be read unguarded (`prerequisites` is where this matters most — it is
  // genuinely absent on the courses that have none). `duration` is REQUIRED by that
  // same contract and carried by every current record; it is nonetheless read behind
  // the identical truthiness guard, defensively, so a record that ever lacked it
  // would shorten the meta list rather than render an empty pair. `level` is guarded
  // inline in the media chip row; the other four share this one boolean, which guards
  // the WRAPPER as well as the pairs inside it — an empty <dl> would still consume one
  // of the body's 16px `gap-4` slots and so reserve blank space for fields the course
  // does not carry.
  const hasDiscoveryMeta = Boolean(
    course.duration || course.suitableFor || course.eligibility || course.prerequisites,
  )

  return (
    <Card
      as="article"
      className={cn(
        'flex h-full flex-col overflow-hidden p-0 transition-transform duration-200 hover:-translate-y-1',
        className,
      )}
      {...props}
    >
      {/* Media block: 4:3 illustration (matches the SVG viewBox) with the category
          and level chips overlaid top-left and the course icon in a floating token
          circle top-right. The image is purely decorative — the title carries
          meaning. */}
      <div className="relative aspect-4-3 w-full bg-surface">
        <img
          src={image}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
        {/* Chip row: Category and — when the record carries one — Level, side by
            side over the illustration. `right-16` (64px) stops the row 8px short
            of the icon disc's left edge (the disc is a 40px circle at a 16px
            inset), so a long level value wraps INSIDE this box instead of
            running under the disc. Costs the card body no height at all. */}
        <div className="absolute left-4 right-16 top-4 flex flex-wrap items-start gap-2">
          <Badge variant="primary">{course.category}</Badge>
          {course.level ? (
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
          ) : null}
        </div>
        {Icon ? (
          <span className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-primary-600 shadow-sm">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
        ) : null}
      </div>

      {/* Body: icon + title, the single compact discovery meta list (duration,
          suitable-for, eligibility and prerequisites sharing one wrapping flow),
          summary, up to three highlights, and the admission-oriented CTA pinned to
          the bottom of the card. Level and Category are chips on the media above,
          so they add no body height. */}
      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex items-center gap-2">
          {Icon ? <Icon className="h-6 w-6 shrink-0 text-primary-600" aria-hidden="true" /> : null}
          <h3 className="text-lg font-semibold text-foreground">{course.title}</h3>
        </div>

        {/* Discovery meta layer — ONE body child, ONE wrapping flow, ONE gap pair.
            Every field is a <dt>/<dd> pair that shares lines with its siblings
            wherever they fit, so four fields cost the height of the lines they
            actually fill instead of a row each. `gap-x-4` (16px) separates
            neighbours on a line and `gap-y-2` (8px) separates the lines — both
            even multiples of the 8px scale. Duration and Suitable-for are
            icon-led, which keeps them narrow enough to share the first line; the
            two conditions carry visible labels because their meaning is not
            self-evident from a glyph. */}
        {hasDiscoveryMeta ? (
          <dl className="flex flex-wrap items-baseline gap-x-4 gap-y-2 text-xs text-muted">
            {course.duration ? (
              <div className="flex items-center gap-2">
                <dt className="flex items-center">
                  <FiClock className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="sr-only">Duration</span>
                </dt>
                <dd>{course.duration}</dd>
              </div>
            ) : null}

            {course.suitableFor ? (
              <div className="flex items-center gap-2">
                <dt className="flex items-center">
                  <FiUsers className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="sr-only">Suitable for</span>
                </dt>
                <dd>{course.suitableFor}</dd>
              </div>
            ) : null}

            {course.eligibility ? (
              <div className="flex items-baseline gap-2">
                <dt className="shrink-0 font-semibold text-foreground">Eligibility</dt>
                <dd>{course.eligibility}</dd>
              </div>
            ) : null}

            {course.prerequisites ? (
              <div className="flex items-baseline gap-2">
                <dt className="shrink-0 font-semibold text-foreground">Prerequisites</dt>
                <dd>{course.prerequisites}</dd>
              </div>
            ) : null}
          </dl>
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
