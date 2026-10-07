import Link from "next/link";
import { getPortalUrl, getSetting } from "@/lib/queries/site";

/** بنر CTA پایین صفحات — متن و مقصد از تنظیمات دیتابیس */
export async function CtaBanner() {
  const [title, text, portalUrl, cta] = await Promise.all([
    getSetting("cta.bannerTitle"),
    getSetting("cta.bannerText"),
    getPortalUrl(),
    getSetting("portal.ctaLabel", "ورود به پورتال"),
  ]);

  return (
    <section className="mx-auto max-w-6xl px-4 pb-16">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-[#4F46E5] to-[#7A5CFF] px-6 py-12 text-center sm:px-12">
        <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-white/10" aria-hidden />
        <div
          className="pointer-events-none absolute -bottom-20 -right-10 h-64 w-64 rounded-full bg-[var(--brand-orange)]/20"
          aria-hidden
        />
        <h2 className="mb-3 text-2xl font-bold text-white sm:text-3xl">{title}</h2>
        <p className="mx-auto mb-7 max-w-2xl text-sm leading-7 text-white/85 sm:text-base">{text}</p>
        <Link
          href={portalUrl}
          className="inline-flex h-12 items-center justify-center rounded-xl bg-white px-8 text-base font-bold text-[#4F46E5] shadow-lg transition-transform hover:scale-[1.03]"
        >
          {cta}
        </Link>
      </div>
    </section>
  );
}
