import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const settings={...process.env};
// Account IDs copied from dashboards can contain invisible trailing newlines.
if(settings.CLOUDFLARE_ACCOUNT_ID)settings.CLOUDFLARE_ACCOUNT_ID=settings.CLOUDFLARE_ACCOUNT_ID.trim();
const cli=fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js',import.meta.url));
const child=spawn(process.execPath,[cli,'deploy',...process.argv.slice(2)],{env:settings,stdio:'inherit'});
child.once('error',error=>{console.error(error.message);process.exitCode=1;});
child.once('exit',(code,signal)=>{process.exitCode=code??1;if(signal)console.error(`Deployment stopped: ${signal}`);});
