import { Product } from "@/lib/products";
import Image from "next/image";

interface ProductCardProps {
  product: Product;
  onTryOn: () => void;
}

export function ProductCard({ product, onTryOn }: ProductCardProps) {
  return (
    <div className="group">
      <div className="relative aspect-[3/4] bg-neutral-100 rounded-lg overflow-hidden">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          sizes="(max-width: 768px) 50vw, 33vw"
        />
        <button
          onClick={onTryOn}
          className="absolute bottom-3 left-3 right-3 py-2.5 bg-white/90 backdrop-blur-sm text-neutral-900 rounded-lg text-sm font-medium opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 hover:bg-white"
        >
          Try On
        </button>
      </div>
      <div className="mt-3">
        <h3 className="text-sm font-medium">{product.name}</h3>
        <p className="text-sm text-neutral-500 mt-0.5">${product.price}</p>
      </div>
    </div>
  );
}
