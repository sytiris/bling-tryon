# Mobile Fitting Room

> A mobile-first fitting room with hand gesture navigation. Users queue products, enter a full-screen fit room, and browse their queue by raising a hand — right hand for next, left for previous. Products auto-rotate on a timer with sparkle transition effects.

This example combines real-time virtual try-on with [MediaPipe Pose Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker) for hands-free gesture navigation. No server-side detection needed — MediaPipe runs entirely in the browser using the `pose_landmarker_lite` model with GPU acceleration (CPU fallback). Each product has a hardcoded prompt. For AI-generated prompts, see the [standalone example](../standalone/).

---

## Quick start

### 1. Install dependencies

```bash
cd examples/mobile-fitting-room
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

Open [http://localhost:3000](http://localhost:3000) on your phone (or use Chrome DevTools mobile emulation). You should see a product grid. Tap items to queue them, then tap "Enter Fit Room".

---

## How it works

```
Shopping phase
  → Tap products to add to queue
  → Set rotation interval (10-45 seconds)
  → Tap "Enter Fit Room"
    → Camera starts (getUserMedia)
      → Fetch client token from /api/tokens
        → Connect to Decart's lucy-vton-latest model (WebRTC)
          → First product image sent with initial connection
            → Products auto-rotate on timer with splash transitions
            → Raise right hand 1.5s → next product
            → Raise left hand 1.5s → previous product
            → Sparkle overlay during AI transitions
              → Tap back → camera stops, connection disconnects
```

The core flow in `app/page.tsx`:

```typescript
// 1. Queue products, then enter fit room
const enterFitRoom = async () => {
  const [cameraStream, token, firstBlob] = await Promise.all([
    startCamera(),
    fetchToken(),
    urlToImageBlob(queue[0].image),
  ]);

  // 2. Connect with first product image
  await connect({
    apiKey: token,
    stream: cameraStream,
    image: firstBlob,
    onRemoteStream: handleRemoteStream,
  });
};

// 3. Apply products as they rotate
const applyProduct = async (product: Product) => {
  const blob = await urlToImageBlob(product.image);
  await clientRef.current.setImage(blob, {
    prompt: product.prompt,
    enhance: false,
  });
};
```

Hand gesture detection uses [MediaPipe Pose Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker) (`@mediapipe/tasks-vision`) to track wrist position relative to shoulders. The model runs in the browser via WASM + WebGL. When a wrist stays above its shoulder for 1.5 seconds, the corresponding navigation fires. Detection runs via `requestAnimationFrame` with canvas frame capture for reliable results on mobile.

---

## Customization

### Add your own products

Edit `lib/products.ts`. Each product needs an id, name, image path, prompt, and price:

```typescript
{
  id: "my-jacket",
  name: "Red Leather Jacket",
  image: "/products/red-jacket.png",
  prompt: "Substitute the current top with a red leather jacket with silver zippers",
  price: 199,
}
```

Place the garment image in `public/products/`. Use a clean image of just the garment on a white background for best results.

### Adjust timing

- **Rotation interval**: Configurable in the shopping view slider (10-45 seconds)
- **Gesture dwell time**: Change `DWELL_MS` in `hooks/useHandGesture.ts` (default: 1500ms)

### Adapt to your stack

This example uses Next.js + Tailwind, but the core integration works with any React framework. The key files to port:

1. **`app/api/tokens/route.ts`** - adapt to your backend (Express, Fastify, etc.)
2. **`hooks/useDecartRealtime.ts`** - works in any React app as-is
3. **`hooks/useCamera.ts`** - works in any React app as-is
4. **`hooks/useHandGesture.ts`** - works in any React app, requires `@mediapipe/tasks-vision`
5. **`hooks/useFittingRotation.ts`** - works in any React app as-is

---

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `DECART_API_KEY` | Yes | Creates client tokens for realtime connections |
