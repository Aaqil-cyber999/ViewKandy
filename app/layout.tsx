import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers/app-providers";
import { PwaRegister } from "@/components/providers/pwa-register";
import { SiteHeader } from "@/components/layout/site-header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { SiteFooter } from "@/components/layout/site-footer";
import { AmbientNature } from "@/components/layout/ambient-nature";
import { ScrollNav } from "@/components/layout/scroll-nav";
import { siteConfig } from "@/lib/config/site";

const sans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-dm-sans",
  weight: ["400", "500", "600", "700"],
});

const display = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "View Kandy — Explore Kandy Beyond the Map",
    template: "%s · View Kandy",
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  manifest: "/manifest.webmanifest",
  keywords: [
    "Kandy",
    "Sri Lanka",
    "3D tourism",
    "trip planner",
    "Temple of the Tooth",
    "Kandy Lake",
    "smart city",
    "travel guide",
  ],
  authors: [{ name: "View Kandy" }],
  creator: "View Kandy",
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: "View Kandy — Explore Kandy Beyond the Map",
    description: siteConfig.description,
  },
  twitter: {
    card: "summary_large_image",
    title: "View Kandy — Explore Kandy Beyond the Map",
    description: siteConfig.description,
  },
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
    other: [{ rel: "mask-icon", url: "/icons/icon.svg", color: "#1f8a4c" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "View Kandy",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#edf3ee",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: siteConfig.name,
  url: siteConfig.url,
  description: siteConfig.description,
  inLanguage: "en-LK",
  about: {
    "@type": "City",
    name: "Kandy",
    containedInPlace: { "@type": "Country", name: "Sri Lanka" },
    geo: { "@type": "GeoCoordinates", latitude: 7.2906, longitude: 80.6337 },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${sans.variable} ${display.variable}`}
    >
      <body className="kv-grain min-h-dvh antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <AmbientNature />
        <AppProviders>
          <a
            href="#main"
            className="kv-focus sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
          >
            Skip to content
          </a>
          <div className="kv-app-rail">
            <SiteHeader />
            <main id="main" className="relative z-10">
              {children}
            </main>
            <SiteFooter />
          </div>
          <ScrollNav />
          <MobileNav />
          <PwaRegister />
        </AppProviders>
      </body>
    </html>
  );
}
