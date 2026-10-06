"use client";

// ============================================================
// فرم آنبوردینگ اجباری — انتخاب آیدی یکتا + نام نمایشی (+ پایه/رشته)
// تا این گام کامل نشود کاربر آیدی ندارد و قابل جست‌وجو نیست.
// ============================================================

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UsernameField } from "@/components/portal/username-field";
import { completeOnboardingAction } from "@/lib/actions/profile";
import { GRADE_ORDER, MAJOR_ORDER, gradeLabel, majorLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";

export function OnboardingForm({ nickname }: { nickname: string }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [name, setName] = useState(nickname);
  const [grade, setGrade] = useState<string | null>(null);
  const [major, setMajor] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setMsg(null);
    startTransition(async () => {
      const res = await completeOnboardingAction({ username, nickname: name, grade, major });
      if (!res.ok) {
        setMsg(res.message ?? "ذخیره ناموفق بود.");
        return;
      }
      router.replace("/portal");
      router.refresh();
    });
  };

  return (
    <Card className="border-border/70">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">حسابت را بساز</CardTitle>
        <p className="mt-1 text-xs leading-6 text-muted-foreground">
          یک آیدی یکتا برای پیدا شدن توسط دیگران و یک نام نمایشی برای نمایش در پروفایل و لیدربرد انتخاب کن.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <UsernameField value={username} onChange={setUsername} current={null} />

        {/* نام نمایشی */}
        <div className="space-y-1.5">
          <Label htmlFor="nickname">نام نمایشی (لقب)</Label>
          <Input
            id="nickname"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={24}
            placeholder="مثلاً درسا"
          />
          <p className="text-[11px] text-muted-foreground">هر اسمی دوست داری؛ لازم نیست یکتا باشد.</p>
        </div>

        {/* پایه و رشته */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>پایه تحصیلی</Label>
            <div className="flex flex-wrap gap-1.5">
              {GRADE_ORDER.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGrade(g)}
                  className={cn(
                    "cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    grade === g ? "border-primary bg-primary text-white" : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {gradeLabel(g)}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>رشته</Label>
            <div className="flex flex-wrap gap-1.5">
              {MAJOR_ORDER.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMajor(m)}
                  className={cn(
                    "cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    major === m ? "border-primary bg-primary text-white" : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {majorLabel(m)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {msg && <p className="text-xs text-destructive" role="alert">{msg}</p>}

        <Button
          onClick={submit}
          disabled={pending || !username.trim() || name.trim().length < 2}
          className="w-full cursor-pointer gap-2"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          ساخت حساب و ورود
        </Button>
        <p className="flex items-center justify-center gap-1 text-center text-[11px] text-muted-foreground">
          <Check className="h-3 w-3 text-emerald-600" aria-hidden />
          بعداً در پروفایل هم می‌توانی آیدی و اسمت را تغییر بدهی.
        </p>
      </CardContent>
    </Card>
  );
}
