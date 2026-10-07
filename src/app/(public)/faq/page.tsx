import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircleQuestion } from "lucide-react";
import { getFaqs, getPortalUrl } from "@/lib/queries/site";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "سوالات متداول",
  description: "پاسخ پرسش‌های رایج درباره ثبت‌نام، آزمون تطبیقی، لیدربرد و حریم خصوصی در آزمونک.",
};

export default async function FaqPage() {
  const [faqs, portalUrl] = await Promise.all([getFaqs(), getPortalUrl()]);

  return (
    <>
      <section className="border-b border-border/60 bg-secondary/40">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h1 className="mb-3 text-3xl font-bold text-foreground">سوالات متداول</h1>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
            هرچه درباره آزمونک می‌خواهی بدانی — از ثبت‌نام تا قواعد لیدربرد.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-14">
        {faqs.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-muted/40 p-10 text-center text-muted-foreground">
            فعلاً پرسشی ثبت نشده است.
          </p>
        ) : (
          <Accordion type="single" collapsible className="rounded-2xl border border-border bg-card px-6">
            {faqs.map((f) => (
              <AccordionItem key={f.id} value={f.id}>
                <AccordionTrigger className="text-right text-base font-medium">{f.question}</AccordionTrigger>
                <AccordionContent className="text-sm leading-7 text-muted-foreground">{f.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}

        <div className="mt-10 rounded-2xl bg-secondary/60 p-6 text-center">
          <MessageCircleQuestion className="mx-auto mb-3 h-8 w-8 text-primary" aria-hidden />
          <p className="mb-4 text-sm leading-7 text-muted-foreground">
            پاسخ پرسشت را پیدا نکردی؟ همین‌جا بنویسش — سریع جواب می‌دهیم.
          </p>
          <Button asChild variant="outline">
            <Link href="/contact">رفتن به صفحه تماس</Link>
          </Button>
          <Button asChild className="mr-0 mt-3 sm:mr-3 sm:mt-0">
            <Link href={portalUrl}>ورود به پورتال</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
