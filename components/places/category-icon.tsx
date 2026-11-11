import {
  BedDouble,
  Building2,
  Cross,
  Flame,
  Info,
  Landmark,
  Mountain,
  ShoppingBag,
  Ticket,
  TrainFront,
  Trees,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

const ICONS: Record<string, LucideIcon> = {
  landmark: Landmark,
  flame: Flame,
  trees: Trees,
  mountain: Mountain,
  building: Building2,
  ticket: Ticket,
  utensils: UtensilsCrossed,
  bed: BedDouble,
  bag: ShoppingBag,
  train: TrainFront,
  cross: Cross,
  info: Info,
};

export function CategoryIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon = ICONS[name] ?? Info;
  return <Icon className={cn("h-4 w-4", className)} aria-hidden="true" />;
}
