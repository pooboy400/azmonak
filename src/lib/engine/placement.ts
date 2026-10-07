// ============================================================
// جایابی ۴ سؤالی (D1) — پورت TypeScript عیناً از core/placement.py
// سه سؤال اول روی سه رده سختی «پراکنده» پخش می‌شوند؛ سؤال چهارم
// نزدیک‌ترین رده به برآورد جاری دانش‌آموز است.
// ============================================================

import { applyResult } from "./elo";

export const START_RATING = 1250.0; // برآورد خنثی قبل از اولین پاسخ
export const PLACEMENT_K = 32; // K ثابت در طول جایابی (تصمیم D1)
export const QUESTION_K = 8; // K سؤال در جایابی
export const PLACEMENT_QUESTIONS = 4;
// سه رده سختی با «ترتیب پراکنده» — دنباله صعودی/نزولی الگو می‌سازد و حدس سیستماتیک می‌آورد
export const SPREAD = [1250.0, 1150.0, 1350.0] as const;
export const BASE_UNCERTAINTY = 100.0;
export const UNCERTAINTY_DECAY = 15.0;
export const MIN_UNCERTAINTY = 40.0;

/** سختی هدف سؤال iاُم جایابی. */
export function nextQuestionRating(index: number, rStudent: number): number {
  if (index < SPREAD.length) return SPREAD[index];
  return Math.min(1350.0, Math.max(1150.0, rStudent));
}

export interface PlacementTraceStep {
  step: number;
  rQuestion: number;
  expected: number;
  correct: boolean;
  rStudentBefore: number;
  rStudentAfter: number;
}

/** اجرای کل جلسه جایابی روی دنباله درست/غلط (برای بازپخش از رکورد attempts). */
export function runPlacement(answers: boolean[]): {
  rStudent: number;
  uncertainty: number;
  trace: PlacementTraceStep[];
} {
  let rStudent = START_RATING;
  const trace: PlacementTraceStep[] = [];
  answers.forEach((correct, i) => {
    const rQuestion = nextQuestionRating(i, rStudent);
    const { newStudent, newQuestion, e } = applyResult(rStudent, rQuestion, correct, PLACEMENT_K, QUESTION_K);
    trace.push({
      step: i + 1,
      rQuestion: newQuestion,
      expected: Math.round(e * 1000) / 1000,
      correct,
      rStudentBefore: Math.round(rStudent * 10) / 10,
      rStudentAfter: Math.round(newStudent * 10) / 10,
    });
    rStudent = newStudent;
  });
  const uncertainty = Math.max(MIN_UNCERTAINTY, BASE_UNCERTAINTY - UNCERTAINTY_DECAY * answers.length);
  return { rStudent: Math.round(rStudent * 10) / 10, uncertainty, trace };
}
