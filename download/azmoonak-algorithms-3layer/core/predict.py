"""پیش‌بینی نمره — نمره وزن‌دار D13 + رگرسیون نمایی λ.

نمره جلسه: سختی واقعاً دیده شود (سؤال سخت وزن بیشتر).
پیش‌بینی: جلسات اخیر با وزن نمایی λ=۰٫۸۵ سنگین‌تر شمرده می‌شوند.
"""

# --- دستگیره‌های قابل تنظیم ---
LAMBDA = 0.85            # وزن نمایی جلسات اخیر (پیوست الف)
MIN_SESSIONS = 8         # حداقل جلسه برای نمایش پیش‌بینی
TIER_WEIGHTS = {1150: 1.0, 1250: 1.5, 1350: 2.0}   # وزن سه رده سختی


def question_weight(r_question: float) -> float:
    """وزن هر سؤال از سختی Elo آن — نزدیک‌ترین رده ۱۱۵۰/۱۲۵۰/۱۳۵۰.

    سؤال سخت‌تر، وزن بیشتر: درست‌زدنِ سخت «ارزشمندتر» از درست‌زدنِ آسان.
    """
    nearest_tier = min(TIER_WEIGHTS, key=lambda t: abs(t - r_question))
    return TIER_WEIGHTS[nearest_tier]


def session_score(answers: list[tuple[bool, float]]) -> float:
    """نمره وزن‌دار جلسه (D13): Σ(وزن×درستی) ÷ Σ(وزن) × ۱۰۰.

    Args:
        answers: فهرست (درستی پاسخ، سختی Elo سؤال).
    Returns:
        نمره جلسه بین ۰ تا ۱۰۰.
    """
    total_weight = 0.0
    earned_weight = 0.0
    for correct, r_question in answers:
        w = question_weight(r_question)
        total_weight += w
        if correct:
            earned_weight += w
    if total_weight == 0:
        return 0.0
    return earned_weight / total_weight * 100.0


def predict_next_score(
    session_scores: list[float], lam: float = LAMBDA
) -> dict:
    """پیش‌بینی نمره جلسه بعد با میانگین نمایی وزن‌دار.

    جلسه i جلسه قبل از آخر وزن λ^i می‌گیرد؛ جلسات اخیر حاکم‌اند.
    تا قبل از ۸ جلسه، پیش‌بینی نمایش داده نمی‌شود (پیوست الف).
    """
    if len(session_scores) < MIN_SESSIONS:
        return {"available": False, "reason": f"حداقل {MIN_SESSIONS} جلسه لازم است"}

    weights = [lam ** i for i in range(len(session_scores))]  # i=0 آخرین جلسه
    weighted_sum = sum(w * s for w, s in zip(weights, session_scores))
    forecast = weighted_sum / sum(weights)
    naive_mean = sum(session_scores) / len(session_scores)
    return {
        "available": True,
        "forecast": round(forecast, 1),
        "naive_mean": round(naive_mean, 1),
        "direction": "up" if forecast >= naive_mean else "down",
    }
