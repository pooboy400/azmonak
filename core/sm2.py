"""SM-2 آزمونک — مرور فاصله‌دار با کیفیت سه‌سیگنالی.

q از سه سیگنال ساخته می‌شود: درستی، اعتماد (D14) و تأخیر (D10).
فواصل مرور: اول ۱ روز، بعد ۶ روز، بعد ضرب در EF — تا سؤال سر موعدش برگردد.
"""

# --- دستگیره‌های قابل تنظیم ---
EF_START = 2.5      # آسانی نسبی اولیه
EF_FLOOR = 1.3      # کف EF — هرگز زیر آن نمی‌رود (پیوست الف)
T_FAST = 15         # ثانیه؛ زیر آن: حدس رفلکسی (سقف q=۴)
T_SLOW = 70         # ثانیه؛ بالای آن: سخت به جواب رسیده (−۰٫۵ از q)
BASE_CORRECT = 4.0  # q پایه برای پاسخ درست
BASE_WRONG = 2.0    # q پایه برای پاسخ غلط (زیر ۳ ← ریست فاصله)
CONFIDENT_BONUS = 1.0  # «مطمئن بودم» +۱
GUESS_CAP = 4.0     # سقف q برای «حدس می‌زدم ولی درست»


def quality(
    correct: bool,
    confident: bool | None,
    elapsed_sec: float,
) -> float:
    """محاسبه کیفیت q بین ۰ تا ۵ از سه سیگنال پاسخ.

    Args:
        correct: آیا پاسخ درست بود؟
        confident: دکمه اعتماد D14 — True=مطمئن بودم، False=حدس می‌زدم.
        elapsed_sec: ثانیه‌های صرف‌شده روی سؤال.
    Returns:
        q نهایی (عدد اعشاری ۰ تا ۵).
    """
    q = BASE_CORRECT if correct else BASE_WRONG

    if confident is True:
        q = min(5.0, q + CONFIDENT_BONUS)
    elif confident is False and correct:
        q = min(q, GUESS_CAP)   # حدسِ درست، حافظه واقعی قوی‌تری نشان نمی‌دهد

    if elapsed_sec < T_FAST:
        q = min(q, 4.0)         # پاسخ آنی مشکوک به حدس رفلکسی
    elif elapsed_sec > T_SLOW:
        q -= 0.5                # تلاش طولانی = یادگیری متزلزل‌تر

    return max(0.0, min(5.0, q))


def update_ef(ease_factor: float, q: float) -> float:
    """قانون آپدیت EF: EF' = EF + 0.1 − d·0.08 − d²·0.02 که d = 5 − q.

    نکته زیبا: در q=۴، d=۱ پس EF دست‌نخورده می‌ماند؛ در q=۵ فقط +۰٫۱ و
    هرچه q بدتر شود جریمه درجه‌دو سنگین‌تر. کف ۱٫۳ رعایت می‌شود.
    """
    d = 5.0 - q
    new_ef = ease_factor + 0.1 - d * 0.08 - d * d * 0.02
    return max(EF_FLOOR, new_ef)


def next_interval(
    repetition: int, ease_factor: float, q: float, previous_interval: int = 0
) -> int:
    """فاصله مرور بعدی برحسب روز.

    q < ۳ ← ریست به ۱ روز (آیتم دوباره از صفر). وگرنه:
    تکرار اول ← ۱ روز، تکرار دوم ← ۶ روز، بعدی‌ها ← فاصله قبلی × EF.
    """
    if q < 3.0:
        return 1
    if repetition <= 1:
        return 1
    if repetition == 2:
        return 6
    return max(1, round(previous_interval * ease_factor))
