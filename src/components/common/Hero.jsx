import { FaWhatsapp, FaPhoneAlt } from 'react-icons/fa'
import Container from '../ui/Container.jsx'
import Button from '../ui/Button.jsx'
import { cn } from '../../lib/cn.js'
import siteConfig from '../../data/siteConfig.js'
import heroImg from '../../assets/hero.svg'

/**
 * Hero — the primary above-the-fold hero section for the CIBLE School of Language
 * SPA. It is the conversion-first opening of the Home page and is reusable as the lead
 * section of other marketing pages, which override `title` / `subtitle` / `eyebrow`.
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
 * The tiers are separated by MORE than colour (WCAG "never colour alone"): tier 1 is
 * the only `lg` control and the only blue fill; tier 2 steps down to `md`; tier 3 drops
 * the fill AND the border and carries a persistent underline, so its lower emphasis is
 * a shape difference that survives without colour vision. Hue still encodes the CHANNEL
 * rather than the rank — blue for navigation, green for messaging — keeping the site's
 * colour-to-intent code intact, and every tier clears the 44px touch-target floor
 * `Button` enforces, so demoting a control never shrinks its hit area.
 *
 * The size step between tiers 1 and 2 is therefore LOAD-BEARING, not decorative — do
 * not equalise it. Both are opaque fills with no border, so shape separates them not at
 * all, and neither does hue: the blue and green fills sit at near-identical relative
 * luminance, so in greyscale they are the same tone. The height, type-scale and padding
 * steps are the only thing carrying that pair's ranking.
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
 * PERFORMANCE / LCP — THE ONE INVARIANT THIS FILE MUST HOLD: the Hero is entirely
 * above the fold, so the `<h1>`, the lead paragraph and the action row render
 * IMMEDIATELY at their final visible state. They are built from plain semantic
 * elements and are never gated behind a scroll reveal, an IntersectionObserver or a
 * motion `initial` state — any of those would hold the LCP element invisible until an
 * observer fired asynchronously, and would add above-fold JavaScript. The hero image
 * declares eager loading, high fetch priority and async decoding for the same reason.
 * Scroll reveals belong to the site's below-fold sections, where they cannot affect LCP.
 *
 * Design-system compliance (Tailwind v4 `@theme` tokens from src/index.css; the project
 * rule is zero hardcoded style values — every value traces to a token or a utility on
 * the 8px spacing scale). The muted lead text and the eyebrow pill both use defined
 * brand tokens: a `-foreground`-style neutral alias does not exist in this @theme, and
 * the pill reuses the same AA-safe light-fill/dark-text pairing as the canonical Badge
 * primary variant.
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
 * @param {string} [props.className] Extra classes merged LAST onto the root <section>
 *   via {@link cn} so callers can extend or override the defaults.
 * @returns {import('react').ReactElement} The rendered hero section.
 *
 * Any remaining props (`id`, `aria-*`, `data-*`, …) are forwarded to the root <section>.
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
        {/* Left column: value proposition and actions. Never gated by a scroll reveal,
            so the above-fold h1, lead and CTAs paint at once (see the LCP invariant in
            the JSDoc). */}
        <div className="flex flex-col gap-6">
          {/* Eyebrow pill: the canonical Badge-primary token pairing, both defined
              @theme tokens and AA-safe together. */}
          <span className="inline-flex w-fit items-center rounded-full bg-primary-50 px-4 py-1 text-sm font-medium text-primary-700">
            {eyebrow}
          </span>
          <h1 className="text-4xl font-bold leading-tight text-foreground md:text-5xl">
            {title}
          </h1>
          <p className="max-w-prose text-lg text-muted">{subtitle}</p>
          {/* Action row — a column at the base layer so all three controls stack
              full-width and tappable on the narrowest screens, becoming a wrapping row
              from `sm`. Wrapping is load-bearing rather than defensive: the two-column
              grid leaves this column narrower than the three controls need side by side
              at tablet widths, so the ROW breaks onto two lines there and settles onto
              one on wider screens — controls reflowing, never a label wrapping inside a
              control. `sm:items-center` is scoped to `sm` on purpose: tier 1 is taller
              than tiers 2 and 3, and in a flex row those definite heights would
              otherwise settle at the cross-start and leave a ragged bottom edge. Left
              unprefixed it would hijack the base layer, where the cross axis is
              horizontal, and the controls would shrink to their content width and lose
              the full-width mobile stack. */}
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            {/* Tier 1 — the admission action, as an internal route. Every page needs a
                clear admission-focused CTA and this band opens the homepage funnel, so
                it is the single dominant control: the only `lg` size and the only blue
                fill in the row. Never demote it. */}
            <Button to="/admission" variant="primary" size="lg">
              Apply Now
            </Button>
            {/* Tier 2 — the supporting messaging channel (external http, so Button
                opens it in a new tab). It steps down to `md` while staying above the
                44px floor, so the drop from tier 1 is a size and type-scale change
                rather than a hue change, and green stays on messaging. The icon is
                decorative, so the visible text is the whole accessible name. */}
            <Button href={siteConfig.whatsappHref} variant="accent" size="md">
              <FaWhatsapp aria-hidden="true" className="h-5 w-5" />
              WhatsApp
            </Button>
            {/* Tier 3 — the low-emphasis channel: click-to-call, which a `tel:` href
                opens in place. `tertiary` removes the fill AND the border and keeps a
                persistent underline, so the step down from tier 2 survives without
                colour vision, and it stays a real, full-size control on Button's 44px
                floor — restrained, never diminished. Its default padding is kept
                because this band has no inner panel, so even the narrowest supported
                viewport leaves the label room on one line; that matters because the
                control's height is fixed, so an over-wide label would wrap and clip
                rather than widen the box. The visible phone number labels the control;
                the icon is decorative. */}
            <Button href={siteConfig.phoneHref} variant="tertiary" size="md">
              <FaPhoneAlt aria-hidden="true" className="h-4 w-4" />
              {siteConfig.phone}
            </Button>
          </div>
        </div>

        {/* Right column: the brand illustration, rendered immediately with explicit
            high-priority hints so it is not deprioritised on the above-fold path. The
            intrinsic width and height reserve space to prevent layout shift, and the
            alt makes clear this is a representative ILLUSTRATION rather than a photo of
            real students. */}
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
