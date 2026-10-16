import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { WebSocket, WebSocketServer } from 'ws';
import { checkViduKey, createViduManager, publicViduError, viduHost } from '../helper/vidu.mjs';

const image='data:image/png;base64,aGVsbG8=';
const key='vda_synthetic_test_key_never_real';
async function fixture(t,{wait=0,initError=null,options={},delayCreate=0}={}) {
 const http=createServer();http.listen(0,'127.0.0.1');await once(http,'listening');
 const wss=new WebSocketServer({server:http});const signals=[];const sockets=[];
 wss.on('connection',socket=>{sockets.push(socket);socket.on('message',data=>{
  const signal=JSON.parse(data);signals.push(signal);
  if(signal.type===1)setTimeout(()=>{if(socket.readyState===1)socket.send(JSON.stringify({type:2,payload:{conn_init_ack:initError?{success:false,error_code:initError}:{success:true}}}));},wait);
 });});
 const requests=[];
 const fetchImpl=async(url,init={})=>{
  requests.push({url,init});
  if(delayCreate)await new Promise(r=>setTimeout(r,delayCreate));
  return Response.json(String(url).endsWith('/credits')?{remains:[]}:{live:{id:'live-123',live_duration:100},rtc:{token:'scoped-rtc',user_id:'person',token_expire_at:String(Math.floor(Date.now()/1000)+100)},render_uid:'render-only',client_secret:'server-control-only'});
 };
 class Upstream extends WebSocket {constructor(url,options){super('ws://127.0.0.1:'+http.address().port,options);}}
 const manager=createViduManager({getKey:()=>key,getRegion:()=> 'cn',fetchImpl,WebSocketClass:Upstream,leaseMs:100,attachMs:100,capMs:1000,...options});
 t.after(async()=>{manager.closeAll();for(const socket of sockets)socket.terminate();await new Promise(r=>wss.close(r));http.closeAllConnections();await new Promise(r=>http.close(r));});
 return {manager,requests,signals};
}
async function clientPair(t,manager,sessionId){
 const http=createServer();http.listen(0,'127.0.0.1');await once(http,'listening');
 const wss=new WebSocketServer({server:http});wss.on('connection',socket=>manager.connect(socket,sessionId));
 const browser=new WebSocket('ws://127.0.0.1:'+http.address().port);const events=[];browser.on('message',data=>events.push(JSON.parse(data)));await once(browser,'open');
 t.after(async()=>{browser.terminate();for(const socket of wss.clients)socket.terminate();await new Promise(r=>wss.close(r));http.closeAllConnections();await new Promise(r=>http.close(r));});
 return {browser,events};
}
async function until(predicate){for(let n=0;n<200;n++){if(predicate())return;await new Promise(r=>setTimeout(r,5));}assert.fail('condition did not become true');}

test('Vidu region hosts are allowlisted; checking a key only queries credits',async()=>{
 assert.equal(viduHost('cn'),'https://api.vidu.cn');assert.equal(viduHost('global'),'https://api.vidu.com');assert.throws(()=>viduHost('http://foreign'));
 let request;
 await checkViduKey(key,'cn',undefined,async(url,init)=>{request={url,init};return Response.json({remains:[]});});
 assert.equal(request.url,'https://api.vidu.cn/ent/v2/credits');assert.equal(request.init.method,'GET');assert.equal(request.init.headers.Authorization,'Token '+key);
});
test('Vidu session returns scoped RTC only, uses virtual_tryon, sends init then explicit hangup',async t=>{
 const f=await fixture(t);const result=await f.manager.create(image,10);
 assert.equal(f.requests[0].url,'https://api.vidu.cn/live/s_editing/realtime');
 assert.equal(JSON.parse(f.requests[0].init.body).editing_type,'virtual_tryon');
 assert.ok(!JSON.stringify(result).includes(key));assert.ok(!JSON.stringify(result).includes('server-control-only'));
 const c=await clientPair(t,f.manager,result.sessionId);await until(()=>c.events.some(e=>e.event==='ready'));
 f.manager.stop(result.sessionId);await until(()=>f.signals.some(s=>s.type===5));assert.deepEqual(f.signals.map(s=>s.type),[1,5]);
});
test('closing browser control immediately hangs up upstream; it never reconnects',async t=>{
 const f=await fixture(t);const result=await f.manager.create(image,20);const c=await clientPair(t,f.manager,result.sessionId);
 await until(()=>c.events.some(e=>e.event==='ready'));c.browser.close();await until(()=>f.signals.some(s=>s.type===5));
 assert.equal(f.requests.length,1);
});
test('orphaned creation is hung up without ever starting generation',async t=>{
 const f=await fixture(t);await f.manager.create(image,10);await until(()=>f.signals.some(s=>s.type===5));assert.ok(!f.signals.some(s=>s.type===1));
});
test('server lease stops a live session even without client stop',async t=>{
 const f=await fixture(t);const result=await f.manager.create(image,10);const c=await clientPair(t,f.manager,result.sessionId);
 await until(()=>c.events.some(e=>e.event==='ready'));await until(()=>f.signals.some(s=>s.type===5));
 assert.ok(c.events.some(e=>e.event==='stopped'));
});
test('aborted request is rejected before any upstream call',async t=>{
 const f=await fixture(t);const controller=new AbortController();controller.abort();
 await assert.rejects(f.manager.create(image,10,controller.signal));assert.equal(f.requests.length,0);
});
test('invalid duration/image and concurrent create are rejected before another upstream call',async t=>{
 const f=await fixture(t);await assert.rejects(f.manager.create(image,999));await assert.rejects(f.manager.create('http://foreign',10));assert.equal(f.requests.length,0);
 await f.manager.create(image,10);await assert.rejects(f.manager.create(image,10));assert.equal(f.requests.length,1);
});
test('Vidu errors expose a safe reason, never an upstream error message or credential',()=>{
 assert.match(publicViduError({status:400,reason:'CreditInsufficient'}).error,/积分/);
 assert.match(publicViduError({status:401,message:key}).error,/密钥/);
 assert.ok(!JSON.stringify(publicViduError({status:500,message:key})).includes(key));
});

test('absolute cap and first-frame timeout apply even while heartbeats continue',async t=>{
 for(const options of [{capMs:140},{firstFrameMs:140}]){
  await t.test(JSON.stringify(options),async t=>{const f=await fixture(t,{options});const result=await f.manager.create(image,10);const c=await clientPair(t,f.manager,result.sessionId);const heartbeat=setInterval(()=>{if(c.browser.readyState===1)c.browser.send(JSON.stringify({action:'heartbeat'}));},20);t.after(()=>clearInterval(heartbeat));await until(()=>c.events.some(e=>e.event==='stopped'));assert.equal(c.events.find(e=>e.event==='stopped').reason,options.capMs?'time_limit':'first_frame_timeout');await until(()=>f.signals.some(s=>s.type===5));});
 }
});
test('late create after cancellation or configuration change is hung up without init',async t=>{
 for(const change of ['abort','settings'])await t.test(change,async t=>{
  const f=await fixture(t,{delayCreate:50});const controller=new AbortController();const pending=f.manager.create(image,10,controller.signal);const rejected=assert.rejects(pending);await until(()=>f.requests.length===1);if(change==='abort')controller.abort();else f.manager.stopAll();await rejected;await until(()=>f.signals.some(s=>s.type===5));assert.ok(!f.signals.some(s=>s.type===1));
 });
});
