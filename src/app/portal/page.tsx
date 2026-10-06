import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Construction, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "پورتال دانش‌آموزی",
  description: "پورتال آزمون و داشبورد دانش‌آموزی آزمونک — به‌زودی.",
};

// گام بعدی توسعه: شِل پورتال، ورود OTP، داشبورد، صفحه آزمون، لیدربرد کامل و کامیونیتی.
// در پروداکشن این مسیر با middleware روی subdomain پورتال (portal.sitename) سرو می‌شود.
export default function PortalPlaceholderPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-secondary/60 to-background px-4 text-center">
      <Image src="/logo-mark.png" alt="آزمونک" width={72} height={72} className="mb-6 h-18 w-18 rounded-2xl shadow-lg shadow-primary/20" />
      <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--brand-orange)]/30 bg-[var(--brand-orange-soft)] px-4 py-1.5 text-sm font-medium text-amber-700">
        <Construction className="h-4 w-4" aria-hidden />
        در حال ساخت
      </span>
      <h1 className="mb-3 text-2xl font-bold text-foreground sm:text-3xl">پورتال دانش‌آموزی به‌زودی باز می‌شود</h1>
      <p className="mb-8 max-w-md text-sm leading-7 text-muted-foreground">
        صفحه آزمون، داشبورد پیشرفت، لیدربرد کامل و کامیونیتی این‌جا جانمایی می‌شود. سایت اصلی را ببین و منتظر خبرهای
        بعدی باش.
      </p>
      <Button asChild variant="outline">
        <Link href="/">
          <Home className="h-4 w-4" aria-hidden />
          بازگشت به سایت اصلی
        </Link>
      </Button>
    </div>
  );
}
