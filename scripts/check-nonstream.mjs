import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const ac = await db.assignmentCompletion.count({ where: { isSample: false } });
const at = await db.attempt.count({ where: { isSample: false } });
const fq = await db.forumQuestion.count({ where: { isSample: false } });
console.log(`non-sample: completions=${ac} attempts=${at} forumQ=${fq}`);
const rows = await db.assignmentCompletion.findMany({ where: { isSample: false }, include: { assignment: { select: { title: true } }, student: { select: { nickname: true } } } });
for (const c of rows) console.log(`completion: ${c.student.nickname} — ${c.assignment.title} — ${c.score}`);
await db.$disconnect();
