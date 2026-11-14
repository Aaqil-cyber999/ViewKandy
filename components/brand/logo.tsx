import Link from "next/link";
import { cn } from "@/lib/utils/cn";

export function Logo({
  className,
  showWordmark = true,
  href = "/",
  tone = "dark",
}: {
  className?: string;
  showWordmark?: boolean;
  href?: string;
  tone?: "dark" | "light";
}) {
  return (
    <Link
      href={href}
      className={cn("kv-focus group flex items-center gap-3", className)}
      aria-label="View Kandy home"
    >
      <span
        className={cn(
          "relative grid h-9 w-9 place-items-center border",
          tone === "light" ? "border-cream/30" : "border-accent/25",
        )}
        aria-hidden="true"
      >
        <svg viewBox="0 0 32 32" className="h-6 w-6">
          <g
            fill="none"
            stroke={tone === "light" ? "#d8c29a" : "#1d5c46"}
            strokeWidth="1.1"
            strokeLinecap="round"
          >
            <path d="M4 23c4-1 6-4.6 8.6-4.6 2.6 0 3.6 2.2 6.2 2.2 3 0 4.4-3.4 9.2-3.4" />
            <path d="M4 17.4c4-.9 6-3.4 8.6-3.4 2.6 0 3.6 1.7 6.2 1.7 3 0 4.4-2.4 9.2-2.4" />
            <path d="M4 11.8c4-.7 6-2.2 8.6-2.2 2.6 0 3.6 1.2 6.2 1.2 3 0 4.4-1.5 9.2-1.5" opacity="0.55" />
          </g>
          <circle cx="24.5" cy="7" r="1.6" fill="#a97f45" />
        </svg>
      </span>
      {showWordmark && (
        <span className="flex flex-col leading-none">
          <span
            className={cn(
              "font-display text-[21px] tracking-[-0.02em]",
              tone === "light" ? "text-cream" : "text-foreground",
            )}
          >
            <em className="font-normal not-italic text-gold">View</em>{" "}
            <span className="font-medium">Kandy</span>
          </span>
          <span
            className={cn(
              "mt-1.5 text-[9px] uppercase leading-none tracking-[0.28em]",
              tone === "light" ? "text-cream/55" : "text-muted-2",
            )}
          >
            Sri Lanka · City guide
          </span>
        </span>
      )}
    </Link>
  );
}
