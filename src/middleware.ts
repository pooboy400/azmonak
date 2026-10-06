import { NextResponse, type NextRequest } from "next/server";

// معماری ساب‌دامین پورتال (تصمیم پویا):
//   - سایت عمومی: sitename (مثلاً azmonak.ir)
//   - پورتال دانش‌آموزی: portal.sitename
// در پروداکشن، درخواست‌های Host = portal.* به مسیرهای /portal/* ریرایت می‌شوند.
// در محیط پیش‌نمایش (بدون ساب‌دامین واقعی) همان مسیرها با /portal/... در دسترس‌اند.

export function middleware(request: NextRequest) {
  const host = (request.headers.get("host") ?? "").toLowerCase();
  const { pathname } = request.nextUrl;

  const isPortalHost = host.startsWith("portal.") || host.startsWith("portal:");
  const inPortalPath = pathname === "/portal" || pathname.startsWith("/portal/");

  if (isPortalHost && !inPortalPath) {
    const url = request.nextUrl.clone();
    url.pathname = pathname === "/" ? "/portal" : `/portal${pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|.*\\.[\\w]+$).*)"],
};
