const {spawn,spawnSync}=require('node:child_process');
const path=require('node:path');
const compiler=path.resolve('node_modules/typescript/bin/tsc');
const initial=spawnSync(process.execPath,[compiler],{stdio:'inherit'});
if(initial.status!==0)process.exit(initial.status||1);
const compile=spawn(process.execPath,[compiler,'--watch','--preserveWatchOutput'],{stdio:'inherit'});
const server=spawn(process.execPath,['--watch','dist/main.js'],{stdio:'inherit'});
function stop(){compile.kill();server.kill();process.exit();}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
