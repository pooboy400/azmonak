"use client";

// فرم ویرایش پروفایل + آپلود آواتار (حداکثر ۴۸KB)
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateProfileAction } from "@/lib/actions/profile";
import { GRADE_ORDER, MAJOR_ORDER, gradeLabel, majorLabel } from "@/lib/labels";
import { UsernameField } from "@/components/portal/username-field";
import { cn } from "@/lib/utils";

interface ProfileUser {
  username: string | null;
  nickname: string;
  grade: string | null;
  major: string | null;
  privacy: string;
  avatarUrl: string | null;
}

const PRIVACY_OPTIONS = [
  { value: "PUBLIC", label: "عمومی", hint: "در لیدربرد برای همه نمایش داده می‌شوی" },
  { value: "FRIENDS", label: "فقط دوستان", hint: "فقط دوستانت رتبه‌ات را می‌بینند" },
  { value: "PRIVATE", label: "خصوصی", hint: "در هیچ لیدربردی نمایش داده نمی‌شوی" },
];

export function ProfileForm({ user }: { user: ProfileUser }) {
  const router = useRouter();
  const [username, setUsername] = useState(user.username ?? "");
  const [nickname, setNickname] = useState(user.nickname);
  const [grade, setGrade] = useState<string | null>(user.grade);
  const [major, setMajor] = useState<string | null>(user.major);
  const [privacy, setPrivacy] = useState(user.privacy);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadFile = (file: File) => {
    setMsg(null);
    if (file.size > 36 * 1024) {
      setMsg({ ok: false, text: "حجم تصویر حداکثر ۳۶ کیلوبایت است — عکس کوچک‌تری انتخاب کن." });
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      import("@/lib/actions/profile").then(({ uploadAvatarAction }) =>
        uploadAvatarAction(String(reader.result)).then((res) => {
          if (res.ok && res.path) {
            setAvatarUrl(res.path);
            setMsg({ ok: true, text: "آواتار به‌روزرسانی شد." });
            router.refresh();
          } else {
            setMsg({ ok: false, text: res.message ?? "آپلود ناموفق بود." });
          }
        }),
      );
    reader.readAsDataURL(file);
  };

  const save = () => {
    setMsg(null);
    startTransition(async () => {
      const res = await updateProfileAction({ username, nickname, grade, major, privacy, avatarUrl: avatarUrl ?? "" });
      setMsg({ ok: res.ok, text: res.ok ? "پروفایل ذخیره شد." : (res.message ?? "ذخیره ناموفق بود.") });
      if (res.ok) router.refresh();
    });
  };

  const dirty =
    username !== (user.username ?? "") ||
    nickname !== user.nickname || grade !== user.grade || major !== user.major || privacy !== user.privacy;

  return (
    <Card className="border-border/70">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">ویرایش پروفایل</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* آواتار */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="group relative cursor-pointer rounded-full"
            aria-label="تغییر آواتار"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="آواتار فعلی" className="h-16 w-16 rounded-full object-cover ring-2 ring-border" />
            ) : (
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-white">
                {nickname.slice(0, 1)}
              </span>
            )}
            <span className="absolute -bottom-1 -left-1 flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-secondary-foreground shadow-sm transition-transform group-hover:scale-110">
              <Camera className="h-3.5 w-3.5" aria-hidden />
            </span>
          </button>
          <div className="text-xs text-muted-foreground">
            عکس پروفایل مربعی، حداکثر ۳۶KB. بدون عکس، حرف اول لقب نمایش داده می‌شود.
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadFile(f);
              e.target.value = "";
            }}
          />
        </div>

        {/* آیدی یکتا + لقب نمایشی */}
        <UsernameField value={username} onChange={setUsername} current={user.username} />

        <div className="space-y-1.5">
          <Label htmlFor="nickname">لقب (نام نمایشی)</Label>
          <Input id="nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={24} />
          <p className="text-[11px] text-muted-foreground">نام نمایشی توست و لازم نیست یکتا باشد؛ هویت یکتا همان آیدی است.</p>
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

        {/* حریم خصوصی */}
        <div className="space-y-1.5">
          <Label>حریم خصوصی لیدربرد</Label>
          <div className="grid gap-2 sm:grid-cols-3">
            {PRIVACY_OPTIONS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPrivacy(p.value)}
                className={cn(
                  "cursor-pointer rounded-xl border p-3 text-right transition-colors",
                  privacy === p.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
                )}
              >
                <div className="text-xs font-bold">{p.label}</div>
                <div className="mt-1 text-[10px] leading-5 text-muted-foreground">{p.hint}</div>
              </button>
            ))}
          </div>
        </div>

        {msg && (
          <p className={cn("text-xs", msg.ok ? "text-emerald-600" : "text-destructive")} role="status">
            {msg.ok && <Check className="ml-1 inline h-3.5 w-3.5" aria-hidden />}
            {msg.text}
          </p>
        )}

        <Button onClick={save} disabled={pending || !dirty} className="cursor-pointer gap-2">
          {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          ذخیره تغییرات
        </Button>
      </CardContent>
    </Card>
  );
}
