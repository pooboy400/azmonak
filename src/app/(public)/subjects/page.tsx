import type { Metadata } from "next";
import { getActiveSubjects, getPortalUrl } from "@/lib/queries/site";
import { GRADE_ORDER, gradeLabel, MAJOR_ORDER, majorLabel, sharedMajorLabel } from "@/lib/labels";
import { SubjectGrid } from "@/components/site/subject-card";
import { CtaBanner } from "@/components/site/cta-banner";

export const metadata: Metadata = {
  title: "درس‌ها",
  description: "فهرست درس‌های فعال جشنواره نوجوانان خوارزمی در آزمونک — به تفکیک پایه و رشته.",
};

export default async function SubjectsPage() {
  const [subjects, portalUrl] = await Promise.all([getActiveSubjects(), getPortalUrl()]);

  // گروه‌بندی هر پایه: عمومی (همهٔ رشته‌ها) ← اختصاصی هر رشته ← مشترک چند رشته
  const groups = GRADE_ORDER.map((grade) => {
    const inGrade = subjects.filter((s) => s.grade === grade);
    const majors = MAJOR_ORDER.map((major) => ({
      major,
      subjects: inGrade.filter((s) => s.major === major),
    })).filter((g) => g.subjects.length > 0);
    const shared = inGrade.filter((s) => s.major !== null && s.major.includes(","));
    const common = inGrade.filter((s) => s.major === null);
    return { grade, majors, shared, common };
  }).filter((g) => g.majors.length > 0 || g.shared.length > 0 || g.common.length > 0);

  return (
    <>
      <section className="border-b border-border/60 bg-secondary/40">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h1 className="mb-3 text-3xl font-bold text-foreground">درس‌های آزمونک</h1>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
            فهرست زنده از دیتابیس جشنواره — درس‌های فعال آماده تمرین‌اند و درس‌های در حال توسعه به‌محض تأیید داوران
            اضافه می‌شوند.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl space-y-12 px-4 py-14">
        {groups.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border bg-muted/40 p-10 text-center text-muted-foreground">
            هنوز درسی فعال نشده است.
          </p>
        )}
        {groups.map((g) => (
          <div key={g.grade} className="space-y-8">
            <h2 className="text-xl font-bold text-foreground sm:text-2xl">{gradeLabel(g.grade)}</h2>
            {g.common.length > 0 && (
              <div className="space-y-4">
                <h3 className="flex items-center gap-2 text-base font-bold text-secondary-foreground">
                  <span className="h-5 w-1.5 rounded-full bg-primary" aria-hidden />
                  عمومی — همهٔ رشته‌ها
                </h3>
                <SubjectGrid subjects={g.common} portalUrl={portalUrl} />
              </div>
            )}
            {g.majors.map((m) => (
              <div key={m.major} className="space-y-4">
                <h3 className="flex items-center gap-2 text-base font-bold text-secondary-foreground">
                  <span className="h-5 w-1.5 rounded-full bg-primary" aria-hidden />
                  {majorLabel(m.major)}
                </h3>
                <SubjectGrid subjects={m.subjects} portalUrl={portalUrl} />
              </div>
            ))}
            {g.shared.length > 0 && (
              <div className="space-y-4">
                <h3 className="flex items-center gap-2 text-base font-bold text-secondary-foreground">
                  <span className="h-5 w-1.5 rounded-full bg-primary" aria-hidden />
                  {sharedMajorLabel(g.shared[0].major ?? "")}
                </h3>
                <SubjectGrid subjects={g.shared} portalUrl={portalUrl} />
              </div>
            )}
          </div>
        ))}
      </section>

      <CtaBanner />
    </>
  );
}
