#!/usr/bin/env python3
"""شماره‌گذاری فارسی صفحات سند سه‌لایه با PyMuPDF (garbage=4) + متادیتا.
قواعد: جلد و فهرست و صفحهٔ پایانی بدون شماره؛ بدنه از ۱."""
import fitz
import os

SRC = "/home/z/my-project/download/azmoonak-algorithms-3layer/azmoonak-algorithms-3layer.pdf"
FONT = "/home/z/my-project/download/azmoonak-algorithms-3layer/fonts/Vazirmatn-Regular.ttf"
PAGE_W = 595.5
PAGE_H = 842.25
PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹"
UNIQUE_BODY_MARK = "یاد بگیر چطور از این کتاب استفاده کنی"

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

MUTED = (0.42, 0.45, 0.50)
vaz_font = fitz.Font(fontfile=FONT)
stamped = 0
for i in range(body_start, n_pages - 1):   # صفحهٔ پایانی (ending) شماره نمی‌گیرد
    pg = doc[i]
    label = to_fa(i - body_start + 1)
    w = vaz_font.text_length(label, fontsize=9)
    pg.insert_text(
        fitz.Point((PAGE_W - w) / 2, PAGE_H - 22),
        label,
        fontname="vaz", fontfile=FONT, fontsize=9, color=MUTED,
    )
    stamped += 1

doc.set_metadata({
    "title": "الگوریتم‌های آزمونک در سه لایه — از بچه ۱۰ ساله تا کد پایتون",
    "author": "پویا — جشنواره نوجوان خوارزمی",
    "subject": "سه لایه برای هر موتور: توضیح کودکانه، مفهوم با مثال عددی تست‌شده، کد پایتون آماده core",
    "creator": "Z.ai",
    "keywords": "آزمونک، Elo، جایابی، انتخاب سؤال، نردبان D16، SM-2، پیش‌بینی، پایتون، جشنواره خوارزمی",
})

TMP = SRC + ".tmp.pdf"
doc.save(TMP, incremental=False, garbage=4, deflate=True)
doc.close()
os.replace(TMP, SRC)
print("stamped pages:", stamped, "| unnumbered: cover, toc, ending")
print("final size: %.1f KB" % (os.path.getsize(SRC) / 1024))
