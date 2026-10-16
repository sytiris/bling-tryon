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
export function validateKey(value, provider = "decart") {
  if (typeof value !== "string") throw Object.assign(new Error(provider === "vidu" ? "请输入 Vidu API Key" : "请输入 Decart API Key"), { status: 400 });
  const key = provider === "vidu" ? value.trim().replace(/^Token\s+/i, "") : value.trim();
  if (key.length < 8 || key.length > 512 || /\s|[\x00-\x1f\x7f]/.test(key) || (provider === "vidu" && !key.startsWith("vda_"))) {
    throw Object.assign(new Error(provider === "vidu" ? "密钥格式不正确，请完整粘贴 Vidu API Key" : "密钥格式不正确，请完整粘贴 Decart API Key"), { status: 400 });
  }
  return key;
}
export async function createKeyStore(dataDir, inheritedKey = "", onKeyChange = () => {}, provider = "decart") {
  const file = join(dataDir, provider === "vidu" ? "vidu.env" : "user.env");
  let key = inheritedKey;
  try {
    const text = await readFile(file, "utf8");
    const variable = provider === "vidu" ? "VIDU_API_KEY" : "DECART_API_KEY";
    const value = text.match(new RegExp("^" + variable + "=(.+)$", "m"))?.[1];
    const parsed = JSON.parse(value);
    key = parsed === "" ? "" : validateKey(parsed, provider);
  } catch (error) {
    if (error.code !== "ENOENT") throw new Error(provider === "vidu" ? "本地密钥配置无法读取，请检查 vidu.env 文件" : "本地密钥配置无法读取，请检查 user.env 文件");
  }
  onKeyChange(key);
  async function persist(next) {
    await mkdir(dataDir, { recursive: true, mode: 0o700 });
    const temp = join(dataDir, ".key-" + randomUUID());
    try {
      await writeFile(temp, (provider === "vidu" ? "VIDU_API_KEY=" : "DECART_API_KEY=") + JSON.stringify(next) + "\n", { mode: 0o600, flag: "wx" });
      await rename(temp, file);
    } finally { await rm(temp, { force: true }); }
    key = next;
    onKeyChange(key);
  }
  return {
    get: () => key,
    save: value => persist(validateKey(value, provider)),
    clear: () => persist(""),
  };
}
