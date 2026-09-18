import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/modules/auth/password';
const db=new PrismaClient();
async function main() {
  const email=process.env.ADMIN_EMAIL?.trim().toLowerCase(),password=process.env.ADMIN_PASSWORD;
  if(!email||!email.includes('@')||!password||password.length<6) throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD (at least 6 characters) in backend/.env.');
  await db.user.upsert({where:{institutionId_email:{institutionId:process.env.INSTITUTION_ID||'buk',email}},create:{institutionId:process.env.INSTITUTION_ID||'buk',email,name:process.env.ADMIN_NAME||'Campus Administrator',role:'admin',passwordHash:hashPassword(password)},update:{role:'admin',passwordHash:hashPassword(password)}});
  console.log('Administrator created/updated. Remove ADMIN_PASSWORD from .env now.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>db.$disconnect());
