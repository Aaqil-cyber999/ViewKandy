import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils/cn";

export const buttonVariants = cva(
  "kv-focus inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-medium tracking-[0.01em] transition-[color,background-color,border-color,box-shadow,transform] duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-gold text-forest shadow-[0_10px_24px_-14px_rgba(183,119,47,0.7)] hover:-translate-y-0.5 hover:bg-gold-soft hover:shadow-[0_16px_30px_-16px_rgba(183,119,47,0.75)]",
        mint: "bg-accent text-cream hover:-translate-y-0.5 hover:bg-accent-strong",
        secondary: "border border-line bg-surface text-foreground hover:-translate-y-0.5 hover:border-accent/30 hover:bg-accent-soft/50",
        outline: "border border-line bg-transparent text-foreground hover:-translate-y-0.5 hover:border-accent/50 hover:bg-surface",
        ghost: "text-muted hover:bg-surface-2/70 hover:text-foreground",
        danger: "rounded-xl bg-danger text-cream hover:-translate-y-0.5 hover:bg-danger-strong",
      },
      size: {
        sm: "h-9 px-4 text-[14px]",
        md: "h-11 px-5 text-sm",
        lg: "h-12 px-6 text-[16px]",
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
