import { NextRequest, NextResponse } from "next/server";
import {
  createSession,
  getSession,
  generateSessionId,
} from "@/lib/mirror-store";

// POST: Mirror display creates a new session
export async function POST() {
  const sessionId = generateSessionId();
  createSession(sessionId);
  return NextResponse.json({ sessionId });
}

// GET: Phone fetches session validity
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
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

  return NextResponse.json({ ok: true });
}
