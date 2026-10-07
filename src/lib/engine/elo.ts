// ============================================================
// موتور Elo آزمونک — پورت TypeScript عیناً از core/elo.py
// مرجع پارامترها: پیوست الف سند توسعه v1.3
// ============================================================

export const K_STUDENT_START = 32; // K دانش‌آموز در شروع
export const K_QUESTION_START = 8; // K سؤال در شروع
export const D_SCALE = 400.0; // هر ۴۰۰ امتیاز = شانس ۱۰ برابر

/** شانس درست‌زدن دانش‌آموز روی سؤال — فرمول لجستیک Elo (خروجی ۰ تا ۱). */
export function expectedSuccess(rStudent: number, rQuestion: number): number {
  return 1.0 / (1.0 + Math.pow(10.0, (rQuestion - rStudent) / D_SCALE));
}

/** K متغیر دانش‌آموز: تا ۵۰ پاسخ ← ۳۲؛ تا ۱۵۰ ← ۲۴؛ بعد از آن ← ۱۶. */
export function kStudent(totalAnswers: number): number {
  if (totalAnswers < 50) return 32;
  if (totalAnswers < 150) return 24;
  return 16;
}

/** K متغیر سؤال: تا ۴۰ پاسخ ← ۸؛ بعد از آن ← ۴. */
export function kQuestion(totalAnswers: number): number {
  return totalAnswers < 40 ? K_QUESTION_START : 4;
}

/** آپدیت دوطرفه پس از یک پاسخ. خروجی: توان جدید دانش‌آموز، سختی جدید سؤال، انتظار E پیش از پاسخ. */
export function applyResult(
  rStudent: number,
  rQuestion: number,
  correct: boolean,
  kS: number = K_STUDENT_START,
  kQ: number = K_QUESTION_START,
): { newStudent: number; newQuestion: number; e: number } {
  const e = expectedSuccess(rStudent, rQuestion);
  const s = correct ? 1.0 : 0.0;
  return {
    newStudent: rStudent + kS * (s - e),
    newQuestion: rQuestion + kQ * (e - s),
    e,
  };
}
