import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const now = new Date();
const due = await db.reviewSchedule.findMany({
  where: { dueAt: { lte: now } },
  include: { user: { select: { username: true, nickname: true } }, subject: { select: { title: true } }, topic: { select: { title: true } } },
  take: 20,
});
const byUser = new Map();
for (const d of due) {
  const k = d.user.username;
  if (!byUser.has(k)) byUser.set(k, { nickname: d.user.nickname, subjects: new Map() });
  const s = byUser.get(k).subjects;
  if (!s.has(d.subject.title)) s.set(d.subject.title, []);
  s.get(d.subject.title).push(d.topic.title);
}
for (const [k, v] of byUser) {
  for (const [subj, topics] of v.subjects) console.log(`${k} (${v.nickname}) — ${subj}: ${topics.length} مبحث سرموعد`);
}
await db.$disconnect();
