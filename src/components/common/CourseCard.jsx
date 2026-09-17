import { useId } from 'react'
import Card from '../ui/Card.jsx'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import { cn } from '../../lib/cn.js'
import { COMPARE_STATE, compareState, savedState } from '../../lib/states.js'
import { useSavedCourses } from '../../hooks/useSavedCourses.js'
import { useComparison } from '../../hooks/useComparison.js'
import { FiClock } from 'react-icons/fi'
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
 * The CTA links to the course's OWN detail route, `/courses/<slug>`. Callers may
 * override the destination with the `to` prop — and the three category landing
 * pages do, passing `to="/admission?course=<title>"` so their cards drive
 * admission instead of self-linking — and may override the visible/aria label
 * via `ctaLabel`. The link is produced by <Button to=...>, which renders a
 * react-router <Link> — so this file never imports Link directly.
 *
 * Why the default changed. The destination used to be derived from the course's
 * CATEGORY, which collapsed all ten catalogue records onto just four routes: the
 * "Learn more" cards for interview-preparation, english-communication,
 * personality-development and public-speaking all landed on /spoken-english, a
 * page describing a DIFFERENT course. That is the card-versus-detail mismatch
 * reported as BUG 1, and it is fixed here at its source — one card, one subject.
 * `slug` is a public contract (it is the `/courses/:slug` route segment) and is
 * already URL-safe kebab-case, so it is interpolated verbatim: not encoded, and
 * with no trailing slash. Explicit `to` keeps precedence exactly as before, which
 * is what leaves the three track pages' "Apply now" override untouched.
 *
 * Optional course fields (level badge):
 * Every field the catalogue gained beyond the original seven is additively
 * OPTIONAL, and the rule this card applies to all of them is simply: ABSENCE
 * MEANS DO NOT RENDER THAT BLOCK. The level `Badge` therefore renders only when
 * `course.level` is a non-empty string and is omitted entirely otherwise — no
 * empty pill, no placeholder, no "Level: —". That is not a degraded rendering:
 * only one catalogue record identifies a difficulty today, and inferring a level
 * from a subject or a duration would be an invented pedagogical claim. The badge
 * sits in the body's meta row beside the duration rather than on the media,
 * which already carries the category badge (top-left) and the icon circle
 * (top-right) and would crowd at 320px. It uses the `neutral` Badge variant so
 * it reads as a plain attribute instead of competing with the `primary` category
 * badge. This same absence rule is what keeps every other consumer of
 * src/data/courses.js correct while records are only partially populated.
 *
 * Saved & comparison toggles:
 * Two 44px `aria-pressed` toggles sit beside the CTA, backed by the two
 * module-level subscriber stores — {@link useSavedCourses} (device-local, one
 * namespaced key) and {@link useComparison} (in-memory, capped at three). Being
 * shared stores rather than card state is what makes this card, the header count
 * and the dashboard panel agree within one tab, in the same interaction.
 *
 * Every label, icon and button variant for both toggles is resolved from
 * src/lib/states.js — nothing is authored here. The card reads the key for its
 * OWN primitive (`buttonVariant`, never `badgeVariant`) and translates no
 * vocabularies at the call site, because the call site is exactly where the
 * label/colour drift of BUG 1 arises; the course detail route reads the same
 * entries, so the two surfaces cannot disagree.
 *
 * THE THREE-COURSE CAP, and why the obvious implementation is wrong. Once three
 * courses are selected, a fourth card's compare toggle must still be reachable:
 * a natively `disabled` button can be neither focused nor activated, so its
 * explanation could never be triggered or read, and a refusal nobody can reach
 * is not feedback. The refused toggle therefore keeps `type="button"` and stays
 * focusable, carrying `aria-disabled="true"` instead of `disabled`. Activating
 * it changes nothing — the refusal is owned by the store, which returns
 * `{ ok: false, reason: 'full' }` without committing, so the cap constant is
 * never duplicated here. Because `aria-disabled` does not trigger Button's
 * `disabled:` utilities, the muted treatment is composed explicitly through
 * `cn()` from existing utilities, and `pointer-events` is deliberately left
 * alone so the control remains activatable. The cap is disclosed BEFORE the
 * attempt, not only on refusal: the refused toggle is described by a visually
 * hidden note carrying the cap wording from states.js. An ALREADY-SELECTED
 * course is never refused — removal always succeeds — so a slot can always be
 * freed, a precedence encoded once in `compareState()` rather than re-derived
 * here.
 *
 * Accessibility (WCAG AA):
 * - The illustration is decorative (the title conveys the meaning), so it uses an
 *   empty `alt` + `aria-hidden`; every icon is likewise decorative (`aria-hidden`).
 * - The card title is an <h3> (cards sit beneath a section <h2>).
 * - The CTA label repeats across a page of many cards, so it carries a
 *   descriptive `aria-label` combining the label and the course title. Both
 *   toggles follow that same pattern for the same reason, and both are icon-only
 *   so the action row still fits a 320px card without clipping the CTA.
 * - Toggle state is never carried by colour alone: the variant changes, the
 *   outline/filled icon changes, AND `aria-pressed` is set.
 * - Focus rings are inherited from Button's shared base and the single global
 *   `:focus-visible` rule — never re-declared here.
 * - The default root element is a semantic <article> (self-contained content);
 *   callers can override via the `as` prop forwarded through `...props`
 *   (e.g. `as="li"` inside a list).
 *
 * @param {object} props
 * @param {object} props.course The course record. Required shape:
 *   `{ slug, title, category, summary, duration, highlights, icon }` where `category`
 *   is one of `'English' | 'Science' | 'Computer' | 'Career'`, `highlights` is an
 *   array of short strings, and `icon` is a react-icons component REFERENCE (rendered,
 *   never called). `slug` additionally drives the CTA destination and both toggles.
 *   Optional and read only when present: `level`
 *   (`'Beginner' | 'Intermediate' | 'Advanced' | 'All levels'`) renders the level
 *   badge. Any other optional catalogue field is ignored by this card. When
 *   `course` is falsy the component renders `null`.
 * @param {string} [props.to] Optional explicit destination that overrides the
 *   slug-derived `/courses/<slug>` route for the CTA.
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

export default function CourseCard({
  course,
  to: toProp,
  ctaLabel = 'Learn more',
  className,
  ...props
}) {
  // EVERY hook is called unconditionally, at the top level, BEFORE the `!course`
  // guard below — the Rules of Hooks (`react/rules-of-hooks` is an error here).
  // The guard used to be the first statement in this component; it has to sit
  // after these calls now, because a conditional return above a hook would make
  // the hook order depend on the data. Nothing here reads `course`, so the order
  // is safe as well as legal.
  const { isSaved, toggle: toggleSaved } = useSavedCourses()
  const { has: isCompared, toggle: toggleCompared, isFull: isComparisonFull } = useComparison()
  // Ties the refused compare toggle to its own visually hidden cap note. `useId`
  // keeps the association unique across the many cards on one page.
  const capNoteId = useId()

  // Guard: nothing to render without a course record. Every read of `course`
  // below is therefore safe.
  if (!course) return null

  // Resolve media by slug first, then category, then a safe default.
  const image =
    IMAGE_BY_SLUG[course.slug] || IMAGE_BY_CATEGORY[course.category] || courseEnglish

  // Resolve the CTA destination: an explicit prop still wins (the three category
  // landing pages rely on it for their /admission override), otherwise the card
  // links to this course's OWN detail route. See "Why the default changed" above
  // — the previous category-derived default sent four cards to a page describing
  // a different course (BUG 1).
  const to = toProp || `/courses/${course.slug}`

  // react-icons component reference supplied via data — render, never call.
  const Icon = course.icon

  // Surface at most three highlights; tolerate a missing/empty highlights array.
  const highlights = course.highlights?.slice(0, 3) ?? []

  // Toggle presentation — resolved entirely from src/lib/states.js so this card
  // and the course detail route cannot describe the same state differently. Each
  // entry supplies the label, the decorative icon and the variant for the
  // primitive doing the rendering; a Button reads `buttonVariant` and nothing
  // else. Capitalised locals so JSX renders the icon references.
  const saved = isSaved(course.slug)
  const savedEntry = savedState(saved)
  const SavedIcon = savedEntry.icon

  const compared = isCompared(course.slug)
  // `compareState` encodes the precedence: an already-selected course resolves to
  // `selected` even at the cap, so removal is never refused and a slot can always
  // be freed. Only an UNSELECTED course at the cap resolves to `full`.
  const compareEntry = compareState(compared, isComparisonFull)
  const CompareIcon = compareEntry.icon
  const compareRefused = !compared && isComparisonFull
  // The accessible NAME always states the action, so it does not mutate into a
  // sentence when the set fills; the cap wording is exposed as the control's
  // DESCRIPTION instead (see the cap note rendered beside the toggle).
  const compareActionEntry = compared ? COMPARE_STATE.selected : COMPARE_STATE.unselected

  /**
   * Add or remove this course from the comparison working set.
   *
   * The store owns the cap: it returns `{ ok: false, reason: 'full' }` and
   * commits nothing when a fourth course is attempted, so an activation of the
   * refused toggle is already a no-op here and the limit is never restated in
   * this component. The visitor is told about the cap by this toggle's own
   * description and by the grid's live result row, not by a per-card live
   * region — there is exactly one polite region per listing.
   */
  function handleCompareClick() {
    toggleCompared(course.slug)
  }

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

      {/* Body: icon + title, duration, summary, up to three highlights, and the
          admission-oriented CTA pinned to the bottom of the card. */}
      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex items-center gap-2">
          {Icon ? <Icon className="h-6 w-6 shrink-0 text-primary-600" aria-hidden="true" /> : null}
          <h3 className="text-lg font-semibold text-foreground">{course.title}</h3>
        </div>

        {course.duration ? (
          <p className="flex items-center gap-2 text-sm text-muted">
            <FiClock aria-hidden="true" />
            {course.duration}
          </p>
        ) : null}

        {/* Level is an OPTIONAL catalogue field: rendered only where the institute
            has stated a difficulty, and omitted entirely — heading and all —
            otherwise, rather than shown as an empty or placeholder pill. */}
        {course.level ? (
          <p className="flex items-center gap-2">
            <Badge variant="neutral">{course.level}</Badge>
          </p>
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
          {/* Action row: the primary CTA first (it is the primary action and the
              first stop in the tab order), then the two icon-only toggles. It
              WRAPS rather than overflowing, so a 320px card keeps all three
              controls at their full 44px hit area without clipping the CTA. */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              to={to}
              variant="primary"
              size="sm"
              aria-label={`${ctaLabel} — ${course.title}`}
            >
              {ctaLabel}
            </Button>

            <Button
              type="button"
              variant={savedEntry.buttonVariant}
              size="sm"
              aria-pressed={saved}
              aria-label={`${savedEntry.label} — ${course.title}`}
              onClick={() => toggleSaved(course.slug)}
            >
              <SavedIcon className="h-5 w-5" aria-hidden="true" />
            </Button>

            <Button
              type="button"
              variant={compareEntry.buttonVariant}
              size="sm"
              aria-pressed={compared}
              // `aria-disabled`, never the native `disabled`: the control must stay
              // focusable so the cap it explains can actually be reached. Applied
              // only when the set is full AND this course is not already selected.
              aria-disabled={compareRefused || undefined}
              aria-describedby={compareRefused ? capNoteId : undefined}
              aria-label={`${compareActionEntry.label} — ${course.title}`}
              // Button's `disabled:` utilities do not fire for `aria-disabled`, so
              // the muted treatment is composed here from existing utilities.
              // `pointer-events` is left alone on purpose — the toggle stays
              // activatable, and the store refuses the change.
              className={cn(compareRefused && 'cursor-not-allowed opacity-50')}
              onClick={handleCompareClick}
            >
              <CompareIcon className="h-5 w-5" aria-hidden="true" />
            </Button>

            {/* The cap, disclosed BEFORE the attempt rather than only on refusal.
                Wording comes from states.js, so the card, the detail route and the
                grid's announcement all state the limit identically. */}
            {compareRefused ? (
              <span id={capNoteId} className="sr-only">
                {compareEntry.label}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  )
}
