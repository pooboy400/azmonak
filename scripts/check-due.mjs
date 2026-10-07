import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const now = new Date();
const u = await db.user.findFirst({ where: { username: "mina_math" } });
const rows = await db.reviewSchedule.findMany({
  where: { userId: u.id },
  include: { topic: { select: { title: true } }, subject: { select: { title: true } } },
});
for (const r of rows) {
  const due = r.dueAt <= now;
  console.log(`${r.subject.title} | ${r.topic.title} | dueAt=${r.dueAt.toISOString()} | ${due ? "DUE" : "future"}`);
}
await db.$disconnect();
