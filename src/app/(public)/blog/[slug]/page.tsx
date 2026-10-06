import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { getBlogPostBySlug } from "@/lib/queries/site";
import { DbIcon, getTone } from "@/lib/icon-map";
import { faDate } from "@/lib/labels";
import { Markdown } from "@/components/site/markdown";
import { CtaBanner } from "@/components/site/cta-banner";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);
  if (!post) return { title: "نوشته پیدا نشد" };
  return { title: post.title, description: post.excerpt };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);
  if (!post) notFound();

  const tone = getTone(post.coverTone);

  return (
    <>
      <article className="mx-auto max-w-3xl px-4 py-12">
        <Link
          href="/blog"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowRight className="h-4 w-4" aria-hidden />
          بازگشت به بلاگ
        </Link>

        <div className={`mb-8 flex h-44 items-center justify-center rounded-3xl bg-gradient-to-bl ${tone.cover}`}>
          <DbIcon k={post.coverIcon} className="h-14 w-14 text-white/90" />
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="rounded-full bg-secondary px-3 py-1 font-medium text-secondary-foreground">
            {post.authorName}
          </span>
          <span>{faDate(post.publishedAt)}</span>
        </div>

        <h1 className="mb-6 text-2xl font-bold leading-[1.5] text-foreground sm:text-3xl">{post.title}</h1>

        <Markdown content={post.content} />
      </article>

      <CtaBanner />
    </>
  );
}
