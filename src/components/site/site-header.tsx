"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteLogo } from "@/components/site/site-logo";

const NAV_LINKS = [
  { href: "/", label: "خانه" },
  { href: "/subjects", label: "درس‌ها" },
  { href: "/blog", label: "بلاگ" },
  { href: "/about", label: "درباره ما" },
  { href: "/faq", label: "سوالات متداول" },
  { href: "/contact", label: "تماس" },
];

export function SiteHeader({
  portalUrl,
  portalCta,
  siteName,
}: {
  portalUrl: string;
  portalCta: string;
  siteName: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <SiteLogo name={siteName} href="/" />

        <nav className="hidden items-center gap-1 md:flex" aria-label="ناوبری اصلی">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive(l.href) ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Button asChild className="shadow-md shadow-primary/25">
            <Link href={portalUrl}>{portalCta}</Link>
          </Button>
        </div>

        <button
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-foreground md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "بستن منو" : "باز کردن منو"}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <nav className="border-t border-border/60 bg-white px-4 pb-4 pt-2 md:hidden" aria-label="ناوبری موبایل">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={`block rounded-lg px-3 py-2.5 text-sm font-medium ${
                isActive(l.href) ? "bg-secondary text-secondary-foreground" : "text-muted-foreground"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <Button asChild className="mt-2 w-full" onClick={() => setOpen(false)}>
            <Link href={portalUrl}>{portalCta}</Link>
          </Button>
        </nav>
      )}
    </header>
  );
}
