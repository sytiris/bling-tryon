"use client";

import { OUTFITS } from "@/lib/outfits";

interface StartScreenProps {
  onStart: () => void;
}

export function StartScreen({ onStart }: StartScreenProps) {
  return (
    <div
      className="fixed inset-0 bg-black flex flex-col items-center justify-between px-6"
      style={{
        paddingTop: "calc(env(safe-area-inset-top) + 48px)",
        paddingBottom: "calc(env(safe-area-inset-bottom) + 32px)",
      }}
    >
      <div className="text-center">
        <p className="text-white/40 text-xs uppercase tracking-[0.2em]">Decart</p>
        <h1 className="text-white text-3xl font-semibold mt-2">Try the full look</h1>
        <p className="text-white/60 text-sm mt-3 max-w-[300px] mx-auto leading-relaxed">
          Two complete outfits, live on your camera. We check your connection first so the
          try-on stays smooth.
        </p>
      </div>

      <div className="flex gap-4 w-full max-w-[360px]">
        {OUTFITS.map((outfit) => (
          <div key={outfit.id} className="flex-1 flex flex-col items-center gap-2">
            <div className="w-full aspect-[2/3] rounded-2xl overflow-hidden bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={outfit.image} alt={outfit.name} className="w-full h-full object-cover" />
            </div>
            <span className="text-white/80 text-sm">{outfit.name}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onStart}
        className="w-full max-w-[360px] py-4 rounded-full bg-white text-black text-base font-semibold active:bg-white/80"
      >
        Start try-on
      </button>
    </div>
  );
}
