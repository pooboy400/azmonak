"use server";

// ============================================================
// احراز هویت OTP (گام G10 + D3) — درخواست کد و تأیید کد
// کد ۵ رقمی، انقضای ۲ دقیقه، حداکثر ۵ تلاش، محدودیت ارسال ۴۵ ثانیه
//
// ⚠️ وضعیت فعلی (تصمیم پویا): درگاه پیامک هنوز متصل نیست؛ کد ورود به‌جای
// پیامک در «همهٔ محیط‌ها و همهٔ دامنه‌ها» (توسعه/پیش‌نمایش/تولید) روی همان
// صفحهٔ ورود نمایش داده می‌شود تا ورود همیشه ممکن باشد.
// بعد از اتصال SMS: کافی است OTP_SHOW_CODE_INSTEAD_OF_SMS=false شود تا
// نمایش کد فقط در محیط توسعه برگردد.
// ============================================================

import crypto from "crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSessionCookie, destroySessionCookie } from "@/lib/auth";

const PHONE_REGEX = /^09\d{9}$/;
const OTP_TTL_MS = 2 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 45 * 1000;
const HOURLY_LIMIT = 10;

/**
 * نمایش کد ورود به‌جای پیامک — فعلاً در همهٔ دامنه‌ها/محیط‌ها فعال است
 * (پیامک متصل نیست). با اتصال درگاه SMS این فلگ به false تغییر می‌کند
 * یا فقط برای محیط توسعه برگردانده می‌شود.
 */
const OTP_SHOW_CODE_INSTEAD_OF_SMS = (process.env.OTP_SHOW_CODE_INSTEAD_OF_SMS ?? "true") !== "false";

function hashOtp(phone: string, code: string): string {
  return crypto.createHmac("sha256", process.env.AUTH_SECRET ?? "azmoonak-otp-pepper").update(`${phone}:${code}`).digest("hex");
}

export interface OtpActionResult {
  ok: boolean;
  message?: string;
  /** وقتی پیامک متصل نیست، کد به‌جای پیامک در پاسخ برگردانده می‌شود تا روی صفحه نمایش داده شود */
  devCode?: string;
  resendAfterSec?: number;
}

const phoneSchema = z.object({ phone: z.string().trim() });

export async function requestOtpAction(input: { phone: string }): Promise<OtpActionResult> {
  const parsed = phoneSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "شماره موبایل نامعتبر است." };
  // تبدیل ارقام فارسی/عربی به لاتین
  const phone = parsed.data.phone
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
  if (!PHONE_REGEX.test(phone)) {
    return { ok: false, message: "شماره موبایل را با قالب ۰۹… وارد کنید." };
  }

  // محدودیت ارسال مجدد
  const [last, hourlyCount] = await Promise.all([
    db.otpCode.findFirst({ where: { phone }, orderBy: { createdAt: "desc" } }),
    db.otpCode.count({ where: { phone, createdAt: { gte: new Date(Date.now() - 3_600_000) } } }),
  ]);
  if (hourlyCount >= HOURLY_LIMIT) {
    return { ok: false, message: "تعداد درخواست کد زیاد است. یک ساعت دیگر تلاش کنید.", resendAfterSec: 3600 };
  }
  if (last && Date.now() - last.createdAt.getTime() < RESEND_COOLDOWN_MS) {
    const remain = Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - last.createdAt.getTime())) / 1000);
    return { ok: false, message: `برای ارسال مجدد ${remain} ثانیه صبر کنید.`, resendAfterSec: remain };
  }

  const code = String(crypto.randomInt(10_000, 100_000)); // کد ۵ رقمی (D3)
  await db.otpCode.create({
    data: { phone, code: hashOtp(phone, code), expiresAt: new Date(Date.now() + OTP_TTL_MS) },
  });

  // درگاه پیامک در این فاز متصل نیست — کد در همهٔ دامنه‌ها به‌جای پیامک برگردانده می‌شود
  if (OTP_SHOW_CODE_INSTEAD_OF_SMS) console.log(`[OTP] phone=${phone} code=${code}`);
  return {
    ok: true,
    ...(OTP_SHOW_CODE_INSTEAD_OF_SMS ? { devCode: code } : {}),
    message: OTP_SHOW_CODE_INSTEAD_OF_SMS
      ? "کد تأیید ساخته شد — فعلاً به‌جای پیامک روی همین صفحه نمایش داده می‌شود."
      : "کد تأیید پیامک شد.",
    resendAfterSec: Math.ceil(RESEND_COOLDOWN_MS / 1000),
  };
}

const verifySchema = z.object({ phone: z.string().trim().min(10).max(15), code: z.string().trim().min(5).max(5) });

export async function verifyOtpAction(input: { phone: string; code: string }): Promise<OtpActionResult & { isNewUser?: boolean }> {
  const parsed = verifySchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "کد واردشده کامل نیست." };
  const phone = parsed.data.phone.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
  const code = parsed.data.code.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
  if (!PHONE_REGEX.test(phone) || !/^\d{5}$/.test(code)) {
    return { ok: false, message: "کد واردشده معتبر نیست." };
  }

  const otp = await db.otpCode.findFirst({ where: { phone, consumedAt: null }, orderBy: { createdAt: "desc" } });
  if (!otp || otp.expiresAt.getTime() < Date.now()) {
    return { ok: false, message: "کد منقضی شده است. کد جدید بگیرید." };
  }
  if (otp.attemptCount >= OTP_MAX_ATTEMPTS) {
    return { ok: false, message: "تلاش‌ها بیش از حد مجاز بود. کد جدید بگیرید." };
  }
  if (otp.code !== hashOtp(phone, code)) {
    await db.otpCode.update({ where: { id: otp.id }, data: { attemptCount: { increment: 1 } } });
    const left = OTP_MAX_ATTEMPTS - (otp.attemptCount + 1);
    return { ok: false, message: `کد نادرست است. ${left > 0 ? `${left} تلاش باقی مانده.` : ""}` };
  }

  await db.otpCode.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });

  // کاربر موجود با این شماره؟ (یک شماره فعال به‌ازای هر کاربر — G10)
  const identity = await db.identity.findFirst({ where: { phone, isActive: true }, include: { user: true } });
  let user = identity?.user ?? null;
  let isNewUser = false;

  if (!user) {
    // ثبت‌نام خودکار — آیدی یکتا و نام نمایشی در گام آنبوردینگ اجباری انتخاب می‌شوند؛
    // تا آن لحظه لقب موقت نمایشی است (غیریکتا) و username=null است.
    user = await db.user.create({
      data: {
        nickname: `دانش‌آموز-${crypto.randomInt(1000, 10000)}`,
        identity: { create: { phone, verifiedAt: new Date() } },
      },
      include: { identity: true },
    });
    isNewUser = true;
  }

  await createSessionCookie(user.id);
  return { ok: true, isNewUser };
}

/**
 * خروج از حساب — «فقط» نشست جاری را می‌بندد (حذف کوکی امضاشده).
 * هیچ حساب، جلسه، پاسخ، آمار یا دادهٔ دیگری حذف نمی‌شود؛
 * با ورود دوباره با همان شماره، همهٔ داده‌ها سر جای خودشان هستند.
 * تنها راه پاک شدن حساب، «حذف حساب» از خود پروفایل است (deleteAccountAction).
 */
export async function logoutAction(): Promise<{ ok: boolean }> {
  await destroySessionCookie();
  return { ok: true };
}
