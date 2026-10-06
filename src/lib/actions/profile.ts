"use server";

// ============================================================
// اکشن‌های پروفایل — ویرایش لقب/پایه/رشته/حریم خصوصی/آواتار
// هیچ فیلدی هاردکد نمی‌شود؛ مقادیر مجاز از واژگان اسکیما می‌آیند.
// ============================================================

import crypto from "crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

const profileSchema = z.object({
  nickname: z.string().trim().min(3, "لقب حداقل ۳ نویسه است.").max(24, "لقب حداکثر ۲۴ نویسه است."),
  grade: z.enum(["GRADE10", "GRADE11", "GRADE12"]).nullable(),
  major: z.enum(["EXPERIMENTAL", "MATH", "HUMANITIES"]).nullable(),
  privacy: z.enum(["PUBLIC", "FRIENDS", "PRIVATE"]),
  avatarUrl: z.string().trim().max(300).optional().or(z.literal("")),
});

export async function updateProfileAction(input: {
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

  const taken = await db.user.findFirst({ where: { nickname, id: { not: user.id } } });
  if (taken) return { ok: false, message: "این لقب قبلاً گرفته شده است." };

  try {
    await db.user.update({
      where: { id: user.id },
      data: {
        nickname,
        grade,
        major,
        privacy,
        ...(avatarUrl !== undefined ? { avatarUrl: avatarUrl || null } : {}),
      },
    });
  } catch {
    return { ok: false, message: "ذخیره‌سازی ناموفق بود. دوباره تلاش کنید." };
  }
  revalidatePath("/portal");
  revalidatePath("/portal/profile");
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
