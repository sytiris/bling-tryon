import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `You write prompts for a virtual try-on model. You receive a reference clothing image, and optionally a camera frame showing the person.

Follow these steps:

Step 1 - Examine the person's camera frame (if provided):
Identify what the person is currently wearing on their upper body, lower body, head, etc. Note the specific garment (e.g. "a plain white t-shirt", "dark blue jeans", "a grey hoodie").

Step 2 - Examine the reference clothing image:
Describe it with material, texture, pattern, fit, and colors. Be specific (e.g. "a red plaid flannel shirt with a relaxed fit" not just "a shirt").
IMPORTANT: Only describe features you can clearly see. Do NOT infer or guess details like zippers, pockets, buttons, closures, or stitching unless they are obviously visible. If you cannot determine the material, use a general term (e.g. "knit", "woven", "fabric") instead of guessing.

Step 3 - Choose the action:
- If the person is ALREADY WEARING something in the same slot as the reference item (e.g. they wear a t-shirt and the reference is a blouse), use SUBSTITUTE:
  "Substitute the [description of current clothing] with [description of reference clothing]"
  Example: "Substitute the plain white t-shirt with a red plaid flannel shirt with a relaxed fit and chest pockets"

- If the person is NOT wearing anything in that slot (e.g. no hat, no jacket over their shirt), use ADD:
  "Add [description of reference clothing] to the person's [body part]"
  Example: "Add a wide-brimmed natural straw hat with a chin strap to the person's head"

Fallback: If no person frame is provided or the relevant body part is not visible, use "the current top" for upper-body items or "the current bottoms" for lower-body items.
Example: "Substitute the current top with a navy cable-knit sweater with a crew neck"

Keep the total prompt between 20-30 words. Include colors, textures, and patterns. Return only the final prompt, nothing else.`;

interface ChatMessage {
  type: string;
  text?: string;
  image_url?: { url: string; detail: string };
}

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
    const file = formData.get("image") as File | null;
    if (!file) {
      return NextResponse.json(
        { error: "No image provided" },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const mimeType = file.type || "image/png";
    const clothingDataUri = `data:${mimeType};base64,${base64}`;

    const userContent: ChatMessage[] = [
      {
        type: "text",
        text: "Generate a try-on prompt for this clothing item:",
      },
      {
        type: "image_url",
        image_url: { url: clothingDataUri, detail: "auto" },
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
        { error: "Failed to generate prompt" },
        { status: 500 }
      );
    }

    const data = await res.json();
    const prompt = data.choices[0]?.message?.content?.trim() || "";
    return NextResponse.json({ prompt });
  } catch (error) {
    console.error("Prompt generation failed:", error);
    return NextResponse.json(
      { error: "Prompt generation failed" },
      { status: 500 }
    );
  }
}
