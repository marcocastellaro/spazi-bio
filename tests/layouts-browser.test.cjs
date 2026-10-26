const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true});try{
const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:8000/');await page.evaluate(()=>sessionStorage.setItem('bio_dei_auth_ok_v1','1'));await page.reload();await page.locator('[data-tab="layouts"]').click();
const layouts=await page.evaluate(()=>state.rooms.map(r=>{const l=roomLayout(r);return {rows:l.rows,cols:l.cols,seats:l.cells.filter(Boolean).length,unique:new Set(l.cells.filter(Boolean)).size}}));assert.deepEqual(layouts.map(l=>[l.rows,l.cols]),[[3,4],[3,2],[3,4],[2,4],[3,4],[2,2]]);assert(layouts.every(l=>l.seats===l.unique));
const cell=i=>page.locator(`.floorCell[data-room="0"][data-cell="${i}"]`);
await cell(0).tap();await cell(11).tap();let first=await page.evaluate(()=>state.rooms[0].layout.cells);assert.equal(first[0],null);assert.equal(first[11],'r2');
await page.reload();await page.locator('[data-tab="layouts"]').click();assert.equal(await cell(11).locator('.floorNumber').textContent(),'1');
await cell(11).tap();await cell(1).tap();assert.equal(await cell(1).locator('.floorNumber').textContent(),'1');assert.equal(await cell(11).locator('.floorNumber').textContent(),'2');
const source=await cell(1).boundingBox(),target=await cell(0).boundingBox();await page.mouse.move(source.x+source.width/2,source.y+source.height/2);await page.mouse.down();await page.mouse.move(target.x+target.width/2,target.y+target.height/2,{steps:10});await page.mouse.up();assert.equal(await cell(0).locator('.floorNumber').textContent(),'1');
await page.waitForTimeout(450);await cell(0).focus();await page.keyboard.press('Enter');await cell(1).focus();await page.keyboard.press('Enter');assert.equal(await cell(1).locator('.floorNumber').textContent(),'1');
const stateCheck=await page.evaluate(()=>({layout:JSON.parse(localStorage.getItem('bio_dei_space_manager_v2')).rooms[0].layout,keys:state.rooms[0].seats.map(deskKey),snapshot:snapshotPayload().rooms[0].layout}));assert.deepEqual(stateCheck.snapshot,stateCheck.layout);assert.deepEqual(stateCheck.layout.cells.filter(Boolean).sort(),stateCheck.keys.sort());
assert(await page.evaluate(()=>[...document.querySelectorAll('.floorGrid')].every(e=>e.getBoundingClientRect().right<=innerWidth)));
assert.deepEqual(errors,[]);console.log('PASS: room dimensions, unique desks, touch move and swap, mouse drag, keyboard move, reload persistence, snapshot layout, mobile width, no browser errors.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
