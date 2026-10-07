// ============================================================
// نردبان سطح دسته‌ای (D16) — پورت TypeScript عیناً از core/leveling.py
// دو غلط پیاپی ← سقوط؛ دو درست پیاپی ← ارتقا (حداکثر یک بار در جلسه)؛
// سطح ۱ با موفقیت زیر ۳۰٪ در ۵ پاسخ آخر ← بنر «مطالعه کن».
// ============================================================

export const DROP_STREAK = 2;
export const RISE_STREAK = 2;
export const MIN_LEVEL = 1;
export const MAX_LEVEL = 3;
export const LEVEL_BANDS: Record<number, number> = { 1: 1150, 2: 1250, 3: 1350 };
export const STUDY_ALERT_SUCCESS = 0.3;
export const ALERT_WINDOW = 5;
export const START_LEVEL = 2;

export interface LadderState {
  level: number; // ۱ تا ۳
  wrongStreak: number;
  rightStreak: number;
  weaknessCount: number; // در کف سطح ۱: تعداد بار افت بی‌اثر
  promotedThisSession: boolean;
  recent: boolean[]; // پنجره ۵ پاسخ آخر
  alert: boolean;
}

export function initialLadderState(): LadderState {
  return {
    level: START_LEVEL,
    wrongStreak: 0,
    rightStreak: 0,
    weaknessCount: 0,
    promotedThisSession: false,
    recent: [],
    alert: false,
  };
}

export interface LadderEvent {
  moved: boolean;
  direction: "up" | "down" | null;
  alert: boolean;
}

/** نوار سختی Elo این سطح — ورودی فیلتر انتخاب سؤال. */
export function difficultyBand(level: number): number {
  return LEVEL_BANDS[level] ?? LEVEL_BANDS[START_LEVEL];
}

/** ثبت یک پاسخ و به‌روزرسانی وضعیت نردبان؛ خروجی: وضعیت جدید + رویداد. */
export function ladderRecord(state: LadderState, correct: boolean): { state: LadderState; event: LadderEvent } {
  const s: LadderState = {
    ...state,
    recent: [...state.recent, correct].slice(-ALERT_WINDOW),
  };
  const event: LadderEvent = { moved: false, direction: null, alert: false };

  if (correct) {
    s.rightStreak += 1;
    s.wrongStreak = 0;
    if (s.rightStreak >= RISE_STREAK && s.level < MAX_LEVEL && !s.promotedThisSession) {
      s.level += 1;
      s.rightStreak = 0;
      s.promotedThisSession = true;
      event.moved = true;
      event.direction = "up";
    }
  } else {
    s.wrongStreak += 1;
    s.rightStreak = 0;
    if (s.wrongStreak >= DROP_STREAK) {
      s.wrongStreak = 0;
      if (s.level > MIN_LEVEL) {
        s.level -= 1;
        s.promotedThisSession = false; // ارتقای جلسه مصرف شد
        event.moved = true;
        event.direction = "down";
      } else {
        s.weaknessCount += 1; // در کف: ضعف ثبت می‌شود
      }
    }
  }

  // بنر مطالعه: سطح ۱ + موفقیت زیر ۳۰٪ در ۵ پاسخ آخر
  if (s.level === MIN_LEVEL && s.recent.length === ALERT_WINDOW) {
    const rate = s.recent.filter(Boolean).length / s.recent.length;
    s.alert = rate < STUDY_ALERT_SUCCESS;
    event.alert = s.alert;
  }
  return { state: s, event };
}
