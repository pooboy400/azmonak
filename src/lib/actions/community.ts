"use server";

// ============================================================
// اکشن‌های کامیونیتی — درخواست دوستی، پذیرش/رد، پیوستن کلاس
// privacy دوستان در نمایش لیدربرد رعایت می‌شود (G10).
// ============================================================

import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { normalizeUsername } from "@/lib/username";
import { revalidatePath } from "next/cache";

/** درخواست دوستی با آیدی یکتا (تلگرام‌مانند) — لقب یکتا نیست پس جست‌وجوی قطعی فقط با آیدی ممکن است */
export async function sendFriendRequestAction(username: string): Promise<{ ok: boolean; message?: string }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "نشست منقضی شده است." };
  const q = normalizeUsername(username ?? "");
  if (q.length < 4) return { ok: false, message: "آیدی را کامل بنویس (حداقل ۴ نویسه)." };

  const target = await db.user.findFirst({ where: { username: q, isActive: true } });
  if (!target) return { ok: false, message: "کاربری با این آیدی پیدا نشد." };
  if (target.id === user.id) return { ok: false, message: "خودت هستی!" };

  const existing = await db.friendship.findFirst({
    where: { OR: [{ requesterId: user.id, addresseeId: target.id }, { requesterId: target.id, addresseeId: user.id }] },
  });
  if (existing) {
    return { ok: false, message: existing.status === "ACCEPTED" ? "شما دوست هستید." : "درخواست قبلاً ثبت شده است." };
  }

  await db.friendship.create({ data: { requesterId: user.id, addresseeId: target.id, status: "PENDING" } });
  revalidatePath("/portal/community");
  return { ok: true, message: `درخواست دوستی برای «${target.nickname}» ثبت شد.` };
}

export async function respondFriendRequestAction(
  friendshipId: string,
  accept: boolean,
): Promise<{ ok: boolean; message?: string }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "نشست منقضی شده است." };

  const fr = await db.friendship.findFirst({ where: { id: friendshipId, addresseeId: user.id, status: "PENDING" } });
  if (!fr) return { ok: false, message: "درخواستی برای پاسخ یافت نشد." };

  await db.friendship.update({
    where: { id: fr.id },
    data: { status: accept ? "ACCEPTED" : "PENDING", respondedAt: new Date() },
  });
  if (!accept) {
    await db.friendship.delete({ where: { id: fr.id } }); // رد → حذف رکورد
  }
  revalidatePath("/portal/community");
  return { ok: true, message: accept ? "دوست جدید اضافه شد." : "درخواست رد شد." };
}

export async function joinClassAction(code: string): Promise<{ ok: boolean; message?: string }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "نشست منقضی شده است." };
  const c = (code ?? "").trim().toUpperCase();
  if (!c) return { ok: false, message: "کد کلاس را وارد کنید." };

  const klass = await db.classRoom.findUnique({ where: { code: c } });
  if (!klass) return { ok: false, message: "کلاسی با این کد پیدا نشد." };

  const member = await db.classMember.findUnique({
    where: { classId_studentId: { classId: klass.id, studentId: user.id } },
  });
  if (member) return { ok: false, message: "قبلاً عضو این کلاس هستی." };

  await db.classMember.create({ data: { classId: klass.id, studentId: user.id } });
  revalidatePath("/portal/community");
  return { ok: true, message: `به کلاس «${klass.name}» پیوستیدی.` };
}

export async function leaveClassAction(classId: string): Promise<{ ok: boolean; message?: string }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "نشست منقضی شده است." };
  await db.classMember.deleteMany({ where: { classId, studentId: user.id } });
  revalidatePath("/portal/community");
  return { ok: true, message: "از کلاس خارج شدی." };
}
