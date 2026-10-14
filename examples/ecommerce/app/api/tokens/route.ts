import { createDecartClient } from "@decartai/sdk";
import { NextResponse } from "next/server";

const LOCAL_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"];
const HEADERS = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || !LOCAL_ORIGINS.includes(origin) ||
      new URL(request.url).origin !== origin) {
    return NextResponse.json(
      { error: "只允许本机同源页面申请令牌" },
      { status: 403, headers: HEADERS }
    );
  }
  const apiKey = process.env.DECART_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "请在服务端 .env.local 配置 DECART_API_KEY，然后重启本地服务" },
      { status: 503, headers: HEADERS }
    );
  }

  try {
    const client = createDecartClient({
      apiKey,
      telemetry: false,
      logger: { debug() {}, info() {}, warn() {}, error() {} },
    });
    const token = await client.tokens.create({
      expiresIn: 60,
      allowedModels: ["lucy-vton-latest", "lucy-vton-3.6"],
      allowedOrigins: [origin],
      constraints: { realtime: { maxSessionDuration: 120 } },
    });
    return NextResponse.json(
      { apiKey: token.apiKey, expiresAt: token.expiresAt },
      { headers: HEADERS }
    );
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error
      ? String(error.code).replace(/[^A-Z0-9_]/g, "").slice(0, 80)
      : "TOKEN_REQUEST_FAILED";
    console.error("Decart token request failed:", code);
    return NextResponse.json(
      { error: "Decart 令牌申请失败，请检查密钥、账户余额和网络", code },
      { status: 502, headers: HEADERS }
    );
  }
}
