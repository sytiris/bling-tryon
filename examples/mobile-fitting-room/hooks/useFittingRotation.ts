"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Product } from "@/lib/products";

const SPLASH_DURATION = 1500;

export interface UseFittingRotationOptions {
  queue: Product[];
  intervalSeconds: number;
  isActive: boolean;
  onApplyProduct: (product: Product) => void;
}

export function useFittingRotation({
  queue,
  intervalSeconds,
  isActive,
  onApplyProduct,
}: UseFittingRotationOptions) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionProduct, setTransitionProduct] = useState<Product | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(intervalSeconds);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const splashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasAppliedFirstRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (splashTimeoutRef.current) { clearTimeout(splashTimeoutRef.current); splashTimeoutRef.current = null; }
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
  }, []);

  const startCountdown = useCallback(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setSecondsRemaining(intervalSeconds);
    countdownRef.current = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : intervalSeconds));
    }, 1000);
  }, [intervalSeconds]);

  const applyItem = useCallback(
    (index: number, showSplash: boolean) => {
      const product = queue[index];
      if (!product) return;

      if (showSplash) {
        setTransitionProduct(product);
        setIsTransitioning(true);
        if (splashTimeoutRef.current) clearTimeout(splashTimeoutRef.current);
        splashTimeoutRef.current = setTimeout(() => {
          setIsTransitioning(false);
          onApplyProduct(product);
        }, SPLASH_DURATION);
      } else {
        setTransitionProduct(product);
        onApplyProduct(product);
      }
    },
    [queue, onApplyProduct]
  );

  // Apply first item when activated
  useEffect(() => {
    if (isActive && !hasAppliedFirstRef.current && queue.length > 0) {
      hasAppliedFirstRef.current = true;
      setCurrentIndex(0);
      applyItem(0, false);
    }
  }, [isActive, queue, applyItem]);

  // Auto-cycle
  useEffect(() => {
    if (!isActive || queue.length <= 1) {
      clearTimers();
      return;
    }

    startCountdown();
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = (prev + 1) % queue.length;
        applyItem(next, true);
        return next;
      });
      startCountdown();
    }, intervalSeconds * 1000);

    return clearTimers;
  }, [isActive, queue, intervalSeconds, applyItem, clearTimers, startCountdown]);

  // Reset when deactivated
  useEffect(() => {
    if (!isActive) {
      hasAppliedFirstRef.current = false;
      setCurrentIndex(0);
      setIsTransitioning(false);
      setTransitionProduct(null);
      clearTimers();
    }
  }, [isActive, clearTimers]);

  const skipToNext = useCallback(() => {
    if (!isActive || queue.length === 0) return;
    clearTimers();
    setCurrentIndex((prev) => {
      const next = (prev + 1) % queue.length;
      applyItem(next, true);
      return next;
    });
    if (queue.length > 1) {
      startCountdown();
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          const n = (prev + 1) % queue.length;
          applyItem(n, true);
          return n;
        });
        startCountdown();
      }, intervalSeconds * 1000);
    }
  }, [isActive, queue, intervalSeconds, applyItem, clearTimers, startCountdown]);

  const skipToPrevious = useCallback(() => {
    if (!isActive || queue.length === 0) return;
    clearTimers();
    setCurrentIndex((prev) => {
      const next = (prev - 1 + queue.length) % queue.length;
      applyItem(next, true);
      return next;
    });
    if (queue.length > 1) {
      startCountdown();
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          const n = (prev + 1) % queue.length;
          applyItem(n, true);
          return n;
        });
        startCountdown();
      }, intervalSeconds * 1000);
    }
  }, [isActive, queue, intervalSeconds, applyItem, clearTimers, startCountdown]);

  return {
    currentIndex,
    currentProduct: queue[currentIndex] ?? null,
    isTransitioning,
    transitionProduct,
    skipToNext,
    skipToPrevious,
    secondsRemaining,
  };
}
