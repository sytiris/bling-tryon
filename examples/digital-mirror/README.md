# Digital Mirror Virtual Try-On

> Two-device setup: a display screen shows the camera feed + AI output with a QR code, and a phone scans the QR to browse and select products. Only connects to Decart when a phone is active — no credits used while idle.

A digital mirror for in-store kiosks or smart mirrors. The display creates a session and shows a QR code. A customer scans it with their phone, browses a product grid, and taps to try on. The display picks up the selection and streams the AI try-on result. Includes portrait cropping for vertical screens.

---

## Quick start

### 1. Install dependencies

```bash
cd examples/digital-mirror
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

Open [http://localhost:3000](http://localhost:3000) on the display screen. Scan the QR code with your phone (or open `/remote/XXXXXX` in another browser tab).

---

## How it works

```
Page loads (display)
  → Camera starts (getUserMedia, environment-facing)
    → Portrait stream created (landscape 1280×720 → portrait 720×1280)
      → Session created → QR code rendered
        → Phone scans QR → claims session
          → Display detects controller → fetch client token
            → Connect to Decart's lucy-vton-latest model (WebRTC)
              → Phone taps product → display polls → setImage(garment, prompt)
                → AI video stream shows the person wearing the garment
              → Phone taps "Done" or leaves → disconnect (stops billing)
```

**Session lifecycle:**
1. Display creates a session and renders a QR code pointing to `/remote/{sessionId}`
2. Phone scans QR, validates the session, and claims control
3. Display detects the controller via polling and connects to Decart
4. Phone sends product selections; display polls and calls `setImage()` for each
5. Phone sends heartbeat pings every 5s; if pings stop for 10s, session is released
6. Phone taps "Done" or navigates away → controller released → Decart disconnected

All session state is stored in-memory on the server (no database needed). Sessions expire after 30 minutes of inactivity.

---

## Key files

| File | Purpose |
|------|---------|
| `app/page.tsx` | Display page — camera, portrait stream, Decart connection, QR code, polling for selections |
| `app/remote/[sessionId]/page.tsx` | Phone controller — session claiming, product grid, heartbeat, release |
| `hooks/usePortraitStream.ts` | Crops landscape camera to portrait via off-screen canvas + `captureStream()` |
| `hooks/useMirrorCamera.ts` | Environment-facing camera with fallback to any camera |
| `hooks/useDecartRealtime.ts` | Decart WebRTC connection management |
| `lib/mirror-store.ts` | In-memory session store (sessions, controllers, selections) |
| `lib/products.ts` | Product catalog with hardcoded prompts |
| `app/api/mirror/*/route.ts` | 6 API routes: session, claim, poll, select, ping, release |
| `app/api/tokens/route.ts` | Server-side Decart client token creation |

---

## Portrait cropping for vertical screens

Digital mirrors typically use portrait-oriented displays (vertical screens), but webcams output landscape video (1280×720). The `usePortraitStream` hook transforms the camera feed before sending it to Decart:

1. Creates an off-screen `<canvas>` at 720×1280 (portrait)
2. Creates a hidden `<video>` element playing the camera stream
3. Uses `requestAnimationFrame` at 20fps to draw a center-cropped frame from the video onto the canvas
4. Calls `canvas.captureStream(20)` to produce a new `MediaStream`
5. This portrait stream is sent to Decart instead of the raw camera stream

**The math:**

```
Camera: 1280×720 (landscape, aspect ratio 1.78)
Output: 720×1280 (portrait, aspect ratio 0.5625)

Since camera aspect (1.78) > output aspect (0.5625):
  → Camera is wider than needed → crop the sides

  cropH = 720 (full height)
  cropW = 720 × (720/1280) = 405
  cropX = (1280 - 405) / 2 = 437  (center horizontally)
  cropY = 0

Result: A 405×720 center strip from the camera, scaled to 720×1280
```

Add `?landscape` to skip cropping and send the raw camera stream.

---

## Customization

### Query parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `?flip=false` | `true` (mirrored) | Disable horizontal flip |
| `?landscape` | portrait crop | Skip portrait cropping, send raw landscape stream |

### Add your own products

Edit `lib/products.ts`. Each product needs an `id`, `name`, `image` path, and `prompt`:

```typescript
{
  id: "striped-polo",
  name: "Striped Polo",
  image: "/products/striped-polo.jpg",
  prompt: "Substitute the current top with a navy and white striped polo shirt with a slim fit",
  price: 45,
}
```

Place the garment image in `public/products/`. Prompts are sent directly to the model with `enhance: false`, so write detailed prompts for best results.

---

## Advanced

This example is intentionally simplified to focus on the two-device mirror pattern. For production you'd likely want:

- **Database-backed sessions** — The in-memory store (`lib/mirror-store.ts`) resets on server restart and doesn't work across multiple instances. Swap the Maps with Postgres, Redis, or any key-value store. The interface is minimal so the migration is straightforward.
- **Image uploads and custom prompts** — Let users upload their own garment photos or enter free-text style prompts from the phone. Requires an image upload endpoint (e.g. S3 or Vercel Blob) and extended selection types.
- **Recording and sharing** — Capture snapshots or short video clips of the try-on result and let users share via email, SMS, or QR code.

---

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `DECART_API_KEY` | Yes | Creates client tokens for realtime WebRTC connections |
