"""Golden tests for the six core modules - the numbers of the 3-layer book.

Run with pytest:  python3 -m pytest core/tests -q
Or standalone:    python3 core/tests/test_core.py
"""
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from core.elo import expected_success, apply_result
from core.placement import run_placement
from core.selector import select_question, educational_value
from core.leveling import CategoryLadder
from core.sm2 import quality, update_ef, next_interval, EF_START
from core.predict import session_score, predict_next_score, question_weight

CANDIDATES = [
    {"id": 101, "r_question": 900, "weakness": 0.1, "importance": 0.3, "recency": 0.2},
    {"id": 102, "r_question": 1230, "weakness": 0.4, "importance": 0.5, "recency": 0.5},
    {"id": 103, "r_question": 1110, "weakness": 0.3, "importance": 0.8, "recency": 0.2},
    {"id": 104, "r_question": 1100, "weakness": 0.9, "importance": 0.6, "recency": 0.7},
    {"id": 105, "r_question": 1400, "weakness": 0.9, "importance": 0.9, "recency": 0.9},
]


def test_elo_golden():
    """Golden example of the book: ability 1200, difficulty 1350, correct answer."""
    e = expected_success(1200, 1350)
    assert abs(e - 0.2966) < 0.001, f"E = {e:.4f}"
    rs, rq, _ = apply_result(1200, 1350, True, 32, 8)
    assert abs(rs - 1222.5) < 0.1, f"student = {rs:.1f}"
    assert abs(rq - 1344.4) < 0.1, f"question = {rq:.1f}"


def test_placement():
    """4-question placement [correct, wrong, correct, correct]."""
    res = run_placement([True, False, True, True])
    assert len(res["trace"]) == 4
    assert res["uncertainty"] == 40.0  # 100 - 15*4, floored at 40
    assert 1100 < res["r_student"] < 1400  # sane ability after 3/4 correct


def test_selector_zone_and_value():
    """Zone filter (0.65-0.75) then educational value - picks id 104."""
    cands = [dict(c) for c in CANDIDATES]
    pick = select_question(1230, cands, recent_question_ids=[999] * 20)
    assert pick is not None and pick["id"] == 104
    # candidate 105 has max value 0.90 but E=0.27 -> filtered out by the zone
    assert abs(educational_value(0.9, 0.9, 0.9) - 0.9) < 1e-9
    # exposure window: making 104 "seen" pushes the pick to the runner-up 103
    cands2 = [dict(c) for c in CANDIDATES]
    pick2 = select_question(1230, cands2, recent_question_ids=[999] * 19 + [104])
    assert pick2 is not None and pick2["id"] == 103


def test_leveling_ladder():
    """D16 ladder: 2 wrongs -> drop, 2 rights -> rise (once per session)."""
    lad = CategoryLadder("calculus")
    assert lad.level == 2
    lad.record(False)
    assert lad.level == 2
    ev = lad.record(False)          # second wrong in a row -> drop 2 -> 1
    assert lad.level == 1 and ev["moved"] and ev["direction"] == "down"
    lad.record(True)
    assert lad.level == 1
    ev = lad.record(True)           # second right in a row -> rise 1 -> 2
    assert lad.level == 2 and ev["moved"] and ev["direction"] == "up"
    lad.record(True)                # third right - one rise per session only
    assert lad.level == 2


def test_leveling_floor_and_alert():
    """At the floor (level 1) a drop counts weakness; weak streak fires the alert."""
    lad = CategoryLadder("geometry")
    lad.level = 1
    lad.recent = [True, False]
    lad.record(False)
    lad.record(False)               # drop requested at the floor -> weakness +1
    assert lad.weakness_counter == 1 and lad.level == 1
    lad.record(True)                # 5th answer -> success rate 2/5 = 40% -> no alert
    assert lad.alert is False
    lad2 = CategoryLadder("algebra")
    lad2.level = 1
    lad2.recent = [False, False]
    lad2.record(False)
    lad2.record(False)              # weakness +1 (floor)
    lad2.record(True)               # 5th answer -> rate 1/5 = 20% < 30% -> alert
    assert lad2.weakness_counter == 1 and lad2.level == 1
    assert lad2.alert is True


def test_sm2_quality():
    """Three-signal quality: correctness, confidence (D14), latency (D10)."""
    assert quality(True, True, 30) == 5.0
    assert quality(True, False, 30) == 4.0   # lucky guess capped
    assert quality(True, None, 10) == 4.0    # reflexive answer capped
    assert quality(True, None, 90) == 3.5    # slow effort -0.5
    assert quality(False, True, 30) == 3.0
    assert quality(False, None, 30) == 2.0


def test_sm2_ef_and_intervals():
    """EF rule + interval chain 1 -> 6 -> 15 (q=5) and reset on q<3."""
    assert update_ef(2.5, 4) == 2.5          # d=1 -> untouched
    assert abs(update_ef(2.5, 5) - 2.6) < 1e-9
    assert update_ef(1.35, 0) == 1.3         # floor 1.3
    seq, iv, ef = [], 0, EF_START
    for rep in range(1, 4):
        iv = next_interval(rep, ef, 5.0, iv)
        seq.append(iv)
    assert seq == [1, 6, 15]
    assert next_interval(4, 2.5, 2.0, 38) == 1   # q < 3 -> reset


def test_predict_session_score():
    """D13 weighted score: 7 correct of 10 -> 72 (not 70)."""
    answers = (
        [(True, 1150)] * 4 + [(True, 1250)] * 2 + [(True, 1350)] * 1
        + [(False, 1150)] * 2 + [(False, 1250)] * 1
    )
    assert abs(session_score(answers) - 72.0) < 0.01
    # same 7 correct but all easy (total weight 12.5) -> 56
    s2 = 7 * question_weight(1150) / (6 * 1 + 3 * 1.5 + 1 * 2) * 100
    assert abs(s2 - 56.0) < 0.01


def test_predict_forecast_gate():
    """Exponential forecast (lambda=0.85); hidden below 8 sessions.

    Convention: the MOST RECENT session comes first (weight lambda^0).
    Golden example of the book (chapter 6, step 4): input [52, 58, 60, 65,
    63, 70, 68, 74] -> forecast 61.4 vs naive mean 63.8 (down).
    """
    hidden = predict_next_score([52, 58, 60, 65, 63, 70, 68])
    assert hidden["available"] is False
    p = predict_next_score([52, 58, 60, 65, 63, 70, 68, 74])
    assert p["available"] is True
    assert p["forecast"] == 61.4
    assert p["naive_mean"] == 63.8
    assert p["direction"] == "down"


if __name__ == "__main__":
    import traceback

    failed = 0
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn()
                print(f"PASS  {name}")
            except Exception:
                failed += 1
                print(f"FAIL  {name}")
                traceback.print_exc()
    print("ALL OK" if failed == 0 else f"{failed} TEST(S) FAILED")
    sys.exit(1 if failed else 0)
