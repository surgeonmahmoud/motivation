'use strict';
const $ = id => document.getElementById(id);
const storageKey = 'mozakrawi-november-2026-published';
let published = {}, posts = [], previewPost = null, previewIndex = 0;
try { const value=JSON.parse(localStorage.getItem(storageKey)||'{}'); if(value && typeof value==='object' && !Array.isArray(value)) published=value; } catch {}
const el=(tag,text,className)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;};
let noticeTimer;
function notice(text){$('notice').textContent=text;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('notice').textContent='',5000);}
function button(label,action){const b=el('button',label);b.type='button';b.addEventListener('click',action);return b;}
async function copy(text){try{await navigator.clipboard.writeText(text);notice('تم النسخ.');}catch{notice('النسخ التلقائي غير متاح. حدّد النص وانسخه يدويًا.');}}
function updatePreview(){
 const p=previewPost,name=`carousel-${String(p.day).padStart(2,'0')}-${String(previewIndex+1).padStart(2,'0')}.png`;
 $('previewTitle').textContent=p.title;
 $('previewCount').textContent=`الشريحة ${previewIndex+1} من ${p.carousel.length}`;
 $('previewImage').src='/november/'+name;
 $('previewImage').alt=p.carousel[previewIndex];
 $('downloadSlide').href='/november/'+name;
 $('downloadCarousel').href=`/november/carousel-${String(p.day).padStart(2,'0')}.zip`;
 $('previousSlide').disabled=previewIndex===0;
 $('nextSlide').disabled=previewIndex===p.carousel.length-1;
}
function openPreview(p){previewPost=p;previewIndex=0;updatePreview();$('carouselPreview').showModal();}
$('previousSlide').addEventListener('click',()=>{if(previewPost&&previewIndex>0){previewIndex--;updatePreview();}});
$('nextSlide').addEventListener('click',()=>{if(previewPost&&previewIndex<previewPost.carousel.length-1){previewIndex++;updatePreview();}});
function render(){
 const query=$('search').value.trim(),week=$('week').value,state=$('state').value,format=$('format').value;
 const shown=posts.filter(p=>(!format||(format==='carousel'?Boolean(p.carousel):Boolean(p.diagram)))&&(!week||p.week===Number(week))&&(!query||[p.title,p.body,p.capsule].join(' ').includes(query))&&(!state||(state==='published')===Boolean(published[p.day])));
 $('count').textContent=`${shown.length} من ٣٠ رسالة`;$('posts').replaceChildren();
 if(!shown.length)$('posts').append(el('p','مفيش رسائل مطابقة. جرّب كلمة أو فلتر تاني.'));
 shown.forEach(p=>{
  const card=el('article',undefined,published[p.day]?'published':'');card.id=`day-${p.day}`;
  card.append(el('p',`${p.weekday} ${p.date} • ٨ مساءً بتوقيت القاهرة • ${p.theme}`,'meta'),el('h3',`${p.day}. ${p.title}`),el('p',p.body,'body'));
  const actions=el('div',undefined,'actions');
  actions.append(button('نسخ البوست',()=>copy(p.title+'\n\n'+p.body)),button('نسخ الكبسولة',()=>copy(p.capsule)),button(published[p.day]?'✓ مُعلّم كمنشور — إلغاء':'تعليم كمنشور',()=>{
   const next={...published,[p.day]:!published[p.day]};try{localStorage.setItem(storageKey,JSON.stringify(next));published=next;render();notice('تم تحديث السجل في هذا المتصفح.');}catch{notice('تعذّر حفظ السجل في المتصفح؛ لم تتغير الحالة.');}
  }));if(p.carousel)actions.append(button('معاينة الشرائح',()=>openPreview(p)));card.append(actions);
  const detail=el('details');detail.append(el('summary','الكبسولة والستوري والتصميم'+(p.carousel?' والكاروسيل':'')));
  for(const [title,text] of [['كبسولة القناة',p.capsule],['ستوري اختياري',p.story],['قصد الرسالة للفريق',p.action],['توجيه الصورة',p.visualPrompt]]){const s=el('section');s.append(el('h4',title),el('p',text,'copyarea'),button('نسخ '+title,()=>copy(text)));detail.append(s);}
  if(p.carousel){const pack=el('a','تحميل صور الكاروسيل كاملة ZIP','button primary');pack.href=`/november/carousel-${String(p.day).padStart(2,'0')}.zip`;pack.download='';detail.append(pack);detail.append(el('h4','نصوص شرائح الكاروسيل'));p.carousel.forEach((s,i)=>detail.append(el('p',`شريحة ${i+1}\n${s}`,'slide copyarea')));detail.append(button('نسخ الكاروسيل كاملًا',()=>copy(p.carousel.map((s,i)=>`شريحة ${i+1}\n${s}`).join('\n\n'))));}
  if(p.diagram){const a=el('a','تحميل الديجرام PNG');a.href='/november/'+p.diagram.replace('.svg','.png');a.download='';detail.append(a);}card.append(detail);$('posts').append(card);
 });
}
async function init(){try{const r=await fetch('/november/data.json');if(!r.ok)throw Error();posts=await r.json();render();posts.filter(p=>p.diagram).forEach(p=>{const fig=el('figure'),img=el('img');img.src='/november/'+p.diagram;img.alt=p.title+' — '+p.action;img.loading='lazy';img.width=1080;img.height=1350;const caption=el('figcaption');for(const ext of ['svg','png']){const a=el('a','تحميل '+ext.toUpperCase());a.href='/november/'+p.diagram.replace('.svg','.'+ext);a.download='';caption.append(a);}fig.append(img,caption);$('gallery').append(fig);});}catch{$('posts').append(el('p','تعذّر تحميل الرسائل. أعد تحميل الصفحة أو حمّل الملف الكامل من أعلى الصفحة.'));}
 try{const r=await fetch('/api/status');if(!r.ok)throw Error();const s=await r.json();$('apiState').textContent=s.hasEnvKey?'الخادم متصل، ويوجد مفتاح محفوظ. نجاح التوليد يتطلب اختبارًا فعليًا من إعدادات الاستوديو.':'الخادم متصل. لا يوجد مفتاح Gemini مُعدّ على الخادم؛ التوليد الخارجي غير مفعّل. المحتوى والديجرامات جاهزان للاستخدام.';}catch{$('apiState').textContent='تعذّر التحقق من اتصال API. المحتوى المنشور هنا لا يعتمد على التوليد الخارجي.';}
}
for(const id of ['search','week','state','format'])$(id).addEventListener(id==='search'?'input':'change',render);
init();
