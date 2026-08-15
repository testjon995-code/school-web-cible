import { FaWhatsapp, FaPhoneAlt } from 'react-icons/fa'
import Container from '../ui/Container.jsx'
import Button from '../ui/Button.jsx'
import { cn } from '../../lib/cn.js'
import siteConfig from '../../data/siteConfig.js'
import heroImg from '../../assets/hero.svg'

/**
 * Hero — the primary above-the-fold hero section for the CIBLE School of
 * Language SPA (AAP §0.6.1 Group 7 / §0.6.3 "Home composition"). It is the
 * conversion-first opening of the Home page and is reusable as the lead section
 * of other marketing pages, which override `title` / `subtitle` / `eyebrow`.
 *
 * Layout: a two-column band on a subtle neutral surface. The left column is the
 * value proposition (eyebrow kicker → page headline → lead paragraph → a row of
 * three admission-focused CTAs); the right column is the brand hero
 * illustration. On mobile the grid collapses to a single stacked column
 * (`md:grid-cols-2` only splits from the `md` breakpoint up), so there is never
 * any horizontal scroll and touch targets stay comfortably tappable.
 *
 * Conversion (per the admissions-first ruleset): the CTA row exposes the three
 * canonical actions, ranked into THREE deliberately distinct emphasis tiers so
 * the funnel reads at a glance instead of offering three equally weighted
 * controls. It reuses the SAME ladder as the closing CTASection band, so the
 * page's opening and closing conversion surfaces read identically:
 *
 *   Tier 1 — PRIMARY (dominant)
 *     1. Apply Now  → internal route /admission     (primary  · size lg)
 *   Tier 2 — SECONDARY (supporting)
 *     2. WhatsApp   → siteConfig.whatsappHref        (accent   · size md)
 *   Tier 3 — TERTIARY (low emphasis)
 *     3. {phone}    → siteConfig.phoneHref  (tel:)   (tertiary · size md)
 *
 * The tiers are separated by MORE than colour (WCAG "never colour alone"):
 * tier 1 is the only `lg` control (48px tall, text-lg, px-8) and the only blue
 * fill; tier 2 steps down to `md` (44px, text-base, px-6); tier 3 drops the fill
 * AND the border and carries a persistent underline, so its lower emphasis is a
 * shape difference that survives without colour vision. Hue still encodes the
 * CHANNEL rather than the rank — blue = navigation, green = messaging — keeping
 * the site's colour-to-intent code intact. Every tier clears the 44px
 * touch-target floor `Button` enforces (`min-h-11` plus `h-11`/`h-12`), so
 * demoting a control never shrinks its hit area.
 *
 * The size step between tiers 1 and 2 is therefore LOAD-BEARING, not decorative —
 * do not equalise it. Both are opaque fills with zero border, so shape separates
 * them not at all, and hue separates them not at all either: primary-600 and
 * accent-700 have near-identical WCAG relative luminance (0.153 vs 0.159, a
 * mutual ratio of ~1.03:1), so in greyscale the blue and green fills are the same
 * tone. The measured 48px/44px height, 18px/16px type and 32px/24px padding steps
 * are the ONLY thing carrying that pair's ranking.
 *
 * All three actions are retained by design — emphasis is re-ranked here, nothing
 * is removed. /admission is the admission-focused CTA the ruleset requires on
 * every page, and WhatsApp + click-to-call are the mobile contact affordances it
 * also mandates; those two are carried globally as well by
 * components/cta/{FloatingWhatsApp,FloatingCall,StickyBottomCTA}.jsx, mounted
 * once by Layout, so this band must never fork another copy of them. All three
 * render through the single canonical <Button> primitive (never restyled raw
 * anchors): `to` yields a react-router <Link>, while `href` yields a semantic
 * <a> — the external deep link https://wa.me/919899315093 opens in a new tab and
 * tel:+919899315093 opens the device dialer in place — so this file must NOT
 * import <Link> itself. Brand contact values are read from siteConfig, and the
 * click-to-call label IS `siteConfig.phone`; neither is ever hardcoded.
 *
 * Performance / LCP (review M10): the Hero is entirely above the fold, so its
 * critical content is rendered IMMEDIATELY at its final visible state — it is
 * intentionally NOT gated behind a scroll-reveal. An earlier version wrapped the
 * headline in framer-motion with `initial="hidden"` driven by an
 * IntersectionObserver `inView` flag; because that flag is `false` on first
 * paint until the observer fires asynchronously, the above-fold `<h1>` (the LCP
 * element) was held at opacity 0 for hundreds of milliseconds. To eliminate that
 * delay — and to keep the above-fold JavaScript cost minimal — the Hero now uses
 * plain semantic elements (no framer-motion) so the h1, lead paragraph and CTAs
 * paint at once. The hero image additionally declares `loading="eager"`,
 * `fetchPriority="high"` and `decoding="async"` to signal it as high-priority.
 * Subtle scroll-reveal animation is retained across the site's BELOW-fold
 * sections, where it does not affect LCP.
 *
 * Design-system compliance (Tailwind v4 @theme tokens from src/index.css; the
 * project rule is ZERO hardcoded style values — every value traces to a token
 * or utility on the 8px spacing scale). Two example class names from the file
 * brief are NOT backed by tokens in this repository and were snapped to the
 * defined tokens (verified by inspecting the generated CSS) so the output is
 * actually styled and stays WCAG-AA compliant — see the inline BLITZY flags:
 *   • the muted lead text uses `text-muted` (the defined --color-muted token);
 *   • the eyebrow pill uses `bg-primary-50` + `text-primary-700` (the same
 *     AA-safe pairing as the canonical Badge primary variant, ≈6.16:1).
 *
 * Accessibility (WCAG AA): the section owns the page's single <h1>; the
 * illustration is meaningful, so it carries a descriptive (non-empty) `alt`; the
 * `width`/`height` attributes reserve space to avoid layout shift (CLS); the
 * button icons are decorative (`aria-hidden`) and each button's visible text
 * label provides its accessible name; focus rings and AA-contrast token pairings
 * are inherited from the shared primitives and the global base layer.
 *
 * @param {object} props
 * @param {import('react').ReactNode} [props.title=siteConfig.tagline] Headline
 *   rendered as the page <h1>. Defaults to the brand tagline so Home works out
 *   of the box; other pages pass their own heading.
 * @param {import('react').ReactNode} [props.subtitle=siteConfig.description]
 *   Supporting lead paragraph beneath the headline.
 * @param {import('react').ReactNode} [props.eyebrow='Admissions Open'] Small
 *   kicker label shown in the pill above the headline.
 * @param {string} [props.className] Extra classes merged LAST onto the root
 *   <section> via {@link cn} so callers can extend/override the defaults.
 * @param {object} [props] Any remaining props are forwarded to the root
 *   <section> (e.g. `id`, `aria-*`, `data-*`).
 * @returns {import('react').ReactElement} The rendered hero section.
 */
function Hero({
  title = siteConfig.tagline,
  subtitle = siteConfig.description,
  eyebrow = 'Admissions Open',
  className,
  ...props
}) {
  return (
    <section className={cn('bg-surface', className)} {...props}>
      <Container className="grid items-center gap-10 py-16 md:grid-cols-2 md:py-24">
        {/* Left column: value proposition + CTAs. Rendered immediately (no
            scroll-reveal gating) so the above-fold h1/lead/CTAs paint at once —
            critical for LCP (M10). Plain elements keep above-fold JS minimal. */}
        <div className="flex flex-col gap-6">
          {/* Eyebrow pill: canonical Badge-primary token pairing bg-primary-50 +
              text-primary-700 — both defined @theme tokens, WCAG AA ≈6.16:1. */}
          <span className="inline-flex w-fit items-center rounded-full bg-primary-50 px-4 py-1 text-sm font-medium text-primary-700">
            {eyebrow}
          </span>
          <h1 className="text-4xl font-bold leading-tight text-foreground md:text-5xl">
            {title}
          </h1>
          {/* Lead paragraph uses `text-muted` (the defined --color-muted token,
              ≈7.5:1 on the surface — WCAG AA). */}
          <p className="max-w-prose text-lg text-muted">{subtitle}</p>
          {/* Action row — a column at the base layer so all three controls stack
              full-width and tappable at 320px, becoming a wrapping row from `sm`.
              `flex-wrap` is load-bearing rather than defensive: the three controls
              need 546.5px side by side, but `md:grid-cols-2` leaves this column
              only 340px at 768px and 468px at 1024px, so the row legitimately
              breaks onto two lines there and settles onto one from ~1181px up.
              That is controls reflowing, never a label wrapping inside a control.
              `sm:items-center` is scoped to `sm` on purpose: the tier ladder gives
              tier 1 a 48px height against tier 2/3's 44px, and in a flex ROW those
              definite heights would otherwise settle at the cross-START, leaving a
              4px ragged gap along the shorter controls' bottom edge. Left
              unprefixed it would instead hijack the base layer, where the cross
              axis is horizontal — the controls would shrink to their content width
              and lose the full-width mobile stack. The tiers below are ranked by
              variant AND size together, never by colour alone; see the tier table
              in the JSDoc above. */}
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            {/* Tier 1 — the admission action, as an internal route (react-router
                <Link>). The ruleset requires a clear admission-focused CTA on
                every page and this band opens the homepage funnel, so it is the
                single dominant control: the only `lg` size and the only blue fill
                in the row. Never demote it. */}
            <Button to="/admission" variant="primary" size="lg">
              Apply Now
            </Button>
            {/* Tier 2 — the supporting messaging channel (external http → opens
                in a new tab). It steps down to `md` (still 44px tall), so the drop
                from tier 1 is a size + type-scale change rather than a hue change;
                green stays on messaging, preserving colour-to-intent. The icon is
                decorative, so the "WhatsApp" text is the whole accessible name. */}
            <Button href={siteConfig.whatsappHref} variant="accent" size="md">
              <FaWhatsapp aria-hidden="true" className="h-5 w-5" />
              WhatsApp
            </Button>
            {/* Tier 3 — the low-emphasis channel: click-to-call (tel: → opens the
                dialer in place). `tertiary` removes the fill AND the border and
                keeps a persistent underline, so the step down from tier 2 survives
                without colour vision. It stays a real, full-size control (Button's
                min-h-11 floor), so the mobile click-to-call affordance is
                restrained, never diminished. `md`'s px-6 needs no 320px trim here.
                Measured in-browser at 320px: this band has no inner panel, so the
                base layer offers the FULL 288px of Container content width against
                a control that needs 206.5px intrinsically (16px icon + 8px gap +
                134.5px label + 2x24px padding) — 81.5px of headroom, on one line.
                That matters because `h-11` is a FIXED height: an over-wide label
                would not widen the box, it would wrap and clip silently. Verified
                single-line at all eight mandated widths. The visible phone number
                labels the control; the icon is decorative. */}
            <Button href={siteConfig.phoneHref} variant="tertiary" size="md">
              <FaPhoneAlt aria-hidden="true" className="h-4 w-4" />
              {siteConfig.phone}
            </Button>
          </div>
        </div>

        {/* Right column: brand illustration. Rendered immediately with explicit
            high-priority hints so it is not deprioritised on the above-fold path
            (M10). `width`/`height` reserve space to prevent layout shift (CLS).
            The alt makes clear this is a representative ILLUSTRATION, not a photo
            of real students (m13). */}
        <div className="flex justify-center">
          <img
            src={heroImg}
            alt="Illustration representing learning English and building confidence at CIBLE School of Language — speech bubbles, an open book, a graduation cap and growth charts"
            className="h-auto w-full max-w-lg"
            width="640"
            height="480"
            loading="eager"
            fetchPriority="high"
            decoding="async"
          />
        </div>
      </Container>
    </section>
  )
}

export default Hero
