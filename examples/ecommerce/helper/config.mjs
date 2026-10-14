import { mkdir, readFile, rename, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import { randomUUID } from "node:crypto";

export function defaultDataDir() {
  if (process.env.BLING_DATA_DIR) return process.env.BLING_DATA_DIR;
  if (process.platform === "darwin") return join(homedir(), "Library", "Application Support", "试衣镜bling");
  if (process.platform === "win32") return join(process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local"), "BlingTryOn");
  return join(process.env.XDG_CONFIG_HOME || join(homedir(), ".config"), "bling-tryon");
}
export function validateKey(value) {
  if (typeof value !== "string") throw Object.assign(new Error("请输入 Decart API Key"), { status: 400 });
  const key = value.trim();
  if (key.length < 8 || key.length > 512 || /\s|[\x00-\x1f\x7f]/.test(key)) {
    throw Object.assign(new Error("密钥格式不正确，请完整粘贴 Decart API Key"), { status: 400 });
  }
  return key;
}
export async function createKeyStore(dataDir, inheritedKey = "", onKeyChange = () => {}) {
  const file = join(dataDir, "user.env");
  let key = inheritedKey;
  try {
    const text = await readFile(file, "utf8");
    const value = text.match(/^DECART_API_KEY=(.+)$/m)?.[1];
    const parsed = JSON.parse(value);
    key = parsed === "" ? "" : validateKey(parsed);
  } catch (error) {
    if (error.code !== "ENOENT") throw new Error("本地密钥配置无法读取，请检查 user.env 文件");
  }
  onKeyChange(key);
  async function persist(next) {
    await mkdir(dataDir, { recursive: true, mode: 0o700 });
    const temp = join(dataDir, ".key-" + randomUUID());
    try {
      await writeFile(temp, "DECART_API_KEY=" + JSON.stringify(next) + "\n", { mode: 0o600, flag: "wx" });
      await rename(temp, file);
    } finally { await rm(temp, { force: true }); }
    key = next;
    onKeyChange(key);
  }
  return {
    get: () => key,
    save: value => persist(validateKey(value)),
    clear: () => persist(""),
  };
}
