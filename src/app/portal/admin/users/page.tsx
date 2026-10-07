import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getAdminUsers } from "@/lib/queries/admin";
import { faNum } from "@/lib/fa";
import { cohortLabel, faDate } from "@/lib/labels";
import { UserRoleSelect, ToggleUserActiveButton } from "@/components/portal/admin-forms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowRight, Search, Users } from "lucide-react";

export const metadata: Metadata = { title: "مدیریت کاربران" };

const roleBadge: Record<string, string> = {
  STUDENT: "bg-secondary text-secondary-foreground",
  TEACHER: "bg-sky-100 text-sky-800",
  ADMIN: "bg-violet-100 text-violet-800",
};
const roleLabel: Record<string, string> = { STUDENT: "دانش‌آموز", TEACHER: "معلم", ADMIN: "ادمین" };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requireRole(["ADMIN"]);
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, Number(sp.page) || 1);
  const perPage = 20;
  const { rows, total } = await getAdminUsers(q, page, perPage);
  const pageCount = Math.max(1, Math.ceil(total / perPage));

  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    params.set("page", String(p));
    return `/portal/admin/users?${params.toString()}`;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button asChild size="sm" variant="ghost" className="cursor-pointer gap-1 text-muted-foreground">
            <Link href="/portal/admin">
              <ArrowRight className="h-4 w-4" aria-hidden />
              نمای کلی
            </Link>
          </Button>
          <h1 className="flex items-center gap-2 text-lg font-bold">
            <Users className="h-5 w-5 text-primary" aria-hidden />
            مدیریت کاربران
          </h1>
        </div>
        <form className="flex max-w-sm flex-1 gap-2" action="/portal/admin/users">
          {q && <input type="hidden" name="page" value="1" />}
          <Input name="q" defaultValue={q} placeholder="آیدی، لقب یا شماره…" aria-label="جست‌وجوی کاربر" maxLength={40} />
          <Button type="submit" variant="secondary" className="cursor-pointer gap-1.5">
            <Search className="h-4 w-4" aria-hidden />
            جست‌وجو
          </Button>
        </form>
      </div>

      <p className="text-xs text-muted-foreground">
        {faNum(total)} کاربر — صفحهٔ {faNum(page)} از {faNum(pageCount)}
      </p>

      <Card className="border-border/70">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">کاربر</TableHead>
                <TableHead className="text-right">موبایل</TableHead>
                <TableHead className="text-right">کوهورت</TableHead>
                <TableHead className="text-center">پاسخ</TableHead>
                <TableHead className="text-right">عضویت</TableHead>
                <TableHead className="text-center">نقش</TableHead>
                <TableHead className="text-center">وضعیت</TableHead>
                <TableHead className="text-left">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                    کاربری پیدا نشد.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((u) => (
                  <TableRow key={u.id} className={u.isActive ? "" : "opacity-60"}>
                    <TableCell>
                      <div className="text-sm font-medium">{u.nickname}</div>
                      {u.username && (
                        <code dir="ltr" className="text-[10px] text-muted-foreground">
                          @{u.username}
                        </code>
                      )}
                    </TableCell>
                    <TableCell>
                      <code dir="ltr" className="text-[11px]">
                        {u.phone ?? "—"}
                      </code>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{cohortLabel(u.grade, u.major)}</TableCell>
                    <TableCell className="text-center text-sm">{faNum(u.attempts)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{faDate(u.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col items-center gap-1">
                        <Badge className={`text-[10px] hover:bg-inherit ${roleBadge[u.role] ?? ""}`}>
                          {roleLabel[u.role] ?? u.role}
                        </Badge>
                        <UserRoleSelect userId={u.id} role={u.role} />
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {u.isActive ? (
                        <Badge variant="outline" className="text-[10px] text-emerald-700">
                          فعال
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-rose-700">
                          غیرفعال
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-left">
                      <ToggleUserActiveButton userId={u.id} isActive={u.isActive} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* صفحه‌بندی */}
      <div className="flex items-center justify-between">
        {page > 1 ? (
          <Button asChild variant="outline" size="sm" className="cursor-pointer">
            <Link href={pageHref(page - 1)}>صفحهٔ قبل</Link>
          </Button>
        ) : (
          <span />
        )}
        {page < pageCount && (
          <Button asChild variant="outline" size="sm" className="cursor-pointer">
            <Link href={pageHref(page + 1)}>صفحهٔ بعد</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
