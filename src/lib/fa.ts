// قالب‌بندی اعداد و درصدها با ارقام فارسی — مشترک پورتال و سایت عمومی

export function faNum(n: number, digits = 0): string {
  return n.toLocaleString("fa-IR", { maximumFractionDigits: digits });
}

export function faRating(n: number): string {
  return Math.round(n).toLocaleString("fa-IR");
}

/** امتیاز با یک رقم اعشار فارسی — مثل ۹۵٫۲ */
export function faScore(n: number, digits = 1): string {
  return n.toLocaleString("fa-IR", { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

/** ثانیه → mm:ss فارسی */
export function faDuration(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = Math.floor(totalSec % 60);
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${faNum(m)}:${pad(s).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)])}`;
}
