import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getExamPageData, getExamResultData } from "@/lib/queries/portal";
import { ExamRunner } from "@/components/portal/exam-runner";
import { AbandonButton, StartExamButton } from "@/components/portal/start-exam-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { faNum, faRating, faScore, faDuration } from "@/lib/fa";
import { faDate } from "@/lib/labels";
import { CheckCircle2, ClipboardList, Crown, Target, TrendingDown, TrendingUp, XCircle } from "lucide-react";

export const metadata: Metadata = { title: "جلسه آزمون" };

export default async function ExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) notFound();

  const data = await getExamPageData(id, user.id);
  if (!data) notFound();

  // جلسه کامل‌شده → صفحه نتیجه
  if (data.session.status === "COMPLETED") {
    const result = await getExamResultData(id, user.id);
    if (!result) notFound();
    return <ResultView result={result} />;
  }

  // جلسه رهاشده → پیام و دکمه شروع مجدد
  if (data.session.status === "ABANDONED") {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <ClipboardList className="mx-auto mb-4 h-10 w-10 text-muted-foreground" aria-hidden />
        <h1 className="mb-2 text-lg font-bold">این جلسه رها شده</h1>
        <p className="mb-6 text-sm leading-7 text-muted-foreground">
          جلسه «{data.session.subjectTitle}» را رها کردی. می‌توانی یک جلسه تازه شروع کنی.
        </p>
        <StartExamButton subjectId={data.session.subjectId} label="شروع جلسه جدید" size="default" />
      </div>
    );
  }

  // جلسه فعال → اجراکننده
  const rDelta = data.session.rEnd !== null ? data.session.rEnd - data.session.rStart : null;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 text-lg font-bold">
          <Target className="h-5 w-5 text-primary" aria-hidden />
          جلسه {data.session.type === "PLACEMENT" ? "جایابی" : "تمرین"} — {data.session.subjectTitle}
        </h1>
        <div className="flex items-center gap-2">
          {rDelta !== null && data.session.rEnd !== null && (
            <Badge variant="secondary" className="gap-1">
              توان: {faRating(data.session.rStart)}
              <span className={rDelta >= 0 ? "text-emerald-600" : "text-rose-600"}>
                {rDelta >= 0 ? "+" : "−"}
                {faNum(Math.abs(rDelta))}
              </span>
            </Badge>
          )}
          <AbandonButton sessionId={data.session.id} />
        </div>
      </div>
      <ExamRunner sessionId={data.session.id} subjectTitle={data.session.subjectTitle} />
    </div>
  );
}

// ================= صفحه نتیجه =================

function ResultView({ result }: { result: NonNullable<Awaited<ReturnType<typeof getExamResultData>>> }) {
  const { session, review, ladderSummary } = result;
  const rDelta = session.rEnd !== null ? session.rEnd - session.rStart : 0;
  const isPlacement = session.type === "PLACEMENT";

  const stats = [
    {
      label: isPlacement ? "توان اولیه تعیین‌شده" : "نمره وزن‌دار جلسه",
      value: isPlacement ? faRating(session.rEnd ?? session.rStart) : faScore(session.score ?? 0),
      sub: isPlacement ? "مبنای شروع آزمون‌های تو" : `${faNum(session.correctCount)} از ${faNum(session.questionCount)} درست`,
    },
    {
      label: "تغییر توان",
      value: `${rDelta >= 0 ? "+" : "−"}${faNum(Math.abs(rDelta))}`,
      sub: `${faRating(session.rStart)} → ${faRating(session.rEnd ?? session.rStart)}`,
    },
    {
      label: "نردبان مباحث",
      value: `${faNum(ladderSummary.up)} ↑ / ${faNum(ladderSummary.down)} ↓`,
      sub: "ارتقا و افت سطح در این جلسه",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-primary">
          <Crown className="h-7 w-7" aria-hidden />
        </div>
        <h1 className="text-xl font-bold sm:text-2xl">
          {isPlacement ? "سطح تو مشخص شد!" : "جلسه تمام شد!"}
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          {session.subjectTitle} · {faDate(session.finishedAt ?? session.startedAt)}
        </p>
      </div>

      {/* آمار جلسه */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="آمار جلسه">
        {stats.map((s) => (
          <Card key={s.label} className="border-border/70">
            <CardContent className="p-4 text-center">
              <div className="mb-1 flex items-center justify-center gap-1.5 text-xl font-bold">
                {s.label === "تغییر توان" &&
                  (rDelta >= 0 ? (
                    <TrendingUp className="h-5 w-5 text-emerald-600" aria-hidden />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-rose-600" aria-hidden />
                  ))}
                {s.value}
              </div>
              <div className="text-xs font-medium text-foreground">{s.label}</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">{s.sub}</div>
            </CardContent>
          </Card>
        ))}
      </section>

      {result.reviewDueCount > 0 && (
        <div className="rounded-xl bg-amber-50 px-4 py-3 text-center text-xs text-amber-800">
          {faNum(result.reviewDueCount)} مبحث برای مرور امروز سرِ موعد است — در داشبورد آماده است.
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-2">
        <Button asChild className="cursor-pointer">
          <Link href="/portal">بازگشت به داشبورد</Link>
        </Button>
        {!isPlacement && (
          <StartExamButton subjectId={session.subjectId} label="تمرین جدید همین درس" variant="outline" />
        )}
        <Button asChild variant="ghost" className="cursor-pointer">
          <Link href="/portal/leaderboard">لیدربرد هفته</Link>
        </Button>
      </div>

      {/* مرور پاسخ‌ها */}
      <section aria-label="مرور پاسخ‌ها">
        <h2 className="mb-3 text-base font-bold">مرور پاسخ‌ها</h2>
        <div className="space-y-3">
          {result.review.map((item) => (
            <Card key={item.order} className={cn("border-border/70", item.isCorrect ? "border-r-4 border-r-emerald-500" : "border-r-4 border-r-rose-500")}>
              <CardContent className="space-y-3 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    سؤال {faNum(item.order)}
                    {item.topicTitle && ` · ${item.topicTitle}`}
                    {` · ${faDuration(item.latencySec)} · ${item.confidentLabel}`}
                  </span>
                  <Badge variant="secondary" className="gap-1">
                    {item.isCorrect ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden /> : <XCircle className="h-3.5 w-3.5 text-rose-600" aria-hidden />}
                    وزن {faNum(item.weight, 1)}
                  </Badge>
                </div>
                <p className="whitespace-pre-line text-sm font-medium leading-7">{item.stem}</p>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {item.options.map((opt) => (
                    <div
                      key={opt.key}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-xs leading-6",
                        opt.key === item.correct && "border-emerald-400 bg-emerald-50 font-medium",
                        opt.key === item.selected && opt.key !== item.correct && "border-rose-400 bg-rose-50",
                        opt.key !== item.correct && opt.key !== item.selected && "opacity-60",
                      )}
                    >
                      <span className="font-bold">{opt.key}.</span> {opt.text}
                      {opt.key === item.selected && (
                        <span className="mr-2 text-[10px] text-muted-foreground">(پاسخ تو)</span>
                      )}
                    </div>
                  ))}
                </div>
                <p className="rounded-lg bg-muted/60 p-3 text-xs leading-6 text-foreground">{item.explanation}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
