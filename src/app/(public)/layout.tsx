import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { getPortalUrl, getSetting } from "@/lib/queries/site";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [portalUrl, portalCta, siteName] = await Promise.all([
    getPortalUrl(),
    getSetting("portal.ctaLabel", "ورود به پورتال"),
    getSetting("site.name", "آزمونک"),
  ]);

  return (
    <>
      <SiteHeader portalUrl={portalUrl} portalCta={portalCta} siteName={siteName} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}
