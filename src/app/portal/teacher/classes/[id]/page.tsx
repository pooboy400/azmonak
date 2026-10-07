import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { canManageClass, getTeacherClassDetail } from "@/lib/queries/teacher";
import { faNum, faScore } from "@/lib/fa";
import { faDate, gradeLabel, majorLabel } from "@/lib/labels";
import { CopyCodeButton, CreateAssignmentForm, DeleteAssignmentButton, DeleteClassButton, RemoveMemberButton } from "@/components/portal/teacher-forms";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowRight, CalendarClock, CheckCircle2, ClipboardList, Circle, School, Users } from "lucide-react";

export const metadata: Metadata = { title: "مدیریت کلاس" };

// جزئیات کلاس — فقط معلمِ صاحب کلاس (یا ادمین)
export default async function TeacherClassPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRole(["TEACHER", "ADMIN"]);
  if (!(await canManageClass(id, user.id, user.role))) redirect("/portal/teacher");

  const data = await getTeacherClassDetail(id);
  if (!data) notFound();

  return (
    <div className="space-y-6">
      <Link href="/portal/teacher" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        بازگشت به پنل معلم
      </Link>

      {/* سربرگ کلاس */}
      <Card className="border-border/70">
        <CardContent className="flex flex-wrap items-start justify-between gap-4 p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-primary">
              <School className="h-6 w-6" aria-hidden />
            </span>
            <div>
              <h1 className="text-lg font-bold sm:text-xl">{data.klass.name}</h1>
              <p className="mt-1 text-xs text-muted-foreground">
                {gradeLabel(data.klass.grade)} · {majorLabel(data.klass.major)} · {faNum(data.members.length)} عضو
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <code dir="ltr" className="rounded bg-muted px-2 py-1 text-xs font-bold tracking-wider">
                  {data.klass.code}
                </code>
                <CopyCodeButton code={data.klass.code} />
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <CreateAssignmentForm classId={data.klass.id} subjects={data.assignableSubjects} />
            <DeleteClassButton classId={data.klass.id} className={data.klass.name} />
          </div>
        </CardContent>
      </Card>

      {/* تمرین‌ها */}
      <section aria-label="تمرین‌های کلاس" className="space-y-3">
        <h2 className="flex items-center gap-2 text-base font-bold">
          <ClipboardList className="h-4 w-4 text-primary" aria-hidden />
          تمرین‌های کلاس
        </h2>
        {data.assignments.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              هنوز تمرینی ندادی — با «تمرین جدید» یک تمرین برای همین کوهورت کلاس بساز.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {data.assignments.map((a) => {
              const doneCount = a.completions.length;
              const pendingCount = data.members.length - doneCount;
              return (
                <Card key={a.id} className="border-border/70">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-bold">{a.title}</div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                          <span>{a.subjectTitle}</span>
                          <span aria-hidden>·</span>
                          <span>{faNum(a.questionCount)} سؤال</span>
                          {a.dueAt && (
                            <>
                              <span aria-hidden>·</span>
                              <span className="flex items-center gap-1">
                                <CalendarClock className="h-3 w-3" aria-hidden />
                                مهلت: {faDate(a.dueAt)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="gap-1">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" aria-hidden />
                          {faNum(doneCount)} انجام‌شده
                        </Badge>
                        {pendingCount > 0 && (
                          <Badge variant="outline" className="gap-1 text-muted-foreground">
                            <Circle className="h-3 w-3" aria-hidden />
                            {faNum(pendingCount)} مانده
                          </Badge>
                        )}
                        <DeleteAssignmentButton assignmentId={a.id} title={a.title} />
                      </div>
                    </div>
                    {a.completions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 border-t border-border/60 pt-2">
                        {a.completions.map((c) => (
                          <Badge
                            key={c.studentId}
                            variant="outline"
                            className="gap-1 bg-emerald-50 text-[11px] text-emerald-800"
                          >
                            {c.nickname}
                            {c.score !== null && ` — ${faScore(c.score)}`}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* اعضا و پیشرفت */}
      <section aria-label="دانش‌آموزهای کلاس" className="space-y-3">
        <h2 className="flex items-center gap-2 text-base font-bold">
          <Users className="h-4 w-4 text-primary" aria-hidden />
          دانش‌آموزها و پیشرفت
        </h2>
        {data.members.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              هنوز کسی با کد پیوستن وارد کلاس نشده است.
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/70">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">دانش‌آموز</TableHead>
                    <TableHead className="text-right">عضویت</TableHead>
                    <TableHead className="text-center">جلسهٔ کامل</TableHead>
                    <TableHead className="text-center">پاسخ</TableHead>
                    <TableHead className="text-center">میانگین نمره</TableHead>
                    <TableHead className="text-center">آخرین فعالیت</TableHead>
                    <TableHead className="text-left">مدیریت</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.members.map((m) => (
                    <TableRow key={m.studentId}>
                      <TableCell>
                        <div className="text-sm font-medium">{m.nickname}</div>
                        {m.username && (
                          <code dir="ltr" className="text-[10px] text-muted-foreground">
                            @{m.username}
                          </code>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{faDate(m.joinedAt)}</TableCell>
                      <TableCell className="text-center text-sm">{faNum(m.completedSessions)}</TableCell>
                      <TableCell className="text-center text-sm">{faNum(m.attempts)}</TableCell>
                      <TableCell className="text-center text-sm">
                        {m.avgScore === null ? "—" : faScore(m.avgScore)}
                      </TableCell>
                      <TableCell className="text-center text-xs text-muted-foreground">
                        {m.lastActivityAt ? faDate(m.lastActivityAt) : "—"}
                      </TableCell>
                      <TableCell className="text-left">
                        <RemoveMemberButton classId={data.klass.id} studentId={m.studentId} nickname={m.nickname} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
