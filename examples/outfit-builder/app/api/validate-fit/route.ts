import { NextRequest, NextResponse } from "next/server";

const SUPPORTED_ITEMS = [
  "mask", "sunglasses", "jacket", "cap", "gloves", "hat", "shirt", "eyeglasses",
  "t-shirt", "sweatshirt", "beanie", "glove", "dress", "goggles", "helmet",
  "sweater", "glasses", "scarf", "shorts", "jersey", "coat", "socks", "top",
  "tiara", "vest", "mittens", "cardigan", "blouse", "veil", "skirt",
  "pants", "shoes", "hoodie",
];

const SYSTEM_PROMPT = `You check whether a clothing item can be virtually tried on given a camera frame of a person.

Step 1 — Check if the item is a supported type.
SUPPORTED ITEMS (EXHAUSTIVE LIST — nothing else is supported): ${SUPPORTED_ITEMS.join(", ")}.
A "close variant" counts as supported (e.g. "bomber jacket" → jacket, "aviator sunglasses" → sunglasses, "polo shirt" → shirt).
Items NOT on this list are UNSUPPORTED. Examples of unsupported items: bag, handbag, tote, purse, belt, watch, jewelry, necklace, bracelet, ring, earrings, jumpsuit.
Set "supported": true if the item matches a supported type, false otherwise.

Step 2 — Classify the item for body visibility check:
- ACCESSORY (hat, cap, scarf, sunglasses, glasses, mask, goggles, helmet, beanie, tiara, veil, gloves, mittens, socks)
- OUTERWEAR (jacket, coat, vest, cardigan)
- BOTTOMS (pants, shorts, skirt, shoes)
- TOPS (shirt, t-shirt, sweater, sweatshirt, hoodie, blouse, jersey, top)
- FULL-BODY (dress)

Step 3 — Look at the camera frame and determine what body parts are visible:
- Can you see the person's torso/chest area? (even partially)
- Can you see the person's waist/hip area or below? (even partially)

Step 4 — Decide "ok":
- ACCESSORY / OUTERWEAR → {"ok": true} (no body visibility check needed).
- BOTTOMS: NOT OK only if the person's lower body (waist and below) is entirely out of frame.
- TOPS / FULL-BODY: NOT OK only if the person's torso is entirely out of frame.
- No person at all in the camera → NOT OK.
- When in doubt → {"ok": true}.

Return ONLY JSON: {"ok": true/false, "supported": true/false} or {"ok": false, "supported": true/false, "message": "<reason>"}`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: true });
  }

  try {
    const formData = await req.formData();
    const image = formData.get("image") as File | null;
    const personFrame = formData.get("personFrame") as File | null;
    if (!image || !personFrame) {
      return NextResponse.json({ ok: true });
    }

    const imageBuffer = await image.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString("base64");
    const imageMime = image.type || "image/png";

    const personBuffer = await personFrame.arrayBuffer();
    const personBase64 = Buffer.from(personBuffer).toString("base64");
    const personMime = personFrame.type || "image/jpeg";

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        max_tokens: 100,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Check if this clothing fits what's visible:",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${imageMime};base64,${imageBase64}`,
                  detail: "low",
                },
              },
              { type: "text", text: "Person from camera:" },
              {
                type: "image_url",
                image_url: {
                  url: `data:${personMime};base64,${personBase64}`,
                  detail: "auto",
                },
              },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ ok: true });
    }

    const data = await res.json();
    const raw = data.choices[0]?.message?.content?.trim() || "";

    try {
      const parsed = JSON.parse(raw);
      if (parsed.supported === false) {
        return NextResponse.json({
          ok: false,
          message:
            "This type of item may not work well yet - we're improving support for more items soon.",
        });
      }
      const ok = parsed.ok !== false;
      const message =
        parsed.message ||
        (!ok
          ? "This item needs more of your body visible in the camera to work properly."
          : null);
      return NextResponse.json({ ok, message });
    } catch {
      return NextResponse.json({ ok: true });
    }
  } catch (error) {
    console.error("Clothing fit check failed:", error);
    return NextResponse.json({ ok: true });
  }
}
