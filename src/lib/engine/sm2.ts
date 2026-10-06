// ============================================================
// SM-2 آزمونک — پورت TypeScript عیناً از core/sm2.py
// کیفیت سه‌سیگنالی: درستی + اعتماد (D14) + تأخیر (D10)
// فواصل مرور: اول ۱ روز، بعد ۶ روز، بعد ضرب در EF
// ============================================================

export const EF_START = 2.5;
export const EF_FLOOR = 1.3;
export const T_FAST = 15; // ثانیه؛ زیر آن: حدس رفلکسی (سقف q=۴)
export const T_SLOW = 70; // ثانیه؛ بالای آن: سخت به جواب رسیده (−۰٫۵)
export const BASE_CORRECT = 4.0;
export const BASE_WRONG = 2.0;
export const CONFIDENT_BONUS = 1.0;
export const GUESS_CAP = 4.0;

/**
 * کیفیت q بین ۰ تا ۵ از سه سیگنال پاسخ.
 * confident: true=مطمئن بودم، false=حدس می‌زدم، null=بدون اظهار (جایابی)
 */
export function quality(correct: boolean, confident: boolean | null, elapsedSec: number): number {
  let q = correct ? BASE_CORRECT : BASE_WRONG;

  if (confident === true) {
    q = Math.min(5.0, q + CONFIDENT_BONUS);
  } else if (confident === false && correct) {
    q = Math.min(q, GUESS_CAP); // حدسِ درست، حافظه واقعی قوی‌تری نشان نمی‌دهد
  }

  if (elapsedSec < T_FAST) {
    q = Math.min(q, 4.0); // پاسخ آنی مشکوک به حدس رفلکسی
  } else if (elapsedSec > T_SLOW) {
    q -= 0.5; // تلاش طولانی = یادگیری متزلزل‌تر
  }

  return Math.max(0.0, Math.min(5.0, q));
}

/** قانون آپدیت EF: EF' = EF + 0.1 − d·0.08 − d²·0.02 که d = 5 − q (کف ۱٫۳). */
export function updateEf(easeFactor: number, q: number): number {
  const d = 5.0 - q;
  return Math.max(EF_FLOOR, easeFactor + 0.1 - d * 0.08 - d * d * 0.02);
}

/** فاصله مرور بعدی برحسب روز: q<۳ ← ریست ۱ روز؛ سپس ۱، ۶، قبلی×EF. */
export function nextInterval(repetition: number, easeFactor: number, q: number, previousInterval = 0): number {
  if (q < 3.0) return 1;
  if (repetition <= 1) return 1;
  if (repetition === 2) return 6;
  return Math.max(1, Math.round(previousInterval * easeFactor));
}
