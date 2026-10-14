# Standalone Virtual Try-On (with AI-generated prompts)

> A dedicated try-on experience with AI-generated prompts. Products on the left, live camera in the center. Click a product and a vision LLM generates the try-on prompt automatically from the garment image and the person's camera frame. This example uses GPT-4o-mini, but any vision-capable LLM works (Claude, Gemini, etc.). A built-in Decart solution is coming soon.

Unlike the [e-commerce example](../ecommerce/) which uses hardcoded prompts, this example shows how to use the `/api/enhance-prompt` endpoint to generate prompts dynamically - useful when you don't know what garments users will upload.

![Standalone example](screenshot.png)

---

## Quick start

### 1. Install dependencies

```bash
cd examples/standalone
npm install
```

### 2. Set your API keys

```bash
cp .env.example .env.local
```

Open `.env.local` and add both keys:

```env
DECART_API_KEY=sk_your_key_here
OPENAI_API_KEY=sk_your_openai_key_here
```

> **Note:** This example requires both keys. The Decart key powers the realtime try-on, and the OpenAI key powers the prompt generation.

### 3. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Your camera will start automatically. Click any product to try it on - the prompt is generated automatically.

---

## How it works

```
Page loads
  → Camera starts automatically (getUserMedia)
    → Fetch client token from /api/tokens
      → Connect to Decart's lucy-vton-latest model (WebRTC)
        → User sees themselves in the live video feed
          → User clicks a product
            → Capture a frame from the camera
            → Send garment image + person frame to /api/enhance-prompt
            → GPT-4o-mini generates a try-on prompt
            → setImage(garment, prompt) sends the garment to the model
              → AI video stream shows the user wearing the garment
```

When a product is clicked, it generates a prompt and then applies the garment:

```typescript
const handleSelectProduct = async (product: Product) => {
  const blob = await urlToImageBlob(product.image);
  const resized = await resizeImageBlob(blob);

  // Generate a prompt from the garment image + person camera frame
  const prompt = await enhancePrompt(resized, localVideoRef.current);

  // Apply the garment
  clientRef.current.setImage(resized, {
    prompt: prompt || "Try on this garment",
    enhance: false,
  });
};
```

The `enhancePrompt` helper (`lib/enhance-prompt.ts`) sends the garment image and a camera frame to `/api/enhance-prompt`, which uses GPT-4o-mini to generate a descriptive prompt like:

```
"Substitute the grey crewneck sweater with a blue and pink flame print hoodie with a kangaroo pocket and oversized fit"
```

---

## Customization

### Add your own products

Edit `lib/products.ts`. Each product just needs a name, image path, and price - no prompt required:

```typescript
{
  name: "Striped Polo",
  image: "/products/striped-polo.jpg",
  price: 45,
}
```

Place the garment image in `public/products/`. Use a clean image of just the garment on a white background for best results.

### Adapt to your stack

This example uses Next.js + Tailwind, but the core Decart integration works with any React framework. The key files to port:

1. **`app/api/tokens/route.ts`** - adapt to your backend (Express, Fastify, etc.)
2. **`app/api/enhance-prompt/route.ts`** - adapt to your backend
3. **`hooks/useDecartRealtime.ts`** - works in any React app as-is
4. **`hooks/useCamera.ts`** - works in any React app as-is
5. **`lib/enhance-prompt.ts`** - works in any React app as-is

---

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `DECART_API_KEY` | Yes | Creates client tokens for realtime connections |
| `OPENAI_API_KEY` | Yes | Powers `/api/enhance-prompt` for auto-generating prompts. Can be swapped for any vision-capable LLM. |
