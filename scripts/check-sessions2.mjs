import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const total = await db.session.count();
const sample = await db.session.count({ where: { isSample: true } });
const active = await db.session.findMany({ where: { status: "ACTIVE" }, select: { id: true, type: true, isSample: true, userId: true, startedAt: true }, take: 10 });
console.log(`total=${total} sample=${sample}`);
for (const s of active) console.log(`ACTIVE ${s.id} type=${s.type} sample=${s.isSample} user=${s.userId} started=${s.startedAt.toISOString()}`);
await db.$disconnect();
