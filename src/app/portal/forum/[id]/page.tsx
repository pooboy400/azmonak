import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getForumQuestionDetail } from "@/lib/queries/forum";
import { faDate } from "@/lib/labels";
import { UserAvatar } from "@/components/site/user-avatar";
import { MathText } from "@/components/site/math-text";
import {
  AcceptAnswerButton,
  AnswerForm,
  DeleteAnswerButton,
  DeleteQuestionButton,
  VoteButton,
  ViewCount,
  ViewPing,
} from "@/components/portal/forum-forms";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { BadgeCheck, CircleDot, HelpCircle, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { faNum } from "@/lib/fa";

export const metadata: Metadata = { title: "سؤال انجمن" };

// جزئیات سؤال انجمن — بدنه/پاسخ‌ها با MathText (پشتیبانی LaTeX)؛
// پذیرش پاسخ فقط نویسندهٔ سؤال یا ادمین؛ حذف هم همین‌طور.
export default async function ForumQuestionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  const data = await getForumQuestionDetail(id, user?.id ?? null, user?.role ?? null);
  if (!data) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {user && <ViewPing questionId={data.id} />}

      <Link href="/portal/forum" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <HelpCircle className="h-3.5 w-3.5" aria-hidden />
        بازگشت به انجمن
      </Link>

      {/* سؤال */}
      <Card className="border-border/70">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap items-center gap-2">
            {data.status === "RESOLVED" ? (
              <Badge className="gap-1 bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                حل‌شده
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <CircleDot className="h-3.5 w-3.5" aria-hidden />
                در انتظار پذیرش
              </Badge>
            )}
            <Badge variant="outline" className="text-xs text-muted-foreground">
              {data.subject.title}
            </Badge>
            {data.topicTitle && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                {data.topicTitle}
              </Badge>
            )}
          </div>

          <h1 className="text-lg font-bold leading-8 sm:text-xl">{data.title}</h1>

          <div className="whitespace-pre-line text-sm leading-7 text-foreground">
            <MathText text={data.body} />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
            <div className="flex items-center gap-2">
              {user && (
                <VoteButton kind="question" targetId={data.id} voteCount={data.voteCount} voted={data.votedByMe} />
              )}
              <div className="flex items-center gap-2">
                <UserAvatar src={data.author.avatarUrl} nickname={data.author.nickname} size={32} />
                <div>
                  <div className="text-xs font-medium">{data.author.nickname}</div>
                  {data.author.username && (
                    <code dir="ltr" className="text-[10px] text-muted-foreground">
                      @{data.author.username}
                    </code>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span>{faDate(data.createdAt)}</span>
              <ViewCount count={data.viewCount} />
              {data.canDelete && <DeleteQuestionButton questionId={data.id} />}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* پاسخ‌ها */}
      <section aria-label="پاسخ‌ها" className="space-y-3">
        <h2 className="flex items-center gap-2 text-base font-bold">
          <MessageSquare className="h-4 w-4 text-primary" aria-hidden />
          {faNum(data.answers.length)} پاسخ
        </h2>

        {data.answers.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
            هنوز پاسخی نیست — اولین پاسخ را تو بده.
          </p>
        ) : (
          data.answers.map((a) => (
            <Card
              key={a.id}
              className={cn(
                "border py-0",
                a.isAccepted ? "border-emerald-300 bg-emerald-50/40" : "border-border/70",
              )}
            >
              <CardContent className="space-y-3 p-4">
                <div className="whitespace-pre-line text-sm leading-7 text-foreground">
                  <MathText text={a.body} />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2.5">
                  <div className="flex items-center gap-2">
                    {user && (
                      <VoteButton kind="answer" targetId={a.id} voteCount={a.voteCount} voted={a.votedByMe} />
                    )}
                    {a.isAccepted && (
                      <Badge className="gap-1 bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                        <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                        پاسخ پذیرفته‌شده
                      </Badge>
                    )}
                    {data.canManage && <AcceptAnswerButton answerId={a.id} accepted={a.isAccepted} />}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>{faDate(a.createdAt)}</span>
                    <span className="flex items-center gap-1.5">
                      <UserAvatar src={a.author.avatarUrl} nickname={a.author.nickname} size={24} />
                      {a.author.nickname}
                      {(a.author.role === "TEACHER" || a.author.role === "ADMIN") && (
                        <Badge variant="outline" className="text-[10px]">
                          {a.author.role === "TEACHER" ? "معلم" : "مدیر"}
                        </Badge>
                      )}
                    </span>
                    {(a.author.id === user?.id || data.canManage || user?.role === "ADMIN") && (
                      <DeleteAnswerButton answerId={a.id} />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </section>

      {/* فرم پاسخ */}
      {user ? (
        <Card className="border-border/70">
          <CardContent className="p-4">
            <h3 className="mb-3 text-sm font-bold">پاسخ تو</h3>
            <AnswerForm questionId={data.id} />
          </CardContent>
        </Card>
      ) : (
        <p className="rounded-xl bg-secondary/60 px-4 py-3 text-center text-xs text-secondary-foreground">
          برای پاسخ دادن{" "}
          <Link href="/portal/login" className="font-bold text-primary hover:underline">
            وارد شو
          </Link>
          .
        </p>
      )}
    </div>
  );
}
