// Read-only: check identity state of users
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const users = await db.user.findMany({
  orderBy: { createdAt: "desc" },
  take: 8,
  select: { username: true, nickname: true, grade: true, major: true, identity: { select: { phone: true } }, _count: { select: { attempts: true, sessions: true } } },
});
for (const u of users) console.log(`${u.identity?.phone ?? "(no identity)"}  @${u.username ?? "—"}  «${u.nickname}»  ${u.grade ?? "-"}/${u.major ?? "-"}  attempts=${u._count.attempts} answers=${u._count.answers}`);
console.log("total users:", await db.user.count());
await db.$disconnect();
