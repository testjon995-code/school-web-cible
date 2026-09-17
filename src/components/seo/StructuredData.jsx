import { Helmet } from 'react-helmet-async'
import {
  organizationSchema,
  localBusinessSchema,
  courseSchema,
  breadcrumbSchema,
  eventSchema,
  faqPageSchema,
} from '../../lib/schema.js'

/**
 * True for a JSON-LD-shaped value: a plain object (literal / null-prototype) or
 * an array. Rejects primitives, null, functions and class instances, so we
 * never attempt to embed something unexpected as structured data.
 * @param {unknown} value Candidate schema block.
 * @returns {boolean} Whether the value is safe to serialize as JSON-LD.
 */
function isSerializableSchema(value) {
  if (Array.isArray(value)) return true
  if (typeof value !== 'object' || value === null) return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

/**
 * Safely serialize a JSON-LD block for embedding in an inline
 * `<script type="application/ld+json">` (M08 / CWE-79).
 *
 * `react-helmet-async` renders script children into the DOM via inner HTML, so
 * a raw `JSON.stringify` is a script-injection sink: a string value containing
 * `</script>` (or the JS-illegal line separators U+2028 / U+2029) could break
 * out of the script element. This escapes every character that could do so —
 * `<` → `\u003c`, `>` → `\u003e`, `&` → `\u0026`, U+2028 → `\u2028`,
 * U+2029 → `\u2029`. These characters only ever occur inside JSON string
 * VALUES (never in JSON structure), so each escape stays a valid JSON string
 * escape and a consumer's `JSON.parse` decodes it back to the original text —
 * the structured data is unchanged, only made injection-safe.
 *
 * Returns `null` (so the caller OMITS the block) when the value is not a plain
 * object/array or when `JSON.stringify` throws (circular references, BigInt, a
 * throwing `toJSON`) — a bad block is dropped rather than emitting broken or
 * unsafe markup.
 *
 * @param {unknown} block A single JSON-LD schema object (or array).
 * @returns {string|null} The escaped JSON string, or null to skip the block.
 */
function serializeJsonLd(block) {
  if (!isSerializableSchema(block)) return null
  let json
  try {
    json = JSON.stringify(block)
  } catch {
    return null
  }
  if (typeof json !== 'string') return null
  return json
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

/**
 * StructuredData — per-page JSON-LD emitter for the CIBLE School of Language SPA
 * (AAP §0.6.1 Group 10). It assembles the requested schema blocks and injects
 * each as an inline `<script type="application/ld+json">` through
 * `react-helmet-async`, giving search engines Organization / LocalBusiness /
 * Course / Breadcrumb structured data plus any page-supplied schema.
 *
 * Blocks are built from the canonical builders in `src/lib/schema.js` (never
 * hand-rolled here) and every block is serialized through {@link serializeJsonLd},
 * which validates it is a plain object/array and escapes it against script
 * breakout (M08). Any block that fails validation or serialization is silently
 * dropped; when nothing serializable remains the component renders `null`.
 *
 * Two invariants govern the builders, and both are deliberate rather than
 * oversights. First, a builder may return `null` — `courseSchema`,
 * `eventSchema` and `faqPageSchema` each do so when a record cannot support a
 * complete, truthful block — and the existing `.filter(Boolean)` below is what
 * drops it, so no per-prop null check or extra validation branch belongs here.
 * Second, the per-record verification gate (`event.scheduleConfirmed`, and
 * every question's `answerConfirmed`) is evaluated by the CALLING PAGE, never
 * by this component and never inside the builders, which stay pure. Keeping
 * this emitter content-agnostic is precisely what lets a record become
 * eligible for rich markup by flipping one boolean, with no code change here.
 *
 * @param {object} props
 * @param {object|object[]} [props.schema] Extra schema object(s) to include.
 * @param {object|object[]} [props.data] Alias for `schema` (whichever is set).
 * @param {boolean} [props.organization=false] Include the Organization schema.
 * @param {boolean} [props.localBusiness=false] Include the LocalBusiness schema.
 * @param {object} [props.course] A course object → Course schema.
 * @param {Array<{name: string, path?: string, url?: string}>} [props.breadcrumbs]
 *   Breadcrumb trail → BreadcrumbList schema.
 * @param {object} [props.event] An `events[]` record → Event schema.
 * @param {Array<{question: string, answer: string, [key: string]: unknown}>} [props.faq]
 *   Question/answer records → FAQPage schema.
 * @returns {import('react').ReactElement|null} Helmet-injected JSON-LD scripts, or null.
 */
function StructuredData({
  schema,
  data,
  organization = false,
  localBusiness = false,
  course,
  breadcrumbs,
  event,
  faq,
}) {
  const blocks = []

  if (organization) blocks.push(organizationSchema())
  if (localBusiness) blocks.push(localBusinessSchema())
  if (course) blocks.push(courseSchema(course))
  if (breadcrumbs) blocks.push(breadcrumbSchema(breadcrumbs))
  if (event) blocks.push(eventSchema(event))
  if (faq) blocks.push(faqPageSchema(faq))

  const provided = schema || data
  if (Array.isArray(provided)) blocks.push(...provided)
  else if (provided) blocks.push(provided)

  // Validate + injection-safe serialize each block; drop anything unserializable.
  const serializedBlocks = blocks
    .filter(Boolean)
    .map((block) => serializeJsonLd(block))
    .filter(Boolean)

  if (serializedBlocks.length === 0) return null

  return (
    <Helmet>
      {serializedBlocks.map((json, index) => (
        <script key={index} type="application/ld+json">
          {json}
        </script>
      ))}
    </Helmet>
  )
}

export default StructuredData
