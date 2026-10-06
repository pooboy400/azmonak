import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SiteLogo } from "@/components/site/site-logo";
import { getSetting } from "@/lib/queries/site";
import { getSessionUser } from "@/lib/auth";
import { LoginForm } from "@/components/portal/login-form";

export const metadata: Metadata = { title: "ورود به پورتال" };

// ورود/ثبت‌نام با شماره موبایل و کد ۵ رقمی (G10 + D3)
// ورود = ثبت‌نام: شماره جدید به‌صورت خودکار حساب می‌سازد.
export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect("/portal");
  const siteName = await getSetting("site.name", "آزمونک");

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-10">
      <SiteLogo name={siteName} href="/portal" markClassName="h-12 w-12" textClassName="text-2xl" />
      <LoginForm />
    </div>
  );
}
