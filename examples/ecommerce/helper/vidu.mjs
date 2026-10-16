import { randomBytes, randomUUID } from 'node:crypto';
import { WebSocket } from 'ws';
import { maxSessionSeconds } from '../lib/extension-policy.ts';

export function viduHost(region) {
  if (region === 'cn') return 'https://api.vidu.cn';
  if (region === 'global') return 'https://api.vidu.com';
  throw Object.assign(new Error('请选择 Vidu 中国站或全球站'), { status: 400, safe: true });
}
async function request(key, region, path, options, fetchImpl = fetch) {
  const response = await fetchImpl(viduHost(region) + path, {
    ...options, signal: AbortSignal.timeout(15000),
    headers: { Authorization: 'Token ' + key, 'Content-Type': 'application/json', Accept: 'application/json' },
  });
  let data;
  try { data = await response.json(); } catch { throw new Error('Invalid Vidu response'); }
  if (!response.ok) throw Object.assign(new Error('Vidu request failed'), { status: response.status, reason: String(data.reason || data.code || '') });
  return data;
}
export async function checkViduKey(key, region, signal, fetchImpl = fetch) {
  signal?.throwIfAborted();
  // Non-generating account request: never create a live session to validate a key.
  const data = await request(key, region, '/ent/v2/credits', { method: 'GET' }, fetchImpl);
  signal?.throwIfAborted();
  if (!Array.isArray(data.remains) && !Array.isArray(data.remaining_credits)) throw new Error('Invalid Vidu balance response');
}
export function publicViduError(error) {
  let status = error?.status;
  let message = '无法连接 Vidu，请检查网络和所选地区';
  if (status === 402 || /credit|balance/i.test(error?.reason || '')) { status = 402; message = 'Vidu 积分不足，请前往对应地区的控制台充值'; }
  else if (status === 401 || status === 403) message = 'Vidu 密钥无效、权限不足或与所选地区不匹配';
  else if (status === 429) message = 'Vidu 并发或请求过多，请稍后主动重试';
  else if (status === 400) message = 'Vidu 未接受试穿请求，请检查图片、地区及账户额度';
  return { status: [400,401,402,403,429].includes(status) ? status : 502, error: message };
}
const fail = message => Object.assign(new Error(message), { status: 400, safe: true });

// Own both the control socket and deadlines on the local server. The browser
// receives scoped RTC credentials plus an opaque control capability, never a key.
export function createViduManager({ getKey, getRegion, fetchImpl = fetch, WebSocketClass = WebSocket,
  leaseMs = 5000, attachMs = 5000, capMs, firstFrameMs = 30000 } = {}) {
  const sessions = new Map();
  let creating = false;
  let stopped = false;
  let revision = 0;
  const send = (socket, data) => { if (socket?.readyState === WebSocket.OPEN) { try { socket.send(JSON.stringify(data)); } catch {} } };
  function signal(entry, type, payload) {
    send(entry.remote, { type, live_id: entry.liveId, conn_id: entry.connId, seq_id: ++entry.sequence, payload });
  }
  function openRemote(entry, cleanupOnly = false) {
    const url = new URL(viduHost(entry.region).replace('https:', 'wss:') + '/live/ws/live/connect');
    url.searchParams.set('live_id', entry.liveId); url.searchParams.set('conn_id', entry.connId);
    if (entry.clientSecret) url.searchParams.set('client_secret', entry.clientSecret);
    const socket = new WebSocketClass(url.href, { headers: { Authorization: 'Token ' + entry.key }, handshakeTimeout: 5000, maxPayload: 65536 });
    entry.remote = socket;
    const terminate = setTimeout(() => { if (entry.closed || cleanupOnly) socket.terminate(); }, 6000);
    terminate.unref?.();
    socket.on('open', () => {
      clearTimeout(terminate);
      if (entry.closed || cleanupOnly) { signal(entry, 5, { hangup: { hangup_reason: 'user_end' } }); socket.close(); return; }
      signal(entry, 1, { conn_init: { version: 1 } });
    });
    socket.on('message', data => {
      if (entry.closed) return;
      let message; try { message = JSON.parse(data.toString()); } catch { return; }
      if (message.type === 2) {
        const ack = message.payload?.conn_init_ack;
        if (ack?.success === true) {
          entry.ready = true;
          send(entry.client, { event: 'ready' });
        } else if (ack?.error_code === 'NOT_READY') send(entry.client, { event: 'waiting' });
        else stop(entry.id, /credit/i.test(ack?.error_code || '') ? 'credit_insufficient' : 'connection_error');
      }
      if (message.type === 6) stop(entry.id, /credit/i.test(message.payload?.hangup?.hangup_reason || '') ? 'credit_insufficient' : 'remote_ended');
    });
    socket.on('error', () => { if (!entry.closed) stop(entry.id, 'connection_error'); });
    socket.on('close', () => { clearTimeout(terminate); if (!entry.closed) stop(entry.id, 'connection_error'); });
    // ws replies to Vidu ping frames automatically. No automatic reconnection.
  }
  function stop(id, reason = 'user_end') {
    const entry = sessions.get(id);
    if (!entry || entry.closed) return;
    entry.closed = true; sessions.delete(id);
    for (const timer of [entry.capTimer, entry.attachTimer, entry.frameTimer, entry.viewTimer]) clearTimeout(timer);
    clearInterval(entry.leaseTimer);
    send(entry.client, { event: 'stopped', reason });
    try { entry.client?.close(1000, 'session ended'); } catch {}
    if (!entry.remote) {
      try { openRemote(entry, true); } catch {}
    } else if (entry.remote.readyState === WebSocket.OPEN) {
      signal(entry, 5, { hangup: { hangup_reason: 'user_end' } }); entry.remote.close();
    }
    // If still CONNECTING, its open callback sends hangup without conn_init.
  }
  return {
    async create(image, duration, abortSignal) {
      let maxSeconds;
      try { maxSeconds = maxSessionSeconds(duration); }
      catch { throw fail('仅支持 10 秒或 20 秒试穿'); }
      if (typeof image !== 'string' || image.length > 2 * 1024 * 1024 || !/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(image)) throw fail('Vidu 服装图片无效或超过限制');
      if (stopped || creating || sessions.size) throw Object.assign(fail('已有 Vidu 会话，请先结束后再试'), { status: 409 });
      abortSignal?.throwIfAborted();
      const key = getKey(); const region = getRegion();
      if (!key) throw fail('请先在本地助手配置 Vidu API Key');
      viduHost(region); creating = true;
      const started = Date.now(); const createdRevision = revision;
      try {
        // Do not abort before parsing the ID: a late creation must be hung up.
        const data = await request(key, region, '/live/s_editing/realtime', { method: 'POST', body: JSON.stringify({ image_url: image, editing_type: 'virtual_tryon' }) }, fetchImpl);
        if (typeof data.live?.id !== 'string' || !data.live.id) throw new Error('Invalid Vidu session response');
        // Even a malformed/late response with a live ID must be hung up.
        const entry = { id: randomBytes(32).toString('base64url'), liveId: data.live.id, key, region, clientSecret: data.client_secret,
          connId: randomUUID(), sequence: 0, closed: false, ready: false, duration };
        sessions.set(entry.id, entry);
        if (typeof data.rtc?.token !== 'string' || !data.rtc.token || typeof data.rtc?.user_id !== 'string' || typeof data.render_uid !== 'string' || !data.render_uid) {
          stop(entry.id); throw new Error('Invalid Vidu session response');
        }
        const expiry = Number(data.rtc.token_expire_at) * 1000;
        const liveDuration = Number(data.live.live_duration) * 1000;
        const expiresAt = Math.min(started + (capMs ?? maxSeconds * 1000), expiry > 0 ? expiry : Infinity, liveDuration > 0 ? started + liveDuration : Infinity);
        entry.capTimer = setTimeout(() => stop(entry.id, 'time_limit'), Math.max(0, expiresAt - Date.now()));
        entry.attachTimer = setTimeout(() => stop(entry.id), attachMs);
        entry.frameTimer = setTimeout(() => stop(entry.id, 'first_frame_timeout'), firstFrameMs);
        if (abortSignal?.aborted || stopped || revision !== createdRevision) { stop(entry.id); abortSignal?.throwIfAborted(); throw new Error('Vidu creation cancelled'); }
        return { sessionId: entry.id, rtc: { token: data.rtc.token, user_id: data.rtc.user_id, token_expire_at: data.rtc.token_expire_at }, render_uid: data.render_uid, expiresAt };
      } finally { creating = false; }
    },
    has: id => sessions.has(id),
    connect(socket, id) {
      const entry = sessions.get(id);
      if (!entry || entry.client || entry.closed) { socket.close(1008, 'invalid session'); return; }
      entry.client = socket; entry.seenAt = Date.now(); clearTimeout(entry.attachTimer);
      entry.leaseTimer = setInterval(() => { if (Date.now() - entry.seenAt > leaseMs) stop(id, 'client_lost'); }, Math.max(20, Math.floor(leaseMs / 2)));
      socket.on('message', raw => {
        let message; try { message = JSON.parse(raw.toString()); } catch { return; }
        if (message.action === 'hangup') stop(id);
        else if (message.action === 'heartbeat') entry.seenAt = Date.now();
        else if (message.action === 'first-frame' && entry.ready && !entry.sawFrame) {
          entry.sawFrame = true; clearTimeout(entry.frameTimer);
          entry.viewTimer = setTimeout(() => stop(id, 'time_limit'), entry.duration * 1000 + 1500);
        }
      });
      socket.on('close', () => stop(id)); socket.on('error', () => stop(id));
      try { openRemote(entry); } catch { stop(id, 'connection_error'); }
    },
    stop,
    stopAll() { revision++; for (const id of [...sessions.keys()]) stop(id, 'configuration_changed'); },
    closeAll() { stopped = true; for (const id of [...sessions.keys()]) stop(id); },
  };
}
