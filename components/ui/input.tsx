import * as React from "react";
import { cn } from "@/lib/utils/cn";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "kv-focus h-11 w-full rounded-xl border border-line bg-surface/70 px-3.5 text-sm text-foreground placeholder:text-muted-2 focus:border-accent/60",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "kv-focus min-h-24 w-full rounded-xl border border-line bg-surface/70 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-2 focus:border-accent/60",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "kv-focus h-11 w-full appearance-none rounded-xl border border-line bg-surface/70 px-3.5 text-sm text-foreground focus:border-accent/60",
      className,
    )}
    {...props}
  />
));
Select.displayName = "Select";

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("mb-1.5 block text-xs font-medium text-muted", className)}
      {...props}
    />
  );
}

export function FieldHint({ children }: { children: React.ReactNode }) {
  return (
    <span className="mt-1 block text-[11px] leading-relaxed text-muted-2">
      {children}
    </span>
  );
}
