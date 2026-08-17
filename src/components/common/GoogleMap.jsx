import { cn } from '../../lib/cn.js'
import siteConfig from '../../data/siteConfig.js'

/**
 * GoogleMap
 *
 * The single canonical map embed for the CIBLE School of Language SPA. It renders the
 * institute's location as a responsive, lazy-loaded Google Maps `<iframe>` so
 * prospective students and parents can find and visit the campus — a core conversion
 * action. The Contact page composes this primitive; the Footer intentionally links out
 * via `siteConfig.mapLink` rather than embedding, so no third-party iframe loads on
 * every route. Never hand-roll a raw map `<iframe>` elsewhere, so the source URL,
 * accessibility and framing stay consistent.
 *
 * Data source: every location value comes from `siteConfig` — `siteConfig.mapEmbedUrl`
 * for the `<iframe src>` and `siteConfig.address` for the postal address shown when no
 * embed URL is configured. Neither is written here, so a contact change propagates from
 * the data module alone. The shareable `siteConfig.mapLink` is deliberately not read in
 * this file; see the graceful-degradation note below for which component owns that
 * action.
 *
 * Styling (Tailwind v4 `@theme` tokens from src/index.css — zero hardcoded values): a
 * fixed 16:9 box that reserves its height at every width, so the map never triggers
 * layout shift while it loads and reflows on every breakpoint with no horizontal
 * overflow; the brand card radius (`rounded-2xl` → `--radius-2xl`) with a hairline
 * border token so the embed reads as part of the design system; and a subtle neutral
 * fill shown behind the iframe while it loads and behind the fallback.
 *
 * Performance: the iframe is lazy-loaded, so this heavy third-party embed is only
 * fetched when it scrolls near the viewport, protecting initial load and Core Web
 * Vitals.
 *
 * Privacy: the iframe requests Google with `referrerPolicy="strict-origin-when-cross-
 * origin"`, so the cross-origin request carries this site's origin only — never the
 * full page path or query.
 *
 * Graceful degradation: the fallback is the OTHER branch of the embed, not a layer
 * stacked beneath it. When `siteConfig.mapEmbedUrl` is absent or empty no iframe is
 * rendered and the institute address is centred in the same reserved 16:9 box instead,
 * so this surface never degrades to an empty panel.
 *
 * The fallback deliberately carries NO "open in Maps" control of its own. A control
 * rendered beneath a configured iframe would be permanently covered yet stay in the
 * keyboard and accessibility order, giving the composing page two actions for one
 * function, one of them unreachable by pointer. The single interactive "open the
 * location in Google Maps" affordance is therefore owned once in page content by
 * `src/pages/Contact.jsx` (a `Button` on the "Visit Us" card, which supplies the 44px
 * touch floor and reads `siteConfig.mapLink`), and site-wide by the Footer's own link.
 * This component owns the EMBED only.
 *
 * Accessibility (WCAG AA): the `<iframe>` always carries a descriptive `title`, which
 * is mandatory for assistive technology to announce an embedded frame and which is its
 * accessible name. This component contributes no link or button of its own in either
 * branch, so the page it composes into announces exactly one map action; the wrapper
 * adds no interactive semantics either.
 *
 * @param {object} props
 * @param {string} [props.title='CIBLE School of Language location on Google Maps']
 *   Accessible name announced for the embedded map frame. Always applied to the
 *   `<iframe>` and required for accessibility.
 * @param {string} [props.className] Extra classes merged LAST via `cn(...)` (clsx +
 *   tailwind-merge), so caller-supplied utilities always win over the base surface.
 * @returns {import('react').ReactElement} The rendered responsive map surface.
 *
 * Any other props (`id`, `aria-*`, `data-*`, `style`, …) are forwarded to the rendered
 * wrapper `<div>`.
 */
export default function GoogleMap({
  title = 'CIBLE School of Language location on Google Maps',
  className,
  ...props
}) {
  return (
    <div
      className={cn(
        'relative aspect-video w-full overflow-hidden rounded-2xl border border-border bg-surface',
        className,
      )}
      {...props}
    >
      {siteConfig.mapEmbedUrl ? (
        <iframe
          src={siteConfig.mapEmbedUrl}
          title={title}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted">
          <p>{siteConfig.address}</p>
        </div>
      )}
    </div>
  )
}
