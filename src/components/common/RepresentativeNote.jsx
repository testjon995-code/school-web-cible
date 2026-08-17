import { FaInfoCircle } from 'react-icons/fa'
import { cn } from '../../lib/cn.js'
import siteConfig from '../../data/siteConfig.js'

/**
 * RepresentativeNote — the single canonical, point-of-claim content-truthfulness
 * disclosure for the CIBLE School of Language SPA.
 *
 * Several pages present production-quality REPRESENTATIVE sample content — faculty
 * profiles, testimonials and outcomes, institute milestones, job openings, events and
 * blog authorship — that is not yet verified, client-supplied fact. Representative
 * content is in scope for this build, but any such gap has to be visibly flagged. The
 * persistent Footer carries the site-wide demo band; this component adds a restrained
 * note ADJACENT to the specific claim, so a reader cannot mistake representative
 * samples for verified records.
 *
 * Reuse-first / zero duplication: this is the ONE disclosure primitive, so the note
 * markup and styling live here rather than being copy-pasted per page, and each caller
 * passes only its own wording as `children`.
 *
 * Single source of truth: rendering is gated by the single
 * `siteConfig.representativeContent` flag, so clearing that flag retires every
 * rendered instance of this note — and the Footer band — together, with no page edits.
 * The flag is set by hand, so it is the flag that centralises the retirement, not a
 * guarantee about when someone flips it.
 *
 * Accessibility (WCAG AA): renders a `role="note"` region — ancillary content,
 * deliberately NOT a landmark, so multiple notes never pollute the landmark structure.
 * The leading icon is decorative and removed from the accessibility tree, so the
 * disclosure text is the sole announced content.
 *
 * Styling: 100% token-driven (Tailwind v4 `@theme` tokens from `src/index.css`) and
 * restrained to preserve the premium feel — a subtle neutral surface with the hairline
 * border token, muted copy and a small brand info glyph, spaced on the 8px scale with
 * no hardcoded or arbitrary values.
 *
 * @param {object} props
 * @param {import('react').ReactNode} props.children The page-specific disclosure text.
 * @param {string} [props.className] Extra classes merged LAST via {@link cn} (clsx +
 *   tailwind-merge), so a caller can adjust spacing or width for its layout.
 * @param {string} [props.id] Optional `id` forwarded to the note element.
 * @returns {import('react').ReactElement|null} The disclosure note, or `null` when
 *   representative-content mode is off.
 */
function RepresentativeNote({ children, className, id }) {
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
