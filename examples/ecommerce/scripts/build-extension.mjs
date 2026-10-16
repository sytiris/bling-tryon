import { build } from "esbuild";
import { readFileSync, cpSync, mkdirSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import sharp from "sharp";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dest = process.argv[2] ? resolve(process.argv[2]) : resolve(root, "../../../chrome-tryon");
const require = createRequire(import.meta.url);
const sdkRoot = dirname(require.resolve("@decartai/sdk/package.json"));
const manifest = JSON.parse(readFileSync(resolve(root, "extension/manifest.json"), "utf8"));
const id = [...createHash("sha256").update(Buffer.from(manifest.key, "base64")).digest().subarray(0, 16)]
  .map((byte) => String.fromCharCode(97 + (byte >> 4), 97 + (byte & 15))).join("");
if (!readFileSync(resolve(root, "lib/extension-id.ts"), "utf8").includes(id)) throw new Error("Extension ID mismatch");
mkdirSync(dest, { recursive: true });
for (const file of ["manifest.json", "panel.html", "panel.css", "settings.html", "settings.css", "README.txt", "_locales"]) cpSync(resolve(root, "extension", file), resolve(dest, file), { recursive: true });
await build({ entryPoints: [resolve(root, "extension/src/settings.mjs")], outfile: resolve(dest, "settings.js"), bundle: true, format: "esm", target: "chrome121", minify: true });
const viduBundle = await build({ metafile: true, entryPoints: [resolve(root, "extension/src/vidu-rtc.mjs")], outfile: resolve(dest, "vidu-rtc.js"), bundle: true, format: "esm", platform: "browser", target: "chrome121", minify: true, legalComments: "eof" });
const bundled = await build({ metafile: true, entryPoints: [resolve(root, "extension/src/panel.mjs")], outfile: resolve(dest, "panel.js"), bundle: true, format: "esm", platform: "browser", target: "chrome121", minify: true, legalComments: "eof" });
await build({ entryPoints: [resolve(root, "extension/src/background.mjs")], outfile: resolve(dest, "background.js"), bundle: true, format: "esm", platform: "browser", target: "chrome121", minify: true });
cpSync(resolve(sdkRoot, "dist/realtime/browser/frame-metadata-worker.js"), resolve(dest, "frame-metadata-worker.js"));
mkdirSync(resolve(dest, "icons"), { recursive: true });
const icon = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="28" fill="#254f3c"/><path d="M55 34c0-11 18-11 18 0 0 7-9 8-9 17m0 0L30 73c-5 3-3 9 3 9h62c6 0 8-6 3-9L64 51" fill="none" stroke="#f6f4ee" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg>');
for (const size of [16, 48, 128]) await sharp(icon).resize(size, size).png().toFile(resolve(dest, "icons", size + ".png"));
writeFileSync(resolve(dest, "EXTENSION_ID.txt"), id + "\n");
console.log("Built local extension:", dest, "ID:", id);

// Preserve attribution for runtime packages included in the local browser bundle.
const packages = new Set(Object.keys({ ...bundled.metafile.inputs, ...viduBundle.metafile.inputs }).map((file) => {
  const absolute = resolve(file).replaceAll("\\", "/");
  const match = absolute.match(/^(.*\/node_modules\/(?:@[^/]+\/)?[^/]+)\//);
  return match?.[1];
}).filter(Boolean));
let notices = "试衣镜bling — bundled third-party software\n\n";
for (const directory of [...packages].sort()) {
  if (!existsSync(resolve(directory, "package.json"))) continue;
  const pkg = JSON.parse(readFileSync(resolve(directory, "package.json"), "utf8"));
  notices += "\n--- " + pkg.name + " " + pkg.version + " (" + (pkg.license || "vendor terms; see root THIRD_PARTY_NOTICES.md") + ") ---\n";
  for (const file of readdirSync(directory).filter((name) => /^(licen[cs]e|notice|copying)(\.|$)/i.test(name))) {
    notices += readFileSync(resolve(directory, file), "utf8") + "\n";
  }
}
writeFileSync(resolve(dest, "THIRD_PARTY_NOTICES.txt"), notices);
