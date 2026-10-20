import type { Metadata, Viewport } from "next";
import { Archivo, Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { site } from "@/config/site";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { TrackClicks } from "@/components/layout/TrackClicks";
import { MotionRoot } from "@/components/motion/MotionRoot";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"], display: "swap" });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" });
/** Archivo with its width axis: set expanded (font-stretch: 125%) for the wordmark, labels and buttons. */
const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"], display: "swap", axes: ["wdth"] });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: site.seoTitle,
    template: `%s — ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  keywords: ["operations research", "process mapping", "bottleneck analysis", "operations consulting India", "problem solving startup", "custom software", "IoT sensors", "data extraction", "agriculture", "logistics", "hospital patient flow", "energy efficiency"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: site.name,
    locale: "en_IN",
    url: "/",
    title: site.seoTitle,
    description: site.description,
  },
  twitter: {
    card: "summary_large_image",
    title: site.seoTitle,
    description: site.description,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#070707",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${archivo.variable} antialiased`} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        {/* Mark that JavaScript runs before anything paints, so reveal styles never hide content without it. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
        <a href="#main" className="btn btn-primary fixed top-3 left-3 z-[100] -translate-y-24 transition-transform focus:translate-y-0">
          Skip to content
        </a>
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
        <MotionRoot />
        <TrackClicks />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
