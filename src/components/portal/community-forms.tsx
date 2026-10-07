"use client";

// فرم‌های کامیونیتی — جست‌وجو، درخواست دوستی، پذیرش/رد، کلاس
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut, Search, UserPlus, UserCheck, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  sendFriendRequestAction,
  respondFriendRequestAction,
  joinClassAction,
  leaveClassAction,
} from "@/lib/actions/community";

function useAction() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const run = (fn: () => Promise<{ ok: boolean; message?: string }>) =>
    startTransition(async () => {
      const res = await fn();
      setMsg(res.message ?? null);
      router.refresh();
      setTimeout(() => setMsg(null), 4000);
    });
  return { pending, msg, run };
}

export function SearchForm({ defaultQuery }: { defaultQuery: string }) {
  const router = useRouter();
  const [q, setQ] = useState(defaultQuery);
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        router.push(q.trim() ? `/portal/community?q=${encodeURIComponent(q.trim())}` : "/portal/community");
      }}
    >
      <div className="relative flex-1">
        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="آیدی یا لقب دوستت را بنویس…"
          className="pr-9"
          aria-label="جست‌وجوی کاربر با آیدی یا لقب"
          maxLength={40}
        />
      </div>
      <Button type="submit" variant="secondary" className="cursor-pointer">
        جست‌وجو
      </Button>
    </form>
  );
}

export function AddFriendButton({ username }: { username: string }) {
  const { pending, run } = useAction();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      className="cursor-pointer gap-1.5"
      onClick={() => run(() => sendFriendRequestAction(username))}
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <UserPlus className="h-3.5 w-3.5" aria-hidden />}
      درخواست
    </Button>
  );
}

export function RespondRequestButtons({ friendshipId }: { friendshipId: string }) {
  const { pending, run } = useAction();
  return (
    <div className="flex gap-1.5">
      <Button
        size="sm"
        disabled={pending}
        className="cursor-pointer gap-1.5 bg-emerald-600 hover:bg-emerald-700"
        onClick={() => run(() => respondFriendRequestAction(friendshipId, true))}
      >
        <UserCheck className="h-3.5 w-3.5" aria-hidden />
        پذیرش
      </Button>
      <Button size="sm" variant="outline" disabled={pending} className="cursor-pointer gap-1.5" onClick={() => run(() => respondFriendRequestAction(friendshipId, false))}>
        <UserX className="h-3.5 w-3.5" aria-hidden />
        رد
      </Button>
    </div>
  );
}

export function JoinClassButton({ code }: { code: string }) {
  const { pending, run } = useAction();
  return (
    <Button size="sm" variant="outline" disabled={pending} className="cursor-pointer" onClick={() => run(() => joinClassAction(code))}>
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : "پیوستن"}
    </Button>
  );
}

export function LeaveClassButton({ classId }: { classId: string }) {
  const { pending, run } = useAction();
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      className="cursor-pointer gap-1.5 text-muted-foreground hover:text-destructive"
      onClick={() => run(() => leaveClassAction(classId))}
    >
      <LogOut className="h-3.5 w-3.5" aria-hidden />
      خروج
    </Button>
  );
}

export function JoinByCodeForm() {
  const { pending, msg, run } = useAction();
  const [code, setCode] = useState("");
  return (
    <form
      className="flex max-w-sm gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (code.trim()) run(() => joinClassAction(code));
      }}
    >
      <Input dir="ltr" value={code} onChange={(e) => setCode(e.target.value)} placeholder="AMZK-11TA" maxLength={20} aria-label="کد کلاس" className="text-center" />
      <Button type="submit" variant="secondary" disabled={pending} className="cursor-pointer">
        پیوستن با کد
      </Button>
      {msg && <span className="sr-only">{msg}</span>}
    </form>
  );
}
