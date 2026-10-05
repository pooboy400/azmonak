// Sample people, community and misconception definitions.
// All SAMPLE data (isSample=true), ids prefixed "smp", phones 09990000xxx
// (an unmistakably fake range) — fully removable via `bun run db:clean-sample`.

export interface SeedUser {
  id: string; // smpu01 ...
  nickname: string;
  emoji: string;
  grade: "GRADE10" | "GRADE11" | "GRADE12" | null;
  major: "EXPERIMENTAL" | "MATH" | "HUMANITIES" | null;
  role: "STUDENT" | "TEACHER";
  privacy: "PUBLIC" | "FRIENDS" | "PRIVATE";
  /** base skill 0..1 — used only by the seeder to drive realistic history */
  skill: number;
}

export const USERS: SeedUser[] = [
  // ---- یازدهم تجربی (16) — the demo-heavy cohort ----
  { id: "smpu01", nickname: "درسا.زیستی",      emoji: "🐼",  grade: "GRADE11", major: "EXPERIMENTAL", role: "STUDENT", privacy: "PUBLIC",  skill: 0.86 },
  { id: "smpu02", nickname: "آرش_فیزیکدان",    emoji: "🦅",  grade: "GRADE11", major: "EXPERIMENTAL", role: "STUDENT", privacy: "FRIENDS", skill: 0.78 },
  { id: "smpu03", nickname: "مینا.ریاضیات",    emoji: "🦊",  grade: "GRADE11", major: "EXPERIMENTAL", role: "STUDENT", privacy: "FRIENDS", skill: 0.74 },
  { id: "smpu04", nickname: "کیان_حافظ",       emoji: "🦁",  grade: "GRADE11", major: "EXPERIMENTAL", role: "STUDENT", privacy: "FRIENDS", skill: 0.70 },
  { id: "smpu05", nickname: "نگار.آسمان",      emoji: "🦋",  grade: "GRADE11", major: "EXPERIMENTAL", role: "STUDENT", privacy: "PUBLIC",  skill: 0.66 },
  { id: "smpu06", nickname: "سامان_ساعی",      emoji: "🐢",  grade: "GRADE11", major: "EXPERIMENTAL", role: "STUDENT", privacy: "FRIENDS", skill: 0.62 },
  { id: "smpu07", nickname: "تارا.مطالعه",     emoji: "🐬",  grade: "GRADE11", major: "EXPERIMENTAL", role: "STUDENT", privacy: "FRIENDS", skill: 0.60 },
  { id: "smpu08", nickname: "پارسا_پرکار",     emoji: "🐝",  grade: "GRADE11", major: "EXPERIMENTAL", role: "STUDENT", privacy: "FRIENDS", skill: 0.58 },
  { id: "smpu09", nickname: "رها.سربالایی",    emoji: "🦌",  grade: "GRADE11", major: "EXPERIMENTAL", role: "STUDENT", privacy: "FRIENDS", skill: 0.55 },
  { id: "smpu10", nickname: "شیوا_شب‌خوان",    emoji: "🦉",  grade: "GRADE11", major: "EXPERIMENTAL", role: "STUDENT", privacy: "PRIVATE", skill: 0.52 },
  { id: "smpu11", nickname: "امیر.امتحان",     emoji: "🐯",  grade: "GRADE11", major: "EXPERIMENTAL", role: "STUDENT", privacy: "PRIVATE", skill: 0.50 },
  { id: "smpu12", nickname: "درنا_سپید",       emoji: "🕊️", grade: "GRADE11", major: "EXPERIMENTAL", role: "STUDENT", privacy: "FRIENDS", skill: 0.47 },
  { id: "smpu13", nickname: "بهنام.بنویس",     emoji: "🐙",  grade: "GRADE11", major: "EXPERIMENTAL", role: "STUDENT", privacy: "FRIENDS", skill: 0.44 },
  { id: "smpu14", nickname: "سپیده_ستاره",     emoji: "🌙",  grade: "GRADE11", major: "EXPERIMENTAL", role: "STUDENT", privacy: "FRIENDS", skill: 0.42 },
  { id: "smpu15", nickname: "فرزاد.فراتر",     emoji: "🐘",  grade: "GRADE11", major: "EXPERIMENTAL", role: "STUDENT", privacy: "FRIENDS", skill: 0.40 },
  { id: "smpu16", nickname: "نگین_نوشتار",     emoji: "🐞",  grade: "GRADE11", major: "EXPERIMENTAL", role: "STUDENT", privacy: "FRIENDS", skill: 0.38 },
  // ---- دهم تجربی (4) ----
  { id: "smpu17", nickname: "آوا.ارشمیدس",     emoji: "🐰",  grade: "GRADE10", major: "EXPERIMENTAL", role: "STUDENT", privacy: "FRIENDS", skill: 0.70 },
  { id: "smpu18", nickname: "هیراد_هوشمند",    emoji: "🐴",  grade: "GRADE10", major: "EXPERIMENTAL", role: "STUDENT", privacy: "PUBLIC",  skill: 0.60 },
  { id: "smpu19", nickname: "مهسا.مشوق",       emoji: "🐱",  grade: "GRADE10", major: "EXPERIMENTAL", role: "STUDENT", privacy: "FRIENDS", skill: 0.55 },
  { id: "smpu20", nickname: "نوید_نمونه",      emoji: "🐹",  grade: "GRADE10", major: "EXPERIMENTAL", role: "STUDENT", privacy: "FRIENDS", skill: 0.45 },
  // ---- یازدهم ریاضی (4) ----
  { id: "smpu21", nickname: "آریا.انتگرال",    emoji: "🦖",  grade: "GRADE11", major: "MATH", role: "STUDENT", privacy: "FRIENDS", skill: 0.80 },
  { id: "smpu22", nickname: "النا_لگاریتم",    emoji: "🦜",  grade: "GRADE11", major: "MATH", role: "STUDENT", privacy: "PUBLIC",  skill: 0.68 },
  { id: "smpu23", nickname: "متین.مشتق",       emoji: "🐺",  grade: "GRADE11", major: "MATH", role: "STUDENT", privacy: "FRIENDS", skill: 0.58 },
  { id: "smpu24", nickname: "سارا_سیگما",      emoji: "🐨",  grade: "GRADE11", major: "MATH", role: "STUDENT", privacy: "FRIENDS", skill: 0.48 },
  // ---- دبیران (2) ----
  { id: "smpt01", nickname: "فرشاد کاویانی",   emoji: "👨‍🏫", grade: null, major: null, role: "TEACHER", privacy: "PUBLIC",  skill: 0 },
  { id: "smpt02", nickname: "لیلا موسوی",      emoji: "👩‍🏫", grade: null, major: null, role: "TEACHER", privacy: "PUBLIC",  skill: 0 },
];

/** phone for a sample user: 09990000001, 09990000002, ... (fake range) */
export function samplePhone(index: number): string {
  return `099900000${String(index).padStart(2, "0")}`;
}

export interface SeedClass {
  id: string;
  name: string;
  code: string;
  teacherId: string;
  grade: "GRADE10" | "GRADE11";
  major: "EXPERIMENTAL" | "MATH";
  memberIds: string[];
}

export const CLASSES: SeedClass[] = [
  { id: "smpcls1", name: "یازدهم تجربی ۱", code: "AMZK-11TA", teacherId: "smpt01", grade: "GRADE11", major: "EXPERIMENTAL", memberIds: ["smpu01", "smpu02", "smpu03", "smpu04", "smpu05", "smpu06", "smpu07", "smpu08", "smpu09", "smpu10", "smpu11", "smpu12"] },
  { id: "smpcls2", name: "دهم تجربی ۱",    code: "AMZK-10TA", teacherId: "smpt02", grade: "GRADE10", major: "EXPERIMENTAL", memberIds: ["smpu17", "smpu18", "smpu19", "smpu20"] },
];

/** [requesterId, addresseeId, accepted?] — ring + extras inside یازدهم تجربی, few cross links */
export const FRIENDSHIPS: Array<[string, string, boolean]> = [
  ["smpu01", "smpu02", true], ["smpu02", "smpu03", true], ["smpu03", "smpu04", true],
  ["smpu04", "smpu05", true], ["smpu05", "smpu06", true], ["smpu06", "smpu07", true],
  ["smpu07", "smpu08", true], ["smpu08", "smpu09", true], ["smpu09", "smpu10", true],
  ["smpu10", "smpu11", true], ["smpu11", "smpu12", true], ["smpu12", "smpu13", true],
  ["smpu13", "smpu14", true], ["smpu14", "smpu15", true], ["smpu15", "smpu16", true],
  ["smpu16", "smpu01", true],
  // extra cross links
  ["smpu01", "smpu05", true], ["smpu01", "smpu09", true], ["smpu02", "smpu07", true],
  ["smpu03", "smpu06", true], ["smpu04", "smpu08", true], ["smpu05", "smpu12", true],
  ["smpu06", "smpu10", true], ["smpu07", "smpu13", true], ["smpu08", "smpu14", true],
  // pending requests (badge demo)
  ["smpu05", "smpu09", false], ["smpu12", "smpu03", false],
  // cross-grade
  ["smpu01", "smpu17", true], ["smpu21", "smpu03", true], ["smpu21", "smpu22", true],
];

// ---------------- بدفهمی‌ها — بذر M01–M10 (بخش ۹٫۱ سند اصلی) ----------------
// Parked by D16 (non-blocking, plan task 0.6) — schema kept, mechanism inactive.

export interface SeedMisconception {
  code: string;
  title: string;
  behaviorSign: string;
  prerequisites: string;
  remedialTopic: string;
  explanationText: string;
}

export const MISCONCEPTIONS: SeedMisconception[] = [
  { code: "M01", title: "مشتق را «تفاضل» می‌فهمد نه نرخ لحظه‌ای", behaviorSign: "گزینه‌هایی برمی‌گزیند که $f(b)-f(a)$ را معادل مشتق می‌گیرند", prerequisites: "", remedialTopic: "نرخ لحظه‌ای و پیوستار", explanationText: "مشتق، شیب خط مماس و نرخ تغییرِ لحظه‌ای است، نه مقدار تغییر کل. با مثال سرعت‌سنج ماشین فرق سرعت لحظه‌ای و میانگین سرعت را ببین. روی گراف، شیب پیش و پس از نقطه را با شیب همان نقطه مقایسه کن." },
  { code: "M02", title: "مشتق را مقدار تابع می‌پندارد", behaviorSign: "$f(a)$ را با $f'(a)$ اشتباه می‌گیرد", prerequisites: "", remedialTopic: "مفهوم مشتق در نقطه", explanationText: "$f(a)$ مقدار تابع در نقطه است ولی $f'(a)$ شیب مماس در همان نقطه. جدولی با دو ستون جدا برای این دو مفهوم بساز تا تمایز تثبیت شود. واحدِ هر کدام هم متفاوت است." },
  { code: "M03", title: "مماس را با واصل جایگزین می‌کند", behaviorSign: "شیب خط دو‌نقطه را برای نقطه‌ای گزارش می‌کند", prerequisites: "M01", remedialTopic: "حد و تعریف مشتق", explanationText: "واصل از دو نقطه می‌گذرد، مماس فقط در یک نقطه لمس می‌کند. با جابه‌جایی نقطهٔ دوم به سمت نقطهٔ اول، واصل به مماس می‌رسد؛ همین حد، تعریف مشتق است." },
  { code: "M04", title: "$f'(x)=0$ را کافی برای اکسترمم می‌داند", behaviorSign: "بررسی علامت مشتق در اطراف نقطه را حذف می‌کند", prerequisites: "M01", remedialTopic: "اکسترمم‌های نسبی", explanationText: "$f'=0$ فقط نامزد اکسترمم است؛ باید علامت مشتق دو طرف نقطه بررسی شود. مثال $x^3$ را ببین: مشتق در صفر صفر است ولی اکسترمم ندارد." },
  { code: "M05", title: "مشتق حاصل‌ضرب = ضرب مشتق‌ها", behaviorSign: "$(fg)'$ را $f'g'$ می‌نویسد", prerequisites: "", remedialTopic: "قاعدهٔ ضرب", explanationText: "قاعدهٔ ضرب: $(fg)'=f'g+fg'$. با مثال $x^2=x\\cdot x$ امتحان کن: اگر $f'g'$ درست بود جواب $1$ می‌شد، ولی جواب واقعی $2x$ است." },
  { code: "M06", title: "قاعدهٔ زنجیره‌ای: ضرب به‌جای ترکیب", behaviorSign: "$(f\\circ g)'$ را بدون $f'(g(x))$ می‌گیرد", prerequisites: "M05", remedialTopic: "قاعدهٔ زنجیره‌ای", explanationText: "در ترکیب، مشتق تابع بیرونی باید در نقطهٔ $g(x)$ ارزیابی شود و سپس در مشتق تابع درونی ضرب گردد: $(f\\circ g)'=f'(g)\\cdot g'$. لایه‌ها را جدا نام‌گذاری کن." },
  { code: "M07", title: "صعودی بودن نقطه‌ای و بازه‌ای را یکی می‌گیرد", behaviorSign: "از مثبت بودن مشتق در یک نقطه، صعودی بودن کل بازه را نتیجه می‌کند", prerequisites: "M04", remedialTopic: "کاربردهای مشتق: صعودی/نزولی", explanationText: "صعودی بودن دربارهٔ کل بازه است و به مثبت بودن مشتق در همهٔ نقاط آن بازه نیاز دارد. یک نقطه هرگز دربارهٔ کل بازه حکم نمی‌دهد." },
  { code: "M08", title: "مشتق‌پذیری را با پیوستگی یکی می‌گیرد", behaviorSign: "برای توابع شکسته یا گوشه‌دار (مثل قدرمطلق در صفر) مشتق‌پذیری می‌پذیرد", prerequisites: "M01", remedialTopic: "شرط‌های مشتق‌پذیری", explanationText: "هر تابع مشتق‌پذیر پیوسته است، ولی عکس این گزاره نادرست است. تابع قدرمطلق در صفر پیوسته است اما گوشه دارد و مشتق‌پذیر نیست." },
  { code: "M09", title: "خطای توان منفی و ریشه در قاعدهٔ توان", behaviorSign: "مشتق $x^{-n}$ یا جذر را با نتوان درست حساب می‌کند", prerequisites: "", remedialTopic: "قاعدهٔ توان", explanationText: "پیش از مشتق‌گیری، جذر و توان منفی را به توان کسری یا منفی بِنویس: $\\sqrt{x}=x^{1/2}$. سپس قاعدهٔ توان را همان‌طور همیشگی اعمال کن." },
  { code: "M10", title: "مشتق تابع ثابت را صفر نمی‌داند", behaviorSign: "در ساده‌سازی‌ها جملهٔ ثابت را حذف نمی‌کند", prerequisites: "", remedialTopic: "مشتق توابع ابتدایی", explanationText: "تابع ثابت هیچ نرخ تغییری ندارد؛ پس مشتق آن صفر است. گراف خط افقی را ببین: شیبش همه‌جا صفر است." },
];
