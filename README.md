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
- Barra di utilizzo per ogni postazione basata sulle date Dal–Al impostate in alto. I periodi novembre–ottobre sono preselezioni; sono ammessi intervalli personalizzati.
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


## Diagnostica del collegamento

Il backend usa `SPREADSHEET_ID` per raggiungere esplicitamente il documento
Google Fogli indicato dall'utente. L'account che esegue il Web App deve poterlo
modificare. Dopo aver aggiornato il codice, pubblica una **nuova versione**
della distribuzione già esistente: il semplice salvataggio del file non
aggiorna l'URL `/exec`.

- Nell'app, **Configurazione → Verifica collegamento** controlla URL, chiave e
  lettura senza inviare o modificare dati. Distingue chiave non valida, script
  precedente, snapshot assente e lettura bloccata.
- Nell'editor Apps Script puoi eseguire **verificaCollegamento**: il log mostra
  nome, URL e schede del documento raggiunto, senza scrivere dati né mostrare
  la chiave. Se richiesto, autorizza l'accesso al foglio.
- Per un invio reale premi **Invia nell'app**, poi apri **Apps Script → Esecuzioni**
  e cerca la funzione `doPost` dello stesso orario. Non usare **Esegui** su
  `doPost`: senza una richiesta HTTP mancano dati e chiave.
- Nel documento Google Fogli, le schede `Postazioni`, `Assenze`, `Piante`,
  `SnapshotApp` e `StoricoInvii` sono linguette in basso. Non sono file separati.
- Il solo messaggio “Execution completed” non prova che i dati siano stati
  salvati: anche una richiesta rifiutata può terminare regolarmente.

La scheda **Postazioni** usa la stessa disposizione di **Piante**, comprese le
celle vuote. La ricerca mantiene le posizioni e segnala le celle escluse.
Su schermi piccoli ogni stanza scorre lateralmente per mantenere leggibili
le schede dettagliate senza cambiare la matrice.

## Accesso OAuth da Codex ad Apps Script

Per gestire codice e distribuzioni via API è necessario il consenso dell'account
Google proprietario del progetto. Il Web App URL e la chiave dell'app non
conferiscono questi permessi. Il progetto configurato è
`1htJJdXvV55-oMZGZCAhFYh1ouEZq6t8hvo12UFmtijCUq8VMz-J3CKqi`.

Il comando `scripts/google-oauth.mjs` usa il client OAuth ufficiale di
`@google/clasp` 3.4.1, installato fuori dal checkout:

```sh
npm --cache /workspace/.cache/npm install --prefix /workspace/spazi-bio-tools --no-audit --no-fund --save-exact @google/clasp@3.4.1
node scripts/google-oauth.mjs prepare
```

Prima del consenso, abilita l'API Apps Script nelle impostazioni dell'account:
https://script.google.com/home/usersettings . Il link stampato dal comando
richiede soltanto i permessi `script.projects`, `script.deployments` e
`script.webapp.deploy`. Il ritorno a `http://localhost:8888` segue il flusso
manuale di clasp: su un altro dispositivo la pagina può risultare irraggiungibile,
ma i parametri restituiti da Google restano nella barra indirizzi.

Nelle **impostazioni dell'ambiente**, inserisci il valore del parametro `code`
nel secret `APPS_SCRIPT_AUTH_CODE` e quello di `state` nella variabile
`APPS_SCRIPT_RETURN_STATE`. Non incollare in chat né il codice né l'intero URL
di ritorno. Il codice è monouso e scade rapidamente: completa la procedura
subito dopo il consenso. Dopo che i valori sono applicati all'ambiente:

```sh
node scripts/google-oauth.mjs complete
node scripts/google-oauth.mjs check
```

Il primo comando verifica `state` e scambia il codice con PKCE; il secondo
legge soltanto il progetto e la distribuzione esistente. Per il traffico
cloud servono `oauth2.googleapis.com` e `script.googleapis.com`, oltre ai domini
del Web App. Le credenziali sono conservate con permessi privati fuori dal
repository, in `/workspace/.private/spazi-bio-google`; non committarle né
stamparle nei log. `status` mostra solo se l'accesso è configurato. I percorsi
possono essere personalizzati con `SPAZI_BIO_GOOGLE_TOOLS` e
`SPAZI_BIO_GOOGLE_PRIVATE`.

Il test `tests/google-oauth.test.cjs` verifica preparazione, riuso della
richiesta, scope, PKCE, permessi dei file e rifiuto di uno state errato senza
contattare Google. Il collegamento OAuth e la lettura della distribuzione esistente sono stati
verificati nell'ambiente cloud. Per pubblicare, abilita l'API Apps Script per
l'account proprietario e usa i comandi descritti qui sotto.


## Pubblicazione Apps Script tramite API

Con OAuth già configurato:

```sh
node scripts/google-oauth.mjs inspect
node scripts/google-oauth.mjs deploy
node scripts/google-oauth.mjs verify
```

`inspect` confronta il backend del repository con il codice Google e la versione
pubblicata. `deploy` conserva la chiave `SECRET` presente su Google, il manifest e
gli altri file remoti; prepara un backup privato fuori Git, crea una versione
quando necessaria e aggiorna la distribuzione esistente. URL, modalità di
esecuzione e accesso vengono verificati dopo l'aggiornamento. Se sono cambiati,
il comando ripristina la versione della distribuzione precedente. Il codice
caricato viene confrontato con quello previsto, e un secondo invio a codice
invariato non crea un'altra versione.

`verify` legge lo snapshot dal Web App usando la chiave presente nel codice
pubblicato, senza stamparla e senza inviare dati al foglio. Le chiavi OAuth e
la chiave condivisa reale non devono essere committate nel repository.
Se Google risponde che l'API non è abilitata, attivala per l'account proprietario:
https://script.google.com/home/usersettings .

## Spostare le persone tra postazioni

In **Postazioni**, tocca un nome con il simbolo ↔ per scegliere stanza e
postazione di destinazione, oppure trascinalo su una scheda, anche di un'altra
stanza. Vicino al bordo dello schermo la vista scorre durante il trascinamento.
Dopo il rilascio scegli e conferma lo spostamento: nessuna assegnazione cambia
prima della conferma. Una destinazione occupata propone uno **scambio**.

I titolari restano titolari e portano con sé contratto e assenze. Gli utilizzatori
temporanei restano temporanei; puoi scegliere uno spazio libero oppure scambiare
uno dei due utilizzi esistenti. Il limite resta di due temporanei per postazione.
Numero, identità e coordinate delle scrivanie non cambiano.
Gli spostamenti si salvano sul dispositivo: premi **Invia** per condividerli sul
Google Sheet. In consultazione gli spostamenti sono disabilitati.

Sotto il nome del titolare è mostrata la **fine del contratto** con data completa;
la barra rappresenta solo l'intervallo Dal–Al selezionato, indipendentemente dalla durata del contratto.
Per gli utilizzatori temporanei le date sono etichettate come periodo di uso.


## Intervallo delle barre

In alto nella scheda **Postazioni**, scegli un **Periodo** novembre–ottobre
oppure modifica **Dal** e **Al**: in questo caso la selezione passa a
**Personalizzato**. Tutte le barre in Postazioni si aggiornano sullo stesso intervallo. Sulle schede non viene ripetuta l'intestazione “Utilizzo” con
le date; i mesi sotto la barra si adattano al periodo scelto. I nomi dei
subentranti restano nei tratti gialli e, toccandoli, si vedono le date del tratto.
Le date di inizio e fine sono inclusive; è possibile interrogare anche un solo
giorno. Un intervallo invertito o incompleto richiede una correzione senza
mostrare una barra fuorviante. Le scadenze contrattuali sotto i nomi rimangono
invariate quando si cambia l'intervallo di consultazione.


## Postazioni JOLLY e catalogo aggiornato

Le postazioni **11 della 209**, **11 della 301**, **9 del DEI/S** e **6 e 7 della 125** hanno l'etichetta **JOLLY**. La **9 della 209** non è più JOLLY.
Identificativi e numeri restano stabili; il nome completo compare nelle schede,
nelle piante, nei selettori, nei backup e nelle tabelle del foglio. La postazione
**12 della 301** è rimossa; la sua eventuale cella nella pianta resta libera.
La migrazione si applica anche ai dati già salvati nel browser e agli snapshot
letti dal Web App. Il backend applica le stesse regole agli invii provenienti
da browser con una versione precedente, evitando che reintroducano la 12.

Per modificare il catalogo condiviso tramite API, il comando
`node scripts/google-oauth.mjs backup-data` salva prima una copia privata dello
snapshot; `update-catalog` applica soltanto le regole del catalogo ai dati attuali,
verifica che il foglio non sia cambiato durante la preparazione, esegue un invio
e rilegge il risultato. Questi comandi non caricano i dati iniziali del repository
al posto delle modifiche salvate dall'utente.

## Stampa della scheda Postazioni

Il pulsante **🖨️ Stampa / PDF** apre il pannello di stampa del browser, da cui
scegliere **Salva come PDF**. Su iPhone usa le opzioni di stampa/condivisione
dell'anteprima per salvare il PDF. La stampa segue stanza, ricerca e intervallo
visualizzati nella scheda Postazioni.

Il layout è A4 orizzontale, con una stanza per pagina, mantenendo celle fisse,
postazioni JOLLY, barre colorate e scadenze. Menu, filtri e comandi dell'app
sono esclusi. Se il browser propone intestazioni/piè di pagina propri (URL e
numero pagina), puoi disabilitarli nelle opzioni del pannello di stampa.
