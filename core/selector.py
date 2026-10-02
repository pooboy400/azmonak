"""انتخاب سؤال سه‌لایه — ناحیه هدف، ارزش آموزشی، محدودیت مواجهه.

لایه ۱: فقط سؤال‌هایی که شانس موفقیت در بازه ۰٫۶۵ تا ۰٫۷۵ دارند.
لایه ۲: بین آن‌ها، سؤال با بیشترین ارزش آموزشی (ضعف + اهمیت + تازگی).
لایه ۳: سؤال دیده‌شده در ۲۰ پاسخ اخیر حذف می‌شود.
"""

from .elo import expected_success

# --- دستگیره‌های قابل تنظیم ---
TARGET = 0.70                    # میانه ناحیه هدف
ZONE_LOW, ZONE_HIGH = 0.65, 0.75 # ناحیه هدف (پیوست الف)
EXPOSURE_WINDOW = 20             # پنجره مواجهه (گپ G8)
W_WEAKNESS = 0.5                 # وزن ضعف دسته در ارزش آموزشی
W_IMPORTANCE = 0.3               # وزن اهمیت مبحث
W_RECENCY = 0.2                  # وزن تازگی (مباحث رهاشده بالا می‌آیند)


def educational_value(
    weakness: float, importance: float, recency: float
) -> float:
    """امتیاز ارزش آموزشی V(q) = ۰٫۵·ضعف + ۰٫۳·اهمیت + ۰٫۲·تازگی.

    هر سه ورودی بین ۰ و ۱ هستند؛ وزن‌ها پیش‌فرض مهندسی و قابل وتو است.
    """
    return W_WEAKNESS * weakness + W_IMPORTANCE * importance + W_RECENCY * recency


def select_question(
    r_student: float,
    candidates: list[dict],
    recent_question_ids: list[int],
) -> dict | None:
    """بهترین سؤال بعدی را برمی‌گرداند.

    Args:
        r_student: توان فعلی دانش‌آموز.
        candidates: هر آیتم شامل id، r_question، weakness، importance، recency.
        recent_question_ids: شناسه سؤال‌های ۲۰ پاسخ آخر (کهترین اول).
    Returns:
        آیتم انتخاب‌شده، یا None اگر بانک خالی باشد.
    """
    # لایه ۳ — محدودیت مواجهه: دیده‌شده‌های اخیر از کاندیدها حذف
    seen = set(recent_question_ids[-EXPOSURE_WINDOW:])
    pool = [c for c in candidates if c["id"] not in seen]
    if not pool:
        return None

    # لایه ۱ — ناحیه هدف ۰٫۶۵ تا ۰٫۷۵ (فال‌بک: نزدیک‌ترین به ۰٫۷۰)
    for c in pool:
        c["e"] = expected_success(r_student, c["r_question"])
    zone = [c for c in pool if ZONE_LOW <= c["e"] <= ZONE_HIGH]
    if not zone:
        return min(pool, key=lambda c: abs(c["e"] - TARGET))

    # لایه ۲ — بیشترین ارزش آموزشی
    for c in zone:
        c["value"] = educational_value(c["weakness"], c["importance"], c["recency"])
    return max(zone, key=lambda c: c["value"])
