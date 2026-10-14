"use client";

import { useRef } from "react";
import { PRODUCTS, Product } from "@/lib/products";
import Image from "next/image";

interface ProductSidebarProps {
  activeProduct: Product | null;
  uploadedImage: string | null;
  isUploadActive: boolean;
  onSelectProduct: (product: Product) => void;
  onUploadGarment: (file: File) => void;
  onReactivateUpload: () => void;
  onClearUpload: () => void;
  autoExtract: boolean;
  onAutoExtractChange: (value: boolean) => void;
  extremePrecision: boolean;
  onExtremePrecisionChange: (value: boolean) => void;
  precisionSnapshot?: string | null;
  precisionGenerated?: string | null;
}

export function ProductSidebar({
  activeProduct,
  uploadedImage,
  isUploadActive,
  onSelectProduct,
  onUploadGarment,
  onReactivateUpload,
  onClearUpload,
  autoExtract,
  onAutoExtractChange,
  extremePrecision,
  onExtremePrecisionChange,
  precisionSnapshot,
  precisionGenerated,
}: ProductSidebarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadGarment(file);
      e.target.value = "";
    }
  };

  return (
    <aside className="w-72 shrink-0 border-r border-gray-800 bg-gray-900 flex flex-col">
      <div className="p-4 border-b border-gray-800">
        <h2 className="font-semibold text-lg">Products</h2>
        <p className="text-sm text-gray-400 mt-1">
          Click a product or upload your own
        </p>
      </div>

      {/* Upload section */}
      <div className="p-4 border-b border-gray-800">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleFileChange}
          className="hidden"
        />

        {uploadedImage ? (
          <div className="relative">
            <button
              onClick={onReactivateUpload}
              className={`w-full rounded-lg overflow-hidden border-2 transition-all ${
                isUploadActive
                  ? "border-blue-500 ring-2 ring-blue-500/30"
                  : "border-gray-700 hover:border-gray-500"
              }`}
            >
              <div className="relative aspect-square bg-gray-800">
                <img
                  src={uploadedImage}
                  alt="Uploaded garment"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-2 bg-gray-900">
                <p className="text-sm font-medium">Your Upload</p>
              </div>
            </button>
            <button
              onClick={onClearUpload}
              className="absolute top-1 right-1 w-6 h-6 bg-black/70 hover:bg-black rounded-full flex items-center justify-center text-white/80 hover:text-white text-xs z-10"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full border-2 border-dashed border-gray-700 hover:border-gray-500 rounded-lg p-4 transition-colors"
          >
            <div className="flex flex-col items-center gap-2 text-gray-400">
              <svg
                className="w-8 h-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                />
              </svg>
              <span className="text-sm">Upload your own garment</span>
            </div>
          </button>
        )}
      </div>

      {/* Pipeline toggles */}
      <div className="p-4 border-b border-gray-800 space-y-2">
        <button
          onClick={() => onAutoExtractChange(!autoExtract)}
          className="w-full flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-gray-800 transition-colors"
        >
          <div className="text-left">
            <span className="text-sm font-medium text-white block">
              Extract clothing
            </span>
            <span className="text-xs text-gray-500">
              Isolate garments from model photos
            </span>
          </div>
          <div
            className={`w-10 h-6 rounded-full transition-colors relative shrink-0 ml-3 ${
              autoExtract ? "bg-blue-500" : "bg-gray-600"
            }`}
          >
            <div
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${
                autoExtract ? "left-[18px]" : "left-0.5"
              }`}
            />
          </div>
        </button>
        <button
          onClick={() => onExtremePrecisionChange(!extremePrecision)}
          className="w-full flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-gray-800 transition-colors"
        >
          <div className="text-left">
            <span className="text-sm font-medium text-white block">
              Extreme precision
            </span>
            <span className="text-xs text-gray-500">
              Better results for bags, accessories & more
            </span>
          </div>
          <div
            className={`w-10 h-6 rounded-full transition-colors relative shrink-0 ml-3 ${
              extremePrecision ? "bg-blue-500" : "bg-gray-600"
            }`}
          >
            <div
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${
                extremePrecision ? "left-[18px]" : "left-0.5"
              }`}
            />
          </div>
        </button>
        {/* Precision preview thumbnails */}
        {(precisionSnapshot || precisionGenerated) && (
          <div className="flex gap-2 mt-2">
            {precisionSnapshot && (
              <div className="flex-1 min-w-0">
                <p className="text-gray-500 text-[10px] mb-1">Snapshot</p>
                <img
                  src={precisionSnapshot}
                  alt="Camera snapshot"
                  className="w-full rounded-lg border border-gray-700"
                />
              </div>
            )}
            {precisionGenerated && (
              <div className="flex-1 min-w-0">
                <p className="text-gray-500 text-[10px] mb-1">Generated</p>
                <img
                  src={precisionGenerated}
                  alt="Generated try-on"
                  className="w-full rounded-lg border border-gray-700"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Product grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-3">
          {PRODUCTS.map((product) => (
            <button
              key={product.name}
              onClick={() => onSelectProduct(product)}
              className={`text-left rounded-lg overflow-hidden border-2 transition-all ${
                activeProduct?.name === product.name && !isUploadActive
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
