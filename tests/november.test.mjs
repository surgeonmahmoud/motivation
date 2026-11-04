import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {fileURLToPath} from 'node:url';
import net from 'node:net';
const root=fileURLToPath(new URL('../',import.meta.url));
test('November campaign: complete calendar, served assets and route boundaries',async t=>{
 const listener=net.createServer();listener.listen(0,'127.0.0.1');await once(listener,'listening');const port=listener.address().port;await new Promise(resolve=>listener.close(resolve));
 const child=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
 t.after(async()=>{if(child.exitCode===null){const stopped=once(child,'exit');child.kill();await stopped;}});
 const base=`http://127.0.0.1:${port}`;
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Server startup timeout')),5000);child.stdout.once('data',()=>{clearTimeout(timer);resolve();});child.once('error',reject);child.once('exit',code=>{clearTimeout(timer);reject(Error('Server exited: '+code));});});
 const res=await fetch(base+'/november/data.json');assert.equal(res.status,200);const posts=await res.json();assert.equal(posts.length,30);
 assert.deepEqual(posts.map(p=>p.date),Array.from({length:30},(_,i)=>`2026-11-${String(i+1).padStart(2,'0')}`));
 assert.equal(posts.filter(p=>p.carousel).length,12);assert.equal(posts.filter(p=>p.diagram).length,8);
 for(const p of posts){assert.ok(p.body.length>300);assert.ok(p.capsule&&p.story&&p.action);assert.equal(p.timezone,'Africa/Cairo');}
 for(const route of ['/november','/november/','/november/app.js','/november/style.css','/november/schedule.csv','/mozakrawi-november-2026-complete.md','/','/reader','/series'])assert.equal((await fetch(base+route)).status,200,route);
 for(const p of posts.filter(p=>p.diagram)){for(const ext of ['svg','png']){const r=await fetch(base+'/november/'+p.diagram.replace('.svg','.'+ext));assert.equal(r.status,200);assert.match(r.headers.get('content-type'),ext==='png'?/image\/png/:/image\/svg\+xml/);assert.ok((await r.arrayBuffer()).byteLength>1000);}}
 for(const route of ['/november/posts.txt','/november/missing.svg','/november/hidden/.env','/november/%2e%2e%2f.env'])assert.equal((await fetch(base+route)).status,404,route);
 const manifest=await(await fetch(base+'/november/assets-manifest.json')).json();
 assert.equal(manifest.slides.length,posts.filter(p=>p.carousel).reduce((n,p)=>n+p.carousel.length,0));
 for(const slide of manifest.slides){
  assert.ok(slide.fontSize>=42);
  const png=Buffer.from(await fs.readFile(root+'november/'+slide.file));
  assert.equal(png.readUInt32BE(16),1080);assert.equal(png.readUInt32BE(20),1350);
 }
 for(const name of ['november-publishing-kit.zip',...posts.filter(p=>p.carousel).map(p=>`carousel-${String(p.day).padStart(2,'0')}.zip`)]){
  const r=await fetch(base+'/november/'+name);assert.equal(r.status,200,name);assert.equal(r.headers.get('content-type'),'application/zip');
  const zip=Buffer.from(await r.arrayBuffer());assert.equal(zip.readUInt32LE(0),0x04034b50,name);
 }
 const md=await fs.readFile(root+'mozakrawi-november-2026-complete.md','utf8');for(const p of posts)assert.ok(md.includes(p.body),p.title);
 const status=await(await fetch(base+'/api/status')).json();assert.equal(status.ok,true);if(!status.hasEnvKey){const r=await fetch(base+'/api/interactions',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({input:'test'})});assert.equal(r.status,401);}
});
