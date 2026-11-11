import type { Metadata } from "next";
import { AdminConsole } from "@/components/admin/admin-console";
import { seedCategories } from "@/lib/data";

export const metadata: Metadata = {
  title: "Editorial admin",
  description: "KandyVerse editorial console for place records and verification.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function AdminPage() {
  return <AdminConsole categories={seedCategories} />;
}
