import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { mock, test } from "node:test";

const require = createRequire(import.meta.url);
const sdkRoot = dirname(require.resolve("@decartai/sdk/package.json"));
let session;
class FakeSession {
  constructor() { session = this; this.disconnect = mock.fn(); }
  on() {}
  connect() { return new Promise(() => {}); }
}
mock.module(pathToFileURL(sdkRoot + "/dist/realtime/stream-session.js").href, {
  namedExports: { StreamSession: FakeSession },
});
const { createRealTimeClient } = await import(pathToFileURL(sdkRoot + "/dist/realtime/client.js"));
const noop = () => {};

test("SDK closes a pending handshake immediately on abort", async () => {
  const dispose = mock.fn();
  const controller = new AbortController();
  const client = createRealTimeClient({
    baseUrl: "wss://example.test",
    apiKey: "test-only-credential",
    logger: { info: noop, debug: noop, warn: noop, error: noop },
    prepareConnection: () => ({ stream: null, dispose }),
  });
  const pending = client.connect(null, {
    model: { name: "lucy-vton-latest", urlPath: "/v1/stream", fps: 30, width: 1280, height: 720 },
    onRemoteStream: noop,
    signal: controller.signal,
  });
  await new Promise((resolve) => setImmediate(resolve));
  controller.abort();
  assert.equal(session.disconnect.mock.callCount(), 1);
  await assert.rejects(Promise.race([
    pending,
    new Promise((_, reject) => setTimeout(() => reject(new Error("abort did not settle")), 100)),
  ]), { name: "AbortError" });
  assert.ok(dispose.mock.callCount() >= 1);
});
