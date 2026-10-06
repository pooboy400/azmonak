import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getPublicProfile } from "@/lib/queries/portal";
import { UserAvatar } from "@/components/site/user-avatar";
import { AddFriendButton } from "@/components/portal/community-forms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { faNum, faRating, faScore } from "@/lib/fa";
import { cohortLabel } from "@/lib/labels";
import { BarChart3, ListChecks, Lock, LockKeyhole, Target, TrendingUp, UserSearch } from "lucide-react";

export const metadata: Metadata = { title: "پروفایل کاربر" };

// پروفایل عمومی با آیدی (تلگرام‌مانند) — همیشه با رعایت privacy کاربر هدف:
// PUBLIC برای همهٔ واردشده‌ها، FRIENDS فقط دوستان، PRIVATE فقط خودِ کاربر.
export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const viewer = await requireUser();
  const { username } = await params;
  const data = await getPublicProfile(viewer.id, decodeURIComponent(username));
  if (!data) notFound();

  const { user: target } = data;

  if (data.status === "private" || data.status === "friends_only") {
    return (
      <div className="py-16 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-primary">
          {data.status === "private" ? <Lock className="h-6 w-6" aria-hidden /> : <LockKeyhole className="h-6 w-6" aria-hidden />}
        </div>
        <h1 className="text-lg font-bold">{target.nickname}</h1>
        {target.username && (
          <code dir="ltr" className="mt-1 inline-block text-xs text-muted-foreground">
            @{target.username}
          </code>
        )}
        <p className="mx-auto mt-4 max-w-sm text-sm leading-7 text-muted-foreground">
          {data.status === "private"
            ? "این کاربر پروفایلش را کاملاً خصوصی کرده است."
            : "پروفایل این کاربر فقط برای دوستانش باز است. اگر دوستش هستی، از اینجا درخواست بفرست."}
        </p>
        {!data.isSelf && data.relation === "none" && target.username && (
          <div className="mt-4 flex justify-center">
            <AddFriendButton username={target.username} />
          </div>
        )}
      </div>
    );
  }

  const stats = data.stats;
  const statItems = [
    { icon: Target, label: "جلسه کامل‌شده", value: faNum(stats?.completedSessions ?? 0) },
    { icon: ListChecks, label: "پاسخ ثبت‌شده", value: faNum(stats?.attempts ?? 0) },
    {
      icon: TrendingUp,
      label: "میانگین نمره",
      value: stats?.avgScore == null ? "—" : faScore(stats.avgScore),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <UserAvatar src={target.avatarUrl} nickname={target.nickname} size={64} />
        <div className="min-w-0">
          <h1 className="text-xl font-bold">{target.nickname}</h1>
          {target.username && (
            <code dir="ltr" className="mt-1 inline-block rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
              @{target.username}
            </code>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            {target.grade ? cohortLabel(target.grade, target.major) : "دانش‌آموز"}
          </p>
        </div>
        <div className="ms-auto">
          {data.isSelf ? (
            <Button asChild variant="outline" className="cursor-pointer">
              <Link href="/portal/profile">ویرایش پروفایل من</Link>
            </Button>
          ) : data.relation === "friend" ? (
            <Badge variant="secondary" className="px-3 py-1.5">دوست توست</Badge>
          ) : target.username && data.relation === "none" ? (
            <AddFriendButton username={target.username} />
          ) : (
            <Badge variant="outline" className="px-3 py-1.5">درخواست ثبت شده</Badge>
          )}
        </div>
      </div>

      {data.status === "ok" && stats && (
        <>
          {/* آمار */}
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="آمار کلی">
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

          {/* توان درس‌ها */}
          {stats.abilities.length > 0 && (
            <section aria-label="توان در درس‌ها">
              <h2 className="mb-3 flex items-center gap-2 text-base font-bold">
                <BarChart3 className="h-4 w-4 text-primary" aria-hidden />
                توان در درس‌ها
              </h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {stats.abilities.map((a) => (
                  <Card key={a.subjectTitle} className="border-border/70">
                    <CardContent className="flex items-center justify-between p-3.5">
                      <div>
                        <div className="text-sm font-medium">{a.subjectTitle}</div>
                        <div className="mt-0.5 text-[11px] text-muted-foreground">{faNum(a.answeredCount)} پاسخ</div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {faRating(a.rating)}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* راهنمای آیدی */}
      <Card className="border-border/70 bg-muted/30">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <UserSearch className="h-4 w-4 text-primary" aria-hidden />
            آیدی چیست؟
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs leading-6 text-muted-foreground">
          آیدی <code dir="ltr"> @{target.username} </code> شناسهٔ یکتای این کاربر است؛ با آن می‌توانی او را در کامیونیتی جست‌وجو و درخواست دوستی بفرستی.
          نام نمایشی برخلاف آیدی می‌تواند بین کاربران تکراری باشد.
        </CardContent>
      </Card>
    </div>
  );
}
