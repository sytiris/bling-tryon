import { NextResponse } from "next/server";

// Phase 1 uses the original pre-written garment prompts and Decart only.
export async function POST() {
  return NextResponse.json(
    { error: "本阶段已禁用额外 AI 提示词服务，请使用服装预设提示词" },
    { status: 501 }
  );
}
