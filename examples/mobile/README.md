# Mobile

> A simple mobile try-on with two ready-made full outfits. The shopper taps Start, the app checks the network with the Decart SDK before opening a session, then streams the camera through `lucy-vton-latest` and swaps between two complete head-to-toe looks with one tap each.

This is the smallest full-outfit example in the repo. Each outfit is a single reference image of the whole look with a prompt written in advance, so there is no LLM call, no upload and no server work beyond minting a client token. What it adds on top of the [e-commerce example](../ecommerce/) is what a phone needs: a **connection quality gate** driven by the SDK's built-in `checkConnectivity()` and `onConnectionQuality` signals, and a **framing check** (via [MediaPipe Pose Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker)) that asks the shopper to move the phone back when a full outfit would be cropped at the waist.

---

## Quick start

### 1. Install dependencies

```bash
cd examples/mobile
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

Open [http://localhost:3000](http://localhost:3000) on your phone (or use Chrome DevTools mobile emulation). Camera access requires HTTPS or `localhost`; to test on a real phone, tunnel the dev server (for example with `ngrok http 3000`) and open the HTTPS URL.

---

## How it works

```
Start screen
  → Tap "Start try-on"
    → Camera permission requested
    → Fetch client token from /api/tokens
      → client.realtime.checkConnectivity()          (SDK preflight, no session, no cost)
        → good / fair   → continue automatically
        → poor          → warning card, "Continue"
        → critical      → blocking card with reasons, "Retry" / "Try anyway"
          → Connect to lucy-vton-latest (WebRTC) with onConnectionQuality
            → Framing check: are the knees in frame?
              → no  → "Move your phone back to see the full outfit" (auto-clears / Ignore)
              → yes → setImage(outfit image, pre-written prompt)
            → Tap the other outfit → same gate → setImage(...)
            → Live badge shows the SDK's signal bars; "poor"/"critical" shows a slow-connection overlay
```

### Preflight network check

Before a session is opened, `hooks/useDecartRealtime.ts` runs the SDK's network-only probe. It answers "can WebRTC leave this network, and how far is the server?" without starting (or billing) a session:

```typescript
import { createDecartClient } from "@decartai/sdk";

const client = createDecartClient({ apiKey }); // the short-lived client token
const { quality, metrics, reasons } = await client.realtime.checkConnectivity();
// quality:            "good" | "fair" | "poor" | "critical"
// metrics.transport:  "udp" | "relay" | "failed"
// metrics.rttMs:      round trip to the media server, or null
// reasons:            human-readable strings explaining a non-good verdict
```

`components/NetworkGate.tsx` turns that into the three outcomes above. The SDK reports; the app decides what to gate.

### In-session quality

While connected, the SDK derives a smoothed verdict from live WebRTC stats and names the bottleneck. The example passes it straight into React state:

```typescript
const rtClient = await client.realtime.connect(stream, {
  model: models.realtime("lucy-vton-latest"),
  onRemoteStream,
  onConnectionQuality: ({ quality, limitingFactor, warmingUp, metrics }) => {
    // limitingFactor: "bandwidth" | "latency" | "loss" | "stall" | "cpu" | "none"
    // metrics: { rttMs, fps, packetLoss, availableUpstreamKbps, ... }
    setQuality({ quality, limitingFactor, warmingUp, metrics });
  },
});
```

`components/ConnectionQualityBadge.tsx` renders the verdict as signal bars next to the Live pill, and `hooks/useConnectionWarning.ts` shows `components/LowQualityWarning.tsx` when the verdict drops to `poor` or `critical` after the warm-up window. Dismissing it ("Try anyway") keeps it hidden for the rest of the session.

### Applying an outfit

Each outfit in `lib/outfits.ts` is a single image plus a prompt. Sending one is a gated `setImage()` call:

```typescript
const applyOutfit = async (outfit: Outfit) => {
  // Hold the send while the person is cropped above the knees
  if ((await awaitFitClearance()) === "superseded") return;

  const blob = await urlToImageBlob(outfit.image);
  await clientRef.current.setImage(blob, {
    prompt: outfit.prompt,
    enhance: false,
    timeout: 30_000,
  });
};
```

### Framing check

A full outfit only renders if the lower body is on screen. `hooks/usePoseBodyVisibility.ts` runs MediaPipe Pose Landmarker in the browser (IMAGE mode, so each check is stateless) and reads the predicted **y** of the knee landmarks: a knee below the frame reads `y > 1`, which is a direct measurement of "cropped" and more reliable than the visibility score. `hooks/useFitGate.ts` wraps that in the gate: a cropped verdict is confirmed on a second frame 200 ms later, the send is parked behind the card, the camera is re-checked every 400 ms, and two passing polls in a row bring the card down and release the send. Ignore sends anyway. If the model has not loaded or finds no pose, the check passes rather than blocking.

---

## Connection quality thresholds

These are the thresholds the SDK uses for its live verdict. The overall verdict is the worst dimension, smoothed with a short warm-up and hysteresis so it does not flicker.

| Metric | Good | Fair | Poor | Critical |
|--------|------|------|------|----------|
| RTT latency | ≤ 150 ms | ≤ 300 ms | ≤ 500 ms | > 500 ms |
| Packet loss | ≤ 0.1% | ≤ 1% | ≤ 5% | > 5% |
| Inbound frame rate | ≥ 20 fps | ≥ 12 fps | ≥ 5 fps | < 5 fps |

A session uses roughly 1.3–2.4 Mbps in each direction; provision 4 Mbps per direction per concurrent session. The bandwidth dimension relies on Chromium-only stats, so on Safari and Firefox the verdict reflects latency, loss and frame rate only. Full details, including the domains and ports to allow, are in the [Network Requirements](https://docs.platform.decart.ai/integrations/network-requirements) guide and the [JavaScript SDK reference](https://docs.platform.decart.ai/sdks/javascript-realtime#connection-quality).

---

## Customization

### Swap the outfits

Edit `lib/outfits.ts`. Each outfit needs an id, name, image path and prompt:

```typescript
{
  id: "evening",
  name: "Evening",
  image: "/outfits/evening.png",
  prompt:
    "Substitute the person's current clothing with a black satin slip dress, a cropped grey wool blazer, and black pointed-toe heels",
}
```

Place the image in `public/outfits/`. Use a clean head-to-toe shot of the complete look on a white background (a flat lay or ghost mannequin works well). Describe exactly what is in the image, top to shoes, in 25–40 words. The bundled images were generated with an image model from the same descriptions used as prompts.

### Tune the network gate

- **Which verdicts block:** `components/NetworkGate.tsx` blocks on `critical` and warns on `poor`. Change the conditions in `NetworkGate` and the auto-continue effect in `app/page.tsx` to be stricter or looser.
- **In-session overlay:** `hooks/useConnectionWarning.ts` decides when the slow-connection overlay shows and that a dismissal lasts for the session. Reset `dismissed` when the verdict returns to `good` if you want it to re-arm.
- **Deep preflight:** for a *measured* verdict, `checkConnectivity({ deep: true, model })` briefly opens a real session with a synthetic source and measures glass-to-glass latency. It costs a short session, so this example uses the fast probe.

### Adjust or remove the framing check

- **Thresholds and timing** live in `lib/constants.ts` (`KNEE_IN_FRAME_MAX_Y`, `POSE_CONFIRM_DELAY_MS`, `POSE_POLL_INTERVAL_MS`, `POSE_CLEAR_CONFIRM_POLLS`).
- **Hips instead of knees** (for bottoms rather than full outfits): switch the landmark indices in `hooks/usePoseBodyVisibility.ts` to `23` / `24` and tighten the cut to about `0.95`.
- **Remove it:** delete the `awaitFitClearance()` line in `applyOutfit` and drop `@mediapipe/tasks-vision`.

### Adapt to your stack

This example uses Next.js + Tailwind, but the core integration works with any React framework. The key files to port:

1. **`app/api/tokens/route.ts`** - adapt to your backend (Express, Fastify, etc.)
2. **`hooks/useDecartRealtime.ts`** - connect, `checkConnectivity`, and `onConnectionQuality`; works in any React app as-is
3. **`hooks/useCamera.ts`** - works in any React app as-is
4. **`hooks/useFitGate.ts`** + **`hooks/usePoseBodyVisibility.ts`** - works in any React app, requires `@mediapipe/tasks-vision`
5. **`hooks/useConnectionWarning.ts`** - works in any React app as-is

---

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `DECART_API_KEY` | Yes | Creates client tokens for realtime connections |
