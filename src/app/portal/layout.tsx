import type { Metadata } from "next";
import { PortalHeader } from "@/components/portal/portal-header";
import { getSetting } from "@/lib/queries/site";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: { default: "پورتال دانش‌آموزی", template: "%s | پورتال" },
};

// شِل پورتال — هدر با نشست کاربر؛ خود صفحات محتوا محافظت‌شده‌اند.
// در پروداکشن با middleware روی portal.sitename سرو می‌شود.
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const [siteName, user] = await Promise.all([getSetting("site.name", "آزمونک"), getSessionUser()]);

  return (
    <div className="flex min-h-screen flex-col">
      <PortalHeader
        siteName={siteName}
        user={{ nickname: user?.nickname ?? "مهمان", avatarUrl: user?.avatarUrl ?? null }}
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-6 md:pb-12">{children}</main>
      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        {siteName} — پورتال دانش‌آموزی
      </footer>
    </div>
  );
}
