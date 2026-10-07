"use server";

// ============================================================
// اکشن‌های پنل ادمین — نقش/فعال‌سازی کاربر، درس/مبحث، سؤال (G6)
// همهٔ اکشن‌ها نقش ADMIN را سمت سرور گارد می‌کنند.
// ============================================================

import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

const ROLES = ["STUDENT", "TEACHER", "ADMIN"];
const GRADES = ["GRADE10", "GRADE11", "GRADE12"];
const MAJORS = ["EXPERIMENTAL", "MATH", "HUMANITIES"];
const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"];
const Q_STATUSES = ["DRAFT", "IN_REVIEW", "APPROVED", "RETIRED"];

async function requireAdmin() {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

// ---------- کاربران ----------

export async function setUserRoleAction(userId: string, role: string): Promise<{ ok: boolean; message?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, message: "دسترسی ادمین لازم است." };
  if (!ROLES.includes(role)) return { ok: false, message: "نقش نامعتبر است." };
  if (userId === admin.id) return { ok: false, message: "نقش خودت را نمی‌توانی عوض کنی." };

  const target = await db.user.findUnique({ where: { id: userId }, select: { id: true, nickname: true } });
  if (!target) return { ok: false, message: "کاربر یافت نشد." };

  await db.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/portal/admin/users");
  return { ok: true, message: `نقش «${target.nickname}» به ${role === "STUDENT" ? "دانش‌آموز" : role === "TEACHER" ? "معلم" : "ادمین"} تغییر کرد.` };
}

export async function toggleUserActiveAction(userId: string): Promise<{ ok: boolean; message?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, message: "دسترسی ادمین لازم است." };
  if (userId === admin.id) return { ok: false, message: "حساب خودت را نمی‌توانی غیرفعال کنی." };

  const target = await db.user.findUnique({ where: { id: userId }, select: { id: true, nickname: true, isActive: true } });
  if (!target) return { ok: false, message: "کاربر یافت نشد." };

  await db.user.update({ where: { id: userId }, data: { isActive: !target.isActive } });
  revalidatePath("/portal/admin/users");
  return { ok: true, message: target.isActive ? `«${target.nickname}» غیرفعال شد.` : `«${target.nickname}» دوباره فعال شد.` };
}

// ---------- درس‌ها ----------

export async function createSubjectAction(input: {
  code: string;
  title: string;
  grade: string;
  major: string; // "" = عمومی، یکی از رشته‌ها، یا CSV مشترک مثل MATH,EXPERIMENTAL
}): Promise<{ ok: boolean; message?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, message: "دسترسی ادمین لازم است." };

  const code = (input.code ?? "").trim().toUpperCase();
  const title = (input.title ?? "").trim();
  if (!/^[A-Z0-9]{3,10}$/.test(code)) return { ok: false, message: "کد درس باید ۳ تا ۱۰ نویسهٔ لاتین/عدد باشد (مثل FAR12G)." };
  if (title.length < 2 || title.length > 40) return { ok: false, message: "عنوان درس باید ۲ تا ۴۰ نویسه باشد." };
  if (!GRADES.includes(input.grade)) return { ok: false, message: "پایه نامعتبر است." };

  let major: string | null = null;
  if (input.major) {
    const parts = input.major.split(",").map((m) => m.trim()).filter(Boolean);
    if (parts.some((p) => !MAJORS.includes(p))) return { ok: false, message: "رشته نامعتبر است." };
    major = [...new Set(parts)].join(",") || null;
  }

  const codeExists = await db.subject.findUnique({ where: { code }, select: { id: true } });
  if (codeExists) return { ok: false, message: "این کد درس قبلاً استفاده شده است." };

  await db.subject.create({ data: { code, title, grade: input.grade, major } });
  revalidatePath("/portal/admin/subjects");
  return { ok: true, message: `درس «${title}» ساخته شد.` };
}

export async function toggleSubjectActiveAction(subjectId: string): Promise<{ ok: boolean; message?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, message: "دسترسی ادمین لازم است." };

  const subject = await db.subject.findUnique({ where: { id: subjectId }, select: { id: true, title: true, isActive: true } });
  if (!subject) return { ok: false, message: "درس یافت نشد." };

  await db.subject.update({ where: { id: subjectId }, data: { isActive: !subject.isActive } });
  revalidatePath("/portal/admin/subjects");
  return { ok: true, message: subject.isActive ? `درس «${subject.title}» غیرفعال شد.` : `درس «${subject.title}» فعال شد.` };
}

export async function addTopicAction(subjectId: string, title: string): Promise<{ ok: boolean; message?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, message: "دسترسی ادمین لازم است." };

  const clean = (title ?? "").trim();
  if (clean.length < 2 || clean.length > 60) return { ok: false, message: "عنوان مبحث باید ۲ تا ۶۰ نویسه باشد." };

  const subject = await db.subject.findUnique({ where: { id: subjectId }, select: { id: true, title: true } });
  if (!subject) return { ok: false, message: "درس یافت نشد." };

  const exists = await db.topic.findFirst({ where: { subjectId, title: clean }, select: { id: true } });
  if (exists) return { ok: false, message: "این مبحث در همین درس تکراری است." };

  const count = await db.topic.count({ where: { subjectId } });
  await db.topic.create({ data: { subjectId, title: clean, order: count + 1 } });
  revalidatePath("/portal/admin/subjects");
  return { ok: true, message: `مبحث «${clean}» به ${subject.title} اضافه شد.` };
}

export async function deleteTopicAction(topicId: string): Promise<{ ok: boolean; message?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, message: "دسترسی ادمین لازم است." };

  const topic = await db.topic.findUnique({
    where: { id: topicId },
    include: { _count: { select: { questions: true } } },
  });
  if (!topic) return { ok: false, message: "مبحث یافت نشد." };
  if (topic._count.questions > 0) {
    return { ok: false, message: `این مبحث ${topic._count.questions} سؤال دارد — اول سؤال‌ها را منتقل یا بازنشسته کن.` };
  }

  await db.topic.delete({ where: { id: topicId } });
  revalidatePath("/portal/admin/subjects");
  return { ok: true, message: `مبحث «${topic.title}» حذف شد.` };
}

// ---------- سؤال‌ها ----------

export async function createQuestionAction(input: {
  subjectId: string;
  topicId?: string | null;
  difficulty: string;
  stem: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correct: string;
  explanation: string;
  estTimeSec?: number;
  status: string; // DRAFT | APPROVED
}): Promise<{ ok: boolean; message?: string; id?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, message: "دسترسی ادمین لازم است." };

  if (!DIFFICULTIES.includes(input.difficulty)) return { ok: false, message: "سختی نامعتبر است." };
  if (!["DRAFT", "APPROVED"].includes(input.status)) return { ok: false, message: "وضعیت اولیه نامعتبر است." };
  if (!["A", "B", "C", "D"].includes(input.correct)) return { ok: false, message: "گزینهٔ درست نامعتبر است." };

  const stem = (input.stem ?? "").trim();
  const explanation = (input.explanation ?? "").trim();
  const options = {
    A: (input.optionA ?? "").trim(),
    B: (input.optionB ?? "").trim(),
    C: (input.optionC ?? "").trim(),
    D: (input.optionD ?? "").trim(),
  };
  if (stem.length < 5) return { ok: false, message: "صورت سؤال خیلی کوتاه است." };
  if (explanation.length < 10) return { ok: false, message: "پاسخ تشریحی باید حداقل دو جمله باشد (۱۰ نویسه)." };
  for (const [k, v] of Object.entries(options)) {
    if (v.length === 0) return { ok: false, message: `گزینهٔ ${k} خالی است.` };
    if (v.length > 500) return { ok: false, message: `گزینهٔ ${k} بیش از حد بلند است.` };
  }

  const subject = await db.subject.findUnique({ where: { id: input.subjectId }, select: { id: true, code: true } });
  if (!subject) return { ok: false, message: "درس یافت نشد." };

  let topicId: string | null = null;
  if (input.topicId) {
    const topic = await db.topic.findFirst({ where: { id: input.topicId, subjectId: subject.id } });
    if (!topic) return { ok: false, message: "مبحث انتخاب‌شده به این درس تعلق ندارد." };
    topicId = topic.id;
  }

  // qid یکتا: ADM-{CODE}-{ردیف} با تلاش مجدد
  const count = await db.question.count({ where: { subjectId: subject.id } });
  let qid = `ADM-${subject.code}-${String(count + 1).padStart(3, "0")}`;
  for (let i = 0; i < 20; i++) {
    const exists = await db.question.findUnique({ where: { qid }, select: { id: true } });
    if (!exists) break;
    qid = `ADM-${subject.code}-${String(count + 1).padStart(3, "0")}-${i + 2}`;
  }

  const rating = { EASY: 1150, MEDIUM: 1250, HARD: 1350 }[input.difficulty as "EASY" | "MEDIUM" | "HARD"];
  const question = await db.question.create({
    data: {
      qid,
      subjectId: subject.id,
      topicId,
      status: input.status,
      author: `ادمین (${admin.nickname})`,
      difficulty: input.difficulty,
      stem,
      optionA: options.A,
      optionB: options.B,
      optionC: options.C,
      optionD: options.D,
      correct: input.correct,
      explanation,
      estTimeSec: Math.max(30, Math.min(600, Math.floor(Number(input.estTimeSec) || 90))),
      rating,
    },
  });
  revalidatePath("/portal/admin/questions");
  return { ok: true, message: `سؤال ${qid} ساخته شد.`, id: question.id };
}

export async function setQuestionStatusAction(questionId: string, status: string): Promise<{ ok: boolean; message?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, message: "دسترسی ادمین لازم است." };
  if (!Q_STATUSES.includes(status)) return { ok: false, message: "وضعیت نامعتبر است." };

  const question = await db.question.findUnique({ where: { id: questionId }, select: { id: true, qid: true, status: true } });
  if (!question) return { ok: false, message: "سؤال یافت نشد." };
  if (question.status === status) return { ok: false, message: "سؤال همین حالا در این وضعیت است." };

  await db.question.update({ where: { id: questionId }, data: { status } });
  revalidatePath("/portal/admin/questions");
  const label: Record<string, string> = { DRAFT: "پیش‌نویس", IN_REVIEW: "در بررسی", APPROVED: "تأییدشده", RETIRED: "بازنشسته" };
  return { ok: true, message: `${question.qid} → ${label[status]}` };
}
