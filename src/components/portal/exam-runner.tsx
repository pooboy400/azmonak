"use client";

// ============================================================
// اجراکننده جلسه آزمون — کامیونت
// تمرین: انتخاب گزینه → اعلام اعتماد (D14) → بازخورد فوری
// جایابی: فقط انتخاب گزینه (بدون بازخورد تا پایان — D1)
// تأخیر هر سؤال واقعی اندازه‌گیری می‌شود (D10)
// ============================================================

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Loader2, TrendingDown, TrendingUp, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MathText } from "@/components/site/math-text";
import { faDuration, faNum, faRating } from "@/lib/fa";
import { getNextQuestionAction, submitAnswerAction, type NextQuestionResult, type SubmitResult } from "@/lib/actions/exam";

type Question = NonNullable<NextQuestionResult["question"]>;

const OPTION_KEYS = ["A", "B", "C", "D"] as const;

export function ExamRunner({ sessionId, subjectTitle }: { sessionId: string; subjectTitle: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [question, setQuestion] = useState<Question | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<SubmitResult["feedback"] | null>(null);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const loadTimeRef = useRef<number>(Date.now());
  const [isPlacement, setIsPlacement] = useState(false);

  const loadNext = useCallback(() => {
    setError(null);
    setSelected(null);
    setFeedback(null);
    startTransition(async () => {
      const res = await getNextQuestionAction(sessionId);
      if (!res.ok) {
        setError(res.message ?? "خطا در دریافت سؤال.");
        return;
      }
      if (res.finished) {
        setFinished(true);
        router.refresh(); // سرور صفحه نتیجه را می‌سازد
        return;
      }
      if (res.question) {
        setQuestion(res.question);
        setIsPlacement(res.question.type === "PLACEMENT");
        loadTimeRef.current = Date.now();
        setElapsed(0);
      }
    });
  }, [sessionId, router]);

  useEffect(() => {
    loadNext();
  }, [loadNext]);

  // تایمر سؤال جاری
  useEffect(() => {
    if (!question || feedback) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - loadTimeRef.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, [question, feedback]);

  const submit = (confident: boolean | null, overrideSelected?: string) => {
    const sel = overrideSelected ?? selected;
    if (!question || !sel) return;
    const latencySec = Math.round((Date.now() - loadTimeRef.current) / 1000);
    startTransition(async () => {
      const res = await submitAnswerAction({
        sessionId,
        questionId: question.id,
        selected: sel,
        confident,
        latencySec,
      });
      if (!res.ok) {
        setError(res.message ?? "خطا در ثبت پاسخ.");
        return;
      }
      if (res.finished) {
        setFinished(true);
        router.refresh();
        return;
      }
      if (res.placement) {
        setFeedback(null);
        setSelected(null);
        // سؤال بعدی جایابی بدون بازخورد
        const next = await getNextQuestionAction(sessionId);
        if (next.finished) {
          setFinished(true);
          router.refresh();
          return;
        }
        if (next.question) {
          setQuestion(next.question);
          loadTimeRef.current = Date.now();
          setElapsed(0);
        }
        return;
      }
      setFeedback(res.feedback ?? null);
    });
  };

  if (error && !question) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
        <p className="mb-4 text-sm text-destructive">{error}</p>
        <Button variant="outline" className="cursor-pointer" onClick={loadNext}>
          تلاش دوباره
        </Button>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
        <span className="mr-3 text-sm">در حال آماده‌سازی سؤال…</span>
      </div>
    );
  }

  const correctOption = feedback?.correctOption;
  const rDelta = feedback ? feedback.rAfter - feedback.rBefore : 0;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* نوار وضعیت جلسه */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-bold">{subjectTitle}</span>
          <Badge variant={isPlacement ? "outline" : "secondary"}>{isPlacement ? "جایابی" : "تمرین"}</Badge>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>
            سؤال {faNum(question.index)} از {faNum(question.total)}
          </span>
          <span className="tabular-nums" aria-label="زمان سپری‌شده">
            {faDuration(elapsed)}
          </span>
        </div>
      </div>
      <Progress value={(question.index / question.total) * 100} className="h-1.5" />

      {/* صورت سؤال */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        {question.topicTitle && <div className="mb-2 text-[11px] text-muted-foreground">مبحث: {question.topicTitle}</div>}
        <p className="mb-5 whitespace-pre-line text-[15px] font-medium leading-8 text-foreground sm:text-base">
          <MathText text={question.stem} />
        </p>

        <div className="grid gap-2.5" role="radiogroup" aria-label="گزینه‌های سؤال">
          {question.options.map((opt) => {
            const isSelected = selected === opt.key;
            const isCorrect = correctOption === opt.key;
            const isWrongPick = feedback && isSelected && !isCorrect;
            return (
              <button
                key={opt.key}
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={pending || Boolean(feedback) || finished}
                onClick={() => {
                  setSelected(opt.key);
                  if (isPlacement) {
                    // جایابی: ثبت فوری با کلید صریح گزینه (بدون وابستگی به state کهنه)
                    setTimeout(() => submit(null, opt.key), 150);
                  }
                }}
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl border p-3.5 text-right text-sm leading-6 transition-all",
                  !feedback && "cursor-pointer hover:border-primary/50 hover:bg-secondary/50",
                  isSelected && !feedback && "border-primary bg-primary/5 ring-1 ring-primary/30",
                  feedback && isCorrect && "border-emerald-500 bg-emerald-50",
                  feedback && isWrongPick && "border-rose-500 bg-rose-50",
                  feedback && !isCorrect && !isWrongPick && "opacity-60",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs font-bold",
                    isSelected && !feedback && "border-primary bg-primary text-white",
                    feedback && isCorrect && "border-emerald-500 bg-emerald-500 text-white",
                    feedback && isWrongPick && "border-rose-500 bg-rose-500 text-white",
                  )}
                >
                  {opt.key}
                </span>
                <span className="flex-1">
                  <MathText text={opt.text} />
                </span>
                {feedback && isCorrect && <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden />}
                {feedback && isWrongPick && <XCircle className="h-5 w-5 shrink-0 text-rose-600" aria-hidden />}
              </button>
            );
          })}
        </div>

        {/* اعلام اعتماد — فقط تمرین، پس از انتخاب (D14) */}
        {!isPlacement && selected && !feedback && (
          <div className="mt-5 rounded-xl bg-secondary/50 p-4">
            <p className="mb-3 text-xs font-medium text-secondary-foreground">پاسخت را با چه اعتمادی ثبت کنم؟</p>
            <div className="flex gap-2">
              <Button size="sm" disabled={pending} className="cursor-pointer gap-2" onClick={() => submit(true)}>
                {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                مطمئن بودم
              </Button>
              <Button size="sm" variant="outline" disabled={pending} className="cursor-pointer gap-2" onClick={() => submit(false)}>
                {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                حدس می‌زدم
              </Button>
            </div>
          </div>
        )}

        {isPlacement && (
          <p className="mt-4 text-center text-[11px] text-muted-foreground">
            در جایابی، درستی پاسخ‌ها تا پایان نمایش داده نمی‌شود — فقط ۴ سؤال تا مشخص شدن سطحت.
          </p>
        )}

        {error && (
          <p className="mt-4 text-xs text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>

      {/* بازخورد تمرین */}
      {feedback && (
        <div
          className={cn(
            "rounded-2xl border p-5",
            feedback.isCorrect ? "border-emerald-200 bg-emerald-50/60" : "border-rose-200 bg-rose-50/60",
          )}
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <span className={cn("flex items-center gap-1.5 text-sm font-bold", feedback.isCorrect ? "text-emerald-700" : "text-rose-700")}>
              {feedback.isCorrect ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : <XCircle className="h-4 w-4" aria-hidden />}
              {feedback.isCorrect ? "درست بود!" : "نادرست بود"}
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              توان تو:
              <span className="font-bold tabular-nums text-foreground">{faRating(feedback.rBefore)}</span>
              <span className={cn("flex items-center gap-0.5 font-bold", rDelta >= 0 ? "text-emerald-600" : "text-rose-600")}>
                {rDelta >= 0 ? <TrendingUp className="h-3.5 w-3.5" aria-hidden /> : <TrendingDown className="h-3.5 w-3.5" aria-hidden />}
                {rDelta >= 0 ? "+" : "−"}
                {faNum(Math.abs(rDelta))}
              </span>
              {feedback.ladder?.moved && (
                <Badge variant="outline" className={feedback.ladder.direction === "up" ? "border-emerald-300 text-emerald-700" : "border-amber-300 text-amber-700"}>
                  {feedback.ladder.direction === "up" ? "ارتقای سطح مبحث" : "افت سطح مبحث"}
                </Badge>
              )}
            </span>
          </div>
          <p className="text-sm leading-7 text-foreground">
            <MathText text={feedback.explanation} />
          </p>
          <Button className="mt-4 w-full cursor-pointer gap-2 sm:w-auto" onClick={loadNext} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ArrowLeft className="h-4 w-4" aria-hidden />}
            سؤال بعدی
          </Button>
        </div>
      )}
    </div>
  );
}
