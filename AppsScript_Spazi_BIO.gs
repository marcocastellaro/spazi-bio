/**
 * Google Apps Script per "Spazi BIO@DEI".
 * Incollare questo codice in Estensioni > Apps Script del Google Sheet.
 * Cambiare SECRET con una chiave personale, poi distribuire come Web App.
 */

const SECRET = 'CAMBIA_QUESTA_CHIAVE';
// Explicit destination: independent of whether the script is bound to a spreadsheet.
const SPREADSHEET_ID = '11gGAyeStD4bZrV2gETq7QwYY3ip6Al2qEMz_xZtF7QI';
const POSTAZIONI_SHEET = 'Postazioni';
const LOG_SHEET = 'StoricoInvii';

function applySeatCatalog(data){
  delete data.reviews;
  const footprints={"Laboratorio 209 DEI/A (10S + 1 B)": {"rows": 3, "cols": 4, "cells": ["r6", "r3", "r4", "r8", "r7", "r11", "r2", "r9", "r5", null, "r12", "r10"]}, "Studio 310 DEI/A (5S)": {"rows": 3, "cols": 2, "cells": ["r13", "r14", "r15", "r16", "r17", null]}, "Laboratorio 301 DEI/A (10S + 1B)": {"rows": 3, "cols": 4, "cells": ["r23", "r24", "r22", "r20", "r19", "r26", "r21", "r25", "r18", null, "r28", "r27"]}, "Ufficio 125 DEI/G (5S)": {"rows": 2, "cols": 4, "cells": ["r30", "r31", "r32", "r33", "r34", "r35", "r36", null]}, "Laboratorio DEI/S -primo piano (9S +1B)": {"rows": 3, "cols": 4, "cells": ["r39", "r40", "r37", "r41", "r44", "r38", "r43", "r42", null, "r45", null, null]}, "Laboratorio 305b DEI/A (4S)": {"rows": 2, "cols": 2, "cells": ["r46", "r48", "r47", "r49"]}};
  (data.rooms||[]).forEach(room=>{
    const base=footprints[room.name];if(!base)return;
    const keys=room.seats.map(s=>String(s.id??s.number)),used=new Set(),cells=base.cells.map(()=>null),existing=room.layout?.cells||base.cells;
    base.cells.forEach((key,i)=>{const current=existing[i];if(key!=null&&current!=null&&keys.includes(String(current))&&!used.has(String(current))){cells[i]=String(current);used.add(String(current))}});
    const remaining=[...base.cells.filter(k=>k!=null&&keys.includes(String(k))),...keys].filter((k,i,a)=>a.indexOf(k)===i&&!used.has(String(k)));
    base.cells.forEach((key,i)=>{if(key!=null&&cells[i]==null&&remaining.length)cells[i]=String(remaining.shift())});
    room.layout={rows:base.rows,cols:base.cols,cells};
  });

  const jolly=(name,number)=>(/\b(?:209|301)\b/.test(name)&&number===11)||(/DEI\s*\/\s*S\b/i.test(name)&&number===9)||(/\b125\b/.test(name)&&(number===6||number===7));
  (data.rooms||[]).forEach(room=>{
    const is209=/\b209\b/.test(room.name),is301=/\b301\b/.test(room.name);
    const removed=new Set(room.seats.filter(s=>is301&&Number(s.number)===12).map(s=>String(s.id??s.number)));
    room.seats=room.seats.filter(s=>!(is301&&Number(s.number)===12));
    room.seats.forEach(s=>{if(jolly(room.name,Number(s.number)))s.label='JOLLY';else if(is209&&Number(s.number)===9&&s.label==='JOLLY')delete s.label});
    if(room.layout&&Array.isArray(room.layout.cells))room.layout.cells=room.layout.cells.map(key=>removed.has(String(key))?null:key);
  });
  if(Array.isArray(data.rows))data.rows=data.rows.filter(row=>!(/\b301\b/.test(row.room)&&parseInt(row.seat,10)===12)).map(row=>{
    const number=parseInt(row.seat,10);
    if(jolly(row.room,number))return {...row,seat:number+' JOLLY'};
    if(/\b209\b/.test(row.room)&&number===9&&String(row.seat).trim()==='9 JOLLY')return {...row,seat:9};
    return row;
  });
  return data;
}

// The complete snapshot is the source for restoring the app, including desk positions.
function doGet(e) {
  const args=(e&&e.parameter)||{};
  if(args.action!=='load')return ContentService.createTextOutput('Spazi BIO@DEI endpoint attivo');
  if(!args.secret||args.secret!==SECRET)return json_({ok:false,error:'unauthorized'});
  const lock=LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sh=SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('SnapshotApp');
    if(!sh||sh.getLastRow()<2)return json_({ok:false,error:'no_snapshot'});
    const chunks=sh.getRange(2,2,sh.getLastRow()-1,1).getValues().map(r=>r[0]);
    return json_({ok:true,payload:applySeatCatalog(JSON.parse(Utilities.newBlob(Utilities.base64Decode(chunks.join(''))).getDataAsString('UTF-8')))});
  }catch(err){return json_({ok:false,error:String(err&&err.message||err)})}
  finally{if(lock.hasLock())lock.releaseLock()}
}

function doPost(e) {
  const lock=LockService.getScriptLock();
  try {
    if(!e||!e.postData||!e.postData.contents){console.warn('Nessun invio HTTP ricevuto: usa il pulsante Invia nell’app, non Esegui su doPost.');return json_({ok:false,error:'missing_request'})}
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (!body.secret || body.secret !== SECRET) {
      console.warn('Invio rifiutato: chiave condivisa assente o non corretta.');
      return json_({ok:false, error:'unauthorized'});
    }
    const payload = applySeatCatalog(body.payload || {});
    if(!Array.isArray(payload.rooms)||!payload.rooms.length||!payload.rooms.every(r=>Array.isArray(r.seats))||!Array.isArray(payload.rows))return json_({ok:false,error:'invalid_payload'});
    lock.waitLock(10000);
    const rows = payload.rows;
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sh = sheet_(ss, POSTAZIONI_SHEET);
    const headers = [
      'Stanza','Postazione','Tipo','Slot temporaneo','Nome','Cognome','Nome completo',
      'Dal','Al','Ruolo / note','Supervisore','Dipartimento','Giorni','Note','Riga origine Excel',
      'Ultimo invio'
    ];

    if(sh.getMaxRows()<rows.length+1)sh.insertRowsAfter(sh.getMaxRows(),rows.length+1-sh.getMaxRows());
    sh.clearContents();
    sh.getRange(1,1,1,headers.length).setValues([headers]);
    if (rows.length) {
      const now = new Date();
      const values = rows.map(r => [
        r.room || '', r.seat || '', r.type || '', r.slot || '', r.name || '', r.surname || '',
        r.fullName || '', r.start || '', r.end || '', r.position || '', r.supervisor || '',
        r.department || '', r.days || '', r.note || '', r.sourceRow || '', now
      ]);
      sh.getRange(2,1,values.length,headers.length).setValues(values);
    }
    sh.setFrozenRows(1);
    sh.autoResizeColumns(1, headers.length);
    if (sh.getMaxRows() > 1) {
      sh.getRange(2,8,Math.max(1,rows.length),2).setNumberFormat('yyyy-mm-dd');
      sh.getRange(2,16,Math.max(1,rows.length),1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
    }

    const absences=[],positions=[];
    payload.rooms.forEach(r=>{
      r.seats.forEach(seat=>(seat.absences||[]).forEach(a=>absences.push([r.name,seat.label?seat.number+' '+seat.label:seat.number,a.label||'Estero',a.start||'',a.end||''])));
      if(r.layout&&Array.isArray(r.layout.cells))r.layout.cells.forEach((key,index)=>{
        const seat=r.seats.find(s=>String(s.id==null?s.number:s.id)===String(key));
        positions.push([r.name,Math.floor(index/r.layout.cols)+1,index%r.layout.cols+1,seat?(seat.label?seat.number+' '+seat.label:seat.number):'',seat?(seat.id||''):'']);
      });
    });
    table_(ss,'Assenze',['Stanza','Postazione','Descrizione','Dal','Al'],absences);
    table_(ss,'Piante',['Stanza','Riga','Colonna','Postazione','ID postazione'],positions);
    try{payload.pdf=savePdf_(body.pdf)}catch(err){payload.pdf={ok:false,error:!body.pdf?'PDF non aggiornato: ricarica l’app e ripeti l’invio.':'PDF non aggiornato: verifica l’accesso alla cartella Drive e riprova.'}}
    // Split JSON to stay below Google Sheets' per-cell character limit.
    const serialized=Utilities.base64Encode(JSON.stringify(payload),Utilities.Charset.UTF_8),chunks=[];
    for(let i=0;i<serialized.length;i+=20000)chunks.push([chunks.length,serialized.slice(i,i+20000)]);
    table_(ss,'SnapshotApp',['Parte','Snapshot JSON (base64)'],chunks);

    const log = sheet_(ss, LOG_SHEET);
    if (log.getLastRow() === 0) log.appendRow(['Data/ora','Righe','Generato dalla pagina','Versione schema']);
    log.appendRow([new Date(), rows.length, payload.generatedAt || '', payload.schemaVersion || '']);
    log.setFrozenRows(1);

    SpreadsheetApp.flush();
    console.log('Salvataggio completato: '+rows.length+' assegnazioni; snapshot e piante salvati nel documento configurato.');
    return json_({ok:true, rows:rows.length, generatedAt:payload.generatedAt});
  } catch (err) {
    return json_({ok:false, error:String(err && err.message || err)});
  } finally { if(lock.hasLock())lock.releaseLock(); }
}

function sheet_(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function table_(ss,name,headers,rows){
  const sh=sheet_(ss,name);sh.clearContents();
  if(sh.getMaxRows()<rows.length+1)sh.insertRowsAfter(sh.getMaxRows(),rows.length+1-sh.getMaxRows());
  if(sh.getMaxColumns()<headers.length)sh.insertColumnsAfter(sh.getMaxColumns(),headers.length-sh.getMaxColumns());
  sh.getRange(1,1,1,headers.length).setValues([headers]);
  if(rows.length)sh.getRange(2,1,rows.length,headers.length).setValues(rows);
  sh.setFrozenRows(1);
}

// Safe manual diagnostic: reads the configured destination without writing data.
function verificaCollegamento(){
  const ss=SpreadsheetApp.openById(SPREADSHEET_ID);
  const names=ss.getSheets().map(sh=>sh.getName());
  console.log('Documento raggiunto: '+ss.getName());
  console.log('URL: '+ss.getUrl());
  console.log('Schede presenti: '+names.join(', '));
  console.log(ss.getSheetByName('SnapshotApp')?'SnapshotApp presente. Per verificare i dati usa Verifica collegamento nell’app.':'SnapshotApp assente: nessun salvataggio completo presente in questo documento.');
  return {ok:true,spreadsheetId:SPREADSHEET_ID,sheets:names};
}

const PDF_FOLDER_ID='1FcoNaxY1AY-O0c63cFgsBpLmVJvEmnE4';
function savePdf_(document){
  const encoded=document&&document.base64;
  if(typeof encoded!=='string'||encoded.length>17*1024*1024||!/^JVBERi0[A-Za-z0-9+/]*={0,2}$/.test(encoded))throw new Error('Invalid PDF upload');
  const bytes=Utilities.base64Decode(encoded);
  if(bytes.length>12*1024*1024)throw new Error('PDF too large');
  const folder=DriveApp.getFolderById(PDF_FOLDER_ID),properties=PropertiesService.getScriptProperties();
  const blob=Utilities.newBlob(bytes,'application/pdf','Spazi BIO - Postazioni.pdf');
  let id=properties.getProperty('SPAZI_BIO_PDF_FILE_ID');
  if(id){
    const response=UrlFetchApp.fetch('https://www.googleapis.com/upload/drive/v3/files/'+encodeURIComponent(id)+'?uploadType=media',{method:'patch',contentType:'application/pdf',payload:blob.getBytes(),headers:{Authorization:'Bearer '+ScriptApp.getOAuthToken()},muteHttpExceptions:true});
    if(response.getResponseCode()<200||response.getResponseCode()>=300)throw new Error('Drive PDF update failed');
  }else{id=folder.createFile(blob).getId();properties.setProperty('SPAZI_BIO_PDF_FILE_ID',id)}
  return {ok:true,url:'https://drive.google.com/file/d/'+id+'/view'};
}
function abilitaArchivioPDF(){
  const folder=DriveApp.getFolderById(PDF_FOLDER_ID);
  console.log('Cartella PDF raggiunta: '+folder.getName());
  const response=UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(PDF_FOLDER_ID)+'?fields=id',{headers:{Authorization:'Bearer '+ScriptApp.getOAuthToken()},muteHttpExceptions:true});
  if(response.getResponseCode()!==200)throw new Error('Accesso API Drive non riuscito');
  console.log('Accesso PDF autorizzato. Cartella: '+folder.getUrl());
}
