import { ArrowLeft } from "lucide-react";
import { DbIcon, getTone } from "@/lib/icon-map";
import { cohortLabel } from "@/lib/labels";
import type { SubjectRow } from "@/lib/queries/site";

export function SubjectCard({ subject }: { subject: SubjectRow }) {
  const tone = getTone(subject.colorKey);
  const hasContent = subject.questionCount > 0;

  return (
    <div className="group rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5">
      <div className="mb-4 flex items-start justify-between">
        <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${tone.iconBox} ${tone.iconText}`}>
          <DbIcon k={subject.iconKey} className="h-6 w-6" />
        </span>
        <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${tone.chip}`}>
          {cohortLabel(subject.grade, subject.major)}
        </span>
      </div>
      <h3 className="mb-1.5 text-base font-bold text-card-foreground">{subject.title}</h3>
      <p className="mb-4 text-sm text-muted-foreground">
        {hasContent
          ? `${subject.topicCount.toLocaleString("fa-IR")} مبحث · ${subject.questionCount.toLocaleString("fa-IR")} سؤال فعال`
          : "محتوا به‌زودی اضافه می‌شود"}
      </p>
      {hasContent && (
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
          تمرین در پورتال
          <ArrowLeft className="h-4 w-4" aria-hidden />
        </span>
      )}
      {!hasContent && <span className="inline-block text-xs text-muted-foreground/70">{subject.code}</span>}
      <span className="sr-only">{`${subject.title} — ${cohortLabel(subject.grade, subject.major)}`}</span>
    </div>
  );
}

export function SubjectGrid({ subjects }: { subjects: SubjectRow[] }) {
  if (subjects.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border bg-muted/40 p-8 text-center text-sm text-muted-foreground">
        فعلاً درسی ثبت نشده است — به‌زودی درس‌های بیشتری اضافه می‌شود.
      </p>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {subjects.map((s) => (
        <SubjectCard key={s.id} subject={s} />
      ))}
    </div>
  );
}
