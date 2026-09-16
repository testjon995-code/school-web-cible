/**
 * CIBLE School of Language — Frequently Asked Questions (FAQ) data.
 *
 * ESM data module (no JSX, constants only). It is the single source of truth
 * for FAQ content and is consumed by:
 *   - src/components/common/FAQ.jsx  (renders an accessible Accordion)
 *   - src/pages/Faq.jsx              (may group items by `category`)
 *   - src/lib/schema.js              (optional FAQPage JSON-LD structured data)
 *
 * Item shape — `{ id, question, answer, category, answerConfirmed }` — is defined
 * once, authoritatively, by the {@link FaqItem} typedef below. That typedef is
 * the ONLY contract downstream consumers get (this project has no type
 * compiler), so it is the single place the shape is described; nothing here
 * restates it. `question` and `answer` are required; the other three are
 * additively optional, and every consumer must behave correctly without them.
 *
 * NOTE — CLIENT-CONFIRMED CONTENT (AAP §0.7.2): The specific class timings,
 * batch options, fee amounts, payment options, trial/demo-class availability,
 * and certificate details below are REPRESENTATIVE and intentionally phrased in
 * general terms — they are NOT presented as final commitments. They must be
 * verified and finalized with CIBLE before launch. Answers deliberately avoid
 * asserting unconfirmed specifics as fact and instead direct users to call,
 * WhatsApp, or visit for the most current information. The free counseling
 * session is an intentional, standing admissions call-to-action (AAP §0.1.1).
 * Contact details (phone, email, exact street address) live ONLY in
 * src/data/siteConfig.js and are surfaced by components. To keep a single
 * source of truth (no duplicated location facts), the location-related answers
 * below derive the city and region from `siteConfig.addressParts` rather than
 * repeating them as literals, and defer the precise street address to the
 * Contact page / components.
 *
 * NOTE — THE TWO MACHINE-READABLE FIELDS (AAP §0.7.2 / §0.7.3 / §0.7.4). `id`
 * and `answerConfirmed` are addressing and verification metadata. Neither is
 * rendered, and neither changes a single word this module displays; they exist
 * so other modules can address, cross-reference and vouch for an individual
 * answer:
 *   - `id` is a PUBLIC CONTRACT from the moment it is authored (AAP §0.7.3): it
 *     is the `#faq-<id>` URL-fragment target, the value `courses[].faqIds`
 *     references, and the identifier the search index emits as `faq:<id>`. A
 *     rename silently breaks every inbound link, every course cross-reference
 *     and every shared search result, so each id is authored ONCE and never
 *     changed; retiring a question retires its id with it rather than recycling
 *     it for different content.
 *   - `answerConfirmed` is the per-record verification gate for FAQPage JSON-LD
 *     (AAP §0.7.4). Every record deliberately ships `false`, because NOTHING in
 *     this module has been verified by the institute yet — see the notice above
 *     — and `answerConfirmed` means institute-verified, not merely plausible.
 *     The gate is evaluated ALL-OR-NOTHING per emitted set: a single `false`
 *     anywhere in the set suppresses the whole block, because a partially
 *     marked-up FAQ page misrepresents which answers are authoritative. So the
 *     shipped, intended outcome is that NO FAQPage block is emitted anywhere.
 *     Structured data asserts to a machine that the marked-up content is
 *     accurate, so emitting it over content this file itself labels
 *     representative would be a policy violation, not a stylistic choice.
 *     Flipping one boolean literal to `true`, once CIBLE has verified that exact
 *     answer, is the ONLY edit required to open the gate for that record — no
 *     code change is involved.
 */

import { siteConfig } from './siteConfig.js'

// City and region derived from the single source of truth so location prose
// never duplicates (and cannot drift from) the address in siteConfig.
const { addressLocality, addressRegion } = siteConfig.addressParts
const cityRegion = `${addressLocality}, ${addressRegion}`

/**
 * A single frequently-asked question.
 *
 * `question` and `answer` are the rendered content contract. `category`, `id`
 * and `answerConfirmed` are additively OPTIONAL, so every consumer must behave
 * correctly when any of them is absent — that is what lets other surfaces adopt
 * this shape incrementally without a coordinated change here.
 *
 * @typedef {Object} FaqItem
 * @property {string} [id]     Stable, unique, lowercase kebab-case identifier
 *                             (letters, digits and hyphens only, so it needs no
 *                             URL escaping). PUBLIC CONTRACT — never rename an
 *                             id once authored. Three consumers depend on it:
 *                             (1) `src/pages/Faq.jsx` resolves the `#faq-<id>`
 *                                 URL fragment — the one canonical form — and
 *                                 passes the id through `ui/Accordion`'s
 *                                 `openIds` prop so the panel is open before
 *                                 anything is measured, then scrolls the
 *                                 matching trigger into view and focuses it;
 *                             (2) `courses[].faqIds` in `src/data/courses.js`
 *                                 references it to cross-link the questions
 *                                 relevant to a given course;
 *                             (3) `src/lib/search.js` `buildIndex()` emits a
 *                                 search record identified as `faq:<id>` whose
 *                                 href addresses that same `#faq-<id>` fragment.
 *                             When absent, consumers fall back to positional
 *                             identifiers: `src/components/common/FAQ.jsx` maps
 *                             the visible list to `items.map((f) => f.id ?? null)`
 *                             and `ui/Accordion` substitutes its generated
 *                             `useId`-plus-index form for that slot. That array
 *                             is therefore EQUAL-LENGTH with per-slot `null`
 *                             holes, and absent ids must never be filtered out —
 *                             doing so shifts every later id onto the wrong item.
 * @property {string} question REQUIRED. A real prospective-student / parent
 *                             question. Rendered as the disclosure trigger.
 * @property {string} answer   REQUIRED. A concise, warm, admissions-oriented
 *                             reply (1–3 sentences). Rendered as the panel body.
 * @property {('Admissions'|'Courses'|'Fees'|'General')} [category] Optional
 *                             grouping key, used purely for grouping / narrowing
 *                             in the FAQ page. Matched by EXACT string equality
 *                             in `src/components/common/FAQ.jsx`, so the four
 *                             literals above are the closed set.
 * @property {boolean} [answerConfirmed] Whether CIBLE has VERIFIED this exact
 *                             answer as final. Gates FAQPage JSON-LD only and
 *                             never affects rendering. Evaluated ALL-OR-NOTHING
 *                             per emitted set: a set qualifies only when EVERY
 *                             question in it is `true`. An ABSENT value is
 *                             treated as NOT confirmed — never as confirmed — so
 *                             the gate fails closed for any record or module
 *                             that has not explicitly opted in.
 */

/**
 * The canonical CIBLE FAQ set, in the order the FAQ page presents it.
 *
 * Order is load-bearing: `ui/Accordion` derives a positional identifier for any
 * slot without an `id`, so reordering or removing an entry changes the
 * identifiers of the entries after it. Every record carries an explicit
 * `answerConfirmed: false` — see the verification-gate note in the header.
 *
 * @type {FaqItem[]}
 */
export const faq = [
  {
    id: 'how-to-enroll',
    question: 'How do I enroll at CIBLE School of Language?',
    answer:
      'Getting started is easy — just fill out our online admission form, or call or WhatsApp us to book a free counseling session. Our friendly team will help you choose the right course and guide you through every step of enrollment.',
    category: 'Admissions',
    answerConfirmed: false,
  },
  {
    id: 'courses-offered',
    question: 'What courses does CIBLE offer?',
    answer:
      'We offer four core areas: Spoken English and communication, Science coaching for the PCM and PCB streams, Computer courses, and Career guidance. Whether you want to speak English confidently, ace your board exams, or build job-ready skills, there is a program designed for you.',
    category: 'Courses',
    answerConfirmed: false,
  },
  {
    id: 'free-counseling-session',
    question: 'Do you offer a free counseling session or a demo class?',
    answer:
      'Yes — we offer a free, no-obligation counseling session to help you choose the right course and plan your next steps. You are also welcome to ask about a trial or demo class for your chosen program. Call or WhatsApp us to book your free counseling session today.',
    category: 'Admissions',
    answerConfirmed: false,
  },
  {
    id: 'class-timings-and-batches',
    question: 'What are the class timings and batch options?',
    answer:
      'We aim to offer flexible batch options to suit students, working professionals, and parents. Exact batch timings vary by course and season, so please call, WhatsApp, or visit us to confirm the current schedule and reserve your seat.',
    category: 'General',
    answerConfirmed: false,
  },
  {
    id: 'fees-and-payment-options',
    question: 'How much do the courses cost, and what payment options are available?',
    answer:
      'Our fees are affordable and depend on the course and its duration. For the current fee structure, any ongoing offers, and available payment options, please contact us by phone or WhatsApp, or visit the institute — we will gladly walk you through the details.',
    category: 'Fees',
    answerConfirmed: false,
  },
  {
    id: 'location-and-directions',
    question: 'Where is CIBLE located and how do I reach the institute?',
    answer:
      `We are located in ${cityRegion}. You are always welcome to visit us in person — you can find our full street address and directions on the Contact page, or call or WhatsApp ahead and we will help you plan your visit and find us easily.`,
    category: 'General',
    answerConfirmed: false,
  },
  {
    id: 'suitable-for-beginners',
    question: 'Are your courses suitable for absolute beginners?',
    answer:
      'Absolutely. Our courses welcome every level, from complete beginners to advanced learners, and our teachers start with the fundamentals to build your confidence step by step. Book a free counseling session and we will suggest the perfect starting point for you.',
    category: 'Courses',
    answerConfirmed: false,
  },
  {
    id: 'age-groups-and-eligibility',
    question: 'Which age groups and students can join CIBLE?',
    answer:
      'We warmly welcome school students, college students, and working professionals alike. Book a free counseling session and we will recommend the right course and batch for your age, current level, and goals.',
    category: 'Courses',
    answerConfirmed: false,
  },
  {
    id: 'certificate-on-completion',
    question: 'Do you provide a certificate after completing a course?',
    answer:
      'Many of our courses include a certificate of completion that recognizes the skills and progress you achieve. Ask us for course-specific certificate details during your free counseling session.',
    category: 'Courses',
    answerConfirmed: false,
  },
  {
    id: 'contact-and-visit',
    question: 'How can I contact CIBLE or visit the institute?',
    answer:
      `You can reach us by phone or WhatsApp, or simply visit us in ${cityRegion}. Have a question or ready to begin? Call or WhatsApp us to book your free counseling session — we are always happy to help you take the first step toward a brighter future.`,
    category: 'General',
    answerConfirmed: false,
  },
]

export default faq
