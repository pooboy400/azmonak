import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const s = await db.session.findUnique({ where: { id: "cmuy6ur9d001ygfrqcefff4we" } });
console.log("review session:", s ? `${s.type} ${s.status} attempts=${s.correctCount}/${s.questionCount}` : "GONE");
const s2 = await db.session.findUnique({ where: { id: "cmuy6qnf30001gfrq3lwjr5ve" } });
console.log("assignment session:", s2 ? `${s2.type} ${s2.status} score=${s2.score} assignmentId=${s2.assignmentId}` : "GONE");
await db.$disconnect();
