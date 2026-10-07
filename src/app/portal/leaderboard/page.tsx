import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getWeeklyLeaderboard, getSubjectLeaderboard, getPortalSubjects, type LeaderboardRow } from "@/lib/queries/portal";
import { getActiveSubjects } from "@/lib/queries/site";
import { UserAvatar } from "@/components/site/user-avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { faNum, faRating, faScore } from "@/lib/fa";
import { cohortLabel } from "@/lib/labels";
import { Crown, Medal, Trophy } from "lucide-react";

export const metadata: Metadata = { title: "لیدربرد" };

// لیدربرد کامل پورتال — سه تب: هفتگی (میانگین نمره وزن‌دار D13)،
// کل (رتبینگ سراسری هر کاربر)، و تک‌درس (R_s همان درس)
// حریم خصوصی G10 رعایت می‌شود: PRIVATE فقط خودِ کاربر، FRIENDS فقط برای دوستان.

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; subject?: string }>;
}) {
  const user = await requireUser();
  const { tab = "weekly", subject } = await searchParams;

  const [week, dbSubjects] = await Promise.all([getWeeklyLeaderboard(user.id), getActiveSubjects()]);
  // فقط درس‌هایی که سؤال فعال دارند به‌عنوان تب تک‌درس می‌آیند
  const subjectsWithContent = dbSubjects.filter((s) => s.questionCount > 0);
  const activeSubject = subject ? subjectsWithContent.find((s) => s.id === subject) : null;

  let rows: LeaderboardRow[];
  if (tab === "rating") {
    rows = await getSubjectLeaderboard(user.id, null);
  } else if (tab === "subject" && activeSubject) {
    rows = await getSubjectLeaderboard(user.id, activeSubject.id);
  } else {
    rows = week.rows;
  }

  const tabs = [
    { key: "weekly", label: "این هفته" },
    { key: "rating", label: "کل" },
    ...(subjectsWithContent.length > 0 ? [{ key: "subject", label: activeSubject ? activeSubject.title : "تک‌درس" }] : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <Trophy className="h-5 w-5 text-amber-500" aria-hidden />
          {tab === "weekly" ? "لیدربرد هفتگی" : tab === "rating" ? "رتبینگ کل" : activeSubject ? `لیدربرد ${activeSubject.title}` : "لیدربرد"}
        </h1>
        <p className="text-[11px] text-muted-foreground">
          {tab === "weekly"
            ? "هفته جاری (شنبه تا جمعه) — میانگین نمره وزن‌دار حداقل ۲ جلسه تمرین"
            : tab === "rating"
              ? "توان (Elo) سراسری از آخرین جلسه هر درس"
              : activeSubject
                ? "توان (Elo) همان درس"
                : ""}
        </p>
      </div>

      {/* تب‌ها */}
      <nav className="flex flex-wrap gap-2" aria-label="تب‌های لیدربرد">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/portal/leaderboard?tab=${t.key}${t.key === "subject" && !activeSubject && subjectsWithContent[0] ? `&subject=${subjectsWithContent[0].id}` : t.key === "subject" && activeSubject ? `&subject=${activeSubject.id}` : ""}`}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              tab === t.key
                ? "border-primary bg-primary text-white"
                : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        ))}
        {tab === "subject" &&
          subjectsWithContent.map((s) => (
            <Link
              key={s.id}
              href={`/portal/leaderboard?tab=subject&subject=${s.id}`}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs transition-colors",
                activeSubject?.id === s.id
                  ? "border-primary bg-primary/10 font-medium text-primary"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {s.title}
            </Link>
          ))}
      </nav>

      {/* جدول رتبه‌ها */}
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-10 text-center text-sm text-muted-foreground">
          {tab === "weekly"
            ? "این هفته هنوز کسی با حداقل ۲ جلسه کامل در لیست نیست. اولین باش!"
            : "هنوز رتبینگی برای نمایش نیست — جلسه جایابی اولین قدم است."}
        </div>
      ) : (
        <ol className="space-y-2" aria-label="رتبه‌بندی">
          {rows.map((row) => (
            <LeaderRow key={row.userId} row={row} tab={tab} />
          ))}
        </ol>
      )}
    </div>
  );
}

function LeaderRow({ row, tab }: { row: LeaderboardRow; tab: string }) {
  const isTop = row.rank <= 3;
  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-2xl border bg-card p-3.5",
        row.isViewer && "border-primary/50 bg-primary/5",
        isTop && "shadow-sm",
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold",
          row.rank === 1 && "bg-amber-100 text-amber-700",
          row.rank === 2 && "bg-slate-100 text-slate-600",
          row.rank === 3 && "bg-orange-100 text-orange-700",
          !isTop && "bg-muted text-muted-foreground",
        )}
        aria-label={`رتبه ${faNum(row.rank)}`}
      >
        {row.rank === 1 ? <Crown className="h-4 w-4" aria-hidden /> : row.rank <= 3 ? <Medal className="h-4 w-4" aria-hidden /> : faNum(row.rank)}
      </span>
      <UserAvatar src={row.avatarUrl} nickname={row.nickname} size={40} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-bold">{row.nickname}</span>
          {row.isViewer && <Badge variant="outline" className="border-primary/40 text-[10px] text-primary">تو</Badge>}
        </div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">
          {cohortLabel(row.grade, row.major)}
          {tab !== "weekly" && ` · ${faNum(row.sessionCount)} پاسخ`}
        </div>
      </div>
      <div className="text-left">
        <div className="text-base font-bold tabular-nums">{tab === "weekly" ? faScore(row.value) : faRating(row.value)}</div>
        <div className="text-[10px] text-muted-foreground">{tab === "weekly" ? `${faNum(row.sessionCount)} جلسه` : "توان"}</div>
      </div>
    </li>
  );
}
