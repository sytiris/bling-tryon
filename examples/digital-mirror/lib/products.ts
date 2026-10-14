export interface Product {
  id: string;
  name: string;
  image: string;
  prompt: string;
  price: number;
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export const PRODUCTS: Product[] = [
  {
    id: slugify("Decart Beanie"),
    name: "Decart Beanie",
    image: "/products/decart-beanie.png",
    prompt:
      "Substitute the current headwear with a navy blue knit beanie with a white cross logo on the fold",
    price: 35,
  },
  {
    id: slugify("Decart Bomber Jacket"),
    name: "Decart Bomber Jacket",
    image: "/products/decart-bomber.png",
    prompt:
      "Substitute the current top with a black bomber jacket with a blue cross logo on the chest and a zip front",
    price: 149,
  },
  {
    id: slugify("Decart Cap"),
    name: "Decart Cap",
    image: "/products/decart-cap.png",
    prompt:
      'Substitute the current headwear with a black baseball cap with a blue cross logo and "DECART" text',
    price: 29,
  },
  {
    id: slugify("Decart Crewneck"),
    name: "Decart Crewneck",
    image: "/products/decart-crewneck.png",
    prompt:
      'Substitute the current top with a grey crewneck sweatshirt with a large blue cross logo and "DECART" text on the front',
    price: 89,
  },
  {
    id: slugify("Decart Hoodie"),
    name: "Decart Hoodie",
    image: "/products/decart-hoodie.png",
    prompt:
      "Substitute the current top with a navy blue hoodie with a white cross logo on the chest and a kangaroo pocket",
    price: 99,
  },
  {
    id: slugify("Decart Polo"),
    name: "Decart Polo",
    image: "/products/decart-polo.png",
    prompt:
      "Substitute the current top with a navy blue polo shirt with a white cross logo on the chest",
    price: 69,
  },
  {
    id: slugify("Decart T-Shirt"),
    name: "Decart T-Shirt",
    image: "/products/decart-tshirt.png",
    prompt:
      "Substitute the current top with a navy blue t-shirt with a white cross logo on the chest",
    price: 45,
  },
  {
    id: slugify("Decart Zip-Up Hoodie"),
    name: "Decart Zip-Up Hoodie",
    image: "/products/decart-zipup.png",
    prompt:
      "Substitute the current top with a black zip-up hoodie with a blue cross logo on the chest",
    price: 109,
  },
  {
    id: slugify("Decart Rain Jacket"),
    name: "Decart Rain Jacket",
    image: "/products/decart-rainjacket.png",
    prompt:
      "Substitute the current top with a yellow hooded rain jacket with a grey Decart cross logo on the chest and zip front",
    price: 129,
  },
  {
    id: slugify("Decart Blazer"),
    name: "Decart Blazer",
    image: "/products/decart-blazer.png",
    prompt:
      "Substitute the current top with a navy blue blazer with a white Decart cross logo on the chest, worn over a light blue dress shirt and navy tie",
    price: 199,
  },
];

export function getProductById(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}
