import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide",
  {
    variants: {
      variant: {
        neutral: "border-line bg-ink-700/60 text-slate-300",
        accent: "border-accent/30 bg-accent/10 text-accent",
        mint: "border-mint/30 bg-mint/10 text-mint",
        amber: "border-amber/30 bg-amber/10 text-amber",
        danger: "border-red-400/30 bg-red-500/10 text-red-300",
        outline: "border-line text-slate-400",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export function VerificationBadge({ status }: { status: string }) {
  if (status === "verified") {
    return <Badge variant="mint">Verified</Badge>;
  }
  if (status === "partially_verified") {
    return <Badge variant="amber">Partly verified</Badge>;
  }
  return <Badge variant="outline">Unverified</Badge>;
}
