"use client";

import { useState, useCallback } from "react";
import type { Product } from "@/lib/products";

export function useFittingQueue() {
  const [queue, setQueue] = useState<Product[]>([]);

  const addToQueue = useCallback((product: Product) => {
    setQueue((prev) => (prev.some((p) => p.id === product.id) ? prev : [...prev, product]));
  }, []);

  const removeFromQueue = useCallback((productId: string) => {
    setQueue((prev) => prev.filter((p) => p.id !== productId));
  }, []);

  const isInQueue = useCallback(
    (productId: string) => queue.some((p) => p.id === productId),
    [queue]
  );

  return { queue, addToQueue, removeFromQueue, isInQueue };
}
