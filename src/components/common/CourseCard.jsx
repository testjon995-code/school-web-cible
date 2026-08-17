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
 * Reuse: no forked button or card markup — styling flows through the primitives and
 * Tailwind `@theme` tokens, with zero hardcoded values (only
 * 0/auto/inherit/currentColor/transparent are exempt). The card uses no
 * framer-motion; scroll-reveal is owned by the parent grid, and the only motion here
 * is a lightweight CSS hover lift. That lift is a transform, so this card is a GRID
 * tile: <ReviewCard> is the card to reach for inside a carousel, where a transform can
 * jitter a slide mid-transition.
 *
 * Image resolution (course → one of five illustrations): `category` alone is
 * ambiguous, because the "English" family spans two images (general English against
 * personality/speaking). The card therefore resolves by SLUG first (see
 * {@link IMAGE_BY_SLUG}), falls back to the category illustration (see
 * {@link IMAGE_BY_CATEGORY}), and finally defaults to the English illustration, so a
 * card never renders without media.
 *
 * CTA destination & label: the CTA links to the most relevant existing route for the
 * course's category (see {@link ROUTE_BY_CATEGORY}), with a `/courses` fallback. The
 * 'Career' category has no dedicated page, so it routes to `/admission` rather than
 * back to the catalog the card itself sits in. Callers may override the destination
 * with the `to` prop — the category landing pages pass an admission route carrying the
 * course title — and the visible/aria label with `ctaLabel`. The link is produced by
 * <Button to=…>, which renders a react-router <Link>, so this file never imports Link.
 *
 * Course-discovery meta layer (level / eligibility / suitable-for / prerequisites):
 * these four fields are OPTIONAL by data contract — see the "OPTIONAL FIELDS" note in
 * src/data/courses.js — and an inapplicable key is OMITTED from the record rather than
 * left empty. Each is therefore read behind a truthiness guard, exactly as `duration`
 * and `summary` are, so an absent field renders nothing: no empty pair, no orphaned
 * label, no reserved blank space. `prerequisites` is where this matters most, being
 * genuinely absent on several courses, but all four are treated alike so the card also
 * renders correctly for a record carrying none of them.
 *
 * The layer is built for information DENSITY, not height, and the mechanism is that it
 * costs the card body exactly ONE child and ONE gap pair:
 *   • `level` is a <Badge> chip in the media chip row beside the category chip, so it
 *     consumes no body height at all.
 *   • `duration`, `suitableFor`, `eligibility` and `prerequisites` share ONE wrapping
 *     <dl>. Each is a <dt>/<dd> pair that flows inline and sits on the same line as its
 *     neighbours whenever there is room, so four fields cost the height of the lines
 *     they actually fill rather than one row each, with both gaps on the 8px scale.
 *   • Duration and Suitable-for stay icon-led because a glyph is far narrower than a
 *     written label, which is what lets them share the first line at mobile widths; the
 *     two conditions carry visible labels because their meaning is not self-evident
 *     from a glyph.
 * The <dl> wrapper is itself guarded, not just the pairs inside it, because an empty
 * flex child would still consume one of the body's gap slots and so reserve vertical
 * space for fields the course does not have.
 *
 * Category is rendered EXACTLY ONCE, in the media chip row, and the level chip joins it
 * there. That row is inset on the right so it stops short of the floating icon disc, so
 * a long level value wraps onto a second line INSIDE the row rather than running under
 * the disc — collision-free at every supported width, including the narrowest.
 *
 * Accessibility (WCAG AA):
 * - The illustration is decorative (the title conveys the meaning), so it carries an
 *   empty `alt` plus `aria-hidden`; every icon is likewise decorative.
 * - Every meta value is paired with readable text — an icon-led pair always renders its
 *   value as text beside the glyph, and eligibility/prerequisites carry visible <dt>
 *   labels — so no information is conveyed by icon or colour alone. The two icon-led
 *   pairs put the glyph in the <dt> and add an `sr-only` term beside it, so assistive
 *   technology hears a real name for a value whose visual label is a picture.
 * - The level chip shows only its value, so the qualifying word is supplied as visually
 *   hidden text rather than an `aria-label`: ARIA labels are ignored on elements that
 *   map to the `generic` role, which <Badge>'s bare <span> root does, so a label there
 *   would be silently discarded and the chip would announce only the value. Hidden text
 *   is honoured unconditionally, and because `.sr-only` is absolutely positioned it
 *   never becomes a flex item, so <Badge>'s own gap does not apply and the prefix adds
 *   no visible width or height.
 * - The card title is an <h3> (cards sit beneath a section <h2>).
 * - The CTA label repeats across a page of many cards, so it carries a descriptive
 *   `aria-label` combining the label and the course title.
 * - The default root element is a semantic <article>; callers can override it with the
 *   forwarded `as` prop (`as="li"` inside a list). Any other props (`id`, `data-*`, …)
 *   are forwarded to the same <Card> root.
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
 * @param {string} [props.ctaLabel='Learn more'] Visible CTA text, which also composes
 *   the descriptive `aria-label`. The category landing pages pass "Apply Now".
 * @param {string} [props.className] Extra classes merged LAST onto the <Card> surface.
 * @returns {import('react').ReactElement|null} The rendered course card, or `null`.
 */

// slug → illustration. Resolved FIRST because the "English" category maps to two
// different illustrations (general English against personality / speaking).
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

// category → existing in-app route for the CTA, with a /courses fallback. The three
// subject tracks point at their dedicated landing pages; 'Career' has no dedicated
// page, so rather than link back to the same catalog the card sits in — a
// self-referential dead end — it drives straight to /admission.
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
  if (!course) return null

  const image =
    IMAGE_BY_SLUG[course.slug] || IMAGE_BY_CATEGORY[course.category] || courseEnglish

  const to = toProp || ROUTE_BY_CATEGORY[course.category] || '/courses'

  // A react-icons component reference supplied via data — rendered, never called.
  const Icon = course.icon

  // At most three highlights; tolerates a missing or empty array.
  const highlights = course.highlights?.slice(0, 3) ?? []

  // Discovery-field guard. The four optional fields may each be absent from a record,
  // so none may be read unguarded; `duration` is required by the data contract but is
  // read the same way, defensively, so a record that ever lacked it would shorten the
  // meta list rather than render an empty pair. `level` is guarded inline in the media
  // chip row, and this one boolean guards the <dl> WRAPPER as well as the pairs inside
  // it — an empty <dl> would still consume one of the body's gap slots and reserve
  // blank space for fields the course does not carry.
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
      {/* Media block: the 4:3 frame matches the illustrations' own viewBox, so the
          artwork fills it with no letter-boxing. */}
      <div className="relative aspect-4-3 w-full bg-surface">
        <img
          src={image}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
        {/* Chip row: Category and, when the record carries one, Level. The right inset
            stops the row short of the icon disc's left edge, so a long level value
            wraps INSIDE this box instead of running under the disc, and the row costs
            the card body no height at all. */}
        <div className="absolute left-4 right-16 top-4 flex flex-wrap items-start gap-2">
          <Badge variant="primary">{course.category}</Badge>
          {course.level ? (
            <Badge variant="neutral">
              {/* Visually hidden rather than an `aria-label`: ARIA labels are IGNORED
                  on an element that maps to the `generic` role, which Badge's bare
                  <span> root does, so a label there is silently dropped from the
                  accessibility tree while a real text node cannot be. `.sr-only` is
                  absolutely positioned, so it is not a flex item and Badge's own gap
                  never applies to it — the prefix costs no visible space. */}
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

      {/* Body: icon and title, the discovery meta list, summary, up to three
          highlights, and the CTA pinned to the bottom by `mt-auto` so every card in a
          row ends with its action on the same line. */}
      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex items-center gap-2">
          {Icon ? <Icon className="h-6 w-6 shrink-0 text-primary-600" aria-hidden="true" /> : null}
          <h3 className="text-lg font-semibold text-foreground">{course.title}</h3>
        </div>

        {/* Discovery meta layer — ONE body child, ONE wrapping flow, ONE gap pair, so
            four fields cost the height of the lines they actually fill instead of a
            row each. See the JSDoc for why two pairs are icon-led and two carry
            visible labels. */}
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
