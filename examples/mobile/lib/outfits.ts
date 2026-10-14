export interface Outfit {
  id: string;
  name: string;
  image: string;
  /** Written in advance so no LLM call is needed at try-on time. */
  prompt: string;
}

// Each outfit is a single head-to-toe reference image of the complete look,
// paired with a hand-written prompt. The model reproduces what it sees, so the
// prompt describes exactly what is in the image.
export const OUTFITS: Outfit[] = [
  {
    id: "smart-casual",
    name: "Smart Casual",
    image: "/outfits/outfit-1.png",
    prompt:
      "Substitute the person's current clothing with a navy wool single-breasted blazer over a crisp white button-down shirt, beige slim-fit chino trousers with a brown leather belt, and brown leather penny loafers",
  },
  {
    id: "weekend-utility",
    name: "Weekend Utility",
    image: "/outfits/outfit-2.png",
    prompt:
      "Substitute the person's current clothing with an olive green cotton utility jacket with four flap pockets, worn open over a plain white crew-neck t-shirt, black slim-fit jeans, and clean white leather low-top sneakers",
  },
];
