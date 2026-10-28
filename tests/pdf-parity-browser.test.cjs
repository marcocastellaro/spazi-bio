const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true});try{
 const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8000/');await page.evaluate(()=>sessionStorage.setItem('bio_dei_auth_ok_v1','1'));await page.reload();
 const first=await page.evaluate(async()=>{const result=await buildPostazioniPdf();return result.base64});
 const bytes=Buffer.from(first,'base64');assert(bytes.subarray(0,5).toString()==='%PDF-');assert(bytes.length>10000);assert(bytes.length<12*1024*1024);fs.writeFileSync('/tmp/spazi-bio-unified.pdf',bytes);
 assert.equal((bytes.toString('latin1').match(/\/Type \/Page\b/g)||[]).length,6);
 // The manual button opens the same Blob used by Invia, even on a mobile viewport.
 await page.evaluate(()=>{window.open=()=>({opener:null,document:{title:'',body:{}},location:{replace:url=>{window.previewUrl=url}},close(){}})});
 await page.locator('#printPostazioni').click();await page.waitForFunction(()=>window.previewUrl);
 const manual=await page.evaluate(async()=>{const blob=await(await fetch(window.previewUrl)).blob();return await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.readAsDataURL(blob)})});
 assert(manual===first,'Manual PDF differs from generated PDF');
 let saved=null,uploaded=null;
 await page.route('https://script.google.com/macros/s/pdf-test/exec**',async route=>{
  const req=route.request();if(req.method()==='POST'){const body=JSON.parse(req.postData());saved=body.payload;uploaded=body.pdf.base64;saved.pdf={ok:true,url:'https://drive.google.com/file/d/test/view'}}
  await route.fulfill({status:200,headers:{'Access-Control-Allow-Origin':'*','Content-Type':'application/json'},body:JSON.stringify(req.method()==='POST'?{ok:true}:{ok:true,payload:saved})});
 });
 await page.locator('[data-tab="tools"]').click();await page.locator('#syncUrl').fill('https://script.google.com/macros/s/pdf-test/exec');await page.locator('#syncKey').fill('mock-key');await page.locator('#sendSheet').click();await page.waitForFunction(()=>document.querySelector('#syncStatus').textContent.includes('Dati e PDF su Drive aggiornati'));
 assert(uploaded===manual,'Uploaded PDF differs from manual PDF');assert(!('base64' in saved));
 await page.locator('[data-tab="map"]').click();await page.locator('#roomFilter').selectOption({index:1});
 const filtered=await page.evaluate(async()=> (await buildPostazioniPdf()).base64);assert(filtered!==first);assert.equal((Buffer.from(filtered,'base64').toString('latin1').match(/\/Type \/Page\b/g)||[]).length,1);
 await page.locator('#rangeEnd').fill('2026-10-01');assert(await page.evaluate(async()=>{try{await buildPostazioniPdf();return false}catch{return true}}));
 assert.equal(await page.locator('iframe').count(),0);assert.deepEqual(errors,[]);
 console.log('PASS: identical manual/uploaded PDF bytes, six A4 room pages, mobile rendering, selected room filter, invalid range guard and no PDF bytes in snapshot.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
