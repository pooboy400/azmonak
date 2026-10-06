import type { Metadata } from "next";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { getContact, getSocials } from "@/lib/queries/site";
import { DbIcon } from "@/lib/icon-map";
import { ContactForm } from "@/components/site/contact-form";

export const metadata: Metadata = {
  title: "تماس با ما",
  description: "راه‌های ارتباط با تیم آزمونک — تلفن، ایمیل، آدرس و فرم پیام مستقیم.",
};

export default async function ContactPage() {
  const [contact, socials] = await Promise.all([getContact(), getSocials()]);

  const infoItems = [
    { icon: Phone, label: "تلفن", value: contact.phone, ltr: true },
    { icon: Mail, label: "ایمیل", value: contact.email, ltr: true },
    { icon: MapPin, label: "نشانی", value: contact.address, ltr: false },
    { icon: Clock, label: "ساعات پاسخگویی", value: contact.hours, ltr: false },
  ];

  return (
    <>
      <section className="border-b border-border/60 bg-secondary/40">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h1 className="mb-3 text-3xl font-bold text-foreground">تماس با ما</h1>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
            سؤال، پیشنهاد یا گزارش اشکال؟ از هر مسیری که راحتی به ما برس.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-14 lg:grid-cols-5">
        {/* اطلاعات تماس — از دیتابیس */}
        <div className="space-y-4 lg:col-span-2">
          {infoItems.map((item) => (
            <div key={item.label} className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                <item.icon className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <h2 className="mb-1 text-sm font-bold text-card-foreground">{item.label}</h2>
                <p className="text-sm leading-7 text-muted-foreground" dir={item.ltr ? "ltr" : undefined}>
                  {item.value || "—"}
                </p>
              </div>
            </div>
          ))}

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 text-sm font-bold text-card-foreground">شبکه‌های اجتماعی</h2>
            <div className="flex flex-wrap gap-2">
              {socials.map((s) => {
                return (
                  <a
                    key={s.url}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <DbIcon k={s.icon} className="h-4 w-4" />
                    {s.label}
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        {/* فرم پیام — ذخیره در جدول contact_messages */}
        <div className="lg:col-span-3">
          <ContactForm />
        </div>
      </section>
    </>
  );
}
