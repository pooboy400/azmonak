"""موتور Elo آزمونک — رتبه‌بندی دوطرفه دانش‌آموز و سؤال.

ایده مرکزی: هر دانش‌آموز یک عدد «توان» و هر سؤال یک عدد «سختی» دارد.
پاسخ درستِ غیرمنتظره، توان را زیاد بالا می‌برد و سختی سؤال را کمی پایین می‌آورد.
(مرجع پارامترها: پیوست الف سند توسعه v1.3)
"""

# --- دستگیره‌های قابل تنظیم ---
K_STUDENT_START = 32    # K دانش‌آموز در شروع
K_QUESTION_START = 8    # K سؤال در شروع
D_SCALE = 400.0         # ثابت مقیاس لجستیک؛ هر ۴۰۰ امتیاز = شانس ۱۰ برابر


def expected_success(r_student: float, r_question: float) -> float:
    """شانس درست‌زدن دانش‌آموز روی سؤال — فرمول لجستیک Elo.

    Args:
        r_student: توان فعلی دانش‌آموز (مثلاً ۱۲۰۰).
        r_question: سختی فعلی سؤال (مثلاً ۱۳۵۰).
    Returns:
        عددی بین ۰ و ۱ (۰٫۲۹ یعنی ۲۹ درصد شانس).
    """
    return 1.0 / (1.0 + 10.0 ** ((r_question - r_student) / D_SCALE))


def k_student(total_answers: int) -> int:
    """K متغیر دانش‌آموز: شروع پرجنب‌وجوش، آرام‌شدن تدریجی.

    تا ۵۰ پاسخ ← ۳۲؛ تا ۱۵۰ پاسخ ← ۲۴؛ بعد از آن ← ۱۶.
    """
    if total_answers < 50:
        return 32
    if total_answers < 150:
        return 24
    return 16


def k_question(total_answers: int) -> int:
    """K متغیر سؤال: هر پاسخِ واحد درباره سؤال اطلاعات کمتری دارد تا درباره دانش‌آموز.

    تا ۴۰ پاسخ ← ۸؛ بعد از آن ← ۴.
    """
    return K_QUESTION_START if total_answers < 40 else 4


def apply_result(
    r_student: float,
    r_question: float,
    correct: bool,
    k_s: int = K_STUDENT_START,
    k_q: int = K_QUESTION_START,
) -> tuple[float, float, float]:
    """آپدیت دوطرفه پس از یک پاسخ.

    دانش‌آموز: R' = R + K_s × (S − E)   |   سؤال: R' = R + K_q × (E − S)
    دو طرف آینه‌ی هم‌اند؛ آن‌که «بهتر از انتظار» عمل کند می‌گیرد و دیگری می‌دهد.

    Returns:
        (توان جدید دانش‌آموز، سختی جدید سؤال، انتظار E قبل از پاسخ)
    """
    e = expected_success(r_student, r_question)
    s = 1.0 if correct else 0.0
    new_student = r_student + k_s * (s - e)
    new_question = r_question + k_q * (e - s)
    return new_student, new_question, e
