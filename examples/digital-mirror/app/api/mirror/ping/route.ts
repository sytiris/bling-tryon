import { NextRequest, NextResponse } from "next/server";
import { pingController } from "@/lib/mirror-store";

// POST: Phone heartbeat — refreshes controller last_ping
export async function POST(req: NextRequest) {
  const { sessionId, controllerId } = await req.json();
  if (!sessionId || !controllerId) {
    return NextResponse.json(
      { error: "sessionId and controllerId required" },
      { status: 400 }
    );
  }

  const ok = pingController(sessionId, controllerId);

  if (!ok) {
    return NextResponse.json({ error: "expired" }, { status: 410 });
  }

  return NextResponse.json({ ok: true });
}
