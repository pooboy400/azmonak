"use server";

// ============================================================
// اکشن‌های پروفایل — آیدی یکتا (تلگرام‌مانند) + لقب نمایشی + پایه/رشته +
// حریم خصوصی/آواتار + آنبوردینگ اجباری + حذف کامل حساب
// هیچ فیلدی هاردکد نمی‌شود؛ مقادیر مجاز از واژگان اسکیما می‌آیند.
// ============================================================

import crypto from "crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser, destroySessionCookie } from "@/lib/auth";
import { validateUsername } from "@/lib/username";
import { revalidatePath } from "next/cache";

const profileSchema = z.object({
  username: z.string().trim().max(30), // اعتبارسنجی کامل با validateUsername
  nickname: z.string().trim().min(3, "لقب حداقل ۳ نویسه است.").max(24, "لقب حداکثر ۲۴ نویسه است."),
  grade: z.enum(["GRADE10", "GRADE11", "GRADE12"]).nullable(),
  major: z.enum(["EXPERIMENTAL", "MATH", "HUMANITIES"]).nullable(),
  privacy: z.enum(["PUBLIC", "FRIENDS", "PRIVATE"]),
  avatarUrl: z.string().trim().max(300).optional().or(z.literal("")),
});

export async function updateProfileAction(input: {
  username: string;
  nickname: string;
  grade: string | null;
  major: string | null;
  privacy: string;
  avatarUrl?: string;
}): Promise<{ ok: boolean; message?: string }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "نشست منقضی شده است." };

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "ورودی نامعتبر است." };
  }
  const { nickname, grade, major, privacy, avatarUrl } = parsed.data;

  const idCheck = validateUsername(input.username);
  if (!idCheck.ok) return { ok: false, message: idCheck.message };
  const username = idCheck.username;

  // آیدی یکتاست — لقب نمایشی است و یکتایی لازم ندارد (تلگرام‌مانند)
  const taken = await db.user.findUnique({ where: { username } });
  if (taken && taken.id !== user.id) return { ok: false, message: "این آیدی قبلاً گرفته شده است." };

  try {
    await db.user.update({
      where: { id: user.id },
      data: {
        username,
        nickname,
        grade,
        major,
        privacy,
        ...(avatarUrl !== undefined ? { avatarUrl: avatarUrl || null } : {}),
      },
    });
  } catch {
    return { ok: false, message: "ذخیره‌سازی ناموفق بود — احتمالاً این آیدی لحظه‌ای پیش گرفته شد." };
  }
  revalidatePath("/portal");
  revalidatePath("/portal/profile");
  revalidatePath(`/portal/u/${username}`);
  return { ok: true };
}

/** بررسی زندهٔ آیدی در آنبوردینگ/پروفایل — قواعد + یکتایی نسبت به خود کاربر */
export async function checkUsernameAction(input: { username: string }): Promise<{ ok: boolean; message?: string }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "نشست منقضی شده است." };
  const idCheck = validateUsername(input.username);
  if (!idCheck.ok) return idCheck;
  const taken = await db.user.findUnique({ where: { username: idCheck.username } });
  if (taken && taken.id !== user.id) return { ok: false, message: "این آیدی قبلاً گرفته شده است." };
  return { ok: true, message: "این آیدی آزاد است." };
}

/** گام آنبوردینگ اجباری کاربر تازه‌ساخت: انتخاب آیدی یکتا + نام نمایشی (+ پایه/رشته اختیاری همین‌جا) */
export async function completeOnboardingAction(input: {
  username: string;
  nickname: string;
  grade: string | null;
  major: string | null;
}): Promise<{ ok: boolean; message?: string }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "نشست منقضی شده است." };

  const idCheck = validateUsername(input.username);
  if (!idCheck.ok) return { ok: false, message: idCheck.message };

  const nickname = (input.nickname ?? "").trim();
  if (nickname.length < 2 || nickname.length > 24) {
    return { ok: false, message: "نام نمایشی باید ۲ تا ۲۴ نویسه باشد." };
  }

  const GRADES = ["GRADE10", "GRADE11", "GRADE12"];
  const MAJORS = ["EXPERIMENTAL", "MATH", "HUMANITIES"];
  const grade = GRADES.includes(input.grade ?? "") ? input.grade : null;
  const major = MAJORS.includes(input.major ?? "") ? input.major : null;

  const taken = await db.user.findUnique({ where: { username: idCheck.username } });
  if (taken && taken.id !== user.id) return { ok: false, message: "این آیدی قبلاً گرفته شده است." };

  try {
    await db.user.update({
      where: { id: user.id },
      data: { username: idCheck.username, nickname, grade, major },
    });
  } catch {
    return { ok: false, message: "این آیدی لحظه‌ای پیش گرفته شد — یکی دیگر انتخاب کن." };
  }
  revalidatePath("/portal");
  revalidatePath("/portal/profile");
  return { ok: true };
}

/**
 * حذف کامل حساب — تنها راه پاک شدن حساب (از خود پروفایل).
 * حذف User همهٔ رکوردهای وابسته را کسکید پاک می‌کند؛ رکورد identity هم حذف می‌شود
 * یعنی شماره موبایل آزاد می‌شود («null می‌شود») و ثبت‌نام دوباره حساب تازه می‌سازد.
 * خروج از حساب / ورود از دستگاه دیگر هرگز داده را پاک نمی‌کند.
 */
export async function deleteAccountAction(input: { confirm: string }): Promise<{ ok: boolean; message?: string }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "نشست منقضی شده است." };

  const expected = user.username ?? "حذف حساب";
  if ((input.confirm ?? "").trim().toLowerCase() !== expected.toLowerCase()) {
    return { ok: false, message: "متن تأیید با آیدی تو همخوانی ندارد." };
  }

  try {
    await db.user.delete({ where: { id: user.id } }); // کسکید: identity، جلسه‌ها، پاسخ‌ها، توان‌ها، مرورها، دوستی‌ها، عضویت کلاس
  } catch {
    return { ok: false, message: "حذف حساب ناموفق بود. دوباره تلاش کنید." };
  }
  await destroySessionCookie();
  return { ok: true };
}

/** آواتار: دریافت base64 کوچک (حداکثر ۴۸KB پس از انکود) و ذخیره در public/avatars/uploads */
export async function uploadAvatarAction(dataUrl: string): Promise<{ ok: boolean; path?: string; message?: string }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "نشست منقضی شده است." };

  const match = /^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/.exec(dataUrl ?? "");
  if (!match) return { ok: false, message: "فقط تصویر PNG/JPEG/WebP مجاز است." };
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length > 48 * 1024) return { ok: false, message: "حجم تصویر حداکثر ۴۸ کیلوبایت است." };

  const { writeFile, mkdir } = await import("fs/promises");
  const path = await import("path");
  const dir = path.join(process.cwd(), "public", "avatars", "uploads");
  await mkdir(dir, { recursive: true });
  const ext = match[1] === "jpeg" ? "jpg" : match[1];
  const filename = `${crypto.randomBytes(8).toString("hex")}.${ext}`;
  await writeFile(path.join(dir, filename), buffer);

  const publicPath = `/avatars/uploads/${filename}`;
  await db.user.update({ where: { id: user.id }, data: { avatarUrl: publicPath } });
  revalidatePath("/portal/profile");
  revalidatePath("/portal");
  return { ok: true, path: publicPath };
}
