import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getProfileData } from "@/lib/queries/portal";
import { ProfileForm } from "@/components/portal/profile-form";
import { UserAvatar } from "@/components/site/user-avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { faNum, faRating, faScore } from "@/lib/fa";
import { gradeLabel, majorLabel } from "@/lib/labels";
import { ListChecks, Target, TrendingUp, BarChart3 } from "lucide-react";

export const metadata: Metadata = { title: "پروفایل" };

// پروفایل — ویرایش لقب/پایه/رشته/حریم خصوصی/آواتار + آمار کلی
export default async function ProfilePage() {
  const user = await requireUser();
  const data = await getProfileData(user.id);
  if (!data) return null;

  const stats = [
    { icon: Target, label: "جلسه کامل‌شده", value: faNum(data.stats.completedSessions) },
    { icon: ListChecks, label: "پاسخ ثبت‌شده", value: faNum(data.stats.attempts) },
    {
      icon: TrendingUp,
      label: "میانگین نمره",
      value: data.stats.avgScore === null ? "—" : faScore(data.stats.avgScore),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <UserAvatar src={data.user.avatarUrl} nickname={data.user.nickname} size={64} />
        <div>
          <h1 className="text-xl font-bold">{data.user.nickname}</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {data.user.grade ? `${gradeLabel(data.user.grade)} · ${majorLabel(data.user.major)}` : "پایه و رشته مشخص نشده"}
            {" · "}
            {data.user.privacy === "PUBLIC" ? "لیدربرد عمومی" : data.user.privacy === "FRIENDS" ? "نمایش فقط برای دوستان" : "کاملاً خصوصی"}
          </p>
        </div>
      </div>

      {/* آمار */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="آمار کلی">
        {stats.map((s) => (
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

      {/* فرم ویرایش */}
      <ProfileForm
        user={{
          nickname: data.user.nickname,
          grade: data.user.grade,
          major: data.user.major,
          privacy: data.user.privacy,
          avatarUrl: data.user.avatarUrl,
        }}
      />

      {/* توان درس‌ها */}
      {data.stats.abilities.length > 0 && (
        <section aria-label="توان در درس‌ها">
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold">
            <BarChart3 className="h-4 w-4 text-primary" aria-hidden />
            توان در درس‌ها
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {data.stats.abilities.map((a) => (
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

      {/* آخرین مباحث فعال */}
      {data.stats.topics.length > 0 && (
        <section aria-label="سطح مباحث">
          <h2 className="mb-3 text-base font-bold">سطح مباحث اخیر</h2>
          <div className="flex flex-wrap gap-2">
            {data.stats.topics.map((t) => (
              <Badge key={`${t.subjectTitle}-${t.topicTitle}`} variant="outline" className="gap-1.5 py-1">
                {t.topicTitle}
                <span className="text-[10px] text-muted-foreground">
                  سطح {faNum(t.level)} · {t.subjectTitle}
                </span>
              </Badge>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
