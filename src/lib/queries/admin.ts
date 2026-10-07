// ============================================================
// لایه دادهٔ پنل ادمین — نمای کلی، مدیریت کاربران، درس‌ها، سؤال‌ها
// فقط نقش ADMIN از صفحات مصرف‌کننده استفاده می‌کند (requireRole).
// ============================================================

import { db } from "@/lib/db";

// ---------- نمای کلی ----------

export interface AdminOverviewData {
  users: { total: number; students: number; teachers: number; admins: number; active: number };
  content: { subjects: number; topics: number; questions: { total: number; approved: number; draft: number; retired: number } };
  activity: { sessions: number; completed: number; attempts: number };
  community: { classes: number; friendships: number; forumQuestions: number; forumAnswers: number };
}

export async function getAdminOverview(): Promise<AdminOverviewData> {
  const [usersByRole, activeUsers, subjects, topics, questionsByStatus, sessionsTotal, sessionsCompleted, attempts, classes, friendships, forumQuestions, forumAnswers] =
    await Promise.all([
      db.user.groupBy({ by: ["role"], _count: { _all: true } }),
      db.user.count({ where: { isActive: true } }),
      db.subject.count(),
      db.topic.count(),
      db.question.groupBy({ by: ["status"], _count: { _all: true } }),
      db.session.count(),
      db.session.count({ where: { status: "COMPLETED" } }),
      db.attempt.count(),
      db.classRoom.count(),
      db.friendship.count(),
      db.forumQuestion.count(),
      db.forumAnswer.count(),
    ]);

  const roleCount = (role: string) => usersByRole.find((r) => r.role === role)?._count._all ?? 0;
  const statusCount = (status: string) => questionsByStatus.find((q) => q.status === status)?._count._all ?? 0;
  const questionsTotal = questionsByStatus.reduce((acc, q) => acc + q._count._all, 0);

  return {
    users: {
      total: usersByRole.reduce((acc, r) => acc + r._count._all, 0),
      students: roleCount("STUDENT"),
      teachers: roleCount("TEACHER"),
      admins: roleCount("ADMIN"),
      active: activeUsers,
    },
    content: {
      subjects,
      topics,
      questions: {
        total: questionsTotal,
        approved: statusCount("APPROVED"),
        draft: statusCount("DRAFT") + statusCount("IN_REVIEW"),
        retired: statusCount("RETIRED"),
      },
    },
    activity: { sessions: sessionsTotal, completed: sessionsCompleted, attempts },
    community: { classes, friendships, forumQuestions, forumAnswers },
  };
}

// ---------- کاربران ----------

export interface AdminUserRow {
  id: string;
  username: string | null;
  nickname: string;
  role: string;
  grade: string | null;
  major: string | null;
  isActive: boolean;
  createdAt: Date;
  phone: string | null;
  attempts: number;
}

export async function getAdminUsers(q: string, page: number, perPage = 20): Promise<{ rows: AdminUserRow[]; total: number }> {
  const where = q
    ? {
        OR: [
          { username: { contains: q.toLowerCase() } },
          { nickname: { contains: q } },
          { identity: { phone: { contains: q } } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: { identity: { select: { phone: true } }, _count: { select: { attempts: true } } },
    }),
    db.user.count({ where }),
  ]);

  return {
    rows: users.map((u) => ({
      id: u.id,
      username: u.username,
      nickname: u.nickname,
      role: u.role,
      grade: u.grade,
      major: u.major,
      isActive: u.isActive,
      createdAt: u.createdAt,
      phone: u.identity?.phone ?? null,
      attempts: u._count.attempts,
    })),
    total,
  };
}

// ---------- درس‌ها ----------

export interface AdminSubjectRow {
  id: string;
  code: string;
  title: string;
  grade: string;
  major: string | null;
  iconKey: string | null;
  colorKey: string | null;
  isActive: boolean;
  isSample: boolean;
  topicCount: number;
  questionCount: number;
  approvedCount: number;
  topics: Array<{ id: string; title: string; questionCount: number }>;
}

export async function getAdminSubjects(): Promise<AdminSubjectRow[]> {
  const rows = await db.subject.findMany({
    orderBy: [{ grade: "asc" }, { title: "asc" }],
    include: {
      _count: { select: { topics: true, questions: true } },
      topics: {
        orderBy: { order: "asc" },
        select: { id: true, title: true, _count: { select: { questions: true } } },
      },
    },
  });
  const approved = await db.question.groupBy({ by: ["subjectId"], where: { status: "APPROVED" }, _count: { _all: true } });
  const approvedMap = new Map(approved.map((a) => [a.subjectId, a._count._all]));

  return rows.map((s) => ({
    id: s.id,
    code: s.code,
    title: s.title,
    grade: s.grade,
    major: s.major,
    iconKey: s.iconKey,
    colorKey: s.colorKey,
    isActive: s.isActive,
    isSample: s.isSample,
    topicCount: s._count.topics,
    questionCount: s._count.questions,
    approvedCount: approvedMap.get(s.id) ?? 0,
    topics: s.topics.map((t) => ({ id: t.id, title: t.title, questionCount: t._count.questions })),
  }));
}

// ---------- سؤال‌ها ----------

export interface AdminQuestionRow {
  id: string;
  qid: string;
  subjectTitle: string;
  topicTitle: string | null;
  status: string;
  difficulty: string;
  stem: string;
  rating: number;
  ratingCount: number;
  createdAt: Date;
}

export async function getAdminQuestions(
  filters: { subjectId?: string; status?: string; difficulty?: string; q?: string },
  page: number,
  perPage = 20,
): Promise<{ rows: AdminQuestionRow[]; total: number }> {
  const where = {
    ...(filters.subjectId ? { subjectId: filters.subjectId } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.difficulty ? { difficulty: filters.difficulty } : {}),
    ...(filters.q ? { OR: [{ stem: { contains: filters.q } }, { qid: { contains: filters.q } }] } : {}),
  };

  const [questions, total] = await Promise.all([
    db.question.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        subject: { select: { title: true } },
        topic: { select: { title: true } },
      },
    }),
    db.question.count({ where }),
  ]);

  return {
    rows: questions.map((q) => ({
      id: q.id,
      qid: q.qid,
      subjectTitle: q.subject.title,
      topicTitle: q.topic?.title ?? null,
      status: q.status,
      difficulty: q.difficulty,
      stem: q.stem,
      rating: q.rating,
      ratingCount: q.ratingCount,
      createdAt: q.createdAt,
    })),
    total,
  };
}

/** درس‌ها + مبحث‌ها برای انتخاب‌گر فرم سؤال جدید */
export async function getAdminSubjectsForQuestion(): Promise<Array<{ id: string; title: string; topics: Array<{ id: string; title: string }> }>> {
  return db.subject.findMany({
    where: { isActive: true },
    orderBy: [{ grade: "asc" }, { title: "asc" }],
    select: {
      id: true,
      title: true,
      topics: { orderBy: { order: "asc" }, select: { id: true, title: true } },
    },
  });
}
