const {test}=require('node:test'),assert=require('node:assert/strict');
test('Deployment planning preserves private key, manifest and unrelated source files',async()=>{
 const {prepareRemoteFiles,canonicalFiles,sharedKey}=await import('../scripts/apps-script-update.mjs');
 const files=[{name:'appsscript',type:'JSON',source:'{"webapp":{"access":"ANYONE_ANONYMOUS","executeAs":"USER_DEPLOYING"}}'},{name:'Code',type:'SERVER_JS',source:"const SECRET = 'synthetic-test-key';\nfunction doPost(){}\nfunction old(){}"},{name:'Other',type:'SERVER_JS',source:'function unrelated(){}'}];
 const before=structuredClone(files),local="const SECRET = 'repository-placeholder';\nfunction doPost(){}\nfunction newFeature(){}";
 const updated=prepareRemoteFiles(files,local);
 assert.deepEqual(files,before);assert.deepEqual(updated[0],files[0]);assert.deepEqual(updated[2],files[2]);assert(updated[1].source.includes('newFeature'));assert(!updated[1].source.includes('repository-placeholder'));assert.equal(sharedKey(updated),'synthetic-test-key');assert.equal(canonicalFiles(updated),canonicalFiles([...updated].reverse()));
 assert.throws(()=>prepareRemoteFiles([files[0]],local));assert.throws(()=>prepareRemoteFiles([...files,{...files[1],name:'Duplicate'}],local));assert.throws(()=>sharedKey([{...files[1],source:'const SECRET = dangerous();\nfunction doPost(){}'}]));
});
