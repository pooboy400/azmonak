"use server";

// ============================================================
// اکشن‌های پنل معلم — ساخت/حذف کلاس، عضوها، تمرین کلاسی
// + شروع جلسهٔ تمرین از سمت دانش‌آموز (عضویت کلاس گارد می‌شود)
// هر اکشن نقش/مالکیت را سمت سرور راستی‌آزمایی می‌کند.
// ============================================================

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { START_RATING } from "@/lib/engine/placement";

const GRADES = ["GRADE10", "GRADE11", "GRADE12"];
const MAJORS = ["EXPERIMENTAL", "MATH", "HUMANITIES"];

function generateClassCode(): string {
  // کد پیوستن خوانا مثل AMZK-7F3K — الفبای بدون ابهام
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 4; i++) suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `AMZK-${suffix}`;
}

/** ساخت کلاس جدید — فقط معلم یا ادمین */
export async function createClassAction(
  name: string,
  grade: string,
  major: string,
): Promise<{ ok: boolean; message?: string }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "نشست منقضی شده است." };
  if (user.role !== "TEACHER" && user.role !== "ADMIN") {
    return { ok: false, message: "فقط معلم‌ها می‌توانند کلاس بسازند." };
  }

  const title = (name ?? "").trim();
  if (title.length < 3 || title.length > 60) return { ok: false, message: "نام کلاس باید ۳ تا ۶۰ نویسه باشد." };
  if (!GRADES.includes(grade)) return { ok: false, message: "پایه نامعتبر است." };
  if (!MAJORS.includes(major)) return { ok: false, message: "رشته نامعتبر است." };

  // کد یکتا با تلاش مجدد
  let code = generateClassCode();
  for (let i = 0; i < 8; i++) {
    const exists = await db.classRoom.findUnique({ where: { code }, select: { id: true } });
    if (!exists) break;
    code = generateClassCode();
  }

  const klass = await db.classRoom.create({
    data: { name: title, code, teacherId: user.id, grade, major },
  });
  revalidatePath("/portal/teacher");
  return { ok: true, message: `کلاس «${klass.name}» ساخته شد — کد پیوستن: ${klass.code}` };
}

export async function deleteClassAction(classId: string): Promise<{ ok: boolean; message?: string }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "نشست منقضی شده است." };
  if (user.role !== "TEACHER" && user.role !== "ADMIN") return { ok: false, message: "دسترسی نداری." };

  const klass = await db.classRoom.findFirst({ where: { id: classId, teacherId: user.id } });
  if (!klass && user.role !== "ADMIN") return { ok: false, message: "کلاس یافت نشد." };
  if (!klass) return { ok: false, message: "کلاس یافت نشد." };

  await db.classRoom.delete({ where: { id: classId } }); // اعضا و تمرین‌ها کسکید حذف می‌شوند
  revalidatePath("/portal/teacher");
  return { ok: true, message: `کلاس «${klass.name}» حذف شد.` };
}

export async function removeMemberAction(classId: string, studentId: string): Promise<{ ok: boolean; message?: string }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "نشست منقضی شده است." };
  if (user.role !== "TEACHER" && user.role !== "ADMIN") return { ok: false, message: "دسترسی نداری." };

  const klass = await db.classRoom.findFirst({ where: { id: classId, teacherId: user.id } });
  if (!klass && user.role !== "ADMIN") return { ok: false, message: "کلاس یافت نشد." };

  await db.classMember.deleteMany({ where: { classId, studentId } });
  revalidatePath(`/portal/teacher/classes/${classId}`);
  return { ok: true, message: "دانش‌آموز از کلاس حذف شد." };
}

export async function createAssignmentAction(input: {
  classId: string;
  subjectId: string;
  title: string;
  questionCount: number;
  dueAt?: string | null; // yyyy-mm-dd اختیاری
}): Promise<{ ok: boolean; message?: string }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "نشست منقضی شده است." };
  if (user.role !== "TEACHER" && user.role !== "ADMIN") return { ok: false, message: "دسترسی نداری." };

  const klass = await db.classRoom.findFirst({ where: { id: input.classId, teacherId: user.id } });
  if (!klass && user.role !== "ADMIN") return { ok: false, message: "کلاس یافت نشد." };
  if (!klass) return { ok: false, message: "کلاس یافت نشد." };

  const title = (input.title ?? "").trim();
  if (title.length < 3 || title.length > 80) return { ok: false, message: "عنوان تمرین باید ۳ تا ۸۰ نویسه باشد." };

  const subject = await db.subject.findFirst({
    where: {
      id: input.subjectId,
      isActive: true,
      grade: klass.grade,
      OR: [{ major: null }, { major: { contains: klass.major } }],
      questions: { some: { status: "APPROVED" } },
    },
  });
  if (!subject) return { ok: false, message: "این درس برای پایه/رشتهٔ کلاس قابل تمرین نیست." };

  const count = Math.max(4, Math.min(20, Math.floor(Number(input.questionCount) || 10)));

  let dueAt: Date | null = null;
  if (input.dueAt) {
    const d = new Date(`${input.dueAt}T23:59:59`);
    if (!Number.isNaN(d.getTime())) dueAt = d;
  }

  await db.assignment.create({
    data: { classId: klass.id, subjectId: subject.id, title, questionCount: count, dueAt },
  });
  revalidatePath(`/portal/teacher/classes/${klass.id}`);
  return { ok: true, message: `تمرین «${title}» برای ${subject.title} ساخته شد.` };
}

export async function deleteAssignmentAction(assignmentId: string): Promise<{ ok: boolean; message?: string }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "نشست منقضی شده است." };
  if (user.role !== "TEACHER" && user.role !== "ADMIN") return { ok: false, message: "دسترسی نداری." };

  const assignment = await db.assignment.findFirst({
    where: { id: assignmentId },
    include: { class: { select: { teacherId: true, id: true } } },
  });
  if (!assignment) return { ok: false, message: "تمرین یافت نشد." };
  if (assignment.class.teacherId !== user.id && user.role !== "ADMIN") return { ok: false, message: "دسترسی نداری." };

  await db.assignment.delete({ where: { id: assignmentId } });
  revalidatePath(`/portal/teacher/classes/${assignment.class.id}`);
  return { ok: true, message: "تمرین حذف شد." };
}

/**
 * شروع جلسهٔ تمرین کلاسی از سمت دانش‌آموز — عضویت کلاس + تکمیل‌نبودن تمرین گارد می‌شود.
 * اکشن موفق redirect می‌کند به صفحهٔ آزمون.
 */
export async function startAssignmentSessionAction(assignmentId: string): Promise<{ ok: boolean; message?: string }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "برای شروع تمرین وارد شوید." };

  const assignment = await db.assignment.findFirst({
    where: { id: assignmentId },
    include: { subject: { select: { id: true, isActive: true } } },
  });
  if (!assignment) return { ok: false, message: "تمرین یافت نشد." };

  const member = await db.classMember.findUnique({
    where: { classId_studentId: { classId: assignment.classId, studentId: user.id } },
  });
  if (!member) return { ok: false, message: "این تمرین برای کلاس تو نیست." };
  if (!assignment.subject.isActive) return { ok: false, message: "درس این تمرین غیرفعال شده است." };

  const done = await db.assignmentCompletion.findUnique({
    where: { assignmentId_studentId: { assignmentId, studentId: user.id } },
  });
  if (done) return { ok: false, message: "این تمرین را قبلاً کامل کرده‌ای." };

  const approvedCount = await db.question.count({
    where: { subjectId: assignment.subjectId, status: "APPROVED" },
  });
  if (approvedCount === 0) return { ok: false, message: "بانک سؤال این درس هنوز آماده نیست." };

  // جلسهٔ فعال همین تمرین → ازسرگیری
  const active = await db.session.findFirst({
    where: { userId: user.id, assignmentId, status: "ACTIVE" },
    orderBy: { startedAt: "desc" },
  });
  if (active) redirect(`/portal/exam/${active.id}`);

  const ability = await db.subjectAbility.findUnique({
    where: { userId_subjectId: { userId: user.id, subjectId: assignment.subjectId } },
  });

  const session = await db.session.create({
    data: {
      userId: user.id,
      subjectId: assignment.subjectId,
      type: "PRACTICE",
      questionCount: Math.max(4, Math.min(20, assignment.questionCount)),
      rStart: ability?.rating ?? START_RATING,
      assignmentId,
    },
  });
  redirect(`/portal/exam/${session.id}`);
}
