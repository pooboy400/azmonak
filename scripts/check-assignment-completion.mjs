import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const rows = await db.assignmentCompletion.findMany({
  where: { isSample: false },
  include: { assignment: { select: { title: true } }, student: { select: { nickname: true } } },
});
for (const c of rows) console.log(`NON-SAMPLE completion: ${c.student.nickname} — ${c.assignment.title} — score=${c.score}`);
const asg = await db.assignment.findMany({ include: { _count: { select: { completions: true } } } });
for (const a of asg) console.log(`assignment: ${a.title} — completions=${a._count.completions}`);
await db.$disconnect();
