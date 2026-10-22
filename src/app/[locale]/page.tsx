import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { HomePage } from "@/features/home/home-page";
import { routing } from "@/i18n/routing";
import { getPublicPageAlternates } from "@/server/public-site-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const alternates = getPublicPageAlternates(locale, "home");

  return {
    ...(alternates ? { alternates } : {}),
  };
}

export default function Page() {
  return <HomePage />;
}
