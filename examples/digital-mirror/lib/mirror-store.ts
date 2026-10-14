const CONTROLLER_STALE_MS = 10_000;
const SESSION_EXPIRE_MS = 30 * 60 * 1000;

interface Session {
  lastActive: number;
}

interface Controller {
  controllerId: string;
  lastPing: number;
}

interface Selection {
  itemId: string;
  timestamp: number;
}

interface MirrorStore {
  sessions: Map<string, Session>;
  controllers: Map<string, Controller>;
  selections: Map<string, Selection>;
}

// Survive HMR in dev
const globalStore = globalThis as unknown as { __mirrorStore?: MirrorStore };

function getStore(): MirrorStore {
  if (!globalStore.__mirrorStore) {
    globalStore.__mirrorStore = {
      sessions: new Map(),
      controllers: new Map(),
      selections: new Map(),
    };
  }
  return globalStore.__mirrorStore;
}

// Session management

export function createSession(sessionId: string): void {
  getStore().sessions.set(sessionId, { lastActive: Date.now() });
}

export function getSession(sessionId: string): Session | null {
  const s = getStore().sessions.get(sessionId);
  if (!s) return null;
  if (Date.now() - s.lastActive > SESSION_EXPIRE_MS) {
    getStore().sessions.delete(sessionId);
    return null;
  }
  s.lastActive = Date.now();
  return s;
}

// Controller management

export function claimController(
  sessionId: string,
  controllerId: string
): boolean {
  const store = getStore();
  const existing = store.controllers.get(sessionId);
  if (existing && Date.now() - existing.lastPing < CONTROLLER_STALE_MS) {
    return false;
  }
  store.controllers.set(sessionId, { controllerId, lastPing: Date.now() });
  return true;
}

export function pingController(
  sessionId: string,
  controllerId: string
): boolean {
  const c = getStore().controllers.get(sessionId);
  if (!c || c.controllerId !== controllerId) return false;
  c.lastPing = Date.now();
  return true;
}

export function getActiveController(
  sessionId: string
): { controllerId: string } | null {
  const c = getStore().controllers.get(sessionId);
  if (!c) return null;
  if (Date.now() - c.lastPing >= CONTROLLER_STALE_MS) {
    getStore().controllers.delete(sessionId);
    return null;
  }
  return { controllerId: c.controllerId };
}

export function releaseController(
  sessionId: string,
  controllerId: string
): void {
  const store = getStore();
  const c = store.controllers.get(sessionId);
  if (c && c.controllerId === controllerId) {
    store.controllers.delete(sessionId);
    store.selections.delete(sessionId);
  }
}

// Selection management

export function setSelection(sessionId: string, itemId: string): void {
  getStore().selections.set(sessionId, { itemId, timestamp: Date.now() });
}

export function getSelection(
  sessionId: string
): Selection | null {
  return getStore().selections.get(sessionId) ?? null;
}

// ID generation

export function generateSessionId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export function generateControllerId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}
