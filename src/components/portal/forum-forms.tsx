"use client";

// فرم‌های انجمن — پرسش جدید (با پیش‌نمایش زندهٔ فرمول)، پاسخ، رأی، پذیرش، حذف
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Eye, Loader2, MessageSquarePlus, ThumbsUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { MathText } from "@/components/site/math-text";
import { faNum } from "@/lib/fa";
import {
  createForumQuestionAction,
  createForumAnswerAction,
  acceptAnswerAction,
  toggleQuestionVoteAction,
  toggleAnswerVoteAction,
  deleteForumQuestionAction,
  deleteForumAnswerAction,
  incrementForumViewAction,
} from "@/lib/actions/forum";
import type { AskSubject } from "@/lib/queries/forum";

// ---------- شمارندهٔ بازدید (یک بار پس از رندر) ----------

export function ViewPing({ questionId }: { questionId: string }) {
  useEffect(() => {
    const t = setTimeout(() => {
      void incrementForumViewAction(questionId);
    }, 1200);
    return () => clearTimeout(t);
  }, [questionId]);
  return null;
}

// ---------- فرم پرسش جدید ----------

export function AskForm({ subjects }: { subjects: AskSubject[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  const [subjectId, setSubjectId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const topics = useMemo(() => subjects.find((s) => s.id === subjectId)?.topics ?? [], [subjects, subjectId]);

  const valid = title.trim().length >= 5 && body.trim().length >= 10 && subjectId !== "";

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>درس</Label>
          <Select
            value={subjectId}
            onValueChange={(v) => {
              setSubjectId(v);
              setTopicId("");
            }}
          >
            <SelectTrigger aria-label="درس پرسش">
              <SelectValue placeholder="درس را انتخاب کن" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>
            مبحث <span className="text-[10px] text-muted-foreground">(اختیاری)</span>
          </Label>
          <Select value={topicId} onValueChange={setTopicId} disabled={topics.length === 0}>
            <SelectTrigger aria-label="مبحث پرسش">
              <SelectValue placeholder={topics.length === 0 ? "اول درس را انتخاب کن" : "مبحث را انتخاب کن"} />
            </SelectTrigger>
            <SelectContent>
              {topics.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ask-title">عنوان سؤال</Label>
        <Input
          id="ask-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="سؤالت را در یک جملهٔ روشن بنویس…"
          maxLength={120}
        />
        <p className="text-[11px] text-muted-foreground">{faNum(title.trim().length)} از ۱۲۰ نویسه</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ask-body">متن سؤال</Label>
        <Textarea
          id="ask-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={7}
          placeholder={"توضیح بده کجا گیر کردی. فرمول را با LaTeX بنویس — درون‌خطی $x^2+1$ یا بلوکی $$\\frac{a}{b}$$"}
          maxLength={4000}
        />
      </div>

      {body.trim().length > 0 && (
        <div className="rounded-xl border border-border bg-muted/30 p-4">
          <p className="mb-2 text-[11px] font-medium text-muted-foreground">پیش‌نمایش فرمول‌ها</p>
          <div className="whitespace-pre-line text-sm leading-7">
            <MathText text={body} />
          </div>
        </div>
      )}

      <Button
        disabled={pending || !valid}
        className="cursor-pointer gap-2"
        onClick={() =>
          startTransition(async () => {
            const res = await createForumQuestionAction({ subjectId, topicId: topicId || null, title, body });
            if (res.ok && res.id) {
              router.push(`/portal/forum/${res.id}`);
            } else if (res.message) {
              toast({ title: res.message, variant: "destructive" });
            }
          })
        }
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <MessageSquarePlus className="h-4 w-4" aria-hidden />}
        انتشار سؤال
      </Button>
    </div>
  );
}

// ---------- فرم پاسخ ----------

export function AnswerForm({ questionId }: { questionId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  const [body, setBody] = useState("");

  return (
    <div className="space-y-3">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={5}
        placeholder={"پاسخت را کامل و مرحله‌به‌مرحله بنویس. فرمول با LaTeX: $\\int x\\,dx$"}
        maxLength={4000}
        aria-label="متن پاسخ"
      />
      {body.trim().length > 0 && (
        <div className="rounded-xl border border-border bg-muted/30 p-3">
          <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">پیش‌نمایش</p>
          <div className="whitespace-pre-line text-sm leading-7">
            <MathText text={body} />
          </div>
        </div>
      )}
      <div className="flex items-center gap-3">
        <Button
          size="sm"
          disabled={pending || body.trim().length < 10}
          className="cursor-pointer gap-2"
          onClick={() =>
            startTransition(async () => {
              const res = await createForumAnswerAction({ questionId, body });
              if (res.ok) {
                setBody("");
                router.refresh();
              } else if (res.message) {
                toast({ title: res.message, variant: "destructive" });
              }
            })
          }
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <MessageSquarePlus className="h-4 w-4" aria-hidden />}
          ثبت پاسخ
        </Button>
        <span className="text-[11px] text-muted-foreground">فرمول‌ها با LaTeX — مثل $x^2$ یا $$\frac{1}{2}$$</span>
      </div>
    </div>
  );
}

// ---------- رأی ----------

export function VoteButton({
  kind,
  targetId,
  voteCount,
  voted,
  disabled,
}: {
  kind: "question" | "answer";
  targetId: string;
  voteCount: number;
  voted: boolean;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  const [optimistic, setOptimistic] = useState<boolean | null>(null);

  const isVoted = optimistic ?? voted;

  return (
    <button
      type="button"
      disabled={pending || disabled}
      aria-pressed={isVoted}
      aria-label={isVoted ? "لغو رأی" : "رأی مفید بود"}
      onClick={() =>
        startTransition(async () => {
          setOptimistic(!isVoted);
          const res =
            kind === "question"
              ? await toggleQuestionVoteAction(targetId)
              : await toggleAnswerVoteAction(targetId);
          if (!res.ok && res.message) toast({ title: res.message, variant: "destructive" });
          setOptimistic(null);
          router.refresh();
        })
      }
      className={`flex cursor-pointer flex-col items-center gap-0.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors disabled:cursor-wait disabled:opacity-60 ${
        isVoted ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-secondary/60"
      }`}
    >
      <ThumbsUp className="h-3.5 w-3.5" aria-hidden />
      <span className="font-bold tabular-nums">{faNum(voteCount + (optimistic === null ? 0 : optimistic === voted ? 0 : optimistic ? 1 : -1))}</span>
    </button>
  );
}

// ---------- پذیرش پاسخ ----------

export function AcceptAnswerButton({ answerId, accepted }: { answerId: string; accepted: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  return (
    <Button
      size="sm"
      variant={accepted ? "secondary" : "outline"}
      disabled={pending}
      className="cursor-pointer gap-1.5"
      onClick={() =>
        startTransition(async () => {
          const res = await acceptAnswerAction(answerId);
          if (res.message) toast({ title: res.message, variant: res.ok ? "default" : "destructive" });
          router.refresh();
        })
      }
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
      ) : (
        <BadgeCheck className={`h-3.5 w-3.5 ${accepted ? "text-emerald-600" : ""}`} aria-hidden />
      )}
      {accepted ? "لغو پذیرش" : "پذیرش پاسخ"}
    </Button>
  );
}

// ---------- حذف ----------

export function DeleteQuestionButton({ questionId }: { questionId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="ghost" disabled={pending} className="cursor-pointer gap-1.5 text-muted-foreground hover:text-destructive">
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
          حذف سؤال
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>سؤال حذف شود؟</AlertDialogTitle>
          <AlertDialogDescription>همهٔ پاسخ‌ها و رأی‌های این سؤال هم حذف می‌شوند و قابل بازگشت نیست.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="cursor-pointer">انصراف</AlertDialogCancel>
          <AlertDialogAction
            className="cursor-pointer bg-destructive text-white hover:bg-destructive/90"
            onClick={() =>
              startTransition(async () => {
                const res = await deleteForumQuestionAction(questionId);
                if (res.message) toast({ title: res.message, variant: res.ok ? "default" : "destructive" });
                if (res.ok) router.push("/portal/forum");
              })
            }
          >
            حذف قطعی
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function DeleteAnswerButton({ answerId }: { answerId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="ghost" disabled={pending} aria-label="حذف پاسخ" className="cursor-pointer gap-1 text-muted-foreground hover:text-destructive">
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>پاسخ حذف شود؟</AlertDialogTitle>
          <AlertDialogDescription>این پاسخ و رأی‌هایش حذف می‌شوند.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="cursor-pointer">انصراف</AlertDialogCancel>
          <AlertDialogAction
            className="cursor-pointer bg-destructive text-white hover:bg-destructive/90"
            onClick={() =>
              startTransition(async () => {
                const res = await deleteForumAnswerAction(answerId);
                if (res.message) toast({ title: res.message, variant: res.ok ? "default" : "destructive" });
                router.refresh();
              })
            }
          >
            حذف
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ---------- نمایش شمار بازدید ----------

export function ViewCount({ count }: { count: number }) {
  return (
    <span className="flex items-center gap-1">
      <Eye className="h-3 w-3" aria-hidden />
      {faNum(count)} بازدید
    </span>
  );
}
