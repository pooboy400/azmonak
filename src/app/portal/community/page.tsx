import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getCommunityData, searchUsers } from "@/lib/queries/portal";
import { UserAvatar } from "@/components/site/user-avatar";
import {
  SearchForm,
  AddFriendButton,
  RespondRequestButtons,
  JoinClassButton,
  LeaveClassButton,
  JoinByCodeForm,
} from "@/components/portal/community-forms";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { faNum } from "@/lib/fa";
import { cohortLabel } from "@/lib/labels";
import { Check, Clock, Handshake, Lock, LockKeyhole, School, UserPlus, Users } from "lucide-react";

export const metadata: Metadata = { title: "کامیونیتی" };

// کامیونیتی — دوستان، درخواست‌ها و کلاس‌ها (سند طراحی فرانت v2.1)
// حریم خصوصی: لقب و آواتار نمایش داده می‌شود؛ شماره/ایمیل هرگز.

export default async function CommunityPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await requireUser();
  const { q } = await searchParams;
  const [data, results] = await Promise.all([getCommunityData(user.id), q ? searchUsers(user.id, q) : Promise.resolve([])]);

  return (
    <div className="space-y-6">
      <h1 className="flex items-center gap-2 text-xl font-bold">
        <Users className="h-5 w-5 text-primary" aria-hidden />
        کامیونیتی
      </h1>

      {/* جست‌وجو و افزودن دوست */}
      <Card className="border-border/70">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <UserPlus className="h-4 w-4 text-primary" aria-hidden />
            افزودن دوست
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <SearchForm defaultQuery={q ?? ""} />
          {q && (
            <div className="space-y-2">
              {results.length === 0 ? (
                <p className="text-xs text-muted-foreground">کاربری با این آیدی یا لقب پیدا نشد.</p>
              ) : (
                results.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 p-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <UserAvatar src={r.avatarUrl} nickname={r.nickname} size={36} />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{r.nickname}</div>
                        {r.username && (
                          <code dir="ltr" className="text-[11px] text-muted-foreground">@{r.username}</code>
                        )}
                        {r.relation === "friend" && <Badge variant="secondary" className="mt-0.5 mr-2 text-[10px]">دوست</Badge>}
                        {r.relation === "pending" && <Badge variant="outline" className="mt-0.5 mr-2 text-[10px]">در انتظار</Badge>}
                      </div>
                    </div>
                    {r.relation === "none" && r.username && <AddFriendButton username={r.username} />}
                  </div>
                ))
              )}
              <p className="text-[11px] text-muted-foreground">برای درخواست دوستی دقیق، آیدی را کامل وارد کن — جست‌وجوی دقیق فقط با آیدی ممکن است.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* درخواست‌های دریافتی */}
      {data.incoming.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-amber-800">
              <Clock className="h-4 w-4" aria-hidden />
              درخواست‌های دوستی ({faNum(data.incoming.length)})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.incoming.map((req) => (
              <div key={req.friendshipId} className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-background p-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <UserAvatar src={req.avatarUrl} nickname={req.nickname} size={36} />
                  <span className="truncate text-sm font-medium">{req.nickname}</span>
                </div>
                <RespondRequestButtons friendshipId={req.friendshipId} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* دوستان */}
      <section aria-label="دوستان">
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold">
          <Handshake className="h-4 w-4 text-primary" aria-hidden />
          دوستان ({faNum(data.friends.length)})
        </h2>
        {data.friends.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
            هنوز دوستی نداری — با جست‌وجوی آیدی یا لقب بالا دوستانت را پیدا کن.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.friends.map((f) => (
              <Link key={f.id} href={f.username ? `/portal/u/${f.username}` : "/portal/community"} className="rounded-xl transition-shadow hover:shadow-md">
                <Card className="border-border/70 h-full">
                  <CardContent className="flex items-center gap-3 p-4">
                    <UserAvatar src={f.avatarUrl} nickname={f.nickname} size={42} />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold">{f.nickname}</div>
                      {f.username && <code dir="ltr" className="text-[10px] text-muted-foreground">@{f.username}</code>}
                      <div className="mt-0.5 text-[11px] text-muted-foreground">{cohortLabel(f.grade, f.major)}</div>
                      <div className="mt-1 text-[10px] text-muted-foreground">
                        {f.privacy === "PUBLIC" ? (
                          <span className="inline-flex items-center gap-1">
                            <Check className="h-3 w-3 text-emerald-600" aria-hidden />
                            لیدربرد عمومی
                          </span>
                        ) : f.privacy === "FRIENDS" ? (
                          <span className="inline-flex items-center gap-1">
                            <LockKeyhole className="h-3 w-3" aria-hidden />
                            فقط دوستان
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            <Lock className="h-3 w-3" aria-hidden />
                            خصوصی
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* کلاس‌ها */}
      <section aria-label="کلاس‌ها">
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold">
          <School className="h-4 w-4 text-primary" aria-hidden />
          کلاس‌ها
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {data.classes.map((c) => (
            <Card key={c.id} className="border-border/70">
              <CardContent className="space-y-2.5 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-bold">{c.name}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      دبیر: {c.teacherName} · {faNum(c.memberCount)} عضو
                    </div>
                  </div>
                  {c.isMember && <Badge variant="secondary">عضو</Badge>}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <code dir="ltr" className="rounded bg-muted px-2 py-1 text-[11px]">{c.code}</code>
                  {c.isMember ? <LeaveClassButton classId={c.id} /> : <JoinClassButton code={c.code} />}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {data.outgoing.length > 0 && (
          <p className="mt-4 text-[11px] text-muted-foreground">
            درخواست‌های در انتظار پاسخ: {data.outgoing.map((o) => o.nickname).join("، ")}
          </p>
        )}
        <div className="mt-4">
          <JoinByCodeForm />
        </div>
      </section>
    </div>
  );
}
