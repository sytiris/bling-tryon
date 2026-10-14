"use client";

import { PRODUCTS, Product } from "@/lib/products";
import Image from "next/image";

interface ProductSidebarProps {
  activeProduct: Product | null;
  onSelectProduct: (product: Product) => void;
}

export function ProductSidebar({
  activeProduct,
  onSelectProduct,
}: ProductSidebarProps) {
  return (
    <aside className="w-72 shrink-0 border-r border-gray-800 bg-gray-900 flex flex-col">
      <div className="p-4 border-b border-gray-800">
        <h2 className="font-semibold text-lg">Products</h2>
        <p className="text-sm text-gray-400 mt-1">
          Click a product to try it on
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-3">
          {PRODUCTS.map((product) => (
            <button
              key={product.name}
              onClick={() => onSelectProduct(product)}
              className={`text-left rounded-lg overflow-hidden border-2 transition-all ${
                activeProduct?.name === product.name
                  ? "border-blue-500 ring-2 ring-blue-500/30"
                  : "border-gray-700 hover:border-gray-500"
              }`}
            >
              <div className="relative aspect-square bg-gray-800">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-cover"
                  sizes="150px"
                />
              </div>
              <div className="p-2 bg-gray-900">
                <p className="text-sm font-medium truncate">{product.name}</p>
                <p className="text-xs text-gray-400">${product.price}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
