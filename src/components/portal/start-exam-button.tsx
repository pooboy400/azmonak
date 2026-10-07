"use client";

// دکمه شروع/ادامه آزمون — اکشن سمت سرور redirect می‌کند؛ خطا با toast نمایش داده می‌شود
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { startSessionAction, abandonSessionAction } from "@/lib/actions/exam";
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

export function StartExamButton({
  subjectId,
  activeSessionId,
  isPlacement,
  label,
  size = "sm",
  variant = "default",
}: {
  subjectId: string;
  activeSessionId?: string | null;
  isPlacement?: boolean;
  label?: string;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline" | "secondary";
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  if (activeSessionId) {
    return (
      <Button size={size} variant={variant} className="cursor-pointer gap-2" onClick={() => router.push(`/portal/exam/${activeSessionId}`)}>
        <PlayCircle className="h-4 w-4" aria-hidden />
        {label ?? "ادامه جلسه"}
      </Button>
    );
  }

  return (
    <Button
      size={size}
      variant={variant}
      disabled={pending}
      className="cursor-pointer gap-2"
      onClick={() =>
        startTransition(async () => {
          const res = await startSessionAction(subjectId);
          if (res && !res.ok && res.message) {
            toast({ title: res.message, variant: "destructive" });
          }
        })
      }
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <PlayCircle className="h-4 w-4" aria-hidden />}
      {label ?? (isPlacement ? "شروع جایابی" : "شروع تمرین")}
    </Button>
  );
}

export function AbandonButton({ sessionId }: { sessionId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" disabled={pending} className="cursor-pointer text-muted-foreground hover:text-destructive">
          رها کردن جلسه
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>جلسه رها شود؟</AlertDialogTitle>
          <AlertDialogDescription>
            پاسخ‌های این جلسه ثبت نمی‌شوند و در آمار و رتبینگ تو اثری ندارند. می‌توانی بعداً دوباره شروع کنی.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="cursor-pointer">بازگشت به آزمون</AlertDialogCancel>
          <AlertDialogAction
            className="cursor-pointer bg-destructive text-white hover:bg-destructive/90"
            onClick={() =>
              startTransition(async () => {
                await abandonSessionAction(sessionId);
                router.push("/portal");
                router.refresh();
              })
            }
          >
            رها کردن
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
