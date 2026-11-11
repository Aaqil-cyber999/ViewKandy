import { AuthPanel } from "@/components/auth/auth-panel";
import { PageIntro } from "@/components/ui/section";

export const metadata = {
  title: "Account",
  description:
    "Sign in to sync saved Kandy places and itineraries across devices. Local saves work without an account.",
};

export default function AuthPage() {
  return (
    <>
      <PageIntro
        eyebrow="Account"
        title="Keep your Kandy plans across devices"
        description="Sign in with Supabase Auth to sync favourites and itineraries. Without an account, everything still works locally in this browser."
      />
      <AuthPanel />
    </>
  );
}
