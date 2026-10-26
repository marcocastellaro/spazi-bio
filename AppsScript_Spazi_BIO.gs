/**
 * Google Apps Script per "Spazi BIO@DEI".
 * Incollare questo codice in Estensioni > Apps Script del Google Sheet.
 * Cambiare SECRET con una chiave personale, poi distribuire come Web App.
 */

const SECRET = 'CAMBIA_QUESTA_CHIAVE';
const POSTAZIONI_SHEET = 'Postazioni';
const LOG_SHEET = 'StoricoInvii';

function doGet() {
  return ContentService.createTextOutput('Spazi BIO@DEI endpoint attivo');
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (!body.secret || body.secret !== SECRET) {
      return json_({ok:false, error:'unauthorized'});
    }
    const payload = body.payload || {};
    const rows = Array.isArray(payload.rows) ? payload.rows : [];
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = sheet_(ss, POSTAZIONI_SHEET);
    const headers = [
      'Stanza','Postazione','Tipo','Slot temporaneo','Nome','Cognome','Nome completo',
      'Dal','Al','Ruolo / note','Supervisore','Dipartimento','Giorni','Note','Riga origine Excel',
      'Ultimo invio'
    ];

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

    const log = sheet_(ss, LOG_SHEET);
    if (log.getLastRow() === 0) log.appendRow(['Data/ora','Righe','Generato dalla pagina','Versione schema']);
    log.appendRow([new Date(), rows.length, payload.generatedAt || '', payload.schemaVersion || '']);
    log.setFrozenRows(1);

    return json_({ok:true, rows:rows.length});
  } catch (err) {
    return json_({ok:false, error:String(err && err.message || err)});
  }
}

function sheet_(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
