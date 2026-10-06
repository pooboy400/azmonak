// نقشه کلید آیکون/رنگ (از دیتابیس) به کامپوننت — آیکون‌ها lucide، رنگ‌ها توکن پالت.
// مقادیر iconKey و colorKey در جدول‌های subjects / blog_posts / site_settings ذخیره می‌شوند؛
// این فایل فقط «ترجمه» کلید به کلاس/آیکون است و هیچ داده‌ای در خود ندارد.

import {
  Atom,
  BookOpen,
  CalendarHeart,
  Calculator,
  Clock,
  Crosshair,
  Crown,
  Dna,
  FlaskConical,
  Globe,
  HeartHandshake,
  Instagram,
  Languages,
  LineChart,
  Linkedin,
  Lock,
  LogIn,
  Mail,
  MapPin,
  Medal,
  MoonStar,
  Newspaper,
  Phone,
  Send,
  Shapes,
  ShieldCheck,
  Sigma,
  Sparkles,
  Target,
  Trophy,
  Users,
  Youtube,
  type LucideIcon,
} from "lucide-react";

const icons: Record<string, LucideIcon> = {
  atom: Atom,
  "book-open": BookOpen,
  "calendar-heart": CalendarHeart,
  calculator: Calculator,
  clock: Clock,
  crosshair: Crosshair,
  crown: Crown,
  dna: Dna,
  "flask-conical": FlaskConical,
  globe: Globe,
  "heart-handshake": HeartHandshake,
  instagram: Instagram,
  languages: Languages,
  "line-chart": LineChart,
  linkedin: Linkedin,
  lock: Lock,
  "log-in": LogIn,
  mail: Mail,
  "map-pin": MapPin,
  medal: Medal,
  "moon-star": MoonStar,
  newspaper: Newspaper,
  phone: Phone,
  send: Send,
  shapes: Shapes,
  "shield-check": ShieldCheck,
  sigma: Sigma,
  sparkles: Sparkles,
  target: Target,
  trophy: Trophy,
  users: Users,
  youtube: Youtube,
};

export function getIcon(key: string | null | undefined): LucideIcon {
  if (!key) return Sparkles;
  return icons[key] ?? Sparkles;
}

/** آیکون بر اساس کلید ذخیره‌شده در دیتابیس — الگوی نقشه آیکون: مرجع کامپوننت از جدول ثابت است،
 *  نه کامپوننت جدید؛ قاعده static-components این الگوی رایج را مثبت کاذب می‌گیرد. */
export function DbIcon({ k, className }: { k: string | null | undefined; className?: string }) {
  const Icon = getIcon(k);
  // eslint-disable-next-line react-hooks/static-components
  return <Icon className={className} aria-hidden />;
}

export interface ToneStyle {
  chip: string; // بج کوچک
  iconBox: string; // زمینه آیکون در کارت
  iconText: string;
  cover: string; // گرادیان کاور بلاگ
}

const toneStyles: Record<string, ToneStyle> = {
  violet: {
    chip: "bg-violet-50 text-violet-700 border-violet-200",
    iconBox: "bg-violet-100",
    iconText: "text-violet-600",
    cover: "from-violet-500 to-violet-700",
  },
  orange: {
    chip: "bg-amber-50 text-amber-700 border-amber-200",
    iconBox: "bg-amber-100",
    iconText: "text-amber-600",
    cover: "from-amber-400 to-orange-500",
  },
  cyan: {
    chip: "bg-cyan-50 text-cyan-700 border-cyan-200",
    iconBox: "bg-cyan-100",
    iconText: "text-cyan-600",
    cover: "from-cyan-400 to-cyan-600",
  },
  teal: {
    chip: "bg-teal-50 text-teal-700 border-teal-200",
    iconBox: "bg-teal-100",
    iconText: "text-teal-600",
    cover: "from-teal-400 to-teal-600",
  },
  emerald: {
    chip: "bg-emerald-50 text-emerald-700 border-emerald-200",
    iconBox: "bg-emerald-100",
    iconText: "text-emerald-600",
    cover: "from-emerald-400 to-emerald-600",
  },
  rose: {
    chip: "bg-rose-50 text-rose-700 border-rose-200",
    iconBox: "bg-rose-100",
    iconText: "text-rose-600",
    cover: "from-rose-400 to-rose-600",
  },
  sky: {
    chip: "bg-sky-50 text-sky-700 border-sky-200",
    iconBox: "bg-sky-100",
    iconText: "text-sky-600",
    cover: "from-sky-400 to-sky-600",
  },
  fuchsia: {
    chip: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
    iconBox: "bg-fuchsia-100",
    iconText: "text-fuchsia-600",
    cover: "from-fuchsia-400 to-fuchsia-600",
  },
  amber: {
    chip: "bg-amber-50 text-amber-700 border-amber-200",
    iconBox: "bg-amber-100",
    iconText: "text-amber-600",
    cover: "from-amber-400 to-amber-600",
  },
};

export function getTone(key: string | null | undefined): ToneStyle {
  if (!key) return toneStyles.violet;
  return toneStyles[key] ?? toneStyles.violet;
}
