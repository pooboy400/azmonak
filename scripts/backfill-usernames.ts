// ============================================================
// backfill-usernames — یک‌بارمصرف
// بعد از افزودن فیلد username (یکتا، nullable) به User، کاربران موجود
// که آیدی ندارند با قاعدهٔ زیر آیدی می‌گیرند:
//   1) کاربران نمونه: نگاشت دستی (همان که در seed-data-people.ts است)
//   2) بقیه: u + شمارهٔ موبایل بدون صفر اول (مثل u9123334455)
//   3) تداخل: پسوند عددی
// اجرا: bun scripts/backfill-usernames.ts
// ============================================================

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// نگاشت دستی کاربران نمونه (smpu01..24 + smpt01..02) — هماهنگ با seed-data-people.ts
const SAMPLE_MAP: Record<string, string> = {
  smpu01: "dorsa_zisti", smpu02: "arash_physics", smpu03: "mina_math", smpu04: "kian_hafez",
  smpu05: "negar_aseman", smpu06: "saman_saye", smpu07: "tara_motale", smpu08: "parsa_porkar",
  smpu09: "raha_serbala", smpu10: "shiva_shabkhan", smpu11: "amir_emtahan", smpu12: "dorna_sepid",
  smpu13: "behnam_benevis", smpu14: "sepide_setare", smpu15: "farzad_faratr", smpu16: "negin_neveshtar",
  smpu17: "ava_arkhemides", smpu18: "hirad_hooshmand", smpu19: "mahsa_mashough", smpu20: "navid_namune",
  smpu21: "aria_entegral", smpu22: "elna_logaritm", smpu23: "matin_moshtagh", smpu24: "sara_sigma",
  smpt01: "farshad_kaviani", smpt02: "leila_mousavi",
};

const VALID = /^[a-z][a-z0-9_]{2,22}[a-z0-9]$/;

async function main() {
  const users = await db.user.findMany({ where: { username: null }, include: { identity: true } });
  if (users.length === 0) {
    console.log("هیچ کاربر بدون آیدی نیست.");
    return;
  }
  let count = 0;
  for (const u of users) {
    let base = SAMPLE_MAP[u.id] ?? "";
    if (!base) {
      const phone = u.identity?.phone ?? "";
      const candidate = `u${phone.replace(/\D/g, "").replace(/^0/, "")}`;
      if (VALID.test(candidate)) base = candidate;
      else base = `user_${u.id.slice(-8).toLowerCase().replace(/[^a-z0-9]/g, "")}`;
      if (!VALID.test(base)) base = `user${Math.abs(hashCode(u.id)) % 100000}`.padEnd(4, "0");
    }
    // تضمین یکتایی با پسوند عددی
    let candidate = base;
    let i = 1;
    while (await db.user.findUnique({ where: { username: candidate } })) {
      candidate = `${base}${i++}`;
    }
    await db.user.update({ where: { id: u.id }, data: { username: candidate } });
    console.log(`  ${u.nickname} → @${candidate}`);
    count++;
  }
  console.log(`آیدی به ${count} کاربر اختصاص یافت.`);
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

main().finally(() => db.$disconnect());
