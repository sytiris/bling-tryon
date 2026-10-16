import test from 'node:test';import assert from 'node:assert/strict';
import {connectVidu} from '../extension/src/vidu.mjs';
const pause=()=>new Promise(r=>setTimeout(r,0));
async function until(test){for(let i=0;i<100;i++){if(test())return;await pause();}assert.fail('condition not reached');}
function fixture(t,{delayJoin=false,delayCreate=false}={}){
 t.mock.method(globalThis,'fetch',async()=>{throw new Error('Unexpected external request');});const previousChrome=globalThis.chrome;globalThis.chrome={runtime:{id:'synthetic-extension'}};t.after(()=>{if(previousChrome===undefined)delete globalThis.chrome;else globalThis.chrome=previousChrome;});
 const input={readyState:'live',clone(){const track={readyState:'live',stop(){this.readyState='ended';}};clones.push(track);return track;}};const clones=[];const requests=[];const sockets=[];const errors=[];const received=[];let engine,finishJoin,finishCreate;
 class Engine{
  static async isSupported(){return {support:true};}static getInstance(){engine=new Engine();return engine;}
  constructor(){this.events={};this.leaves=0;this.destroyed=false;}on(name,fn){this.events[name]=fn;}
  setChannelProfile(){}setAudioOnlyMode(){}async publishLocalAudioStream(enabled){assert.equal(enabled,false);}stopAudioCapture(){}setDefaultSubscribeAllRemoteAudioStreams(enabled){assert.equal(enabled,false);}setDefaultSubscribeAllRemoteVideoStreams(){}
  async switchCamera(device,track){this.track=track;}async publishLocalVideoStream(){}
  joinChannel(){this.events.connectionStatusChange?.(3);return delayJoin?new Promise(r=>finishJoin=r):Promise.resolve();}
  setRemoteViewConfig(output,uid){assert.equal(uid,'renderer');output.srcObject={id:'synthetic-output'};}
  async leaveChannel(){this.leaves++;}async stopPreview(){}async destroy(){this.destroyed=true;}
 }
 class Socket extends EventTarget{constructor(){super();this.readyState=0;this.sent=[];sockets.push(this);queueMicrotask(()=>{this.readyState=1;this.dispatchEvent(new Event('open'));this.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({event:'ready'})}));});}send(data){this.sent.push(JSON.parse(data));}close(){this.readyState=3;}}
 const credentials={sessionId:'opaque-session',rtc:{token:'ephemeral-only',user_id:'camera'},render_uid:'renderer',expiresAt:Date.now()+60000};
 const fetchImpl=async(url,init)=>{requests.push(url);if(url.endsWith('/stop'))return Response.json({ok:true});if(delayCreate)await new Promise(r=>finishCreate=r);return Response.json(credentials);};
 const output=Object.assign(new EventTarget(),{srcObject:null,play:async()=>{},requestVideoFrameCallback:()=>1,cancelVideoFrameCallback(){}});const controller=new AbortController();
 const connect=()=>connectVidu({getVideoTracks:()=>[input]},{image:new Blob(['shirt'],{type:'image/png'}),duration:10,output,signal:controller.signal,fetchImpl,WebSocketClass:Socket,loadEngine:async()=>Engine,onRemoteStream:s=>received.push(s),onConnectionChange(){},onError:key=>errors.push(key)});
 return {connect,input,clones,requests,sockets,errors,received,controller,engine:()=>engine,finishJoin:()=>finishJoin(),finishCreate:()=>finishCreate()};
}
test('Vidu adapter accepts connected state, renders only output UID and stops without closing original camera',async t=>{
 const f=fixture(t);const connection=await f.connect();assert.equal(f.errors.length,0);const engine=f.engine();engine.events.videoSubscribeStateChanged('another-user',0,3);assert.equal(f.received.length,0);engine.events.videoSubscribeStateChanged('renderer',0,3);assert.equal(f.received.length,1);
 connection.disconnect();assert.ok(f.sockets[0].sent.some(m=>m.action==='hangup'));assert.equal(f.requests.filter(u=>u.endsWith('/stop')).length,1);assert.equal(f.clones[0].readyState,'ended');assert.equal(f.input.readyState,'live');await until(()=>engine.destroyed);
});
test('cancel during late RTC join stops billing immediately and destroys SDK when join settles',async t=>{
 const f=fixture(t,{delayJoin:true});const pending=f.connect();const rejected=assert.rejects(pending,{name:'AbortError'});await until(()=>Boolean(f.engine()?.events.connectionStatusChange)&&f.sockets.length===1);await pause();f.controller.abort();await rejected;assert.equal(f.requests.filter(u=>u.endsWith('/stop')).length,1);assert.ok(f.engine().leaves>0);f.finishJoin();await until(()=>f.engine().destroyed);assert.equal(f.requests.filter(u=>u.endsWith('/session')).length,1);
});
test('late create response after cancel is explicitly stopped and never opens RTC/control',async t=>{
 const f=fixture(t,{delayCreate:true});const pending=f.connect();const rejected=assert.rejects(pending,{name:'AbortError'});await until(()=>f.requests.some(u=>u.endsWith('/session')));f.controller.abort();f.finishCreate();await rejected;assert.equal(f.requests.filter(u=>u.endsWith('/stop')).length,1);assert.equal(f.sockets.length,0);await until(()=>f.engine().destroyed);
});
test('control failure stops without automatic reconnect or provider fallback',async t=>{
 const f=fixture(t);await f.connect();f.sockets[0].dispatchEvent(new Event('close'));assert.equal(f.errors.length,1);assert.equal(f.requests.filter(u=>u.endsWith('/stop')).length,1);assert.equal(f.sockets.length,1);await until(()=>f.engine().destroyed);
});
