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
 * Single source of truth / auto-retiring: rendering is gated by the single
 * `siteConfig.representativeContent` flag. When the client provides verified,
 * consent-approved content and clears that flag, EVERY instance of this note
 * (and the Footer band) disappears automatically with no page edits — the demo
 * disclosure can never be left stranded in production.
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
 * @returns {import('react').ReactElement|null} The disclosure note, or `null`
 *   when representative-content mode is off (verified content is live).
 */
function RepresentativeNote({ children, className, id }) {
  // Fail-safe: never render the demo disclosure once the site is running on
  // verified, client-approved content (single source of truth).
  if (!siteConfig.representativeContent) return null

  return (
    <div
      role="note"
      id={id}
      className={cn(
        'flex items-start gap-2 rounded-lg border border-border bg-surface p-4 text-sm text-muted',
        className,
      )}
    >
      <FaInfoCircle aria-hidden="true" className="h-5 w-5 shrink-0 text-secondary-500" />
      <p>{children}</p>
    </div>
  )
}

export default RepresentativeNote
