const RULES='قواعد تحرير ملزمة تتقدم على الأمثلة القديمة: لا تطلب من الطالب إنشاء جدول أو تعديله أو إعادة توزيع وقته. لا تضف ساعات أو واجبات أو عدد أسئلة أو تكليف كبير. شجعه على تنفيذ الموجود في جدوله بأفضل أداء متاح حسب طاقته، وأي تصرف صغير يكون داخل المهمة الحالية. لا سهر تعويضي ولا تخويف أو إذلال أو ضمان درجات أو تشخيص نفسي. الراحة ليست مشروطة بالإنجاز.';
const json=(status,data)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const aliases={
 '/':'/index.html', '/reader':'/mozakrawi-hawamesh-reader.html','/hawamesh':'/mozakrawi-hawamesh-reader.html',
 '/series':'/mozakrawi-baad-awal-matab-november.html','/hawamesh.md':'/mozakrawi-hawamesh-novella.md',
 '/content-bank.md':'/mozakrawi-content-bank-2026-10-30.md','/november':'/november/index.html','/november/':'/november/index.html'
};
async function readPayload(request){
 const reader=request.body?.getReader();if(!reader)throw new Error('missing body');
 const chunks=[];let length=0;
 while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>1024*1024){await reader.cancel();throw new RangeError('too large');}chunks.push(value);}
 const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 return JSON.parse(new TextDecoder().decode(bytes));
}
export async function handleRequest(request,env,upstreamFetch=fetch){
 const url=new URL(request.url),pathname=url.pathname;
 if(pathname==='/api/status'&&request.method==='GET')return json(200,{ok:true,serverMode:true,storageMode:'browser',hasEnvKey:false,maskedEnvKey:null});
 if(pathname==='/api/user-data'&&request.method==='GET')return json(200,{ok:true,data:null,storageMode:'browser'});
 if(pathname==='/api/user-data'||pathname==='/api/save-key')return json(405,{ok:false,error:'تُحفظ البيانات والمفاتيح في متصفحك فقط على نسخة Cloudflare.'});
 if(pathname==='/api/interactions'){
  if(request.method!=='POST')return json(405,{ok:false,error:'Method not allowed'});
  const origin=request.headers.get('origin');if(origin&&origin!==url.origin)return json(403,{ok:false,error:'Origin not allowed'});
  const key=request.headers.get('x-studio-api-key')?.trim();
  if(!key)return json(401,{ok:false,error:'أضف مفتاح Gemini الخاص بك من إعدادات الاستوديو. لا يوجد مفتاح مشترك على الموقع.'});
  let payload;
  try{payload=await readPayload(request);}catch(error){return json(error instanceof RangeError?413:400,{ok:false,error:'تعذّر قراءة الطلب أو تجاوز الحجم المسموح.'});}
  if(!payload||typeof payload!=='object'||Array.isArray(payload)||typeof payload.model!=='string'||!payload.model||!payload.input)return json(400,{ok:false,error:'Model and input are required'});
  payload.system_instruction=(typeof payload.system_instruction==='string'?payload.system_instruction+'\n\n':'')+RULES;
  try{
   const response=await upstreamFetch('https://generativelanguage.googleapis.com/v1beta/interactions',{
    method:'POST',headers:{'content-type':'application/json','x-goog-api-key':key,'Api-Revision':'2026-05-20'},body:JSON.stringify(payload),signal:AbortSignal.timeout(60000)
   });
   return new Response(response.body,{status:response.status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
  }catch{return json(502,{ok:false,error:'تعذّر الاتصال بمزوّد التوليد. حاول مرة أخرى لاحقًا.'});}
 }
 if(pathname.startsWith('/api/'))return json(404,{ok:false,error:'Route not found'});
 if(request.method!=='GET'&&request.method!=='HEAD')return json(405,{ok:false,error:'Method not allowed'});
 url.pathname=aliases[pathname]||pathname;
 const response=await env.ASSETS.fetch(new Request(url,request));
 const headers=new Headers(response.headers);headers.set('x-content-type-options','nosniff');headers.set('referrer-policy','strict-origin-when-cross-origin');
 if(url.pathname.endsWith('.zip'))headers.set('content-disposition',`attachment; filename="${url.pathname.split('/').pop()}"`);
 return new Response(response.body,{status:response.status,headers});
}
export default {fetch(request,env){return handleRequest(request,env);}};
