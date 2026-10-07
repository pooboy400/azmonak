import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getAskFormData } from "@/lib/queries/forum";
import { AskForm } from "@/components/portal/forum-forms";
import { ArrowRight, HelpCircle } from "lucide-react";

export const metadata: Metadata = { title: "پرسش جدید" };

// پرسش جدید — انتخاب درس/مبحث + عنوان + متن با پیش‌نمایش زندهٔ LaTeX
export default async function NewForumQuestionPage() {
  await requireUser();
  const subjects = await getAskFormData();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/portal/forum" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        بازگشت به انجمن
      </Link>

      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <HelpCircle className="h-5 w-5 text-primary" aria-hidden />
          پرسش جدید
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          درس و مبحث را انتخاب کن، عنوان روشن بنویس و توضیح بده دقیقاً کجا گیر کردی.
        </p>
      </div>

      {subjects.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
          هنوز درسی فعال نشده است.
        </p>
      ) : (
        <AskForm subjects={subjects} />
      )}
    </div>
  );
}
