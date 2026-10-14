import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY not set" }, { status: 500 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("image") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const mimeType = file.type || "image/png";
    const dataUri = `data:${mimeType};base64,${base64}`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 5,
        messages: [
          {
            role: "system",
            content:
              "You determine if an image contains a visible person (full body, torso, or any body parts). Reply with exactly YES or NO.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Does this image contain a person?" },
              { type: "image_url", image_url: { url: dataUri, detail: "low" } },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("OpenAI API error:", err);
      return NextResponse.json({ hasPerson: true });
    }

    const data = await res.json();
    const answer =
      data.choices[0]?.message?.content?.trim().toUpperCase() || "YES";
    return NextResponse.json({ hasPerson: answer.startsWith("YES") });
  } catch (error) {
    console.error("Person check failed:", error);
    return NextResponse.json({ hasPerson: true });
  }
}
