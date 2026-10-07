import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getAdminQuestions } from "@/lib/queries/admin";
import { getAdminSubjectsForQuestion } from "@/lib/queries/admin";
import { faNum, faRating } from "@/lib/fa";
import { faDate } from "@/lib/labels";
import { CreateQuestionForm, QuestionStatusButtons } from "@/components/portal/admin-forms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, FileQuestion, Plus } from "lucide-react";

export const metadata: Metadata = { title: "بانک سؤال" };

const statusChip: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "پیش‌نویس", className: "bg-secondary text-secondary-foreground hover:bg-secondary" },
  IN_REVIEW: { label: "در بررسی", className: "bg-sky-100 text-sky-800 hover:bg-sky-100" },
  APPROVED: { label: "تأییدشده", className: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" },
  RETIRED: { label: "بازنشسته", className: "bg-rose-100 text-rose-800 hover:bg-rose-100" },
};
const diffLabel: Record<string, string> = { EASY: "آسان", MEDIUM: "متوسط", HARD: "سخت" };

// بانک سؤال — فیلتر، صفحه‌بندی، تغییر وضعیت چرخهٔ G6
export default async function AdminQuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string; status?: string; difficulty?: string; q?: string; page?: string }>;
}) {
  await requireRole(["ADMIN"]);
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const perPage = 20;
  const [{ rows, total }, subjects] = await Promise.all([
    getAdminQuestions({ subjectId: sp.subject, status: sp.status, difficulty: sp.difficulty, q: sp.q }, page, perPage),
    getAdminSubjectsForQuestion(),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / perPage));

  const qs = (over: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { subject: sp.subject, status: sp.status, difficulty: sp.difficulty, q: sp.q, ...over };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    return `/portal/admin/questions?${params.toString()}`;
  };

  const chipBase = "inline-flex cursor-pointer items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors";

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
            <FileQuestion className="h-5 w-5 text-primary" aria-hidden />
            بانک سؤال
          </h1>
        </div>
        <Button asChild className="cursor-pointer gap-2">
          <Link href="/portal/admin/questions/new">
            <Plus className="h-4 w-4" aria-hidden />
            سؤال جدید
          </Link>
        </Button>
      </div>

      {/* فیلترها */}
      <div className="flex flex-wrap items-center gap-2">
        <Link href={qs({ page: "1", subject: undefined })} className={`${chipBase} ${!sp.subject ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-secondary/60"}`}>
          همهٔ درس‌ها
        </Link>
        {subjects.map((s) => (
          <Link key={s.id} href={qs({ page: "1", subject: s.id })} className={`${chipBase} ${sp.subject === s.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-secondary/60"}`}>
            {s.title}
          </Link>
        ))}
        <span className="mx-1 h-4 w-px bg-border" aria-hidden />
        {["", "APPROVED", "DRAFT", "RETIRED"].map((st) => (
          <Link
            key={st || "all"}
            href={qs({ page: "1", status: st || undefined })}
            className={`${chipBase} ${(sp.status ?? "") === st ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-secondary/60"}`}
          >
            {st === "" ? "همهٔ وضعیت‌ها" : statusChip[st].label}
          </Link>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        {faNum(total)} سؤال — صفحهٔ {faNum(page)} از {faNum(pageCount)}
      </p>

      {/* فهرست سؤال‌ها */}
      <div className="space-y-2.5">
        {rows.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">با این فیلتر سؤالی پیدا نشد.</CardContent>
          </Card>
        ) : (
          rows.map((q) => {
            const chip = statusChip[q.status] ?? statusChip.DRAFT;
            return (
              <Card key={q.id} className="border-border/70">
                <CardContent className="space-y-2.5 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <code dir="ltr" className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
                        {q.qid}
                      </code>
                      <Badge className={`text-[10px] ${chip.className}`}>{chip.label}</Badge>
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        {q.subjectTitle}
                      </Badge>
                      {q.topicTitle && (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          {q.topicTitle}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        {diffLabel[q.difficulty] ?? q.difficulty}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        رتبینگ {faRating(q.rating)} · {faNum(q.ratingCount)} پاسخ
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{faDate(q.createdAt)}</span>
                  </div>
                  <p className="line-clamp-2 text-sm leading-6 text-foreground">{q.stem}</p>
                  <div className="border-t border-border/60 pt-2">
                    <QuestionStatusButtons questionId={q.id} status={q.status} />
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* صفحه‌بندی */}
      <div className="flex items-center justify-between">
        {page > 1 ? (
          <Button asChild variant="outline" size="sm" className="cursor-pointer">
            <Link href={qs({ page: String(page - 1) })}>صفحهٔ قبل</Link>
          </Button>
        ) : (
          <span />
        )}
        {page < pageCount && (
          <Button asChild variant="outline" size="sm" className="cursor-pointer">
            <Link href={qs({ page: String(page + 1) })}>صفحهٔ بعد</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
