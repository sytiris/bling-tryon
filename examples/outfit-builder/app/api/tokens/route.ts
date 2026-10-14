import { createDecartClient } from "@decartai/sdk";
import { NextResponse } from "next/server";

export async function POST() {
  const apiKey = process.env.DECART_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "DECART_API_KEY is not set" },
      { status: 500 }
    );
  }

  try {
    const client = createDecartClient({ apiKey });
    const token = await client.tokens.create();
    return NextResponse.json(token);
  } catch (error) {
    console.error("Failed to create token:", error);
    return NextResponse.json(
      { error: "Failed to create token" },
      { status: 500 }
    );
  }
}
