import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `You write prompts for a virtual try-on model. You receive TWO separate clothing images — a top garment and a bottom garment — and optionally a camera frame showing the person.

Follow these steps:

Step 1 — Examine the person's camera frame (if provided):
Identify what the person is currently wearing on their upper body and lower body.

Step 2 — Examine the TOP clothing image:
Describe it with material, texture, pattern, fit, and colors (e.g. "a navy cable-knit sweater with a crew neck").
IMPORTANT: Only describe features you can clearly see. Do NOT infer or guess details like zippers, pockets, buttons, closures, or stitching unless they are obviously visible. If you cannot determine the material, use a general term (e.g. "knit", "woven", "fabric") instead of guessing.

Step 3 — Examine the BOTTOM clothing image:
Describe it with material, texture, pattern, fit, and colors (e.g. "dark wash slim-fit jeans").
IMPORTANT: Same rule — only describe what is clearly visible.

Step 4 — Write the combined substitution prompt:
"Substitute the current outfit with [top description] on top and [bottom description] on the bottom"

If no person frame is provided, use "the current outfit" as the thing being substituted.

Keep the total prompt between 25-40 words. Include colors, textures, and patterns for both items. Return only the final prompt, nothing else.`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY not set" },
      { status: 500 }
    );
  }

  try {
    const formData = await req.formData();
    const topFile = formData.get("topImage") as File | null;
    const bottomFile = formData.get("bottomImage") as File | null;
    if (!topFile || !bottomFile) {
      return NextResponse.json(
        { error: "Both topImage and bottomImage are required" },
        { status: 400 }
      );
    }

    const topBuffer = await topFile.arrayBuffer();
    const topBase64 = Buffer.from(topBuffer).toString("base64");
    const topMime = topFile.type || "image/png";
    const topDataUri = `data:${topMime};base64,${topBase64}`;

    const bottomBuffer = await bottomFile.arrayBuffer();
    const bottomBase64 = Buffer.from(bottomBuffer).toString("base64");
    const bottomMime = bottomFile.type || "image/png";
    const bottomDataUri = `data:${bottomMime};base64,${bottomBase64}`;

    const userContent: Array<{
      type: string;
      text?: string;
      image_url?: { url: string; detail: string };
    }> = [
      {
        type: "text",
        text: "Generate a try-on prompt for this outfit. Here is the TOP garment:",
      },
      {
        type: "image_url",
        image_url: { url: topDataUri, detail: "auto" },
      },
      { type: "text", text: "Here is the BOTTOM garment:" },
      {
        type: "image_url",
        image_url: { url: bottomDataUri, detail: "auto" },
      },
    ];

    const personFrame = formData.get("personFrame") as File | null;
    if (personFrame) {
      const personBuffer = await personFrame.arrayBuffer();
      const personBase64 = Buffer.from(personBuffer).toString("base64");
      const personMime = personFrame.type || "image/jpeg";
      const personDataUri = `data:${personMime};base64,${personBase64}`;
      userContent.push(
        { type: "text", text: "Here is the person from the camera:" },
        {
          type: "image_url",
          image_url: { url: personDataUri, detail: "low" },
        }
      );
    }

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 200,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("OpenAI API error:", err);
      return NextResponse.json(
        { error: "Failed to generate outfit prompt" },
        { status: 500 }
      );
    }

    const data = await res.json();
    const raw = data.choices[0]?.message?.content?.trim() || "";
    return NextResponse.json({ prompt: raw });
  } catch (error) {
    console.error("Outfit prompt generation failed:", error);
    return NextResponse.json(
      { error: "Outfit prompt generation failed" },
      { status: 500 }
    );
  }
}
