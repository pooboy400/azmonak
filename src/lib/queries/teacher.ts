// ============================================================
// لایه دادهٔ پنل معلم — کلاس‌ها، اعضا، تمرین‌ها، پیشرفت دانش‌آموزها
// گارد: فقط معلمِ صاحب کلاس (یا ادمین) به دادهٔ کلاس دسترسی دارد.
// ============================================================

import { db } from "@/lib/db";

/** آیا این کاربر اجازهٔ دیدن/مدیریت این کلاس را دارد؟ (معلم صاحب کلاس یا ادمین) */
export async function canManageClass(classId: string, userId: string, role: string): Promise<boolean> {
  if (role === "ADMIN") return true;
  const klass = await db.classRoom.findFirst({ where: { id: classId, teacherId: userId }, select: { id: true } });
  return klass !== null;
}

// ---------- داشبورد معلم ----------

export interface TeacherClassCard {
  id: string;
  name: string;
  code: string;
  grade: string;
  major: string;
  memberCount: number;
  assignmentCount: number;
  createdAt: Date;
}

export interface TeacherDashboardData {
  teacher: { id: string; nickname: string; role: string };
  classes: TeacherClassCard[];
  totals: { students: number; assignments: number };
}

export async function getTeacherDashboard(teacherId: string): Promise<TeacherDashboardData> {
  const teacher = await db.user.findUnique({
    where: { id: teacherId },
    select: { id: true, nickname: true, role: true },
  });
  if (!teacher) throw new Error("teacher not found");

  const classes = await db.classRoom.findMany({
    where: { teacherId },
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { members: true, assignments: true } },
    },
  });

  return {
    teacher,
    classes: classes.map((c) => ({
      id: c.id,
      name: c.name,
      code: c.code,
      grade: c.grade,
      major: c.major,
      memberCount: c._count.members,
      assignmentCount: c._count.assignments,
      createdAt: c.createdAt,
    })),
    totals: {
      students: classes.reduce((acc, c) => acc + c._count.members, 0),
      assignments: classes.reduce((acc, c) => acc + c._count.assignments, 0),
    },
  };
}

// ---------- جزئیات کلاس ----------

export interface ClassMemberRow {
  studentId: string;
  username: string | null;
  nickname: string;
  avatarUrl: string | null;
  joinedAt: Date;
  completedSessions: number;
  attempts: number;
  avgScore: number | null;
  lastActivityAt: Date | null;
}

export interface ClassAssignmentRow {
  id: string;
  title: string;
  subjectTitle: string;
  subjectId: string;
  questionCount: number;
  dueAt: Date | null;
  createdAt: Date;
  completions: Array<{ studentId: string; nickname: string; score: number | null; completedAt: Date }>;
}

export interface TeacherClassDetailData {
  klass: {
    id: string;
    name: string;
    code: string;
    grade: string;
    major: string;
    createdAt: Date;
  };
  members: ClassMemberRow[];
  assignments: ClassAssignmentRow[];
  assignableSubjects: Array<{ id: string; title: string; grade: string; major: string | null }>;
}

export async function getTeacherClassDetail(classId: string): Promise<TeacherClassDetailData | null> {
  const klass = await db.classRoom.findUnique({
    where: { id: classId },
    include: { _count: { select: { members: true } } },
  });
  if (!klass) return null;

  const memberships = await db.classMember.findMany({
    where: { classId },
    orderBy: { joinedAt: "asc" },
    include: { student: { select: { id: true, username: true, nickname: true, avatarUrl: true } } },
  });
  const studentIds = memberships.map((m) => m.studentId);

  // آمار هر دانش‌آموز: جلسات کامل، پاسخ‌ها، میانگین نمره، آخرین فعالیت
  const [sessionAgg, attemptAgg] = await Promise.all([
    studentIds.length
      ? db.session.groupBy({
          by: ["userId"],
          where: { userId: { in: studentIds }, status: "COMPLETED" },
          _count: { _all: true },
          _avg: { score: true },
          _max: { lastActivityAt: true },
        })
      : Promise.resolve([]),
    studentIds.length
      ? db.attempt.groupBy({
          by: ["userId"],
          where: { userId: { in: studentIds } },
          _count: { _all: true },
        })
      : Promise.resolve([]),
  ]);
  const sessionByUser = new Map(sessionAgg.map((s) => [s.userId, s] as const));
  const attemptByUser = new Map(attemptAgg.map((a) => [a.userId, a._count._all] as const));

  const members: ClassMemberRow[] = memberships.map((m) => {
    const agg = sessionByUser.get(m.studentId);
    return {
      studentId: m.studentId,
      username: m.student.username,
      nickname: m.student.nickname,
      avatarUrl: m.student.avatarUrl,
      joinedAt: m.joinedAt,
      completedSessions: agg?._count._all ?? 0,
      attempts: attemptByUser.get(m.studentId) ?? 0,
      avgScore: agg?._avg.score ?? null,
      lastActivityAt: agg?._max.lastActivityAt ?? null,
    };
  });

  const assignments = await db.assignment.findMany({
    where: { classId },
    orderBy: { createdAt: "desc" },
    include: {
      subject: { select: { id: true, title: true } },
      completions: {
        include: { student: { select: { id: true, nickname: true } } },
        orderBy: { completedAt: "asc" },
      },
    },
  });

  // درس‌های قابل تمرین برای همین کوهورت کلاس (پایه برابر + عمومی/مشترک شامل رشتهٔ کلاس + بانک سؤال فعال)
  const assignableSubjects = await db.subject.findMany({
    where: {
      isActive: true,
      grade: klass.grade,
      OR: [{ major: null }, { major: { contains: klass.major } }],
      questions: { some: { status: "APPROVED" } },
    },
    orderBy: { title: "asc" },
    select: { id: true, title: true, grade: true, major: true },
  });

  return {
    klass: {
      id: klass.id,
      name: klass.name,
      code: klass.code,
      grade: klass.grade,
      major: klass.major,
      createdAt: klass.createdAt,
    },
    members,
    assignments: assignments.map((a) => ({
      id: a.id,
      title: a.title,
      subjectTitle: a.subject.title,
      subjectId: a.subjectId,
      questionCount: a.questionCount,
      dueAt: a.dueAt,
      createdAt: a.createdAt,
      completions: a.completions.map((c) => ({
        studentId: c.student.id,
        nickname: c.student.nickname,
        score: c.score,
        completedAt: c.completedAt,
      })),
    })),
    assignableSubjects,
  };
}
