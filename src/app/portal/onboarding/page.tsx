import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { OnboardingForm } from "@/components/portal/onboarding-form";
import { SiteLogo } from "@/components/site/site-logo";
import { getSetting } from "@/lib/queries/site";

export const metadata: Metadata = { title: "ساخت حساب" };

// آنبوردینگ اجباری — هر حساب تازه باید یک آیدی یکتا و یک نام نمایشی انتخاب کند
// (تلگرام‌مانند). شماره موبایل هویت ورود است؛ آیدی هویت قابل جست‌وجو.
export default async function OnboardingPage() {
  const user = await requireUser();
  if (user.username) redirect("/portal"); // قبلاً کامل شده
  const siteName = await getSetting("site.name", "آزمونک");

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center py-8">
      <SiteLogo name={siteName} href="/portal" markClassName="h-10 w-10" textClassName="text-xl" />
      <div className="mt-6 w-full max-w-md">
        <OnboardingForm nickname={user.nickname} />
      </div>
    </div>
  );
}
