"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Itinerary } from "@/lib/planner/types";

export interface SavedItinerary {
  id: string;
  title: string;
  createdAt: string;
  itinerary: Itinerary;
}

interface SavedState {
  favorites: string[];
  itineraries: SavedItinerary[];
  pins: string[];
  toggleFavorite: (slug: string) => void;
  saveItinerary: (title: string, itinerary: Itinerary) => void;
  removeItinerary: (id: string) => void;
  togglePin: (slug: string) => void;
  clearPins: () => void;
  clearAll: () => void;
}

export const useSavedStore = create<SavedState>()(
  persist(
    (set, get) => ({
      favorites: [],
      itineraries: [],
      pins: [],
      toggleFavorite: (slug) =>
        set((state) => ({
          favorites: state.favorites.includes(slug)
            ? state.favorites.filter((s) => s !== slug)
            : [slug, ...state.favorites],
        })),
      saveItinerary: (title, itinerary) => {
        const exists = get().itineraries.some((i) => i.id === itinerary.id);
        if (exists) return;
        set((state) => ({
          itineraries: [
            {
              id: itinerary.id,
              title,
              createdAt: new Date().toISOString(),
              itinerary,
            },
            ...state.itineraries,
          ].slice(0, 20),
        }));
      },
      removeItinerary: (id) =>
        set((state) => ({
          itineraries: state.itineraries.filter((i) => i.id !== id),
        })),
      togglePin: (slug) =>
        set((state) => ({
          pins: state.pins.includes(slug)
            ? state.pins.filter((s) => s !== slug)
            : [...state.pins, slug],
        })),
      clearPins: () => set({ pins: [] }),
      clearAll: () => set({ favorites: [], itineraries: [], pins: [] }),
    }),
    {
      name: "kv.saved.v1",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);
