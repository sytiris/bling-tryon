import { cp, mkdir, readFile, writeFile, chmod, access } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { buildHelper } from "./build-helper.mjs";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repo = resolve(root, "../..");
const dest = process.argv[2] ? resolve(process.argv[2]) : resolve(repo, "dist", `bling-tryon-${process.platform}-${process.arch}`);
await mkdir(dest, { recursive: true });
execFileSync(process.execPath, [resolve(root, "scripts/patch-decart-cancellation.mjs")], { cwd: root, stdio: "inherit" });
execFileSync(process.execPath, [resolve(root, "scripts/build-extension.mjs"), resolve(dest, "chrome-tryon")], { cwd: root, stdio: "inherit" });
await buildHelper(resolve(dest, "helper"));
await mkdir(resolve(dest, "runtime"), { recursive: true });
const nodeFile = process.platform === "win32" ? "node.exe" : "node";
await cp(process.execPath, resolve(dest, "runtime", nodeFile));
if (process.platform !== "win32") await chmod(resolve(dest, "runtime", nodeFile), 0o755);
const candidates = [resolve(dirname(process.execPath), "../LICENSE"), resolve(dirname(process.execPath), "LICENSE")];
let nodeLicense;
for (const file of candidates) { try { await access(file); nodeLicense = file; break; } catch {} }
if (!nodeLicense) throw new Error("Node runtime license not found; do not distribute an incomplete package");
await cp(nodeLicense, resolve(dest, "runtime", "LICENSE.txt"));
for (const name of ["LICENSE", "THIRD_PARTY_NOTICES.md", "AGENTS.md"]) await cp(resolve(repo, name), resolve(dest, name));
for (const name of ["README.md", "README.zh-CN.md", "PRIVACY.md", "PRIVACY.zh-CN.md"]) await cp(resolve(root, "helper", name), resolve(dest, name));
const mac = `#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
export NODE_USE_ENV_PROXY=1
export NO_PROXY="localhost,127.0.0.1\${NO_PROXY:+,$NO_PROXY}"
if [[ -n "\${TRYON_PROXY_URL:-}" ]]; then
  export HTTP_PROXY="$TRYON_PROXY_URL"
  export HTTPS_PROXY="$TRYON_PROXY_URL"
fi
if [[ -n "\${BLING_LEGACY_ENV_FILE:-}" && -f "$BLING_LEGACY_ENV_FILE" ]]; then
  exec ./runtime/node --env-file "$BLING_LEGACY_ENV_FILE" helper/server.mjs
fi
exec ./runtime/node helper/server.mjs
`;
await writeFile(resolve(dest, "启动试衣镜bling.command"), mac, { mode: 0o755 });
await writeFile(resolve(dest, "start-macos.command"), mac, { mode: 0o755 });
await writeFile(resolve(dest, "start-linux.sh"), mac.replace("#!/bin/bash", "#!/usr/bin/env bash"), { mode: 0o755 });
await writeFile(resolve(dest, "启动试衣镜bling.cmd"), `@echo off\r\ncd /d "%~dp0"\r\nset "NODE_USE_ENV_PROXY=1"\r\nset "NO_PROXY=localhost,127.0.0.1"\r\nif defined TRYON_PROXY_URL set "HTTPS_PROXY=%TRYON_PROXY_URL%"\r\nif defined TRYON_PROXY_URL set "HTTP_PROXY=%TRYON_PROXY_URL%"\r\n"runtime\\node.exe" "helper\\server.mjs"\r\nif errorlevel 1 pause\r\n`);
await cp(resolve(dest, "启动试衣镜bling.cmd"), resolve(dest, "start-windows.cmd"));
await writeFile(resolve(dest, "BUILD.json"), JSON.stringify({ name: "试衣镜bling", version: "1.3.1", platform: process.platform,
  arch: process.arch, nodeVersion: process.version, builtAt: new Date().toISOString(),
  runtimeSha256: createHash("sha256").update(await readFile(process.execPath)).digest("hex") }, null, 2) + "\n");
console.log("Built self-contained release:", dest);
