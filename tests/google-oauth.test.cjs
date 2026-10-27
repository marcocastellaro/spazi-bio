const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawnSync}=require('node:child_process');
test('OAuth preparation requests limited scopes, reuses PKCE and rejects mismatched state without exposing credentials',()=>{
 const privateDir=fs.mkdtempSync(path.join(os.tmpdir(),'spazi-oauth-test-'));
 const script=path.join(__dirname,'../scripts/google-oauth.mjs');
 const run=(command,extra={})=>spawnSync(process.execPath,[script,command],{encoding:'utf8',env:{...process.env,APPS_SCRIPT_AUTH_CODE:'',APPS_SCRIPT_RETURN_STATE:'',SPAZI_BIO_GOOGLE_PRIVATE:privateDir,...extra}});
 try{
  const first=run('prepare');assert.equal(first.status,0,first.stderr);
  const url=new URL(first.stdout.trim());assert.equal(url.origin,'https://accounts.google.com');assert.equal(url.searchParams.get('code_challenge_method'),'S256');assert.equal(url.searchParams.get('access_type'),'offline');
  assert.deepEqual(url.searchParams.get('scope').split(' '),['https://www.googleapis.com/auth/script.projects','https://www.googleapis.com/auth/script.deployments','https://www.googleapis.com/auth/script.webapp.deploy']);
  const pending=JSON.parse(fs.readFileSync(path.join(privateDir,'pending.json'),'utf8'));assert(!first.stdout.includes(pending.codeVerifier));assert.equal(fs.statSync(path.join(privateDir,'pending.json')).mode&0o777,0o600);
  const second=run('prepare');assert.equal(second.stdout,first.stdout);
  const mismatch=run('complete',{APPS_SCRIPT_AUTH_CODE:'test-code-do-not-print',APPS_SCRIPT_RETURN_STATE:'wrong-state'});assert.equal(mismatch.status,1);assert(mismatch.stderr.includes('state'));assert(!mismatch.stderr.includes('test-code-do-not-print'));assert.equal(fs.existsSync(path.join(privateDir,'tokens.json')),false);
  const missing=run('complete');assert.equal(missing.status,1);assert(missing.stderr.includes('impostazioni ambiente'));
 }finally{fs.rmSync(privateDir,{recursive:true,force:true})}
});
