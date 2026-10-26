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
- Barra di utilizzo annuale per ogni postazione, dal 1 novembre al 31 ottobre (predefinito 2026–2027), con selettore dell’anno.
- Rosso: titolare presente; giallo: uso temporaneo; verde: disponibile, incluse le assenze del titolare. In caso di sovrapposizione la barra mostra l’uso temporaneo e rimane la segnalazione di conflitto.
- Una data di inizio vuota indica un’assegnazione già iniziata; una fine vuota indica un’assegnazione senza scadenza.
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


## Piante delle stanze

La scheda **Piante** contiene griglie a celle fisse: 209 3×4, 310 3×2,
301 3×4, 125 2×4, DEI/S 3×4. Per la stanza 305b, già presente nei dati,
si mantiene una griglia 2×2. Le postazioni iniziali sono disposte per riga.
Trascina una scrivania oppure selezionala e tocca la cella di destinazione.
Se la cella è occupata, le scrivanie si scambiano. Numero e assegnazioni
restano legati alla stessa scrivania. È possibile usare anche Tab e Invio.
La disposizione si salva sul dispositivo ed è inclusa nel backup JSON.

## Salvataggio completo nel Google Sheet e consultazione

Il nuovo backend conserva le schede `Postazioni`, `Assenze`, `Piante`,
`StoricoInvii` e `SnapshotApp`. Quest'ultima contiene lo stato completo
codificato in base64 e suddiviso in parti per rispettare i limiti delle celle.
Non modificarla manualmente: **Carica dal foglio** e **Consulta dal foglio**
ricostruiscono la vista da questo snapshot, non dalle altre schede.
Le modifiche manuali nelle tabelle del foglio non sono reimportate nell'app.

Per aggiornare il Web App già esistente:

1. Nel Google Sheet apri **Estensioni → Apps Script**.
2. Sostituisci il codice con `AppsScript_Spazi_BIO.gs` di questo repository,
   mantenendo in `SECRET` la chiave condivisa già configurata. Non pubblicare
   la chiave su GitHub e non inserirla in chat.
3. Usa **Distribuisci → Gestisci distribuzioni → Modifica → Nuova versione**
   e distribuisci l'aggiornamento del Web App esistente, mantenendo il suo URL.
   Il Web App deve essere eseguito con l'account che possiede il foglio e
   accessibile senza una pagina di login intermedia; le operazioni sui dati
   verificano la chiave condivisa.
4. Nell'app, in **Configurazione**, inserisci URL e chiave e salva la
   configurazione su ciascun dispositivo. Esporta un backup JSON prima del
   primo caricamento o invio.
5. Premi **Invia** per sostituire lo stato condiviso con quello di questo
   dispositivo. L'app rilegge lo snapshot e conferma il salvataggio soltanto
   quando corrisponde all'invio corrente.
6. Su un altro dispositivo, **Carica dal foglio** recupera i dati per modificarli;
   **Consulta dal foglio** li apre in sola lettura senza sovrascrivere i dati
   locali precedenti. **Torna alla modifica** salva sul dispositivo la vista
   caricata e riabilita l'editor.

Il caricamento richiede conferma prima di sostituire la vista corrente.
Gli invii sostituiscono l'ultimo snapshot: non viene effettuata una fusione
tra modifiche simultanee da dispositivi diversi. La consultazione è una
modalità dell'interfaccia, non un diverso permesso del backend; la stessa
chiave permette lettura e scrittura. L'app non aggiorna automaticamente
la vista: premi nuovamente **Consulta dal foglio** per ricaricarla.

## Controlli di sviluppo

Non è necessario un build. Avvia il server dalla radice del repository:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Il test del backend usa servizi Google simulati:

```sh
node --test tests/sheets-backend.test.cjs
```

Con il server attivo, Node, il modulo `playwright` e `/usr/bin/chromium`
disponibili nell'ambiente, verifica anche l'editor e il flusso di sincronizzazione:

```sh
node --test tests/layouts-browser.test.cjs tests/sheets-browser.test.cjs
```

I test usano sessioni browser isolate e richieste al Web App simulate:
non scrivono sul Google Sheet reale. La prova reale richiede l'aggiornamento
della distribuzione Apps Script e una verifica delle schede dopo un invio.
