import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, BadgeCheck, BookOpenCheck, Sparkles, Trophy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SubjectGrid } from "@/components/site/subject-card";
import { LeaderboardPodium } from "@/components/site/leaderboard-podium";
import { CtaBanner } from "@/components/site/cta-banner";
import { DbIcon } from "@/lib/icon-map";
import {
  getActiveSubjects,
  getFaqs,
  getFeatures,
  getLiveStats,
  getPortalUrl,
  getSiteSettings,
  getSteps,
  getTopWeek,
} from "@/lib/queries/site";

const faNum = (n: number) => n.toLocaleString("fa-IR");

export default async function LandingPage() {
  const [settings, stats, features, steps, subjects, top, faqs, portalUrl] = await Promise.all([
    getSiteSettings(),
    getLiveStats(),
    getFeatures(),
    getSteps(),
    getActiveSubjects(),
    getTopWeek(3),
    getFaqs(4),
    getPortalUrl(),
  ]);

  const hero = {
    badge: settings.get("hero.badge") ?? "",
    title: settings.get("hero.title") ?? "",
    subtitle: settings.get("hero.subtitle") ?? "",
    primaryCta: settings.get("hero.primaryCta") ?? "",
    secondaryCta: settings.get("hero.secondaryCta") ?? "",
  };
  const teaser = {
    title: settings.get("leaderboard.teaserTitle") ?? "",
    note: settings.get("leaderboard.teaserNote") ?? "",
  };

  const statCards = [
    { icon: Users, value: stats.students, label: "دانش‌آموز فعال" },
    { icon: BookOpenCheck, value: stats.subjects, label: "درس فعال" },
    { icon: Sparkles, value: stats.questions, label: "سؤال تأییدشده" },
    { icon: Trophy, value: stats.sessions, label: "جلسه برگزارشده" },
  ];

  return (
    <div className="overflow-x-clip">
      {/* ---------- هیرو ---------- */}
      <section className="relative border-b border-border/60 bg-gradient-to-b from-secondary/60 to-background">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:py-20 lg:grid-cols-2 lg:py-24">
          <div className="text-center lg:text-right">
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white px-4 py-1.5 text-sm font-medium text-primary shadow-sm">
              <BadgeCheck className="h-4 w-4" aria-hidden />
              {hero.badge}
            </span>
            <h1 className="mb-5 text-4xl font-bold leading-[1.25] text-foreground sm:text-5xl sm:leading-[1.2]">
              {hero.title}
            </h1>
            <p className="mx-auto mb-8 max-w-xl text-base leading-8 text-muted-foreground lg:mx-0">{hero.subtitle}</p>
            <div className="flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <Button asChild size="lg" className="h-13 px-8 text-base shadow-lg shadow-primary/25">
                <Link href={portalUrl}>{hero.primaryCta}</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-13 px-8 text-base">
                <Link href="/subjects">
                  {hero.secondaryCta}
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
            </div>
          </div>

          {/* پنل تصویری */}
          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute inset-6 rounded-[2.5rem] bg-gradient-to-br from-[#4840E0] to-[#7A5CFF] opacity-90 blur-2xl" aria-hidden />
            <div className="relative rounded-[2rem] border border-primary/10 bg-gradient-to-br from-[#4840E0] to-[#6A5CFF] p-8 shadow-2xl shadow-primary/25">
              <div className="mb-6 flex items-center justify-between">
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white">جلسه تمرین زنده</span>
                <Image src="/logo-mark.png" alt="" width={40} height={40} className="h-10 w-10 rounded-xl" />
              </div>
              <div className="mb-4 rounded-2xl bg-white/95 p-4 shadow-sm">
                <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">سؤال {faNum(7)} از {faNum(10)}</span>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-600">سطح مناسب تو</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
                  <div className="h-full w-[70%] rounded-full bg-gradient-to-l from-[#4840E0] to-[#7A5CFF]" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center text-white">
                {["تطبیقی", "مرور هوشمند", "لیدربرد"].map((t) => (
                  <span key={t} className="rounded-xl bg-white/10 px-2 py-3 text-xs font-medium backdrop-blur-sm">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- آمار زنده ---------- */}
      <section className="border-b border-border/60 bg-white" aria-label="آمار سامانه">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-10 sm:grid-cols-4">
          {statCards.map((s) => (
            <div key={s.label} className="text-center">
              <s.icon className="mx-auto mb-2 h-5 w-5 text-primary" aria-hidden />
              <span className="block text-2xl font-bold text-foreground sm:text-3xl">{faNum(s.value)}</span>
              <span className="text-xs text-muted-foreground sm:text-sm">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- ویژگی‌ها ---------- */}
      <section className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="features-title">
        <div className="mb-10 text-center">
          <h2 id="features-title" className="mb-3 text-2xl font-bold text-foreground sm:text-3xl">
            چرا آزمونک؟
          </h2>
          <p className="mx-auto max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
            چهار ستونی که تمرین را از «حفظ کردن» به «رشد کردن» تبدیل می‌کند.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => {
            return (
              <div key={f.title} className="rounded-2xl border border-border bg-card p-6 transition-shadow hover:shadow-lg hover:shadow-primary/5">
                <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-primary">
                  <DbIcon k={f.icon} className="h-6 w-6" />
                </span>
                <h3 className="mb-2 text-base font-bold text-card-foreground">{f.title}</h3>
                <p className="text-sm leading-7 text-muted-foreground">{f.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ---------- گام‌ها ---------- */}
      <section className="border-y border-border/60 bg-secondary/40" aria-labelledby="steps-title">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="mb-10 text-center">
            <h2 id="steps-title" className="mb-3 text-2xl font-bold text-foreground sm:text-3xl">
              سه قدم تا شروع
            </h2>
            <p className="mx-auto max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
              از ثبت‌نام تا اولین جلسه تمرین تطبیقی، کمتر از پنج دقیقه.
            </p>
          </div>
          <ol className="grid gap-4 sm:grid-cols-3">
            {steps.map((s, i) => {
              return (
                <li key={s.title} className="relative rounded-2xl border border-border bg-card p-6">
                  <span
                    className="absolute -top-3 right-5 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground"
                    aria-hidden
                  >
                    {faNum(i + 1)}
                  </span>
                  <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-primary">
                    <DbIcon k={s.icon} className="h-6 w-6" />
                  </span>
                  <h3 className="mb-2 text-base font-bold text-card-foreground">{s.title}</h3>
                  <p className="text-sm leading-7 text-muted-foreground">{s.text}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* ---------- درس‌ها (پیش‌نمایش) ---------- */}
      <section className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="subjects-title">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="subjects-title" className="mb-2 text-2xl font-bold text-foreground sm:text-3xl">
              درس‌های جشنواره
            </h2>
            <p className="text-sm leading-7 text-muted-foreground sm:text-base">
              درس‌های فعال و در دست توسعه — فهرست کامل و به‌روز همه پایه‌ها و رشته‌ها.
            </p>
          </div>
          <Button asChild variant="ghost" className="text-primary">
            <Link href="/subjects">
              همه درس‌ها
              <ArrowLeft className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>
        <SubjectGrid subjects={subjects.slice(0, 6)} />
      </section>

      {/* ---------- لیدربرد ۳ نفر برتر ---------- */}
      <section className="border-y border-border/60 bg-secondary/40" aria-labelledby="top-title">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="mb-10 text-center">
            <h2 id="top-title" className="mb-3 text-2xl font-bold text-foreground sm:text-3xl">
              {teaser.title}
            </h2>
            <p className="mx-auto max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">{teaser.note}</p>
          </div>
          <LeaderboardPodium items={top.items} />
          <div className="mt-8 text-center">
            <Button asChild variant="outline">
              <Link href={portalUrl}>جدول کامل در پورتال</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ---------- سوالات متداول (پیش‌نمایش) ---------- */}
      <section className="mx-auto max-w-3xl px-4 py-16" aria-labelledby="faq-title">
        <div className="mb-8 text-center">
          <h2 id="faq-title" className="mb-3 text-2xl font-bold text-foreground sm:text-3xl">
            پرسش‌های پرتکرار
          </h2>
          <p className="text-sm leading-7 text-muted-foreground sm:text-base">
            پاسخ سریع شایع‌ترین پرسش‌ها — فهرست کامل در صفحه سوالات متداول.
          </p>
        </div>
        <Accordion type="single" collapsible className="mb-6">
          {faqs.map((f) => (
            <AccordionItem key={f.id} value={f.id}>
              <AccordionTrigger className="text-right text-base font-medium">{f.question}</AccordionTrigger>
              <AccordionContent className="text-sm leading-7 text-muted-foreground">{f.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <div className="text-center">
          <Button asChild variant="ghost" className="text-primary">
            <Link href="/faq">
              همه پرسش‌ها
              <ArrowLeft className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>
      </section>

      {/* ---------- بنر CTA ---------- */}
      <CtaBanner />
    </div>
  );
}
