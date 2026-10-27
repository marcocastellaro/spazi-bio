const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true});try{
 const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true});
 await page.goto('http://127.0.0.1:8000/');await page.evaluate(()=>sessionStorage.setItem('bio_dei_auth_ok_v1','1'));await page.reload();
 await page.locator('[data-tab="layouts"]').click();
 await page.locator('.floorCell[data-room="0"][data-cell="0"]').tap();await page.locator('.floorCell[data-room="0"][data-cell="11"]').tap();
 await page.locator('[data-tab="map"]').click();
 const room=page.locator('#rooms .room[data-room="0"]'),cells=room.locator('.grid > div');assert.equal(await cells.count(),12);assert(await cells.nth(0).evaluate(e=>e.classList.contains('seatEmpty')));assert((await cells.nth(11).locator('.seatno').textContent()).includes('Postazione 1'));
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 assert(await room.locator('.roomBoard').evaluate(e=>e.scrollWidth>e.clientWidth));
 await page.evaluate(()=>{state.rooms[0].seats[0].primary={name:'Pianta test'};save()});await page.locator('#mapSearch').fill('Pianta test');assert.equal(await page.locator('#rooms .seat').count(),1);assert.equal(await cells.count(),12);assert.equal(await cells.nth(11).getAttribute('class'),'seat');
 await cells.nth(11).locator('[data-edit]').click();assert.equal(await page.locator('#p_name').inputValue(),'Pianta test');await page.locator('[data-cancel]').click();
 await page.reload();assert((await page.locator('#rooms .room[data-room="0"] .grid > div').nth(11).locator('.seatno').textContent()).includes('Postazione 1'));
 console.log('PASS: Postazioni respects saved floor positions, empty cells, filtering without rearrangement, correct desk editing, mobile scroll containment and reload.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
