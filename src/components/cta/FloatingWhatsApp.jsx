import { FaWhatsapp } from 'react-icons/fa'
import { siteConfig } from '../../data/siteConfig.js'
import { cn } from '../../lib/cn.js'

/**
 * FloatingWhatsApp — the persistent WhatsApp floating action button (FAB) for
 * the CIBLE School of Language SPA (AAP §0.6.1 Group 8; folder-requirement C,
 * file #1). It anchors a one-tap WhatsApp chat link to the bottom-right corner
 * of every page from the `lg` breakpoint upward, where it is one of only two
 * persistent conversion affordances on screen.
 *
 * It is rendered by src/components/layout/Layout.jsx alongside <FloatingCall />
 * and the mobile <StickyBottomCTA /> bar. It takes NO props and renders with no
 * required configuration (Layout imports it as the default export).
 *
 * Behaviour — an icon-only semantic <a> that opens a WhatsApp conversation with
 * the institute. The number and the pre-filled message are read from siteConfig;
 * the phone / WhatsApp number is NEVER hardcoded in this component. External-link
 * semantics (target="_blank" + rel="noopener noreferrer") mirror the shared
 * Button primitive's behaviour for http(s) URLs.
 *
 * Visibility — `lg` AND UP, complementary to the mobile bar (closes the measured
 * content-obstruction defect; keep this reasoning with the code):
 *   • `hidden lg:flex`. Below `lg` the `lg:hidden` StickyBottomCTA bar already
 *     surfaces Call, WhatsApp and Admission as three 44px targets pinned to the
 *     thumb zone, so the project rule "display WhatsApp and Call actions
 *     prominently on mobile" is met there by ONE affordance instead of two.
 *   • Rendering both put a 56px circle inside the content column at phone
 *     widths: `Container`'s gutter is 16px (`px-4`), so a `right-4` FAB spans the
 *     column's own last 56px and could only ever sit ON page content. Measured at
 *     390px it covered the hero WhatsApp CTA across that CTA's full 44px height
 *     (2464px²) and `elementFromPoint` at the overlap returned THIS button — a tap
 *     on the visible green CTA dialled the phone instead; at 320px the sibling hid
 *     the word "in" in the hero lead paragraph, and on /contact it covered the
 *     full height of the form's "Send via WhatsApp" submit button.
 *   • Nothing is withdrawn: WhatsApp stays one tap away at EVERY width — from the
 *     bar below `lg`, from this FAB at `lg` and above — and both read the same
 *     `siteConfig.whatsappHref` target, so the two never disagree. The pair is
 *     mutually exclusive by breakpoint, which is also why no scroll/resize
 *     observer is needed to police the FAB's position.
 *
 * Positioning / non-overlap contract (VALIDATION-CRITICAL — must stay in sync
 * with FloatingCall and StickyBottomCTA):
 *   • This FAB is the BOTTOM-MOST of the two floating buttons: `bottom-6` (24px),
 *     with FloatingCall directly above at `bottom-28` (112px → 112–168px for a
 *     56px button), leaving a 32px gap so the two never overlap. The sticky bar
 *     is not on screen at these widths, so no bar clearance is needed.
 *   • Right gutter: `right-6` (24px).
 *   • `z-40` keeps it above page content but below a typical `z-50` nav drawer.
 *   • SIZING LOCK-STEP: this FAB is `h-14 w-14` (56px). The sibling FloatingCall
 *     shares that size and its `bottom-28` offset is derived from it, so changing
 *     this size REQUIRES updating the sibling's offset (see FloatingCall.jsx) to
 *     preserve the non-overlap gap.
 *
 * Accessibility (WCAG AA):
 *   • Icon-only control → `aria-label` supplies the accessible name; the
 *     FaWhatsapp glyph is decorative and marked `aria-hidden`.
 *   • The 56px touch target exceeds the 44px guideline comfortably.
 *   • Visible keyboard focus via a `focus-visible` accent ring (overrides the
 *     global primary outline so the indicator matches this green control).
 *   • Contrast rationale (documented so reviewers do NOT "fix" it): the white
 *     glyph on `bg-accent-600` (#16a34a) is ≈ 3.3:1, which satisfies WCAG 1.4.11
 *     Non-text Contrast (≥ 3:1) — the correct bar for a graphical / icon control
 *     (the stricter 4.5:1 rule applies to normal *text*, not icons). Hover
 *     `accent-700` (#15803d) is ≈ 5:1. The accent (green) token is used per the
 *     folder requirement; the WhatsApp-brand hex is intentionally NOT used.
 *
 * Styling — every value resolves to a Tailwind v4 `@theme` token (src/index.css),
 * elevation included (`shadow-float`, the fixed/floating tier — deliberately not
 * the `shadow-md` card step); there are no hardcoded or arbitrary (`[..]`) values.
 * Classes are composed through the canonical `cn()` helper so the string stays
 * mergeable. `prefers-reduced-motion` is neutralised globally in src/index.css,
 * so the `transition-colors` hover micro-interaction needs no extra handling.
 *
 * @returns {import('react').ReactElement} A fixed-position WhatsApp deep-link anchor.
 */
function FloatingWhatsApp() {
  // Build the wa.me deep link from siteConfig. When a pre-filled message is
  // configured, append it as a URL-encoded `?text=` query — the message
  // contains a comma, an apostrophe and spaces, so encodeURIComponent is
  // required. The guard keeps the link functional if the message is ever
  // removed, and the base ALWAYS comes from siteConfig.whatsappHref so the
  // number is never written literally. This is a plain expression (not a hook),
  // so no useMemo is needed.
  const href = siteConfig.whatsappMessage
    ? `${siteConfig.whatsappHref}?text=${encodeURIComponent(siteConfig.whatsappMessage)}`
    : siteConfig.whatsappHref

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with CIBLE on WhatsApp"
      className={cn(
        'fixed bottom-6 right-6 z-40',
        'hidden h-14 w-14 items-center justify-center rounded-full lg:flex',
        'bg-accent-600 text-white shadow-float transition-colors duration-200 hover:bg-accent-700',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2',
      )}
    >
      <FaWhatsapp aria-hidden="true" className="h-7 w-7" />
    </a>
  )
}

export default FloatingWhatsApp
