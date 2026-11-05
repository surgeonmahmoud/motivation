import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import worker from '../cloudflare/worker.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const posts=JSON.parse(await fs.readFile(root+'weekly/episodes.json','utf8'));
test('November contains seven practical problem posts and exactly one independent story',async()=>{
 assert.deepEqual(posts.map(p=>p.date),[6,9,13,16,20,23,27,30].map(d=>`2026-11-${String(d).padStart(2,'0')}`));
 assert.deepEqual(posts.map(p=>p.id),[1,2,3,4,5,6,7,8]);
 assert.equal(posts.filter(p=>p.kind==='advice').length,7);assert.equal(posts.filter(p=>p.kind==='story').length,1);assert.equal(posts.at(-1).kind,'story');
 assert.deepEqual(posts.filter(p=>p.kind==='advice').map(p=>p.sourceCount),[11,11,11,8,7,6,6]);
 const calendar=await fs.readFile(root+'weekly/schedule.csv','utf8');
 for(const p of posts){
  const weekday=new Date(p.date+'T12:00:00Z').getUTCDay();assert.ok([1,5].includes(weekday));
  const id=String(p.id).padStart(2,'0'),link=`https://motivaion.muzakrawy.workers.dev/weekly/episode-${id}.html`;
  assert.ok((p.post+'\n\n'+link).length<=4096);
  assert.ok(p.intro.length>(p.kind==='story'?1000:150));assert.ok(p.solution.length>150);assert.ok(p.example.length>80);assert.ok(p.closing.length>60);assert.ok(!('cliff' in p));
  for(const key of ['intro','solution','example','closing'])assert.ok(p.post.includes(p[key]));
  assert.ok(calendar.includes(`${p.date},${weekday===5?'Friday':'Monday'},20:00,Africa/Cairo`));
  assert.equal((await fs.readFile(root+`weekly/episode-${id}.txt`,'utf8')).trim(),p.post);
  const html=await fs.readFile(root+`weekly/episode-${id}.html`,'utf8');assert.ok(html.includes('property="og:image"'));assert.ok(html.includes(`visual-${String(p.imageId).padStart(2,'0')}.png`));assert.ok(html.includes(p.title));
  const image=await fs.readFile(root+`weekly/visual-${String(p.imageId).padStart(2,'0')}.png`);assert.equal(image.subarray(1,4).toString(),'PNG');assert.ok(image.byteLength>1000);
 }
 assert.ok(posts.at(-1).intro.includes('آدم'));assert.ok(posts.at(-1).closing.includes('موقف تخيلي'));
 for(const p of posts)assert.doesNotMatch(p.post,/الحلقة الجاية|الجمعة الجاية|لسه ما خلصتش/);
 const files=await fs.readdir(root+'weekly');assert.equal(files.filter(n=>/^episode-\d+\.txt$/.test(n)).length,8);assert.equal(files.filter(n=>/^visual-\d+\.png$/.test(n)).length,8);
 const book=await fs.readFile(root+'weekly/november-2026.md','utf8');for(const p of posts)assert.ok(book.includes(p.post));
});
test('Public homepage serves the revised November story and excludes superseded episodes',async()=>{
 const env={ASSETS:{async fetch(request){try{return new Response(await fs.readFile(path.join(root,'dist/cloudflare',new URL(request.url).pathname)));}catch{return new Response('Not found',{status:404});}}}};
 for(const route of ['/','/reader','/weekly','/weekly/']){const r=await worker.fetch(new Request('https://example.com'+route),env);assert.equal(r.status,200);assert.match(await r.text(),/مشكلة وحل/);}
 assert.match(await(await worker.fetch(new Request('https://example.com/studio'),env)).text(),/btnOpenKeyModal/);
 for(const route of ['/weekly/episode-01.txt','/weekly/visual-08.png','/weekly/november-2026.md','/weekly/season.zip'])assert.equal((await worker.fetch(new Request('https://example.com'+route),env)).status,200);
 for(const route of ['/weekly/episode-09.html','/weekly/episode-12.txt','/weekly/visual-12.png'])assert.equal((await worker.fetch(new Request('https://example.com'+route),env)).status,404);
 const files=await fs.readdir(root+'dist/cloudflare/weekly');assert.ok(!files.some(n=>n.includes('مشاكل')));assert.ok(!files.includes('weekly-editorial-notes.md'));
});
