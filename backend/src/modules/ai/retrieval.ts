const stop = new Set(
  "a an the is are was were i me my you your we our it this that to of in on at for with and or do does how what where when can should buk campus please tell about get find need want know university any some there".split(
    " ",
  ),
);
// Student vocabulary folded onto the words the official FAQs actually use.
const synonyms: Record<string, string> = {
  accommodation: "hostel",
  accomodation: "hostel",
  lodge: "hostel",
  lodging: "hostel",
  housing: "hostel",
  dorm: "hostel",
  dormitory: "hostel",
  tuition: "fee",
  fees: "fee",
  payment: "pay",
  paying: "pay",
  paid: "pay",
  instalment: "installment",
  enrol: "register",
  enroll: "register",
  enrolment: "register",
  enrollment: "register",
  registration: "register",
  registering: "register",
  examination: "exam",
  examinations: "exam",
  exams: "exam",
  test: "exam",
  tests: "exam",
  timetable: "schedule",
  timetables: "schedule",
  clinic: "medical",
  hospital: "medical",
  health: "medical",
  doctor: "medical",
  sick: "medical",
  ill: "medical",
  matriculation: "matric",
  admitted: "admission",
  admissions: "admission",
  apply: "admission",
  applying: "admission",
  application: "admission",
  applied: "admission",
  scholarships: "scholarship",
  bursary: "scholarship",
  aid: "scholarship",
  funding: "scholarship",
  results: "result",
  grade: "grading",
  grades: "grading",
  gpa: "grading",
  cgpa: "grading",
  transcripts: "transcript",
  certificate: "transcript",
  certificates: "transcript",
  hours: "hour",
  opening: "hour",
  open: "hour",
  jamb: "utme",
  postutme: "utme",
  courses: "course",
  programme: "program",
  programmes: "program",
  programs: "program",
  degree: "program",
  transportation: "transport",
  bus: "transport",
  shuttle: "transport",
  email: "portal",
  login: "portal",
  password: "portal",
  wifi: "it",
  internet: "it",
  clubs: "club",
  society: "club",
  societies: "club",
  sports: "club",
  extracurricular: "club",
  graduate: "graduation",
  graduating: "graduation",
  convocation: "graduation",
  police: "security",
  theft: "security",
  stolen: "security",
  unsafe: "security",
  cooking: "cook",
  kitchen: "cook",
  semesters: "semester",
  phone: "contact",
  number: "contact",
  reach: "contact",
  located: "location",
  address: "location",
  religion: "religions",
  muslim: "religions",
  christian: "religions",
  foreign: "international",
  foreigner: "international",
  overseas: "international",
};
function stem(word: string) {
  if (synonyms[word]) return synonyms[word];
  let t = word;
  if (t.length > 5 && t.endsWith("ing")) t = t.slice(0, -3);
  else if (t.length > 4 && t.endsWith("ed")) t = t.slice(0, -2);
  else if (t.length > 4 && t.endsWith("es")) t = t.slice(0, -2);
  else if (t.length > 4 && t.endsWith("s")) t = t.slice(0, -1);
  return synonyms[t] || t;
}
export function tokens(text: string) {
  return [
    ...new Set(
      (text.toLowerCase().match(/[a-z0-9]+/g) || [])
        .filter((t) => t.length > 2 && !stop.has(t))
        .map(stem),
    ),
  ];
}
export function chunks(text: string, size = 1400) {
  const result: string[] = [];
  for (let i = 0; i < text.length; i += size - 180)
    result.push(text.slice(i, i + size));
  return result;
}
function score<T extends { title: string; body: string }>(
  query: string,
  rows: T[],
) {
  const words = tokens(query);
  return rows.map((row) => {
    const title = tokens(row.title),
      body = tokens(row.body);
    const matched = words.filter((w) => title.includes(w) || body.includes(w));
    return {
      row,
      score: matched.reduce((s, w) => s + (title.includes(w) ? 3 : 1), 0),
      coverage: matched.length / Math.max(1, words.length),
      words,
    };
  });
}
/** Evidence good enough to answer from: most of the question must be covered. */
export function rank<T extends { title: string; body: string }>(
  query: string,
  rows: T[],
) {
  const scored = score(query, rows);
  const minCoverage = (scored[0]?.words.length || 0) >= 4 ? 0.4 : 0.5;
  return scored
    .filter((r) => r.score > 0 && r.coverage >= minCoverage)
    .sort((a, b) => b.score - a.score || b.coverage - a.coverage)
    .slice(0, 4)
    .map((r) => r.row);
}
/** Looser matches offered as "closest official answers" when rank() abstains. */
export function suggest<T extends { title: string; body: string }>(
  query: string,
  rows: T[],
  limit = 3,
) {
  return score(query, rows)
    .filter((r) => r.score > 0 && r.coverage >= 0.2)
    .sort((a, b) => b.score - a.score || b.coverage - a.coverage)
    .slice(0, limit)
    .map((r) => r.row);
}
