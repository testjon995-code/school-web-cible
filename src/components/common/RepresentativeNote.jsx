import { FaInfoCircle } from 'react-icons/fa'
import { cn } from '../../lib/cn.js'
import siteConfig from '../../data/siteConfig.js'

/**
 * RepresentativeNote — the single canonical, point-of-claim content-truthfulness
 * disclosure for the CIBLE School of Language SPA (review finding M03,
 * AAP §0.7.2).
 *
 * Several pages present production-quality *representative* sample content —
 * faculty profiles, testimonials/outcomes, institute history/milestones, job
 * openings, events and blog authorship — that is NOT yet verified, client-
 * supplied fact. AAP §0.7.2 keeps that representative content in scope but
 * requires any such gap to be *visibly flagged*; the review's resolution for M03
 * is likewise to "visibly gate the application as a non-production demo." The
 * persistent Footer already carries a site-wide demo band; this component adds a
 * restrained, tasteful note ADJACENT to the specific claim (mirroring the
 * Gallery page's accepted "illustration" disclosure pattern) so a reader can
 * never mistake representative samples for verified records.
 *
 * Reuse-first / zero duplication: this is the ONE disclosure primitive composed
 * across Faculty, Success Stories, About, Career, Events and Blog — the note
 * markup/styling lives here once rather than being copy-pasted per page. The
 * page passes the page-specific wording as `children`.
 *
 * Single source of truth / auto-retiring: under the default `gate="content"`,
 * rendering is gated by the single `siteConfig.representativeContent` flag. When
 * the client provides verified, consent-approved content and clears that flag,
 * EVERY content disclosure rendered through this component (and the Footer band)
 * disappears automatically with no page edits — the demo disclosure can never be
 * left stranded in production. That guarantee is unchanged and still covers all
 * of the content call sites, none of which passes `gate`.
 *
 * The single deliberate, documented exception is `gate="always"` (AAP §0.6.5),
 * which renders regardless of the flag because it discloses something about the
 * APPLICATION'S ARCHITECTURE rather than about unconfirmed content. It is scoped
 * to one caller and explained in full on the `gate` parameter below.
 *
 * Accessibility (WCAG AA): renders a `role="note"` region (ancillary/parenthetic
 * content — deliberately NOT a landmark, so multiple notes never pollute the
 * landmark structure). The leading icon is decorative and removed from the
 * accessibility tree with `aria-hidden`, so the disclosure text is the sole
 * announced content.
 *
 * Styling: 100% token-driven (Tailwind v4 `@theme` tokens from `src/index.css`)
 * and restrained to preserve the premium feel — a subtle neutral `bg-surface`
 * card with the hairline `border-border`, `text-muted` copy and a small brand
 * `secondary` info glyph. Spacing is on the 8px scale (`gap-2` = 8px, `p-4` =
 * 16px); no hardcoded or arbitrary values.
 *
 * @param {object} props
 * @param {import('react').ReactNode} props.children The page-specific disclosure
 *   text (e.g. "The faculty profiles shown here are representative samples …").
 * @param {string} [props.className] Extra classes merged LAST via {@link cn}
 *   (clsx + tailwind-merge), so a caller can adjust spacing/width for its layout.
 * @param {string} [props.id] Optional `id` forwarded to the note element.
 * @param {'content'|'always'} [props.gate='content'] Which condition governs
 *   whether this note renders at all.
 *
 *   • `'content'` (the default) is the fail-safe, flag-gated behaviour that every
 *     content disclosure on the site uses: the note renders only while
 *     `siteConfig.representativeContent` is set, and retires itself the moment
 *     the client clears that flag. This is what keeps the auto-retiring
 *     guarantee above true, which is why ANY value other than `'always'` —
 *     including an unrecognised one — is treated as `'content'`: the fail-safe
 *     direction is suppression, never accidental rendering.
 *
 *   • `'always'` renders unconditionally, and `src/pages/Dashboard.jsx` is the
 *     ONLY intended caller. Its notice is not representative content awaiting
 *     confirmation; it is an architectural fact — there is no account, no
 *     authentication and no server behind that surface, and confirming the
 *     institute's course content does not change that.
 *
 *   DO NOT "fix" the dashboard back onto the content gate. Doing so would
 *   silently delete the only statement telling a visitor that the surface does
 *   not track a real enrolment, at precisely the moment the site starts looking
 *   finished. Hand-rolling a second `role="note"` block on that page, or adding
 *   a second notice component, was considered and rejected as duplication — this
 *   one additive prop is why the codebase still has exactly ONE disclosure
 *   component.
 * @returns {import('react').ReactElement|null} The disclosure note, or `null`
 *   when the `'content'` gate applies and representative-content mode is off
 *   (verified content is live).
 */
function RepresentativeNote({ children, className, id, gate = 'content' }) {
  // Fail-safe: never render the demo disclosure once the site is running on
  // verified, client-approved content (single source of truth). `gate="always"`
  // is the one documented exception — an architectural disclosure that must
  // outlive content confirmation (AAP §0.6.5) — so every other value, including
  // an unrecognised one, keeps the suppressing content behaviour.
  if (gate !== 'always' && !siteConfig.representativeContent) return null

  return (
    <div
      role="note"
      id={id}
      className={cn(
        'flex items-start gap-2 rounded-xl border border-border bg-surface p-4 text-sm text-muted',
        className,
      )}
    >
      <FaInfoCircle aria-hidden="true" className="h-5 w-5 shrink-0 text-secondary-500" />
      <p>{children}</p>
    </div>
  )
}

export default RepresentativeNote
