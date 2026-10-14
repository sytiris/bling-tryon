import { createDecartClient } from "@decartai/sdk";
import { NextResponse } from "next/server";
import { EXTENSION_ORIGIN } from "@/lib/extension-id";
import { isExtensionRequest, maxSessionSeconds } from "@/lib/extension-policy";

const headers = {
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin": EXTENSION_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Tryon-Extension",
  "Vary": "Origin",
};

export function OPTIONS(request: Request) {
  if (request.headers.get("origin") !== EXTENSION_ORIGIN) {
    return new NextResponse(null, { status: 403 });
  }
  return new NextResponse(null, { status: 204, headers });
}

export async function POST(request: Request) {
  if (!isExtensionRequest(request.headers)) {
    return NextResponse.json({ error: "不允许此来源申请试穿令牌" }, { status: 403 });
  }
  let maxDuration: number;
  try {
    const { duration } = await request.json();
    maxDuration = maxSessionSeconds(duration);
  } catch {
    return NextResponse.json({ error: "仅支持 10 秒或 20 秒试穿" }, { status: 400, headers });
  }
  if (!process.env.DECART_API_KEY) {
    return NextResponse.json({ error: "本机服务端尚未配置 DECART_API_KEY" }, { status: 503, headers });
  }
  try {
    const client = createDecartClient({
      apiKey: process.env.DECART_API_KEY,
      telemetry: false,
      logger: { debug() {}, info() {}, warn() {}, error() {} },
    });
    // Decart origin scoping accepts http(s), not chrome-extension://. The local
    // mint route checks the fixed extension identity; the token is model/time scoped.
    const token = await client.tokens.create({
      expiresIn: 60,
      allowedModels: ["lucy-vton-latest", "lucy-vton-3.6"],
      constraints: { realtime: { maxSessionDuration: maxDuration } },
    });
    return NextResponse.json({ apiKey: token.apiKey, expiresAt: token.expiresAt }, { headers });
  } catch {
    return NextResponse.json({ error: "Decart 令牌申请失败，请检查本机网络和账户余额" }, { status: 502, headers });
  }
}
