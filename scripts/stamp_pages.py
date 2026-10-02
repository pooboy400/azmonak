#!/usr/bin/env python3
"""Stamp Persian page numbers via PyMuPDF (garbage=4 dedupes identical font objects) + metadata."""
import fitz
import os

SRC = "/home/z/my-project/download/azmoonak-algorithms/azmoonak-algorithms.pdf"
FONT = "/home/z/my-project/download/azmoonak-algorithms/fonts/Vazirmatn-Regular.ttf"
PAGE_W = 595.5
PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹"

def to_fa(n: int) -> str:
    return "".join(PERSIAN_DIGITS[int(d)] for d in str(n))

doc = fitz.open(SRC)
n_pages = len(doc)

body_start = None
for i, pg in enumerate(doc):
    if "ساخته شده که هرکدام" in (pg.get_text() or ""):
        body_start = i
        break
if body_start is None:
    body_start = 2
print("pages:", n_pages, "| body starts at 0-based:", body_start)

MUTED = (0.369, 0.443, 0.502)
vaz_font = fitz.Font(fontfile=FONT)
for i in range(body_start, n_pages):
    pg = doc[i]
    label = to_fa(i - body_start + 1)
    w = vaz_font.text_length(label, fontsize=9)
    pg.insert_text(
        fitz.Point((PAGE_W - w) / 2, PAGE_H_PTS := 842.25 - 22),
        label,
        fontname="vaz", fontfile=FONT, fontsize=9, color=MUTED,
    )

doc.set_metadata({
    "title": "الگوریتم‌های آزمونک — کتابچه کامل موتورهای تطبیقی",
    "author": "پویا — جشنواره نوجوان خوارزمی",
    "subject": "استخراج ریاضی کامل الگوریتم‌های آزمونک و مقایسه خانواده‌های جایگزین + دستگیره‌های تنظیم",
    "creator": "Z.ai",
    "keywords": "آزمونک، Elo، SM-2، FSRS، IRT، BKT، نردبان سطح، مرور فاصله‌دار، جشنواره خوارزمی",
})

TMP = SRC + ".tmp.pdf"
doc.save(TMP, incremental=False, garbage=4, deflate=True)
doc.close()
os.replace(TMP, SRC)
print("stamped pages", body_start + 1, "..", n_pages)
print("final size: %.1f KB" % (os.path.getsize(SRC) / 1024))
