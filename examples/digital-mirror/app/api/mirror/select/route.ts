import { NextRequest, NextResponse } from "next/server";
import { getActiveController, setSelection } from "@/lib/mirror-store";

// POST: Phone sends item selection
export async function POST(req: NextRequest) {
  const { sessionId, itemId, controllerId } = await req.json();
  if (!sessionId || !itemId || !controllerId) {
    return NextResponse.json(
      { error: "sessionId, itemId, and controllerId required" },
      { status: 400 }
    );
  }

  // Verify controller is active and matches
  const active = getActiveController(sessionId);
  if (!active || active.controllerId !== controllerId) {
    return NextResponse.json({ error: "not_authorized" }, { status: 403 });
  }

  setSelection(sessionId, itemId);
  return NextResponse.json({ ok: true });
}
