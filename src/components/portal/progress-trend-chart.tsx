// نمودار روند دولایه (D15) — SVG دستی بدون کتابخانهٔ نمودار
// لایه ۱: نمرهٔ وزن‌دار هر جلسه (ستون، ۰ تا ۱۰۰)
// لایه ۲: مسیر توان درس R_s (خط — rStart اولین جلسه تا rEnd هر جلسه)
// کامپوننت سرور است؛ بدون state و بدون تعامل — tooltip بومی <title>

import { faNum, faRating, faScore } from "@/lib/fa";
import type { TrendPoint } from "@/lib/queries/portal";

const W = 660;
const H = 240;
const PAD = { top: 14, right: 44, bottom: 26, left: 52 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

function shortJalaliDate(d: Date): string {
  return new Intl.DateTimeFormat("fa-IR", { month: "short", day: "numeric" }).format(d);
}

export function ProgressTrendChart({ points }: { points: TrendPoint[] }) {
  const n = points.length;
  if (n === 0) return null;

  // ---------- محور توان R_s (لایهٔ خط) ----------
  const rValues: number[] = [];
  for (const p of points) {
    rValues.push(p.rStart);
    if (p.rEnd !== null) rValues.push(p.rEnd);
  }
  const rMin = Math.min(...rValues);
  const rMax = Math.max(...rValues);
  const rPad = Math.max(30, (rMax - rMin) * 0.25);
  const rLo = Math.max(0, rMin - rPad);
  const rHi = rMax + rPad;
  const rY = (v: number) => PAD.top + PLOT_H - ((v - rLo) / (rHi - rLo)) * PLOT_H;

  // مسیر خط: از rStart جلسهٔ اول شروع، سپس rEnd هر جلسه (اگر بود)
  const linePts: { x: number; v: number }[] = [];
  const slot = PLOT_W / n;
  const xOf = (i: number) => PAD.left + slot * i + slot / 2;
  linePts.push({ x: xOf(0), v: points[0].rStart });
  for (let i = 0; i < n; i++) {
    if (points[i].rEnd !== null) linePts.push({ x: xOf(i), v: points[i].rEnd! });
    else if (i > 0) linePts.push({ x: xOf(i), v: points[i].rStart });
  }
  const linePath = linePts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${rY(p.v).toFixed(1)}`).join(" ");

  // ---------- محور نمره (لایهٔ ستون) — مقیاس ثابت ۰ تا ۱۰۰ ----------
  const barW = Math.min(30, slot * 0.52);
  const scoreY = (score: number) => PAD.top + PLOT_H - (score / 100) * PLOT_H;

  // خطوط راهنمای افقی (۵ خط) + برچسب توان سمت چپ
  const gridCount = 4;
  const gridR = Array.from({ length: gridCount + 1 }, (_, i) => rLo + ((rHi - rLo) * i) / gridCount);

  const lastV = linePts[linePts.length - 1].v;
  const lastX = linePts[linePts.length - 1].x;

  return (
    <figure dir="ltr" className="w-full">
      <figcaption dir="rtl" className="mb-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: "var(--chart-1)" }} />
          نمرهٔ جلسه (۰ تا ۱۰۰)
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-0.5 w-4 rounded" style={{ backgroundColor: "var(--chart-3)" }} />
          توان درس R_s — الان {faRating(lastV)}
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`روند ${faNum(n)} جلسهٔ اخیر: نمرهٔ جلسه و توان درس`} className="h-auto w-full">
        {/* خطوط راهنما + برچسب توان */}
        {gridR.map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={rY(v)} y2={rY(v)} stroke="var(--border)" strokeWidth={1} strokeDasharray="3 4" />
            <text x={PAD.left - 8} y={rY(v) + 3.5} textAnchor="end" className="text-[10px]" fill="var(--muted-foreground)">
              {faRating(v)}
            </text>
          </g>
        ))}
        {/* برچسب نمرهٔ راست: ۰ / ۵۰ / ۱۰۰ */}
        {[0, 50, 100].map((s) => (
          <text key={s} x={W - PAD.right + 8} y={scoreY(s) + 3.5} textAnchor="start" className="text-[10px]" fill="var(--muted-foreground)">
            {faNum(s)}
          </text>
        ))}

        {/* لایه ۱ — ستون‌های نمره */}
        {points.map((p, i) => {
          const x = xOf(i) - barW / 2;
          const y = p.score !== null ? scoreY(p.score) : PAD.top + PLOT_H;
          const h = p.score !== null ? PAD.top + PLOT_H - scoreY(p.score) : 0;
          return (
            <g key={p.index}>
              <title>
                {`جلسهٔ ${faNum(p.index)} (${p.type === "PLACEMENT" ? "جایابی" : "تمرین"}) — ${shortJalaliDate(p.startedAt)}${p.score !== null ? ` — نمره ${faScore(p.score)}` : " — بدون نمره"}${p.rEnd !== null ? ` — توان ${faRating(p.rEnd)}` : ""}`}
              </title>
              {p.score !== null && <rect x={x} y={y} width={barW} height={Math.max(h, 2)} rx={3} fill="var(--chart-1)" opacity={0.85} />}
            </g>
          );
        })}

        {/* لایه ۲ — مسیر توان R_s */}
        <path d={linePath} fill="none" stroke="var(--chart-3)" strokeWidth={2.25} strokeLinejoin="round" strokeLinecap="round" />
        {linePts.map((p, i) => (
          <g key={i}>
            <title>{`توان ${faRating(p.v)}`}</title>
            <circle cx={p.x} cy={rY(p.v)} r={i === linePts.length - 1 ? 4.5 : 3} fill="var(--chart-3)" stroke="var(--background)" strokeWidth={1.5} />
          </g>
        ))}
        {/* برچسب مقدار آخر توان */}
        <text x={lastX + 6} y={rY(lastV) - 8} className="text-[10px] font-medium" fill="var(--chart-3)">
          {faRating(lastV)}
        </text>

        {/* برچسب‌های محور افقی — شمارهٔ جلسه */}
        {points.map((p, i) =>
          n <= 12 || i % 2 === 0 ? (
            <text key={p.index} x={xOf(i)} y={H - 8} textAnchor="middle" className="text-[10px]" fill="var(--muted-foreground)">
              {faNum(p.index)}
            </text>
          ) : null,
        )}
        {/* خط کف */}
        <line x1={PAD.left} x2={W - PAD.right} y1={PAD.top + PLOT_H} y2={PAD.top + PLOT_H} stroke="var(--border)" strokeWidth={1.25} />
      </svg>
      <figcaption dir="rtl" className="mt-1 text-[10px] text-muted-foreground">
        محور افقی: شمارهٔ جلسه (۱ = قدیمی‌ترین از {faNum(n)} جلسهٔ اخیر)
      </figcaption>
    </figure>
  );
}
