import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const users = await db.user.findMany({
  where: { identity: { isNot: null } },
  select: { id: true, username: true, identity: { select: { phone: true } }, _count: { select: { sessions: true, attempts: true, forumQuestions: true } } },
  orderBy: { attempts: { _count: "desc" } },
  take: 8,
});
for (const u of users) console.log(u.identity?.phone, u.username, "| attempts:", u._count.attempts, "sessions:", u._count.sessions, "forumQ:", u._count.forumQuestions);
await db.$disconnect();
