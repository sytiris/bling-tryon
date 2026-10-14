import assert from "node:assert/strict";
import { mock, test } from "node:test";

let states;
let cleanups;
function render(hook) {
  states = [];
  cleanups = [];
  return hook();
}
mock.module("react", {
  namedExports: {
    useState: (initial) => {
      const cell = { value: initial };
      states.push(cell);
      return [initial, (value) => { cell.value = value; }];
    },
    useRef: (current) => ({ current }),
    useCallback: (fn) => fn,
    useEffect: (fn) => { const cleanup = fn(); if (cleanup) cleanups.push(cleanup); },
  },
});

let resolveConnection;
let connectOptions;
let clientOptions;
mock.module("@decartai/sdk", {
  namedExports: {
    createDecartClient: (options) => {
      clientOptions = options;
      return { realtime: { connect: (_stream, opts) => {
        connectOptions = opts;
        return new Promise((resolve) => { resolveConnection = resolve; });
      } } };
    },
    models: { realtime: () => ({ fps: 30, width: 1280, height: 720 }) },
  },
});
const { useCamera } = await import("../hooks/useCamera.ts");
const { useDecartRealtime } = await import("../hooks/useDecartRealtime.ts");
function fakeStream() {
  const track = { stopped: false, stop() { this.stopped = true; } };
  return { track, getTracks: () => [track] };
}
function fakeClient() {
  return { disconnect: mock.fn(), on: mock.fn(), getConnectionState: () => "connected" };
}

test("stop releases a camera that resolves after the user has stopped", async () => {
  let resolveCamera;
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: {
    mediaDevices: { getUserMedia: () => new Promise((resolve) => { resolveCamera = resolve; }) },
  } });
  const camera = render(useCamera);
  const pending = camera.startCamera();
  camera.stopCamera();
  const stream = fakeStream();
  resolveCamera(stream);
  assert.equal(await pending, null);
  assert.equal(stream.track.stopped, true);
});

test("stop aborts an in-flight dial and closes any late result", async () => {
  const hook = render(useDecartRealtime);
  const pending = hook.connect({ stream: fakeStream(), onRemoteStream() {} });
  hook.disconnect();
  assert.equal(connectOptions.signal?.aborted, true);
  const client = fakeClient();
  resolveConnection(client);
  assert.equal(await pending, null);
  assert.equal(client.disconnect.mock.callCount(), 1);
  assert.equal(hook.clientRef.current, null);
});

test("connected status is visible and stop disconnects synchronously", async () => {
  const hook = render(useDecartRealtime);
  const pending = hook.connect({ stream: fakeStream(), onRemoteStream() {} });
  const client = fakeClient();
  resolveConnection(client);
  await pending;
  assert.equal(states[0].value, "connected");
  hook.disconnect();
  assert.equal(client.disconnect.mock.callCount(), 1);
  assert.equal(hook.clientRef.current, null);
  assert.equal(states[0].value, "disconnected");
});

test("the credential provider stops fetching after stop", async () => {
  const hook = render(useDecartRealtime);
  const pending = hook.connect({ stream: fakeStream(), onRemoteStream() {} });
  hook.disconnect();
  assert.equal(typeof clientOptions.apiKeyProvider, "function");
  await assert.rejects(clientOptions.apiKeyProvider(), { name: "AbortError" });
  resolveConnection(fakeClient());
  await pending;
});

test("camera-preview warm token removes the extra token request at start", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", async () => ({
    ok: true,
    json: async () => ({ apiKey: "test-short-token", expiresAt: new Date(Date.now() + 60000).toISOString() }),
  }));
  const hook = render(useDecartRealtime);
  assert.equal(typeof hook.warmToken, "function");
  await hook.warmToken();
  const pending = hook.connect({ stream: fakeStream(), onRemoteStream() {} });
  assert.equal(await clientOptions.apiKeyProvider(), "test-short-token");
  assert.equal(fetchMock.mock.callCount(), 1);
  resolveConnection(fakeClient());
  await pending;
  hook.disconnect();
});

test("an expired warm token is replaced before connecting", async (t) => {
  let now = Date.now();
  t.mock.method(Date, "now", () => now);
  const fetchMock = t.mock.method(globalThis, "fetch", async () => ({
    ok: true,
    json: async () => ({ apiKey: "test-short-token", expiresAt: new Date(now + 60000).toISOString() }),
  }));
  const hook = render(useDecartRealtime);
  assert.equal(typeof hook.warmToken, "function");
  await hook.warmToken();
  now += 61000;
  const pending = hook.connect({ stream: fakeStream(), onRemoteStream() {} });
  await clientOptions.apiKeyProvider();
  assert.equal(fetchMock.mock.callCount(), 2);
  resolveConnection(fakeClient());
  await pending;
  hook.disconnect();
});

test("a stalled connection is cancelled at 30 seconds", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const hook = render(useDecartRealtime);
  const pending = hook.connect({ stream: fakeStream(), onRemoteStream() {} });
  t.mock.timers.tick(30000);
  assert.equal(connectOptions.signal.aborted, true);
  resolveConnection(fakeClient());
  await pending;
  assert.equal(states[0].value, "error");
  assert.match(states[1].value, /30 秒/);
});

test("stop cancels a token warmup without retaining a late credential", async (t) => {
  let resolveToken;
  let signal;
  t.mock.method(globalThis, "fetch", (_url, options) => {
    signal = options.signal;
    return new Promise((resolve) => { resolveToken = resolve; });
  });
  const hook = render(useDecartRealtime);
  const pending = hook.warmToken();
  hook.disconnect();
  assert.equal(signal.aborted, true);
  resolveToken({ ok: true, json: async () => ({
    apiKey: "test-short-token", expiresAt: new Date(Date.now() + 60000).toISOString(),
  }) });
  await assert.rejects(pending, { name: "AbortError" });
});
