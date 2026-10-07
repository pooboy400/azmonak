import type { Metadata } from "next";
import { getAbout, getSetting } from "@/lib/queries/site";
import { DbIcon } from "@/lib/icon-map";
import { CtaBanner } from "@/components/site/cta-banner";

export const metadata: Metadata = {
  title: "درباره ما",
  description: "داستان شکل‌گیری آزمونک، مأموریت و آرزوهای ما برای تمرین علمی نوجوانان ایران.",
};

export default async function AboutPage() {
  const [about, name] = await Promise.all([getAbout(), getSetting("site.name")]);

  return (
    <>
      <section className="border-b border-border/60 bg-secondary/40">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h1 className="mb-3 text-3xl font-bold text-foreground">درباره {name}</h1>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-14">
        <div className="space-y-10">
          <p className="text-base leading-9 text-foreground">{about.intro}</p>

          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
            <h2 className="mb-3 text-lg font-bold text-primary">مأموریت ما</h2>
            <p className="text-sm leading-8 text-muted-foreground sm:text-base">{about.mission}</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
            <h2 className="mb-3 text-lg font-bold text-primary">آرزوی ما</h2>
            <p className="text-sm leading-8 text-muted-foreground sm:text-base">{about.vision}</p>
          </div>

          <div>
            <h2 className="mb-6 text-lg font-bold text-foreground">ارزش‌هایی که به آن‌ها پایبندیم</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {about.values.map((v) => {
                return (
                  <div key={v.title} className="rounded-2xl border border-border bg-card p-5">
                    <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-primary">
                      <DbIcon k={v.icon} className="h-5 w-5" />
                    </span>
                    <h3 className="mb-1.5 text-base font-bold text-card-foreground">{v.title}</h3>
                    <p className="text-sm leading-7 text-muted-foreground">{v.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <CtaBanner />
    </>
  );
}
