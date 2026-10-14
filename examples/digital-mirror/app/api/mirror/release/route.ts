import { NextRequest, NextResponse } from "next/server";
import { releaseController } from "@/lib/mirror-store";

// POST: Phone releases control of the mirror
export async function POST(req: NextRequest) {
  const { sessionId, controllerId } = await req.json();
  if (!sessionId || !controllerId) {
    return NextResponse.json(
      { error: "sessionId and controllerId required" },
      { status: 400 }
    );
  }

  releaseController(sessionId, controllerId);
  return NextResponse.json({ ok: true });
}
