/**
 * CIBLE School of Language — Trust & Transparency Content Blocks
 * --------------------------------------------------------------
 * Single source of truth for the "what you can rely on" copy shown by
 * `src/components/common/TrustSection.jsx`. That component composes
 * `SectionHeading`, `FeatureCard` and `RepresentativeNote` around these records
 * and renders the SAME block on four surfaces (AAP §0.9.1 / §0.10.2):
 *   - src/pages/Courses.jsx      the catalog, /courses
 *   - src/pages/CourseDetail.jsx every course detail route, /courses/:slug
 *   - src/pages/Admission.jsx    the admission page, /admission
 *   - src/pages/Dashboard.jsx    the My Learning dashboard, /dashboard
 *
 * Pure ESM data module: no React, no JSX and NO imports, so it stays
 * dependency-free and trivially serializable. It deliberately carries no
 * `icon` field — an icon would be a `react-icons` component reference inside a
 * content module, and glyph choice belongs to the consuming component
 * (`FeatureCard` renders `icon` as decorative, `aria-hidden` art) rather than
 * to the content (AAP §0.7.3).
 *
 * THE CONTENT BOUND — READ BEFORE EDITING (AAP §0.7.4):
 * Every position stated below is one this repository can already evidence, and
 * NO accreditation, affiliation, recognition, placement figure, pass or
 * completion figure, learner or alumni count, years-in-operation claim, award,
 * ranking, partnership, rating, review or testimonial may EVER be added here.
 * The trust story this file tells is deliberately about verifiable behavior —
 * what the institute actually teaches, how support and admission actually work,
 * how accessible the interface actually is, and what this website does and does
 * not do with your information. Each claim traces to an in-repo source:
 *   - the enquiry mechanism, tracking position and third-party processing →
 *     src/pages/PrivacyPolicy.jsx (`sections`)
 *   - the accessibility position and its measures → README.md "Accessibility &
 *     SEO" (note the verb: the site *targets* WCAG AA — never "is certified",
 *     "is compliant" or "meets"), plus Button.jsx's 44px floor, Layout.jsx's
 *     skip link and polite route announcer, and App.jsx's reduced-motion config
 *   - the four admission steps, verbatim and in order →
 *     src/pages/Admission.jsx (`admissionSteps`)
 *   - the catalog shape, the published support commitments and the
 *     representative-content caveat → src/data/courses.js
 *   - the free counseling session and "beginners welcome" → src/data/faq.js
 * A sentence that cannot be traced to one of those must be deleted, not
 * softened.
 *
 * NO CONTACT FACTS HERE, BY DESIGN: the phone number, WhatsApp link, email
 * address, street address and opening hours live ONLY in
 * src/data/siteConfig.js and are surfaced by components (Navbar, Footer,
 * Contact). This module names the CHANNELS and points at the pages that
 * publish them, exactly as src/data/faq.js documents for its own location
 * copy, so no contact fact is duplicated here and none can drift.
 *
 * REPRESENTATIVE-CONTENT CAVEATS: `TrustSection` also renders
 * `RepresentativeNote` under its default `gate="content"` behavior, which
 * disappears once `siteConfig.representativeContent` flips to false. The
 * caveats written into the copy below are therefore phrased as statements about
 * the current state of the content ("representative until the institute
 * confirms them") that read sensibly on their own, never as a substitute for
 * that note.
 *
 * CONTRACT NOTES: section `id` values are STABLE — consumers may key render
 * order, anchors or tests on them, so add records rather than renaming ids.
 * `title` strings are short, heading-safe and carry no markup or trailing
 * punctuation, because `TrustSection` renders them through a `headingAs` prop
 * at either `h2` or `h3` depending on the surface. `items` is ALWAYS an array
 * and MAY be empty when `body` already says everything needed.
 *
 * @typedef {Object} TrustSection
 * @property {string} id       Stable kebab-case identifier; also the render-order key.
 * @property {string} title    Short heading-safe label, rendered as an h2 or h3.
 * @property {string} body     One or two sentences of plain, second-person prose.
 * @property {string[]} items  Supporting points; may be empty.
 */

/** @type {TrustSection[]} */
export const trustSections = [
  {
    id: 'what-learners-can-expect',
    title: 'What You Can Expect',
    body: 'CIBLE teaches four subject areas across ten courses, and every one of them starts from the fundamentals, so a complete beginner is as welcome here as an advanced learner. The durations, highlights and curriculum details shown on this site are representative while the institute confirms the final versions.',
    items: [
      'Spoken English and communication, Science coaching for the PCM and PCB streams, Computer courses, and Career guidance',
      'Ten courses, each with its own summary, duration and set of highlights',
      'Teaching that begins with the fundamentals, so absolute beginners are welcome',
      'A free, no-obligation counseling session to help you decide where to start',
      'Durations, highlights and curriculum details stay representative until the institute confirms them',
    ],
  },
  {
    id: 'learning-support',
    title: 'How You Are Supported',
    body: 'Each course page lists the support that particular course describes — the tests, the doubt-clearing and the feedback you can expect — rather than one promise stretched across all of them. Before you commit to anything, a free counseling session is there to help you choose.',
    items: [
      'Regular tests and doubt-clearing sessions on the PCM coaching track',
      'Weekly tests and performance tracking on the PCB coaching track',
      'One-on-one mock interviews with feedback in Interview Preparation',
      'Mentorship and follow-up sessions in Career Guidance',
      'Counselors who help you pick a course based on your goals and your current level',
    ],
  },
  {
    id: 'course-structure',
    title: 'How Courses Are Structured',
    body: 'Every course states a duration and the highlights it covers, and each one has a page of its own so you can read the detail before you enquire. The catalog narrows by category, level, duration, goal and prerequisite, so you see the courses that fit you rather than all ten at once.',
    items: [
      'A stated duration and a set of highlights on every course',
      'A page per course, carrying the detail the institute has confirmed so far',
      'Filters for category, level, duration, goal and prerequisite, with a live count of what matches',
      'Save a course to come back to it, or compare two or three side by side before you decide',
      'Durations and highlights stay representative until the institute confirms the final schedule',
    ],
  },
  {
    id: 'accessibility',
    title: 'Accessibility',
    body: 'This site targets WCAG AA, and the measures below are built into the interface itself rather than promised for a later release. They apply on every page, including the forms and the course pages.',
    items: [
      'Semantic landmarks — header, nav, main and footer — on every page',
      'A skip link that jumps straight to the main content',
      'Full keyboard operability, with a visible focus ring on every control',
      'A logical heading hierarchy, with a single h1 per page',
      'Descriptive alternative text on images',
      'AA-contrast color pairings throughout',
      'A minimum 44-pixel touch target on every control',
      'Motion cut back to a minimum whenever your device asks for reduced motion',
      'Page changes announced politely to screen readers',
    ],
  },
  {
    id: 'contact-and-support',
    title: 'Talking to a Person',
    body: 'You can reach the institute by phone, on WhatsApp, by email, or by visiting in person — whichever suits you. The number, the WhatsApp link, the email address, the directions and the opening hours are published in the site header, in the footer and on the Contact page, so you never have to hunt for them.',
    items: [
      'Call or WhatsApp to register your interest, or just to ask a question',
      'Email if you would rather write at length',
      'Visit in person — the Contact page carries the full address, a map and directions',
      'Opening hours are published in the footer and on the Contact page, and stay representative until the institute confirms them',
    ],
  },
  {
    id: 'privacy',
    title: 'Privacy and Your Information',
    body: 'CIBLE runs no analytics, no advertising and no tracking pixels, sets no cookies that identify you, builds no visitor profile and keeps no server-side log of your browsing. There is no CIBLE server behind this site at all: an enquiry form opens a pre-filled WhatsApp chat or email draft on your own device, and nothing is sent unless you press send.',
    items: [
      'No analytics, no advertising, no tracking pixels and no cookies that identify you',
      'No backend server and no database, so nothing you type into a form is stored by CIBLE',
      'Once you press send, your message is handled by WhatsApp and Meta, or by your email provider, under their own policies',
      'Loading the web font this site uses, and the map on the Contact page, sends standard technical request data such as your IP address to Google — that is inherent to how web fonts and embedded maps work',
      'Courses you save are kept on your own device, in the local storage of your own browser, under a single key named cible:saved-courses:v1',
      'That key holds course identifiers and nothing else — no name, no contact detail, no message text and no timestamp — it is never transmitted anywhere, and you can clear it from the My Learning page or by clearing the site data in your browser',
      'The Privacy Policy page sets all of this out in full, including how to correct or remove a message you have already sent',
    ],
  },
  {
    id: 'admission-process',
    title: 'How Admission Works',
    body: 'Admission runs in the four steps below, and it begins with an enquiry you can send from the admission form, on WhatsApp, or by phone. These steps describe the process the institute follows today and are still being confirmed with the institute before launch.',
    items: [
      'Submit Enquiry — fill the admission form or reach us on WhatsApp or call to register your interest',
      'Free Counseling — our counselors help you choose the right course based on your goals and current level',
      'Confirm Enrolment — complete a simple registration and choose a batch timing that suits you',
      'Start Learning — begin your classes at CIBLE and start building confidence from day one',
    ],
  },
]

export default trustSections
