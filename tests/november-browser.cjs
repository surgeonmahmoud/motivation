// Run with a local studio already started. This test uses an isolated browser context.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const base=process.env.STUDIO_URL||'http://127.0.0.1:3456';
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
 try{
 const context=await browser.newContext({viewport:{width:1280,height:900},permissions:['clipboard-read','clipboard-write']});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/november');await page.waitForSelector('article');assert.equal(await page.locator('article').count(),30);
 await page.selectOption('#format','carousel');assert.equal(await page.locator('article').count(),12);
 await page.selectOption('#week','1');assert.equal(await page.locator('article').count(),3);
 await page.locator('article').first().getByRole('button',{name:'معاينة الشرائح'}).click();
 const dialog=page.getByRole('dialog');assert.equal(await dialog.isVisible(),true);
 assert.equal(await page.locator('#previousSlide').isDisabled(),true);
 for(let i=0;i<5;i++){
  await page.locator('#previewImage').evaluate(img=>img.decode());
  assert.equal(await page.locator('#previewImage').evaluate(img=>img.naturalWidth),1080);
  assert.equal(await page.locator('#previewCount').textContent(),`الشريحة ${i+1} من 5`);
  if(i<4)await page.click('#nextSlide');
 }
 assert.equal(await page.locator('#nextSlide').isDisabled(),true);
 await page.click('#previousSlide');assert.match(await page.locator('#previewImage').getAttribute('src'),/carousel-01-04.png$/);
 const downloadPromise=page.waitForEvent('download');await page.click('#downloadCarousel');const download=await downloadPromise;assert.equal(download.suggestedFilename(),'carousel-01.zip');assert.equal(await download.failure(),null);
 await page.keyboard.press('Escape');assert.equal(await dialog.isVisible(),false);
 await page.selectOption('#week','');await page.selectOption('#format','diagram');assert.equal(await page.locator('article').count(),8);
 await page.selectOption('#format','');await page.fill('#search','zzzzzz');assert.equal(await page.locator('article').count(),0);await page.fill('#search','');
 await page.locator('article').first().getByRole('button',{name:'نسخ البوست',exact:true}).click();assert.match(await page.evaluate(()=>navigator.clipboard.readText()),/المهمة اللي قدامك/);
 await page.locator('article').first().getByRole('button',{name:'تعليم كمنشور',exact:true}).click();await page.reload();await page.waitForSelector('article.published');assert.equal(await page.locator('article.published').count(),1);
 const bundlePromise=page.waitForEvent('download');await page.getByRole('link',{name:'تحميل حزمة النشر كاملة ZIP'}).click();const bundle=await bundlePromise;assert.equal(await bundle.failure(),null);assert.equal(bundle.suggestedFilename(),'november-publishing-kit.zip');
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo(0,0));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.locator('article').first().getByRole('button',{name:'معاينة الشرائح'}).click();await page.locator('#previewImage').evaluate(img=>img.decode());assert.equal(await dialog.evaluate(d=>d.scrollWidth>d.clientWidth),false);
 await page.screenshot({path:'/tmp/november-carousel-mobile.png'});
 assert.deepEqual(errors,[]);console.log('PASS carousel filtering, slide preview, boundaries, download ZIPs, copy, persistent state, mobile layout and zero JS errors.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
