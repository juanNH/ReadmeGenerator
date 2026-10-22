import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { AboutPage } from "@/features/about/about-page";
import { routing } from "@/i18n/routing";

type AboutRouteProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: AboutRouteProps): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "About" });

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default function Page() {
  return <AboutPage />;
}
