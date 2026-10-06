#!/usr/bin/env python3
"""شماره‌گذاری فارسی صفحات سند طراحی فرانت با PyMuPDF (garbage=4) + متادیتا.
قواعد: جلد (۱) و فهرست (۲) و صفحهٔ پایانی بدون شماره؛ بدنه از ۱."""
import fitz
import os

SRC = "/home/z/my-project/download/azmoonak-frontend-design/azmoonak-frontend-design.pdf"
FONT = "/home/z/my-project/download/azmoonak-frontend-design/fonts/Vazirmatn-Regular.ttf"
PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹"
UNIQUE_BODY_MARK = "قطب‌نمای طراحی آزمونک"

def to_fa(n: int) -> str:
    return "".join(PERSIAN_DIGITS[int(d)] for d in str(n))

doc = fitz.open(SRC)
n_pages = len(doc)

body_start = None
for i, pg in enumerate(doc):
    if UNIQUE_BODY_MARK in (pg.get_text() or ""):
        body_start = i
        break
if body_start is None:
    raise SystemExit("body marker not found!")
print("pages:", n_pages, "| body starts at 0-based:", body_start)

MUTED = (0.37, 0.38, 0.50)
vaz_font = fitz.Font(fontfile=FONT)
stamped = 0
for i in range(body_start, n_pages - 1):   # صفحهٔ پایانی (ending) شماره نمی‌گیرد
    pg = doc[i]
    W, H = pg.rect.width, pg.rect.height
    label = to_fa(i - body_start + 1)
    w = vaz_font.text_length(label, fontsize=9)
    pg.insert_text(
        fitz.Point((W - w) / 2, H - 20),
        label,
        fontname="vaz", fontfile=FONT, fontsize=9, color=MUTED,
    )
    stamped += 1

doc.set_metadata({
    "title": "سند طراحی فرانت آزمونک — نسخه ۲٫۱ لایت (لوگوی نهایی)",
    "author": "پویا — جشنواره نوجوان خوارزمی",
    "subject": "لوگوی نهایی آزمونک و برش‌های رسمی، سیستم رنگ بر پایه بنفش برند (#4F46E5)، تایپوگرافی وزیرمتن، آیکون‌های lucide، ماکاپ HTML صفحات (لندینگ، لیدربرد درس‌محور تک‌درس×رشته×پایه، کامیونیتی، ورود، پروفایل، آزمون) و نقشه راه پیاده‌سازی",
    "creator": "Z.ai",
    "keywords": "آزمونک، طراحی رابط کاربری، UI/UX، تم لایت، وزیرمتن، لوگو، لیدربرد درس‌محور، lucide، کامیونیتی، PWA، جشنواره خوارزمی",
})

TMP = SRC + ".tmp.pdf"
doc.save(TMP, incremental=False, garbage=4, deflate=True)
doc.close()
os.replace(TMP, SRC)
print("stamped pages:", stamped, "| unnumbered: cover, toc, ending")
print("final size: %.1f KB" % (os.path.getsize(SRC) / 1024))
