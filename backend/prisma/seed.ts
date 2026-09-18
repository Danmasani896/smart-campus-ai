import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { seedBukFaqs } from './buk-faqs';
import { seedBukPlaces } from './buk-places';
const db=new PrismaClient();
async function main() {
  await seedBukFaqs(db, process.env.INSTITUTION_ID || 'buk');
  await seedBukPlaces(db, process.env.INSTITUTION_ID || 'buk');
  // Drafts only. Chapter One describes scope; it does not verify operational campus facts.
  const drafts=[{id:'draft-registration',kind:'guide',title:'Registration: content awaiting university review',body:'Add the approved registration sequence, required documents, official portal URL and current academic session before publishing.',category:'Freshers'}, {id:'draft-security',kind:'emergency',title:'Campus security',body:'Add a verified campus security telephone number, office location, source and review date before publishing.',category:'Safety'}, {id:'draft-orientation',kind:'event',title:'Fresher orientation',body:'Add the university-approved date, venue, campus and programme before publishing this event.',category:'Orientation'}, {id:'draft-computing',kind:'location',title:'Faculty of Computing',body:'Confirm campus, building coordinates and an official source before publishing this location.',category:'Faculties'}];
  for(const row of drafts) await db.content.upsert({where:{id:row.id},create:{...row,institutionId:process.env.INSTITUTION_ID||'buk',status:'draft',verified:false},update:{}});
  console.log('Imported 34 source-linked BUK FAQs, 52 OpenStreetMap places, 5 emergency contacts, 4 sample events, and review drafts. Existing editorial changes preserved.');
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>db.$disconnect());
