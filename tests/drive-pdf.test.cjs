const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
let created=0,updated=0,html='',properties=new Map();
const context=vm.createContext({MimeType:{PDF:'application/pdf'},Utilities:{newBlob:source=>{html=source;return{getAs:type=>{assert.equal(type,'application/pdf');return{setName:name=>({getBytes:()=>[1,2,3]})}}}}},DriveApp:{getFolderById:id=>{assert.equal(id,'1FcoNaxY1AY-O0c63cFgsBpLmVJvEmnE4');return{createFile:()=>{created++;return{getId:()=> 'mock-pdf'}}}}},PropertiesService:{getScriptProperties:()=>({getProperty:k=>properties.get(k),setProperty:(k,v)=>properties.set(k,v)})},ScriptApp:{getOAuthToken:()=> 'mock-token'},UrlFetchApp:{fetch:(url,options)=>{assert(url.includes('/upload/drive/v3/files/mock-pdf'));assert.equal(options.method,'patch');updated++;return{getResponseCode:()=>200}}}});
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../AppsScript_Spazi_BIO.gs'),'utf8'),context);
context.payload={viewRange:{start:'2026-11-01',end:'2027-10-31'},rooms:[{name:'Room',layout:{rows:1,cols:2,cells:['a',null]},seats:[{id:'a',number:1,primary:{name:'Test <name>',end:'2027-10-31'},temporary:[]}]}]};
const one=vm.runInContext('savePdf_(payload)',context),two=vm.runInContext('savePdf_(payload)',context);assert.equal(created,1);assert.equal(updated,1);assert.equal(one.url,two.url);assert(html.includes('Test &lt;name&gt;'));assert(html.includes('<td></td>'));assert(!html.includes('Cella libera'));assert(html.includes('Fine contratto'));console.log('PASS: PDF creation, stable Drive file update, fixed grid blanks and escaped content (mock Google services).');

context.payload.viewRange.end='';
assert.throws(()=>vm.runInContext('pdfHtml_(payload)',context),/Invalid PDF range/);
