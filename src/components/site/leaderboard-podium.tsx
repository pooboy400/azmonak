import { Crown, Medal } from "lucide-react";
import { UserAvatar } from "@/components/site/user-avatar";
import { cohortLabel } from "@/lib/labels";
import type { TopLearner } from "@/lib/queries/site";

const RANK_STYLE: Record<number, { badge: string; ring: string; label: string }> = {
  1: { badge: "bg-amber-100 text-amber-600", ring: "ring-2 ring-amber-300", label: "رتبه اول" },
  2: { badge: "bg-slate-100 text-slate-500", ring: "ring-2 ring-slate-200", label: "رتبه دوم" },
  3: { badge: "bg-orange-50 text-orange-500", ring: "ring-2 ring-orange-200", label: "رتبه سوم" },
};

const faNum = (n: number, digits = 1) => n.toLocaleString("fa-IR", { maximumFractionDigits: digits });

export function LeaderboardPodium({ items }: { items: TopLearner[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-10 text-center">
        <p className="text-sm font-medium text-muted-foreground">
          این هفته هنوز رتبه‌ای ثبت نشده — با دو جلسه کاملِ تمرین، نام تو اینجا می‌درخشد.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {items.map((item) => {
        const style = RANK_STYLE[item.rank] ?? RANK_STYLE[3];
        const RankIcon = item.rank === 1 ? Crown : Medal;
        return (
          <article
            key={item.userId}
            className={`relative rounded-2xl border border-border bg-card p-6 text-center transition-shadow hover:shadow-lg hover:shadow-primary/5 ${
              item.rank === 1 ? "sm:-translate-y-2 sm:shadow-xl sm:shadow-primary/10" : ""
            }`}
          >
            <span
              className={`absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full ${style.badge}`}
              title={style.label}
            >
              <RankIcon className="h-4 w-4" aria-hidden />
            </span>
            <div className={`mx-auto mb-4 w-fit rounded-full ${style.ring}`}>
              <UserAvatar src={item.avatarUrl} nickname={item.nickname} size={64} />
            </div>
            <h3 className="mb-1 truncate text-base font-bold text-card-foreground" title={item.nickname}>{item.nickname}</h3>
            <p className="mb-3 text-xs text-muted-foreground">{cohortLabel(item.grade, item.major)}</p>
            <div className="flex items-center justify-center gap-4 border-t border-border pt-3 text-sm">
              <div>
                <span className="block text-lg font-bold text-primary">{faNum(item.avgScore)}</span>
                <span className="text-xs text-muted-foreground">میانگین نمره</span>
              </div>
              <div className="h-8 w-px bg-border" aria-hidden />
              <div>
                <span className="block text-lg font-bold text-card-foreground">{faNum(item.sessionCount, 0)}</span>
                <span className="text-xs text-muted-foreground">جلسه این هفته</span>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
