"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

/**
 * صفحه خطای فارسی برای خطاهای رندر (مثلاً خطای DB) — به‌جای صفحه پیش‌فرض انگلیسی.
 * دکمه تلاش دوباره همان route را re-render می‌کند.
 */
export default function GlobalRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] خطای رندر مسیر:", error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <p className="mb-3 text-5xl" aria-hidden>
          ⚠️
        </p>
        <h1 className="mb-3 text-2xl font-bold text-foreground">مشکلی پیش آمد</h1>
        <p className="mb-8 text-sm leading-7 text-muted-foreground">
          در بارگذاری این بخش خطایی رخ داد. یک بار دیگر تلاش کن؛ اگر تکرار شد لطفاً بعداً سر بزن یا از صفحه
          تماس به ما خبر بده.
        </p>
        <Button onClick={reset} className="cursor-pointer shadow-md shadow-primary/25">
          <RotateCcw className="h-4 w-4" aria-hidden />
          تلاش دوباره
        </Button>
      </div>
    </div>
  );
}
