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
    return json_({ok:true,payload:JSON.parse(Utilities.newBlob(Utilities.base64Decode(chunks.join(''))).getDataAsString('UTF-8'))});
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
    const payload = body.payload || {};
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
      r.seats.forEach(seat=>(seat.absences||[]).forEach(a=>absences.push([r.name,seat.number,a.label||'Estero',a.start||'',a.end||''])));
      if(r.layout&&Array.isArray(r.layout.cells))r.layout.cells.forEach((key,index)=>{
        const seat=r.seats.find(s=>String(s.id==null?s.number:s.id)===String(key));
        positions.push([r.name,Math.floor(index/r.layout.cols)+1,index%r.layout.cols+1,seat?seat.number:'',seat?(seat.id||''):'']);
      });
    });
    table_(ss,'Assenze',['Stanza','Postazione','Descrizione','Dal','Al'],absences);
    table_(ss,'Piante',['Stanza','Riga','Colonna','Postazione','ID postazione'],positions);
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
