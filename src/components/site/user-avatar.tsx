import Image from "next/image";

// آواتار کاربر — مسیر عکس از دیتابیس (users.avatarUrl)؛
// خالی بودن یا خطای بارگذاری → placeholder با نخستین حرف لقب
export function UserAvatar({
  src,
  nickname,
  size = 44,
  className = "",
}: {
  src: string | null;
  nickname: string;
  size?: number;
  className?: string;
}) {
  if (src) {
    return (
      <Image
        src={src}
        alt={`آواتار ${nickname}`}
        width={size}
        height={size}
        className={`rounded-full object-cover ring-2 ring-white shadow-sm ${className}`}
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size }}
      className={`flex items-center justify-center rounded-full bg-primary text-primary-foreground font-bold shadow-sm ring-2 ring-white ${className}`}
      aria-label={`آواتار ${nickname}`}
    >
      <span style={{ fontSize: size * 0.4 }}>{nickname.slice(0, 1)}</span>
    </div>
  );
}
