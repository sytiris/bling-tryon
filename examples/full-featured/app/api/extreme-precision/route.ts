import { fal } from "@fal-ai/client";
import { NextRequest, NextResponse } from "next/server";

fal.config({ credentials: process.env.FAL_KEY });

const LORA_URL =
  "https://huggingface.co/fal/flux-klein-9b-virtual-tryon-lora/resolve/main/flux-klein-tryon.safetensors";

const PRECISION_PROMPT =
  "TRYON [person in photo]. Replace the outfit with [garment] as shown in the reference image. The final image is a full body shot.";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const clothingFile = formData.get("clothing") as File | null;
    const personFile = formData.get("person") as File | null;

    if (!clothingFile || !personFile) {
      return NextResponse.json(
        { error: "Both clothing and person images are required" },
        { status: 400 }
      );
    }

    const [clothingUrl, personUrl] = await Promise.all([
      fal.storage.upload(clothingFile),
      fal.storage.upload(personFile),
    ]);

    const result = await fal.subscribe("fal-ai/flux-2/klein/9b/base/edit/lora", {
      input: {
        prompt: PRECISION_PROMPT,
        image_urls: [personUrl, clothingUrl],
        loras: [{ path: LORA_URL, scale: 1.0 }],
        guidance_scale: 2.5,
        num_inference_steps: 28,
      },
    });

    const outputUrl = (result.data as { images: { url: string }[] }).images[0].url;

    const imageRes = await fetch(outputUrl);
    const imageBuffer = await imageRes.arrayBuffer();

    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Extreme precision generation failed:", error);
    return NextResponse.json(
      { error: "Extreme precision generation failed" },
      { status: 500 }
    );
  }
}
