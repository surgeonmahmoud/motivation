// Run after build-november.py. Requires Playwright, Chromium and Arabic fonts.
const fs = require('node:fs/promises');
const path = require('node:path');
const {createHash} = require('node:crypto');
const {chromium} = require('playwright');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'november');
const escape = value => String(value).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ar = value => String(value).replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[Number(d)]);
const css = `
*{box-sizing:border-box}body{margin:0;background:#d7dcd9;font-family:'Noto Sans Arabic',Tahoma,Arial,sans-serif}.sheet{width:1080px;height:1350px;position:relative;overflow:hidden;background:#fff7e9;color:#18343c;padding:72px 90px;margin:0;direction:rtl;display:flex;flex-direction:column}.sheet.cover{background:#132b36;color:#fff7e9}.sheet.last{background:#bfe6cd;color:#18343c}.brand{display:flex;align-items:center;justify-content:space-between;font-size:28px;font-weight:700;border-bottom:2px solid currentColor;padding-bottom:25px;opacity:.9}.tag{font-size:27px;margin-top:40px;color:#2b6356}.cover .tag{color:#91d9b2}.content{height:800px;display:flex;align-items:center;position:relative}.copy{font-size:58px;line-height:1.85;font-weight:500;margin:0;white-space:pre-wrap;overflow-wrap:anywhere}.cover .copy{font-size:82px;line-height:1.65;font-weight:700}.last .copy{font-size:65px;font-weight:700}.footer{display:flex;justify-content:space-between;align-items:center;border-top:2px solid currentColor;padding-top:22px;margin-top:auto;font-size:25px}.pagination{display:flex;gap:9px;margin-top:22px;direction:rtl}.dot{height:7px;width:52px;border-radius:5px;background:currentColor;opacity:.2}.dot.active{opacity:1}.folio{font-size:30px;font-weight:700;direction:ltr;unicode-bidi:isolate}.accent{position:absolute;left:0;top:260px;width:14px;height:300px;background:#e49a58}.index-note{font:18px/1.8 sans-serif;padding:24px;direction:rtl;max-width:1080px}.index-note a{color:#103e36}.sheet+.sheet{margin-top:24px}@media print{.index-note{display:none}.sheet+.sheet{margin:0}.sheet{break-after:page}@page{size:1080px 1350px;margin:0}}`;
function markup(p) {
 return p.carousel.map((text,i)=>`<section class="sheet ${i===0?'cover':i===p.carousel.length-1?'last':''}" aria-label="الشريحة ${i+1}"><div class="accent"></div><div class="brand"><span>مذاكراوي</span><span>نوفمبر ٢٠٢٦</span></div><div class="tag">${escape(i===0?'شغّل اللي في إيدك':i===p.carousel.length-1?'خد الفكرة معاك':p.title)}</div><div class="content"><p class="copy">${escape(text)}</p></div><div class="footer"><span>${i===0?'اسحب وكمل ←':i===p.carousel.length-1?'الموجود في جدولك، بأفضل أداء متاح.':'فكرة واحدة • انتباه أفضل'}</span><span class="folio">${ar(i+1)} / ${ar(p.carousel.length)}</span></div><div class="pagination">${p.carousel.map((_,j)=>`<span class="dot ${j===i?'active':''}"></span>`).join('')}</div></section>`).join('');
}
(async()=>{
 const posts=JSON.parse(await fs.readFile(path.join(out,'data.json'),'utf8'));
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
 const manifest=[];
 try {
 const page=await browser.newPage({viewport:{width:1080,height:1350},deviceScaleFactor:1});
 for(const p of posts.filter(p=>p.carousel)) {
  const id=String(p.day).padStart(2,'0');
  const document=`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${escape(p.title)}</title><style>${css}</style></head><body>${markup(p)}</body></html>`;
  await page.setContent(document);await page.evaluate(()=>document.fonts.ready);
  const sizes=await page.evaluate(()=>Array.from(document.querySelectorAll('.sheet')).map(sheet=>{
   const copy=sheet.querySelector('.copy'),container=sheet.querySelector('.content');let size=parseFloat(getComputedStyle(copy).fontSize);
   while(copy.getBoundingClientRect().height>container.clientHeight && size>42){size-=2;copy.style.fontSize=size+'px';}
   if(copy.getBoundingClientRect().height>container.clientHeight)throw Error('Slide text does not fit');
   if(sheet.scrollWidth>1080 || sheet.scrollHeight>1350)throw Error('Slide content overflows');
   return size;
  }));
  for(let i=0;i<p.carousel.length;i++){
   const name=`carousel-${id}-${String(i+1).padStart(2,'0')}.png`;
   await page.locator('.sheet').nth(i).screenshot({path:path.join(out,name)});
   manifest.push({day:p.day,slide:i+1,file:name,width:1080,height:1350,fontSize:sizes[i]});
  }
  // Retain fitted type sizes in the editable, offline HTML source.
  await fs.writeFile(path.join(out,`carousel-${id}.html`),await page.content());
  console.log(`Day ${id}: ${p.carousel.length} slides exported`);
 }
 // Refresh diagram PNGs from the same current source, so the kit cannot mix revisions.
 for(const p of posts.filter(p=>p.diagram)){
  await page.setContent(await fs.readFile(path.join(out,p.diagram),'utf8'));await page.evaluate(()=>document.fonts.ready);
  await page.locator('svg').screenshot({path:path.join(out,p.diagram.replace('.svg','.png'))});
 }
 await fs.writeFile(path.join(out,'assets-manifest.json'),JSON.stringify({sourceHash:createHash('sha256').update(await fs.readFile(path.join(out,'data.json'))).digest('hex'),slides:manifest},null,2)+'\n');
 console.log(`Exported ${manifest.length} carousel slides and 8 diagrams.`);
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
