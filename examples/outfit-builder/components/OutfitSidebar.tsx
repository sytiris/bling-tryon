"use client";

import { useRef } from "react";
import { Product, getProductsByCategory } from "@/lib/products";
import Image from "next/image";

interface SlotState {
  product?: Product;
  file?: File;
  previewUrl?: string;
}

interface OutfitSidebarProps {
  topSlot: SlotState | null;
  bottomSlot: SlotState | null;
  activeProduct: Product | null;
  isCombining: boolean;
  fitWarning: string | null;
  onSelectTop: (product: Product) => void;
  onSelectBottom: (product: Product) => void;
  onUploadTop: (file: File) => void;
  onUploadBottom: (file: File) => void;
  onClearTop: () => void;
  onClearBottom: () => void;
  onTryOnOutfit: () => void;
  onTryOnSingle: (product: Product) => void;
}

export function OutfitSidebar({
  topSlot,
  bottomSlot,
  activeProduct,
  isCombining,
  fitWarning,
  onSelectTop,
  onSelectBottom,
  onUploadTop,
  onUploadBottom,
  onClearTop,
  onClearBottom,
  onTryOnOutfit,
  onTryOnSingle,
}: OutfitSidebarProps) {
  const topInputRef = useRef<HTMLInputElement>(null);
  const bottomInputRef = useRef<HTMLInputElement>(null);

  const tops = getProductsByCategory("top");
  const bottoms = getProductsByCategory("bottom");

  return (
    <aside className="w-80 shrink-0 border-r border-gray-800 bg-gray-900 flex flex-col overflow-y-auto">
      {/* Outfit Builder */}
      <div className="p-4 border-b border-gray-800">
        <h2 className="font-semibold text-lg">Outfit Builder</h2>
        <p className="text-sm text-gray-400 mt-1">
          Pick a top and bottom, then try on the full outfit
        </p>
      </div>

      {/* Outfit slots */}
      <div className="p-4 border-b border-gray-800 space-y-3">
        {/* Top slot */}
        <div>
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
            Top
          </label>
          <div className="mt-1 flex items-center gap-2">
            <div className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-600 bg-gray-800 flex items-center justify-center overflow-hidden shrink-0">
              {topSlot?.previewUrl ? (
                <img
                  src={topSlot.previewUrl}
                  alt="Top"
                  className="w-full h-full object-cover"
                />
              ) : topSlot?.product ? (
                <Image
                  src={topSlot.product.image}
                  alt={topSlot.product.name}
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-gray-500 text-xs">Empty</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">
                {topSlot?.product?.name ||
                  topSlot?.file?.name ||
                  "No top selected"}
              </p>
              <div className="flex gap-1 mt-1">
                <button
                  onClick={() => topInputRef.current?.click()}
                  className="text-xs px-2 py-1 bg-gray-700 rounded hover:bg-gray-600 transition-colors"
                >
                  Upload
                </button>
                {topSlot && (
                  <button
                    onClick={onClearTop}
                    className="text-xs px-2 py-1 bg-gray-700 rounded hover:bg-gray-600 text-red-400 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            <input
              ref={topInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUploadTop(file);
                e.target.value = "";
              }}
            />
          </div>
        </div>

        {/* Bottom slot */}
        <div>
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
            Bottom
          </label>
          <div className="mt-1 flex items-center gap-2">
            <div className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-600 bg-gray-800 flex items-center justify-center overflow-hidden shrink-0">
              {bottomSlot?.previewUrl ? (
                <img
                  src={bottomSlot.previewUrl}
                  alt="Bottom"
                  className="w-full h-full object-cover"
                />
              ) : bottomSlot?.product ? (
                <Image
                  src={bottomSlot.product.image}
                  alt={bottomSlot.product.name}
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-gray-500 text-xs">Empty</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">
                {bottomSlot?.product?.name ||
                  bottomSlot?.file?.name ||
                  "No bottom selected"}
              </p>
              <div className="flex gap-1 mt-1">
                <button
                  onClick={() => bottomInputRef.current?.click()}
                  className="text-xs px-2 py-1 bg-gray-700 rounded hover:bg-gray-600 transition-colors"
                >
                  Upload
                </button>
                {bottomSlot && (
                  <button
                    onClick={onClearBottom}
                    className="text-xs px-2 py-1 bg-gray-700 rounded hover:bg-gray-600 text-red-400 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            <input
              ref={bottomInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUploadBottom(file);
                e.target.value = "";
              }}
            />
          </div>
        </div>

        {/* Try on outfit button */}
        <button
          onClick={onTryOnOutfit}
          disabled={!topSlot || !bottomSlot || isCombining}
          className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isCombining ? "Generating outfit..." : "Try On Outfit"}
        </button>

        {fitWarning && (
          <p className="text-xs text-amber-400 bg-amber-400/10 rounded-lg px-3 py-2">
            {fitWarning}
          </p>
        )}
      </div>

      {/* Top products */}
      <div className="p-4 border-b border-gray-800">
        <h3 className="text-sm font-medium text-gray-300 mb-3">Tops</h3>
        <div className="grid grid-cols-3 gap-2">
          {tops.map((product) => (
            <button
              key={product.id}
              onClick={() => onSelectTop(product)}
              onDoubleClick={() => onTryOnSingle(product)}
              className={`text-left rounded-lg overflow-hidden border-2 transition-all ${
                topSlot?.product?.id === product.id
                  ? "border-blue-500 ring-2 ring-blue-500/30"
                  : activeProduct?.id === product.id
                    ? "border-green-500"
                    : "border-gray-700 hover:border-gray-500"
              }`}
              title={`Click to set as top, double-click to try on alone`}
            >
              <div className="relative aspect-square bg-gray-800">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-cover"
                  sizes="100px"
                />
              </div>
              <div className="p-1.5 bg-gray-900">
                <p className="text-xs font-medium truncate">{product.name}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom products */}
      {bottoms.length > 0 && (
        <div className="p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Bottoms</h3>
          <div className="grid grid-cols-3 gap-2">
            {bottoms.map((product) => (
              <button
                key={product.id}
                onClick={() => onSelectBottom(product)}
                onDoubleClick={() => onTryOnSingle(product)}
                className={`text-left rounded-lg overflow-hidden border-2 transition-all ${
                  bottomSlot?.product?.id === product.id
                    ? "border-blue-500 ring-2 ring-blue-500/30"
                    : activeProduct?.id === product.id
                      ? "border-green-500"
                      : "border-gray-700 hover:border-gray-500"
                }`}
                title={`Click to set as bottom, double-click to try on alone`}
              >
                <div className="relative aspect-square bg-gray-800">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-cover"
                    sizes="100px"
                  />
                </div>
                <div className="p-1.5 bg-gray-900">
                  <p className="text-xs font-medium truncate">{product.name}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Upload hint */}
      <div className="p-4 mt-auto border-t border-gray-800">
        <p className="text-xs text-gray-500">
          Click a product to assign to a slot. Double-click to try on a single
          item. Upload your own images using the Upload buttons above.
        </p>
      </div>
    </aside>
  );
}
