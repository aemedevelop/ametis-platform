"use client";

export function AlertInline({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-lg border border-[#f1b5ba] bg-[#fff1f2] px-3 py-2 text-center text-sm font-medium text-[#a3212d]">
      <AlertIcon />
      <span>{message}</span>
    </div>
  );
}

function AlertIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path d="M10 2.6 17.2 15a1.2 1.2 0 0 1-1 1.8H3.8a1.2 1.2 0 0 1-1-1.8L10 2.6Z" />
      <path d="M10 7.2v4.6" strokeLinecap="round" />
      <circle cx="10" cy="14.4" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}
