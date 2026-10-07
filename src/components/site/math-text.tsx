"use client";

// ============================================================
// رندر متن دارای فرمول ریاضی — KaTeX
// فرمول‌های بانک سؤال به‌صورت LaTeX ذخیره می‌شوند:
//   درون‌خطی: $f(x)=2x\sqrt{x}$   بلوکی: $$\frac{x^4}{4}$$
// بخش‌های متنی (فارسی/RTL) دست‌نخورده می‌مانند و فقط
// قطعه‌های ریاضی به‌صورت فرمول واقعی (LTR ایزوله) رندر می‌شوند.
// ============================================================

import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { cn } from "@/lib/utils";

type Segment = { kind: "text" | "math"; value: string; display?: boolean };

// اول $$...$$ (بلوکی) بعد $...$ (درون‌خطی)؛ $ باز بدون بسته شدن عیناً می‌ماند
const MATH_RE = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;

function parseSegments(input: string): Segment[] {
  const segments: Segment[] = [];
  let last = 0;
  MATH_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = MATH_RE.exec(input)) !== null) {
    if (m.index > last) segments.push({ kind: "text", value: input.slice(last, m.index) });
    if (m[1] !== undefined) segments.push({ kind: "math", value: m[1], display: true });
    else segments.push({ kind: "math", value: m[2] ?? "", display: false });
    last = MATH_RE.lastIndex;
  }
  if (last < input.length) segments.push({ kind: "text", value: input.slice(last) });
  return segments;
}

function MathSegment({ tex, display }: { tex: string; display?: boolean }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(tex, {
        throwOnError: false,
        displayMode: Boolean(display),
        strict: false,
      });
    } catch {
      return null;
    }
  }, [tex, display]);

  if (html === null) {
    // مسیر نجات: هرگز سؤال را به‌خاطر فرمول خراب نمی‌اندازیم
    return <span dir="ltr" className="inline-block font-mono text-[0.9em]">{tex}</span>;
  }
  return (
    <span
      dir="ltr"
      // خروجی HTML از موتور KaTeX است (بانک سؤال خودی، بدون ورودی آزاد کاربر)
      className={cn(display && "my-2 block text-center")}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function MathText({ text, className }: { text: string; className?: string }) {
  const segments = useMemo(() => parseSegments(text ?? ""), [text]);

  if (segments.length === 1 && segments[0].kind === "text") {
    // بدون فرمول — مسیر سریع
    return <span className={className}>{segments[0].value}</span>;
  }

  return (
    <span className={className}>
      {segments.map((seg, i) =>
        seg.kind === "math" ? (
          <MathSegment key={i} tex={seg.value} display={seg.display} />
        ) : (
          <span key={i}>{seg.value}</span>
        ),
      )}
    </span>
  );
}
