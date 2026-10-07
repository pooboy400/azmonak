import type { Metadata } from "next";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getDashboardData, type PortalSubject } from "@/lib/queries/portal";
import { getSetting } from "@/lib/queries/site";
import { faNum, faScore } from "@/lib/fa";
import { cohortLabel, faDate, gradeLabel, majorLabel, sessionTypeLabel } from "@/lib/labels";
import { StartExamButton, StartAssignmentButton } from "@/components/portal/start-exam-button";
import { UserAvatar } from "@/components/site/user-avatar";
import { DbIcon, getTone } from "@/lib/icon-map";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowUpRight,
  ArrowDownRight,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  GraduationCap,
  ListChecks,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";

export const metadata: Metadata = { title: "داشبورد" };

const faNumLocal = faNum;

export default async function PortalDashboardPage() {
  const user = await getSessionUser();

  if (!user) {
    // مهمان — معرفی کوتاه پورتال + CTA ورود
    const siteName = await getSetting("site.name", "آزمونک");
    return (
      <div className="py-14 text-center">
        <h1 className="mb-3 text-2xl font-bold sm:text-3xl">به پورتال {siteName} خوش آمدی</h1>
        <p className="mx-auto mb-8 max-w-md text-sm leading-7 text-muted-foreground">
          آزمون تطبیقی با موتور Elo، نردبان سطح هر مبحث، مرور فاصله‌دار و لیدربرد هفتگی. با شماره موبایل وارد شو — حساب
          داشتن هم لازم نیست، اولین ورود همان ثبت‌نام است.
        </p>
        <Button asChild size="lg" className="cursor-pointer">
          <Link href="/portal/login">ورود با شماره موبایل</Link>
        </Button>
      </div>
    );
  }

  const data = await getDashboardData(user.id);

  const statItems = [
    { icon: CalendarCheck, label: "مرور امروز", value: faNumLocal(data.dueReviews) },
    { icon: ListChecks, label: "پاسخ ثبت‌شده", value: faNumLocal(data.totals.attempts) },
    { icon: Target, label: "جلسه کامل‌شده", value: faNumLocal(data.totals.completedSessions) },
    { icon: TrendingUp, label: "میانگین نمره", value: data.totals.avgScore === null ? "—" : faScore(data.totals.avgScore) },
  ];

  return (
    <div className="space-y-8">
      {/* سلام + پیشنهاد تکمیل پروفایل */}
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <UserAvatar src={data.user.avatarUrl} nickname={data.user.nickname} size={52} />
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">سلام {data.user.nickname}</h1>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              {data.user.grade
                ? `${gradeLabel(data.user.grade)} · ${majorLabel(data.user.major)}`
                : "پایه و رشته‌ات را مشخص کن تا درس‌هایت را ببینی"}
            </p>
          </div>
        </div>
        {data.needsOnboarding && (
          <Button asChild variant="outline" className="cursor-pointer gap-2">
            <Link href="/portal/profile">
              <GraduationCap className="h-4 w-4" aria-hidden />
              تکمیل پروفایل
            </Link>
          </Button>
        )}
      </section>

      {/* آمار کلی */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="آمار کلی">
        {statItems.map((s) => (
          <Card key={s.label} className="border-border/70">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-xl bg-secondary p-2.5 text-primary">
                <s.icon className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <div className="text-lg font-bold leading-6">{s.value}</div>
                <div className="text-[11px] text-muted-foreground">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* تمرین‌های کلاسی */}
      {data.classAssignments.length > 0 && (
        <section aria-label="تمرین‌های کلاسی">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
            <ClipboardList className="h-5 w-5 text-primary" aria-hidden />
            تمرین‌های کلاسی
          </h2>
          <div className="space-y-2">
            {data.classAssignments.map((a) => (
              <Card key={a.id} className="border-border/70">
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-secondary p-2 text-primary">
                      <ClipboardList className="h-4 w-4" aria-hidden />
                    </div>
                    <div>
                      <div className="text-sm font-medium">{a.title}</div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        {a.className} · {a.teacherName} · {a.subjectTitle} · {faNumLocal(a.questionCount)} سؤال
                        {a.dueAt && ` · مهلت ${faDate(a.dueAt)}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.completed ? (
                      <Badge className="gap-1 bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                        {a.score !== null ? `انجام‌شده — ${faScore(a.score)}` : "انجام‌شده"}
                      </Badge>
                    ) : a.activeSessionId ? (
                      <Button asChild size="sm" variant="outline" className="cursor-pointer">
                        <Link href={`/portal/exam/${a.activeSessionId}`}>ادامه تمرین</Link>
                      </Button>
                    ) : (
                      <StartAssignmentButton assignmentId={a.id} />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* درس‌ها */}
      <section aria-label="درس‌های من">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <BookOpen className="h-5 w-5 text-primary" aria-hidden />
            درس‌های من
          </h2>
          <Link href="/portal/leaderboard" className="flex items-center gap-1 text-xs text-primary hover:underline">
            لیدربرد کامل
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
        {data.subjects.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              {data.needsOnboarding
                ? "برای دیدن درس‌ها، پایه و رشته‌ات را در پروفایل انتخاب کن."
                : "هنوز درسی برای پایه و رشته‌ات فعال نشده است."}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.subjects.map((s) => (
              <SubjectCard key={s.id} subject={s} forecast={data.forecasts[s.id]} />
            ))}
          </div>
        )}
      </section>

      {/* جلسه‌های اخیر */}
      <section aria-label="جلسه‌های اخیر">
        <h2 className="mb-4 text-lg font-bold">جلسه‌های اخیر</h2>
        {data.recentSessions.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              هنوز جلسه‌ای شروع نکرده‌ای. از کارت‌های بالا یکی از درس‌ها را شروع کن!
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {data.recentSessions.map((s) => (
              <Card key={s.id} className="border-border/70">
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-secondary p-2 text-primary">
                      <Target className="h-4 w-4" aria-hidden />
                    </div>
                    <div>
                      <div className="text-sm font-medium">{s.subjectTitle}</div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        {sessionTypeLabel(s.type)} · {faNumLocal(s.correctCount)} از {faNumLocal(s.questionCount)} درست
                        {s.status === "ACTIVE" ? " · در جریان" : s.status === "ABANDONED" ? " · رهاشده" : ""}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {s.score !== null && <Badge variant="secondary">{faScore(s.score)}</Badge>}
                    {s.status === "ACTIVE" ? (
                      <Button asChild size="sm" variant="outline" className="cursor-pointer">
                        <Link href={`/portal/exam/${s.id}`}>ادامه</Link>
                      </Button>
                    ) : s.status === "COMPLETED" ? (
                      <Button asChild size="sm" variant="ghost" className="cursor-pointer">
                        <Link href={`/portal/exam/${s.id}`}>مرور نتیجه</Link>
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SubjectCard({ subject, forecast }: { subject: PortalSubject; forecast?: import("@/lib/engine/predict").ScoreForecast }) {
  const tone = getTone(subject.colorKey);
  const hasAbility = subject.rating !== null;

  return (
    <Card className="flex h-full flex-col border-border/70 transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone.iconBox} ${tone.iconText}`}>
              <DbIcon k={subject.iconKey} className="h-5 w-5" />
            </span>
            <div>
              <CardTitle className="text-base">
                <Link href={`/portal/subjects/${subject.id}`} className="hover:text-primary hover:underline">
                  {subject.title}
                </Link>
              </CardTitle>
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                {cohortLabel(subject.grade, subject.major)} · {faNumLocal(subject.questionCount)} سؤال
              </div>
            </div>
          </div>
          {subject.dueReviews > 0 && (
            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
              {faNumLocal(subject.dueReviews)} مرور
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="mt-auto space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">توان فعلی</span>
          {hasAbility ? (
            <span className="font-bold text-foreground">{faNumLocal(subject.rating ?? 0)}</span>
          ) : (
            <span className="text-muted-foreground">جایابی نشده</span>
          )}
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">جلسه کامل‌شده</span>
          <span className="text-foreground">
            {faNumLocal(subject.completedSessions)}
            {subject.bestScore !== null && ` · بهترین ${faScore(subject.bestScore)}`}
          </span>
        </div>
        {forecast?.available && (
          <div className="flex items-center gap-1.5 rounded-lg bg-secondary/70 px-2.5 py-1.5 text-[11px] text-secondary-foreground">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            پیش‌بینی جلسه بعد: {faScore(forecast.forecast ?? 0)}
            {forecast.direction === "up" ? (
              <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
            ) : (
              <ArrowDownRight className="h-3.5 w-3.5 text-rose-600" aria-hidden />
            )}
          </div>
        )}
        <StartExamButton
          subjectId={subject.id}
          activeSessionId={subject.activeSessionId}
          isPlacement={!hasAbility}
          label={subject.activeSessionId ? "ادامه جلسه" : hasAbility ? "شروع تمرین" : "شروع جایابی"}
          variant={hasAbility ? "default" : "default"}
          size="sm"
        />
      </CardContent>
    </Card>
  );
}
