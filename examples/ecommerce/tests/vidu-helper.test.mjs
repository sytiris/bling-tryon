import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,stat,rm} from 'node:fs/promises';
import {join} from 'node:path';import {tmpdir} from 'node:os';
import {WebSocket} from 'ws';
import {createHelperServer} from '../helper/server.mjs';
import {EXTENSION_ID,EXTENSION_ORIGIN} from '../lib/extension-id.ts';
const decart='synthetic-decart-permanent';const vidu='vda_synthetic_permanent_not_real';
async function fixture(t){
 const dataDir=await mkdtemp(join(tmpdir(),'bling-vidu-helper-'));const checked=[];let creates=0;
 const server=await createHelperServer({dataDir,inheritedKey:'',inheritedViduKey:'',mintToken:async()=>({apiKey:'scoped'}),viduCheck:async(key,region)=>{checked.push({key,region});if(key.includes('invalid'))throw Object.assign(new Error(vidu),{status:401});},viduOptions:{fetchImpl:async()=>{creates++;return Response.json({live:{id:'fixture',live_duration:60},rtc:{token:'rtc-scoped',user_id:'camera',token_expire_at:Date.now()/1000+60},render_uid:'render',client_secret:'server-private'});},WebSocketClass:class{constructor(){throw new Error('No upstream network in route test');}}}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 t.after(async()=>{server.stopVidu();server.closeAllConnections();await new Promise(r=>server.close(r));await rm(dataDir,{recursive:true,force:true});});
 const html=await fetch(base+'/setup').then(r=>r.text());const csrf=html.match(/name="csrf-token" content="([^"]+)"/)[1];
 const post=(path,body,headers={Origin:base,'X-Bling-CSRF':csrf})=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
 const extension=(path,body,origin=EXTENSION_ORIGIN)=>post(path,body,{Origin:origin,'X-Tryon-Extension':EXTENSION_ID});
 return {base,post,extension,dataDir,checked,creates:()=>creates};
}
test('provider choice and separate private keys persist; validation never creates video',async t=>{
 const f=await fixture(t);await f.post('/api/settings',{apiKey:decart});
 assert.equal((await f.post('/api/provider',{provider:'vidu',viduRegion:'global'})).status,200);
 assert.equal((await f.post('/api/settings',{apiKey:'Token '+vidu})).status,200);
 assert.deepEqual(f.checked,[{key:vidu,region:'global'}]);assert.equal(f.creates(),0);
 for(const [file,key]of [['user.env',decart],['vidu.env',vidu]]){assert.ok((await readFile(join(f.dataDir,file),'utf8')).includes(key));if(process.platform!=='win32')assert.equal((await stat(join(f.dataDir,file))).mode&0o777,0o600);}
 assert.equal((await f.post('/api/settings',{apiKey:'vda_invalid_key'})).status,401);
 assert.ok((await readFile(join(f.dataDir,'vidu.env'),'utf8')).includes(vidu));
 const health=await fetch(f.base+'/api/health').then(r=>r.json());assert.equal(health.provider,'vidu');assert.equal(health.model,'vidu-s2-editing');assert.equal(health.configured,true);assert.equal(health.providers.decart.configured,true);assert.ok(!JSON.stringify(health).includes(vidu));
 assert.equal((await f.post('/api/provider',{provider:'foreign',viduRegion:'cn'})).status,400);
 assert.equal((await f.post('/api/provider',{provider:'decart',viduRegion:'global'},{Origin:'https://evil.example'})).status,403);
 await f.post('/api/settings/delete',{});assert.ok((await readFile(join(f.dataDir,'user.env'),'utf8')).includes(decart));
 await f.post('/api/provider',{provider:'decart',viduRegion:'cn'});assert.equal((await f.post('/api/status',{}).then(r=>r.json())).configured,true);
 const other=await createHelperServer({dataDir:f.dataDir,inheritedKey:'',inheritedViduKey:''});await new Promise(r=>other.listen(0,'127.0.0.1',r));t.after(()=>{other.stopVidu();other.closeAllConnections();other.close();});
 assert.equal((await fetch('http://127.0.0.1:'+other.address().port+'/api/health').then(r=>r.json())).provider,'decart');
});
test('Vidu session creation is extension-only and provider-specific; scoped response has no control secret',async t=>{
 const f=await fixture(t);const body={image:'data:image/png;base64,aGVsbG8=',duration:10};
 assert.equal((await f.extension('/api/vidu/session',body)).status,409);assert.equal(f.creates(),0);
 await f.post('/api/provider',{provider:'vidu',viduRegion:'cn'});await f.post('/api/settings',{apiKey:vidu});
 assert.equal((await f.extension('/api/vidu/session',body,'https://evil.example')).status,403);
 assert.equal((await f.extension('/api/extension-token',{duration:10})).status,409);
 const response=await f.extension('/api/vidu/session',body);assert.equal(response.status,200);const session=await response.json();assert.equal(session.rtc.token,'rtc-scoped');assert.ok(!JSON.stringify(session).includes(vidu));assert.ok(!JSON.stringify(session).includes('server-private'));
 for(const [id,origin]of [[session.sessionId,'https://evil.example'],['invalid',EXTENSION_ORIGIN]]){
  const status=await new Promise((resolve,reject)=>{const socket=new WebSocket(f.base.replace('http:','ws:')+'/api/vidu/control?session='+id,{origin});socket.on('unexpected-response',(_,r)=>{r.resume();resolve(r.statusCode);socket.terminate();});socket.on('error',()=>{});socket.on('open',()=>{socket.close();reject(new Error('Unauthorized WS accepted'));});});assert.equal(status,403);
 }
 assert.equal((await f.extension('/api/vidu/stop',{sessionId:session.sessionId})).status,200);assert.equal((await f.extension('/api/vidu/stop',{sessionId:session.sessionId})).status,200);
});
