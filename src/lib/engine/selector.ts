// ============================================================
// انتخاب سؤال سه‌لایه — پورت TypeScript عیناً از core/selector.py
// لایه ۱: ناحیه هدف ۰٫۶۵–۰٫۷۵ | لایه ۲: بیشترین ارزش آموزشی
// لایه ۳: حذف سؤال‌های دیده‌شده در ۲۰ پاسخ اخیر
// ============================================================

import { expectedSuccess } from "./elo";

export const TARGET = 0.7;
export const ZONE_LOW = 0.65;
export const ZONE_HIGH = 0.75;
export const EXPOSURE_WINDOW = 20; // پنجره مواجهه (گپ G8)
export const W_WEAKNESS = 0.5;
export const W_IMPORTANCE = 0.3;
export const W_RECENCY = 0.2;

export interface Candidate {
  id: string;
  rQuestion: number;
  weakness: number; // ۰ تا ۱ — ضعف دسته
  importance: number; // ۰ تا ۱ — اهمیت مبحث
  recency: number; // ۰ تا ۱ — تازگی (۱ = مدت‌ها پرسیده نشده)
}

/** ارزش آموزشی V(q) = ۰٫۵·ضعف + ۰٫۳·اهمیت + ۰٫۲·تازگی */
export function educationalValue(weakness: number, importance: number, recency: number): number {
  return W_WEAKNESS * weakness + W_IMPORTANCE * importance + W_RECENCY * recency;
}

/**
 * بهترین سؤال بعدی را برمی‌گرداند؛ بانک خالی ← null.
 * recentQuestionIds: شناسه سؤال‌های ۲۰ پاسخ آخر (کهنه‌ترین اول).
 */
export function selectQuestion(
  rStudent: number,
  candidates: Candidate[],
  recentQuestionIds: string[],
): Candidate | null {
  // لایه ۳ — محدودیت مواجهه
  const seen = new Set(recentQuestionIds.slice(-EXPOSURE_WINDOW));
  const pool = candidates.filter((c) => !seen.has(c.id));
  if (pool.length === 0) return null;

  // لایه ۱ — ناحیه هدف (فال‌بک: نزدیک‌ترین به ۰٫۷۰)
  const withE = pool.map((c) => ({ ...c, e: expectedSuccess(rStudent, c.rQuestion) }));
  const zone = withE.filter((c) => c.e >= ZONE_LOW && c.e <= ZONE_HIGH);
  if (zone.length === 0) {
    return withE.reduce((best, c) => (Math.abs(c.e - TARGET) < Math.abs(best.e - TARGET) ? c : best));
  }

  // لایه ۲ — بیشترین ارزش آموزشی
  return zone.reduce((best, c) =>
    educationalValue(c.weakness, c.importance, c.recency) >
    educationalValue(best.weakness, best.importance, best.recency)
      ? c
      : best,
  );
}
