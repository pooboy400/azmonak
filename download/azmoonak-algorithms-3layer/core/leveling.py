"""نردبان سطح دسته‌ای (D16) — سه لیگ برای هر دسته سؤال.

به‌جای موتور بدفهمی (وتوی پویا در D16): هر دسته یک سطح ۱ تا ۳ دارد.
دو غلط پیاپی ← سقوط؛ دو درست پیاپی ← ارتقا (حداکثر یک بار در هر جلسه)؛
سطح ۱ با موفقیت کمتر از ۳۰٪ در ۵ پاسخ آخر ← بنر «مطالعه کن».
"""

# --- دستگیره‌های قابل تنظیم ---
DROP_STREAK = 2            # n: غلط پیاپی لازم برای سقوط
RISE_STREAK = 2            # m: درست پیاپی لازم برای ارتقا
MIN_LEVEL, MAX_LEVEL = 1, 3
LEVEL_BANDS = {1: 1150, 2: 1250, 3: 1350}   # نوار سختی هر سطح
STUDY_ALERT_SUCCESS = 0.30  # آستانه بنر مطالعه
ALERT_WINDOW = 5            # پنجره محاسبه موفقیت اخیر
START_LEVEL = 2             # شروع هر دسته از سطح میانی (پیش‌فرض مهندسی، قابل وتو)


class CategoryLadder:
    """وضعیت نردبان یک دسته برای یک دانش‌آموز."""

    def __init__(self, category: str) -> None:
        self.category = category
        self.level = START_LEVEL
        self.wrong_streak = 0     # شمارنده غلط پیاپی
        self.right_streak = 0     # شمارنده درست پیاپی
        self.weakness_counter = 0  # در کف سطح ۱: تعداد بار افت بی‌اثر
        self.promoted_this_session = False
        self.recent: list[bool] = []   # پنجره ۵ پاسخ آخر
        self.alert = False

    def difficulty_band(self) -> float:
        """نوار سختی Elo این سطح — ورودی فیلتر انتخاب سؤال."""
        return LEVEL_BANDS[self.level]

    def record(self, correct: bool) -> dict:
        """ثبت یک پاسخ و به‌روزرسانی سطح. خروجی: گزارش رویداد."""
        event = {"moved": False, "direction": None, "alert": False}
        self.recent.append(correct)
        self.recent = self.recent[-ALERT_WINDOW:]

        if correct:
            self.right_streak += 1
            self.wrong_streak = 0
            if (
                self.right_streak >= RISE_STREAK
                and self.level < MAX_LEVEL
                and not self.promoted_this_session   # حداکثر یک ارتقا در جلسه
            ):
                self.level += 1
                self.right_streak = 0
                self.promoted_this_session = True
                event.update(moved=True, direction="up")
        else:
            self.wrong_streak += 1
            self.right_streak = 0
            if self.wrong_streak >= DROP_STREAK:
                self.wrong_streak = 0
                if self.level > MIN_LEVEL:
                    self.level -= 1
                    self.promoted_this_session = False   # ارتقای جلسه مصرف شد
                    event.update(moved=True, direction="down")
                else:
                    self.weakness_counter += 1   # در کف: ضعف ثبت می‌شود

        # بنر مطالعه: سطح ۱ + موفقیت زیر ۳۰٪ در ۵ پاسخ آخر
        if self.level == MIN_LEVEL and len(self.recent) == ALERT_WINDOW:
            rate = sum(self.recent) / len(self.recent)
            self.alert = rate < STUDY_ALERT_SUCCESS
            event["alert"] = self.alert
        return event
