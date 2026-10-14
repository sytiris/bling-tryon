import { build } from "esbuild";
import { cp, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export async function buildHelper(dest) {
  await mkdir(dest, { recursive: true });
  await build({ entryPoints: [resolve(root, "helper/main.mjs")], outfile: resolve(dest, "server.mjs"),
    bundle: true, platform: "node", format: "esm", target: "node24", minify: false });
  await cp(resolve(root, "helper/public"), resolve(dest, "public"), { recursive: true });
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dest = process.argv[2] ? resolve(process.argv[2]) : resolve(root, "../../dist/helper");
  await buildHelper(dest);
  console.log("Built local helper:", dest);
}
