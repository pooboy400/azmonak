"use client";

// فرم‌های پنل معلم — ساخت کلاس، حذف کلاس/عضو/تمرین، ساخت تمرین، کپی کد پیوستن
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Copy, Check, Loader2, Plus, Trash2, UserX } from "lucide-react";
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
import {
  createClassAction,
  deleteClassAction,
  removeMemberAction,
  createAssignmentAction,
  deleteAssignmentAction,
} from "@/lib/actions/teacher";
import { gradeLabel, majorLabel } from "@/lib/labels";

function useAction() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  const run = (fn: () => Promise<{ ok: boolean; message?: string }>, refresh = true) =>
    startTransition(async () => {
      const res = await fn();
      if (res.message) {
        toast({ title: res.message, variant: res.ok ? "default" : "destructive" });
      }
      if (res.ok && refresh) router.refresh();
    });
  return { pending, run };
}

// ---------- ساخت کلاس ----------

export function CreateClassForm() {
  const { pending, run } = useAction();
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("GRADE10");
  const [major, setMajor] = useState("EXPERIMENTAL");
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="cursor-pointer gap-2">
          <Plus className="h-4 w-4" aria-hidden />
          کلاس جدید
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>ساخت کلاس</DialogTitle>
          <DialogDescription>
            پس از ساخت، کد پیوستن به دانش‌آموزها داده می‌شود تا از صفحهٔ کامیونیتی وارد کلاس شوند.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="class-name">نام کلاس</Label>
            <Input
              id="class-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثل: یازدهم تجربی ۲"
              maxLength={60}
            />
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
                  {["EXPERIMENTAL", "MATH", "HUMANITIES"].map((m) => (
                    <SelectItem key={m} value={m}>
                      {majorLabel(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            className="cursor-pointer"
            disabled={pending || name.trim().length < 3}
            onClick={() =>
              run(async () => {
                const res = await createClassAction(name, grade, major);
                if (res.ok) {
                  setName("");
                  setOpen(false);
                }
                return res;
              })
            }
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
            ساخت کلاس
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- کپی کد پیوستن ----------

export function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="sm"
      variant="outline"
      className="cursor-pointer gap-1.5"
      aria-label={`کپی کد کلاس ${code}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          // کلیپ‌بورد در دسترس نیست — کد کنار دکمه نمایش داده شده است
        }
      }}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
      {copied ? "کپی شد" : "کپی کد"}
    </Button>
  );
}

// ---------- حذف کلاس ----------

export function DeleteClassButton({ classId, className }: { classId: string; className: string }) {
  const { pending, run } = useAction();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          className="cursor-pointer gap-1.5 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
          حذف کلاس
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>کلاس «{className}» حذف شود؟</AlertDialogTitle>
          <AlertDialogDescription>
            همهٔ عضوها و تمرین‌های این کلاس حذف می‌شوند و قابل بازگشت نیست. دادهٔ شخصی دانش‌آموزها (آزمون‌ها و توان)
            دست‌نخورده می‌ماند.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="cursor-pointer">انصراف</AlertDialogCancel>
          <AlertDialogAction
            className="cursor-pointer bg-destructive text-white hover:bg-destructive/90"
            onClick={() => run(() => deleteClassAction(classId), false)}
          >
            حذف قطعی
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ---------- حذف عضو ----------

export function RemoveMemberButton({ classId, studentId, nickname }: { classId: string; studentId: string; nickname: string }) {
  const { pending, run } = useAction();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          aria-label={`حذف ${nickname} از کلاس`}
          className="cursor-pointer gap-1 text-muted-foreground hover:text-destructive"
        >
          <UserX className="h-3.5 w-3.5" aria-hidden />
          حذف
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>«{nickname}» از کلاس حذف شود؟</AlertDialogTitle>
          <AlertDialogDescription>
            فقط عضویت او در این کلاس برداشته می‌شود؛ آمار و حساب او دست‌نخورده می‌ماند.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="cursor-pointer">انصراف</AlertDialogCancel>
          <AlertDialogAction
            className="cursor-pointer bg-destructive text-white hover:bg-destructive/90"
            onClick={() => run(() => removeMemberAction(classId, studentId))}
          >
            حذف از کلاس
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ---------- ساخت تمرین ----------

export function CreateAssignmentForm({
  classId,
  subjects,
}: {
  classId: string;
  subjects: Array<{ id: string; title: string }>;
}) {
  const { pending, run } = useAction();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [questionCount, setQuestionCount] = useState("10");
  const [dueAt, setDueAt] = useState("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="cursor-pointer gap-2" disabled={subjects.length === 0}>
          <Plus className="h-4 w-4" aria-hidden />
          تمرین جدید
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>ساخت تمرین کلاسی</DialogTitle>
          <DialogDescription>
            دانش‌آموزهای کلاس این تمرین را در داشبورد خود می‌بینند و با اتمام جلسه، تکمیل آن ثبت می‌شود.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="assign-title">عنوان تمرین</Label>
            <Textarea
              id="assign-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثل: تمرین هفتهٔ ۶ — مشتق"
              rows={2}
              maxLength={80}
            />
          </div>
          <div className="space-y-1.5">
            <Label>درس</Label>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger aria-label="درس تمرین">
                <SelectValue placeholder="انتخاب درس" />
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="assign-count">تعداد سؤال (۴ تا ۲۰)</Label>
              <Input
                id="assign-count"
                dir="ltr"
                inputMode="numeric"
                value={questionCount}
                onChange={(e) => setQuestionCount(e.target.value.replace(/\D/g, ""))}
                maxLength={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="assign-due" className="flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                مهلت (اختیاری)
              </Label>
              <Input id="assign-due" dir="ltr" type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            className="cursor-pointer"
            disabled={pending || title.trim().length < 3 || !subjectId}
            onClick={() =>
              run(async () => {
                const res = await createAssignmentAction({
                  classId,
                  subjectId,
                  title,
                  questionCount: Number(questionCount) || 10,
                  dueAt: dueAt || null,
                });
                if (res.ok) {
                  setTitle("");
                  setDueAt("");
                  setOpen(false);
                }
                return res;
              })
            }
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
            ساخت تمرین
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- حذف تمرین ----------

export function DeleteAssignmentButton({ assignmentId, title }: { assignmentId: string; title: string }) {
  const { pending, run } = useAction();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          aria-label={`حذف تمرین ${title}`}
          className="cursor-pointer gap-1 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>تمرین «{title}» حذف شود؟</AlertDialogTitle>
          <AlertDialogDescription>
            وضعیت تکمیل دانش‌آموزها نیز حذف می‌شود. جلسه‌های در جریان، بدون تمرین ادامه می‌دهند.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="cursor-pointer">انصراف</AlertDialogCancel>
          <AlertDialogAction
            className="cursor-pointer bg-destructive text-white hover:bg-destructive/90"
            onClick={() => run(() => deleteAssignmentAction(assignmentId))}
          >
            حذف قطعی
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
