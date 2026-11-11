import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils/cn";

export const buttonVariants = cva(
  "kv-focus inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-accent text-ink-950 hover:bg-sky-300 shadow-[0_10px_30px_-12px_rgba(56,189,248,0.7)]",
        mint: "bg-mint text-ink-950 hover:bg-emerald-300",
        secondary: "border border-line bg-ink-700/80 text-slate-100 hover:bg-ink-600",
        outline: "border border-line text-slate-200 hover:border-slate-500 hover:bg-ink-700/50",
        ghost: "text-slate-300 hover:bg-ink-700/60 hover:text-white",
        danger: "bg-red-500/90 text-white hover:bg-red-500",
      },
      size: {
        sm: "h-9 px-4 text-[13px]",
        md: "h-11 px-5 text-sm",
        lg: "h-12 px-6 text-[15px]",
        icon: "h-10 w-10",
        iconSm: "h-8 w-8",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";
