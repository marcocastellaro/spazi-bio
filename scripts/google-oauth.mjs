// OAuth setup for the isolated Codex environment. Never prints authorization codes or tokens.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {prepareRemoteFiles,canonicalFiles,sharedKey,webApps} from './apps-script-update.mjs';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const toolRoot=process.env.SPAZI_BIO_GOOGLE_TOOLS||path.resolve(repo,'../spazi-bio-tools');
const privateRoot=process.env.SPAZI_BIO_GOOGLE_PRIVATE||path.resolve(repo,'../.private/spazi-bio-google');
const SCRIPT_ID='1htJJdXvV55-oMZGZCAhFYh1ouEZq6t8hvo12UFmtijCUq8VMz-J3CKqi';
const DEPLOYMENT_ID='AKfycbx5pnFxJvtEFBrIaja06MZ4UDmH5VaTIl09HdO-K4NBrNOIpPdqbuGWIZg9wjhafque';
const scopes=['https://www.googleapis.com/auth/script.projects','https://www.googleapis.com/auth/script.deployments','https://www.googleapis.com/auth/script.webapp.deploy'];
function fail(message){const error=new Error(message);error.publicMessage=message;throw error}
function savePrivate(name,data){fs.mkdirSync(privateRoot,{recursive:true,mode:0o700});fs.writeFileSync(path.join(privateRoot,name),JSON.stringify(data),{mode:0o600});}
function readPrivate(name){const p=path.join(privateRoot,name);if(!fs.existsSync(p))fail('Accesso non ancora configurato: esegui prima prepare, poi complete.');return JSON.parse(fs.readFileSync(p,'utf8'))}
const command=process.argv[2]||'status';
let stage='initialization';
try{
 const {getUnauthorizedOuth2Client}=await import(pathToFileURL(path.join(toolRoot,'node_modules/@google/clasp/build/src/auth/auth.js')).href);
 const client=getUnauthorizedOuth2Client();
 if(command==='prepare'){
   const pendingPath=path.join(privateRoot,'pending.json');
   let pending;
   if(fs.existsSync(pendingPath)&&!process.argv.includes('--renew'))pending=readPrivate('pending.json');
   else{
     const {codeVerifier,codeChallenge}=await client.generateCodeVerifierAsync();
     const state=crypto.randomBytes(24).toString('hex'),redirectUri='http://localhost:8888';
     const url=client.generateAuthUrl({redirect_uri:redirectUri,access_type:'offline',prompt:'consent',scope:scopes,state,code_challenge:codeChallenge,code_challenge_method:'S256'});
     pending={codeVerifier,state,redirectUri,url,createdAt:new Date().toISOString()};savePrivate('pending.json',pending);
   }
   console.log(pending.url);
 }else if(command==='complete'){
   const code=process.env.APPS_SCRIPT_AUTH_CODE,state=process.env.APPS_SCRIPT_RETURN_STATE;
   if(!code)fail('Inserisci il codice OAuth nel secret APPS_SCRIPT_AUTH_CODE delle impostazioni ambiente. Non inserirlo in chat.');
   const pending=readPrivate('pending.json');
   if(!state||state!==pending.state)fail('Il parametro state ricevuto dal browser manca o non corrisponde alla richiesta OAuth.');
   const result=await client.getToken({code,codeVerifier:pending.codeVerifier,redirect_uri:pending.redirectUri});
   if(!result.tokens.refresh_token)fail('Google non ha restituito un refresh token. Ripeti il consenso con prepare --renew.');
   savePrivate('tokens.json',result.tokens);fs.unlinkSync(path.join(privateRoot,'pending.json'));
   console.log('OAuth completato. Credenziali conservate fuori dal repository; nessun codice pubblicato.');
 }else if(command==='status'){
   console.log('OAuth configurato:',fs.existsSync(path.join(privateRoot,'tokens.json')));
   console.log('Richiesta di consenso preparata:',fs.existsSync(path.join(privateRoot,'pending.json')));
 }else if(['check','inspect','deploy','verify','backup-data','update-catalog','refresh-pdf','upload'].includes(command)){
   const credentials=readPrivate('tokens.json');client.setCredentials(credentials);
   client.on('tokens',tokens=>{Object.assign(credentials,tokens);savePrivate('tokens.json',credentials)});
   const require=createRequire(path.join(toolRoot,'package.json'));
   const {google}=require('googleapis');const api=google.script({version:'v1',auth:client});
   if(command==='check'){
     const [project,deployment]=await Promise.all([api.projects.get({scriptId:SCRIPT_ID}),api.projects.deployments.get({scriptId:SCRIPT_ID,deploymentId:DEPLOYMENT_ID})]);
     console.log('Accesso al progetto verificato:',project.data.title);
     console.log('Distribuzione esistente raggiungibile:',Boolean(deployment.data.deploymentId));
     console.log('Nessuna modifica eseguita.');
   }else{
     const deployment=(await api.projects.deployments.get({scriptId:SCRIPT_ID,deploymentId:DEPLOYMENT_ID})).data;
     const config=deployment.deploymentConfig;
     const live=(await api.projects.getContent({scriptId:SCRIPT_ID,versionNumber:config.versionNumber})).data.files;
     if(['verify','backup-data','update-catalog','refresh-pdf'].includes(command)){
       const key=sharedKey(live),apps=webApps(deployment);if(apps.length!==1)fail('Web App non univoco: verifica interrotta.');
       const url=new URL(apps[0].url);url.searchParams.set('action','load');url.searchParams.set('secret',key);url.searchParams.set('_',String(Date.now()));
       const {request}=require('gaxios');
       const response=await request({url:url.toString(),timeout:30000,responseType:'json'});
       if(!response.data?.ok||!Array.isArray(response.data.payload?.rooms))fail('Il Web App non restituisce uno snapshot valido con la chiave Google esistente. Nessun invio al foglio eseguito.');
       if(command==='backup-data'){savePrivate('data-backup-'+Date.now()+'.json',response.data.payload);console.log('Backup completo del foglio salvato privatamente. Nessun dato modificato.');}
       else if(command==='update-catalog'||command==='refresh-pdf'){
         const currentBackend=prepareRemoteFiles(live,fs.readFileSync(path.join(repo,'AppsScript_Spazi_BIO.gs'),'utf8'));
         if(canonicalFiles(currentBackend)!==canonicalFiles(live))fail('Il Web App non espone ancora il backend aggiornato. Attendi la propagazione e riprova.');
         const original=response.data.payload;
         savePrivate('data-backup-'+Date.now()+'.json',original);
         const html=fs.readFileSync(path.join(repo,'index.html'),'utf8'),match=html.match(/function applySeatCatalog\(data\)\{[\s\S]*?\n\}/);
         if(!match)fail('Regole del catalogo non trovate. Nessun invio eseguito.');
         const {runInNewContext}=await import('node:vm');const transform=runInNewContext(match[0]+';applySeatCatalog',Object.create(null),{timeout:1000});
         const next=command==='update-catalog'?transform(JSON.parse(JSON.stringify(original))):JSON.parse(JSON.stringify(original));next.generatedAt=new Date().toISOString();
         const {chromium}=require('playwright');const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true});let pdf;
         try{
           const page=await browser.newPage({viewport:{width:1280,height:900}});
           await page.goto('http://127.0.0.1:8000/');
           pdf=await page.evaluate(async payload=>{
             state=migrateOld({rooms:payload.rooms});
             if(payload.viewRange){document.getElementById('rangeStart').value=payload.viewRange.start;document.getElementById('rangeEnd').value=payload.viewRange.end}
             render();return {base64:(await buildPostazioniPdf()).base64};
           },next);
         }finally{await browser.close()}

         const fresh=await request({url:url.toString(),timeout:30000,responseType:'json'});
         if(!fresh.data?.ok||JSON.stringify(fresh.data.payload)!==JSON.stringify(original))fail('Il foglio è cambiato durante la preparazione. Nessun invio eseguito.');
         const result=await request({url:apps[0].url,method:'POST',data:JSON.stringify({secret:key,payload:next,pdf}),headers:{'Content-Type':'text/plain;charset=utf-8'},timeout:60000,responseType:'json'});
         if(!result.data?.ok)fail('Aggiornamento catalogo non confermato dal Web App.');
         url.searchParams.set('_',String(Date.now()));const verified=await request({url:url.toString(),timeout:30000,responseType:'json'});
         if(!verified.data?.ok||verified.data.payload.generatedAt!==next.generatedAt||JSON.stringify(verified.data.payload.rooms)!==JSON.stringify(next.rooms))fail('Aggiornamento inviato ma controllo dello snapshot non riuscito.');
         if(!verified.data.payload.pdf?.ok)fail('Dati salvati ma PDF non aggiornato.');
         console.log(command==='refresh-pdf'?'PDF rigenerato con la vista di stampa e verificato.':'Catalogo condiviso e PDF aggiornati e verificati.');console.log('PDF:',verified.data.payload.pdf.url);
       }
       if(command==='verify'){console.log('Web App verificato in lettura; snapshot disponibile.');const pdf=response.data.payload.pdf;if(pdf)console.log(pdf.ok?'PDF confermato: '+pdf.url:'PDF non aggiornato: '+pdf.error);}
       console.log('Versione:',config.versionNumber,'· Stanze:',response.data.payload.rooms.length,'· Schema:',response.data.payload.schemaVersion);
       if(!['update-catalog','refresh-pdf'].includes(command))console.log('Nessun dato scritto nel foglio.');
     }else{
       const head=(await api.projects.getContent({scriptId:SCRIPT_ID})).data.files;
       let files;try{files=prepareRemoteFiles(head,fs.readFileSync(path.join(repo,'AppsScript_Spazi_BIO.gs'),'utf8'))}catch(e){fail(e.message)}
       const headChanged=canonicalFiles(head)!==canonicalFiles(files),liveChanged=canonicalFiles(live)!==canonicalFiles(files);
       console.log('Codice da sincronizzare:',headChanged,'· Distribuzione da aggiornare:',liveChanged);
       console.log('Chiave Google e altri file preservati. Versione corrente:',config.versionNumber);
       if(command==='inspect'){const manifest=JSON.parse(head.find(f=>f.type==='JSON'&&f.name==='appsscript')?.source||'{}');console.log('Scope del manifest:',manifest.oauthScopes||'automatici');console.log('Nessuna modifica eseguita.');}
       else if(command==='upload'){savePrivate('backup-'+Date.now()+'.json',{files:head,deployment});const fresh=(await api.projects.getContent({scriptId:SCRIPT_ID})).data.files;if(canonicalFiles(fresh)!==canonicalFiles(head))fail('Il progetto è cambiato: caricamento interrotto.');if(headChanged)await api.projects.updateContent({scriptId:SCRIPT_ID,requestBody:{files}});const uploaded=(await api.projects.getContent({scriptId:SCRIPT_ID})).data.files;if(canonicalFiles(uploaded)!==canonicalFiles(files))fail('Controllo caricamento non riuscito');console.log('Codice caricato nell’editor Google. Distribuzione esistente invariata.');}
       else if(headChanged||liveChanged){
         const backupName='backup-'+Date.now()+'.json';savePrivate(backupName,{files:head,deployment});
         const fresh=(await api.projects.getContent({scriptId:SCRIPT_ID})).data.files;
         if(canonicalFiles(fresh)!==canonicalFiles(head))fail('Il progetto è cambiato durante la preparazione: nessun file sovrascritto.');
         if(headChanged)await api.projects.updateContent({scriptId:SCRIPT_ID,requestBody:{files}});
         const uploaded=(await api.projects.getContent({scriptId:SCRIPT_ID})).data.files;
         if(canonicalFiles(uploaded)!==canonicalFiles(files))fail('Il controllo del codice caricato non corrisponde: distribuzione non aggiornata.');
         if(liveChanged){
           stage='create-version';
           const version=(await api.projects.versions.create({scriptId:SCRIPT_ID,requestBody:{description:'Spazi BIO · aggiornamento da repository'}})).data;
           stage='update-deployment';
           await api.projects.deployments.update({scriptId:SCRIPT_ID,deploymentId:DEPLOYMENT_ID,requestBody:{deploymentConfig:{...config,versionNumber:version.versionNumber}}});
           const updated=(await api.projects.deployments.get({scriptId:SCRIPT_ID,deploymentId:DEPLOYMENT_ID})).data;
           if(JSON.stringify(webApps(updated))!==JSON.stringify(webApps(deployment))){
             await api.projects.deployments.update({scriptId:SCRIPT_ID,deploymentId:DEPLOYMENT_ID,requestBody:{deploymentConfig:config}});
             fail('Le impostazioni Web App sono cambiate: ripristinata la distribuzione precedente.');
           }
           const published=(await api.projects.getContent({scriptId:SCRIPT_ID,versionNumber:version.versionNumber})).data.files;
           if(canonicalFiles(published)!==canonicalFiles(files))fail('Contenuto pubblicato non corrispondente: verificare la distribuzione.');
           console.log('Distribuzione aggiornata alla versione',version.versionNumber);
         }
         console.log('Codice verificato; URL, accesso e chiave mantenuti. Backup privato creato.');
       }else console.log('Codice e distribuzione sono già allineati.');
     }
   }
 }else fail('Comando non riconosciuto. Usa prepare, complete, status, check, inspect, deploy o verify.');
}catch(error){
 const status=Number(error.response?.status)||null;
 if(status===403){const remote=error.response?.data?.error;console.error('Google API:',stage,'·',remote?.status||'PERMISSION_DENIED');if(typeof remote?.message==='string')console.error(remote.message.replace(/https?:\/\/\S+/g,'[link Google]'));}
 const oauthError=error.response?.data?.error;
 const safeCode=typeof oauthError==='string'&&/^[a-z_]+$/.test(oauthError)?oauthError:null;
 console.error(error.publicMessage||`Operazione Google non completata${status?' (HTTP '+status+')':''}${safeCode?' · '+safeCode:''}. Verifica accesso di rete, consenso e abilitazione API Apps Script.`);
 process.exitCode=1;
}
