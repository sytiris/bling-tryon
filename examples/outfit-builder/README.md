# Outfit Builder (top + bottom composition)

> Combine separate top and bottom garments into full outfits for virtual try-on. Pick a top and a bottom from the sidebar (or upload your own images), and the example generates a combined outfit prompt and sends both garments to the model as a single try-on. Includes clothing fit validation that checks whether the garment type is compatible with what's visible in the camera.

Unlike the [standalone example](../standalone/) which applies one garment at a time, this example shows how to compose multi-piece outfits and generate outfit-specific prompts via `/api/outfit-prompt`.

---

## Quick start

### 1. Install dependencies

```bash
cd examples/outfit-builder
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

> **Note:** This example requires both keys. The Decart key powers the realtime try-on, and the OpenAI key powers prompt generation and fit validation.

### 3. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Your camera will start automatically. Click products to assign them to the top or bottom slot, then click "Try On Outfit". You can also double-click any product to try it on as a single item.

---

## How it works

### Single item try-on

Double-click any product to try it on individually, same as the [standalone example](../standalone/):

```
Double-click a product
  → Validate fit via /api/validate-fit (GPT-4o checks body visibility)
  → Generate prompt via /api/enhance-prompt (GPT-4o-mini)
  → setImage(garment, prompt)
```

### Outfit try-on (top + bottom)

Click products to fill the top and bottom slots, then click "Try On Outfit":

```
Click product → assigned to top slot
Click another → assigned to bottom slot
Click "Try On Outfit"
  → Load both garment images
  → Stack them vertically into a single combined image (canvas)
  → Generate outfit prompt via /api/outfit-prompt (GPT-4o-mini analyzes both)
  → setImage(combinedImage, outfitPrompt)
    → AI video shows person wearing both garments
```

The outfit prompt endpoint receives both garment images separately and generates a prompt like:

```
"Substitute the current outfit with a navy cable-knit sweater on top and dark wash slim-fit jeans on the bottom"
```

### Clothing fit validation

Before applying a single garment, the example calls `/api/validate-fit` which uses GPT-4o to check:

1. Whether the item is a supported type (30+ categories)
2. Whether the person's visible body parts match the garment category (e.g., can't try on pants if only head is visible)

If validation fails, a warning is shown instead of applying the garment.

---

## Customization

### Add your own products

Edit `lib/products.ts`. Each product needs an id, name, image path, price, and category:

```typescript
{
  id: "jeans",
  name: "Slim Fit Jeans",
  image: "/products/jeans.png",
  price: 79,
  category: "bottom",
}
```

The included products are all tops. Add your own bottom garment images to `public/products/` and uncomment/add entries with `category: "bottom"` in `products.ts`. You can also upload any image directly in the UI.

### Adapt to your stack

The key files specific to this example:

1. **`app/api/outfit-prompt/route.ts`** - GPT-4o-mini generates prompts from two garment images
2. **`app/api/validate-fit/route.ts`** - GPT-4o validates garment compatibility with visible body
3. **`lib/image-utils.ts`** - `combineClothingImages()` stacks top + bottom on a canvas
4. **`lib/enhance-prompt.ts`** - `generateOutfitPrompt()` and `validateFit()` client helpers

---

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `DECART_API_KEY` | Yes | Creates client tokens for realtime connections |
| `OPENAI_API_KEY` | Yes | Powers `/api/outfit-prompt` for outfit prompts, `/api/validate-fit` for fit validation, and `/api/enhance-prompt` for single-item prompts |
