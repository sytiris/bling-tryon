import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { english, normalizeLanguage, translate } from "../helper/public/i18n.js";

test("Chinese browser/OS locales select Chinese; other locales fall back to English", () => {
  for (const language of ["zh-CN", "zh-TW", "zh_HK.UTF-8", "zh;q=0.9,en;q=0.8"]) assert.equal(normalizeLanguage(language), "zh");
  for (const language of [undefined, "en-US", "fr-FR", "en-US,zh;q=0.8", "C.UTF-8"]) assert.equal(normalizeLanguage(language), "en");
  assert.equal(translate("en", "已完成 {seconds} 秒试穿 · AI 已断开", { seconds: 20 }), "20 sec completed · AI disconnected");
  assert.equal(translate("zh", "已完成 {seconds} 秒试穿 · AI 已断开", { seconds: 10 }), "已完成 10 秒试穿 · AI 已断开");
});

test("all shipped static UI phrases and Chinese error messages have English translations", async () => {
  for (const file of ["extension/panel.html", "extension/settings.html", "helper/public/index.html"]) {
    const source = await readFile(new URL("../" + file, import.meta.url), "utf8");
    for (const [, key] of source.matchAll(/data-i18n(?:-[a-z-]+)?="([^"]+)"/g)) assert.ok(english[key], file + ": " + key);
  }
  for (const file of ["helper/server.mjs", "helper/decart.mjs", "helper/config.mjs", "extension/src/panel.mjs", "extension/src/garment.mjs", "extension/src/settings.mjs", "extension/src/replay.mjs"]) {
    const source = await readFile(new URL("../" + file, import.meta.url), "utf8");
    for (const [, key] of source.matchAll(/"([^"\n]*[\u4e00-\u9fff][^"\n]*)"/g)) assert.ok(english[key], file + ": " + key);
  }
});

test("manifest uses Chrome locales and keeps the extension identity stable", async () => {
  const manifest = JSON.parse(await readFile(new URL("../extension/manifest.json", import.meta.url)));
  assert.equal(manifest.default_locale, "en");
  assert.equal(manifest.name, "__MSG_extensionName__");
  for (const language of ["en", "zh_CN", "zh_TW"]) {
    const messages = JSON.parse(await readFile(new URL(`../extension/_locales/${language}/messages.json`, import.meta.url)));
    assert.ok(messages.extensionName.message);
    assert.ok(messages.extensionDescription.message);
    assert.ok(messages.actionTitle.message);
  }
  assert.ok(manifest.key);
});
