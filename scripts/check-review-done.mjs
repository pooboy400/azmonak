import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const s = await db.session.findUnique({ where: { id: "cmuy72lzf002jgfrqqawayy4b" } });
console.log(`review session: type=${s.type} status=${s.status} score=${s.score?.toFixed(1)} rStart=${s.rStart} rEnd=${s.rEnd} qCount=${s.questionCount}`);
const u = await db.user.findFirst({ where: { username: "arash_physics" } });
const now = new Date();
const rows = await db.reviewSchedule.findMany({ where: { userId: u.id, subjectId: s.subjectId }, include: { topic: { select: { title: true } } } });
let maxInterval = 0;
for (const r of rows) {
  maxInterval = Math.max(maxInterval, r.intervalDays);
  console.log(`${r.topic.title}: dueAt=${r.dueAt.toISOString().slice(0,10)} (${r.dueAt > now ? "future" : "DUE"}) interval=${r.intervalDays}d reps=${r.repetitions}`);
}
console.log(`max intervalDays=${maxInterval} (cap=365)`);
await db.$disconnect();
