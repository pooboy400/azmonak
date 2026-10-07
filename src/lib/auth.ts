// ============================================================
// نشست پورتال — کوکی امضاشده HMAC (بدون وابستگی خارجی)
// ساختار کوکی: userId.expiry.hmac(userId.expiry)
//
// ماندگاری نشست (تصمیم پویا): کوکی «ماندگار» است (maxAge ۳۰ روز) —
// بستن تب/مرورگر نشست را نمی‌بندد و کاربر لاگین می‌ماند. پرچم secure
// بر اساس پروتکل واقعی درخواست (x-forwarded-proto) تنظیم می‌شود تا
// کوکی روی هر دامنه‌ای — HTTPS یا HTTP — توسط مرورگر رد نشود.
// نکته پروداکشن: AUTH_SECRET باید از environment تزریق شود.
// ============================================================

import crypto from "crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

const COOKIE_NAME = "azm_session";
const SECRET = process.env.AUTH_SECRET ?? "azmoonak-dev-secret-change-in-production";
const MAX_AGE_SEC = 60 * 60 * 24 * 30; // ۳۰ روز

function sign(payload: string): string {
  return crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
}

export async function createSessionCookie(userId: string): Promise<void> {
  const exp = Date.now() + MAX_AGE_SEC * 1000;
  const payload = `${userId}.${exp}`;
  // secure فقط وقتی که درخواست واقعاً روی HTTPS آمده — وگرنه مرورگرهای
  // دامنه‌های HTTP کوکی را بی‌صدا رد می‌کردند و لاگین «می‌پرید».
  const proto = ((await headers()).get("x-forwarded-proto") ?? "").split(",")[0].trim();
  const store = await cookies();
  store.set(COOKIE_NAME, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: proto === "https",
    maxAge: MAX_AGE_SEC,
    path: "/",
  });
}

/**
 * خروج از حساب — کوکی نشست را پاک می‌کند؛ هیچ داده‌ای (حساب، جلسه، پاسخ، آمار،
 * فایل و …) حذف نمی‌شود. حذف حساب فقط از پروفایل و با تأیید صریح انجام می‌شود.
 */
export async function destroySessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/** کاربر نشست جاری — نامعتبر/منقضی/غیرفعال ← null. */
export async function getSessionUser() {
  const store = await cookies();
  const value = store.get(COOKIE_NAME)?.value;
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const [userId, exp, sig] = parts;
  if (!userId || !exp || !sig) return null;
  const expected = sign(`${userId}.${exp}`);
  // مقایسه زمان‌ثابت برای جلوگیری از timing attack
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  if (Number(exp) < Date.now()) return null;
  try {
    return await db.user.findFirst({ where: { id: userId, isActive: true } });
  } catch {
    return null;
  }
}

/** کاربر یا پرتاب به صفحه ورود — برای صفحات محافظت‌شده. */
export async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect("/portal/login");
  return user;
}

/** کاربر با یکی از نقش‌های مجاز — وگرنه به داشبورد برمی‌گردد. */
export async function requireRole(roles: string[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/portal");
  return user;
}
