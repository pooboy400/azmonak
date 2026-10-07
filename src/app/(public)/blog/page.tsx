import type { Metadata } from "next";
import Link from "next/link";
import { getBlogPosts } from "@/lib/queries/site";
import { DbIcon, getTone } from "@/lib/icon-map";
import { faDate } from "@/lib/labels";
import { CtaBanner } from "@/components/site/cta-banner";

export const metadata: Metadata = {
  title: "بلاگ",
  description: "یادداشت‌های تیم آزمونک درباره سنجش تطبیقی، مرور هوشمند و تجربه یادگیری نوجوانان.",
};

export default async function BlogPage() {
  const posts = await getBlogPosts();

  return (
    <>
      <section className="border-b border-border/60 bg-secondary/40">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h1 className="mb-3 text-3xl font-bold text-foreground">بلاگ آزمونک</h1>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
            علمِ پشت آزمونک را ساده و شفاف برایت می‌نویسیم.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        {posts.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-muted/40 p-10 text-center text-muted-foreground">
            هنوز نوشته‌ای منتشر نشده است — به‌زودی.
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => {
              const tone = getTone(p.coverTone);
              return (
                <article key={p.id} className="group overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-lg hover:shadow-primary/5">
                  <Link href={`/blog/${p.slug}`} className="block">
                    <div className={`relative flex h-40 items-center justify-center bg-gradient-to-bl ${tone.cover}`}>
                      <DbIcon k={p.coverIcon} className="h-12 w-12 text-white/90" />
                    </div>
                    <div className="p-5">
                      <div className="mb-3 flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{faDate(p.publishedAt)}</span>
                        <span aria-hidden>·</span>
                        <span>{p.authorName}</span>
                      </div>
                      <h2 className="mb-2 text-base font-bold leading-7 text-card-foreground group-hover:text-primary">
                        {p.title}
                      </h2>
                      <p className="line-clamp-3 text-sm leading-7 text-muted-foreground">{p.excerpt}</p>
                    </div>
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <CtaBanner />
    </>
  );
}
