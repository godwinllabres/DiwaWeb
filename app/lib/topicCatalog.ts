export interface TopicCard {
  tag: string;
  title: string;
  description: string;
  prompt: string;
}

interface TopicMeta extends TopicCard {
  group: "admissions" | "enrollment" | "academics" | "campus" | "support" | "institution";
  keywords: string[];
}

const TOPIC_CATALOG: Record<string, TopicMeta> = {
  about_cavsu: {
    tag: "about_cavsu",
    title: "What is CvSU?",
    description: "Overview, identity, and what the university offers",
    prompt: "What is CvSU?",
    group: "institution",
    keywords: ["about", "cvsu", "university", "school", "overview"],
  },
  academic_calendar: {
    tag: "academic_calendar",
    title: "What is the academic calendar?",
    description: "Important dates for the current school year",
    prompt: "What is the academic calendar?",
    group: "enrollment",
    keywords: ["calendar", "semester", "trimester", "school year", "important dates"],
  },
  admissions_exam: {
    tag: "admissions_exam",
    title: "Is there an admission exam?",
    description: "Entrance test details and related requirements",
    prompt: "Is there an admission exam?",
    group: "admissions",
    keywords: ["exam", "test", "entrance", "admission exam", "cet"],
  },
  admissions_requirements: {
    tag: "admissions_requirements",
    title: "What are the admission requirements?",
    description: "Documents, qualifications, and application basics",
    prompt: "What are the admission requirements?",
    group: "admissions",
    keywords: ["admission", "requirements", "apply", "application", "documents", "freshman", "transferee"],
  },
  campus_facilities: {
    tag: "campus_facilities",
    title: "What facilities are available on campus?",
    description: "Libraries, labs, classrooms, and student spaces",
    prompt: "What facilities are available on campus?",
    group: "campus",
    keywords: ["facilities", "campus", "laboratory", "lab", "rooms", "amenities"],
  },
  campus_location: {
    tag: "campus_location",
    title: "Where is the campus located?",
    description: "Main campus address and location details",
    prompt: "Where is the campus located?",
    group: "campus",
    keywords: ["where", "location", "address", "map", "campus", "located"],
  },
  campus_specific: {
    tag: "campus_specific",
    title: "Tell me about a specific CvSU campus",
    description: "Branch-specific details and campus options",
    prompt: "Tell me about a specific CvSU campus",
    group: "campus",
    keywords: ["campus", "branch", "satellite", "specific campus", "main campus"],
  },
  contact_info: {
    tag: "contact_info",
    title: "How can I contact CvSU?",
    description: "Phone, email, and official contact details",
    prompt: "How can I contact CvSU?",
    group: "support",
    keywords: ["contact", "phone", "email", "number", "call", "reach"],
  },
  courses_offered: {
    tag: "courses_offered",
    title: "What courses does CvSU offer?",
    description: "Degree programs, tracks, and study options",
    prompt: "What courses does CvSU offer?",
    group: "academics",
    keywords: ["courses", "programs", "degree", "offer", "available courses"],
  },
  enrollment_procedure: {
    tag: "enrollment_procedure",
    title: "How do I enroll?",
    description: "Step-by-step enrollment process",
    prompt: "How do I enroll?",
    group: "enrollment",
    keywords: ["enroll", "enrollment", "register", "registration", "procedure", "steps", "process"],
  },
  enrollment_schedule: {
    tag: "enrollment_schedule",
    title: "When is enrollment?",
    description: "Enrollment periods and schedule information",
    prompt: "When is enrollment?",
    group: "enrollment",
    keywords: ["when", "schedule", "enrollment", "registration", "deadline", "date"],
  },
  events: {
    tag: "events",
    title: "What events are happening on campus?",
    description: "Recent and upcoming university events",
    prompt: "What events are happening on campus?",
    group: "campus",
    keywords: ["event", "events", "activities", "program", "seminar"],
  },
  graduate_programs: {
    tag: "graduate_programs",
    title: "What graduate programs are available?",
    description: "Master's and advanced study options",
    prompt: "What graduate programs are available?",
    group: "academics",
    keywords: ["graduate", "master", "masters", "postgraduate", "advanced studies"],
  },
  greeting: {
    tag: "greeting",
    title: "Say hello",
    description: "Start a conversation with Sevi",
    prompt: "Hello",
    group: "support",
    keywords: ["hello", "hi", "greetings"],
  },
  goodbye: {
    tag: "goodbye",
    title: "End the chat",
    description: "Wrap up the conversation",
    prompt: "Goodbye",
    group: "support",
    keywords: ["bye", "goodbye", "see you"],
  },
  it_cs_courses: {
    tag: "it_cs_courses",
    title: "What IT and CS programs are available?",
    description: "Computing-related degree options",
    prompt: "What IT and CS programs are available?",
    group: "academics",
    keywords: ["it", "cs", "computer", "information technology", "computer science"],
  },
  library: {
    tag: "library",
    title: "How do I use the library?",
    description: "Library services, resources, and access",
    prompt: "How do I use the library?",
    group: "campus",
    keywords: ["library", "books", "borrowing", "resources", "study area"],
  },
  nlu_fallback: {
    tag: "nlu_fallback",
    title: "Try another question",
    description: "Fallback intent",
    prompt: "Try another question",
    group: "support",
    keywords: [],
  },
  registrar: {
    tag: "registrar",
    title: "How do I contact the registrar?",
    description: "Registrar office concerns and contact details",
    prompt: "How do I contact the registrar?",
    group: "support",
    keywords: ["registrar", "records", "transcript", "grades", "documents"],
  },
  scholarship: {
    tag: "scholarship",
    title: "What scholarships are available?",
    description: "Scholarship options and assistance programs",
    prompt: "What scholarships are available?",
    group: "admissions",
    keywords: ["scholarship", "financial aid", "grant", "allowance", "scholar"],
  },
  student_organizations: {
    tag: "student_organizations",
    title: "What student organizations can I join?",
    description: "Clubs, groups, and student involvement",
    prompt: "What student organizations can I join?",
    group: "campus",
    keywords: ["organization", "club", "student org", "association", "student life"],
  },
  thanks: {
    tag: "thanks",
    title: "Say thanks",
    description: "Send a quick thank-you",
    prompt: "Thanks",
    group: "support",
    keywords: ["thanks", "thank you", "salamat"],
  },
  tuition_fees: {
    tag: "tuition_fees",
    title: "How much is the tuition?",
    description: "Tuition, fees, and payment-related questions",
    prompt: "How much is the tuition?",
    group: "admissions",
    keywords: ["tuition", "fees", "cost", "payment", "how much"],
  },
  vision_mission: {
    tag: "vision_mission",
    title: "What is CvSU's vision and mission?",
    description: "The university's mission, vision, and direction",
    prompt: "What is CvSU's vision and mission?",
    group: "institution",
    keywords: ["vision", "mission", "values", "goals"],
  },
};

const HOME_TOPIC_TAGS = [
  "admissions_requirements",
  "enrollment_procedure",
  "courses_offered",
  "scholarship",
  "campus_location",
  "contact_info",
];

const GROUP_DEFAULTS: Record<TopicMeta["group"], string[]> = {
  admissions: ["admissions_requirements", "admissions_exam", "tuition_fees", "scholarship"],
  enrollment: ["enrollment_procedure", "enrollment_schedule", "academic_calendar", "registrar"],
  academics: ["courses_offered", "it_cs_courses", "graduate_programs", "academic_calendar"],
  campus: ["campus_location", "campus_facilities", "library", "student_organizations"],
  support: ["contact_info", "registrar", "campus_specific", "about_cavsu"],
  institution: ["about_cavsu", "vision_mission", "campus_specific", "contact_info"],
};

const FALLBACK_EXCLUDE = new Set(["greeting", "goodbye", "thanks", "nlu_fallback"]);

function toTitle(tag: string) {
  return tag
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getAvailableTags(availableTags: string[]) {
  return new Set(availableTags.filter(Boolean));
}

function filterByAvailability(tags: string[], availableTags: string[]) {
  const available = getAvailableTags(availableTags);
  const filtered = tags.filter((tag) => available.size === 0 || available.has(tag));
  return filtered.length > 0 ? filtered : tags;
}

function dedupe(tags: string[]) {
  return [...new Set(tags)];
}

export function getTopicCard(tag: string): TopicCard {
  const meta = TOPIC_CATALOG[tag];
  if (meta) {
    return {
      tag: meta.tag,
      title: meta.title,
      description: meta.description,
      prompt: meta.prompt,
    };
  }

  const title = toTitle(tag);
  return {
    tag,
    title,
    description: `Learn more about ${title.toLowerCase()}.`,
    prompt: title,
  };
}

export function buildTopicCards(tags: string[]) {
  return dedupe(tags).map(getTopicCard);
}

export function getDefaultTopicCards(availableTags: string[] = []) {
  return buildTopicCards(filterByAvailability(HOME_TOPIC_TAGS, availableTags));
}

function detectGroup(query: string): TopicMeta["group"] | null {
  if (/(admission|apply|application|requirements|exam|freshman|transferee)/.test(query)) {
    return "admissions";
  }

  if (/(enroll|enrollment|register|registration|schedule|deadline|semester)/.test(query)) {
    return "enrollment";
  }

  if (/(course|program|degree|it|cs|computer|graduate|master)/.test(query)) {
    return "academics";
  }

  if (/(campus|location|address|map|facility|library|organization|event)/.test(query)) {
    return "campus";
  }

  if (/(contact|phone|email|registrar|call|reach)/.test(query)) {
    return "support";
  }

  if (/(about|vision|mission|cvsu)/.test(query)) {
    return "institution";
  }

  return null;
}

function scoreTopic(meta: TopicMeta, query: string, lastIntent?: string) {
  let score = 0;

  if (lastIntent && lastIntent === meta.tag) {
    score += 6;
  }

  const lastIntentMeta = lastIntent ? TOPIC_CATALOG[lastIntent] : undefined;
  if (lastIntentMeta && lastIntentMeta.group === meta.group) {
    score += 2;
  }

  for (const keyword of meta.keywords) {
    if (keyword && query.includes(keyword)) {
      score += keyword.includes(" ") ? 4 : 3;
    }
  }

  if (/(where|location|address|located)/.test(query) && meta.group === "campus") {
    score += 2;
  }

  if (/(how|process|procedure|steps)/.test(query) && (meta.group === "admissions" || meta.group === "enrollment")) {
    score += 2;
  }

  if (/(when|date|schedule|deadline)/.test(query) && (meta.tag === "enrollment_schedule" || meta.tag === "academic_calendar" || meta.tag === "events")) {
    score += 2;
  }

  if (/(how much|tuition|fee|fees|cost|payment)/.test(query) && (meta.tag === "tuition_fees" || meta.tag === "scholarship")) {
    score += 3;
  }

  return score;
}

export function rankRelevantTopicCards(
  query: string,
  lastIntent: string | undefined,
  availableTags: string[] = [],
  limit = 4,
) {
  const normalizedQuery = query.toLowerCase();
  const available = filterByAvailability(
    Object.keys(TOPIC_CATALOG).filter((tag) => !FALLBACK_EXCLUDE.has(tag)),
    availableTags,
  );

  const ranked = available
    .map((tag) => ({ tag, score: scoreTopic(TOPIC_CATALOG[tag], normalizedQuery, lastIntent) }))
    .sort((a, b) => b.score - a.score);

  const topMatches = ranked.filter((item) => item.score > 0).slice(0, limit).map((item) => item.tag);
  if (topMatches.length >= limit) {
    return buildTopicCards(topMatches);
  }

  const inferredGroup =
    (lastIntent && TOPIC_CATALOG[lastIntent]?.group) ||
    detectGroup(normalizedQuery) ||
    "support";

  const groupDefaults = filterByAvailability(GROUP_DEFAULTS[inferredGroup], availableTags);
  const combined = dedupe([...topMatches, ...groupDefaults, ...HOME_TOPIC_TAGS]).slice(0, limit);

  return buildTopicCards(combined);
}
