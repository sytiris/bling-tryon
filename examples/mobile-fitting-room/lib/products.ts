export interface Product {
  id: string;
  name: string;
  image: string;
  prompt: string;
  price: number;
}

export const PRODUCTS: Product[] = [
  {
    id: "hoodie",
    name: "Decart Hoodie",
    image: "/products/decart-hoodie.png",
    prompt:
      "Substitute the current top with a navy blue hoodie with a white cross logo on the chest and a kangaroo pocket",
    price: 99,
  },
  {
    id: "bomber",
    name: "Decart Bomber Jacket",
    image: "/products/decart-bomber.png",
    prompt:
      "Substitute the current top with a black bomber jacket with a blue cross logo on the chest and a zip front",
    price: 149,
  },
  {
    id: "crewneck",
    name: "Decart Crewneck",
    image: "/products/decart-crewneck.png",
    prompt:
      'Substitute the current top with a grey crewneck sweatshirt with a large blue cross logo and "DECART" text on the front',
    price: 89,
  },
  {
    id: "tshirt",
    name: "Decart T-Shirt",
    image: "/products/decart-tshirt.png",
    prompt:
      "Substitute the current top with a navy blue t-shirt with a white cross logo on the chest",
    price: 45,
  },
  {
    id: "rainjacket",
    name: "Decart Rain Jacket",
    image: "/products/decart-rainjacket.png",
    prompt:
      "Substitute the current top with a yellow hooded rain jacket with a grey Decart cross logo on the chest and zip front",
    price: 129,
  },
  {
    id: "blazer",
    name: "Decart Blazer",
    image: "/products/decart-blazer.png",
    prompt:
      "Substitute the current top with a navy blue blazer with a white Decart cross logo on the chest, worn over a light blue dress shirt and navy tie",
    price: 199,
  },
];
