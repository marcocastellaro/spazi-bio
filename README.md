# Spazi BIO@DEI

Mini-app mobile-first per gestire le postazioni BIO@DEI.

## Stato attuale

- `index.html`: app standalone pensata per iPhone/mobile.
- Accesso protetto con password semplice lato client.
- Gestione per stanza/postazione.
- Per ogni posto: 1 assegnatario principale + massimo 2 utilizzatori temporanei.
- Date di inizio/fine per ogni utilizzatore.
- Vista calendario con barre temporali.
- Evidenziazione delle sovrapposizioni.
- Modifica diretta delle assegnazioni.
- Backup/export JSON e CSV.
- Salvataggio locale nel browser.
- Pulsante di invio verso Google Sheet tramite Google Apps Script.

## Google Sheet

`AppsScript_Spazi_BIO.gs` contiene il backend Apps Script da associare a un Google Sheet.
La pagina invia uno snapshot delle assegnazioni al Web App Apps Script.

## Deploy previsto

Repository GitHub: `marcocastellaro/spazi-bio`
Obiettivo: pubblicazione con GitHub Pages.

Nota: il repository esiste ma, dalla chat originale, il connettore GitHub vedeva il repository ma non aveva permesso di scrittura via API (403 Resource not accessible by integration).

## Password

La protezione attuale è volutamente leggera e solo lato client. Non deve essere considerata autenticazione forte.
Quando il progetto non viene usato, l'utente prevede di renderlo privato/disattivarlo.

## Prossimi miglioramenti desiderati

1. Collegare e verificare il pulsante `Invia` con Google Sheet.
2. Pubblicare su GitHub Pages.
3. Eventualmente sostituire la password client-side con autenticazione reale.
4. Aggiungere schemi fisici delle stanze quando disponibili.
5. Rendere ancora più immediata la vista mobile delle sovrapposizioni.

## File sorgente originario

Il progetto è derivato dal file Excel `Spazi_assegnisti_dottorandi_borsisti_bio_20260521.xlsx` e da verifiche fatte su email BIO-DEI relative a scadenze, visiting e periodi all'estero.

## Indicazione per Codex

Apri `index.html` come entrypoint. Mantieni il progetto statico e senza framework salvo necessità. Non rimuovere la compatibilità mobile/iPhone. Per modifiche strutturali, preserva l'import/export e il formato dati esistente quando possibile.
