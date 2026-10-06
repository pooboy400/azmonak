import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  experimental: {
    serverActions: {
      // این محیط از طریق گیت‌وی پیش‌نمایش IM سرو می‌شود: زنجیره پروکسی هدر
      // Host/X-Forwarded-Host را به یک دامنه داخلی بازنویسی می‌کند، در حالی که
      // Origin مرورگر روی دامنه پیش‌نمایش (*.space-z.ai) می‌ماند. بدون این
      // فهرست، Next هر Server Action را با خطای «Invalid Server Actions
      // request.» رد می‌کند.
      // امنیت: کوکی نشست SameSite=Lax است، پس درخواست‌های cross-origin
      // هیچ‌گاه کوکی نشست را حمل نمی‌کنند؛ اکشن‌های OTP هم rate-limit دارند.
      allowedOrigins: [
        "preview-chat-92f340ae-b8b5-4e53-adbb-3fbcdbca8165.space-z.ai",
        "*.space-z.ai",
      ],
    },
  },
};

export default nextConfig;
