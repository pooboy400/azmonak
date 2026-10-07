"use server";

// ============================================================
// اکشن‌های انجمن پرسش و پاسخ — پرسش، پاسخ، پذیرش، رأی، حذف
// همهٔ اکشن‌ها ورودی را سمت سرور اعتبارسنجی می‌کنند؛ حذف/پذیرش
// فقط برای نویسندهٔ محتوا یا ادمین.
// ============================================================

import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

const TITLE_MIN = 5;
const TITLE_MAX = 120;
const BODY_MIN = 10;
const BODY_MAX = 4000;

export async function createForumQuestionAction(input: {
  subjectId: string;
  topicId?: string | null;
  title: string;
  body: string;
}): Promise<{ ok: boolean; message?: string; id?: string }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "برای پرسیدن سؤال وارد شوید." };

  const title = (input.title ?? "").trim();
  const body = (input.body ?? "").trim();
  if (title.length < TITLE_MIN || title.length > TITLE_MAX) {
    return { ok: false, message: `عنوان باید ${TITLE_MIN} تا ${TITLE_MAX} نویسه باشد.` };
  }
  if (body.length < BODY_MIN || body.length > BODY_MAX) {
    return { ok: false, message: `متن سؤال باید ${BODY_MIN} تا ${BODY_MAX} نویسه باشد.` };
  }

  const subject = await db.subject.findFirst({ where: { id: input.subjectId, isActive: true } });
  if (!subject) return { ok: false, message: "درس انتخاب‌شده معتبر نیست." };

  let topicId: string | null = null;
  if (input.topicId) {
    const topic = await db.topic.findFirst({ where: { id: input.topicId, subjectId: subject.id } });
    if (!topic) return { ok: false, message: "مبحث انتخاب‌شده به این درس تعلق ندارد." };
    topicId = topic.id;
  }

  const question = await db.forumQuestion.create({
    data: { authorId: user.id, subjectId: subject.id, topicId, title, body },
  });
  revalidatePath("/portal/forum");
  return { ok: true, message: "سؤال تو منتشر شد.", id: question.id };
}

export async function createForumAnswerAction(input: {
  questionId: string;
  body: string;
}): Promise<{ ok: boolean; message?: string }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "برای پاسخ دادن وارد شوید." };

  const body = (input.body ?? "").trim();
  if (body.length < BODY_MIN || body.length > BODY_MAX) {
    return { ok: false, message: `متن پاسخ باید ${BODY_MIN} تا ${BODY_MAX} نویسه باشد.` };
  }

  const question = await db.forumQuestion.findUnique({ where: { id: input.questionId }, select: { id: true } });
  if (!question) return { ok: false, message: "سؤال یافت نشد." };

  await db.forumAnswer.create({ data: { questionId: question.id, authorId: user.id, body } });
  revalidatePath(`/portal/forum/${question.id}`);
  return { ok: true, message: "پاسخ تو ثبت شد." };
}

/** پذیرش/لغو پذیرش پاسخ — نویسندهٔ سؤال یا ادمین؛ پذیرش، سؤال را RESOLVED می‌کند */
export async function acceptAnswerAction(answerId: string): Promise<{ ok: boolean; message?: string }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "نشست منقضی شده است." };

  const answer = await db.forumAnswer.findUnique({
    where: { id: answerId },
    include: { question: { select: { id: true, authorId: true } } },
  });
  if (!answer) return { ok: false, message: "پاسخ یافت نشد." };
  if (answer.question.authorId !== user.id && user.role !== "ADMIN") {
    return { ok: false, message: "فقط نویسندهٔ سؤال می‌تواند پاسخ را بپذیرد." };
  }

  if (answer.isAccepted) {
    await db.forumAnswer.update({ where: { id: answer.id }, data: { isAccepted: false } });
    await db.forumQuestion.update({ where: { id: answer.question.id }, data: { status: "OPEN" } });
  } else {
    // فقط یک پاسخ پذیرفتهٔ هر سؤال
    await db.forumAnswer.updateMany({ where: { questionId: answer.question.id, isAccepted: true }, data: { isAccepted: false } });
    await db.forumAnswer.update({ where: { id: answer.id }, data: { isAccepted: true } });
    await db.forumQuestion.update({ where: { id: answer.question.id }, data: { status: "RESOLVED" } });
  }
  revalidatePath(`/portal/forum/${answer.question.id}`);
  revalidatePath("/portal/forum");
  return { ok: true, message: answer.isAccepted ? "پذیرش پاسخ لغو شد." : "پاسخ پذیرفته شد — سؤال حل‌شده شد." };
}

/** رأی رفت‌وبرگشتی روی پرسش */
export async function toggleQuestionVoteAction(questionId: string): Promise<{ ok: boolean; message?: string; voted?: boolean }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "برای رأی دادن وارد شوید." };

  const question = await db.forumQuestion.findUnique({ where: { id: questionId }, select: { id: true, authorId: true } });
  if (!question) return { ok: false, message: "سؤال یافت نشد." };
  if (question.authorId === user.id) return { ok: false, message: "به سؤال خودت رأی نمی‌دهی." };

  const existing = await db.forumQuestionVote.findUnique({
    where: { questionId_userId: { questionId, userId: user.id } },
  });
  if (existing) {
    await db.forumQuestionVote.delete({ where: { id: existing.id } });
    revalidatePath(`/portal/forum/${questionId}`);
    return { ok: true, voted: false };
  }
  await db.forumQuestionVote.create({ data: { questionId, userId: user.id } });
  revalidatePath(`/portal/forum/${questionId}`);
  return { ok: true, voted: true };
}

/** رأی رفت‌وبرگشتی روی پاسخ */
export async function toggleAnswerVoteAction(answerId: string): Promise<{ ok: boolean; message?: string; voted?: boolean }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "برای رأی دادن وارد شوید." };

  const answer = await db.forumAnswer.findUnique({
    where: { id: answerId },
    include: { question: { select: { id: true } } },
  });
  if (!answer) return { ok: false, message: "پاسخ یافت نشد." };
  if (answer.authorId === user.id) return { ok: false, message: "به پاسخ خودت رأی نمی‌دهی." };

  const existing = await db.forumAnswerVote.findUnique({
    where: { answerId_userId: { answerId, userId: user.id } },
  });
  if (existing) {
    await db.forumAnswerVote.delete({ where: { id: existing.id } });
    revalidatePath(`/portal/forum/${answer.question.id}`);
    return { ok: true, voted: false };
  }
  await db.forumAnswerVote.create({ data: { answerId, userId: user.id } });
  revalidatePath(`/portal/forum/${answer.question.id}`);
  return { ok: true, voted: true };
}

/** حذف سؤال — نویسنده یا ادمین (پاسخ‌ها و رأی‌ها کسکید حذف می‌شوند) */
export async function deleteForumQuestionAction(questionId: string): Promise<{ ok: boolean; message?: string }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "نشست منقضی شده است." };

  const question = await db.forumQuestion.findUnique({ where: { id: questionId }, select: { id: true, authorId: true } });
  if (!question) return { ok: false, message: "سؤال یافت نشد." };
  if (question.authorId !== user.id && user.role !== "ADMIN") return { ok: false, message: "دسترسی نداری." };

  await db.forumQuestion.delete({ where: { id: questionId } });
  revalidatePath("/portal/forum");
  return { ok: true, message: "سؤال حذف شد." };
}

/** حذف پاسخ — نویسندهٔ پاسخ، نویسندهٔ سؤال یا ادمین */
export async function deleteForumAnswerAction(answerId: string): Promise<{ ok: boolean; message?: string }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "نشست منقضی شده است." };

  const answer = await db.forumAnswer.findUnique({
    where: { id: answerId },
    include: { question: { select: { id: true, authorId: true } } },
  });
  if (!answer) return { ok: false, message: "پاسخ یافت نشد." };
  if (answer.authorId !== user.id && answer.question.authorId !== user.id && user.role !== "ADMIN") {
    return { ok: false, message: "دسترسی نداری." };
  }

  const wasAccepted = answer.isAccepted;
  await db.forumAnswer.delete({ where: { id: answerId } });
  if (wasAccepted) {
    await db.forumQuestion.update({ where: { id: answer.question.id }, data: { status: "OPEN" } });
  }
  revalidatePath(`/portal/forum/${answer.question.id}`);
  revalidatePath("/portal/forum");
  return { ok: true, message: "پاسخ حذف شد." };
}

/** افزایش شمار بازدید — از کلاینت بعد از رندر صفحهٔ جزئیات صدا زده می‌شود */
export async function incrementForumViewAction(questionId: string): Promise<void> {
  try {
    await db.forumQuestion.update({ where: { id: questionId }, data: { viewCount: { increment: 1 } } });
  } catch {
    // شمار بازدید حیاتی نیست — خطا نادیده
  }
}
