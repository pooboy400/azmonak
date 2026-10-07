"use client";

// ============================================================
// حذف کامل حساب — تنها راه پاک شدن حساب، از خود پروفایل (تلگرام‌مانند)
// حذف User همهٔ داده‌ها را کسکید پاک می‌کند و شماره موبایل آزاد می‌شود.
// تأیید با تایپ آیدی برای جلوگیری از حذف تصادفی.
// ============================================================

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { deleteAccountAction } from "@/lib/actions/profile";

export function DeleteAccountCard({ username }: { username: string | null }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState("");
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const expected = username ?? "حذف حساب";
  const matched = confirm.trim().toLowerCase() === expected.toLowerCase();

  const run = () => {
    setMsg(null);
    startTransition(async () => {
      const res = await deleteAccountAction({ confirm });
      if (!res.ok) {
        setMsg(res.message ?? "حذف ناموفق بود.");
        return;
      }
      router.push("/portal/login");
      router.refresh();
    });
  };

  return (
    <Card className="border-destructive/30">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base text-destructive">
          <Trash2 className="h-4 w-4" aria-hidden />
          حذف حساب
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs leading-6 text-muted-foreground">
          حذف حساب همهٔ داده‌هایت را برای همیشه پاک می‌کند: جلسه‌های آزمون، پاسخ‌ها، توان درس‌ها، مرورها، دوستی‌ها و کلاس‌ها.
          شماره موبایلت هم آزاد می‌شود و اگر بعداً با آن وارد شوی، حساب تازه و خالی ساخته می‌شود — این کار قابل بازگشت نیست.
        </p>
        <AlertDialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) {
              setConfirm("");
              setMsg(null);
            }
          }}
        >
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="cursor-pointer gap-2 border-destructive/40 text-destructive hover:bg-destructive/10">
              <Trash2 className="h-4 w-4" aria-hidden />
              حذف حساب من
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>حذف حساب کاربری؟</AlertDialogTitle>
              <AlertDialogDescription>
                این عمل دائمی است و همهٔ داده‌های حساب پاک می‌شود. برای تأیید، آیدی خودت را بنویس:
                {username ? (
                  <code dir="ltr" className="mx-1 rounded bg-muted px-1.5 py-0.5 text-[11px]">
                    @{username}
                  </code>
                ) : (
                  <span className="mx-1 font-bold text-foreground">حذف حساب</span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Input
              dir="ltr"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={username ?? "حذف حساب"}
              maxLength={30}
              autoComplete="off"
              spellCheck={false}
              className="text-left"
              aria-label="تأیید حذف با تایپ آیدی"
            />
            {msg && <p className="text-xs text-destructive" role="alert">{msg}</p>}
            <AlertDialogFooter>
              <AlertDialogCancel className="cursor-pointer">انصراف</AlertDialogCancel>
              <AlertDialogAction
                disabled={!matched || pending}
                onClick={(e) => {
                  e.preventDefault(); // دیالوگ خودش بسته نشود تا در صورت خطا پیام دیده شود
                  run();
                }}
                className="cursor-pointer bg-destructive text-white hover:bg-destructive/90"
              >
                {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                حذف همیشگی حساب
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
