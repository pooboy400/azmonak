// ============================================================
// نشست پورتال — کوکی امضاشده HMAC (بدون وابستگی خارجی)
// ساختار کوکی: userId.expiry.hmac(userId.expiry)
// نکته پروداکشن: AUTH_SECRET باید از environment تزریق شود.
// ============================================================

import crypto from "crypto";
import { cookies } from "next/headers";
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
  const store = await cookies();
  store.set(COOKIE_NAME, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE_SEC,
    path: "/",
  });
}

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
