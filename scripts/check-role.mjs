import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const u = await db.user.findFirst({ where: { username: "mina_math" }, select: { nickname: true, role: true, isActive: true } });
console.log(`mina: role=${u.role} active=${u.isActive}`);
await db.$disconnect();
