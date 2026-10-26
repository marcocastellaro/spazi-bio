const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true});try{
const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
let saved=null,forceError=null,posts=0;
await page.route('https://script.google.com/macros/s/smoke-test/exec**',async route=>{
 const req=route.request();let result;
 if(req.method()==='POST'){posts++;const body=JSON.parse(req.postData());assert.equal(body.secret,'test-only-key');saved=body.payload;result={ok:true}}
 else result=forceError?{ok:false,error:forceError}:saved?{ok:true,payload:saved}:{ok:false,error:'no_snapshot'};
 await route.fulfill({status:200,headers:{'Access-Control-Allow-Origin':'*','Content-Type':'application/json'},body:JSON.stringify(result)});
});
await page.goto('http://127.0.0.1:8000/');await page.evaluate(()=>sessionStorage.setItem('bio_dei_auth_ok_v1','1'));await page.reload();await page.locator('[data-tab="layouts"]').click();
await page.locator('.floorCell[data-room="0"][data-cell="0"]').click();await page.locator('.floorCell[data-room="0"][data-cell="11"]').click();
await page.locator('[data-tab="tools"]').click();await page.locator('#syncUrl').fill('https://script.google.com/macros/s/smoke-test/exec');await page.locator('#syncKey').fill('test-only-key');
await page.locator('#sendSheet').click();await page.waitForFunction(()=>document.querySelector('#syncStatus').textContent.includes('Salvataggio verificato'));
assert.equal(posts,1);assert.equal(saved.schemaVersion,3);assert.equal(saved.rooms[0].layout.cells[11],'r2');assert(saved.rooms.every(r=>r.layout?.cells));
await page.locator('#consultSheet').click();await page.locator('#consultationNotice').waitFor({state:'visible'});assert.equal(await page.locator('.floorCell:not([disabled])').count(),0);assert(await page.locator('#sendSheet').isDisabled());
await page.locator('[data-tab="map"]').click();assert.equal(await page.locator('[data-edit]:not([disabled])').count(),0);
await page.locator('[data-tab="tools"]').click();await page.locator('#resumeEditing').click();await page.locator('#consultationNotice').waitFor({state:'hidden'});assert(await page.locator('#sendSheet').isEnabled());
forceError='unauthorized';await page.locator('#loadSheet').click();await page.waitForFunction(()=>document.querySelector('#syncStatus').textContent.includes('Chiave condivisa non corretta'));assert.equal(await page.evaluate(()=>state.rooms[0].layout.cells[11]),'r2');
forceError=null;await page.locator('#loadSheet').click();await page.waitForFunction(()=>document.querySelector('#syncStatus').textContent.includes('salvati sul dispositivo'));assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('bio_dei_space_manager_v2')).rooms[0].layout.cells[11]),'r2');
assert.deepEqual(errors,[]);console.log('PASS: mocked send/read verification, full room layouts, read-only consultation, resume editing, failed auth preserves data, restore persistence. No live Google Sheet writes.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
