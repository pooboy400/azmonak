// برچسب‌های نمایشی مقادیر ثابت اسکیما (واژگان UI — خودِ داده از دیتابیس می‌آید)

export const GRADE_ORDER = ["GRADE10", "GRADE11", "GRADE12"] as const;
export const MAJOR_ORDER = ["EXPERIMENTAL", "MATH", "HUMANITIES"] as const;

const gradeLabels: Record<string, string> = {
  GRADE10: "پایه دهم",
  GRADE11: "پایه یازدهم",
  GRADE12: "پایه دوازدهم",
};

const majorLabels: Record<string, string> = {
  EXPERIMENTAL: "علوم تجربی",
  MATH: "ریاضی و فیزیک",
  HUMANITIES: "علوم انسانی",
};

export function gradeLabel(grade: string | null): string {
  if (!grade) return "—";
  return gradeLabels[grade] ?? grade;
}

export function majorLabel(major: string | null): string {
  if (!major) return "—";
  return majorLabels[major] ?? major;
}

/** «یازدهم تجربی» — برای نشان‌های کوتاه لیدربرد */
export function cohortLabel(grade: string | null, major: string | null): string {
  if (!grade && !major) return "بدون پایه";
  const shortGrade: Record<string, string> = { GRADE10: "دهم", GRADE11: "یازدهم", GRADE12: "دوازدهم" };
  const shortMajor: Record<string, string> = { EXPERIMENTAL: "تجربی", MATH: "ریاضی", HUMANITIES: "انسانی" };
  const g = grade ? (shortGrade[grade] ?? grade) : "";
  const m = major ? (shortMajor[major] ?? major) : "";
  return [g, m].filter(Boolean).join(" ");
}

/** تاریخ شمسی — نمایش تاریخ‌های دیتابیس */
export function faDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("fa-IR", { dateStyle: "long" }).format(d);
}
