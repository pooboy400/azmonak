// Read-only DB evidence: real algorithm output rows
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
try {
  const attempts = await db.attempt.count();
  const sa = await db.subjectAbility.count();
  const ta = await db.topicAbility.count();
  const sessions = await db.session.count();
  console.log(JSON.stringify({ attempts, subjectAbility: sa, topicAbility: ta, sessions }));
  // آخرین تلاش‌ها: رتبینگ قبل/بعد Elo، وزن، اطمینان
  const last = await db.attempt.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { orderInSession: true, isCorrect: true, confidence: true, weight: true, rBefore: true, rAfter: true, latencySec: true },
  });
  console.log("last attempts:", JSON.stringify(last, null, 1));
  // نردبان: یک نمونه TopicAbility با استریک/سطح
  const ladder = await db.topicAbility.findFirst({ orderBy: { updatedAt: "desc" }, select: { level: true, rightStreak: true, wrongStreak: true, answeredCount: true, weaknessCount: true } });
  console.log("ladder state:", JSON.stringify(ladder));
} finally {
  await db.$disconnect();
}
