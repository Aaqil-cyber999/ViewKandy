"use client";

import { useEffect, useState } from "react";

/** True only after the client has hydrated; use to gate localStorage reads. */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
