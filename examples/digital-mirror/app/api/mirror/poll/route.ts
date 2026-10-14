import { NextRequest, NextResponse } from "next/server";
import { getActiveController, getSelection } from "@/lib/mirror-store";

// GET: Mirror display polls for latest selection + controller status
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json(
      { error: "sessionId required" },
      { status: 400 }
    );
  }

  const controller = getActiveController(sessionId);
  const selection = getSelection(sessionId);

  return NextResponse.json({
    hasController: !!controller,
    selection,
  });
}
