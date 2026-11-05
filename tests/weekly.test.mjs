import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';import worker from '../cloudflare/worker.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const posts=JSON.parse(await fs.readFile(root+'weekly/episodes.json','utf8'));
test('Twelve complete weekly Telegram posts start Friday 6 November',async()=>{
 assert.equal(posts.length,12);assert.equal(posts[0].date,'2026-11-06');assert.equal(posts.at(-1).date,'2027-01-22');assert.equal(posts.filter(p=>p.date.startsWith('2026-11')).length,4);
 for(let i=0;i<posts.length;i++){
  const p=posts[i],date=new Date(p.date+'T12:00:00Z');assert.equal(date.getUTCDay(),5);if(i)assert.equal(date-new Date(posts[i-1].date+'T12:00:00Z'),7*86400000);
  assert.ok(p.post.length<4096);assert.ok((p.post+'\n\nhttps://motivaion.muzakrawy.workers.dev/weekly/episode-12.html').length<4096);
  assert.ok(p.story.length>850);assert.ok(p.solution.length>150);assert.ok(p.example.length>50);assert.ok(p.cliff.length>60);assert.ok(p.post.includes(p.solution));assert.ok(p.post.includes(p.example));
  const txt=await fs.readFile(root+`weekly/episode-${String(p.id).padStart(2,'0')}.txt`,'utf8');assert.equal(txt.trim(),p.post);
  const html=await fs.readFile(root+`weekly/episode-${String(p.id).padStart(2,'0')}.html`,'utf8');assert.ok(html.includes('property="og:image"'));assert.ok(html.includes(`visual-${String(p.id).padStart(2,'0')}.png`));
  const image=await fs.readFile(root+`weekly/visual-${String(p.id).padStart(2,'0')}.png`);assert.equal(image.subarray(1,4).toString(),'PNG');assert.ok(image.byteLength>1000);
 }
 for(const name of ['سلمى','مريم','نادية','عمر'])assert.ok(posts[0].story.includes(name));
 assert.ok(posts.at(-1).cliff.includes('انتهى الموسم'));
});
test('Production homepage and weekly routes serve the new story; legacy studio stays available',async()=>{
 const env={ASSETS:{async fetch(request){try{return new Response(await fs.readFile(path.join(root,'dist/cloudflare',new URL(request.url).pathname)));}catch{return new Response('Not found',{status:404});}}}};
 for(const route of ['/','/reader','/weekly','/weekly/']){const r=await worker.fetch(new Request('https://example.com'+route),env);assert.equal(r.status,200);assert.match(await r.text(),/حكاية كل جمعة/);}
 assert.match(await(await worker.fetch(new Request('https://example.com/studio'),env)).text(),/btnOpenKeyModal/);
 for(const route of ['/weekly/episode-01.txt','/weekly/visual-12.png','/weekly/season.zip'])assert.equal((await worker.fetch(new Request('https://example.com'+route),env)).status,200);
 const files=await fs.readdir(root+'dist/cloudflare/weekly');assert.ok(!files.includes('posts.txt'));assert.ok(!files.some(n=>n.includes('مشاكل')));assert.ok(!files.includes('weekly-editorial-notes.md'));
});
