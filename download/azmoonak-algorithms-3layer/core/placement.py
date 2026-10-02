"""جایابی ۴ سؤالی (D1) — پیدا کردن سطح واقعی دانش‌آموز تازه‌وارد.

به‌جای خوداظهاری یا پیش‌آزمون، خودِ موتور با ۴ سؤالِ «پراکنده» سطح را پیدا می‌کند.
سختی‌ها روی سه رده ۱۱۵۰/۱۲۵۰/۱۳۵۰ پخش می‌شوند تا حدس سیستماتیک بی‌فایده شود.
"""

from elo import apply_result

# --- دستگیره‌های قابل تنظیم ---
START_RATING = 1250.0    # برآورد خنثی قبل از اولین پاسخ
PLACEMENT_K = 32         # K ثابت در طول جایابی (تصمیم D1)
QUESTION_K = 8           # K سؤال در جایابی
# سه رده سختی با «ترتیب پراکنده» — دنباله صعودی/نزولی الگو می‌سازد و حدس سیستماتیک می‌آورد
SPREAD = (1250.0, 1150.0, 1350.0)
BASE_UNCERTAINTY = 100.0  # شاخص عدم‌قطعیت پایه = نصف پراکندگی
UNCERTAINTY_DECAY = 15.0  # کاهش عدم‌قطعیت با هر پاسخ
MIN_UNCERTAINTY = 40.0


def next_question_rating(index: int, r_student: float) -> float:
    """سختی سؤال iاُم جایابی.

    سه سؤال اول: پخش روی سه رده (ترتیب پراکنده، نه صعودی).
    سؤال چهارم: نزدیک‌ترین رده به برآورد جاری دانش‌آموز.
    """
    if index < len(SPREAD):
        return SPREAD[index]
    return min(1350.0, max(1150.0, r_student))


def run_placement(answers: list[bool]) -> dict:
    """کل جلسه جایابی را اجرا می‌کند.

    Args:
        answers: ترتیب درست/غلط پاسخ‌ها (طول ۳ تا ۵).
    Returns:
        dict با توان اولیه، شاخص عدم‌قطعیت و ردپای گام‌به‌گام.
    """
    r_student = START_RATING
    trace = []
    for i, correct in enumerate(answers):
        r_question = next_question_rating(i, r_student)
        new_student, new_question, e = apply_result(
            r_student, r_question, correct, PLACEMENT_K, QUESTION_K
        )
        trace.append({
            "step": i + 1,
            "r_question": r_question,
            "expected": round(e, 3),
            "correct": correct,
            "r_student": round(r_student, 1),
            "r_student_new": round(new_student, 1),
        })
        r_student = new_student

    uncertainty = max(
        MIN_UNCERTAINTY,
        BASE_UNCERTAINTY - UNCERTAINTY_DECAY * len(answers),
    )
    return {"r_student": round(r_student, 1), "uncertainty": uncertainty, "trace": trace}
