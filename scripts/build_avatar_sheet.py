#!/usr/bin/env python3
"""Build a labeled contact sheet of public/avatars/sample/*.jpg for visual QA."""
import glob, os
from PIL import Image, ImageDraw

SRC = "/home/z/my-project/public/avatars/sample"
OUT = "/home/z/my-project/scripts/avatar-contact-sheet.png"
COLS, CELL, LABEL_H = 7, 140, 26

files = sorted(glob.glob(os.path.join(SRC, "*.jpg")),
               key=lambda p: (0 if os.path.basename(p).startswith("smpt") else 1, p))
rows = (len(files) + COLS - 1) // COLS
sheet = Image.new("RGB", (COLS * CELL, rows * (CELL + LABEL_H)), "white")
draw = ImageDraw.Draw(sheet)
for i, fp in enumerate(files):
    x = (i % COLS) * CELL
    y = (i // COLS) * (CELL + LABEL_H)
    img = Image.open(fp).convert("RGB").resize((CELL, CELL))
    sheet.paste(img, (x, y))
    draw.text((x + 4, y + CELL + 5), os.path.basename(fp), fill="black")
    draw.rectangle([x, y, x + CELL - 1, y + CELL - 1], outline="#cccccc")
sheet.save(OUT)
print(f"{OUT}  ({len(files)} photos, {sheet.size[0]}x{sheet.size[1]})")
