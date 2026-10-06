// ================= لایه دسترسی داده بخش عمومی =================
// تنها نقطه اتصال صفحات عمومی به دیتابیس — هیچ صفحه‌ای نباید مستقیم کوئری بزند
// و هیچ داده‌ای نباید در کامپوننت‌ها ثابت شده باشد.
// کش حافظه‌ای کوتاه برای جلوگیری از کوئری تکراری در هر رندر.

import { db } from "@/lib/db";

// ---------- cache ----------
type CacheEntry = { at: number; value: unknown };
const cache = new Map<string, CacheEntry>();

async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as T;
  const value = await fn();
  cache.set(key, { at: Date.now(), value });
  return value;
}

export function invalidateSiteCache(): void {
  cache.clear();
}

// ---------- تنظیمات (CMS) ----------
export async function getSiteSettings(): Promise<Map<string, string>> {
  return cached("settings", 30_000, async () => {
    const rows = await db.siteSetting.findMany();
    return new Map(rows.map((r) => [r.key, r.value]));
  });
}

export async function getSetting(key: string, fallback = ""): Promise<string> {
  const s = await getSiteSettings();
  return s.get(key) ?? fallback;
}

export async function getSettingJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await getSetting(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// ---------- آمار زنده ----------
export interface LiveStats {
  students: number;
  subjects: number;
  questions: number;
  sessions: number;
}

export async function getLiveStats(): Promise<LiveStats> {
  return cached("stats", 15_000, async () => {
    const [students, subjects, questions, sessions] = await Promise.all([
      db.user.count({ where: { role: "STUDENT", isActive: true } }),
      db.subject.count({ where: { isActive: true } }),
      db.question.count({ where: { status: "APPROVED" } }),
      db.session.count({ where: { status: "COMPLETED" } }),
    ]);
    return { students, subjects, questions, sessions };
  });
}

// ---------- درس‌ها ----------
export interface SubjectRow {
  id: string;
  code: string;
  title: string;
  grade: string;
  major: string;
  iconKey: string | null;
  colorKey: string | null;
  topicCount: number;
  questionCount: number;
}

export async function getActiveSubjects(): Promise<SubjectRow[]> {
  return cached("subjects", 60_000, async () => {
    const rows = await db.subject.findMany({
      where: { isActive: true },
      orderBy: [{ grade: "asc" }, { major: "asc" }, { title: "asc" }],
      include: {
        _count: {
          select: { topics: true, questions: { where: { status: "APPROVED" } } },
        },
      },
    });
    return rows.map((s) => ({
      id: s.id,
      code: s.code,
      title: s.title,
      grade: s.grade,
      major: s.major,
      iconKey: s.iconKey,
      colorKey: s.colorKey,
      topicCount: s._count.topics,
      questionCount: s._count.questions,
    }));
  });
}

// ---------- لیدربرد هفتگی (پیش‌نمایش ۳ نفر برتر عمومی) ----------
// همان اصول سند: میانگین نمره وزن‌دار جلسات کامل‌شدهٔ هفتهٔ جاری،
// حداقل ۲ جلسه، حذف کاربران PRIVATE (G10) — جدول کامل داخل پورتال است.

const TEHRAN_OFFSET_MS = 3.5 * 3_600_000;

export function weekStartUtc(): Date {
  const now = Date.now();
  const tehran = new Date(now + TEHRAN_OFFSET_MS);
  const daysSinceSaturday = (tehran.getUTCDay() + 1) % 7; // شنبه = ۰
  const midnightTehran = Date.UTC(tehran.getUTCFullYear(), tehran.getUTCMonth(), tehran.getUTCDate());
  return new Date(midnightTehran - daysSinceSaturday * 86_400_000 - TEHRAN_OFFSET_MS);
}

export interface TopLearner {
  rank: number;
  userId: string;
  nickname: string;
  avatarUrl: string | null;
  grade: string | null;
  major: string | null;
  avgScore: number;
  sessionCount: number;
}

export async function getTopWeek(limit = 3): Promise<{ weekStart: Date; items: TopLearner[] }> {
  const weekStart = weekStartUtc();
  const items = await cached(`top-week-${limit}-${weekStart.toISOString()}`, 30_000, async () => {
    const sessions = await db.session.findMany({
      where: {
        status: "COMPLETED",
        type: "PRACTICE",
        score: { not: null },
        startedAt: { gte: weekStart },
      },
      select: {
        score: true,
        user: { select: { id: true, nickname: true, avatarUrl: true, grade: true, major: true, privacy: true } },
      },
    });
    const agg = new Map<string, { total: number; n: number; u: (typeof sessions)[0]["user"] }>();
    for (const s of sessions) {
      if (s.score === null) continue;
      if (s.user.privacy === "PRIVATE") continue; // لیدربرد از حالت خصوصی صرف‌نظر می‌کند (G10)
      const a = agg.get(s.user.id) ?? { total: 0, n: 0, u: s.user };
      a.total += s.score;
      a.n += 1;
      agg.set(s.user.id, a);
    }
    return [...agg.entries()]
      .filter(([, a]) => a.n >= 2)
      .map(([userId, a]) => ({
        userId,
        nickname: a.u.nickname,
        avatarUrl: a.u.avatarUrl,
        grade: a.u.grade,
        major: a.u.major,
        avgScore: a.total / a.n,
        sessionCount: a.n,
      }))
      .sort((x, y) => y.avgScore - x.avgScore)
      .slice(0, limit)
      .map((r, i) => ({ rank: i + 1, ...r }));
  });
  return { weekStart, items };
}

// ---------- سوالات متداول ----------
export interface FaqRow {
  id: string;
  question: string;
  answer: string;
}

export async function getFaqs(limit?: number): Promise<FaqRow[]> {
  return cached(`faqs-${limit ?? "all"}`, 60_000, async () => {
    const rows = await db.faq.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
      ...(limit ? { take: limit } : {}),
    });
    return rows.map((f) => ({ id: f.id, question: f.question, answer: f.answer }));
  });
}

// ---------- بلاگ ----------
export interface BlogPostRow {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverIcon: string;
  coverTone: string;
  authorName: string;
  publishedAt: Date;
}

export async function getBlogPosts(limit?: number): Promise<BlogPostRow[]> {
  return cached(`posts-${limit ?? "all"}`, 30_000, async () => {
    const rows = await db.blogPost.findMany({
      where: { isPublished: true },
      orderBy: { publishedAt: "desc" },
      ...(limit ? { take: limit } : {}),
    });
    return rows.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      coverIcon: p.coverIcon,
      coverTone: p.coverTone,
      authorName: p.authorName,
      publishedAt: p.publishedAt,
    }));
  });
}

export interface BlogPostFull extends BlogPostRow {
  content: string;
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPostFull | null> {
  const p = await db.blogPost.findFirst({
    where: { slug, isPublished: true },
  });
  if (!p) return null;
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    content: p.content,
    coverIcon: p.coverIcon,
    coverTone: p.coverTone,
    authorName: p.authorName,
    publishedAt: p.publishedAt,
  };
}

// ---------- محتوای مرکب از تنظیمات ----------
export interface FeatureCard {
  icon: string;
  title: string;
  text: string;
}

export type StepCard = FeatureCard;

export interface AboutValue {
  icon: string;
  title: string;
  text: string;
}

export interface AboutContent {
  intro: string;
  mission: string;
  vision: string;
  values: AboutValue[];
}

export interface ContactInfo {
  phone: string;
  email: string;
  address: string;
  hours: string;
}

export interface SocialLink {
  icon: string;
  label: string;
  url: string;
}

export function getFeatures(): Promise<FeatureCard[]> {
  return getSettingJson<FeatureCard[]>("features", []);
}

export function getSteps(): Promise<StepCard[]> {
  return getSettingJson<StepCard[]>("steps", []);
}

export function getAbout(): Promise<AboutContent> {
  return (async () => ({
    intro: await getSetting("about.intro"),
    mission: await getSetting("about.mission"),
    vision: await getSetting("about.vision"),
    values: await getSettingJson<AboutValue[]>("about.values", []),
  }))();
}

export function getContact(): Promise<ContactInfo> {
  return (async () => ({
    phone: await getSetting("contact.phone"),
    email: await getSetting("contact.email"),
    address: await getSetting("contact.address"),
    hours: await getSetting("contact.hours"),
  }))();
}

export function getSocials(): Promise<SocialLink[]> {
  return getSettingJson<SocialLink[]>("social", []);
}

export function getPortalUrl(): Promise<string> {
  return getSetting("portal.url", "/portal");
}
