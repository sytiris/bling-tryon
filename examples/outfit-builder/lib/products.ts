export type Category = "top" | "bottom";

export interface Product {
  id: string;
  name: string;
  image: string;
  price: number;
  category: Category;
}

export const PRODUCTS: Product[] = [
  // Tops
  {
    id: "tshirt",
    name: "Decart T-Shirt",
    image: "/products/decart-tshirt.png",
    price: 45,
    category: "top",
  },
  {
    id: "polo",
    name: "Decart Polo",
    image: "/products/decart-polo.png",
    price: 69,
    category: "top",
  },
  {
    id: "crewneck",
    name: "Decart Crewneck",
    image: "/products/decart-crewneck.png",
    price: 89,
    category: "top",
  },
  {
    id: "hoodie",
    name: "Decart Hoodie",
    image: "/products/decart-hoodie.png",
    price: 99,
    category: "top",
  },
  {
    id: "zipup",
    name: "Decart Zip-Up Hoodie",
    image: "/products/decart-zipup.png",
    price: 109,
    category: "top",
  },
  {
    id: "bomber",
    name: "Decart Bomber Jacket",
    image: "/products/decart-bomber.png",
    price: 149,
    category: "top",
  },
  {
    id: "blazer",
    name: "Decart Blazer",
    image: "/products/decart-blazer.png",
    price: 199,
    category: "top",
  },
  {
    id: "rainjacket",
    name: "Decart Rain Jacket",
    image: "/products/decart-rainjacket.png",
    price: 129,
    category: "top",
  },

  // Bottoms - add your own bottom garment images here
  // {
  //   id: "jeans",
  //   name: "Slim Fit Jeans",
  //   image: "/products/jeans.png",
  //   price: 79,
  //   category: "bottom",
  // },
];

export function getProductsByCategory(category: Category): Product[] {
  return PRODUCTS.filter((p) => p.category === category);
}
