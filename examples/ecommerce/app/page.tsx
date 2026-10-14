"use client";

import { useState } from "react";
import { PRODUCTS, Product } from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";
import { TryOnModal } from "@/components/TryOnModal";

export default function HomePage() {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  return (
    <main className="min-h-screen">
      {/* Nav */}
      <nav className="border-b border-neutral-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-bold tracking-widest uppercase">
            Urban
          </span>
          <div className="flex items-center gap-4 text-neutral-500">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4ZM3 6h18M16 10a4 4 0 0 1-8 0" />
            </svg>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <p className="text-xs font-medium tracking-widest uppercase text-neutral-400">
            New Collection
          </p>
          <h1 className="text-4xl md:text-5xl font-bold mt-2 tracking-tight">
            Winter Essentials
          </h1>
          <p className="text-neutral-500 mt-3 max-w-md">
            Try before you buy. Click any item to see how it looks on you in
            real-time.
          </p>
        </div>
      </div>

      {/* Product grid */}
      <div className="max-w-7xl mx-auto px-6 py-10">
        <p className="text-sm text-neutral-500 mb-8">
          {PRODUCTS.length} products
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-10">
          {PRODUCTS.map((product) => (
            <ProductCard
              key={product.name}
              product={product}
              onTryOn={() => setSelectedProduct(product)}
            />
          ))}
        </div>
      </div>

      {selectedProduct && (
        <TryOnModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </main>
  );
}
