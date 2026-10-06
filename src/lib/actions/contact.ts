"use server";

import { z } from "zod";
import { db } from "@/lib/db";

const contactSchema = z.object({
  name: z.string().trim().min(2, "نام حداقل ۲ نویسه است").max(60, "نام حداکثر ۶۰ نویسه است"),
  contact: z.string().trim().min(5, "ایمیل یا شماره تماس را کامل بنویس").max(120),
  body: z.string().trim().min(10, "پیام حداقل ۱۰ نویسه است").max(2000, "پیام حداکثر ۲۰۰۰ نویسه است"),
});

export interface ContactFormState {
  status: "idle" | "success" | "error";
  message: string;
}

export async function submitContactMessage(
  _prev: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    contact: formData.get("contact"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "ورودی نامعتبر است" };
  }
  try {
    await db.contactMessage.create({
      data: {
        name: parsed.data.name,
        contact: parsed.data.contact,
        body: parsed.data.body,
      },
    });
    return { status: "success", message: "پیامت رسید! تیم آزمونک در نخستین فرصت پاسخ می‌دهد." };
  } catch {
    return { status: "error", message: "ثبت پیام با خطا مواجه شد؛ کمی بعد دوباره تلاش کن." };
  }
}
