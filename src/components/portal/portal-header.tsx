"use client";

// هدر پورتال — ناوبری فعال با usePathname + لینک‌های نقش‌محور (معلم/ادمین) + خروج
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Trophy, Users, User, LogOut, Menu, MessagesSquare, School, ShieldCheck } from "lucide-react";
import { useState, useTransition } from "react";
import { logoutAction } from "@/lib/actions/auth";
import { SiteLogo } from "@/components/site/site-logo";
import { UserAvatar } from "@/components/site/user-avatar";
import { cn } from "@/lib/utils";

const BASE_NAV = [
  { href: "/portal", label: "داشبورد", icon: LayoutDashboard },
  { href: "/portal/forum", label: "انجمن", icon: MessagesSquare },
  { href: "/portal/leaderboard", label: "لیدربرد", icon: Trophy },
  { href: "/portal/community", label: "کامیونیتی", icon: Users },
  { href: "/portal/profile", label: "پروفایل", icon: User },
];

export function PortalHeader({
  siteName,
  user,
}: {
  siteName: string;
  user: { nickname: string; avatarUrl: string | null; role: string | null };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);

  const NAV = [...BASE_NAV];
  if (user.role === "TEACHER" || user.role === "ADMIN") {
    NAV.splice(4, 0, { href: "/portal/teacher", label: "پنل معلم", icon: School });
  }
  if (user.role === "ADMIN") {
    NAV.splice(5, 0, { href: "/portal/admin", label: "پنل ادمین", icon: ShieldCheck });
  }

  const isActive = (href: string) => (href === "/portal" ? pathname === "/portal" : pathname.startsWith(href));

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAction();
      router.push("/portal/login");
      router.refresh();
    });
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
          <SiteLogo name={siteName} href="/portal" markClassName="h-9 w-9" textClassName="text-lg" />

          {/* ناوبری دسکتاپ */}
          <nav className="hidden items-center gap-1 md:flex" aria-label="ناوبری پورتال">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive(item.href)
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                )}
              >
                <item.icon className="h-4 w-4" aria-hidden />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/portal/profile"
              className="flex items-center gap-2 rounded-full border border-border bg-card py-1 pl-3 pr-1 transition-colors hover:bg-secondary/60"
            >
              <UserAvatar src={user.avatarUrl} nickname={user.nickname} size={30} className="ring-1" />
              <span className="hidden max-w-28 truncate text-sm font-medium sm:inline">{user.nickname}</span>
            </Link>
            <button
              onClick={handleLogout}
              disabled={pending}
              aria-label="خروج از حساب"
              className="hidden cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive md:flex"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              خروج
            </button>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="باز و بسته کردن منو"
              aria-expanded={menuOpen}
              className="cursor-pointer rounded-lg p-2 text-muted-foreground hover:bg-secondary/60 md:hidden"
            >
              <Menu className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>

        {/* منوی موبایل بازشو */}
        {menuOpen && (
          <nav className="border-t border-border/60 bg-background px-4 py-2 md:hidden" aria-label="ناوبری موبایل">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                  isActive(item.href) ? "bg-secondary text-secondary-foreground" : "text-muted-foreground",
                )}
              >
                <item.icon className="h-4 w-4" aria-hidden />
                {item.label}
              </Link>
            ))}
            <button
              onClick={handleLogout}
              disabled={pending}
              className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-destructive"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              خروج از حساب
            </button>
          </nav>
        )}
      </header>

      {/* ناوبری پایین موبایل */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid border-t border-border/60 bg-background/95 backdrop-blur-md md:hidden"
        style={{ gridTemplateColumns: `repeat(${NAV.length}, minmax(0, 1fr))` }}
        aria-label="ناوبری پایین"
      >
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive(item.href) ? "page" : undefined}
            className={cn(
              "flex flex-col items-center gap-1 py-2 text-[11px] font-medium",
              isActive(item.href) ? "text-primary" : "text-muted-foreground",
            )}
          >
            <item.icon className="h-5 w-5" aria-hidden />
            {item.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
