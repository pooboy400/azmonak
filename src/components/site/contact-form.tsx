"use client";

import { useActionState } from "react";
import { SendHorizonal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitContactMessage, type ContactFormState } from "@/lib/actions/contact";

const initialState: ContactFormState = { status: "idle", message: "" };

export function ContactForm() {
  const [state, formAction, pending] = useActionState(submitContactMessage, initialState);

  return (
    <form action={formAction} className="space-y-4 rounded-2xl border border-border bg-card p-6 sm:p-8">
      <div>
        <Label htmlFor="contact-name">نام یا لقب</Label>
        <Input id="contact-name" name="name" placeholder="مثلاً سارا" className="mt-1.5" required maxLength={60} />
      </div>
      <div>
        <Label htmlFor="contact-channel">ایمیل یا شماره موبایل</Label>
        <Input
          id="contact-channel"
          name="contact"
          placeholder="مثلاً ۰۹۱۲۰۰۰۰۰۰۰"
          className="mt-1.5"
          required
          maxLength={120}
        />
      </div>
      <div>
        <Label htmlFor="contact-body">پیام</Label>
        <Textarea
          id="contact-body"
          name="body"
          rows={5}
          placeholder="پیامت را همین‌جا بنویس…"
          className="mt-1.5 resize-none"
          required
          maxLength={2000}
        />
      </div>

      {state.status === "success" && (
        <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {state.message}
        </p>
      )}
      {state.status === "error" && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          {state.message}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? (
          "در حال ارسال…"
        ) : (
          <>
            ارسال پیام
            <SendHorizonal className="h-4 w-4" aria-hidden />
          </>
        )}
      </Button>
    </form>
  );
}
