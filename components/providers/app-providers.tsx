"use client";

import { useEffect, type ReactNode } from "react";
import { I18nProvider } from "@/lib/i18n/provider";
import { useSavedStore } from "@/lib/store/use-saved-store";
import { ToastProvider } from "./toast-provider";

export function AppProviders({ children }: { children: ReactNode }) {
  useEffect(() => {
    void useSavedStore.persist.rehydrate();
  }, []);

  return (
    <I18nProvider>
      <ToastProvider>{children}</ToastProvider>
    </I18nProvider>
  );
}
