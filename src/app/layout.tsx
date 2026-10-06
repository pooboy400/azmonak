import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { getSiteSettings } from "@/lib/queries/site";

const vazirmatn = localFont({
  src: [
    { path: "./fonts/Vazirmatn-Light.ttf", weight: "300", style: "normal" },
    { path: "./fonts/Vazirmatn-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/Vazirmatn-Medium.ttf", weight: "500", style: "normal" },
    { path: "./fonts/Vazirmatn-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-vazirmatn",
  display: "swap",
});

// متادیتا از دیتابیس (site_settings) — با fallback در صورت در دسترس نبودن DB
export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings();
  const name = s.get("site.name") ?? "آزمونک";
  const tagline = s.get("site.tagline") ?? "آزمون تطبیقی هوشمند";
  const description = s.get("site.description") ?? tagline;
  const siteUrl = s.get("site.url");
  return {
    ...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}),
    title: { default: `${name} — ${tagline}`, template: `%s | ${name}` },
    description,
    icons: { icon: "/logo-mark.png" },
    openGraph: {
      title: `${name} — ${tagline}`,
      description,
      siteName: name,
      images: ["/logo.png"],
      type: "website",
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body className={`${vazirmatn.variable} antialiased bg-background text-foreground min-h-screen flex flex-col`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
