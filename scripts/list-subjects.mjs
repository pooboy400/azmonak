import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const ss = await db.subject.findMany({ orderBy: [{ grade: "asc" }, { title: "asc" }], select: { id: true, title: true, grade: true, major: true, _count: { select: { questions: { where: { status: "APPROVED" } }, topics: true } } } });
for (const s of ss) console.log(`${s.grade} ${s.major ?? "عمومی"}  ${s.title}  topics=${s._count.topics} q=${s._count.questions}  ${s.id}`);
await db.$disconnect();
