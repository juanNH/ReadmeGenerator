import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function NotFound() {
  const t = await getTranslations("NotFound");
  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-7xl px-6 py-24">
        <p className="font-mono text-sm text-accent">404</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-4 max-w-lg leading-7 text-muted-foreground">{t("description")}</p>
        <Button className="mt-8" asChild>
          <Link href="/">
            <ArrowLeft aria-hidden="true" />
            {t("action")}
          </Link>
        </Button>
      </main>
    </>
  );
}
