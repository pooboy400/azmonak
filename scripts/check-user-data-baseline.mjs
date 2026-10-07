// baseline کاربر برای تست «خروج = فقط بستن نشست» — شمارش همهٔ داده‌های وابسته
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const phone = process.argv[2];
const user = await db.user.findFirst({
  where: { identity: { phone } },
  select: {
    id: true, username: true, nickname: true,
    _count: { select: { sessions: true, attempts: true, subjectAbilities: true, topicAbilities: true, reviewSchedules: true, forumQuestions: true, forumAnswers: true, assignmentCompletions: true, friendshipsRequested: true, friendshipsReceived: true } },
  },
});
if (!user) { console.log("NO_USER"); process.exit(0); }
const otps = await db.otpCode.count({ where: { phone } });
console.log(JSON.stringify({ username: user.username, nickname: user.nickname, ...user._count, otpRows: otps }, null, 0));
await db.$disconnect();
