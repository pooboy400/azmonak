"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { getSetting } from "@/lib/queries/site";

const contactSchema = z.object({
  name: z.string().trim().min(2, "نام حداقل ۲ نویسه است").max(60, "نام حداکثر ۶۰ نویسه است"),
  contact: z.string().trim().min(5, "ایمیل یا شماره تماس را کامل بنویس").max(120),
  body: z.string().trim().min(10, "پیام حداقل ۱۰ نویسه است").max(2000, "پیام حداکثر ۲۰۰۰ نویسه است"),
});

export interface ContactFormState {
  status: "idle" | "success" | "error";
  message: string;
  /** مقادیر ارسالی کاربر — برای حفظ متن در صورت خطا (نباید با خطا از دست برود) */
  values: { name: string; contact: string; body: string };
}

const emptyValues: ContactFormState["values"] = { name: "", contact: "", body: "" };

export async function submitContactMessage(
  _prev: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  const raw = {
    name: formData.get("name"),
    contact: formData.get("contact"),
    body: formData.get("body"),
  };
  // ورودی غیر متنی (مثلاً File جعلی) → پیام فارسی به‌جای خطای انگلیسی zod
  if (Object.values(raw).some((v) => typeof v !== "string")) {
    return { status: "error", message: "ورودی نامعتبر است", values: emptyValues };
  }
  const values = raw as Record<keyof ContactFormState["values"], string>;

  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "ورودی نامعتبر است", values };
  }
  try {
    await db.contactMessage.create({
      data: {
        name: parsed.data.name,
        contact: parsed.data.contact,
        body: parsed.data.body,
      },
    });
    const siteName = (await getSetting("site.name")) || "آزمونک";
    return {
      status: "success",
      message: `پیامت رسید! تیم ${siteName} در نخستین فرصت پاسخ می‌دهد.`,
      values: emptyValues,
    };
  } catch (err) {
    console.error("[contact] ثبت پیام ناموفق:", err); // لاگ سروری بدون PII برای ردیابی
    return { status: "error", message: "ثبت پیام با خطا مواجه شد؛ کمی بعد دوباره تلاش کن.", values };
  }
}
