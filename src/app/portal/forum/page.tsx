import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getForumList, getForumSubjects } from "@/lib/queries/forum";
import { faNum } from "@/lib/fa";
import { faDate } from "@/lib/labels";
import { UserAvatar } from "@/components/site/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BadgeCheck, CircleDot, HelpCircle, ListFilter, MessageSquare, MessageSquarePlus } from "lucide-react";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "انجمن پرسش و پاسخ" };

// انجمن — فهرست سؤال‌ها با فیلتر درس / بی‌پاسخ / جست‌وجو (انجمن سراسری است)
export default async function ForumPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string; unanswered?: string; q?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const [items, subjects] = await Promise.all([
    getForumList({ subjectId: sp.subject, unanswered: sp.unanswered === "1", q: sp.q }),
    getForumSubjects(),
  ]);

  const activeSubject = sp.subject ? subjects.find((s) => s.id === sp.subject) : null;

  const chipBase =
    "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors";
  const chipOn = "border-primary bg-primary/10 text-primary";
  const chipOff = "border-border text-muted-foreground hover:bg-secondary/60";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <HelpCircle className="h-5 w-5 text-primary" aria-hidden />
            انجمن پرسش و پاسخ
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            سؤال بپرس، جواب بده — فرمول‌ها با LaTeX پشتیبانی می‌شوند.
          </p>
        </div>
        <Button asChild className="cursor-pointer gap-2">
          <Link href="/portal/forum/new">
            <MessageSquarePlus className="h-4 w-4" aria-hidden />
            پرسش جدید
          </Link>
        </Button>
      </div>

      {/* فیلترها */}
      <div className="flex flex-wrap items-center gap-2">
        <ListFilter className="h-4 w-4 text-muted-foreground" aria-hidden />
        <Link href="/portal/forum" className={cn(chipBase, !sp.subject && !sp.unanswered ? chipOn : chipOff)}>
          همه
        </Link>
        <Link
          href={{ pathname: "/portal/forum", query: { ...(sp.subject ? { subject: sp.subject } : {}), unanswered: "1" } }}
          className={cn(chipBase, sp.unanswered === "1" ? chipOn : chipOff)}
        >
          بی‌پاسخ پذیرفته‌شده
        </Link>
        {subjects.map((s) => (
          <Link
            key={s.id}
            href={{ pathname: "/portal/forum", query: { subject: s.id, ...(sp.unanswered === "1" ? { unanswered: "1" } : {}) } }}
            className={cn(chipBase, sp.subject === s.id ? chipOn : chipOff)}
          >
            {s.title}
          </Link>
        ))}
      </div>

      {/* فهرست سؤال‌ها */}
      {items.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <HelpCircle className="mx-auto mb-3 h-8 w-8 text-muted-foreground/60" aria-hidden />
            <p className="text-sm text-muted-foreground">
              {activeSubject || sp.unanswered
                ? "با این فیلتر سؤالی پیدا نشد."
                : "اولین سؤال را تو بپرس — دکمهٔ «پرسش جدید» بالای صفحه است."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {items.map((q) => (
            <Link key={q.id} href={`/portal/forum/${q.id}`} className="block">
              <Card className="border-border/70 py-0 transition-colors hover:border-primary/40">
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {q.hasAcceptedAnswer ? (
                        <Badge className="gap-1 bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                          <BadgeCheck className="h-3 w-3" aria-hidden />
                          حل‌شده
                        </Badge>
                      ) : q.answerCount > 0 ? (
                        <Badge variant="secondary" className="gap-1">
                          <CircleDot className="h-3 w-3" aria-hidden />
                          در انتظار پذیرش
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          بی‌پاسخ
                        </Badge>
                      )}
                      <span className="truncate text-sm font-bold">{q.title}</span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                      <span>{q.subject.title}</span>
                      {q.topicTitle && (
                        <>
                          <span aria-hidden>·</span>
                          <span>{q.topicTitle}</span>
                        </>
                      )}
                      <span aria-hidden>·</span>
                      <span>{q.author.nickname}</span>
                      <span aria-hidden>·</span>
                      <span>{faDate(q.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3.5 w-3.5" aria-hidden />
                      {faNum(q.answerCount)} پاسخ
                    </span>
                    {q.voteCount > 0 && <span>{faNum(q.voteCount)} رأی</span>}
                    <span>{faNum(q.viewCount)} بازدید</span>
                    <UserAvatar src={q.author.avatarUrl} nickname={q.author.nickname} size={26} />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* پانویس راهنما */}
      <p className="text-[11px] text-muted-foreground">
        راهنمای فرمول: درون‌خطی <code dir="ltr">{"$x^2+1$"}</code> و بلوکی <code dir="ltr">{"$$\\frac{a}{b}$$"}</code> —
        سؤال‌های حل‌شده پاسخ پذیرفته‌شده دارند.{" "}
        {user.role === "ADMIN" && "به‌عنوان ادمین می‌توانی محتوای نامناسب را حذف کنی."}
      </p>
    </div>
  );
}
