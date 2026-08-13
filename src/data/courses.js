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
 * REPRESENTATIVE CONTENT — CLIENT MUST CONFIRM (AAP §0.7.2): Durations, highlights,
 * curriculum details, and the discovery fields `level`, `eligibility`, `suitableFor`
 * and `prerequisites` below are representative, production-quality placeholders. Every
 * discovery value is GROUNDED in that same record's own summary/highlights copy, but
 * grounding is not transcription: some values restate that copy closely (Spoken
 * English's 'Beginner' level and "no prior fluency needed" both come straight from its
 * "beginner-friendly" summary), while others are reasonable, plan-authorized inferences
 * drawn from it rather than literal derivations ("Final-year students and graduates" for
 * Interview Preparation, the "Class 10 pass" entry condition implied by the PCM/PCB
 * "Class 11 and 12" summaries, and the several "Open to all learners" conditions). No
 * fee, certification, placement, success-rate or other statistic is asserted anywhere,
 * and every value — inferred or restated — MUST be confirmed with the institute before
 * launch. While `siteConfig.representativeContent` is true the UI carries the matching
 * site-wide disclosure, so these fields are never presented as verified fact.
 *
 * CANONICAL CONTRACT: Titles, slugs, and categories are canonical and MUST NOT be
 * changed — page routing and filtering depend on them. Specifically: `slug` keys the
 * illustration map in `CourseCard` and the featured-course lookup on `Home`; `title` is
 * the `?course=<title>` admission-prefill value, the "Course of Interest" select
 * allowlist in `AdmissionForm`, and the join key used by `src/data/testimonials.js`;
 * `category` drives the `CourseGrid` filter chips and the per-category CTA route.
 *
 * OPTIONAL FIELDS: `level`, `eligibility`, `suitableFor` and `prerequisites` are
 * OPTIONAL by contract, so every consumer keeps working against a record that lacks
 * them. When a field does not apply to a course its key is OMITTED entirely — never
 * left as an empty string, `null` or `[]`. Any consumer that surfaces one MUST read it
 * behind a truthiness guard, which is the pattern `CourseCard` already applies to
 * `duration` and `summary`, so an omitted key reserves no space instead of rendering an
 * empty row. `prerequisites` is present on 6 of the 10 records by design — that is what
 * keeps a conditional row genuinely conditional.
 * `level` is drawn from a fixed vocabulary so the value reads consistently across
 * cards: 'Beginner' | 'Beginner to Intermediate' | 'Intermediate' |
 * 'Intermediate to Advanced' | 'All levels'.
 *
 * SHAPE: { slug, title, category, level?, summary, duration, eligibility?, suitableFor?, prerequisites?, highlights, icon }
 */

import {
  FaComments, FaLanguage, FaUserTie, FaMicrophone, FaUserCheck,
  FaAtom, FaMicroscope, FaDesktop, FaLaptopCode, FaCompass,
} from 'react-icons/fa'

export const courses = [
  {
    slug: 'spoken-english',
    title: 'Spoken English',
    category: 'English',
    level: 'Beginner',
    summary:
      'Speak English with confidence in everyday situations. This beginner-friendly course builds real fluency, clear pronunciation, and the self-assurance to hold conversations at work, in college, and beyond.',
    duration: '3 Months',
    eligibility: 'Open to all learners; no prior fluency needed',
    suitableFor: 'Students and working professionals',
    highlights: [
      'Daily guided conversation practice',
      'Pronunciation and accent training',
      'Grammar essentials made simple',
      'Confidence-building speaking activities',
    ],
    icon: FaComments,
  },
  {
    slug: 'english-communication',
    title: 'English Communication',
    category: 'English',
    level: 'Intermediate',
    summary:
      'Master professional communication for the modern workplace. Sharpen your written and spoken English — from crafting clear emails to delivering confident presentations that get you noticed.',
    duration: '3 Months',
    eligibility: 'Basic English reading and writing',
    suitableFor: 'Working professionals and job seekers',
    prerequisites: 'Basic working knowledge of English',
    highlights: [
      'Business writing and email etiquette',
      'Presentation and meeting skills',
      'Active listening and comprehension',
      'Vocabulary for professional settings',
    ],
    icon: FaLanguage,
  },
  {
    slug: 'personality-development',
    title: 'Personality Development',
    category: 'English',
    level: 'All levels',
    summary:
      'Grow into the confident, well-rounded person that colleges and employers remember. Develop the soft skills, body language, and etiquette that make a lasting first impression.',
    duration: '2 Months',
    eligibility: 'Open to all learners',
    suitableFor: 'College students and early-career professionals',
    highlights: [
      'Body language and positive posture',
      'Self-confidence and self-esteem building',
      'Social and professional etiquette',
      'Goal-setting and time management',
    ],
    icon: FaUserTie,
  },
  {
    slug: 'public-speaking',
    title: 'Public Speaking',
    category: 'English',
    level: 'Beginner to Intermediate',
    summary:
      'Command any stage with clarity and poise. Learn to structure powerful speeches, overcome stage fear, and shine in debates, anchoring, and group discussions.',
    duration: '45 Days',
    eligibility: 'Open to all learners',
    suitableFor: 'Students preparing for debates and anchoring',
    prerequisites: 'Comfortable speaking basic English',
    highlights: [
      'Stage-fear management techniques',
      'Speech structuring and storytelling',
      'Debate, anchoring, and impromptu speaking',
      'Voice modulation and delivery',
    ],
    icon: FaMicrophone,
  },
  {
    slug: 'interview-preparation',
    title: 'Interview Preparation',
    category: 'English',
    level: 'Intermediate',
    summary:
      'Walk into any interview ready to win the offer. Practice realistic HR and technical rounds, polish your resume, and master group discussions through personalized mock sessions.',
    duration: '45 Days',
    eligibility: 'Final-year students and graduates',
    suitableFor: 'Job seekers preparing for interviews',
    prerequisites: 'Conversational English and a draft resume',
    highlights: [
      'One-on-one mock interviews with feedback',
      'HR and technical round preparation',
      'Resume building and profile tips',
      'Group discussion strategies',
    ],
    icon: FaUserCheck,
  },
  {
    slug: 'pcm-coaching',
    title: 'PCM Coaching',
    category: 'Science',
    level: 'Intermediate to Advanced',
    summary:
      'Build a rock-solid foundation in Physics, Chemistry, and Mathematics for Class 11 and 12. Concept-first teaching and regular practice prepare you for board exams and competitive tests like JEE.',
    duration: '12 Months',
    eligibility: 'Class 10 pass; Class 11 or 12 science (PCM) students',
    suitableFor: 'Science students targeting boards and JEE',
    prerequisites: 'Class 10 Mathematics and Science fundamentals',
    highlights: [
      'Concept-focused Physics, Chemistry, and Maths',
      'Class 11 and 12 board syllabus coverage',
      'Competitive-exam (JEE) foundation',
      'Regular tests and doubt-clearing sessions',
    ],
    icon: FaAtom,
  },
  {
    slug: 'pcb-coaching',
    title: 'PCB Coaching',
    category: 'Science',
    level: 'Intermediate to Advanced',
    summary:
      'Pursue your medical dream with structured Physics, Chemistry, and Biology coaching for Class 11 and 12. Strengthen core concepts and exam temperament for board exams and NEET.',
    duration: '12 Months',
    eligibility: 'Class 10 pass; Class 11 or 12 science (PCB) students',
    suitableFor: 'Medical aspirants preparing for NEET',
    prerequisites: 'Class 10 Science fundamentals',
    highlights: [
      'In-depth Physics, Chemistry, and Biology',
      'Class 11 and 12 board syllabus coverage',
      'NEET foundation and practice',
      'Weekly tests and performance tracking',
    ],
    icon: FaMicroscope,
  },
  {
    slug: 'basic-computer',
    title: 'Basic Computer',
    category: 'Computer',
    level: 'Beginner',
    summary:
      'Get comfortable with computers from day one. Learn essential MS Office skills, typing, and internet basics that power everyday work, study, and job readiness.',
    duration: '3 Months',
    eligibility: 'Open to all learners; no prior computer use needed',
    suitableFor: 'First-time computer users and job seekers',
    highlights: [
      'Computer fundamentals and operating systems',
      'MS Word, Excel, and PowerPoint',
      'Typing speed and accuracy practice',
      'Internet, email, and online safety basics',
    ],
    icon: FaDesktop,
  },
  {
    slug: 'digital-literacy',
    title: 'Digital Literacy',
    category: 'Computer',
    level: 'Beginner to Intermediate',
    summary:
      'Thrive in a digital-first world with practical, up-to-date skills. Learn safe online habits, digital payments, everyday productivity tools, and a smart introduction to AI.',
    duration: '2 Months',
    eligibility: 'Open to all learners',
    suitableFor: 'Students, professionals and internet users',
    prerequisites: 'Basic comfort using a computer or phone',
    highlights: [
      'Online safety and privacy essentials',
      'Digital payments and e-governance services',
      'Productivity and cloud tools',
      'Introduction to everyday AI tools',
    ],
    icon: FaLaptopCode,
  },
  {
    slug: 'career-guidance',
    title: 'Career Guidance',
    category: 'Career',
    level: 'All levels',
    summary:
      'Discover the right path with expert, one-on-one career counseling. Assess your aptitude, choose the ideal stream, and build a clear, achievable roadmap toward your goals.',
    duration: '45 Days',
    eligibility: 'Open to all learners',
    suitableFor: 'Students choosing a stream or career path',
    highlights: [
      'Aptitude and interest assessment',
      'Stream and career selection guidance',
      'Personalized goal roadmap',
      'Mentorship and follow-up sessions',
    ],
    icon: FaCompass,
  },
]

export default courses
