// تست سریع منطق MathText — همان سؤال مشتقِ بانک سؤال
import katex from "katex";

const MATH_RE = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
function parseSegments(input) {
  const segments = [];
  let last = 0;
  MATH_RE.lastIndex = 0;
  let m;
  while ((m = MATH_RE.exec(input)) !== null) {
    if (m.index > last) segments.push({ kind: "text", value: input.slice(last, m.index) });
    if (m[1] !== undefined) segments.push({ kind: "math", value: m[1], display: true });
    else segments.push({ kind: "math", value: m[2] ?? "", display: false });
    last = MATH_RE.lastIndex;
  }
  if (last < input.length) segments.push({ kind: "text", value: input.slice(last) });
  return segments;
}

const cases = [
  "مشتق تابع $f(x)=2x\\sqrt{x}$ در نقطهٔ $x=4$ کدام است؟",
  "$\\frac{x^4}{4}$",
  "نخست ساده کنیم: $f(x)=2x^{3/2}$. مشتق: $f'(x)=3x^{1/2}$ و در $x=4$ می‌شود $3\\times2=6$.",
  "$2\\cos(2x)$",
  "قیمت ۵۰ تومان $ بابت کتاب", // $ تکِ بی‌جفت باید عیناً بماند
  "متن بدون فرمول",
  "بلوکی: $$\\int_0^4 f'(x)\\,dx$$ تمام",
];

let fail = 0;
for (const c of cases) {
  const segs = parseSegments(c);
  const parts = [];
  for (const s of segs) {
    if (s.kind === "text") { parts.push(s.value); continue; }
    try {
      const html = katex.renderToString(s.value, { throwOnError: false, displayMode: Boolean(s.display), strict: false });
      const ok = html.includes("katex") && !html.includes("katex-error");
      if (!ok) { fail++; console.log("  [KATEX-ERROR]", s.value); }
      parts.push(ok ? `⟨MATH:${s.value}⟩` : `[ERR:${s.value}]`);
    } catch (e) {
      fail++;
      console.log("  [THREW]", s.value, e.message);
    }
  }
  console.log("IN :", c.slice(0, 60));
  console.log("OUT:", parts.join("|").slice(0, 120));
}
// نکته: کلاس katex-error با throwOnError:false تولید می‌شود اگر فرمول خراب باشد
console.log(fail === 0 ? "ALL OK" : `FAILURES: ${fail}`);
