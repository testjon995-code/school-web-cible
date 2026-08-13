import { motion } from 'framer-motion'
import { FaWhatsapp, FaPhoneAlt } from 'react-icons/fa'
import Container from '../ui/Container.jsx'
import Button from '../ui/Button.jsx'
import { cn } from '../../lib/cn.js'
import { useScrollReveal, prefersReducedMotion, fadeUp } from '../../hooks/useScrollReveal.js'
import siteConfig from '../../data/siteConfig.js'

/**
 * CTASection — the reusable admission call-to-action block that closes EVERY
 * page of the CIBLE School of Language website (AAP §0.6.3: "Every page ends
 * with an admission CTASection"). It is the site's primary conversion surface,
 * surfacing the four admission actions the ruleset requires on every page,
 * ranked into THREE deliberately distinct emphasis tiers so the funnel reads at
 * a glance instead of offering four equally weighted controls:
 *
 *   Tier 1 — PRIMARY (dominant)
 *     1. Apply Now          → internal route /admission   (primary   · size lg)
 *   Tier 2 — SECONDARY (supporting; equal weight, different CHANNEL)
 *     2. Talk to an Advisor → internal route /contact     (secondary · size md)
 *     3. WhatsApp           → siteConfig.whatsappHref     (accent    · size md)
 *   Tier 3 — TERTIARY (low emphasis)
 *     4. Call {phone}       → siteConfig.phoneHref (tel:) (tertiary  · size md)
 *
 * The tiers are separated by MORE than colour (WCAG "never colour alone"):
 * tier 1 is the only `lg` control (48px tall, text-lg, px-8) and the only blue
 * fill; tier 2 steps down to `md` (44px, text-base, px-6); tier 3 drops the fill
 * AND the border and carries a persistent underline, so its lower emphasis is a
 * shape difference. Inside tier 2 the orange/green split encodes the CHANNEL,
 * not the emphasis — both controls share one size and one fill weight, keeping
 * the site's colour-to-intent code intact (blue = navigation, orange =
 * considered admission actions, green = messaging). Every tier still clears the
 * 44px touch-target floor that Button enforces, so demoting a control never
 * shrinks its hit area.
 *
 * All four actions are retained by design: /admission and /contact are the
 * admission funnel, and the WhatsApp + click-to-call deep links are the mobile
 * contact affordances the ruleset requires. Emphasis is re-ranked here; nothing
 * is removed. Those mobile affordances are ALSO carried globally by
 * components/cta/{FloatingWhatsApp,FloatingCall,StickyBottomCTA}.jsx, mounted
 * once by Layout — this band must never fork another copy of them.
 *
 * Reuse-first (zero duplication): this component composes the single canonical
 * {@link Container} width/gutter primitive and the single canonical polymorphic
 * {@link Button}. It never restyles a raw button and never re-implements layout
 * that a primitive already owns. Because Button is polymorphic (`to` renders a
 * react-router <Link>, `href` renders a semantic <a>), this file must NOT import
 * <Link> itself — passing `to`/`href` is sufficient.
 *
 * Contact deep-links are read exclusively from {@link siteConfig} (the single
 * source of truth) rather than hardcoded, so the WhatsApp (https://wa.me/…) and
 * click-to-call (tel:…) targets stay consistent site-wide. Both remain real,
 * tappable, full-height deep-links after the re-ranking — the ruleset's mobile
 * WhatsApp/Call mandate constrains their PRESENCE and hit area, not their
 * emphasis, so tier 3 lowers visual weight without lowering reachability.
 *
 * Styling — token-driven, zero hardcoded values and zero arbitrary bracket
 * utilities (Tailwind v4 @theme tokens from src/index.css, all on the 8px
 * spacing scale). The panel corner is `rounded-2xl` = --radius-2xl (1.25rem),
 * the brand step for large surfaces and the same one `Card` uses. The @theme
 * block declares exactly TWO radius steps (--radius-lg, --radius-2xl) and does
 * NOT redeclare any larger one, so reaching for a bigger built-in radius utility
 * here would silently fall through to Tailwind's own 1.5rem default and put a
 * third, off-system corner on the site's most-repeated panel. Keep it on token.
 *
 * The panel is intentionally a LIGHT brand surface — a very subtle
 * blue→neutral→orange gradient tint — so every Button tier keeps WCAG-AA
 * contrast against it: the filled variants are locked to AA shades (primary-600,
 * secondary-700 ≈ 5.18:1, accent-700 — never secondary-600, which is only
 * ≈ 3.56:1 under white text), and the unfilled `tertiary` label reads
 * primary-700 ≈ 6.2:1 on this tint. A dark panel would break the filled buttons'
 * contrast, so it is deliberately avoided.
 *
 * NOTE ON TOKEN CLASS NAMES — the design brief illustrated the gradient/muted
 * tints as `from-primary/5`, `to-secondary/5`, and `text-muted-foreground`.
 * The committed @theme in src/index.css exposes SCALE color tokens
 * (--color-primary-600, --color-secondary-500, …) and the semantic token
 * --color-muted, but no bare --color-primary / --color-secondary /
 * --color-muted-foreground. Those bare/`-foreground` utilities therefore emit
 * NO CSS (verified with the Tailwind v4 compiler). To honor the brief's binding
 * rule — "@theme tokens only" — while preserving the exact visual intent, the
 * brand-anchor scale tokens and the real semantic token are used instead:
 *   from-primary/5        → from-primary-600/5   (brand blue anchor,  5% tint)
 *   to-secondary/5        → to-secondary-500/5   (brand orange anchor, 5% tint)
 *   text-muted-foreground → text-muted           (--color-muted, ~7.5:1 on white)
 *
 * Animation — a single subtle fade-up reveal via framer-motion driven by
 * {@link useScrollReveal}, which fully respects `prefers-reduced-motion`: the
 * panel is gated with `initial={reduce ? false : 'hidden'}` (via
 * {@link prefersReducedMotion}) so it mounts directly at its final state with
 * NO enter animation for users who request reduced motion (WCAG 2.3.3). All
 * hooks are called unconditionally at the top level.
 *
 * Accessibility (WCAG AA) — one <h2> titles the section; the actions sit in a
 * flex row of real <Link>/<a> controls (keyboard-operable, focus-ring exposed
 * by the shared Button base). The leading icons are purely decorative
 * (`aria-hidden`), so each button is named entirely by its visible text label.
 * The emphasis tiers never rely on colour alone (see the tier table above), and
 * every control keeps the >= 44px hit area that Button's `min-h-11 min-w-11`
 * base enforces. The action row stacks vertically at the unprefixed base layer
 * and only becomes a wrapping row from `sm`, so all four controls stay fully
 * visible and tappable at 320px — below Tailwind's smallest breakpoint.
 *
 * @param {object} props
 * @param {string} [props.title='Ready to shape your future?'] Section heading.
 * @param {string} [props.subtitle] Supporting line beneath the heading.
 * @param {string} [props.className] Extra classes merged LAST onto the root
 *   <section> via {@link cn} so callers can tune vertical rhythm / background
 *   without forking the component.
 * @param {object} [props.props] Any remaining props are forwarded to the root
 *   <section> (e.g. `id`, `aria-labelledby`, data-* attributes).
 * @returns {import('react').ReactElement} The admission CTA section.
 */
export default function CTASection({
  title = 'Ready to shape your future?',
  subtitle = 'Join CIBLE School of Language today — talk to our counselors or apply online in minutes.',
  className,
  ...props
}) {
  const { ref, inView } = useScrollReveal()
  // Synchronous, SSR-safe read of prefers-reduced-motion (plain helper, not a
  // hook). When true the panel mounts with `initial={false}` and renders at its
  // final state with no fade-up reveal (WCAG 2.3.3).
  const reduce = prefersReducedMotion()

  return (
    <section className={cn('py-16 md:py-24', className)} {...props}>
      <Container>
        <motion.div
          ref={ref}
          variants={fadeUp}
          initial={reduce ? false : 'hidden'}
          animate={inView ? 'visible' : 'hidden'}
          className="rounded-2xl bg-gradient-to-br from-primary-600/5 via-surface to-secondary-500/5 px-6 py-12 text-center ring-1 ring-border md:px-12 md:py-16"
        >
          <h2 className="text-3xl font-bold text-foreground md:text-4xl">{title}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted">{subtitle}</p>
          {/* Action row — column at the base layer so all four controls stack
              cleanly at 320px, becoming a centered wrapping row from `sm`. The
              tiers below are ranked by variant AND size together, never by
              colour alone; see the tier table in the JSDoc above. */}
          <div className="mt-8 flex flex-col flex-wrap items-center justify-center gap-4 sm:flex-row">
            {/* Tier 1 — the admission action. The ruleset requires a clear
                admission-focused CTA on every page and this band closes all 18,
                so it is the single dominant control: the only `lg` size and the
                only blue fill in the row. Never demote it. */}
            <Button to="/admission" variant="primary" size="lg">
              Apply Now
            </Button>
            {/* Tier 2 — supporting actions. Both step down to `md` (still 44px
                tall), so the drop from tier 1 is size + type scale rather than
                hue. Orange stays on the considered admission action and green
                stays on the messaging channel, preserving colour-to-intent. */}
            <Button to="/contact" variant="secondary" size="md">
              Talk to an Advisor
            </Button>
            <Button href={siteConfig.whatsappHref} variant="accent" size="md">
              <FaWhatsapp aria-hidden="true" className="h-5 w-5" />
              WhatsApp
            </Button>
            {/* Tier 3 — the low-emphasis channel. `tertiary` removes the fill
                and the border and keeps a persistent underline, so the step down
                from tier 2 survives without colour vision. It stays a real,
                full-size tel: control (Button's min-h-11 floor), so the mobile
                click-to-call affordance is restrained, never diminished.

                `px-4 sm:px-6` is a measured 320px safeguard, not decoration.
                This is the longest label in the band ("Call " + the dialling
                code + the number, all read from siteConfig), and at 320px the
                panel leaves exactly 240px of content width. Measured in-browser
                at the `md` default of px-6 the control landed at 239.9px — a
                0.1px margin, i.e. a tolerable text run of just 192px against an
                Inter run of 191.9px. Because the control has a FIXED 44px height
                (`h-11`), overshooting that run does not widen the box: the label
                wraps to a second line and is clipped, which a horizontal-overflow
                check cannot detect. 0.1px is finer than font metrics are stable
                across Inter versions, platform fallback faces and rendering
                stacks, so trimming the padding one step on the base layer raises
                the tolerable run to 208px (~16px of real headroom) and costs
                nothing visually — a `tertiary` control has no fill or border for
                the padding to reveal, and `min-w-11` still holds the 44px
                hit-area floor. `white-space` is deliberately left `normal`:
                `nowrap` would trade this soft wrap for hard horizontal overflow,
                the worse failure. From `sm` up the row is horizontal with room to
                spare, so the standard px-6 rhythm resumes there. */}
            <Button
              href={siteConfig.phoneHref}
              variant="tertiary"
              size="md"
              className="px-4 sm:px-6"
            >
              <FaPhoneAlt aria-hidden="true" className="h-4 w-4" />
              Call {siteConfig.phone}
            </Button>
          </div>
        </motion.div>
      </Container>
    </section>
  )
}
