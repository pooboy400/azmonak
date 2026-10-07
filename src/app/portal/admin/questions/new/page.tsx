import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getAdminSubjectsForQuestion } from "@/lib/queries/admin";
import { CreateQuestionForm } from "@/components/portal/admin-forms";
import { ArrowRight, FileQuestion } from "lucide-react";

export const metadata: Metadata = { title: "سؤال جدید" };

// سؤال جدید ادمین — فرم کامل با پیش‌نمایش زندهٔ LaTeX
export default async function NewAdminQuestionPage() {
  await requireRole(["ADMIN"]);
  const subjects = await getAdminSubjectsForQuestion();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/portal/admin/questions" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        بازگشت به بانک سؤال
      </Link>

      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <FileQuestion className="h-5 w-5 text-primary" aria-hidden />
          سؤال جدید
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          فرمول‌ها را با LaTeX بنویس — درون‌خطی <code dir="ltr">{"$x^2$"}</code> و بلوکی{" "}
          <code dir="ltr">{"$$\\frac{a}{b}$$"}</code>. رتبینگ اولیه از سختی گرفته می‌شود (آسان ۱۱۵۰ / متوسط ۱۲۵۰ / سخت
          ۱۳۵۰).
        </p>
      </div>

      {subjects.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
          اول از «مدیریت درس‌ها» یک درس فعال بساز.
        </p>
      ) : (
        <CreateQuestionForm subjects={subjects} />
      )}
    </div>
  );
}
