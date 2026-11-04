import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const out=path.join(root,'dist/cloudflare');
await fs.rm(out,{recursive:true,force:true});await fs.mkdir(path.join(out,'november'),{recursive:true});
// Publish curated content only, never the checkout, local settings or user data.
const files=[
 'mozakrawi-content-studio.html','mozakrawi-hawamesh-reader.html','mozakrawi-baad-awal-matab-november.html',
 'mozakrawi-november-2026-complete.md','mozakrawi-hawamesh-novella.md','mozakrawi-content-bank-2026-10-30.md',
 'mozakrawi-baad-awal-matab-november.md','mozakrawi-touq-el-najah-december.md',
 'mozakrawi-content-plan-and-roadmap-2026-2027.md','mozakrawi-schedule-export-meta-buffer.csv'
];
for(const file of files)await fs.copyFile(path.join(root,file),path.join(out,file));
const publicNames=new Set(['index.html','app.js','style.css','data.json','assets-manifest.json','schedule.csv','november-publishing-kit.zip']);
for(const name of await fs.readdir(path.join(root,'november'))){
 if(publicNames.has(name)||/^(carousel-\d{2}(-\d{2})?\.(png|html|zip)|diagram-\d{2}\.(png|svg))$/.test(name)){
  await fs.copyFile(path.join(root,'november',name),path.join(out,'november',name));
 }
}
await fs.copyFile(path.join(out,'mozakrawi-content-studio.html'),path.join(out,'index.html'));
console.log('Cloudflare public assets built in dist/cloudflare');
