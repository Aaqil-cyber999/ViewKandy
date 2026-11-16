import Link from "next/link";
import { LiveUpdatesClient } from "@/components/reports/live-updates-client";

export const metadata = {
  title: "Live updates",
  description: "Recent community-submitted visitor updates for Kandy destinations. Reports are timestamped, may be unverified, and can become outdated.",
};

export default function UpdatesPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <p className="kv-label">Community</p>
        <h1 className="mt-1 text-3xl font-semibold text-foreground">Live visitor updates</h1>
        <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-muted">
          Community-submitted reports for Kandy. Each report shows when it was submitted, its status, and confirmation signals. Reports may be unverified or outdated and are separate from official/editorial destination information.
        </p>
        <p className="mt-2 text-[13px] text-muted-2">
          Want to add an update for a specific place? Open a destination page and use <Link href="/places" className="text-accent hover:underline">Community reports</Link>.
        </p>
      </div>
      <LiveUpdatesClient />
    </div>
  );
}
