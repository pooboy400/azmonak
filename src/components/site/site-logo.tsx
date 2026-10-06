import Link from "next/link";

/**
 * لوگوی آزمونک — نشان وکتور (عیناً از SVG آپلودی کاربر: upload/azmonak_logo.svg)
 * rect#4F46E5 + تیک سفید + نقطه کهربایی #F59E0B با همان مختصات اصلی (نرمال‌شده به viewBox 120)
 * وردمارک («آزمونک») از دیتابیس می‌آید — بدون هاردکد.
 *
 * نکته: فایل /logo.svg مستقل در <img> فونت و متغیر CSS صفحه را ندارد و متنش خراب رندر
 * می‌شد؛ به همین دلیل نشان به‌صورت inline SVG و وردمارک به‌صورت HTML رندر می‌شود.
 */
export function SiteLogo({
  name,
  href = "/",
  markClassName = "h-10 w-10",
  textClassName = "text-xl",
}: {
  name: string;
  href?: string;
  markClassName?: string;
  textClassName?: string;
}) {
  return (
    <Link href={href} className="flex shrink-0 items-center gap-2.5" aria-label={href === "/" ? `${name} — صفحه اصلی` : name}>
      <svg viewBox="0 0 120 120" className={markClassName} aria-hidden="true">
        <rect x="0" y="0" width="120" height="120" rx="30" fill="#4F46E5" />
        <path
          d="M33 62 L61 90 L92 38"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="13"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="100" cy="22" r="9" fill="#F59E0B" />
      </svg>
      <span className={`font-extrabold tracking-tight text-foreground ${textClassName}`}>{name}</span>
    </Link>
  );
}
