// SDK 0.2.10 exposes disconnect only after connect resolves. This small local
// patch adds AbortSignal support during the handshake, without changing the wire protocol.
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const root = dirname(require.resolve("@decartai/sdk/package.json"));
if (JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version !== "0.2.10") {
  throw new Error("Cancellation patch requires @decartai/sdk 0.2.10; review before upgrading.");
}
function replace(source, from, to) {
  if (!source.includes(from)) throw new Error("SDK patch anchor changed; refusing to patch.");
  return source.replace(from, to);
}
const jsPath = join(root, "dist/realtime/client.js");
let js = readFileSync(jsPath, "utf8");
if (!js.includes("// local-cancellable-connect")) {
  js = replace(js, "\t\tlet session;", "\t\t// local-cancellable-connect\n\t\toptions.signal?.throwIfAborted();\n\t\tlet removeAbortListener = () => {};\n\t\tlet session;");
  js = replace(js, "\t\t\tconst initialPrompt =", "\t\t\toptions.signal?.throwIfAborted();\n\t\t\tconst initialPrompt =");
  js = replace(js, "\t\t\tawait activeSession.connect();", `\t\t\tawait new Promise((resolve, reject) => {
\t\t\t\tconst abort = () => {
\t\t\t\t\tactiveSession.disconnect();
\t\t\t\t\treject(options.signal.reason ?? new DOMException("Stopped", "AbortError"));
\t\t\t\t};
\t\t\t\tremoveAbortListener = () => options.signal?.removeEventListener("abort", abort);
\t\t\t\toptions.signal?.addEventListener("abort", abort, { once: true });
\t\t\t\tif (options.signal?.aborted) { abort(); return; }
\t\t\t\tactiveSession.connect().then(resolve, reject);
\t\t\t});
\t\t\tremoveAbortListener();`);
  js = replace(js, "\t\t} catch (error) {\n\t\t\tobservability?.stop();", "\t\t} catch (error) {\n\t\t\tremoveAbortListener();\n\t\t\tobservability?.stop();");
  writeFileSync(jsPath, js);
}
const typesPath = join(root, "dist/realtime/client.d.ts");
let types = readFileSync(typesPath, "utf8");
if (!types.includes("signal?: AbortSignal;")) {
  types = replace(types, '  model: ModelDefinition | CustomModelDefinition;', '  /** Local patch: cancel an in-flight connection. */\n  signal?: AbortSignal;\n  model: ModelDefinition | CustomModelDefinition;');
  writeFileSync(typesPath, types);
}
console.log("Decart 0.2.10 cancellation patch ready.");
