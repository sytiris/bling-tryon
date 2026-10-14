import { fal } from "@fal-ai/client";
import { NextRequest, NextResponse } from "next/server";

fal.config({ credentials: process.env.FAL_KEY });

const EXTRACT_PROMPT =
  "Extract only the clothing garment from this image. Remove the person, body, skin, and background completely. Show only the isolated clothing item on a plain white background. Keep the exact colors, patterns, and details of the garment.";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("image") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const imageUrl = await fal.storage.upload(file);

    const result = await fal.subscribe("fal-ai/flux-2/klein/4b/base/edit", {
      input: {
        prompt: EXTRACT_PROMPT,
        image_urls: [imageUrl],
      },
    });

    const outputUrl = (result.data as { images: { url: string }[] }).images[0].url;

    const imageRes = await fetch(outputUrl);
    const imageBuffer = await imageRes.arrayBuffer();

    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    console.error("Cloth extraction failed:", error);
    return NextResponse.json(
      { error: "Cloth extraction failed" },
      { status: 500 }
    );
  }
}
