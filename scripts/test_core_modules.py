"""تست کامل ماژول‌های core — خروجی این تست، اعداد مثال‌های سند سه‌لایه است."""
import sys
sys.path.insert(0, "/home/z/my-project/download/azmoonak-algorithms-3layer/core")

from elo import expected_success, apply_result
from placement import run_placement
from selector import select_question, educational_value
from leveling import CategoryLadder
from sm2 import quality, update_ef, next_interval, EF_START
from predict import session_score, predict_next_score

ok = True
def check(name, cond, detail=""):
    global ok
    print(("PASS  " if cond else "FAIL  ") + name + ("   " + detail if detail else ""))
    if not cond: ok = False

print("== 1) ELO — تست طلایی سند ==")
e = expected_success(1200, 1350)
print(f"E = {e:.4f}  (انتظار: ~0.2966)")
rs, rq, _ = apply_result(1200, 1350, True, 32, 8)
print(f"دانش‌آموز: {rs:.1f}  سؤال: {rq:.1f}")
check("golden 1222.5", abs(rs - 1222.5) < 0.1)
check("golden 1344.4", abs(rq - 1344.4) < 0.1)
check("E ~ 0.296", abs(e - 0.2966) < 0.001)

print("\n== 2) PLACEMENT — جایابی [درست، غلط، درست، درست] ==")
res = run_placement([True, False, True, True])
for t in res["trace"]:
    print(f"گام {t['step']}: سؤال {t['r_question']:.0f} → E={t['expected']} پاسخ={'درست' if t['correct'] else 'غلط'}  ۱۲۵۰→{t['r_student']}→{t['r_student_new']}")
print("نهایی:", res["r_student"], "عدم‌قطعیت:", res["uncertainty"])

print("\n== 3) SELECTOR — انتخاب از ۵ کاندید (دانش‌آموز ۱۲۳۰) ==")
cands = [
    {"id": 101, "r_question": 900,  "weakness": 0.1, "importance": 0.3, "recency": 0.2},
    {"id": 102, "r_question": 1230, "weakness": 0.4, "importance": 0.5, "recency": 0.5},
    {"id": 103, "r_question": 1110, "weakness": 0.3, "importance": 0.8, "recency": 0.2},
    {"id": 104, "r_question": 1100, "weakness": 0.9, "importance": 0.6, "recency": 0.7},
    {"id": 105, "r_question": 1400, "weakness": 0.9, "importance": 0.9, "recency": 0.9},
]
pick = select_question(1230, cands, recent_question_ids=[999]*20)
for c in cands:
    ev = c.get("e", expected_success(1230, c["r_question"]))
    tag = '✓ در ناحیه' if 0.65 <= ev <= 0.75 else '✗ خارج'
    v = educational_value(c["weakness"], c["importance"], c["recency"])
    print(f"id={c['id']}  سؤال={c['r_question']}  E={ev:.3f}  V={v:.2f}  {tag}")
print("انتخاب:", pick["id"], "| E =", round(pick["e"], 3), "| ارزش =", round(educational_value(pick["weakness"], pick["importance"], pick["recency"]), 3))

print("\n== 4) LEVELING — نردبان: غلط غلط (سقوط) | درست درست (ارتقا) | کف سطح ۱ ==")
lad = CategoryLadder("حد و مشتق")
print("شروع سطح:", lad.level)
ev = lad.record(False); print("غلط ۱ →", lad.level)
ev = lad.record(False); print("غلط ۲ →", lad.level, ev)   # 2→1 سقوط
ev = lad.record(True);  print("درست ۱ →", lad.level)
ev = lad.record(True);  print("درست ۲ →", lad.level, ev)  # 1→2 ارتقا؛ ولی این جلسه سقوط‌اش را خرج کرده؟ نه: فقط یک ارتقا در جلسه — این همان یک ارتقاست
ev = lad.record(True);  print("درست ۳ →", lad.level)      # ارتقای دوم ممنوع
lad2 = CategoryLadder("کنیدگی")
lad2.level = 1; lad2.recent = [True, False]
lad2.record(False)              # غلط پیاپی اول
lad2.record(False)              # غلط پیاپی دوم در کف سطح ۱ → شمارنده ضعف +۱
lad2.record(True)               # پنجمین پاسخ → محاسبه بنر (موفقیت ۲۰٪ < ۳۰٪)
print("کف سطح ۱: بنر مطالعه =", lad2.alert, "| شمارنده ضعف =", lad2.weakness_counter, "(باید ۱ باشد)")

print("\n== 5) SM-2 ==")
print("q(درست، مطمئن، ۳۰s) =", quality(True, True, 30))    # 5
print("q(درست، حدس، ۳۰s) =", quality(True, False, 30))     # سقف 4
print("q(درست، بدون اعتماد، ۱۰s) =", quality(True, None, 10))  # سقف 4 (رفلکسی)
print("q(درست، بدون اعتماد، ۹۰s) =", quality(True, None, 90))  # 4−0.5=3.5
print("q(غلط، مطمئن، ۳۰s) =", quality(False, True, 30))    # 3
print("q(غلط، بدون اعتماد، ۳۰s) =", quality(False, None, 30))  # 2
print("EF(2.5, q=4) =", update_ef(2.5, 4), "  ← دست‌نخورده!")
print("EF(2.5, q=5) =", round(update_ef(2.5, 5), 3), "  ← فقط +۰٫۱")
print("EF(2.5, q=2) =", round(update_ef(2.5, 2), 4))
print("EF(1.35, q=0) =", update_ef(1.35, 0), "  ← کف ۱٫۳")
seq, n, iv, ef = [], 1, 0, EF_START
for i in range(4):
    iv = next_interval(i + 1, ef, 5.0, iv)
    seq.append(iv)
print("زنجیره فواصل با q=5:", seq)   # [1, 6, 15, 38]
check("intervals 1→6→15", seq[:3] == [1, 6, 15])
print("غلط (q=2) بعد از n بالا:", next_interval(4, 2.5, 2.0, 38), "  ← ریست به ۱")

print("\n== 6) PREDICT — مثال G1 ==")
s1 = session_score([(True,1150)]*4 + [(True,1250)]*2 + [(True,1350)]*1 + [(False,1150)]*2 + [(False,1250)]*1)
print("۷ درست (۴ آسان+۲ متوسط+۱ سخت) از ۱۰ سؤال:", round(s1, 1), "← انتظار ۷۲")
check("D13 = 72", abs(s1 - 72.0) < 0.01)
# سناریوی فرضیه‌ای G1: همان جلسه (۶ آسان+۳ متوسط+۱ سخت = ۱۲٫۵)، همان ۷ درست اما همگی آسان
from predict import question_weight
s2 = 7 * question_weight(1150) / (6*1 + 3*1.5 + 1*2) * 100
print("همان ۷ درست اما همگی وزن آسان (Σw=۱۲٫۵):", round(s2, 1), "← انتظار ۵۶")
check("D13 = 56", abs(s2 - 56.0) < 0.01)
p = predict_next_score([52, 58, 60, 65, 63, 70, 68, 74])
print("پیش‌بینی با ۸ جلسه:", p)

print("\nنتیجه:", "ALL OK ✔" if ok else "FAILED ✘")
sys.exit(0 if ok else 1)
