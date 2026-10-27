const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true});try{
 const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:8000/');await page.evaluate(()=>sessionStorage.setItem('bio_dei_auth_ok_v1','1'));await page.reload();
 await page.evaluate(()=>{state.rooms[0].seats[0].primary={name:'Titolare',end:'2028-10-31'};state.rooms[0].seats[0].temporary=[{name:'Anna',start:'2027-02-10',end:'2027-02-20'}];state.rooms[0].seats[0].absences=[];render()});
 const seat=page.locator('#rooms .room[data-room="0"] .seat').first();assert.equal(await page.locator('.occupancyHeading').count(),0);
 await page.locator('#rangeStart').fill('2027-02-01');await page.locator('#rangeEnd').fill('2027-02-28');assert.equal(await page.locator('#occupancyYear').inputValue(),'custom');
 const widths=await seat.locator('.occupancySegment').evaluateAll(items=>items.map(e=>parseFloat(e.style.width)));assert.equal(widths.length,3);assert(Math.abs(widths[1]-11/28*100)<0.0001);assert((await seat.locator('.person .meta').innerText()).includes('Fine contratto: 31/10/2028'));assert.equal(await seat.locator('.occupancyMonths span').count(),1);
 await page.locator('#rangeStart').fill('2027-02-15');await page.locator('#rangeEnd').fill('2027-02-15');assert.equal(await seat.locator('.occupancySegment').count(),1);assert.equal(await seat.locator('.occupancyName').textContent(),'Anna');assert.equal(await seat.locator('.occupancySegment').evaluate(e=>e.style.width),'100%');
 await page.locator('#rangeEnd').fill('2027-02-14');assert.equal(await seat.locator('.occupancyTrack').count(),0);assert((await seat.locator('.rangeMessage').innerText()).includes('valido'));
 await page.locator('#occupancyYear').selectOption('2027');assert.equal(await page.locator('#rangeStart').inputValue(),'2027-11-01');assert.equal(await page.locator('#rangeEnd').inputValue(),'2028-10-31');assert.equal(await seat.locator('.occupancyMonths span').count(),12);
 const checks=await page.evaluate(()=>{
  const start=Date.UTC(2028,1,28),end=Date.UTC(2028,2,2),s={primary:{end:'2028-02-28'},temporary:[{name:'Leap',start:'2028-02-29',end:'2028-02-29'}]};
  const segments=occupancySegments(s,start,end);return {kinds:segments.map(x=>x.kind),days:segments.map(x=>(x.end-x.start)/86400000),all:occupancySegments({},Date.UTC(2020,0,1),Date.UTC(2050,0,1)),months:occupancyMonthLabels(Date.UTC(2020,0,1),Date.UTC(2050,0,1))};
 });assert.deepEqual(checks.kinds,['primary','temporary','available']);assert.deepEqual(checks.days,[1,1,1]);assert.equal(checks.all.length,1);assert.equal((checks.months.match(/<span/g)||[]).length,12);
 assert.deepEqual(errors,[]);console.log('PASS: custom range changes proportions, inclusive one-day intervals, contract date stays independent, invalid dates, academic presets, leap day and long ranges.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
