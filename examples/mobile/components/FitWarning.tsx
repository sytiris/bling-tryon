"use client";

interface FitWarningProps {
  message: string;
  onDismiss: () => void;
}

/**
 * Framing warning for a full outfit. Non-null message means the try-on is
 * parked behind this card, so it must always be dismissable. It comes down on
 * its own once the knees are back in frame.
 */
export function FitWarning({ message, onDismiss }: FitWarningProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/75 backdrop-blur-sm px-6 animate-[mobile-fade-in_0.25s_ease-out]">
      <div className="w-full max-w-[360px] rounded-[20px] border border-white/10 bg-[#1C1C1E] px-7 py-7 flex flex-col items-center text-center shadow-2xl">
        <div className="w-[52px] h-[52px] rounded-full bg-white/10 flex items-center justify-center mb-4">
          <svg className="w-[30px] h-[30px] text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="5" r="1" />
            <path d="m9 20 3-6 3 6" />
            <path d="m6 8 6 2 6-2" />
            <path d="M12 10v4" />
          </svg>
        </div>
        <p className="text-white text-[19px] font-semibold leading-[1.3]">{message}</p>
        <button
          onClick={onDismiss}
          className="mt-5 px-6 py-[11px] rounded-full bg-white/10 active:bg-white/20 text-white text-sm font-medium"
        >
          Ignore
        </button>
      </div>
    </div>
  );
}
