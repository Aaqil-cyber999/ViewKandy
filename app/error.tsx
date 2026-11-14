"use client";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
      <div className="rounded-full border border-[#d7d0be] bg-[#f8f3eb] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#0f5d67]">
        Something went wrong
      </div>
      <h1 className="mt-6 font-display text-4xl tracking-[-0.05em] text-slate-900">
        The page could not load.
      </h1>
      <p className="mt-4 max-w-md text-sm leading-7 text-slate-600">
        We hit an unexpected issue while loading this route. Try again to resume your Kandy journey.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="travel-button travel-button--primary mt-6"
      >
        Try again
      </button>
    </div>
  );
}
