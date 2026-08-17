import Card from '../ui/Card.jsx'
import { cn } from '../../lib/cn.js'
import { FaStar, FaRegStar, FaQuoteLeft } from 'react-icons/fa'

/**
 * ReviewCard
 *
 * The single canonical testimonial / social-proof card for the CIBLE School of
 * Language SPA. It renders one student/parent review — a five-star rating, the
 * quote, and an author block (name + role/course) with an initials-avatar fallback
 * — by composing the shared <Card> surface. Reuse it everywhere a review is shown
 * (the Home student-success band, the <TestimonialSlider> carousel and the Success
 * Stories page); never fork a second review card.
 *
 * CAROUSEL-SAFE: this card is rendered inside a swiper carousel, so it
 * deliberately uses NO framer-motion and NO layout-shifting hover transform
 * (e.g. `hover:-translate-y`), which can jitter a slide mid-transition. The only
 * hover affordance is <Card>'s own soft `hover:shadow-md`, which deepens the
 * shadow without moving the element.
 *
 * Semantics (WCAG AA): rendered as a <figure> (via Card's polymorphic `as`
 * prop) containing a <blockquote> for the quote and a <figcaption> for the
 * author — the standard, accessible testimonial structure. The rating is exposed
 * to assistive technology as a single labelled image (`role="img"` +
 * `aria-label="Rated N out of 5"`) while the individual star glyphs are
 * `aria-hidden`; the filled/outline star SHAPES (not color alone) also convey the
 * score, so color is never the sole indicator of meaning.
 *
 * Styling is 100% token-driven (Tailwind v4 `@theme` tokens from src/index.css) with
 * zero hardcoded values, using the same brand steps the sibling primitives use for a
 * light surface. The base surface is inherited from <Card>; this component only adds
 * the vertical flex layout. Any other props (`id`, `data-*`, `aria-*`, …) are
 * forwarded to that Card root.
 *
 * @param {object} props
 * @param {{ name: string, role?: string, course?: string, rating: number,
 *   quote: string, image?: string|null }} props.review One testimonial record
 *   (shape per src/data/testimonials.js). `rating` is expected to be 1–5, as every
 *   record in that module is. A null/absent `image` renders the initials-avatar
 *   fallback; a truthy URL renders an <img>.
 * @param {string} [props.className] Extra classes merged LAST onto the Card root.
 * @returns {import('react').ReactElement|null} The review card, or `null` when no
 *   `review` is supplied.
 */

// First letters of up to the first two whitespace-separated words of `name`,
// uppercased ("Priya Kumari" → "PK", "Rahul" → "R"). An empty or missing name
// yields an empty string rather than throwing.
function getInitials(name) {
  if (!name) return ''
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase()
}

export default function ReviewCard({ review, className, ...props }) {
  if (!review) return null

  // `rating` is a 1–5 value in the data. A non-number degrades to 0 so the label reads
  // "0 out of 5" and all five stars render outlined, instead of surfacing "NaN" or
  // "undefined"; the value itself is NOT clamped, so a record outside 1–5 is announced
  // as supplied and simply renders every star filled once the rounded value reaches 5.
  const rating = typeof review.rating === 'number' ? review.rating : 0
  const rounded = Math.round(rating)

  // Always exactly five stars: the first `rounded` filled, the remainder outlined.
  // Each glyph is decorative — the score is announced once by the wrapping
  // `role="img"` label below.
  const stars = Array.from({ length: 5 }, (_, i) =>
    i < rounded ? (
      <FaStar key={i} className="text-secondary-500" aria-hidden="true" />
    ) : (
      <FaRegStar key={i} className="text-secondary-500/30" aria-hidden="true" />
    ),
  )

  return (
    <Card as="figure" className={cn('flex h-full flex-col gap-4', className)} {...props}>
      <FaQuoteLeft className="h-6 w-6 text-primary-600/30" aria-hidden="true" />

      <div
        className="flex items-center gap-1"
        role="img"
        aria-label={`Rated ${rating} out of 5`}
      >
        {stars}
      </div>

      {/* `flex-1` here, with the bottom margin on the author block below, is what lets
          short and long quotes share a row height in the carousel so their author
          blocks align. */}
      <blockquote className="flex-1 text-sm leading-relaxed text-foreground">
        &ldquo;{review.quote}&rdquo;
      </blockquote>

      <figcaption className="mt-auto flex items-center gap-3 pt-2">
        {review.image ? (
          <img
            src={review.image}
            alt={review.name}
            width={48}
            height={48}
            loading="lazy"
            decoding="async"
            className="h-12 w-12 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-600 text-sm font-semibold text-white"
            role="img"
            aria-label={review.name}
          >
            {getInitials(review.name)}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{review.name}</p>
          <p className="text-xs text-muted">{review.role || review.course}</p>
        </div>
      </figcaption>
    </Card>
  )
}
