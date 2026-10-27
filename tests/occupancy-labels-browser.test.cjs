const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true});try{
 const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8000/');await page.evaluate(()=>sessionStorage.setItem('bio_dei_auth_ok_v1','1'));await page.reload();
 await page.evaluate(()=>{const seat=state.rooms[0].seats[0];seat.primary={name:'Titolare',start:'2026-11-01',end:'2027-10-31'};seat.temporary=[{name:'Anna',surname:'Rossi',start:'2026-11-01',end:'2027-02-28'},{name:'Luca',surname:'Bianchi',start:'2027-03-01',end:'2027-10-31'}];save()});
 const seat=page.locator('#rooms .room[data-room="0"] .seat').first(),segments=seat.locator('.occupancySegment.temporary');
 assert((await seat.locator('.person .meta').innerText()).includes('Fine contratto: 31/10/2027'));assert((await seat.locator('.temp').first().innerText()).includes('Uso temporaneo: 01/11/2026'));assert.equal(await seat.locator('.occupancyHeading').count(),0);assert.equal(await seat.locator('.occupancyTrack').count(),1);assert.equal(await page.locator('#rooms .track').count(),0);assert.equal(await segments.count(),2);
 assert.equal(await segments.nth(0).innerText(),'Anna Rossi');assert.equal(await segments.nth(1).innerText(),'Luca Bianchi');
 assert.equal(await segments.nth(0).locator('.occupancyName').evaluate(e=>getComputedStyle(e).color),'rgb(255, 255, 255)');assert.equal(await segments.nth(0).evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(250, 204, 21)');
 await segments.nth(1).tap();assert((await seat.locator('.occupancyDetail').innerText()).includes('Luca Bianchi'));assert((await seat.locator('.occupancyDetail').innerText()).includes('31/10/2027'));
 const overlap=await page.evaluate(()=>occupancySegments({temporary:[{name:'A',start:'2027-01-01',end:'2027-01-03'},{name:'B',start:'2027-01-02',end:'2027-01-04'}]},Date.UTC(2026,10,1),Date.UTC(2027,10,1)).filter(x=>x.kind==='temporary').map(x=>x.temporarySlots));assert.deepEqual(overlap,[[0],[0,1],[1]]);
 await page.evaluate(()=>{state.rooms[0].seats[0].temporary=[{name:'Un giorno <img src=x>',start:'2027-01-01',end:'2027-01-01'}];render()});
 const narrow=seat.locator('.occupancySegment.temporary');await narrow.focus();await page.keyboard.press('Enter');assert((await seat.locator('.occupancyDetail').innerText()).includes('Un giorno <img src=x>'));assert.equal(await narrow.locator('img').count(),0);
 await page.locator('[data-tab="calendar"]').click();assert(await page.locator('#calendarRows .track').count()>0);assert.deepEqual(errors,[]);
 console.log('PASS: single annual bar in Postazioni, white names on yellow, adjacent occupants stay separate, overlapping names, touch/keyboard full details, narrow segments and escaped text.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
