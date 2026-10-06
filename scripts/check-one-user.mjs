import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const phone = process.argv[2];
const u = await db.user.findFirst({ where: { identity: { phone } }, include: { identity: true } });
console.log(u ? `EXISTS: @${u.username} «${u.nickname}»` : "FREE");
await db.$disconnect();
