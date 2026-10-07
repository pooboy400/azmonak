import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getTeacherDashboard } from "@/lib/queries/teacher";
import { faNum } from "@/lib/fa";
import { cohortLabel } from "@/lib/labels";
import { CreateClassForm, CopyCodeButton, DeleteClassButton } from "@/components/portal/teacher-forms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ClipboardList, School, Users } from "lucide-react";

export const metadata: Metadata = { title: "پنل معلم" };

// پنل معلم — فهرست کلاس‌ها + ساخت کلاس؛ جزئیات هر کلاس صفحهٔ جدا دارد.
export default async function TeacherDashboardPage() {
  const user = await requireRole(["TEACHER", "ADMIN"]);
  if (user.role === "ADMIN") {
    // ادمین مدیریت کلاس‌ها را از پنل ادمین دنبال می‌کند — کلاس شخصی ندارد.
    redirect("/portal/admin");
  }
  const data = await getTeacherDashboard(user.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <School className="h-5 w-5 text-primary" aria-hidden />
            پنل معلم
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            کلاس‌هایت را بساز، تمرین بده و پیشرفت دانش‌آموزها را ببین.
          </p>
        </div>
        <CreateClassForm />
      </div>

      <section className="grid grid-cols-3 gap-3" aria-label="آمار معلم">
        <StatCard icon={School} label="کلاس" value={faNum(data.classes.length)} />
        <StatCard icon={Users} label="دانش‌آموز" value={faNum(data.totals.students)} />
        <StatCard icon={ClipboardList} label="تمرین" value={faNum(data.totals.assignments)} />
      </section>

      <section aria-label="کلاس‌های من" className="space-y-3">
        <h2 className="text-base font-bold">کلاس‌های من</h2>
        {data.classes.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <School className="mx-auto mb-3 h-8 w-8 text-muted-foreground/60" aria-hidden />
              <p className="text-sm text-muted-foreground">
                هنوز کلاسی نساخته‌ای — با دکمهٔ «کلاس جدید» اولین کلاست را بساز و کد پیوستن را به دانش‌آموزها بده.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.classes.map((c) => (
              <Card key={c.id} className="flex h-full flex-col border-border/70 transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">
                        <a href={`/portal/teacher/classes/${c.id}`} className="hover:text-primary hover:underline">
                          {c.name}
                        </a>
                      </CardTitle>
                      <div className="mt-1 text-[11px] text-muted-foreground">{cohortLabel(c.grade, c.major)}</div>
                    </div>
                    <Badge variant="secondary" className="gap-1">
                      <Users className="h-3 w-3" aria-hidden />
                      {faNum(c.memberCount)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="mt-auto space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">تمرین‌ها</span>
                    <span className="font-medium">{faNum(c.assignmentCount)}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <code dir="ltr" className="rounded bg-muted px-2 py-1 text-[11px] font-bold tracking-wider">
                      {c.code}
                    </code>
                    <CopyCodeButton code={c.code} />
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-2">
                    <Button asChild size="sm" variant="outline" className="cursor-pointer gap-1">
                      <a href={`/portal/teacher/classes/${c.id}`}>
                        مدیریت کلاس
                        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                      </a>
                    </Button>
                    <DeleteClassButton classId={c.id} className={c.name} />
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

function StatCard({ icon: Icon, label, value }: { icon: typeof School; label: string; value: string }) {
  return (
    <Card className="border-border/70">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="rounded-xl bg-secondary p-2.5 text-primary">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <div className="text-lg font-bold leading-6">{value}</div>
          <div className="text-[11px] text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}
