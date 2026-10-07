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
  // درس عمومی (major خالی) یا مشترک چند رشته (مثل "MATH,EXPERIMENTAL") → فقط پایه
  const effMajor = major && !major.includes(",") ? major : null;
  const m = effMajor ? (shortMajor[effMajor] ?? effMajor) : "";
  return [g, m].filter(Boolean).join(" ");
}

/** برچسب درس مشترک بین چند رشته — «MATH,EXPERIMENTAL» → «مشترک ریاضی و تجربی» */
export function sharedMajorLabel(major: string): string {
  const shortMajor: Record<string, string> = { EXPERIMENTAL: "تجربی", MATH: "ریاضی", HUMANITIES: "انسانی" };
  const parts = major.split(",").map((m) => shortMajor[m.trim()] ?? m.trim()).filter(Boolean);
  return `مشترک ${parts.join(" و ")}`;
}

/** برچسب نوع جلسه — PLACEMENT | PRACTICE | REVIEW */
export function sessionTypeLabel(type: string): string {
  if (type === "PLACEMENT") return "جایابی";
  if (type === "REVIEW") return "مرور";
  return "تمرین";
}

/** تاریخ شمسی — نمایش تاریخ‌های دیتابیس */
export function faDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("fa-IR", { dateStyle: "long" }).format(d);
}
