// ============================================================
// نمره وزن‌دار D13 + پیش‌بینی — پورت TypeScript عیناً از core/predict.py
// ============================================================

export const LAMBDA = 0.85; // وزن نمایی جلسات اخیر (پیوست الف)
export const MIN_SESSIONS = 8; // حداقل جلسه برای نمایش پیش‌بینی
export const TIER_WEIGHTS: Record<number, number> = { 1150: 1.0, 1250: 1.5, 1350: 2.0 };

/** وزن هر سؤال از سختی Elo آن — نزدیک‌ترین رده ۱۱۵۰/۱۲۵۰/۱۳۵۰. */
export function questionWeight(rQuestion: number): number {
  const tiers = Object.keys(TIER_WEIGHTS).map(Number);
  const nearestTier = tiers.reduce((best, t) => (Math.abs(t - rQuestion) < Math.abs(best - rQuestion) ? t : best));
  return TIER_WEIGHTS[nearestTier];
}

/** نمره وزن‌دار جلسه (D13): Σ(وزن×درستی) ÷ Σ(وزن) × ۱۰۰ — ورودی: [درستی، سختی Elo سؤال]. */
export function sessionScore(answers: Array<{ correct: boolean; rQuestion: number }>): number {
  let totalWeight = 0.0;
  let earnedWeight = 0.0;
  for (const a of answers) {
    const w = questionWeight(a.rQuestion);
    totalWeight += w;
    if (a.correct) earnedWeight += w;
  }
  if (totalWeight === 0) return 0.0;
  return (earnedWeight / totalWeight) * 100.0;
}

export interface ScoreForecast {
  available: boolean;
  reason?: string;
  forecast?: number;
  naiveMean?: number;
  direction?: "up" | "down";
}

/** پیش‌بینی نمره جلسه بعد با میانگین نمایی وزن‌دار — قبل از ۸ جلسه نمایش داده نمی‌شود. */
export function predictNextScore(sessionScores: number[], lam: number = LAMBDA): ScoreForecast {
  if (sessionScores.length < MIN_SESSIONS) {
    return { available: false, reason: `حداقل ${MIN_SESSIONS} جلسه لازم است` };
  }
  // i=0 آخرین جلسه — جلسات اخیر حاکم‌اند
  const weights = sessionScores.map((_, i) => Math.pow(lam, i));
  const weightedSum = weights.reduce((acc, w, i) => acc + w * sessionScores[i], 0);
  const forecast = weightedSum / weights.reduce((a, b) => a + b, 0);
  const naiveMean = sessionScores.reduce((a, b) => a + b, 0) / sessionScores.length;
  return {
    available: true,
    forecast: Math.round(forecast * 10) / 10,
    naiveMean: Math.round(naiveMean * 10) / 10,
    direction: forecast >= naiveMean ? "up" : "down",
  };
}
