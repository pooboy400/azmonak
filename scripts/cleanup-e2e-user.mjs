// Cleanup: remove E2E test user by phone
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const phone = process.argv[2];
const u = await db.user.findFirst({ where: { identity: { phone } } });
if (u) { await db.user.delete({ where: { id: u.id } }); console.log("deleted:", u.id); }
else console.log("not found");
await db.$disconnect();
