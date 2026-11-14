"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Compass, Heart, Map, Route } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const ITEMS = [
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/planner", label: "Plan", icon: Route },
  { href: "/assistant", label: "Ask", icon: Bot },
  { href: "/tours", label: "Tours", icon: Map },
  { href: "/saved", label: "Saved", icon: Heart },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line/80 bg-canvas/96 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
      aria-label="Quick navigation"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {ITEMS.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(`${item.href}/`));
          const Icon = item.icon;
          return (
            <li key={item.href} className="relative">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "kv-focus relative flex flex-col items-center gap-1 py-2.5 text-[10px] uppercase tracking-[0.12em] transition",
                  active ? "text-accent" : "text-muted-2 hover:text-foreground",
                )}
              >
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-[30%] top-0 h-[2px] bg-accent"
                  />
                )}
                <Icon className="h-[18px] w-[18px]" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
