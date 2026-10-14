# E-commerce Virtual Try-On

> Add a "Try it on" button to any product page - opens a modal with the user's camera and real-time AI try-on.

Users browse a product grid, click "Try On", and see themselves wearing the garment in real-time through their camera. This is the simplest integration - each product has a hardcoded prompt. For AI-generated prompts, see the [standalone example](../standalone/).

![E-commerce example](screenshot.png)

---

## Quick start

### 1. Install dependencies

```bash
cd examples/ecommerce
npm install
```

### 2. Set your API key

```bash
cp .env.example .env.local
```

Open `.env.local` and add your Decart API key:

```env
DECART_API_KEY=sk_your_key_here
```

> **Tip:** Get your API key from [platform.decart.ai](https://platform.decart.ai). See the [Authentication guide](https://docs.platform.decart.ai/getting-started/authentication) for details.

### 3. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You should see a grid of 6 products. Click "Try On" on any product to open the try-on modal.

---

## How it works

```
User clicks "Try On"
  → Modal opens
    → Camera starts (getUserMedia)
      → Fetch client token from /api/tokens
        → Connect to Decart's lucy-vton-latest model (WebRTC)
          → Send garment image + prompt via setImage()
            → AI video stream shows the user wearing the garment
              → User closes modal → camera stops, connection disconnects
```

The core flow in `TryOnModal.tsx`:

```typescript
// 1. Start the camera
const mediaStream = await startCamera();

// 2. Get a short-lived client token
const res = await fetch("/api/tokens", { method: "POST" });
const { apiKey } = await res.json();

// 3. Connect to Decart
const rtClient = await connect({
  apiKey,
  stream: mediaStream,
  prompt: product.prompt,
  onRemoteStream: handleRemoteStream,
});

// 4. Send the garment image
const blob = await urlToImageBlob(product.image);
const resized = await resizeImageBlob(blob);
rtClient.setImage(resized, {
  prompt: product.prompt,
  enhance: false,
});
```

---

## Customization

### Add your own products

Edit `lib/products.ts`. Each product needs a name, image path, prompt, and price:

```typescript
{
  name: "Striped Polo",
  image: "/products/striped-polo.jpg",
  prompt: "Substitute the current top with a navy and white striped polo shirt with a slim fit",
  price: 45,
}
```

Place the garment image in `public/products/`. Use a clean image of just the garment on a white background for best results.

### Use enhance-prompt for user-uploaded images

If your app accepts user-uploaded garment images, use the enhance-prompt API instead of hardcoded prompts:

```typescript
const formData = new FormData();
formData.append("image", userUploadedFile);

const res = await fetch("/api/enhance-prompt", {
  method: "POST",
  body: formData,
});
const { prompt } = await res.json();

// Use the generated prompt with setImage()
rtClient.setImage(resizedBlob, { prompt, enhance: false });
```

Requires `OPENAI_API_KEY` in `.env.local`.

### Adapt to your stack

This example uses Next.js + Tailwind, but the core integration works with any React framework. The key files to port:

1. **`app/api/tokens/route.ts`** - adapt to your backend (Express, Fastify, etc.)
2. **`hooks/useDecartRealtime.ts`** - works in any React app as-is
3. **`hooks/useCamera.ts`** - works in any React app as-is

---

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `DECART_API_KEY` | Yes | Creates client tokens for realtime connections |
| `OPENAI_API_KEY` | No | Powers `/api/enhance-prompt` for auto-generating prompts |
