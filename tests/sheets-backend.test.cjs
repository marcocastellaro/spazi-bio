const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
class Sheet{
 constructor(){this.data=[];this.rows=2;this.cols=2}
 getMaxRows(){return this.rows}getMaxColumns(){return this.cols}
 insertRowsAfter(_,n){this.rows+=n}insertColumnsAfter(_,n){this.cols+=n}
 getLastRow(){let n=this.data.length;while(n&&!this.data[n-1]?.some(x=>x!==''&&x!=null))n--;return n}
 clearContents(){this.data=[]}setFrozenRows(){}autoResizeColumns(){}
 appendRow(row){this.data.push([...row]);this.rows=Math.max(this.rows,this.data.length)}
 getRange(r,c,n=1,m=1){return {setValues:values=>{assert.equal(values.length,n);values.forEach((row,i)=>{assert.equal(row.length,m);this.data[r-1+i]??=[];row.forEach((x,j)=>this.data[r-1+i][c-1+j]=x)});return this},getValues:()=>Array.from({length:n},(_,i)=>Array.from({length:m},(_,j)=>this.data[r-1+i]?.[c-1+j]??'')),setNumberFormat:()=>{}}}
}
const sheets=new Map(),ss={getSheetByName:n=>sheets.get(n)||null,insertSheet:n=>{const s=new Sheet();sheets.set(n,s);return s}};
let locked=false;const context=vm.createContext({SpreadsheetApp:{getActiveSpreadsheet:()=>ss,flush(){}},LockService:{getScriptLock:()=>({waitLock(){locked=true},hasLock:()=>locked,releaseLock(){locked=false}})},Utilities:{Charset:{UTF_8:'utf8'},base64Encode:s=>Buffer.from(s,'utf8').toString('base64'),base64Decode:s=>Buffer.from(s,'base64'),newBlob:b=>({getDataAsString:()=>Buffer.from(b).toString('utf8')})},ContentService:{MimeType:{JSON:'json'},createTextOutput:text=>({text,setMimeType(){return this}})}});
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../AppsScript_Spazi_BIO.gs'),'utf8'),context);
const call=expr=>JSON.parse(vm.runInContext(expr,context).text);
assert.equal(call("doGet({parameter:{action:'load',secret:'incorrect'}})").error,'unauthorized');
assert.equal(call("doGet({parameter:{action:'load',secret:SECRET}})").error,'no_snapshot');
context.testPayload={schemaVersion:3,generatedAt:'2026-11-01T12:00:00.000Z',rows:[{room:'209',seat:1,name:'Test'}],rooms:[{name:'209',layout:{rows:3,cols:4,cells:['a',null]},seats:[{id:'a',number:1,primary:{name:'Test'},temporary:[],absences:[{label:'Estero',start:'2027-01-01',end:'2027-02-01'}]}]}],reviews:[],longText:'Dati per prova à 🪑 '.repeat(5000)};
assert.equal(call("doPost({postData:{contents:JSON.stringify({secret:'incorrect',payload:testPayload})}})").error,'unauthorized');
assert.equal(call("doPost({postData:{contents:JSON.stringify({secret:SECRET,payload:{rows:[]}})}})").error,'invalid_payload');
assert.equal(sheets.size,0);
assert.equal(call("doPost({postData:{contents:JSON.stringify({secret:SECRET,payload:testPayload})}})").ok,true);
assert.deepEqual(call("doGet({parameter:{action:'load',secret:SECRET}})").payload,context.testPayload);
assert.equal(sheets.get('Piante').data[1][3],1);assert.equal(sheets.get('Piante').data[2][3],'');assert.equal(sheets.get('Assenze').data[1][2],'Estero');assert(sheets.get('SnapshotApp').getLastRow()>2);assert.equal(locked,false);
// A shorter subsequent snapshot must not retain chunks from the old one.
context.testPayload.longText='short';assert.equal(call("doPost({postData:{contents:JSON.stringify({secret:SECRET,payload:testPayload})}})").ok,true);assert.deepEqual(call("doGet({parameter:{action:'load',secret:SECRET}})").payload,context.testPayload);assert.equal(sheets.get('SnapshotApp').getLastRow(),2);assert.equal(sheets.get('StoricoInvii').getLastRow(),3);
console.log('PASS: Apps Script auth, payload validation, table projections, large/unicode snapshot round trip, overwrite with smaller snapshot, logs and locks (mock Google services).');
