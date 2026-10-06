import Link from "next/link";
import Image from "next/image";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { getContact, getSetting, getSocials } from "@/lib/queries/site";
import { DbIcon } from "@/lib/icon-map";

const QUICK_LINKS = [
  { href: "/subjects", label: "درس‌ها" },
  { href: "/blog", label: "بلاگ" },
  { href: "/about", label: "درباره ما" },
  { href: "/faq", label: "سوالات متداول" },
  { href: "/contact", label: "تماس با ما" },
];

export async function SiteFooter() {
  const [blurb, name, contact, socials] = await Promise.all([
    getSetting("site.footerBlurb"),
    getSetting("site.name"),
    getContact(),
    getSocials(),
  ]);

  return (
    <footer className="mt-auto bg-[var(--footer-bg)] text-slate-300">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        {/* برند */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Image src="/logo-mark.png" alt={`آیکون ${name}`} width={44} height={44} className="h-11 w-11 rounded-xl" />
            <span className="text-lg font-bold text-white">{name}</span>
          </div>
          <p className="text-sm leading-7 text-slate-400">{blurb}</p>
        </div>

        {/* دسترسی سریع */}
        <nav aria-label="دسترسی سریع">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">دسترسی سریع</h3>
          <ul className="space-y-2.5 text-sm">
            {QUICK_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="transition-colors hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* تماس */}
        <div>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">تماس با ما</h3>
          <ul className="space-y-3 text-sm">
            <li className="flex items-center gap-2.5">
              <Phone className="h-4 w-4 shrink-0 text-[var(--brand-orange)]" aria-hidden />
              <span dir="ltr">{contact.phone}</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Mail className="h-4 w-4 shrink-0 text-[var(--brand-orange)]" aria-hidden />
              <span dir="ltr">{contact.email}</span>
            </li>
            <li className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-orange)]" aria-hidden />
              <span className="leading-6">{contact.address}</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Clock className="h-4 w-4 shrink-0 text-[var(--brand-orange)]" aria-hidden />
              <span>{contact.hours}</span>
            </li>
          </ul>
        </div>

        {/* شبکه‌های اجتماعی */}
        <div>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">ما را دنبال کنید</h3>
          <ul className="space-y-2.5 text-sm">
            {socials.map((s) => {
              return (
                <li key={s.url}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2.5 transition-colors hover:text-white"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                      <DbIcon k={s.icon} className="h-4 w-4" />
                    </span>
                    {s.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-slate-400 sm:flex-row">
          <span>
            © {new Date().getFullYear()} {name} — همه حقوق برای جشنواره نوجوانان خوارزمی محفوظ است.
          </span>
          <span>ساخته‌شده با علاقه برای نوجوانان ایران</span>
        </div>
      </div>
    </footer>
  );
}
