"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search, ShieldCheck, X } from "lucide-react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import {
  ALL_AUDIT_RISKS,
  STATUS_LABELS,
  type AuditStatus,
} from "@/lib/config/security-audit";
import { cn } from "@/lib/utils/cn";

type GroupFilter = "all" | "Web" | "API";
type StatusFilter = "all" | AuditStatus;

const STATUS_VARIANTS: Record<AuditStatus, BadgeProps["variant"]> = {
  implemented: "mint",
  partial: "amber",
  deployment: "accent",
  open: "danger",
};

const GROUP_FILTERS: Array<{ value: GroupFilter; label: string }> = [
  { value: "all", label: "All risks" },
  { value: "Web", label: "Web" },
  { value: "API", label: "API" },
];

export function SecurityRiskExplorer() {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<GroupFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return ALL_AUDIT_RISKS.filter((risk) => {
      if (group !== "all" && risk.group !== group) return false;
      if (status !== "all" && risk.status !== status) return false;
      if (!needle) return true;
      const haystack = [
        risk.id,
        risk.title,
        risk.summary,
        ...risk.controls,
        ...risk.gaps,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [group, query, status]);

  const hasFilters = query !== "" || group !== "all" || status !== "all";

  return (
    <div>
      <div className="rounded-2xl border border-line bg-surface/70 p-4 shadow-[0_18px_50px_-38px_rgba(7,29,45,0.55)] sm:p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto_auto]">
          <div>
            <Label htmlFor="security-risk-search">Search the audit</Label>
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-2"
              />
              <Input
                id="security-risk-search"
                type="search"
                placeholder="Try RLS, upload, HSTS or sessions"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="security-status-filter">Status</Label>
            <Select
              id="security-status-filter"
              value={status}
              onChange={(event) => setStatus(event.target.value as StatusFilter)}
              className="lg:w-52"
            >
              <option value="all">All statuses</option>
              {(Object.keys(STATUS_LABELS) as AuditStatus[]).map((value) => (
                <option key={value} value={value}>
                  {STATUS_LABELS[value]}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-end">
            {hasFilters ? (
              <Button
                type="button"
                variant="ghost"
                className="w-full lg:w-auto"
                onClick={() => {
                  setQuery("");
                  setGroup("all");
                  setStatus("all");
                }}
              >
                <X aria-hidden="true" className="h-4 w-4" />
                Clear filters
              </Button>
            ) : (
              <div className="hidden h-11 items-center gap-2 text-[12px] text-muted-2 lg:flex">
                <ShieldCheck aria-hidden="true" className="h-4 w-4 text-accent" />
                Live from the audit register
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2" role="group" aria-label="Risk list">
          {GROUP_FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              aria-pressed={group === item.value}
              onClick={() => setGroup(item.value)}
              className={cn(
                "kv-focus rounded-full border px-3 py-1.5 text-[12px] transition",
                group === item.value
                  ? "border-accent bg-accent text-cream"
                  : "border-line bg-surface-2/50 text-muted hover:border-accent/50 hover:text-foreground",
              )}
            >
              {item.label}
            </button>
          ))}
          <span className="ml-auto text-[12px] text-muted-2" role="status">
            {filtered.length} of {ALL_AUDIT_RISKS.length} risks
          </span>
        </div>
      </div>

      <div className="mt-5 grid gap-3" aria-live="polite">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line bg-surface/40 p-8 text-center text-sm text-muted">
            No risks match those filters. Clear them to see the full register.
          </div>
        ) : (
          filtered.map((risk) => (
            <details
              key={`${risk.group}-${risk.id}`}
              className="group rounded-xl border border-line bg-surface/60 transition hover:border-accent/40"
            >
              <summary className="kv-focus flex cursor-pointer list-none items-start justify-between gap-4 p-4 [&::-webkit-details-marker]:hidden">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="kv-nums text-[11px] font-semibold tracking-[0.12em] text-gold">
                      {risk.group === "Web" ? "" : "API"}
                      {risk.id.replace("API", "")}
                    </span>
                    <Badge variant={STATUS_VARIANTS[risk.status]}>
                      {STATUS_LABELS[risk.status]}
                    </Badge>
                    <span className="text-[10px] uppercase tracking-[0.14em] text-muted-2">
                      {risk.group} risk
                    </span>
                  </div>
                  <h3 className="mt-1.5 text-[15px] font-semibold text-foreground">
                    {risk.id}: {risk.title}
                  </h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted">
                    {risk.summary}
                  </p>
                </div>
                <ChevronDown
                  aria-hidden="true"
                  className="mt-1 h-4 w-4 shrink-0 text-muted-2 transition group-open:rotate-180"
                />
              </summary>
              <div className="grid gap-4 border-t border-line/70 px-4 py-4 md:grid-cols-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-mint">
                    What is in place
                  </p>
                  <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-muted">
                    {risk.controls.map((control) => (
                      <li key={control} className="flex gap-2">
                        <span aria-hidden="true" className="text-mint">✓</span>
                        <span>{control}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber">
                    Remaining work
                  </p>
                  <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-muted">
                    {risk.gaps.map((gap) => (
                      <li key={gap} className="flex gap-2">
                        <span aria-hidden="true" className="text-amber">→</span>
                        <span>{gap}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </details>
          ))
        )}
      </div>
    </div>
  );
}
