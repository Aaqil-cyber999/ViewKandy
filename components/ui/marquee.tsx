import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * CSS-only infinite marquee (Magic UI pattern). The children are rendered twice
 * so the loop is seamless; the duplicate is hidden from assistive technology.
 */
export function Marquee({
  children,
  className,
  reverse = false,
  pauseOnHover = true,
}: {
  children: ReactNode;
  className?: string;
  reverse?: boolean;
  pauseOnHover?: boolean;
}) {
  return (
    <div
      className={cn(
        "group relative flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]",
        className,
      )}
    >
      <div
        className="kv-marquee-track flex w-max shrink-0"
        data-reverse={reverse ? "true" : "false"}
        data-pause={pauseOnHover ? "true" : "false"}
      >
        <div className="flex shrink-0 items-center gap-3 pr-3">{children}</div>
        <div
          aria-hidden
          className="flex shrink-0 items-center gap-3 pr-3"
        >
          {children}
        </div>
      </div>
    </div>
  );
}
