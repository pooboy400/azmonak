// Read-only verification of the seeded sample data.
// Runs the SAME query shapes the future pages will run (leaderboards,
// profile trend, review queue) and prints a human-readable report.
// Run: bun prisma/verify-sample.ts

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// Iran week starts Saturday
function startOfWeek(now: Date): Date {
  const d = new Date(now);
  const day = d.getUTCDay(); // 0=Sun ... 6=Sat
  const daysSinceSat = (day + 1) % 7;
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - daysSinceSat);
  return d;
}

async function main() {
  const now = new Date();
  const weekStart = startOfWeek(now);

  console.log("=== 1) session status breakdown ===");
  const statusRows = await db.session.groupBy({ by: ["type", "status"], _count: true });
  for (const r of statusRows) console.log(`  ${r.type}/${r.status}: ${r._count}`);

  console.log("\n=== 2) weekly leaderboard — فارسی ۳ / یازدهم تجربی (subject × major × grade) ===");
  const far11t = await db.subject.findFirst({ where: { code: "FAR11T" } });
  if (far11t) {
    const sessions = await db.session.findMany({
      where: {
        subjectId: far11t.id,
        status: "COMPLETED",
        type: "PRACTICE",
        startedAt: { gte: weekStart },
      },
      select: { userId: true, score: true },
    });
    const agg = new Map<string, { total: number; n: number }>();
    for (const s of sessions) {
      if (s.score === null) continue;
      const a = agg.get(s.userId) ?? { total: 0, n: 0 };
      a.total += s.score;
      a.n += 1;
      agg.set(s.userId, a);
    }
    const rows = [...agg.entries()]
      .filter(([, a]) => a.n >= 2) // min-sessions rule
      .map(([userId, a]) => ({ userId, avg: a.total / a.n, n: a.n }));
    rows.sort((x, y) => y.avg - x.avg);
    const users = await db.user.findMany({ where: { id: { in: rows.map((r) => r.userId) } } });
    const uMap = new Map(users.map((u) => [u.id, u]));
    console.log(`  (week since ${weekStart.toISOString()}, eligible: ${rows.length})`);
    rows.slice(0, 8).forEach((r, i) => {
      const u = uMap.get(r.userId)!;
      console.log(`  ${i + 1}. ${u.avatarUrl ?? "(placeholder)"} ${u.nickname} — میانگین ${r.avg.toFixed(1)} (${r.n} جلسه)`);
    });
  }

  console.log("\n=== 3) overall leaderboard — یازدهم تجربی (per major × grade) ===");
  const sessions = await db.session.findMany({
    where: { status: "COMPLETED", type: "PRACTICE", startedAt: { gte: weekStart } },
    select: { score: true, user: { select: { nickname: true, avatarUrl: true, grade: true, major: true, privacy: true } } },
  });
  const byCohort = new Map<string, Map<string, { total: number; n: number; u: (typeof sessions)[0]["user"] }>>();
  for (const s of sessions) {
    if (s.score === null) continue;
    if (s.user.privacy === "PRIVATE") continue; // leaderboard opt-out (G10)
    const key = `${s.user.grade}/${s.user.major}`;
    const inner = byCohort.get(key) ?? new Map();
    const a = inner.get(s.user.nickname) ?? { total: 0, n: 0, u: s.user };
    a.total += s.score;
    a.n += 1;
    inner.set(s.user.nickname, a);
    byCohort.set(key, inner);
  }
  for (const [cohort, inner] of byCohort) {
    const rows = [...inner.values()].filter((a) => a.n >= 2).sort((x, y) => y.total / y.n - x.total / x.n);
    console.log(`  ${cohort}: ${rows.length} eligible — top3: ${rows.slice(0, 3).map((a, i) => `${i + 1})${a.u.nickname} ${a.total / a.n | 0}`).join(" | ")}`);
  }

  console.log("\n=== 4) profile dual-line trend — درسا.زیستی on زیست‌شناسی ۳ (D15) ===");
  const dorsa = await db.user.findUnique({ where: { nickname: "درسا.زیستی" } });
  const bio = await db.subject.findFirst({ where: { code: "BIO11T" } });
  if (dorsa && bio) {
    const hist = await db.session.findMany({
      where: { userId: dorsa.id, subjectId: bio.id, status: "COMPLETED" },
      orderBy: { startedAt: "asc" },
      select: { startedAt: true, score: true, rEnd: true, type: true },
      take: 12,
    });
    for (const h of hist) {
      console.log(`  ${h.startedAt.toISOString().slice(0, 10)} ${h.type.padEnd(9)} score=${h.score?.toFixed(1) ?? "-"} rEnd=${h.rEnd?.toFixed(0) ?? "-"}`);
    }
  }

  console.log("\n=== 5) D16 ladder sample — درسا.زیستی topics on زیست‌شناسی ۳ ===");
  if (dorsa && bio) {
    const tas = await db.topicAbility.findMany({
      where: { userId: dorsa.id, subjectId: bio.id },
      include: { topic: true },
    });
    for (const t of tas) {
      console.log(`  ${t.topic.title}: سطح ${t.level} | استریک ${t.rightStreak}درست/${t.wrongStreak}غلط | ضعف=${t.weaknessCount} | پاسخ=${t.answeredCount}`);
    }
  }

  console.log("\n=== 6) review queue (SM-2) — due counts ===");
  const duePast = await db.reviewSchedule.count({ where: { dueAt: { lte: now } } });
  const dueToday = await db.reviewSchedule.count({
    where: { dueAt: { gt: now, lte: new Date(now.getTime() + 24 * 3600 * 1000) } },
  });
  const dueFuture = await db.reviewSchedule.count({ where: { dueAt: { gt: new Date(now.getTime() + 24 * 3600 * 1000) } } });
  console.log(`  overdue: ${duePast} | due in 24h: ${dueToday} | later: ${dueFuture}`);

  console.log("\n=== 7) data integrity checks ===");
  const dupInSession = await db.$queryRaw<{ n: number }[]>`
    SELECT COUNT(*) as n FROM (
      SELECT sessionId, questionId, COUNT(*) c FROM attempts GROUP BY sessionId, questionId HAVING c > 1
    )`;
  console.log(`  duplicate question within one session: ${dupInSession[0].n} (must be 0)`);
  const nonSample = await db.user.count({ where: { isSample: false } });
  console.log(`  non-sample users: ${nonSample} (0 = everything is removable sample data)`);
  const qRatings = await db.question.groupBy({ by: ["difficulty"], _count: true, _avg: { rating: true } });
  for (const q of qRatings) console.log(`  ${q.difficulty}: n=${q._count} avgRating=${q._avg.rating?.toFixed(0)}`);
  const activeSessions = await db.session.findMany({ where: { status: "ACTIVE" }, include: { user: true, subject: true } });
  for (const s of activeSessions) console.log(`  ACTIVE: ${s.user.nickname} on ${s.subject.title} (${s._count?.attempts ?? "?"} attempts → قابل ازسرگیری)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
