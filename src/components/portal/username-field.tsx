"use client";

// ============================================================
// فیلد آیدی تلگرام‌مانند — پیشوند @ ، بررسی زندهٔ قواعد + یکتایی
// (debounce ۴۰۰ms) — مشترک بین آنبوردینگ و فرم پروفایل
// الگوی React: نتیجهٔ بررسی در state و وضعیت نمایشی در render مشتق می‌شود.
// ============================================================

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { checkUsernameAction } from "@/lib/actions/profile";
import { normalizeUsername } from "@/lib/username";

type CheckState = "idle" | "checking" | "ok" | "error";

interface CheckResult {
  value: string; // ورودی خام بررسی‌شده
  ok: boolean;
  message: string;
}

export function UsernameField({
  value,
  onChange,
  current,
}: {
  value: string;
  onChange: (v: string) => void;
  /** آیدی فعلی کاربر — اگر ورودی با آن برابر باشد بررسی نمی‌شود (تغییر نکرده) */
  current?: string | null;
}) {
  const [result, setResult] = useState<CheckResult | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trimmed = value.trim();
  const unchanged = !trimmed || normalizeUsername(trimmed) === normalizeUsername(current ?? "");

  useEffect(() => {
    if (unchanged) return; // حالت idle در render مشتق می‌شود — اینجا فقط بررسی شبکه
    let cancelled = false;
    timerRef.current = setTimeout(async () => {
      const res = await checkUsernameAction({ username: trimmed });
      if (!cancelled) {
        setResult({ value: trimmed, ok: res.ok, message: res.message ?? (res.ok ? "این آیدی آزاد است." : "این آیدی مجاز نیست.") });
      }
    }, 400);
    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [trimmed, unchanged]);

  // وضعیت نمایشی — کاملاً مشتق‌شده در render (بدون setState در effect)
  const state: CheckState = unchanged
    ? "idle"
    : result && result.value === trimmed
      ? result.ok
        ? "ok"
        : "error"
      : "checking";

  return (
    <div className="space-y-1.5">
      <Label htmlFor="username">آیدی (یکتا)</Label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground" aria-hidden>
          @
        </span>
        <Input
          id="username"
          dir="ltr"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="dorsa_zisti"
          maxLength={30}
          autoComplete="off"
          spellCheck={false}
          className="pl-8 text-left"
          aria-describedby="username-hint"
        />
      </div>
      <p id="username-hint" className="text-[11px] text-muted-foreground">
        حروف انگلیسی کوچک، عدد و زیرخط (_) — حداقل ۴ نویسه. با این آیدی دیگران تو را جست‌وجو می‌کنند.
      </p>
      {state === "checking" && (
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
          در حال بررسی آیدی…
        </p>
      )}
      {state === "ok" && (
        <p className="flex items-center gap-1.5 text-[11px] text-emerald-600">
          <Check className="h-3 w-3" aria-hidden />
          {result?.message}
        </p>
      )}
      {state === "error" && (
        <p className="flex items-center gap-1.5 text-[11px] text-destructive" role="alert">
          <X className="h-3 w-3" aria-hidden />
          {result?.message}
        </p>
      )}
    </div>
  );
}
