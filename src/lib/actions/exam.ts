"use server";

// ============================================================
// اکشن‌های آزمون — چرخه کامل جلسه تطبیقی
// شروع (جایابی/تمرین) → انتخاب سؤال سه‌لایه → ثبت پاسخ با آپدیت
// دوطرفه Elo + نردبان دسته‌ای D16 + مرور SM-2 → نمره وزن‌دار D13
// امنیت: هر اکشن مالکیت جلسه و فعال‌بودن آن را راستی‌آزمایی می‌کند؛
// در DTO سؤال هیچ‌گاه پاسخ درست/توضیح/رتبینگ لو نمی‌رود.
// ============================================================

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { expectedSuccess, applyResult, kStudent, kQuestion } from "@/lib/engine/elo";
import { START_RATING, PLACEMENT_K, QUESTION_K, PLACEMENT_QUESTIONS, nextQuestionRating } from "@/lib/engine/placement";
import { selectQuestion, type Candidate } from "@/lib/engine/selector";
import { initialLadderState, ladderRecord, difficultyBand, type LadderEvent } from "@/lib/engine/leveling";
import { quality, updateEf, nextInterval, EF_START } from "@/lib/engine/sm2";
import { questionWeight } from "@/lib/engine/predict";

const PRACTICE_QUESTIONS = 10;
const REVIEW_QUESTIONS = 10; // حداکثر سؤال جلسهٔ مرور (تا سقف سؤال‌های موجود مباحث سرموعد)
const EXPOSURE_DAYS = 21; // تازگی مبحث: بعد از ۳ هفته «رهاشده» کامل حساب می‌شود

// ---------- شروع جلسه ----------

export async function startSessionAction(subjectId: string): Promise<{ ok: boolean; message?: string }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "برای شروع آزمون وارد شوید." };

  const subject = await db.subject.findFirst({ where: { id: subjectId, isActive: true } });
  if (!subject) return { ok: false, message: "درس یافت نشد." };

  const approvedCount = await db.question.count({ where: { subjectId, status: "APPROVED" } });
  if (approvedCount === 0) return { ok: false, message: "بانک سؤال این درس هنوز آماده نیست." };

  // جلسه نیمه‌کاره همین درس → ازسرگیری
  const active = await db.session.findFirst({
    where: { userId: user.id, subjectId, status: "ACTIVE" },
    orderBy: { startedAt: "desc" },
  });
  if (active) redirect(`/portal/exam/${active.id}`);

  const ability = await db.subjectAbility.findUnique({
    where: { userId_subjectId: { userId: user.id, subjectId } },
  });
  const type = ability ? "PRACTICE" : "PLACEMENT";

  const session = await db.session.create({
    data: {
      userId: user.id,
      subjectId,
      type,
      questionCount: type === "PLACEMENT" ? PLACEMENT_QUESTIONS : PRACTICE_QUESTIONS,
      rStart: ability?.rating ?? START_RATING,
    },
  });
  redirect(`/portal/exam/${session.id}`);
}

/**
 * شروع جلسهٔ «مرور امروز» — صف SM-2 همین درس.
 * فقط سؤال‌های مباحث سرِموعد (dueAt گذشته) در جلسه می‌آیند و با هر پاسخ،
 * فاصلهٔ مرور همان مبحث طبق SM-2 به‌روز می‌شود. اگر بانک سؤال مباحث
 * سرموعد کوچک‌تر از سقف باشد، جلسه با همان تعداد سؤال تعریف می‌شود.
 */
export async function startReviewSessionAction(subjectId: string): Promise<{ ok: boolean; message?: string }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "برای شروع مرور وارد شوید." };

  const subject = await db.subject.findFirst({ where: { id: subjectId, isActive: true } });
  if (!subject) return { ok: false, message: "درس یافت نشد." };

  // جلسهٔ مرور نیمه‌کاره همین درس → ازسرگیری
  const activeReview = await db.session.findFirst({
    where: { userId: user.id, subjectId, status: "ACTIVE", type: "REVIEW" },
    orderBy: { startedAt: "desc" },
  });
  if (activeReview) redirect(`/portal/exam/${activeReview.id}`);

  const dueTopics = await db.reviewSchedule.findMany({
    where: { userId: user.id, subjectId, dueAt: { lte: new Date() } },
    select: { topicId: true },
  });
  if (dueTopics.length === 0) return { ok: false, message: "مرور سرِموعدی برای این درس نداری." };

  const poolCount = await db.question.count({
    where: { subjectId, status: "APPROVED", topicId: { in: dueTopics.map((t) => t.topicId) } },
  });
  if (poolCount === 0) return { ok: false, message: "برای مباحث سرِموعد، سؤالی در بانک نیست." };

  const ability = await db.subjectAbility.findUnique({
    where: { userId_subjectId: { userId: user.id, subjectId } },
  });

  const session = await db.session.create({
    data: {
      userId: user.id,
      subjectId,
      type: "REVIEW",
      questionCount: Math.min(REVIEW_QUESTIONS, poolCount),
      rStart: ability?.rating ?? START_RATING,
    },
  });
  redirect(`/portal/exam/${session.id}`);
}

// ---------- پایان‌بندی زودهنگام (بانک سؤال مباحث مرور/تمرین تمام شد) ----------

/**
 * جلسه را با تعداد پاسخ‌های موجود کامل می‌کند (نمره وزن‌دار D13 از همان‌ها).
 * اگر هیچ پاسخی نبود، جلسه رهاشده ثبت می‌شود تا زامبی ACTIVE نماند.
 */
async function finalizeSessionEarly(sessionId: string, userId: string, subjectId: string): Promise<void> {
  const allAttempts = await db.attempt.findMany({
    where: { sessionId },
    select: { isCorrect: true, weight: true },
  });
  if (allAttempts.length === 0) {
    await db.session.update({ where: { id: sessionId }, data: { status: "ABANDONED", finishedAt: new Date() } });
    return;
  }
  const totalW = allAttempts.reduce((acc, a) => acc + a.weight, 0);
  const earnedW = allAttempts.reduce((acc, a) => acc + (a.isCorrect ? a.weight : 0), 0);
  const score = totalW > 0 ? (earnedW / totalW) * 100 : 0;
  const ability = await db.subjectAbility.findUnique({ where: { userId_subjectId: { userId, subjectId } } });
  await db.session.update({
    where: { id: sessionId },
    data: { status: "COMPLETED", finishedAt: new Date(), score, rEnd: ability?.rating ?? null },
  });
}

// ---------- سؤال بعدی ----------

export interface NextQuestionResult {
  ok: boolean;
  message?: string;
  finished?: boolean;
  question?: {
    id: string;
    stem: string;
    options: { key: "A" | "B" | "C" | "D"; text: string }[];
    estTimeSec: number;
    topicTitle: string | null;
    index: number; // شماره سؤال جاری در جلسه
    total: number;
    type: string; // PLACEMENT | PRACTICE
    subjectTitle: string;
  };
}

interface SnapShape {
  ladder?: LadderEvent | null;
  rQuestion?: number;
}

export async function getNextQuestionAction(sessionId: string): Promise<NextQuestionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "نشست منقضی شده است." };

  const session = await db.session.findFirst({
    where: { id: sessionId, userId: user.id },
    include: { subject: { select: { title: true } } },
  });
  if (!session) return { ok: false, message: "جلسه یافت نشد." };
  if (session.status !== "ACTIVE") return { ok: true, finished: true };

  const priorAttempts = await db.attempt.findMany({
    where: { sessionId },
    select: { questionId: true, rAfter: true },
    orderBy: { orderInSession: "asc" },
  });
  if (priorAttempts.length >= session.questionCount) return { ok: true, finished: true };

  const questions = await db.question.findMany({
    where: { subjectId: session.subjectId, status: "APPROVED" },
    select: {
      id: true,
      rating: true,
      stem: true,
      optionA: true,
      optionB: true,
      optionC: true,
      optionD: true,
      estTimeSec: true,
      topicId: true,
      topic: { select: { title: true } },
    },
  });
  if (questions.length === 0) return { ok: false, message: "بانک سؤال این درس خالی است." };

  const inSession = new Set(priorAttempts.map((a) => a.questionId));
  const rStudent =
    session.type === "PLACEMENT"
      ? priorAttempts.at(-1)?.rAfter ?? session.rStart
      : (await db.subjectAbility.findUnique({ where: { userId_subjectId: { userId: user.id, subjectId: session.subjectId } } }))
          ?.rating ?? session.rStart;

  let chosen: (typeof questions)[0] | undefined;

  if (session.type === "PLACEMENT") {
    // جایابی: نزدیک‌ترین سؤال به رده هدف دنباله پراکنده (بدون تکرار در جلسه)
    const target = nextQuestionRating(priorAttempts.length, rStudent);
    const pool = questions.filter((q) => !inSession.has(q.id));
    if (pool.length === 0) return { ok: true, finished: true };
    pool.sort((a, b) => Math.abs(a.rating - target) - Math.abs(b.rating - target));
    const ties = pool.filter((q) => Math.abs(q.rating - target) <= Math.abs(pool[0].rating - target) + 25);
    chosen = ties[Math.floor(Math.random() * ties.length)] ?? pool[0];
  } else if (session.type === "REVIEW") {
    // مرور: فقط سؤال‌های مباحث سرِموعد — ضعیف‌ترین مبحث اول (سطح پایین‌تر، ضعف بیشتر)
    const due = await db.reviewSchedule.findMany({
      where: { userId: user.id, subjectId: session.subjectId, dueAt: { lte: new Date() } },
      select: { topicId: true },
    });
    const dueIds = new Set(due.map((d) => d.topicId));
    const pool = questions.filter((q) => !inSession.has(q.id) && q.topicId !== null && dueIds.has(q.topicId));
    if (pool.length === 0) {
      // صف مرور زودتر از سقف جلسه تمام شد → پایان‌بندی زودهنگام
      await finalizeSessionEarly(session.id, user.id, session.subjectId);
      return { ok: true, finished: true };
    }
    const tas = await db.topicAbility.findMany({ where: { userId: user.id, topicId: { in: [...dueIds] } } });
    const weaknessOf = (topicId: string): number => {
      const ta = tas.find((t) => t.topicId === topicId);
      if (!ta) return 0.6;
      return ta.level === 1 ? 0.9 : ta.level === 2 ? 0.5 : 0.2;
    };
    pool.sort((a, b) => {
      const w = weaknessOf(b.topicId!) - weaknessOf(a.topicId!);
      if (Math.abs(w) > 0.001) return w;
      return Math.abs(a.rating - rStudent) - Math.abs(b.rating - rStudent);
    });
    chosen = pool[0];
  } else {
    // تمرین: انتخاب سه‌لایه
    const recent = await db.attempt.findMany({
      where: { userId: user.id },
      select: { questionId: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    const recentIds = recent.map((r) => r.questionId).reverse(); // کهنه‌ترین اول

    const [topicAbilities, recentTopicHits] = await Promise.all([
      db.topicAbility.findMany({ where: { userId: user.id, subjectId: session.subjectId } }),
      db.attempt.findMany({
        where: { userId: user.id, question: { subjectId: session.subjectId } },
        select: { createdAt: true, question: { select: { topicId: true } } },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    ]);
    const taByTopic = new Map(topicAbilities.map((t) => [t.topicId, t]));
    const lastSeenByTopic = new Map<string, number>();
    for (const hit of recentTopicHits) {
      if (!hit.question.topicId) continue;
      if (!lastSeenByTopic.has(hit.question.topicId)) lastSeenByTopic.set(hit.question.topicId, hit.createdAt.getTime());
    }

    let pool = questions.filter((q) => !inSession.has(q.id));
    if (pool.length === 0) {
      // بانک سؤال این درس برای جلسه تمام شده → پایان‌بندی زودهنگام (به‌جای جلسهٔ زامبی)
      await finalizeSessionEarly(session.id, user.id, session.subjectId);
      return { ok: true, finished: true };
    }

    const toCandidate = (q: (typeof questions)[0]): Candidate => {
      const ta = q.topicId ? taByTopic.get(q.topicId) : undefined;
      let weakness = 0.5;
      if (ta) {
        weakness = ta.level === 1 ? 0.8 : ta.level === 2 ? 0.4 : 0.15;
        if (ta.level === 1 && ta.weaknessCount > 0) weakness = 0.9;
        if (ta.wrongStreak > 0) weakness = Math.min(1, weakness + 0.1);
      }
      const lastSeen = q.topicId ? lastSeenByTopic.get(q.topicId) : undefined;
      const recency = lastSeen === undefined ? 1 : Math.max(0, Math.min(1, 1 - (Date.now() - lastSeen) / (EXPOSURE_DAYS * 86_400_000)));
      return { id: q.id, rQuestion: q.rating, weakness, importance: 0.5, recency };
    };

    const withExposure = pool.map(toCandidate);
    const picked = selectQuestion(rStudent, withExposure, recentIds);
    if (picked) {
      chosen = pool.find((q) => q.id === picked.id);
    } else {
      // همه در پنجره مواجهه بودند → فال‌بک: نزدیک‌ترین به انتظار ۰٫۷۰
      pool = pool.filter((q) => !inSession.has(q.id));
      pool.sort((a, b) => Math.abs(expectedSuccess(rStudent, a.rating) - 0.7) - Math.abs(expectedSuccess(rStudent, b.rating) - 0.7));
      chosen = pool[0];
    }
  }

  if (!chosen) return { ok: true, finished: true };
  await db.session.update({ where: { id: session.id }, data: { lastActivityAt: new Date() } });

  return {
    ok: true,
    question: {
      id: chosen.id,
      stem: chosen.stem,
      options: [
        { key: "A" as const, text: chosen.optionA },
        { key: "B" as const, text: chosen.optionB },
        { key: "C" as const, text: chosen.optionC },
        { key: "D" as const, text: chosen.optionD },
      ],
      estTimeSec: chosen.estTimeSec,
      topicTitle: chosen.topic?.title ?? null,
      index: priorAttempts.length + 1,
      total: session.questionCount,
      type: session.type,
      subjectTitle: session.subject.title,
    },
  };
}

// ---------- ثبت پاسخ ----------

export interface SubmitResult {
  ok: boolean;
  message?: string;
  finished?: boolean;
  placement?: boolean;
  index?: number;
  total?: number;
  feedback?: {
    isCorrect: boolean;
    correctOption: "A" | "B" | "C" | "D";
    explanation: string;
    rBefore: number;
    rAfter: number;
    ladder: LadderEvent | null;
  };
  result?: { score: number; correctCount: number };
}

export async function submitAnswerAction(input: {
  sessionId: string;
  questionId: string;
  selected: string;
  confident: boolean | null;
  latencySec: number;
}): Promise<SubmitResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "نشست منقضی شده است." };

  const selected = input.selected?.toUpperCase();
  if (!["A", "B", "C", "D"].includes(selected)) return { ok: false, message: "گزینه نامعتبر است." };

  const session = await db.session.findFirst({ where: { id: input.sessionId, userId: user.id } });
  if (!session) return { ok: false, message: "جلسه یافت نشد." };
  if (session.status !== "ACTIVE") return { ok: true, finished: true };

  const question = await db.question.findFirst({
    where: { id: input.questionId, subjectId: session.subjectId, status: "APPROVED" },
  });
  if (!question) return { ok: false, message: "سؤال یافت نشد." };

  const dupe = await db.attempt.findFirst({ where: { sessionId: session.id, questionId: question.id } });
  if (dupe) return { ok: false, message: "این سؤال قبلاً در این جلسه پاسخ داده شده است." };

  const priorAttempts = await db.attempt.findMany({
    where: { sessionId: session.id },
    select: { orderInSession: true, rAfter: true, paramsSnapshot: true },
    orderBy: { orderInSession: "asc" },
  });
  const orderInSession = priorAttempts.length + 1;
  if (orderInSession > session.questionCount) return { ok: true, finished: true };

  const isCorrect = selected === question.correct;
  const latencySec = Math.max(0, Math.min(7200, Number(input.latencySec) || 0));
  const weight = questionWeight(question.rating);
  const isPlacement = session.type === "PLACEMENT";

  // --- Elo دوطرفه ---
  let rBefore: number;
  let kS: number;
  if (isPlacement) {
    rBefore = priorAttempts.at(-1)?.rAfter ?? session.rStart;
    kS = PLACEMENT_K;
  } else {
    const ability = await db.subjectAbility.findUnique({
      where: { userId_subjectId: { userId: user.id, subjectId: session.subjectId } },
    });
    rBefore = ability?.rating ?? session.rStart;
    kS = kStudent(ability?.answeredCount ?? 0);
  }
  const kQ = kQuestion(question.ratingCount);
  const { newStudent, newQuestion, e } = applyResult(rBefore, question.rating, isCorrect, kS, kQ);

  // --- نردبان دسته‌ای D16 (فقط سؤال موضوع‌دار) ---
  let ladderEvent: LadderEvent | null = null;
  let sm2 = { q: 0, ef: EF_START, interval: 0 };
  if (question.topicId) {
    const ta = await db.topicAbility.findUnique({
      where: { userId_topicId: { userId: user.id, topicId: question.topicId } },
    });
    // ارتقای قبلی این جلسه برای همین دسته؟ (حداکثر یک ارتقا در جلسه)
    let promotedThisSession = false;
    for (const a of priorAttempts) {
      if (!a.paramsSnapshot) continue;
      try {
        const snap = JSON.parse(a.paramsSnapshot) as SnapShape;
        if (snap.ladder?.moved && snap.ladder.direction === "up") promotedThisSession = true;
      } catch { /* snapshot خراب — نادیده */ }
    }
    const { state, event } = ladderRecord(
      ta
        ? {
            level: ta.level,
            wrongStreak: ta.wrongStreak,
            rightStreak: ta.rightStreak,
            weaknessCount: ta.weaknessCount,
            promotedThisSession,
            recent: [],
            alert: false,
          }
        : initialLadderState(),
      isCorrect,
    );
    ladderEvent = event;
    await db.topicAbility.upsert({
      where: { userId_topicId: { userId: user.id, topicId: question.topicId } },
      create: {
        userId: user.id,
        subjectId: session.subjectId,
        topicId: question.topicId,
        level: state.level,
        wrongStreak: state.wrongStreak,
        rightStreak: state.rightStreak,
        weaknessCount: state.weaknessCount,
        answeredCount: 1,
      },
      update: {
        level: state.level,
        wrongStreak: state.wrongStreak,
        rightStreak: state.rightStreak,
        weaknessCount: state.weaknessCount,
        answeredCount: { increment: 1 },
      },
    });

    // --- مرور فاصله‌دار SM-2 ---
    const rs = await db.reviewSchedule.findUnique({
      where: { userId_topicId: { userId: user.id, topicId: question.topicId } },
    });
    const q = quality(isCorrect, input.confident, latencySec);
    const ef = updateEf(rs?.ef ?? EF_START, q);
    let repetitions: number;
    let intervalDays: number;
    if (q < 3.0) {
      repetitions = 0;
      intervalDays = 1;
    } else {
      repetitions = (rs?.repetitions ?? 0) + 1;
      intervalDays = nextInterval(repetitions, ef, q, rs?.intervalDays ?? 0);
    }
    sm2 = { q, ef, interval: intervalDays };
    await db.reviewSchedule.upsert({
      where: { userId_topicId: { userId: user.id, topicId: question.topicId } },
      create: {
        userId: user.id,
        subjectId: session.subjectId,
        topicId: question.topicId,
        ef,
        intervalDays,
        repetitions,
        dueAt: new Date(Date.now() + intervalDays * 86_400_000),
        lastReviewedAt: new Date(),
      },
      update: {
        ef,
        intervalDays,
        repetitions,
        dueAt: new Date(Date.now() + intervalDays * 86_400_000),
        lastReviewedAt: new Date(),
      },
    });
  }

  // --- ثبت Attempt + آپدیت‌ها ---
  const snapshot = JSON.stringify({
    e: Math.round(e * 1000) / 1000,
    kS,
    kQ,
    weight,
    rQuestion: question.rating,
    rQuestionNew: newQuestion,
    confident: input.confident,
    ladder: ladderEvent,
    sm2,
    difficultyBand: difficultyBand(question.rating),
  });

  await Promise.all([
    db.attempt.create({
      data: {
        sessionId: session.id,
        userId: user.id,
        questionId: question.id,
        orderInSession,
        selected,
        isCorrect,
        confidence: input.confident === null ? "GUESSED" : input.confident ? "CONFIDENT" : "GUESSED",
        latencySec,
        weight,
        rBefore,
        rAfter: newStudent,
        paramsSnapshot: snapshot,
      },
    }),
  ]);

  const updates: Array<Promise<unknown>> = [
    db.question.update({ where: { id: question.id }, data: { rating: newQuestion, ratingCount: { increment: 1 } } }),
    db.session.update({ where: { id: session.id }, data: { correctCount: { increment: isCorrect ? 1 : 0 }, lastActivityAt: new Date() } }),
  ];
  if (!isPlacement) {
    updates.push(
      db.subjectAbility.upsert({
        where: { userId_subjectId: { userId: user.id, subjectId: session.subjectId } },
        create: { userId: user.id, subjectId: session.subjectId, rating: newStudent, answeredCount: 1 },
        update: { rating: newStudent, answeredCount: { increment: 1 } },
      }),
    );
  }
  await Promise.all(updates);

  // --- اتمام جلسه ---
  const finished = orderInSession >= session.questionCount;
  let result: SubmitResult["result"];
  if (finished) {
    const allAttempts = await db.attempt.findMany({
      where: { sessionId: session.id },
      select: { isCorrect: true, weight: true },
    });
    // نمره وزن‌دار D13 از وزن‌های ذخیره‌شدهٔ واقعی attempts
    const totalW = allAttempts.reduce((acc, a) => acc + a.weight, 0);
    const earnedW = allAttempts.reduce((acc, a) => acc + (a.isCorrect ? a.weight : 0), 0);
    const realScore = totalW > 0 ? (earnedW / totalW) * 100 : 0;

    if (isPlacement) {
      await db.subjectAbility.upsert({
        where: { userId_subjectId: { userId: user.id, subjectId: session.subjectId } },
        create: { userId: user.id, subjectId: session.subjectId, rating: newStudent, answeredCount: PLACEMENT_QUESTIONS },
        update: { rating: newStudent },
      });
    }
    await db.session.update({
      where: { id: session.id },
      data: { status: "COMPLETED", finishedAt: new Date(), score: realScore, rEnd: newStudent },
    });
    // تکمیل تمرین کلاسی (اگر جلسه برای تمرین معلم شروع شده بود)
    if (session.assignmentId) {
      try {
        await db.assignmentCompletion.upsert({
          where: { assignmentId_studentId: { assignmentId: session.assignmentId, studentId: user.id } },
          create: { assignmentId: session.assignmentId, studentId: user.id, sessionId: session.id, score: realScore },
          update: { sessionId: session.id, score: realScore, completedAt: new Date() },
        });
      } catch {
        // تمرین هم‌زمان حذف شده است — تکمیل ثبت نمی‌شود
      }
    }
    result = { score: Math.round(realScore * 10) / 10, correctCount: allAttempts.filter((a) => a.isCorrect).length };
  }

  if (isPlacement) {
    // جایابی: بازخورد درستی لو نمی‌رود
    return { ok: true, placement: true, finished, index: orderInSession, total: session.questionCount, result };
  }

  return {
    ok: true,
    finished,
    index: orderInSession,
    total: session.questionCount,
    feedback: {
      isCorrect,
      correctOption: question.correct as "A" | "B" | "C" | "D",
      explanation: question.explanation,
      rBefore,
      rAfter: newStudent,
      ladder: ladderEvent,
    },
    result,
  };
}

// ---------- رها کردن جلسه ----------

export async function abandonSessionAction(sessionId: string): Promise<{ ok: boolean; message?: string }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "نشست منقضی شده است." };
  const session = await db.session.findFirst({ where: { id: sessionId, userId: user.id, status: "ACTIVE" } });
  if (!session) return { ok: false, message: "جلسه فعالی یافت نشد." };
  await db.session.update({
    where: { id: session.id },
    data: { status: "ABANDONED", finishedAt: new Date() },
  });
  return { ok: true };
}
