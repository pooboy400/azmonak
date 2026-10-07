"use client";

// فرم‌های پنل ادمین — نقش/فعال‌سازی کاربر، درس/مبحث، ساخت و وضعیت سؤال
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Lock, LockOpen, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { MathText } from "@/components/site/math-text";
import {
  setUserRoleAction,
  toggleUserActiveAction,
  createSubjectAction,
  toggleSubjectActiveAction,
  addTopicAction,
  deleteTopicAction,
  createQuestionAction,
  setQuestionStatusAction,
} from "@/lib/actions/admin";
import { gradeLabel, majorLabel, sharedMajorLabel } from "@/lib/labels";

function useAction() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  const run = (fn: () => Promise<{ ok: boolean; message?: string }>, refresh = true) =>
    startTransition(async () => {
      const res = await fn();
      if (res.message) toast({ title: res.message, variant: res.ok ? "default" : "destructive" });
      if (res.ok && refresh) router.refresh();
    });
  return { pending, run };
}

// ---------- کاربران ----------

export function UserRoleSelect({ userId, role }: { userId: string; role: string }) {
  const { pending, run } = useAction();
  const [value, setValue] = useState(role);
  const labels: Record<string, string> = { STUDENT: "دانش‌آموز", TEACHER: "معلم", ADMIN: "ادمین" };
  return (
    <Select
      value={value}
      onValueChange={(v) => {
        if (v === value) return;
        setValue(v);
        run(() => setUserRoleAction(userId, v));
      }}
      disabled={pending}
    >
      <SelectTrigger size="sm" className="h-8 w-28 text-xs" aria-label="تغییر نقش کاربر">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(labels).map(([k, l]) => (
          <SelectItem key={k} value={k}>
            {l}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ToggleUserActiveButton({ userId, isActive }: { userId: string; isActive: boolean }) {
  const { pending, run } = useAction();
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      className="cursor-pointer gap-1 text-xs text-muted-foreground hover:text-foreground"
      onClick={() => run(() => toggleUserActiveAction(userId))}
    >
      {isActive ? <Lock className="h-3.5 w-3.5" aria-hidden /> : <LockOpen className="h-3.5 w-3.5" aria-hidden />}
      {isActive ? "غیرفعال" : "فعال"}
    </Button>
  );
}

// ---------- درس‌ها ----------

export function CreateSubjectForm() {
  const { pending, run } = useAction();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [grade, setGrade] = useState("GRADE10");
  const [major, setMajor] = useState("__none__");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="cursor-pointer gap-2">
          <Plus className="h-4 w-4" aria-hidden />
          درس جدید
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>ساخت درس</DialogTitle>
          <DialogDescription>
            پسوند عددی عنوان باید با پایه بخواند (۱=دهم، ۲=یازدهم، ۳=دوازدهم). برای درس مشترک چند رشته، کدها را با
            ویرگول بده (مثل MATH,EXPERIMENTAL).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="subj-code">کد (لاتین، یکتا)</Label>
              <Input id="subj-code" dir="ltr" value={code} onChange={(e) => setCode(e.target.value)} placeholder="FAR12G" maxLength={10} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="subj-title">عنوان</Label>
              <Input id="subj-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="فارسی ۳" maxLength={40} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>پایه</Label>
              <Select value={grade} onValueChange={setGrade}>
                <SelectTrigger aria-label="پایه">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["GRADE10", "GRADE11", "GRADE12"].map((g) => (
                    <SelectItem key={g} value={g}>
                      {gradeLabel(g)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>رشته</Label>
              <Select value={major} onValueChange={setMajor}>
                <SelectTrigger aria-label="رشته">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">عمومی (همهٔ رشته‌ها)</SelectItem>
                  {["EXPERIMENTAL", "MATH", "HUMANITIES"].map((m) => (
                    <SelectItem key={m} value={m}>
                      {majorLabel(m)}
                    </SelectItem>
                  ))}
                  <SelectItem value="MATH,EXPERIMENTAL">مشترک ریاضی و تجربی</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            className="cursor-pointer"
            disabled={pending || code.trim().length < 3 || title.trim().length < 2}
            onClick={() =>
              run(async () => {
                const res = await createSubjectAction({ code, title, grade, major: major === "__none__" ? "" : major });
                if (res.ok) {
                  setCode("");
                  setTitle("");
                  setOpen(false);
                }
                return res;
              })
            }
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
            ساخت درس
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ToggleSubjectActiveButton({ subjectId, isActive }: { subjectId: string; isActive: boolean }) {
  const { pending, run } = useAction();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      className="cursor-pointer gap-1 text-xs"
      onClick={() => run(() => toggleSubjectActiveAction(subjectId))}
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : isActive ? "غیرفعال‌سازی" : "فعال‌سازی"}
    </Button>
  );
}

export function AddTopicDialog({ subjectId, subjectTitle }: { subjectId: string; subjectTitle: string }) {
  const { pending, run } = useAction();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="cursor-pointer gap-1 text-xs">
          <Plus className="h-3.5 w-3.5" aria-hidden />
          مبحث جدید
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>مبحث جدید — {subjectTitle}</DialogTitle>
          <DialogDescription>مبحث‌ها ترتیب نمایش و نردبان سطح هر کدام را می‌سازند.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor={`topic-${subjectId}`}>عنوان مبحث</Label>
          <Input id={`topic-${subjectId}`} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} />
        </div>
        <DialogFooter>
          <Button
            className="cursor-pointer"
            disabled={pending || title.trim().length < 2}
            onClick={() =>
              run(async () => {
                const res = await addTopicAction(subjectId, title);
                if (res.ok) {
                  setTitle("");
                  setOpen(false);
                }
                return res;
              })
            }
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
            افزودن
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteTopicButton({ topicId, topicTitle, questionCount }: { topicId: string; topicTitle: string; questionCount: number }) {
  const { pending, run } = useAction();
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending || questionCount > 0}
      title={questionCount > 0 ? `${questionCount} سؤال دارد — حذف ممکن نیست` : `حذف ${topicTitle}`}
      aria-label={`حذف مبحث ${topicTitle}`}
      className="cursor-pointer text-muted-foreground hover:text-destructive"
      onClick={() => run(() => deleteTopicAction(topicId))}
    >
      <Trash2 className="h-3.5 w-3.5" aria-hidden />
    </Button>
  );
}

// ---------- سؤال‌ها ----------

export function CreateQuestionForm({
  subjects,
}: {
  subjects: Array<{ id: string; title: string; topics: Array<{ id: string; title: string }> }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [topicId, setTopicId] = useState("");
  const [difficulty, setDifficulty] = useState("MEDIUM");
  const [stem, setStem] = useState("");
  const [options, setOptions] = useState({ A: "", B: "", C: "", D: "" });
  const [correct, setCorrect] = useState("A");
  const [explanation, setExplanation] = useState("");
  const [estTimeSec, setEstTimeSec] = useState("90");
  const [status, setStatus] = useState("APPROVED");

  const topics = subjects.find((s) => s.id === subjectId)?.topics ?? [];
  const valid =
    stem.trim().length >= 5 && explanation.trim().length >= 10 && Object.values(options).every((v) => v.trim().length > 0);

  const setOpt = (k: keyof typeof options, v: string) => setOptions((o) => ({ ...o, [k]: v }));
  const diffLabel: Record<string, string> = { EASY: "آسان", MEDIUM: "متوسط", HARD: "سخت" };

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
            <SelectTrigger aria-label="درس سؤال">
              <SelectValue />
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
            <SelectTrigger aria-label="مبحث سؤال">
              <SelectValue placeholder={topics.length === 0 ? "بدون مبحث" : "انتخاب مبحث"} />
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

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>سختی</Label>
          <Select value={difficulty} onValueChange={setDifficulty}>
            <SelectTrigger aria-label="سختی">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(diffLabel).map(([k, l]) => (
                <SelectItem key={k} value={k}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>وضعیت اولیه</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger aria-label="وضعیت">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="APPROVED">تأییدشده (فوراً در آزمون)</SelectItem>
              <SelectItem value="DRAFT">پیش‌نویس</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="q-time">زمان پیشنهادی (ثانیه)</Label>
          <Input id="q-time" dir="ltr" inputMode="numeric" value={estTimeSec} onChange={(e) => setEstTimeSec(e.target.value.replace(/\D/g, ""))} maxLength={3} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="q-stem">صورت سؤال — فرمول با LaTeX مثل $x^2$</Label>
        <Textarea id="q-stem" value={stem} onChange={(e) => setStem(e.target.value)} rows={3} />
        {stem.trim().length > 0 && (
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm leading-7">
            <MathText text={stem} />
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {(["A", "B", "C", "D"] as const).map((k) => (
          <div key={k} className="space-y-1.5">
            <Label htmlFor={`opt-${k}`} className="flex items-center justify-between">
              <span>گزینهٔ {k}</span>
              <label className="flex cursor-pointer items-center gap-1 text-[11px] font-normal text-muted-foreground">
                <input
                  type="radio"
                  name="correct-option"
                  checked={correct === k}
                  onChange={() => setCorrect(k)}
                  aria-label={`گزینهٔ درست: ${k}`}
                />
                گزینهٔ درست
              </label>
            </Label>
            <Textarea id={`opt-${k}`} value={options[k]} onChange={(e) => setOpt(k, e.target.value)} rows={2} className="text-sm" />
            {options[k].trim().length > 0 && (
              <div className="rounded-md bg-muted/40 px-2.5 py-1.5 text-xs leading-6">
                <MathText text={options[k]} />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="q-expl">پاسخ تشریحی — حداقل دو جمله</Label>
        <Textarea id="q-expl" value={explanation} onChange={(e) => setExplanation(e.target.value)} rows={3} />
        {explanation.trim().length > 0 && (
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm leading-7">
            <MathText text={explanation} />
          </div>
        )}
      </div>

      <Button
        disabled={pending || !valid || !subjectId}
        className="cursor-pointer gap-2"
        onClick={() =>
          startTransition(async () => {
            const res = await createQuestionAction({
              subjectId,
              topicId: topicId || null,
              difficulty,
              stem,
              optionA: options.A,
              optionB: options.B,
              optionC: options.C,
              optionD: options.D,
              correct,
              explanation,
              estTimeSec: Number(estTimeSec) || 90,
              status,
            });
            if (res.ok) {
              toast({ title: res.message ?? "سؤال ساخته شد." });
              router.push("/portal/admin/questions");
            } else if (res.message) {
              toast({ title: res.message, variant: "destructive" });
            }
          })
        }
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
        ثبت سؤال
      </Button>
    </div>
  );
}

const NEXT_STATUS: Record<string, Array<{ to: string; label: string }>> = {
  DRAFT: [
    { to: "IN_REVIEW", label: "ارسال به بررسی" },
    { to: "APPROVED", label: "تأیید" },
  ],
  IN_REVIEW: [
    { to: "APPROVED", label: "تأیید" },
    { to: "DRAFT", label: "بازگشت به پیش‌نویس" },
  ],
  APPROVED: [{ to: "RETIRED", label: "بازنشست" }],
  RETIRED: [
    { to: "APPROVED", label: "تأیید دوباره" },
    { to: "DRAFT", label: "پیش‌نویس" },
  ],
};

export function QuestionStatusButtons({ questionId, status }: { questionId: string; status: string }) {
  const { pending, run } = useAction();
  const transitions = NEXT_STATUS[status] ?? [];
  if (transitions.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {transitions.map((t) => (
        <Button
          key={t.to}
          size="sm"
          variant={t.to === "APPROVED" ? "outline" : "ghost"}
          disabled={pending}
          className={`cursor-pointer gap-1 text-xs ${t.to === "RETIRED" ? "text-muted-foreground hover:text-destructive" : ""}`}
          onClick={() => run(() => setQuestionStatusAction(questionId, t.to))}
        >
          {t.to === "APPROVED" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden />}
          {t.label}
        </Button>
      ))}
    </div>
  );
}
