import vm from 'node:vm';
const secretDeclaration=/^[ \t]*const[ \t]+SECRET[ \t]*=[^\r\n]*;[ \t]*$/gm;
function declaration(source){const matches=source.match(secretDeclaration)||[];if(matches.length!==1)throw new Error('Serve una singola dichiarazione const SECRET nel backend. Nessun aggiornamento eseguito.');return matches[0]}
export function backendFile(files){
 const candidates=files.filter(f=>f.type==='SERVER_JS'&&/function\s+doPost\s*\(/.test(f.source||''));
 if(candidates.length!==1)throw new Error('Backend Google non univoco: aggiornamento interrotto.');
 declaration(candidates[0].source);return candidates[0];
}
export function prepareRemoteFiles(files,localSource){
 const backend=backendFile(files),remoteSecret=declaration(backend.source),localSecret=declaration(localSource);
 return files.map(file=>({name:file.name,type:file.type,source:file===backend?localSource.replace(localSecret,()=>remoteSecret):file.source}));
}
export function canonicalFiles(files){return JSON.stringify(files.map(({name,type,source})=>({name,type,source})).sort((a,b)=>a.name.localeCompare(b.name)))}
export function sharedKey(files){
 const source=declaration(backendFile(files).source);
 const match=source.match(/^\s*const\s+SECRET\s*=\s*((?:'(?:[^'\\\r\n]|\\[^\r\n])*'|"(?:[^"\\\r\n]|\\[^\r\n])*"))\s*;\s*$/);
 if(!match)throw new Error('La chiave non è una stringa letterale: verifica HTTP interrotta.');
 return vm.runInNewContext(match[1],Object.create(null),{timeout:100});
}
export function webApps(deployment){return (deployment.entryPoints||[]).filter(e=>e.entryPointType==='WEB_APP').map(e=>({url:e.webApp?.url,access:e.webApp?.entryPointConfig?.access,executeAs:e.webApp?.entryPointConfig?.executeAs}))}
