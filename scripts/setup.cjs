const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
for(const [template,destination] of [['backend/.env.example','backend/.env'],['frontend/.env.example','frontend/.env.local']]){
  const target=path.join(root,destination);
  if(fs.existsSync(target)){console.log(`${destination} exists; left unchanged.`);continue;}
  let content=fs.readFileSync(path.join(root,template),'utf8');
  if(destination==='backend/.env')content=content.replace('JWT_SECRET=""',`JWT_SECRET="${crypto.randomBytes(48).toString('hex')}"`);
  fs.writeFileSync(target,content,{mode:0o600});
  console.log(`Created ${destination}. Secrets were not printed.`);
}
// An empty file is a valid new SQLite database and avoids a Windows engine
// initialization edge case. Never touch an existing database or a custom URL.
const database=path.join(root,'backend/prisma/campus.db');
const backendEnv=fs.readFileSync(path.join(root,'backend/.env'),'utf8');
if(/^DATABASE_URL="file:\.\/campus\.db"$/m.test(backendEnv)&&!fs.existsSync(database)){
  fs.writeFileSync(database,'');
}
