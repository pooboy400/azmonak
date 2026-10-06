"use client";

// فرم ورود دو مرحله‌ای: شماره موبایل → کد ۵ رقمی
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, ShieldCheck, Smartphone } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestOtpAction, verifyOtpAction } from "@/lib/actions/auth";

export function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const submitPhone = () => {
    setError(null);
    startTransition(async () => {
      const res = await requestOtpAction({ phone });
      if (!res.ok) {
        setError(res.message ?? "خطا در ارسال کد.");
        if (res.resendAfterSec) setCooldown(res.resendAfterSec);
        return;
      }
      setDevCode(res.devCode ?? null);
      setCooldown(res.resendAfterSec ?? 45);
      setStep("code");
    });
  };

  const submitCode = (finalCode: string) => {
    setError(null);
    startTransition(async () => {
      const res = await verifyOtpAction({ phone, code: finalCode });
      if (!res.ok) {
        setError(res.message ?? "کد نامعتبر است.");
        setCode("");
        return;
      }
      router.push("/portal");
      router.refresh();
    });
  };

  return (
    <div className="mt-8 w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-sm">
      {step === "phone" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitPhone();
          }}
          className="space-y-4"
        >
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Smartphone className="h-4 w-4 text-primary" aria-hidden />
            ورود با شماره موبایل
          </div>
          <p className="text-xs leading-6 text-muted-foreground">
            کد تأیید ۵ رقمی برای این شماره پیامک می‌شود. اگر حساب نداشته باشی، همان لحظه ساخته می‌شود.
          </p>
          <Input
            dir="ltr"
            inputMode="tel"
            autoComplete="tel"
            placeholder="09123456789"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="text-center tracking-widest"
            maxLength={11}
            aria-label="شماره موبایل"
          />
          {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
          <Button type="submit" disabled={pending || phone.length < 11} className="w-full cursor-pointer gap-2">
            {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            دریافت کد تأیید
          </Button>
        </form>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (code.length === 5) submitCode(code);
          }}
          className="space-y-4"
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            <ShieldCheck className="h-4 w-4 text-primary" aria-hidden />
            کد تأیید را وارد کن
          </div>
          <p className="text-xs leading-6 text-muted-foreground" dir="ltr">
            {phone}
          </p>
          <InputOTP maxLength={5} value={code} onChange={setCode} dir="ltr" containerClassName="justify-center">
            <InputOTPGroup className="flex-row-reverse">
              {[0, 1, 2, 3, 4].map((i) => (
                <InputOTPSlot key={i} index={i} className="h-12 w-11 text-lg" />
              ))}
            </InputOTPGroup>
          </InputOTP>
          {devCode && (
            <p className="rounded-lg bg-secondary px-3 py-2 text-xs text-secondary-foreground" dir="ltr">
              dev mode — code: <span className="font-bold">{devCode}</span>
            </p>
          )}
          {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
          <Button type="submit" disabled={pending || code.length < 5} className="w-full cursor-pointer gap-2">
            {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            ورود به پورتال
          </Button>
          <div className="flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => {
                setStep("phone");
                setCode("");
                setDevCode(null);
                setError(null);
              }}
              className="flex cursor-pointer items-center gap-1 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
              تغییر شماره
            </button>
            <button
              type="button"
              disabled={cooldown > 0 || pending}
              onClick={() => submitPhone()}
              className="cursor-pointer text-primary disabled:cursor-not-allowed disabled:text-muted-foreground"
            >
              {cooldown > 0 ? `ارسال مجدد تا ${cooldown} ثانیه` : "ارسال مجدد کد"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
