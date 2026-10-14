# Person Detection Virtual Try-On

> Auto-detects when a person is in the camera frame using [MediaPipe Pose Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker) and connects/disconnects Decart's realtime model accordingly. Saves credits when no one is present - ideal for kiosks, smart mirrors, or any unattended deployment.

Unlike the [standalone example](../standalone/) which connects immediately on page load, this example only connects when someone is actually standing in front of the camera.

---

## Quick start

### 1. Install dependencies

```bash
cd examples/person-detection
npm install
```

### 2. Set your API key

```bash
cp .env.example .env.local
```

Open `.env.local` and add your key:

```env
DECART_API_KEY=sk_your_key_here
```

### 3. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Your camera will start and MediaPipe will begin scanning. Step in front of the camera to trigger a connection.

---

## How it works

```
Page loads
  → Camera starts automatically (getUserMedia)
    → MediaPipe PoseLandmarker loads (WASM + WebGL, runs in browser)
      → Every 1s: detectForVideo() checks for body landmarks
        → Person detected (landmarks found)
          → Fetch client token from /api/tokens
            → Connect to Decart's lucy-vton-latest model (WebRTC)
              → User clicks a product → garment applied
        → Person leaves (3 consecutive misses, ~3s)
          → Disconnect from Decart (stops billing)
            → Person returns → fresh token → reconnect → re-apply last garment
```

No server-side detection needed. MediaPipe's pose landmarker runs entirely in the browser using the `pose_landmarker_lite` model with GPU acceleration.

---

## Key files

| File | Purpose |
|------|---------|
| `hooks/usePersonDetection.ts` | Initializes MediaPipe PoseLandmarker, polls video every 1s, tracks consecutive hits/misses, exposes `personPresent` state |
| `components/PersonDetectionView.tsx` | Extended view with detection-aware status badge (Scanning / Person detected / Live) and contextual hints |
| `app/page.tsx` | Main orchestration - detection-driven connect/disconnect lifecycle with automatic garment re-application |

Everything else (`useCamera`, `useDecartRealtime`, `ProductSidebar`, token API route, image utils) is the same as the [standalone example](../standalone/).

---

## State machine

```
Camera starts → MediaPipe loads → "Scanning..."
  → Person detected → Fetch token → Connect → "Connected"
    → User clicks product → Apply garment → "Live"
    → Person leaves (3 misses) → Disconnect → "Scanning..."
      → Person returns → Fresh token → Reconnect → Re-apply last garment
```

---

## Customization

### Tuning detection sensitivity

In `hooks/usePersonDetection.ts`:

- **`DETECTION_INTERVAL_MS`** (default: 1000) - how often to check for a person. Lower = more responsive, higher = less CPU usage
- **`MISS_THRESHOLD`** (default: 3) - consecutive missed detections before disconnecting. Higher = more tolerant of brief occlusions

### Add your own products

Edit `lib/products.ts` and place garment images in `public/products/`. See the [standalone README](../standalone/README.md#add-your-own-products) for details.

---

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `DECART_API_KEY` | Yes | Creates client tokens for realtime WebRTC connections |
