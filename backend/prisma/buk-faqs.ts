// Paraphrased from BUK's official FAQ collection, checked 18 September 2026.
// The source pages were published in 2025; session-specific instructions can change.
// Collection: https://buk.edu.ng/faqs-by-category
import type { PrismaClient } from '@prisma/client';
const groups: [string, [number, string, string][]][] = [
  ['Admissions & enrollment', [
    [676, 'How do I apply for admission?', 'Apply through the admissions portal linked from BUK’s website. Check the documents and closing date for your programme.'],
    [677, 'What are the admission requirements?', 'Requirements depend on the programme. Check BUK Admissions for the required qualifications, certificates, transcripts and identification.'],
    [678, 'How can I check my admission status?', 'Log in to your admissions portal to track your application. BUK also sends status notifications by email.'],
    [679, 'Does the university offer scholarships or financial aid?', 'BUK lists merit- and need-based support, mainly from third parties. Check its scholarship information for available opportunities.'],
    [704, 'How can I register for the BUK Post-UTME screening?', 'Register through BUKAT following the university’s screening instructions. The linked FAQ names the 2025 portal; check current admissions announcements before applying.'],
    [705, 'How many semesters does the university run per session?', 'An academic session has two semesters.'],
    [706, 'Can I transfer to BUK from another university?', 'Transfers are possible through the admissions office, subject to BUK’s transfer requirements.'],
    [707, 'Does BUK accept direct entry applications?', 'Yes. Eligible NCE, ND, HND and A-level holders may apply through direct entry.'],
    [708, 'Does BUK accept international students?', 'Yes. Consult BUK’s international admission requirements before applying.'],
    [709, 'Does BUK accept all religions?', 'BUK welcomes students regardless of religion or region.'],
  ]],
  ['Academics & fees', [
    [680, 'What programs and courses does the university offer?', 'Explore BUK Academics for undergraduate, postgraduate and professional study options across its faculties.'],
    [681, 'How do I register for courses?', 'Use the student portal during the registration period announced by the university.'],
    [682, 'Where can I access academic calendars?', 'Open the Calendars section of BUK’s official website.'],
    [683, 'Does the university offer distance learning or online programs?', 'BUK offers some online and blended programmes. See its Moodle links and e-learning guide for details.'],
    [710, 'How can I check my results online?', 'Sign in with your registration details at https://mybuk2.buk.edu.ng/ug/login.php to view results.'],
    [711, 'What grading system does BUK use?', 'BUK uses a five-point grading scale.'],
    [712, 'How do I pay my school fees?', 'The FAQ lists payment through https://mybuk2.buk.edu.ng/ug/login.php or the university microfinance bank on the main campus. Follow your current portal instructions.'],
    [713, 'Can I pay my school fees in installments?', 'Full payment is normally required. Contact the bursary if you need help with financial difficulties.'],
  ]],
  ['Student life & support', [
    [684, 'How do I access my student portal or university email?', 'Admission credentials provide access. Follow the student portal and email links on BUK’s website.'],
    [685, 'Where can I get assistance with IT or technical issues?', 'Use your faculty’s registration support contact, email webadmin.cit@buk.edu.ng, or visit CIT for technical help.'],
    [686, 'What housing options are available for students?', 'Campus hostels are available. Students with an access code can apply at https://mybuk2.buk.edu.ng/hostelapp/.'],
    [687, 'Are there extracurricular activities and student clubs?', 'BUK has sports and student groups. Ask the Sports Directorate or Student Affairs about joining.'],
    [715, 'Will I be able to cook in my hostel accommodation?', 'The FAQ permits students to cook in hostels.'],
    [716, 'What medical facilities are available on campus?', 'The university medical centre serves students and staff. See https://www.buk.edu.ng/clinic/ for services.'],
    [717, 'What are the transportation options within the campus?', 'Shuttle tricycles provide transport within campus.'],
    [718, 'How can I report a security issue?', 'Report to campus security. BUK’s FAQ lists New Campus: 08094086981 and Old Campus: 08094086938.'],
    [719, 'What should I do in case of a medical emergency?', 'Seek immediate help at the university clinic. The FAQ lists 08107596175 and 08065464814 as contact numbers.'],
  ]],
  ['Exams & records', [
    [688, 'How do I obtain my exam schedule?', 'Check faculty and university noticeboards ahead of the examination period.'],
    [689, 'What is the process for graduation?', 'Complete academic requirements, clearance and graduation payments. Consult the BUK Convocation Engine for fee details.'],
    [690, 'How do I request transcripts or certificates?', 'Apply through the Registrar’s Office or your faculty. Allow time for processing.'],
  ]],
  ['About BUK', [
    [691, 'Where is the university located?', 'BUK is in Kano, Nigeria. Its main campus is on Gwarzo Road.'],
    [692, 'How can I contact university departments?', 'Find departmental contacts on the faculty pages. The general university line is +234 816 0107510.'],
    [693, 'What are the university’s working hours?', 'Administrative offices open on weekdays. Academic timetables differ; check BUK’s website for current hours.'],
    [714, 'Is BUK a public or private university?', 'BUK is a federal public university in Nigeria.'],
  ]],
];
export const bukFaqs = groups.flatMap(([category, rows]) => rows.map(([node, title, body]) => ({
  id: `buk-faq-${node}`, kind: 'faq', title, body, category, campus: 'all',
  sourceUrl: `https://www.buk.edu.ng/node/${node}`, sourceLabel: 'Bayero University • Official FAQ',
  verified: true, verifiedAt: new Date('2026-09-18T00:00:00Z'), status: 'published',
})));
export async function seedBukFaqs(db: PrismaClient, institutionId: string) {
  for (const row of bukFaqs) await db.content.upsert({
    where: { id: row.id }, create: { ...row, institutionId }, update: {},
  });
  // Re-running seeds preserves any subsequent editorial changes, including withdrawals.
}
