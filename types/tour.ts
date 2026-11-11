export type TourTheme = "overview" | "culture" | "walk" | "history" | "nature";

export interface TourStop {
  placeSlug: string;
  dwellSeconds: number;
  range: number;
  pitch: number;
  headline: string;
  note: string;
}

export interface Tour {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  theme: string;
  difficulty: "easy" | "medium" | "hard";
  durationSeconds: number;
  coverTone: string;
  stops: TourStop[];
}
