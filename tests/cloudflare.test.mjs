import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import worker,{handleRequest} from '../cloudflare/worker.mjs';
const root=fileURLToPath(new URL('../dist/cloudflare/',import.meta.url));
const env={ASSETS:{async fetch(request){try{return new Response(await fs.readFile(path.join(root,new URL(request.url).pathname)));}catch{return new Response('Not found',{status:404});}}}};
const req=(route,options)=>new Request('https://motivaion.example'+route,options);
test('Worker serves campaign aliases and downloadable assets, excluding private/local files',async()=>{
 for(const route of ['/','/reader','/series','/november','/november/','/content-bank.md','/november/november-publishing-kit.zip']){
  const r=await worker.fetch(req(route),env,{});assert.equal(r.status,200,route);assert.ok((await r.arrayBuffer()).byteLength>0);
  if(route.endsWith('.zip'))assert.match(r.headers.get('content-disposition'),/attachment/);
 }
 for(const route of ['/.env','/server.mjs','/studio-user-data.json','/package.json','/november/posts.txt','/.git/config'])assert.equal((await worker.fetch(req(route),env,{})).status,404,route);
});
test('Cloudflare stores no shared keys or shared user data',async()=>{
 const r=await worker.fetch(req('/api/status'),env,{});const data=await r.json();assert.equal(data.storageMode,'browser');assert.equal(data.hasEnvKey,false);
 assert.equal((await(await worker.fetch(req('/api/user-data'),env,{})).json()).data,null);
 for(const route of ['/api/user-data','/api/save-key'])assert.equal((await worker.fetch(req(route,{method:'POST',body:'{}'}),env,{})).status,405);
 assert.equal((await worker.fetch(req('/api/interactions',{method:'POST',body:'{}'}),env,{})).status,401);
});
test('Generation forwards only to Gemini with caller key and editorial constraints',async()=>{
 let calls=0;
 const request=req('/api/interactions',{method:'POST',headers:{'x-studio-api-key':'fixture-key-not-a-secret','content-type':'application/json','origin':'https://motivaion.example'},body:JSON.stringify({model:'fixture-model',input:'اكتب بوستًا',system_instruction:'تعليمات اختبار'})});
 const r=await handleRequest(request,env,async(url,options)=>{
  calls++;assert.equal(url,'https://generativelanguage.googleapis.com/v1beta/interactions');assert.equal(options.headers['x-goog-api-key'],'fixture-key-not-a-secret');
  const body=JSON.parse(options.body);assert.match(body.system_instruction,/لا تطلب من الطالب إنشاء جدول/);assert.match(body.system_instruction,/لا تضف ساعات/);assert.equal(body.input,'اكتب بوستًا');
  return new Response('{"output_text":"fixture response"}',{status:200});
 });assert.equal(calls,1);assert.equal(r.status,200);assert.equal((await r.json()).output_text,'fixture response');
});
test('Generation rejects cross-site, malformed and oversized requests before calling upstream',async()=>{
 const forbidden=()=>{throw Error('Upstream must not be called');};
 for(const [body,headers,expected] of [
  ['{}',{'origin':'https://elsewhere.example'},403],
  ['{',{},400],['[]',{},400],['{}',{},400],['a'.repeat(1024*1024+1),{},413]
 ]){
  const r=await handleRequest(req('/api/interactions',{method:'POST',headers:{'x-studio-api-key':'fixture-key-not-a-secret',...headers},body}),env,forbidden);assert.equal(r.status,expected);
 }
});
test('Provider failure remains a failure and does not leak credentials',async()=>{
 const request=()=>req('/api/interactions',{method:'POST',headers:{'x-studio-api-key':'fixture-key-not-a-secret'},body:JSON.stringify({model:'fixture-model',input:'test'})});
 const failed=await handleRequest(request(),env,async()=>new Response('{"error":"quota"}',{status:429}));assert.equal(failed.status,429);
 const offline=await handleRequest(request(),env,async()=>{throw Error('fixture-key-not-a-secret');});assert.equal(offline.status,502);assert.ok(!(await offline.text()).includes('fixture-key-not-a-secret'));
});
