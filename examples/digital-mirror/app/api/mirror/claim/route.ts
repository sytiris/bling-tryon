import { NextRequest, NextResponse } from "next/server";
import {
  getSession,
  claimController,
  generateControllerId,
} from "@/lib/mirror-store";

// POST: Phone claims control of a mirror session
export async function POST(req: NextRequest) {
  const { sessionId } = await req.json();
  if (!sessionId) {
    return NextResponse.json(
      { error: "sessionId required" },
      { status: 400 }
    );
  }

  const session = getSession(sessionId);
  if (!session) {
    return NextResponse.json(
      { error: "session_not_found" },
      { status: 404 }
    );
  }

  const controllerId = generateControllerId();
  const claimed = claimController(sessionId, controllerId);

  if (!claimed) {
    return NextResponse.json({ error: "in_use" }, { status: 409 });
  }

  return NextResponse.json({ controllerId });
}
