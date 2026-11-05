'use strict';
const $=id=>document.getElementById(id), storageKey='mozakrawi-weekly-published-v1';
let episodes=[],active=1,published={};
try{const value=JSON.parse(localStorage.getItem(storageKey)||'{}');if(value&&typeof value==='object'&&!Array.isArray(value))published=value;}catch{}
let timer;function notice(text){$('notice').textContent=text;clearTimeout(timer);timer=setTimeout(()=>$('notice').textContent='',5500);}
const dateText=value=>new Intl.DateTimeFormat('ar-EG',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'Africa/Cairo'}).format(new Date(value+'T12:00:00Z'));
const current=()=>episodes.find(p=>p.id===active);
async function copy(text){try{await navigator.clipboard.writeText(text);notice('تم النسخ — جاهز للصق في تليجرام.');}catch{notice('النسخ التلقائي غير متاح؛ حمّل النص أو حدّده وانسخه يدويًا.');}}
function renderList(){
 $('episodeList').replaceChildren();const query=$('search').value.trim(),month=$('month').value;
 const found=episodes.filter(p=>(!month||p.date.startsWith(month))&&(!query||[p.title,p.problem,p.story].join(' ').includes(query)));
 if(!found.length){const p=document.createElement('p');p.className='empty';p.textContent='مفيش حلقة مطابقة. جرّب كلمة تانية أو اختار الموسم كله.';$('episodeList').append(p);}
 for(const p of found){const button=document.createElement('button');button.className='episode-option';button.type='button';button.setAttribute('aria-current',String(p.id===active));
 const n=document.createElement('span');n.textContent=`الحلقة ${p.id} ${published[p.id]?'· تم تعليمها كمنشورة':''}`;const title=document.createElement('strong');title.textContent=p.title;const date=document.createElement('span');date.textContent=dateText(p.date);button.append(n,title,date);
 button.addEventListener('click',()=>{active=p.id;history.replaceState(null,'',`#episode-${p.id}`);render();$('episodeTitle').setAttribute('tabindex','-1');$('episodeTitle').focus({preventScroll:true});if(innerWidth<851)$('episodePanel').scrollIntoView({behavior:'smooth',block:'start'});});$('episodeList').append(button);}
 $('savedCount').textContent=`${episodes.filter(p=>published[p.id]).length} / ${episodes.length} منشورة`;
}
function render(){renderList();const p=current();if(!p)return;const id=String(p.id).padStart(2,'0');$('episodeDate').textContent=`الحلقة ${p.id} · ${dateText(p.date)} · ٨ مساءً بتوقيت القاهرة`;$('episodeTitle').textContent=p.title;$('problem').textContent=p.problem;$('post').textContent=p.post;$('length').textContent=`${p.post.length} حرفًا · رسالة نصية واحدة · الصورة اختيارية`;
 $('downloadText').href=`/weekly/episode-${id}.txt`;$('downloadImage').href=`/weekly/visual-${id}.png`;$('episodeImage').src=`/weekly/visual-${id}.png`;$('episodeImage').alt=p.imageAlt||p.problem;$('published').textContent=published[p.id]?'✓ تم التعليم كمنشور — إلغاء':'تعليم كمنشور';$('published').setAttribute('aria-pressed',String(Boolean(published[p.id])));
}
$('copyPost').addEventListener('click',()=>{if(current())copy(current().post);});
$('copyPreview').addEventListener('click',()=>{const p=current();if(p)copy(p.post+`\n\nhttps://motivaion.muzakrawy.workers.dev/weekly/episode-${String(p.id).padStart(2,'0')}.html`);});
$('published').addEventListener('click',()=>{if(!current())return;const next={...published,[active]:!published[active]};try{localStorage.setItem(storageKey,JSON.stringify(next));published=next;render();notice('اتحفظت العلامة في المتصفح فقط؛ لم يتم إرسال أي رسالة.');}catch{notice('تعذّر حفظ العلامة في هذا المتصفح.');}});
$('search').addEventListener('input',renderList);$('month').addEventListener('change',renderList);
function fromHash(){const match=location.hash.match(/^#episode-(\d+)$/);if(match&&episodes.some(p=>p.id===Number(match[1])))active=Number(match[1]);render();}
window.addEventListener('hashchange',fromHash);
(async()=>{try{const response=await fetch('/weekly/episodes.json');if(!response.ok)throw Error();episodes=await response.json();fromHash();}catch{$('episodeTitle').textContent='تعذّر تحميل الحلقات';$('post').textContent='أعد تحميل الصفحة، أو حمّل ملف الرواية الكامل من دليل النشر أسفل الصفحة.';}})();
