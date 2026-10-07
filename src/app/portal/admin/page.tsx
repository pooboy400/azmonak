import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getAdminOverview } from "@/lib/queries/admin";
import { faNum } from "@/lib/fa";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, ClipboardCheck, FileQuestion, GraduationCap, Handshake, HelpCircle, LayoutDashboard, School, Target, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArrowUpRight } from "lucide-react";

export const metadata: Metadata = { title: "پنل ادمین" };

// پنل ادمین — نمای کلی؛ مدیریت کاربران/درس‌ها/سؤال‌ها در زیرصفحه‌ها
export default async function AdminOverviewPage() {
  const user = await requireRole(["ADMIN"]);
  const data = await getAdminOverview();

  const sections: Array<{ title: string; items: Array<{ label: string; value: string; icon: typeof Users }> }> = [
    {
      title: "کاربران",
      items: [
        { label: "کل کاربران", value: faNum(data.users.total), icon: Users },
        { label: "دانش‌آموز", value: faNum(data.users.students), icon: GraduationCap },
        { label: "معلم", value: faNum(data.users.teachers), icon: Users },
        { label: "ادمین", value: faNum(data.users.admins), icon: LayoutDashboard },
        { label: "فعال", value: faNum(data.users.active), icon: Users },
      ],
    },
    {
      title: "محتوا",
      items: [
        { label: "درس", value: faNum(data.content.subjects), icon: BookOpen },
        { label: "مبحث", value: faNum(data.content.topics), icon: BookOpen },
        { label: "سؤال (کل)", value: faNum(data.content.questions.total), icon: FileQuestion },
        { label: "تأییدشده", value: faNum(data.content.questions.approved), icon: ClipboardCheck },
        { label: "پیش‌نویس/بررسی", value: faNum(data.content.questions.draft), icon: FileQuestion },
        { label: "بازنشسته", value: faNum(data.content.questions.retired), icon: FileQuestion },
      ],
    },
    {
      title: "فعالیت یادگیری",
      items: [
        { label: "جلسه", value: faNum(data.activity.sessions), icon: Target },
        { label: "جلسهٔ کامل", value: faNum(data.activity.completed), icon: Target },
        { label: "پاسخ ثبت‌شده", value: faNum(data.activity.attempts), icon: ClipboardCheck },
      ],
    },
    {
      title: "کامیونیتی",
      items: [
        { label: "کلاس", value: faNum(data.community.classes), icon: School },
        { label: "دوستی", value: faNum(data.community.friendships), icon: Handshake },
        { label: "سؤال انجمن", value: faNum(data.community.forumQuestions), icon: HelpCircle },
        { label: "پاسخ انجمن", value: faNum(data.community.forumAnswers), icon: HelpCircle },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <LayoutDashboard className="h-5 w-5 text-primary" aria-hidden />
          پنل ادمین
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">سلام {user.nickname} — مدیریت کل سامانه از این‌جاست.</p>
      </div>

      {/* میان‌برها */}
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm" className="cursor-pointer gap-1.5">
          <Link href="/portal/admin/users">
            مدیریت کاربران
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="cursor-pointer gap-1.5">
          <Link href="/portal/admin/subjects">
            مدیریت درس‌ها
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="cursor-pointer gap-1.5">
          <Link href="/portal/admin/questions">
            بانک سؤال
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="cursor-pointer gap-1.5">
          <Link href="/portal/admin/questions/new">
            سؤال جدید
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </Button>
      </div>

      {/* آمار بخش‌بندی‌شده */}
      <div className="grid gap-4 lg:grid-cols-2">
        {sections.map((sec) => (
          <Card key={sec.title} className="border-border/70">
            <CardContent className="p-4">
              <h2 className="mb-3 text-sm font-bold">{sec.title}</h2>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {sec.items.map((it) => (
                  <div key={it.label} className="rounded-xl bg-secondary/50 px-3 py-2.5">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <it.icon className="h-3.5 w-3.5" aria-hidden />
                      {it.label}
                    </div>
                    <div className="mt-1 text-lg font-bold leading-6">{it.value}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
