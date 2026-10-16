const backend = 'http://127.0.0.1:3000';
let cleanupPending = Promise.resolve();
function abortable(promise, signal) {
  if (!signal) return promise;
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason || new DOMException('Aborted', 'AbortError'));
    signal.addEventListener('abort', abort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}
export async function connectVidu(stream, { image, duration, output, signal, onRemoteStream, onConnectionChange, onError,
  fetchImpl = fetch, WebSocketClass = WebSocket, loadEngine = () => import(chrome.runtime.getURL('vidu-rtc.js')).then(module => module.default) }) {
  let session, socket, engine, inputTrack, heartbeat, expiry, videoCallback, joinTask;
  let closed = false, delivered = false, rejectReady, metadataListener, stoppedSession;
  const headers = { 'Content-Type': 'application/json', 'X-Tryon-Extension': chrome.runtime.id };
  const send = message => { if (socket?.readyState === WebSocket.OPEN) { try { socket.send(JSON.stringify(message)); } catch {} } };
  function stopSession() {
    if (!session?.sessionId || stoppedSession === session.sessionId) return;
    stoppedSession = session.sessionId;
    void fetchImpl(backend + '/api/vidu/stop', { method: 'POST', headers, body: JSON.stringify({ sessionId: session.sessionId }), keepalive: true }).catch(() => {});
  }
  function disconnect() {
    if (closed) return;
    closed = true;
    clearInterval(heartbeat); clearTimeout(expiry);
    signal?.removeEventListener('abort', disconnect);
    rejectReady?.(new DOMException('Stopped', 'AbortError'));
    send({ action: 'hangup' });
    try { socket?.close(); } catch {}
    stopSession();
    if (videoCallback !== undefined) { try { output.cancelVideoFrameCallback(videoCallback); } catch {} }
    inputTrack?.stop();
    if (metadataListener) output.removeEventListener('loadedmetadata', metadataListener);
    // Stop billing/control first. SDK teardown can complete asynchronously.
    if (engine) {
      const previous = engine;
      try { void previous.leaveChannel().catch(() => {}); } catch {}
      cleanupPending = Promise.resolve(joinTask).catch(() => {}).then(async () => {
        try { await previous.stopPreview(); } catch {}
        try { await previous.destroy(); } catch {}
      });
    }
  }
  const fail = key => {
    if (closed) return;
    disconnect();
    if (!signal?.aborted) { if (onError) onError(key); else onConnectionChange('disconnected'); }
  };
  signal?.addEventListener('abort', disconnect, { once: true });
  const check = () => { signal?.throwIfAborted(); if (closed) throw new DOMException('Stopped', 'AbortError'); };
  try {
    await abortable(cleanupPending, signal); check();
    const Engine = await abortable(loadEngine(), signal); check();
    const support = await Engine.isSupported(); check();
    if (!support.support) throw new Error('当前浏览器不支持 Vidu 实时视频');
    engine = Engine.getInstance({ maxSignalingConnectRetryCount: 0 });
    engine.setChannelProfile('communication'); engine.setAudioOnlyMode(false);
    await engine.publishLocalAudioStream(false); engine.stopAudioCapture();
    engine.setDefaultSubscribeAllRemoteAudioStreams(false); engine.setDefaultSubscribeAllRemoteVideoStreams(true);
    // switchCamera's documented custom-track argument keeps the original camera
    // local and publishes the same center-cropped video as the Decart path.
    inputTrack = stream.getVideoTracks()[0].clone();
    await engine.switchCamera(undefined, inputTrack); check();
    await engine.publishLocalVideoStream(true); check();
    const bytes = new Uint8Array(await image.arrayBuffer());
    let binary = ''; for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
    const response = await fetchImpl(backend + '/api/vidu/session', { method: 'POST', headers,
      body: JSON.stringify({ image: 'data:' + image.type + ';base64,' + btoa(binary), duration }), signal });
    const data = await response.json();
    if (!response.ok) throw new Error(data.errorKey || 'Vidu 连接失败，请检查地区、网络和账户额度');
    session = data;
    if (closed) stopSession(); // A response can arrive after cancellation.
    check();
    if (!session.sessionId || !session.rtc?.token || !session.render_uid) throw new Error('Vidu 临时凭证响应不正确');
    expiry = setTimeout(() => fail('Vidu 会话已到安全时限'), Math.max(0, Number(session.expiresAt) - Date.now()));
    const url = new URL(backend.replace('http:', 'ws:') + '/api/vidu/control'); url.searchParams.set('session', session.sessionId);
    socket = new WebSocketClass(url.href);
    await new Promise((resolve, reject) => {
      rejectReady = reject;
      socket.addEventListener('open', () => {
        if (closed) { try { socket.close(); } catch {} return; }
        send({ action: 'heartbeat' }); heartbeat = setInterval(() => send({ action: 'heartbeat' }), 1000);
      });
      socket.addEventListener('message', event => {
        if (closed) return;
        let message; try { message = JSON.parse(event.data); } catch { return; }
        if (message.event === 'ready') { rejectReady = null; resolve(); }
        else if (message.event === 'stopped') {
          const key = message.reason === 'credit_insufficient' ? 'Vidu 积分不足，请前往对应地区的控制台充值' : 'Vidu 会话已停止，请主动点击试穿按钮重试';
          reject(new Error(key)); fail(key);
        }
      });
      for (const event of ['close', 'error']) socket.addEventListener(event, () => {
        if (closed) return;
        const key = 'Vidu 连接已中断，生成已停止'; reject(new Error(key)); fail(key);
      });
    });
    check(); onConnectionChange('generating');
    function received() {
      if (closed || delivered || !output.srcObject) return;
      delivered = true; onRemoteStream(output.srcObject);
      videoCallback = output.requestVideoFrameCallback(() => { if (!closed) send({ action: 'first-frame' }); });
    }
    engine.on('videoSubscribeStateChanged', (uid, oldState, state) => {
      if (closed || String(uid) !== session.render_uid || state !== 3) return;
      metadataListener = received;
      output.addEventListener('loadedmetadata', received, { once: true });
      engine.setRemoteViewConfig(output, uid, 1);
      received(); void output.play().catch(() => {});
    });
    engine.on('remoteUserOffLineNotify', uid => { if (String(uid) === session.render_uid) fail('Vidu 试穿画面已中断'); });
    engine.on('authInfoExpired', () => fail('Vidu 临时凭证已过期，请重新开始试穿'));
    engine.on('bye', () => fail('Vidu 会话已停止，请主动点击试穿按钮重试'));
    engine.on('connectionStatusChange', status => { if ([1,4,5].includes(status)) fail('Vidu 连接已中断，生成已停止'); });
    joinTask = engine.joinChannel(session.rtc.token, session.rtc.user_id);
    await abortable(joinTask, signal); check();
    return { disconnect, on() {} };
  } catch (error) {
    disconnect();
    if (signal?.aborted) throw signal.reason;
    if (typeof error?.message === 'string' && error.message.includes('Vidu')) throw error;
    throw new Error('Vidu 连接失败，请检查地区、网络和账户额度');
  }
}
