import test from "node:test";
import assert from "node:assert/strict";
import { recordOutput } from "../extension/src/recording.mjs";

function fixture(t) {
  const stopped = [];
  let recorder;
  class Recorder {
    static isTypeSupported(type) { return type === "video/webm;codecs=vp8"; }
    constructor(stream, options) { recorder = this; this.mimeType = options.mimeType; this.state = "inactive"; }
    start() { this.state = "recording"; }
    stop() { this.state = "inactive"; this.stopCalled = true; }
    chunk(blob) { this.ondataavailable({ data: blob }); }
    complete() { this.onstop(); }
  }
  const drawing = [];
  const stream = { getTracks: () => [{ stop: () => stopped.push("recording-track") }] };
  const canvas = { getContext: () => ({ drawImage: (...args) => drawing.push(args) }), captureStream: () => stream };
  for (const [key, value] of Object.entries({ MediaRecorder: Recorder, document: { createElement: () => canvas } })) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    t.after(() => { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; });
  }
  const interval = t.mock.method(globalThis, "setInterval", () => 100);
  const clear = t.mock.method(globalThis, "clearInterval", () => {});
  return { get recorder() { return recorder; }, canvas, stopped, drawing, interval, clear };
}

test("recording stops its capture synchronously; final chunk is included without waiting to disconnect AI", async t => {
  const f = fixture(t);
  const video = { videoWidth: 1280, videoHeight: 720 };
  const recording = recordOutput(video);
  assert.equal(f.canvas.width, 720);
  assert.equal(f.canvas.height, 720);
  assert.deepEqual(f.drawing[0].slice(1, 5), [280, 0, 720, 720]);
  f.recorder.chunk(new Blob(["first"]));
  const result = recording.finish();
  assert.equal(f.recorder.stopCalled, true);
  assert.deepEqual(f.stopped, ["recording-track"]);
  assert.equal(f.clear.mock.calls.length, 1);
  f.recorder.chunk(new Blob(["last"]));
  f.recorder.complete();
  const blob = await result;
  assert.equal(blob.type, "video/webm;codecs=vp8");
  assert.equal(await blob.text(), "firstlast");
});

test("discard releases recording and prevents a late finalization from returning a clip", async t => {
  const f = fixture(t);
  const recording = recordOutput({ videoWidth: 720, videoHeight: 720 });
  f.recorder.chunk(new Blob(["private-video"]));
  const result = recording.finish();
  recording.discard();
  f.recorder.chunk(new Blob(["late-video"])); f.recorder.complete();
  assert.equal(await result, null);
  assert.equal(f.stopped.length, 1);
});

test("recording size protection discards an oversized clip and stops only local recording", async t => {
  const f = fixture(t);
  const recording = recordOutput({ videoWidth: 720, videoHeight: 720 }, { maxBytes: 4 });
  f.recorder.chunk(new Blob(["too-large"]));
  assert.equal(f.recorder.stopCalled, true);
  assert.equal(await recording.finish(), null);
  f.recorder.complete();
});

test("unsupported or failed recording leaves live try-on free to continue", t => {
  const f = fixture(t);
  f.canvas.captureStream = () => { throw new Error("capture unavailable"); };
  assert.equal(recordOutput({ videoWidth: 720, videoHeight: 720 }), null);
  assert.equal(f.interval.mock.calls.length, 0);
  assert.equal(recordOutput({ videoWidth: 0, videoHeight: 0 }), null);
});

test("an encoder stop failure still releases capture and resolves without a clip", async t => {
  const f = fixture(t);
  const recording = recordOutput({ videoWidth: 720, videoHeight: 720 });
  f.recorder.stop = () => { throw new Error("encoder failed"); };
  assert.equal(await recording.finish(), null);
  assert.deepEqual(f.stopped, ["recording-track"]);
});
