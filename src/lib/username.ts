// ============================================================
// قواعد آیدی کاربر (تلگرام‌مانند) — مشترک بین سرور و کلاینت
// آیدی یکتا برای جست‌وجوی افراد؛ لقب (نام نمایشی) جدا و غیریکتاست.
// ============================================================

export const USERNAME_MIN = 4;
export const USERNAME_MAX = 24;

// با حرف کوچک انگلیسی شروع می‌شود، ادامه با حرف/عدد/زیرخط؛ به _ ختم نمی‌شود
export const USERNAME_REGEX = /^[a-z][a-z0-9_]{2,22}[a-z0-9]$/;

/** آیدی‌های رزروشده که به کاربر داده نمی‌شود */
export const RESERVED_USERNAMES = new Set([
  "admin", "administrator", "moderator", "mod", "support", "help", "root",
  "system", "official", "azmoonak", "teacher", "teachers", "student", "students",
  "null", "undefined", "login", "signup", "profile", "api", "u", "me", "about",
]);

/** پاک‌سازی ورودی: حذف @ ابتدایی، فاصله‌ها، تبدیل به حروف کوچک */
export function normalizeUsername(raw: string): string {
  return (raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/[\s\u200c]+/g, "");
}

export type UsernameValidation =
  | { ok: true; username: string }
  | { ok: false; message: string };

/** اعتبارسنجی کامل آیدی — پیام‌ها فارسی و نمایشی است */
export function validateUsername(raw: string): UsernameValidation {
  const username = normalizeUsername(raw);
  if (!username) return { ok: false, message: "آیدی را وارد کن." };
  if (username.length < USERNAME_MIN) {
    return { ok: false, message: `آیدی حداقل ${USERNAME_MIN} نویسه است.` };
  }
  if (username.length > USERNAME_MAX) {
    return { ok: false, message: `آیدی حداکثر ${USERNAME_MAX} نویسه است.` };
  }
  if (!/^[a-z]/.test(username)) {
    return { ok: false, message: "آیدی باید با حرف انگلیسی شروع شود." };
  }
  if (!USERNAME_REGEX.test(username)) {
    return { ok: false, message: "آیدی فقط حروف انگلیسی کوچک، عدد و زیرخط (_) می‌پذیرد." };
  }
  if (RESERVED_USERNAMES.has(username)) {
    return { ok: false, message: "این آیدی رزرو شده است — دیگری انتخاب کن." };
  }
  return { ok: true, username };
}
