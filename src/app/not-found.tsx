import Link from "next/link";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { getPortalUrl, getSetting } from "@/lib/queries/site";
import { Button } from "@/components/ui/button";
import { House } from "lucide-react";

/**
 * ۴۰۴ فارسی و برندشده — به‌جای صفحه پیش‌فرض انگلیسی Next.
 * با try/catch امن است تا حتی در نبود DB هم خودِ صفحه خطا رندر شود.
 */
export default async function NotFound() {
  let siteName = "آزمونک";
  let portalUrl = "/portal";
  let portalCta = "ورود به پورتال";
  try {
    [siteName, portalUrl, portalCta] = await Promise.all([
      getSetting("site.name", siteName),
      getPortalUrl(),
      getSetting("portal.ctaLabel", portalCta),
    ]);
  } catch {
    // DB در دسترس نیست — صفحه خطا باید همچنان رندر شود
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader portalUrl={portalUrl} portalCta={portalCta} siteName={siteName} />
      <main className="flex flex-1 items-center justify-center px-4 py-24">
        <div className="max-w-md text-center">
          <p className="mb-3 text-6xl font-extrabold text-primary" aria-hidden>
            ۴۰۴
          </p>
          <h1 className="mb-3 text-2xl font-bold text-foreground">این صفحه پیدا نشد</h1>
          <p className="mb-8 text-sm leading-7 text-muted-foreground">
            آدرسی که باز کردی وجود ندارد یا جابه‌جا شده است. از دکمه‌های زیر برگرد — اگر فکر می‌کنی اشکال از
            سایت است، از صفحه تماس به ما خبر بده.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild className="shadow-md shadow-primary/25">
              <Link href="/">
                <House className="h-4 w-4" aria-hidden />
                بازگشت به صفحه اصلی
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/contact">تماس با ما</Link>
            </Button>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
