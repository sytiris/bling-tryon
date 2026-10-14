import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    configured: Boolean(process.env.DECART_API_KEY?.trim()),
    model: "lucy-vton-latest",
    tokenTtlSeconds: 60,
    maxSessionSeconds: 120,
  }, { headers: { "Cache-Control": "no-store" } });
}
