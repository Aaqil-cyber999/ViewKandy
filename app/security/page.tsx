import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  ExternalLink,
  Eye,
  FileCheck2,
  Fingerprint,
  LockKeyhole,
  Radar,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { SecurityRiskExplorer } from "@/components/security/security-risk-explorer";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { PageIntro, SectionHeading } from "@/components/ui/section";
import {
  AUDIT_DATE,
  AUDIT_SOURCES,
  CHECK_GROUPS,
  POSTURE_CARDS,
  STATUS_LABELS,
  TRUST_METRICS,
  type AuditStatus,
} from "@/lib/config/security-audit";

export const metadata = {
  title: "Security and trust",
  description:
    "Review View Kandy's source-based security audit, current controls, known gaps and vulnerability reporting path.",
};

const STATUS_VARIANTS: Record<AuditStatus, BadgeProps["variant"]> = {
  implemented: "mint",
  partial: "amber",
  deployment: "accent",
  open: "danger",
};

function StatusBadge({ status }: { status: AuditStatus }) {
  return <Badge variant={STATUS_VARIANTS[status]}>{STATUS_LABELS[status]}</Badge>;
}

export default function SecurityPage() {
  return (
    <>
      <PageIntro
        eyebrow="Trust center"
        title="Security and trust"
        description="View Kandy is built around real places and honest data. This trust center applies the same rule to security: show what is protected, show what is not finished, and name the sources behind the review."
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="accent" className="px-3 py-1">
              <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />
              Audited {AUDIT_DATE}
            </Badge>
            <Badge variant="neutral" className="px-3 py-1">
              <FileCheck2 aria-hidden="true" className="h-3.5 w-3.5" />
              OWASP web + API lists
            </Badge>
            <Badge variant="neutral" className="px-3 py-1">
              <Eye aria-hidden="true" className="h-3.5 w-3.5" />
              Known gaps disclosed
            </Badge>
          </div>
        }
      />

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST_METRICS.map((metric) => (
            <div
              key={metric.label}
              className="rounded-2xl border border-line bg-surface/60 p-5 shadow-[0_18px_50px_-42px_rgba(7,29,45,0.6)]"
            >
              <div className="kv-display text-3xl text-foreground">{metric.value}</div>
              <p className="mt-2 text-[12px] leading-relaxed text-muted-2">{metric.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {POSTURE_CARDS.map((card) => (
            <article
              key={card.title}
              className="rounded-2xl border border-line/80 bg-canvas/70 p-5 transition hover:border-accent/40"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-accent/25 bg-accent/10 text-accent">
                    <LockKeyhole aria-hidden="true" className="h-4 w-4" />
                  </span>
                  <h2 className="text-[15px] font-semibold text-foreground">{card.title}</h2>
                </div>
                <StatusBadge status={card.status} />
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-muted">{card.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="travel-shell travel-shell--light">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="How we think about security"
            title="Prevent, detect, respond"
            description="No single control is enough. The audit follows the full lifecycle and records where each layer is strong and where deployment work remains."
          />
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <article className="rounded-2xl border border-line bg-surface/80 p-5">
              <Fingerprint aria-hidden="true" className="h-5 w-5 text-accent" />
              <h3 className="mt-3 text-[15px] font-semibold text-foreground">Prevent</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">
                Server-only secrets, explicit schemas, bounded requests, same-origin mutation checks, private media and independent admin authorization.
              </p>
            </article>
            <article className="rounded-2xl border border-line bg-surface/80 p-5">
              <Radar aria-hidden="true" className="h-5 w-5 text-accent" />
              <h3 className="mt-3 text-[15px] font-semibold text-foreground">Detect</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">
                Structured security events for blocked origins, oversized bodies, failed logins and rate-limit outcomes, without logging credentials or raw client identifiers.
              </p>
            </article>
            <article className="rounded-2xl border border-line bg-surface/80 p-5">
              <ShieldAlert aria-hidden="true" className="h-5 w-5 text-accent" />
              <h3 className="mt-3 text-[15px] font-semibold text-foreground">Respond</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">
                A documented pre-launch checklist covers key rotation, RLS verification, shared rate limits, log alerts, backups and an incident owner.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Full risk register"
          title="Explore every reviewed risk"
          description="Search and filter both OWASP lists. Expand a row to see the control in place and the work that is still open."
        />
        <div className="mt-8">
          <SecurityRiskExplorer />
        </div>
      </section>

      <section className="border-y border-line bg-surface/50">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Platform checks"
            title="What deployment still has to prove"
            description="Source code can enforce some controls. Key restrictions, RLS policies, monitoring and people processes must be verified in the live environment."
          />
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {CHECK_GROUPS.map((group) => (
              <details
                key={group.id}
                className="group rounded-2xl border border-line bg-canvas/70 p-5"
              >
                <summary className="kv-focus flex cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
                  <div>
                    <h3 className="text-[15px] font-semibold text-foreground">{group.title}</h3>
                    <p className="mt-1 text-[12px] leading-relaxed text-muted-2">
                      {group.description}
                    </p>
                  </div>
                  <ArrowRight
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 text-muted-2 transition group-open:rotate-90"
                  />
                </summary>
                <ul className="mt-4 space-y-2 border-t border-line/70 pt-4">
                  {group.checks.map((check) => (
                    <li key={check.label} className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-foreground">{check.label}</p>
                        <p className="mt-0.5 text-[12px] leading-relaxed text-muted-2">{check.detail}</p>
                      </div>
                      <StatusBadge status={check.status} />
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <SectionHeading
              eyebrow="Sources"
              title="Based on published guidance"
              description="The register uses current OWASP lists and platform-specific security guidance rather than an improvised checklist."
            />
            <ul className="mt-7 grid gap-2 sm:grid-cols-2">
              {AUDIT_SOURCES.map((source) => (
                <li key={source.href}>
                  <a
                    href={source.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="kv-focus group flex h-full items-start justify-between gap-3 rounded-xl border border-line bg-surface/60 p-4 transition hover:border-accent/50"
                  >
                    <span>
                      <span className="block text-[13px] font-medium text-foreground">{source.label}</span>
                      <span className="mt-0.5 block text-[12px] text-muted-2">{source.note}</span>
                    </span>
                    <ExternalLink
                      aria-hidden="true"
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-2 transition group-hover:text-accent"
                    />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <aside className="relative overflow-hidden rounded-[1.75rem] border border-accent/30 bg-gradient-to-br from-accent-soft to-surface p-6 shadow-[0_24px_70px_-40px_rgba(7,29,45,0.7)]">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full border border-accent/20" aria-hidden="true" />
            <div className="absolute -bottom-12 -left-8 h-36 w-36 rounded-full border border-accent/15" aria-hidden="true" />
            <ShieldCheck aria-hidden="true" className="relative h-7 w-7 text-accent" />
            <h2 className="relative mt-4 font-display text-3xl tracking-[-0.04em] text-foreground">
              Found something?
            </h2>
            <p className="relative mt-3 text-[14px] leading-relaxed text-muted">
              Report suspected vulnerabilities through the contact page. Include reproduction steps and impact. Never include live secrets in a report.
            </p>
            <div className="relative mt-6 flex flex-wrap gap-2">
              <Link href="/contact" className={buttonVariants()}>
                Contact the team
                <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              <a
                href="https://github.com/Aaqil-cyber999/ViewKandy/blob/main/SECURITY.md"
                target="_blank"
                rel="noreferrer noopener"
                className={buttonVariants({ variant: "outline" })}
              >
                Read SECURITY.md
                <ExternalLink aria-hidden="true" className="h-4 w-4" />
              </a>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
