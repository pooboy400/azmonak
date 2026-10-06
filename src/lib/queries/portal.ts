// ============================================================
// لایه دسترسی داده پورتال — تنها نقطه اتصال صفحات پورتال به DB
// حریم خصوصی لیدربرد (G10): نمایش کاربران PUBLIC برای همه،
// FRIENDS فقط برای دوستان/خودِ کاربر، PRIVATE فقط خودِ کاربر.
// ============================================================

import { db } from "@/lib/db";
import { weekStartUtc } from "@/lib/queries/site";
import { predictNextScore, type ScoreForecast } from "@/lib/engine/predict";

// ---------- قواعد حریم خصوصی ----------

async function friendIdsOf(userId: string): Promise<Set<string>> {
  const rows = await db.friendship.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
    select: { requesterId: true, addresseeId: true },
  });
  const ids = new Set<string>();
  for (const r of rows) {
    ids.add(r.requesterId === userId ? r.addresseeId : r.requesterId);
  }
  ids.add(userId); // خود کاربر همیشه نماینده است
  return ids;
}

/** آیا این کاربر از دید بیننده قابل نمایش است؟ */
function isVisible(privacy: string, targetId: string, viewerId: string, friends: Set<string>): boolean {
  if (targetId === viewerId) return true;
  if (privacy === "PUBLIC") return true;
  if (privacy === "FRIENDS") return friends.has(viewerId); // بیننده دوستِ هدف است؟
  return false; // PRIVATE
}

// ---------- درس‌های پورتال ----------

export interface PortalSubject {
  id: string;
  code: string;
  title: string;
  grade: string;
  major: string | null; // null = عمومی
  iconKey: string | null;
  colorKey: string | null;
  topicCount: number;
  questionCount: number;
  rating: number | null; // R_s اگر جایابی شده
  answeredCount: number;
  completedSessions: number;
  activeSessionId: string | null;
  dueReviews: number;
  bestScore: number | null;
}

export async function getPortalSubjects(userId: string, grade: string | null, major: string | null): Promise<PortalSubject[]> {
  const subjects = await db.subject.findMany({
    where: {
      isActive: true,
      // درسِ هم‌پایه: اختصاصی همان رشته، مشترک چند رشته (شامل رشتهٔ کاربر)، یا عمومی (major خالی)
      ...(grade && major
        ? { grade, OR: [{ major: null }, { major: { contains: major } }] }
        : {}),
      // فقط درس‌هایی که بانک سؤال فعال دارند شروع‌پذیرند
      questions: { some: { status: "APPROVED" } },
    },
    orderBy: [{ grade: "asc" }, { major: "asc" }, { title: "asc" }],
    include: {
      _count: { select: { topics: true, questions: { where: { status: "APPROVED" } } } },
      subjectAbilities: { where: { userId } },
      reviewSchedules: { where: { userId, dueAt: { lte: new Date() } } },
    },
  });

  const [sessions, bests] = await Promise.all([
    db.session.findMany({
      where: { userId, status: "ACTIVE", subjectId: { in: subjects.map((s) => s.id) } },
      select: { id: true, subjectId: true, startedAt: true },
      orderBy: { startedAt: "desc" },
    }),
    db.session.groupBy({
      by: ["subjectId"],
      where: { userId, status: "COMPLETED", score: { not: null } },
      _max: { score: true },
      _count: { _all: true },
    }),
  ]);

  return subjects.map((s) => {
    const ability = s.subjectAbilities[0];
    const activeSession = sessions.find((x) => x.subjectId === s.id);
    const best = bests.find((b) => b.subjectId === s.id);
    return {
      id: s.id,
      code: s.code,
      title: s.title,
      grade: s.grade,
      major: s.major,
      iconKey: s.iconKey,
      colorKey: s.colorKey,
      topicCount: s._count.topics,
      questionCount: s._count.questions,
      rating: ability?.rating ?? null,
      answeredCount: ability?.answeredCount ?? 0,
      completedSessions: best?._count._all ?? 0,
      activeSessionId: activeSession?.id ?? null,
      dueReviews: s.reviewSchedules.length,
      bestScore: best?._max.score ?? null,
    };
  });
}

// ---------- داشبورد ----------

export interface DashboardData {
  user: { id: string; username: string | null; nickname: string; avatarUrl: string | null; grade: string | null; major: string | null; privacy: string };
  needsOnboarding: boolean;
  dueReviews: number;
  subjects: PortalSubject[];
  recentSessions: Array<{ id: string; type: string; status: string; score: number | null; subjectTitle: string; startedAt: Date; questionCount: number; correctCount: number }>;
  totals: { completedSessions: number; attempts: number; avgScore: number | null };
  forecasts: Record<string, ScoreForecast>;
}

export async function getDashboardData(userId: string): Promise<DashboardData> {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("user not found");

  const subjects = await getPortalSubjects(userId, user.grade, user.major);
  const [dueReviews, recent, totalsAgg, completedSessions] = await Promise.all([
    db.reviewSchedule.count({ where: { userId, dueAt: { lte: new Date() } } }),
    db.session.findMany({
      where: { userId },
      orderBy: { startedAt: "desc" },
      take: 5,
      include: { subject: { select: { title: true } } },
    }),
    db.attempt.aggregate({ where: { userId }, _count: { _all: true } }),
    db.session.findMany({
      where: { userId, status: "COMPLETED", score: { not: null }, type: "PRACTICE" },
      select: { subjectId: true, score: true, finishedAt: true },
      orderBy: { finishedAt: "desc" },
      take: 200,
    }),
  ]);

  // پیش‌بینی نمره جلسه بعد per subject (λ=۰٫۸۵ — حداقل ۸ جلسه)
  const bySubject = new Map<string, number[]>();
  for (const s of completedSessions) {
    const arr = bySubject.get(s.subjectId) ?? [];
    arr.push(s.score!); // جدیدترین اول
    bySubject.set(s.subjectId, arr);
  }
  const forecasts: Record<string, ScoreForecast> = {};
  for (const [subjectId, scores] of bySubject) {
    forecasts[subjectId] = predictNextScore(scores);
  }

  const scoreList = completedSessions.map((s) => s.score!);
  return {
    user: {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      grade: user.grade,
      major: user.major,
      privacy: user.privacy,
    },
    needsOnboarding: !user.username || !user.grade || !user.major,
    dueReviews,
    subjects,
    recentSessions: recent.map((s) => ({
      id: s.id,
      type: s.type,
      status: s.status,
      score: s.score,
      subjectTitle: s.subject.title,
      startedAt: s.startedAt,
      questionCount: s.questionCount,
      correctCount: s.correctCount,
    })),
    totals: {
      completedSessions: completedSessions.length,
      attempts: totalsAgg._count._all,
      avgScore: scoreList.length > 0 ? scoreList.reduce((a, b) => a + b, 0) / scoreList.length : null,
    },
    forecasts,
  };
}

// ---------- لیدربرد ----------

export interface LeaderboardRow {
  rank: number;
  userId: string;
  nickname: string;
  avatarUrl: string | null;
  grade: string | null;
  major: string | null;
  value: number; // میانگین نمره هفته یا رتبینگ درس
  sessionCount: number;
  isViewer: boolean;
}

export async function getWeeklyLeaderboard(viewerId: string, minSessions = 2, limit = 50): Promise<{ weekStart: Date; rows: LeaderboardRow[] }> {
  const weekStart = weekStartUtc();
  const sessions = await db.session.findMany({
    where: { status: "COMPLETED", type: "PRACTICE", score: { not: null }, startedAt: { gte: weekStart } },
    select: {
      score: true,
      user: { select: { id: true, nickname: true, avatarUrl: true, grade: true, major: true, privacy: true } },
    },
  });
  const friends = await friendIdsOf(viewerId);
  const agg = new Map<string, { total: number; n: number; u: (typeof sessions)[0]["user"] }>();
  for (const s of sessions) {
    if (s.score === null) continue;
    if (!isVisible(s.user.privacy, s.user.id, viewerId, friends)) continue;
    const a = agg.get(s.user.id) ?? { total: 0, n: 0, u: s.user };
    a.total += s.score;
    a.n += 1;
    agg.set(s.user.id, a);
  }
  const rows = [...agg.entries()]
    .filter(([, a]) => a.n >= minSessions)
    .map(([userId, a]) => ({ userId, nickname: a.u.nickname, avatarUrl: a.u.avatarUrl, grade: a.u.grade, major: a.u.major, value: a.total / a.n, sessionCount: a.n, isViewer: userId === viewerId }))
    .sort((x, y) => y.value - x.value)
    .slice(0, limit)
    .map((r, i) => ({ rank: i + 1, ...r }));
  return { weekStart, rows };
}

export async function getSubjectLeaderboard(viewerId: string, subjectId: string | null, limit = 50): Promise<LeaderboardRow[]> {
  const abilities = await db.subjectAbility.findMany({
    where: { ...(subjectId ? { subjectId } : {}), answeredCount: { gt: 0 } },
    orderBy: { rating: "desc" },
    take: limit * 3,
    include: { user: { select: { id: true, nickname: true, avatarUrl: true, grade: true, major: true, privacy: true } }, subject: { select: { title: true } } },
  });
  const friends = await friendIdsOf(viewerId);
  const seen = new Set<string>();
  const rows: Omit<LeaderboardRow, "rank">[] = [];
  for (const a of abilities) {
    if (!isVisible(a.user.privacy, a.user.id, viewerId, friends)) continue;
    if (seen.has(a.user.id)) continue; // رتبینگ سراسری: هر کاربر یک بار (بهترین)
    seen.add(a.user.id);
    rows.push({ userId: a.user.id, nickname: a.user.nickname, avatarUrl: a.user.avatarUrl, grade: a.user.grade, major: a.user.major, value: a.rating, sessionCount: a.answeredCount, isViewer: a.user.id === viewerId });
    if (rows.length >= limit) break;
  }
  return rows.map((r, i) => ({ rank: i + 1, ...r }));
}

// ---------- کامیونیتی ----------

export interface CommunityData {
  friends: Array<{ id: string; username: string | null; nickname: string; avatarUrl: string | null; grade: string | null; major: string | null; privacy: string }>;
  incoming: Array<{ id: string; nickname: string; avatarUrl: string | null; friendshipId: string }>;
  outgoing: Array<{ id: string; nickname: string; friendshipId: string }>;
  classes: Array<{ id: string; name: string; code: string; teacherName: string; memberCount: number; isMember: boolean }>;
}

export async function getCommunityData(userId: string): Promise<CommunityData> {
  const frs = await db.friendship.findMany({
    where: { OR: [{ requesterId: userId }, { addresseeId: userId }] },
    include: {
      requester: { select: { id: true, username: true, nickname: true, avatarUrl: true, grade: true, major: true, privacy: true } },
      addressee: { select: { id: true, username: true, nickname: true, avatarUrl: true, grade: true, major: true, privacy: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const friends = frs
    .filter((f) => f.status === "ACCEPTED")
    .map((f) => (f.requesterId === userId ? f.addressee : f.requester));
  const incoming = frs
    .filter((f) => f.status === "PENDING" && f.addresseeId === userId)
    .map((f) => ({ id: f.requester.id, nickname: f.requester.nickname, avatarUrl: f.requester.avatarUrl, friendshipId: f.id }));
  const outgoing = frs
    .filter((f) => f.status === "PENDING" && f.requesterId === userId)
    .map((f) => ({ id: f.addressee.id, nickname: f.addressee.nickname, friendshipId: f.id }));

  const memberships = await db.classMember.findMany({
    where: { studentId: userId },
    include: { class: { include: { teacher: { select: { nickname: true } }, _count: { select: { members: true } } } } },
  });
  const allClasses = await db.classRoom.findMany({
    include: { teacher: { select: { nickname: true } }, _count: { select: { members: true } } },
    orderBy: { name: "asc" },
    take: 20,
  });

  return {
    friends: friends.map((f) => ({ id: f.id, username: f.username, nickname: f.nickname, avatarUrl: f.avatarUrl, grade: f.grade, major: f.major, privacy: f.privacy })),
    incoming,
    outgoing,
    classes: allClasses.map((c) => ({
      id: c.id,
      name: c.name,
      code: c.code,
      teacherName: c.teacher.nickname,
      memberCount: c._count.members,
      isMember: memberships.some((m) => m.classId === c.id),
    })),
  };
}

/** جست‌وجوی کاربر برای افزودن دوست — با آیدی (تلگرام‌مانند) یا لقب؛ حذف خود و رعایت فعال بودن */
export async function searchUsers(viewerId: string, q: string): Promise<Array<{ id: string; username: string | null; nickname: string; avatarUrl: string | null; relation: "none" | "friend" | "pending" }>> {
  const query = q.trim();
  if (query.length < 2) return [];
  const normalized = query.toLowerCase().replace(/^@+/, "");
  const users = await db.user.findMany({
    where: {
      isActive: true,
      id: { not: viewerId },
      OR: [{ username: { contains: normalized } }, { nickname: { contains: query } }],
    },
    select: { id: true, username: true, nickname: true, avatarUrl: true },
    take: 6,
  });
  if (users.length === 0) return [];
  const frs = await db.friendship.findMany({
    where: { OR: users.map((u) => ({ OR: [{ requesterId: viewerId, addresseeId: u.id }, { requesterId: u.id, addresseeId: viewerId }] })) },
    select: { requesterId: true, addresseeId: true, status: true },
  });
  return users.map((u) => {
    const fr = frs.find((f) => (f.requesterId === u.id || f.addresseeId === u.id));
    return {
      ...u,
      relation: !fr ? "none" : fr.status === "ACCEPTED" ? "friend" : "pending",
    };
  });
}

// ---------- صفحه آزمون / نتیجه ----------

export interface ExamPageData {
  session: {
    id: string;
    type: string;
    status: string;
    questionCount: number;
    correctCount: number;
    score: number | null;
    rStart: number;
    rEnd: number | null;
    subjectId: string;
    subjectTitle: string;
  };
  answered: number;
}

export async function getExamPageData(sessionId: string, viewerId: string): Promise<ExamPageData | null> {
  const session = await db.session.findFirst({
    where: { id: sessionId, userId: viewerId },
    include: { subject: { select: { title: true } } },
  });
  if (!session) return null;
  const answered = await db.attempt.count({ where: { sessionId } });
  return {
    session: {
      id: session.id,
      type: session.type,
      status: session.status,
      questionCount: session.questionCount,
      correctCount: session.correctCount,
      score: session.score,
      rStart: session.rStart,
      rEnd: session.rEnd,
      subjectId: session.subjectId,
      subjectTitle: session.subject.title,
    },
    answered,
  };
}

export interface ExamReviewItem {
  order: number;
  stem: string;
  options: { key: "A" | "B" | "C" | "D"; text: string }[];
  selected: string;
  correct: string;
  isCorrect: boolean;
  explanation: string;
  topicTitle: string | null;
  latencySec: number;
  weight: number;
  confidentLabel: string;
}

export interface ExamResultData {
  session: ExamPageData["session"] & { startedAt: Date; finishedAt: Date | null };
  review: ExamReviewItem[];
  ladderSummary: { up: number; down: number };
  reviewDueCount: number;
}

const confidenceLabel: Record<string, string> = { CONFIDENT: "مطمئن بودم", GUESSED: "حدس می‌زدم" };

export async function getExamResultData(sessionId: string, viewerId: string): Promise<ExamResultData | null> {
  const session = await db.session.findFirst({
    where: { id: sessionId, userId: viewerId, status: "COMPLETED" },
    include: { subject: { select: { title: true } } },
  });
  if (!session) return null;

  const attempts = await db.attempt.findMany({
    where: { sessionId },
    orderBy: { orderInSession: "asc" },
    include: {
      question: { include: { topic: { select: { title: true } } } },
    },
  });

  const review: ExamReviewItem[] = attempts.map((a) => ({
    order: a.orderInSession,
    stem: a.question.stem,
    options: [
      { key: "A" as const, text: a.question.optionA },
      { key: "B" as const, text: a.question.optionB },
      { key: "C" as const, text: a.question.optionC },
      { key: "D" as const, text: a.question.optionD },
    ],
    selected: a.selected,
    correct: a.question.correct,
    isCorrect: a.isCorrect,
    explanation: a.question.explanation,
    topicTitle: a.question.topic?.title ?? null,
    latencySec: a.latencySec,
    weight: a.weight,
    confidentLabel: confidenceLabel[a.confidence] ?? "—",
  }));

  let up = 0;
  let down = 0;
  for (const a of attempts) {
    if (!a.paramsSnapshot) continue;
    try {
      const snap = JSON.parse(a.paramsSnapshot) as { ladder?: { moved: boolean; direction: string | null } | null };
      if (snap.ladder?.moved && snap.ladder.direction === "up") up += 1;
      if (snap.ladder?.moved && snap.ladder.direction === "down") down += 1;
    } catch { /* snapshot خراب — نادیده */ }
  }

  const reviewDueCount = await db.reviewSchedule.count({ where: { userId: viewerId, dueAt: { lte: new Date() } } });

  return {
    session: {
      id: session.id,
      type: session.type,
      status: session.status,
      questionCount: session.questionCount,
      correctCount: session.correctCount,
      score: session.score,
      rStart: session.rStart,
      rEnd: session.rEnd,
      subjectId: session.subjectId,
      subjectTitle: session.subject.title,
      startedAt: session.startedAt,
      finishedAt: session.finishedAt,
    },
    review,
    ladderSummary: { up, down },
    reviewDueCount,
  };
}

// ---------- پروفایل ----------

export interface ProfileStats {
  attempts: number;
  completedSessions: number;
  avgScore: number | null;
  abilities: Array<{ subjectTitle: string; rating: number; answeredCount: number }>;
  topics: Array<{ level: number; topicTitle: string; subjectTitle: string }>;
}

export async function getProfileData(userId: string): Promise<{ user: DashboardData["user"]; stats: ProfileStats } | null> {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return null;
  const [attemptsAgg, completed, avgRows, abilities, topics] = await Promise.all([
    db.attempt.count({ where: { userId } }),
    db.session.count({ where: { userId, status: "COMPLETED" } }),
    db.session.findMany({ where: { userId, status: "COMPLETED", score: { not: null }, type: "PRACTICE" }, select: { score: true }, take: 200 }),
    db.subjectAbility.findMany({ where: { userId, answeredCount: { gt: 0 } }, include: { subject: { select: { title: true } } }, orderBy: { rating: "desc" } }),
    db.topicAbility.findMany({ where: { userId, answeredCount: { gt: 0 } }, include: { topic: { select: { title: true } }, subject: { select: { title: true } } }, orderBy: { updatedAt: "desc" }, take: 8 }),
  ]);
  const scores = avgRows.map((r) => r.score!);
  return {
    user: { id: user.id, username: user.username, nickname: user.nickname, avatarUrl: user.avatarUrl, grade: user.grade, major: user.major, privacy: user.privacy },
    stats: {
      attempts: attemptsAgg,
      completedSessions: completed,
      avgScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null,
      abilities: abilities.map((a) => ({ subjectTitle: a.subject.title, rating: a.rating, answeredCount: a.answeredCount })),
      topics: topics.map((t) => ({ level: t.level, topicTitle: t.topic.title, subjectTitle: t.subject.title })),
    },
  };
}

// ---------- پروفایل عمومی با آیدی (/portal/u/[username]) ----------

export interface PublicProfileData {
  status: "not_found" | "private" | "friends_only" | "ok";
  isSelf: boolean;
  relation: "self" | "friend" | "pending" | "none";
  user: DashboardData["user"];
  stats: ProfileStats | null; // فقط وقتی status=ok
}

/**
 * مشاهدهٔ پروفایل یک کاربر با آیدی — با رعایت privacy:
 * PUBLIC برای همهٔ واردشده‌ها، FRIENDS فقط دوستان و خودش، PRIVATE فقط خودش.
 */
export async function getPublicProfile(viewerId: string, rawUsername: string): Promise<PublicProfileData | null> {
  const username = rawUsername.trim().toLowerCase().replace(/^@+/, "");
  if (!username) return null;
  const target = await db.user.findFirst({
    where: { username, isActive: true },
    select: { id: true, username: true, nickname: true, avatarUrl: true, grade: true, major: true, privacy: true },
  });
  if (!target) return null;

  const isSelf = target.id === viewerId;
  let relation: PublicProfileData["relation"] = isSelf ? "self" : "none";
  if (!isSelf) {
    const fr = await db.friendship.findFirst({
      where: {
        OR: [
          { requesterId: viewerId, addresseeId: target.id },
          { requesterId: target.id, addresseeId: viewerId },
        ],
      },
      select: { status: true },
    });
    relation = !fr ? "none" : fr.status === "ACCEPTED" ? "friend" : "pending";
  }

  if (!isSelf) {
    if (target.privacy === "PRIVATE") {
      return { status: "private", isSelf, relation, user: target, stats: null };
    }
    if (target.privacy === "FRIENDS" && relation !== "friend") {
      return { status: "friends_only", isSelf, relation, user: target, stats: null };
    }
  }

  const data = await getProfileData(target.id);
  return {
    status: "ok",
    isSelf,
    relation,
    user: target,
    stats: data?.stats ?? null,
  };
}
