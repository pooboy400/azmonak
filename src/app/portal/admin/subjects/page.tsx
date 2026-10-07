import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getAdminSubjects } from "@/lib/queries/admin";
import { faNum } from "@/lib/fa";
import { cohortLabel, majorLabel, sharedMajorLabel } from "@/lib/labels";
import { AddTopicDialog, CreateSubjectForm, DeleteTopicButton, ToggleSubjectActiveButton } from "@/components/portal/admin-forms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, BookOpen, CircleSlash, Plus } from "lucide-react";

export const metadata: Metadata = { title: "مدیریت درس‌ها" };

// مدیریت درس‌ها — ساخت درس، فعال/غیرفعال، مدیریت مبحث‌ها
export default async function AdminSubjectsPage() {
  await requireRole(["ADMIN"]);
  const subjects = await getAdminSubjects();

  const majorText = (m: string | null) => (!m ? "عمومی" : m.includes(",") ? sharedMajorLabel(m) : majorLabel(m));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button asChild size="sm" variant="ghost" className="cursor-pointer gap-1 text-muted-foreground">
            <Link href="/portal/admin">
              <ArrowRight className="h-4 w-4" aria-hidden />
              نمای کلی
            </Link>
          </Button>
          <h1 className="flex items-center gap-2 text-lg font-bold">
            <BookOpen className="h-5 w-5 text-primary" aria-hidden />
            مدیریت درس‌ها
          </h1>
        </div>
        <CreateSubjectForm />
      </div>

      <div className="space-y-3">
        {subjects.map((s) => (
          <Card key={s.id} className={`border-border/70 ${s.isActive ? "" : "opacity-70"}`}>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold">{s.title}</span>
                    <code dir="ltr" className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
                      {s.code}
                    </code>
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      {cohortLabel(s.grade, s.major)}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      {majorText(s.major)}
                    </Badge>
                    {s.isSample && (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        نمونه
                      </Badge>
                    )}
                    {!s.isActive && (
                      <Badge variant="outline" className="gap-1 text-[10px] text-rose-700">
                        <CircleSlash className="h-3 w-3" aria-hidden />
                        غیرفعال
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {faNum(s.topicCount)} مبحث · {faNum(s.questionCount)} سؤال ({faNum(s.approvedCount)} تأییدشده)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <AddTopicDialog subjectId={s.id} subjectTitle={s.title} />
                  <ToggleSubjectActiveButton subjectId={s.id} isActive={s.isActive} />
                </div>
              </div>

              {/* مبحث‌ها */}
              {s.topics.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border/60 pt-3">
                  {s.topics.map((t) => (
                    <span
                      key={t.id}
                      className="inline-flex items-center gap-1 rounded-full bg-secondary/70 py-1 pl-1.5 pr-3 text-[11px]"
                    >
                      {t.title}
                      <span className="text-[10px] text-muted-foreground">({faNum(t.questionCount)})</span>
                      <DeleteTopicButton topicId={t.id} topicTitle={t.title} questionCount={t.questionCount} />
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
