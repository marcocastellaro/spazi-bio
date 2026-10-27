// OAuth setup for the isolated Codex environment. Never prints authorization codes or tokens.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
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
 }else if(command==='check'){
   const credentials=readPrivate('tokens.json');client.setCredentials(credentials);
   client.on('tokens',tokens=>{Object.assign(credentials,tokens);savePrivate('tokens.json',credentials)});
   const require=createRequire(path.join(toolRoot,'package.json'));
   const {google}=require('googleapis');const api=google.script({version:'v1',auth:client});
   const [project,deployment]=await Promise.all([api.projects.get({scriptId:SCRIPT_ID}),api.projects.deployments.get({scriptId:SCRIPT_ID,deploymentId:DEPLOYMENT_ID})]);
   console.log('Accesso al progetto verificato:',project.data.title);
   console.log('Distribuzione esistente raggiungibile:',Boolean(deployment.data.deploymentId));
   console.log('Nessuna modifica eseguita.');
 }else fail('Comando non riconosciuto. Usa prepare, complete, status o check.');
}catch(error){
 const status=Number(error.response?.status)||null;
 const oauthError=error.response?.data?.error;
 const safeCode=typeof oauthError==='string'&&/^[a-z_]+$/.test(oauthError)?oauthError:null;
 console.error(error.publicMessage||`Operazione Google non completata${status?' (HTTP '+status+')':''}${safeCode?' · '+safeCode:''}. Verifica accesso di rete, consenso e abilitazione API Apps Script.`);
 process.exitCode=1;
}
