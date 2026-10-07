import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getSubjectDetail, isSubjectVisibleTo, type SubjectTopicRow } from "@/lib/queries/portal";
import { faNum, faRating, faScore } from "@/lib/fa";
import { faDate, gradeLabel, majorLabel, sharedMajorLabel } from "@/lib/labels";
import { DbIcon, getTone } from "@/lib/icon-map";
import { ProgressTrendChart } from "@/components/portal/progress-trend-chart";
import { StartExamButton } from "@/components/portal/start-exam-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  GraduationCap,
  Layers,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

export const metadata: Metadata = { title: "جزئیات درس" };

// برچسب سطح نردبان D16 — نوار سختی ۱۱۵۰/۱۲۵۰/۱۳۵۰
const levelChip: Record<number, { label: string; className: string }> = {
  1: { label: "سطح ۱ · پایه", className: "bg-amber-100 text-amber-800 hover:bg-amber-100" },
  2: { label: "سطح ۲ · متوسط", className: "bg-primary/10 text-primary hover:bg-primary/10" },
  3: { label: "سطح ۳ · پیشرفته", className: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" },
};

export default async function SubjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/portal/login");

  const data = await getSubjectDetail(user.id, id);
  if (!data) notFound();

  // درسِ خارج از کوهورت کاربر (پایه/رشتهٔ دیگر) → ۴۰۴ — همان قاعدهٔ فیلتر داشبورد
  if (!isSubjectVisibleTo(data.subject, user)) notFound();

  const tone = getTone(data.subject.colorKey);
  const hasAbility = data.ability !== null;
  const majorBadge = !data.subject.major
    ? "درس عمومی"
    : data.subject.major.includes(",")
      ? sharedMajorLabel(data.subject.major)
      : majorLabel(data.subject.major);

  return (
    <div className="space-y-6">
      {/* بازگشت */}
      <Link
        href="/portal"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        بازگشت به داشبورد
      </Link>

      {/* سربرگ درس */}
      <Card className="border-border/70">
        <CardContent className="flex flex-wrap items-start justify-between gap-4 p-5">
          <div className="flex items-center gap-3">
            <span className={`flex h-14 w-14 items-center justify-center rounded-2xl ${tone.iconBox} ${tone.iconText}`}>
              <DbIcon k={data.subject.iconKey} className="h-7 w-7" />
            </span>
            <div>
              <h1 className="text-xl font-bold sm:text-2xl">{data.subject.title}</h1>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                <span>{gradeLabel(data.subject.grade)}</span>
                <span aria-hidden>·</span>
                <span>{majorBadge}</span>
                <span aria-hidden>·</span>
                <span>{faNum(data.subject.questionCount)} سؤال تأییدشده</span>
              </p>
            </div>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <div className="flex flex-wrap items-center gap-2">
              {hasAbility ? (
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Target className="h-3.5 w-3.5" aria-hidden />
                  توان فعلی {faRating(data.ability?.rating ?? 0)}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  جایابی نشده — اولین جلسه ۴ سؤالی است
                </Badge>
              )}
              {data.reviewDueCount > 0 && (
                <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                  {faNum(data.reviewDueCount)} مرور امروز
                </Badge>
              )}
            </div>
            <StartExamButton
              subjectId={data.subject.id}
              activeSessionId={data.activeSessionId}
              isPlacement={!hasAbility}
              label={data.activeSessionId ? "ادامه جلسه" : hasAbility ? "شروع تمرین" : "شروع جایابی"}
              size="default"
            />
          </div>
        </CardContent>
      </Card>

      {/* نمودار روند دولایه (D15) — نمرهٔ جلسه + توان R_s */}
      <Card className="border-border/70">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5 text-primary" aria-hidden />
            روند پیشرفت دو لایه
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            ستون‌ها نمرهٔ جلسه‌های کامل‌شده‌اند و خط، مسیر توان درس (R_s) را نشان می‌دهد.
          </p>
        </CardHeader>
        <CardContent>
          {data.trend.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Layers className="h-8 w-8 text-muted-foreground/60" aria-hidden />
              <p className="text-sm text-muted-foreground">
                هنوز جلسهٔ کاملی در این درس نداری — با اولین جلسه، نمودار روندت شکل می‌گیرد.
              </p>
            </div>
          ) : (
            <>
              <ProgressTrendChart points={data.trend} />
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MiniStat label="جلسهٔ کامل‌شده" value={faNum(data.completedSessions)} />
                <MiniStat label="میانگین نمره" value={data.avgScore === null ? "—" : faScore(data.avgScore)} />
                <MiniStat label="بهترین نمره" value={data.bestScore === null ? "—" : faScore(data.bestScore)} />
                <MiniStat label="پاسخ ثبت‌شده" value={data.ability ? faNum(data.ability.answeredCount) : "۰"} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* مباحث */}
      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-5 w-5 text-primary" aria-hidden />
            مباحث و نردبان سطح
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            هر مبحث نردبان سطح ۱ تا ۳ دارد؛ دو درست پیاپی ارتقا و دو غلط پیاپی افت می‌آورد.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.topics.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">برای این درس هنوز مبحثی ثبت نشده است.</p>
          ) : (
            data.topics.map((t) => <TopicRow key={t.id} topic={t} />)
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-secondary/60 px-3 py-2.5">
      <div className="text-sm font-bold leading-5">{value}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

function TopicRow({ topic }: { topic: SubjectTopicRow }) {
  const chip = topic.level !== null ? levelChip[topic.level] : null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 px-4 py-3">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{topic.title}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
          <span>{faNum(topic.questionCount)} سؤال</span>
          {topic.answeredCount > 0 && (
            <>
              <span aria-hidden>·</span>
              <span>{faNum(topic.answeredCount)} پاسخ تو</span>
            </>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {chip ? (
          <Badge className={`text-[11px] ${chip.className}`}>{chip.label}</Badge>
        ) : (
          <Badge variant="outline" className="text-[11px] text-muted-foreground">
            شروع نشده
          </Badge>
        )}
        {topic.rightStreak >= 1 && (
          <Badge variant="outline" className="gap-1 text-[11px] text-emerald-700">
            <TrendingUp className="h-3 w-3" aria-hidden />
            {faNum(topic.rightStreak)} درست پیاپی
          </Badge>
        )}
        {topic.wrongStreak >= 1 && (
          <Badge variant="outline" className="gap-1 text-[11px] text-rose-700">
            <TrendingDown className="h-3 w-3" aria-hidden />
            {faNum(topic.wrongStreak)} غلط پیاپی
          </Badge>
        )}
        {topic.level === 1 && topic.weaknessCount > 0 && (
          <Badge className="gap-1 bg-amber-100 text-[11px] text-amber-800 hover:bg-amber-100">
            <GraduationCap className="h-3 w-3" aria-hidden />
            نیاز به مطالعه
          </Badge>
        )}
        {topic.reviewDue ? (
          <Badge className="gap-1 bg-amber-100 text-[11px] text-amber-800 hover:bg-amber-100">
            <CalendarClock className="h-3 w-3" aria-hidden />
            مرور امروز
          </Badge>
        ) : topic.reviewRepetitions > 0 && topic.reviewNextAt ? (
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <CalendarClock className="h-3 w-3" aria-hidden />
            مرور بعدی: {faDate(topic.reviewNextAt)}
          </span>
        ) : null}
      </div>
    </div>
  );
}
