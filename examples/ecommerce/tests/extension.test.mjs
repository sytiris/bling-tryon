import assert from "node:assert/strict";
import { test } from "node:test";
import { EXTENSION_ID, EXTENSION_ORIGIN } from "../lib/extension-id.ts";
const timerModule = await import("../extension/src/trial-timer.mjs").catch(() => ({}));
const policy = await import("../lib/extension-policy.ts").catch(() => ({}));

for (const seconds of [10, 20]) test(seconds + " second timer starts at first decoded frame", (t) => {
  assert.equal(typeof timerModule.createTrialTimer, "function");
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let ended = 0;
  const timer = timerModule.createTrialTimer(seconds, () => ended++);
  t.mock.timers.tick(20000);
  assert.equal(ended, 0, "connecting time must not consume preview duration");
  timer.startFromFirstFrame();
  timer.startFromFirstFrame();
  t.mock.timers.tick(seconds * 1000 - 1);
  assert.equal(ended, 0);
  t.mock.timers.tick(1);
  assert.equal(ended, 1);
  t.mock.timers.tick(20000);
  assert.equal(ended, 1);
});
test("cancelled timer never expires even if a late frame arrives", (t) => {
  assert.equal(typeof timerModule.createTrialTimer, "function");
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let ended = false;
  const timer = timerModule.createTrialTimer(10, () => { ended = true; });
  timer.cancel();
  timer.startFromFirstFrame();
  t.mock.timers.tick(10000);
  assert.equal(ended, false);
});
test("websites and other extension identities cannot mint a token", () => {
  assert.equal(typeof policy.isExtensionRequest, "function");
  assert.equal(policy.isExtensionRequest(new Headers({ Origin: EXTENSION_ORIGIN, "X-Tryon-Extension": EXTENSION_ID })), true);
  assert.equal(policy.isExtensionRequest(new Headers({ "X-Tryon-Extension": EXTENSION_ID })), true);
  assert.equal(policy.isExtensionRequest(new Headers({ Origin: "https://shop.example", "X-Tryon-Extension": EXTENSION_ID })), false);
  assert.equal(policy.isExtensionRequest(new Headers({ Origin: EXTENSION_ORIGIN })), false);
  assert.equal(policy.isExtensionRequest(new Headers({ Origin: "null", "X-Tryon-Extension": EXTENSION_ID })), false);
});
test("server session duration is bounded and rejects unknown modes", () => {
  assert.equal(typeof policy.maxSessionSeconds, "function");
  assert.equal(policy.maxSessionSeconds(10), 45);
  assert.equal(policy.maxSessionSeconds(20), 55);
  assert.throws(() => policy.maxSessionSeconds(120), /10.*20/);
  assert.throws(() => policy.maxSessionSeconds(5), /10.*20/);
});

test("deadline check stops an expired trial after a delayed browser timer", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let now = 1000;
  t.mock.method(Date, "now", () => now);
  let ended = 0;
  const timer = timerModule.createTrialTimer(10, () => ended++);
  timer.startFromFirstFrame();
  now = 11500; // A suspended browser has not delivered its timeout yet.
  timer.checkDeadline();
  assert.equal(ended, 1);
  t.mock.timers.tick(10000);
  timer.checkDeadline();
  assert.equal(ended, 1, "cleanup fires once only");
});
