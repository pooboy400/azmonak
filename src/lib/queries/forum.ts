// ============================================================
// لایه دادهٔ انجمن پرسش و پاسخ — فهرست، جزئیات، فرم پرسش جدید
// بدنه‌ها LaTeX دارند و فقط با MathText رندر می‌شوند (قاعدهٔ فرمول).
// ============================================================

import { db } from "@/lib/db";

// ---------- فهرست انجمن ----------

export interface ForumListItem {
  id: string;
  title: string;
  status: string; // OPEN | RESOLVED
  viewCount: number;
  answerCount: number;
  voteCount: number;
  createdAt: Date;
  author: { nickname: string; username: string | null; avatarUrl: string | null };
  subject: { id: string; title: string };
  topicTitle: string | null;
  hasAcceptedAnswer: boolean;
}

export async function getForumList(
  filters: { subjectId?: string; unanswered?: boolean; q?: string } = {},
  limit = 40,
): Promise<ForumListItem[]> {
  const questions = await db.forumQuestion.findMany({
    where: {
      ...(filters.subjectId ? { subjectId: filters.subjectId } : {}),
      ...(filters.unanswered
        ? { answers: { none: { isAccepted: true } } }
        : {}),
      ...(filters.q ? { OR: [{ title: { contains: filters.q } }, { body: { contains: filters.q } }] } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      author: { select: { nickname: true, username: true, avatarUrl: true } },
      subject: { select: { id: true, title: true } },
      topic: { select: { title: true } },
      _count: { select: { answers: true, votes: true } },
    },
  });
  return questions.map((q) => ({
    id: q.id,
    title: q.title,
    status: q.status,
    viewCount: q.viewCount,
    answerCount: q._count.answers,
    voteCount: q._count.votes,
    createdAt: q.createdAt,
    author: q.author,
    subject: q.subject,
    topicTitle: q.topic?.title ?? null,
    hasAcceptedAnswer: q.status === "RESOLVED",
  }));
}

/** درس‌های فیلتر فهرست — همهٔ درس‌های فعال (انجمن سراسری است، نه کوهورت‌محور) */
export async function getForumSubjects(): Promise<Array<{ id: string; title: string; grade: string }>> {
  return db.subject.findMany({
    where: { isActive: true },
    orderBy: [{ grade: "asc" }, { title: "asc" }],
    select: { id: true, title: true, grade: true },
  });
}

// ---------- جزئیات پرسش ----------

export interface ForumAnswerItem {
  id: string;
  body: string;
  isAccepted: boolean;
  createdAt: Date;
  voteCount: number;
  votedByMe: boolean;
  author: { id: string; nickname: string; username: string | null; avatarUrl: string | null; role: string };
}

export interface ForumQuestionDetail {
  id: string;
  title: string;
  body: string;
  status: string;
  viewCount: number;
  createdAt: Date;
  author: { id: string; nickname: string; username: string | null; avatarUrl: string | null };
  subject: { id: string; title: string };
  topicTitle: string | null;
  voteCount: number;
  votedByMe: boolean;
  answers: ForumAnswerItem[];
  canManage: boolean; // نویسندهٔ سؤال یا ادمین — پذیرش پاسخ / حذف
  canDelete: boolean; // نویسنده یا ادمین
}

export async function getForumQuestionDetail(questionId: string, viewerId: string | null, viewerRole: string | null): Promise<ForumQuestionDetail | null> {
  const q = await db.forumQuestion.findUnique({
    where: { id: questionId },
    include: {
      author: { select: { id: true, nickname: true, username: true, avatarUrl: true } },
      subject: { select: { id: true, title: true } },
      topic: { select: { title: true } },
      answers: {
        orderBy: [{ isAccepted: "desc" }, { createdAt: "asc" }],
        include: {
          author: { select: { id: true, nickname: true, username: true, avatarUrl: true, role: true } },
          _count: { select: { votes: true } },
        },
      },
      _count: { select: { votes: true } },
    },
  });
  if (!q) return null;

  const [myQuestionVote, myAnswerVotes] = viewerId
    ? await Promise.all([
        db.forumQuestionVote.findUnique({ where: { questionId_userId: { questionId, userId: viewerId } } }),
        db.forumAnswerVote.findMany({
          where: { userId: viewerId, answer: { questionId } },
          select: { answerId: true },
        }),
      ])
    : [null, []];

  const myAnswerVoteSet = new Set(myAnswerVotes.map((v) => v.answerId));

  return {
    id: q.id,
    title: q.title,
    body: q.body,
    status: q.status,
    viewCount: q.viewCount,
    createdAt: q.createdAt,
    author: q.author,
    subject: q.subject,
    topicTitle: q.topic?.title ?? null,
    voteCount: q._count.votes,
    votedByMe: Boolean(myQuestionVote),
    answers: q.answers.map((a) => ({
      id: a.id,
      body: a.body,
      isAccepted: a.isAccepted,
      createdAt: a.createdAt,
      voteCount: a._count.votes,
      votedByMe: myAnswerVoteSet.has(a.id),
      author: a.author,
    })),
    canManage: viewerId !== null && (q.authorId === viewerId || viewerRole === "ADMIN"),
    canDelete: viewerId !== null && (q.authorId === viewerId || viewerRole === "ADMIN"),
  };
}

// ---------- فرم پرسش جدید ----------

export interface AskSubject {
  id: string;
  title: string;
  grade: string;
  major: string | null;
  topics: Array<{ id: string; title: string }>;
}

/** درس‌های فعال با مبحث‌ها برای انتخاب‌گر فرم پرسش */
export async function getAskFormData(): Promise<AskSubject[]> {
  const subjects = await db.subject.findMany({
    where: { isActive: true },
    orderBy: [{ grade: "asc" }, { title: "asc" }],
    select: {
      id: true,
      title: true,
      grade: true,
      major: true,
      topics: { orderBy: { order: "asc" }, select: { id: true, title: true } },
    },
  });
  return subjects;
}
