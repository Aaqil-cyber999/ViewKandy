"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface Toast {
  id: number;
  message: string;
  tone: "default" | "success" | "info";
}

interface ToastValue {
  toast: (message: string, tone?: Toast["tone"]) => void;
}

const ToastContext = createContext<ToastValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, tone: Toast["tone"] = "default") => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, message, tone }].slice(-3));
    window.setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id));
    }, 3800);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[80] flex flex-col items-center gap-2 px-4 sm:bottom-8">
        {toasts.map((item) => (
          <div
            key={item.id}
            role="status"
            className={cn(
              "pointer-events-auto flex w-full max-w-md items-start gap-2.5 rounded-xl border border-line bg-ink-800/95 px-4 py-3 text-sm text-slate-100 shadow-2xl backdrop-blur",
              item.tone === "success" && "border-mint/30",
            )}
          >
            {item.tone === "success" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-mint" />
            ) : (
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            )}
            <span className="flex-1">{item.message}</span>
            <button
              type="button"
              onClick={() => setToasts((current) => current.filter((t) => t.id !== item.id))}
              className="kv-focus rounded p-0.5 text-slate-500 hover:text-white"
              aria-label="Dismiss notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
