import Link from "next/link";
import { cn } from "@/lib/utils/cn";

export function Logo({
  className,
  showWordmark = true,
  href = "/",
}: {
  className?: string;
  showWordmark?: boolean;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className={cn("kv-focus group flex items-center gap-2.5", className)}
      aria-label="KandyVerse home"
    >
      <span className="relative grid h-9 w-9 place-items-center rounded-xl border border-accent/30 bg-accent/10">
        <svg viewBox="0 0 32 32" className="h-5 w-5" aria-hidden="true">
          <path
            d="M8 25V7l10 9-10 9Z"
            fill="none"
            stroke="#1f8a4c"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M18 7v18"
            stroke="#15803d"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <circle cx="23.5" cy="11.5" r="2.2" fill="#15803d" />
        </svg>
        <span className="absolute inset-0 rounded-xl ring-1 ring-inset ring-accent/10" />
      </span>
      {showWordmark && (
        <span className="flex flex-col leading-none">
          <span className="text-[15px] font-semibold tracking-[0.16em] text-foreground">
            KANDY<span className="text-accent">VERSE</span>
          </span>
          <span className="mt-1 text-[9px] uppercase tracking-[0.22em] text-muted-2">
            Beyond the map
          </span>
        </span>
      )}
    </Link>
  );
}
