/**
 * CIBLE School of Language — Course Catalog
 *
 * Single source of truth for the institute's course offerings. Consumed by the
 * `CourseCard` / `CourseGrid` components, the `Courses` page (category filtering),
 * and the category landing pages (`SpokenEnglish`, `ScienceCoaching`,
 * `ComputerCourses`).
 *
 * Each `category` is one of: 'English' | 'Science' | 'Computer' | 'Career', so
 * pages can filter reliably (e.g. `courses.filter(c => c.category === 'Science')`).
 *
 * NOTE: Durations, highlights, and curriculum details below are representative,
 * production-quality placeholders and MUST be confirmed with the institute before
 * launch (see AAP §0.7.2). Titles, slugs, and categories are canonical and MUST NOT
 * be changed — page routing and filtering depend on them.
 *
 * ── TWELVE OPTIONAL MACHINE-READABLE FIELDS (AAP §0.7.2) ───────────────────
 * The original record carried no level, no learner goal and no prerequisite, and
 * `duration` is free text with no comparable value — so course filtering, course
 * comparison, the per-course detail structure and goal-based recommendation were
 * not expressible against it. Twelve fields were therefore added: `level`,
 * `durationWeeks`, `goals`, `prerequisites`, `prereqTags`, `eligibility`,
 * `valueProposition`, `outcomes`, `curriculum`, `idealFor`, `notIdealFor` and
 * `faqIds`.
 *
 * EVERY ONE OF THE TWELVE IS OPTIONAL, and that is the contract that keeps the
 * eight existing importers correct: absence means "do not render that block" and
 * "does not match that filter", never "matches everything". `CourseCard` already
 * established the convention (`course.duration ? … : null`,
 * `course.highlights?.slice(0, 3) ?? []`). Consumers must keep it:
 *   - `src/lib/courseFilters.js` — a record with no `level`, no `goals`, no
 *     `durationWeeks` band or no `prereqTags` matches NO selection in that
 *     dimension, so a partly populated record is never surfaced under a filter it
 *     cannot satisfy.
 *   - `src/lib/recommend.js` — a missing field scores ZERO rather than counting as
 *     a mismatch. A chosen goal is its one hard constraint, so a record without a
 *     `goals` array is simply not eligible for a goal-answered recommendation.
 *   - the course detail view — omits any block whose field is absent, heading
 *     included, rather than rendering an empty heading.
 *
 * ── CONTENT PROVENANCE — THREE CLASSES, DO NOT INVENT (AAP §0.7.2) ─────────
 * The placeholder notice above applies with full force to the new fields. No
 * eligibility criterion, prerequisite, outcome, curriculum module, suitability
 * statement or value proposition here is authored from imagination.
 *   CLASS 1 — DERIVABLE from content already in this repository, so populated:
 *     `durationWeeks` (converted from the authored `duration`), `goals` (mapped
 *     from each record's own summary/highlights), `valueProposition` (a shorter
 *     restatement of that record's own summary, asserting nothing the summary does
 *     not), `prereqTags` and `faqIds` (references into existing modules).
 *   CLASS 2 — CONTENT-OWNER INPUT REQUIRED, so populated only where the existing
 *     course description already supports the statement and OMITTED otherwise:
 *     `level`, `eligibility`, `prerequisites`, `outcomes`, `curriculum`,
 *     `idealFor`, `notIdealFor`. Six of those seven are omitted on all ten records
 *     today: the existing content is a summary plus four highlights, and the
 *     highlights are activities and teaching methods, not learning outcomes and
 *     not a `{title, items[]}` module list. A detail route that renders eight of
 *     its parts because six await content is honest; one that renders fourteen
 *     parts of invented curriculum is the misleading claim the brief prohibits. Do
 *     NOT reshape `highlights` into `outcomes` or group them into a `curriculum`.
 *   CLASS 3 — NEVER INVENTED under any circumstance: any figure, rate, fee,
 *     accreditation, affiliation, ranking, award, placement or completion claim.
 *     None is in this contract, and none is to be added to it.
 *
 * ── `durationWeeks` CONVERSION RULE — FIXED AND DETERMINISTIC ──────────────
 * A `duration` in days divides by 7 and rounds to the nearest whole week
 * ('45 Days' → 6); a `duration` in months multiplies by 4 ('2 Months' → 8,
 * '3 Months' → 12, '12 Months' → 48). Four weeks per month rather than 4.345 is
 * deliberate: the bands in `src/lib/courseFilters.js` are up-to-1-month (1–4
 * weeks), 1–3 months (5–12) and 3-months-plus (13+), so the arithmetic has to
 * agree with them exactly, and 4 puts '3 Months' at 12 — inside the 1–3 month
 * band — instead of 13, just outside it. A `duration` string this rule cannot
 * parse leaves `durationWeeks` ABSENT rather than 0; all ten parse today, so all
 * ten carry a value, and the field stays optional for that reason.
 * The authored `duration` string is NEVER edited: it remains exactly as written
 * and remains what the card displays.
 *
 * ── `level` IS POPULATED FOR EXACTLY ONE RECORD ────────────────────────────
 * Only Spoken English identifies a difficulty in its own copy ("This
 * beginner-friendly course"), so only it carries `level: 'Beginner'`. The other
 * nine say nothing about level, and inferring one from a subject or a duration
 * would be an invented pedagogical claim — an Advanced label on PCM/PCB is
 * exactly that. The consequences are intended, not defects: the level filter
 * offers only the values actually present, nine detail routes render no level
 * badge, and the recommender scores a missing level as zero. `'All levels'`
 * remains legal in the union below (the recommender credits it) even though no
 * record uses it yet.
 *
 * ── `prerequisites` IS PROSE; `prereqTags` IS THE MACHINE FIELD ────────────
 * They are deliberately two fields and must never be merged. `prerequisites` is
 * content-owner sentences for DISPLAY ONLY and is never matched or filtered — "a
 * working knowledge of basic arithmetic" is a sentence, not an identifier.
 * `prereqTags` holds the closed id set from `src/lib/courseFilters.js`
 * (`none` | `basic-english` | `basic-computer`) and is what the `?prereq=` filter
 * matches. `'none'` is an EXPLICIT value meaning "requires nothing prior" and is
 * never inferred from an absent or empty array: a record with no `prereqTags`
 * matches no prerequisite selection at all. Only the two records whose own copy
 * states an entry requirement carry it; `basic-english` and `basic-computer` are
 * never guessed from a subject.
 *
 * ── SERIALISABILITY (AAP §0.7.3) ───────────────────────────────────────────
 * `icon` is a `react-icons` component REFERENCE and MUST NOT reach
 * structured-data output. `courseSchema()` honours this by mapping only `title`,
 * `summary` and the provider, and `StructuredData` rejects functions before
 * serialising. Every one of the twelve new fields is therefore a plain string,
 * number, array of strings or array of plain objects — nothing else. This module
 * also imports nothing but its icons: the referential contracts to
 * `src/data/goals.js`, `src/data/faq.js` and `src/lib/courseFilters.js` are id
 * STRINGS, deliberately not imports, so the catalogue stays importable
 * everywhere without pulling in the lib layer.
 */

import {
  FaComments, FaLanguage, FaUserTie, FaMicrophone, FaUserCheck,
  FaAtom, FaMicroscope, FaDesktop, FaLaptopCode, FaCompass,
} from 'react-icons/fa'

/**
 * A single course record.
 *
 * The first seven properties are REQUIRED and predate this contract. The twelve
 * that follow are additively OPTIONAL — see the header for the provenance rule
 * that governs which are populated and why the rest are deliberately absent.
 *
 * @typedef {Object} Course
 * @property {string} slug         PUBLIC CONTRACT — the `/courses/:slug` route
 *                                 segment, the `?courses=` comparison id and the
 *                                 Home featured list's lookup key. NEVER RENAME:
 *                                 a renamed slug silently drops a tile from the
 *                                 home page and 404s a shared course URL.
 * @property {string} title        PUBLIC CONTRACT — the `/admission?course=<Title>`
 *                                 deep-link value, the admission form's `oneOfRule`
 *                                 allowlist entry and the `testimonials[].course`
 *                                 cross-reference, all matched by EXACT equality.
 *                                 NEVER RENAME.
 * @property {'English'|'Science'|'Computer'|'Career'} category  PUBLIC CONTRACT —
 *                                 the `?category=` filter literal, the three track
 *                                 pages' filter literal and the key into
 *                                 `CourseCard`'s route and image maps. NEVER RENAME.
 * @property {string} summary      Card copy, and the meta description fallback when
 *                                 `valueProposition` is absent.
 * @property {string} duration     Human-readable schedule copy, left exactly as
 *                                 authored and displayed verbatim. Compare against
 *                                 `durationWeeks`, never by parsing this string.
 * @property {string[]} highlights Card bullet list; `CourseCard` renders the first
 *                                 three. Activities and teaching methods — NOT
 *                                 outcomes and NOT a curriculum.
 * @property {import('react-icons').IconType} icon  A component reference, rendered
 *                                 and never called. MUST NOT REACH STRUCTURED DATA.
 * @property {'Beginner'|'Intermediate'|'Advanced'|'All levels'} [level] Difficulty,
 *                                 stated only where the institute's own copy states
 *                                 it. Absent on nine of ten records today; see the
 *                                 header. An absent level matches no level filter
 *                                 and scores zero in the recommender.
 * @property {number} [durationWeeks] Machine-comparable duration in whole weeks,
 *                                 used for duration sorting and band filtering.
 *                                 Derived from `duration` by the fixed rule in the
 *                                 header; absent when that rule cannot parse it.
 * @property {string[]} [goals]    Goal ids from `src/data/goals.js`. The most
 *                                 load-bearing of the twelve: a chosen goal is the
 *                                 recommender's one hard constraint, so a record
 *                                 without this array is not eligible for any
 *                                 goal-answered recommendation. Listed
 *                                 primary-goal-first for display; matching is by
 *                                 membership, so order carries no contract.
 * @property {string[]} [prerequisites] FREE-TEXT PROSE FOR DISPLAY ONLY. NEVER
 *                                 MATCHED OR FILTERED — use `prereqTags` for that.
 *                                 Content-owner input; absent on all ten today.
 * @property {string[]} [prereqTags] Machine ids from `src/lib/courseFilters.js`
 *                                 (`none` | `basic-english` | `basic-computer`) —
 *                                 the `?prereq=` filter values. ABSENT OR `[]`
 *                                 MATCHES NO SELECTION, and `'none'` is an EXPLICIT
 *                                 value meaning "requires nothing prior" that is
 *                                 never inferred from an empty array.
 * @property {string} [eligibility] Who may enrol, in the institute's own terms.
 *                                 Content-owner input; absent on all ten today.
 * @property {string} [valueProposition] One short sentence. The course detail
 *                                 route's meta description is
 *                                 `valueProposition ?? summary`, so a record
 *                                 without one still emits a description — that is
 *                                 the single rule, and no consumer restates it.
 *                                 Asserts nothing its own `summary` does not.
 * @property {string[]} [outcomes] What the learner will be able to do. Content-owner
 *                                 input; absent on all ten today. Do NOT synthesise
 *                                 these from `highlights`, which are activities.
 * @property {{title: string, items: string[]}[]} [curriculum] Ordered modules, each
 *                                 with its own item list. Content-owner input;
 *                                 absent on all ten today. No structured curriculum
 *                                 exists anywhere in this repository yet.
 * @property {string[]} [idealFor] Who the course suits. Content-owner input; absent
 *                                 on all ten today.
 * @property {string[]} [notIdealFor] Who the course may NOT suit. Content-owner
 *                                 input; absent on all ten today. This field exists
 *                                 precisely so a description can be honest about who
 *                                 it does not serve — the opposite of a marketing
 *                                 claim — so populate it freely once real content
 *                                 arrives.
 * @property {string[]} [faqIds]   Ids into `src/data/faq.js`, listed in that
 *                                 module's declaration order so rendering order is
 *                                 stable. A referential contract validated at the
 *                                 point of use: an unresolvable id is skipped rather
 *                                 than rendered as an empty block.
 */

/**
 * The CIBLE course catalog, in the order the site presents it.
 *
 * Exactly ten records: `src/data/stats.js` states "Courses Offered" as 10 to match
 * this length, and Home's featured list selects six of these slugs by name — so
 * adding, removing or reordering a record has consequences beyond this file.
 * Both the named and the default export are consumed (`CourseGrid` imports the
 * default; the seven other importers use the named export), so both must survive.
 *
 * @type {Course[]}
 */
export const courses = [
  {
    slug: 'spoken-english',
    title: 'Spoken English',
    category: 'English',
    summary:
      'Speak English with confidence in everyday situations. This beginner-friendly course builds real fluency, clear pronunciation, and the self-assurance to hold conversations at work, in college, and beyond.',
    duration: '3 Months',
    highlights: [
      'Daily guided conversation practice',
      'Pronunciation and accent training',
      'Grammar essentials made simple',
      'Confidence-building speaking activities',
    ],
    icon: FaComments,
    // The ONLY record with a `level`: its own summary says "beginner-friendly".
    level: 'Beginner',
    durationWeeks: 12, // '3 Months' × 4
    goals: ['improve-spoken-english', 'communication-skills'],
    // Explicit 'none' — the summary states the course is beginner-friendly.
    prereqTags: ['none'],
    valueProposition:
      'A beginner-friendly start to speaking English with confidence in everyday conversations at work, in college, and beyond.',
    faqIds: [
      'how-to-enroll',
      'class-timings-and-batches',
      'fees-and-payment-options',
      'suitable-for-beginners',
      'age-groups-and-eligibility',
      'certificate-on-completion',
    ],
  },
  {
    slug: 'english-communication',
    title: 'English Communication',
    category: 'English',
    summary:
      'Master professional communication for the modern workplace. Sharpen your written and spoken English — from crafting clear emails to delivering confident presentations that get you noticed.',
    duration: '3 Months',
    highlights: [
      'Business writing and email etiquette',
      'Presentation and meeting skills',
      'Active listening and comprehension',
      'Vocabulary for professional settings',
    ],
    icon: FaLanguage,
    durationWeeks: 12, // '3 Months' × 4
    goals: ['communication-skills', 'career-development'],
    valueProposition:
      'Sharpen written and spoken English for the modern workplace, from clear emails to confident presentations.',
    faqIds: [
      'how-to-enroll',
      'class-timings-and-batches',
      'fees-and-payment-options',
      'certificate-on-completion',
    ],
  },
  {
    slug: 'personality-development',
    title: 'Personality Development',
    category: 'English',
    summary:
      'Grow into the confident, well-rounded person that colleges and employers remember. Develop the soft skills, body language, and etiquette that make a lasting first impression.',
    duration: '2 Months',
    highlights: [
      'Body language and positive posture',
      'Self-confidence and self-esteem building',
      'Social and professional etiquette',
      'Goal-setting and time management',
    ],
    icon: FaUserTie,
    durationWeeks: 8, // '2 Months' × 4
    goals: ['communication-skills', 'career-development'],
    valueProposition:
      'Build the soft skills, body language, and etiquette that make a lasting first impression on colleges and employers.',
    faqIds: [
      'how-to-enroll',
      'class-timings-and-batches',
      'fees-and-payment-options',
      'age-groups-and-eligibility',
      'certificate-on-completion',
    ],
  },
  {
    slug: 'public-speaking',
    title: 'Public Speaking',
    category: 'English',
    summary:
      'Command any stage with clarity and poise. Learn to structure powerful speeches, overcome stage fear, and shine in debates, anchoring, and group discussions.',
    duration: '45 Days',
    highlights: [
      'Stage-fear management techniques',
      'Speech structuring and storytelling',
      'Debate, anchoring, and impromptu speaking',
      'Voice modulation and delivery',
    ],
    icon: FaMicrophone,
    durationWeeks: 6, // '45 Days' ÷ 7, rounded
    goals: ['communication-skills', 'improve-spoken-english'],
    valueProposition:
      'Overcome stage fear and speak with clarity and poise in speeches, debates, anchoring, and group discussions.',
    faqIds: [
      'how-to-enroll',
      'class-timings-and-batches',
      'fees-and-payment-options',
      'certificate-on-completion',
    ],
  },
  {
    slug: 'interview-preparation',
    title: 'Interview Preparation',
    category: 'English',
    summary:
      'Walk into any interview ready to win the offer. Practice realistic HR and technical rounds, polish your resume, and master group discussions through personalized mock sessions.',
    duration: '45 Days',
    highlights: [
      'One-on-one mock interviews with feedback',
      'HR and technical round preparation',
      'Resume building and profile tips',
      'Group discussion strategies',
    ],
    icon: FaUserCheck,
    durationWeeks: 6, // '45 Days' ÷ 7, rounded
    goals: ['interview-preparation', 'career-development'],
    valueProposition:
      'Practice realistic HR and technical rounds, polish your resume, and walk into your next interview ready.',
    faqIds: [
      'how-to-enroll',
      'class-timings-and-batches',
      'fees-and-payment-options',
      'certificate-on-completion',
    ],
  },
  {
    slug: 'pcm-coaching',
    title: 'PCM Coaching',
    category: 'Science',
    summary:
      'Build a rock-solid foundation in Physics, Chemistry, and Mathematics for Class 11 and 12. Concept-first teaching and regular practice prepare you for board exams and competitive tests like JEE.',
    duration: '12 Months',
    highlights: [
      'Concept-focused Physics, Chemistry, and Maths',
      'Class 11 and 12 board syllabus coverage',
      'Competitive-exam (JEE) foundation',
      'Regular tests and doubt-clearing sessions',
    ],
    icon: FaAtom,
    durationWeeks: 48, // '12 Months' × 4
    goals: ['academic-support'],
    valueProposition:
      'Concept-first Physics, Chemistry, and Mathematics coaching for Class 11 and 12, board exams, and JEE preparation.',
    faqIds: [
      'how-to-enroll',
      'class-timings-and-batches',
      'fees-and-payment-options',
      'certificate-on-completion',
    ],
  },
  {
    slug: 'pcb-coaching',
    title: 'PCB Coaching',
    category: 'Science',
    summary:
      'Pursue your medical dream with structured Physics, Chemistry, and Biology coaching for Class 11 and 12. Strengthen core concepts and exam temperament for board exams and NEET.',
    duration: '12 Months',
    highlights: [
      'In-depth Physics, Chemistry, and Biology',
      'Class 11 and 12 board syllabus coverage',
      'NEET foundation and practice',
      'Weekly tests and performance tracking',
    ],
    icon: FaMicroscope,
    durationWeeks: 48, // '12 Months' × 4
    goals: ['academic-support'],
    valueProposition:
      'Structured Physics, Chemistry, and Biology coaching for Class 11 and 12, board exams, and NEET preparation.',
    faqIds: [
      'how-to-enroll',
      'class-timings-and-batches',
      'fees-and-payment-options',
      'certificate-on-completion',
    ],
  },
  {
    slug: 'basic-computer',
    title: 'Basic Computer',
    category: 'Computer',
    summary:
      'Get comfortable with computers from day one. Learn essential MS Office skills, typing, and internet basics that power everyday work, study, and job readiness.',
    duration: '3 Months',
    highlights: [
      'Computer fundamentals and operating systems',
      'MS Word, Excel, and PowerPoint',
      'Typing speed and accuracy practice',
      'Internet, email, and online safety basics',
    ],
    icon: FaDesktop,
    durationWeeks: 12, // '3 Months' × 4
    goals: ['computer-skills'],
    // Explicit 'none' — the summary starts learners "from day one" on "basics".
    prereqTags: ['none'],
    valueProposition:
      'Start from day one with the essential MS Office, typing, and internet skills that everyday work and study need.',
    faqIds: [
      'how-to-enroll',
      'class-timings-and-batches',
      'fees-and-payment-options',
      'suitable-for-beginners',
      'age-groups-and-eligibility',
      'certificate-on-completion',
    ],
  },
  {
    slug: 'digital-literacy',
    title: 'Digital Literacy',
    category: 'Computer',
    summary:
      'Thrive in a digital-first world with practical, up-to-date skills. Learn safe online habits, digital payments, everyday productivity tools, and a smart introduction to AI.',
    duration: '2 Months',
    highlights: [
      'Online safety and privacy essentials',
      'Digital payments and e-governance services',
      'Productivity and cloud tools',
      'Introduction to everyday AI tools',
    ],
    icon: FaLaptopCode,
    durationWeeks: 8, // '2 Months' × 4
    goals: ['computer-skills'],
    valueProposition:
      'Practical skills for a digital-first world: safe online habits, digital payments, productivity tools, and everyday AI.',
    faqIds: [
      'how-to-enroll',
      'class-timings-and-batches',
      'fees-and-payment-options',
      'certificate-on-completion',
    ],
  },
  {
    slug: 'career-guidance',
    title: 'Career Guidance',
    category: 'Career',
    summary:
      'Discover the right path with expert, one-on-one career counseling. Assess your aptitude, choose the ideal stream, and build a clear, achievable roadmap toward your goals.',
    duration: '45 Days',
    highlights: [
      'Aptitude and interest assessment',
      'Stream and career selection guidance',
      'Personalized goal roadmap',
      'Mentorship and follow-up sessions',
    ],
    icon: FaCompass,
    durationWeeks: 6, // '45 Days' ÷ 7, rounded
    goals: ['career-development'],
    valueProposition:
      'One-on-one counseling to assess your aptitude, choose the ideal stream, and build a clear roadmap to your goals.',
    faqIds: [
      'how-to-enroll',
      'class-timings-and-batches',
      'fees-and-payment-options',
      'age-groups-and-eligibility',
      'certificate-on-completion',
    ],
  },
]

export default courses
