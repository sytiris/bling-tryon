import test from "node:test";
import assert from "node:assert/strict";
import { centerSquare } from "../extension/src/centered-input.mjs";

test("landscape camera excludes the left and right surroundings", () => {
  assert.deepEqual(centerSquare(1920, 1080), { x: 420, y: 0, size: 1080 });
  assert.deepEqual(centerSquare(1280, 720), { x: 280, y: 0, size: 720 });
});
test("portrait and square cameras remain centered without stretching", () => {
  assert.deepEqual(centerSquare(720, 1280), { x: 0, y: 280, size: 720 });
  assert.deepEqual(centerSquare(720, 720), { x: 0, y: 0, size: 720 });
});
