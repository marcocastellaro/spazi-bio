# Spazi BIO@DEI

Mini-app mobile-first per gestire le postazioni BIO@DEI.

## Stato attuale

- `index.html`: app standalone pensata per iPhone/mobile.
- Accesso protetto con password semplice lato client.
- Gestione per stanza/postazione.
- Per ogni posto: 1 assegnatario principale + massimo 2 utilizzatori temporanei.
- Date di inizio/fine per ogni utilizzatore.
- Per ogni postazione: **massimo 1 periodo all'estero/assenza** del titolare.
- Il periodo all'estero è mostrato come **finestra verde** nella timeline, con date visibili.
- Durante il periodo all'estero la postazione viene considerata libera per gli assegnatari temporanei.
- Le sovrapposizioni vengono segnalate solo quando un temporaneo occupa la postazione mentre il titolare risulta presente, oppure quando i due temporanei si sovrappongono.
- Vista calendario compatta con barre temporali e conflitti.
- Backup/export JSON e CSV.
- Salvataggio locale nel browser.
- Pulsante di invio verso Google Sheet tramite Google Apps Script.

## Google Sheet

`AppsScript_Spazi_BIO.gs` contiene il backend Apps Script da associare a un Google Sheet.
La pagina invia uno snapshot delle assegnazioni al Web App Apps Script.

Nota per Codex: se si vuole sincronizzare anche il periodo all'estero in colonne dedicate nel foglio `Postazioni`, aggiornare insieme `snapshotPayload()` in `index.html` e gli header/valori in `AppsScript_Spazi_BIO.gs`.

## Deploy previsto

Repository GitHub: `marcocastellaro/spazi-bio`
Obiettivo: pubblicazione con GitHub Pages.

Nella chat originale il repository risultava visibile, ma l'integrazione GitHub non consentiva la sostituzione di `index.html`; per questo questo ZIP è pensato per essere consegnato direttamente a Codex.

## Password

La protezione attuale è volutamente leggera e solo lato client. Non deve essere considerata autenticazione forte.
Quando il progetto non viene usato, l'utente prevede di renderlo privato/disattivarlo.

## Vincoli da mantenere

1. Mobile-first e comodo da usare su iPhone.
2. Progetto statico, senza framework salvo reale necessità.
3. Una postazione = 1 principale + massimo 2 temporanei.
4. Massimo 1 periodo all'estero/assenza per il principale.
5. Periodo all'estero chiaramente distinguibile per colore e con date leggibili.
6. Un temporaneo interamente compreso nella finestra all'estero non deve generare conflitto con il principale.
7. Preservare import/export JSON e compatibilità con dati locali esistenti quando possibile.
8. Preservare pulsante `Invia` e configurazione Google Sheet.

## File sorgente originario

Il progetto è derivato dal file Excel `Spazi_assegnisti_dottorandi_borsisti_bio_20260521.xlsx` e da verifiche su email BIO-DEI relative a scadenze, visiting e periodi all'estero.

## Indicazione per Codex

Apri `index.html` come entrypoint. Prima di modificare il modello dati, controlla le funzioni `migrateOld`, `seatConflicts`, `primaryTempConflicts`, `timelineHtml`, `openEdit` e `snapshotPayload`.
