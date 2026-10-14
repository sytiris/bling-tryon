"use client";

import type { Product } from "@/lib/products";

interface ShoppingViewProps {
  products: Product[];
  queue: Product[];
  intervalSeconds: number;
  onIntervalChange: (seconds: number) => void;
  onAddToQueue: (product: Product) => void;
  onRemoveFromQueue: (productId: string) => void;
  isInQueue: (productId: string) => boolean;
  onEnterFitRoom: () => void;
}

export function ShoppingView({
  products,
  queue,
  intervalSeconds,
  onIntervalChange,
  onAddToQueue,
  onRemoveFromQueue,
  isInQueue,
  onEnterFitRoom,
}: ShoppingViewProps) {
  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <div className="px-4 pt-6 pb-32">
        <h1 className="text-2xl font-bold mb-1">Fitting Room</h1>
        <p className="text-neutral-500 text-sm mb-6">
          Select items to try on, then enter the fit room
        </p>

        {/* Product grid */}
        <div className="grid grid-cols-2 gap-3">
          {products.map((product) => {
            const inQueue = isInQueue(product.id);
            return (
              <button
                key={product.id}
                onClick={() =>
                  inQueue ? onRemoveFromQueue(product.id) : onAddToQueue(product)
                }
                className={`relative rounded-2xl overflow-hidden border-2 transition-all ${
                  inQueue
                    ? "border-blue-500 shadow-lg shadow-blue-500/20"
                    : "border-transparent"
                }`}
              >
                <div className="aspect-square bg-neutral-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-2">
                  <p className="text-sm font-medium truncate">{product.name}</p>
                  <p className="text-xs text-neutral-500">${product.price}</p>
                </div>
                {inQueue && (
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">✓</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Rotation interval */}
        <div className="mt-6">
          <label className="text-sm text-neutral-500 block mb-2">
            Rotation interval: {intervalSeconds}s
          </label>
          <input
            type="range"
            min={10}
            max={45}
            value={intervalSeconds}
            onChange={(e) => onIntervalChange(Number(e.target.value))}
            className="w-full"
          />
        </div>
      </div>

      {/* Bottom bar */}
      {queue.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-4" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 16px)" }}>
          <button
            onClick={onEnterFitRoom}
            className="w-full bg-blue-500 text-white font-bold py-4 rounded-2xl text-lg active:bg-blue-600"
          >
            Enter Fit Room ({queue.length} item{queue.length > 1 ? "s" : ""})
          </button>
        </div>
      )}
    </div>
  );
}
