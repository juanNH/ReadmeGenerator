import "server-only";

import type { Metadata } from "next";
import type { MetadataRoute } from "next";
import { routing, type AppLocale } from "@/i18n/routing";
import { getPublicSiteOrigin, isPublicIndexingEnabled } from "@/server/public-site-origin";

const publicPagePaths = { home: "", about: "/about", privacy: "/privacy" } as const;

export type PublicSitePage = keyof typeof publicPagePaths;

export const publicSitePages = [
  { key: "home", changeFrequency: "monthly", priority: 1 },
  { key: "about", changeFrequency: "yearly", priority: 0.7 },
  { key: "privacy", changeFrequency: "yearly", priority: 0.5 },
] as const satisfies readonly {
  key: PublicSitePage;
  changeFrequency: "monthly" | "yearly";
  priority: number;
}[];

function publicPagePath(page: PublicSitePage): string {
  return publicPagePaths[page];
}

export function publicPageUrl(origin: string, locale: AppLocale, page: PublicSitePage): string {
  return `${origin}/${locale}${publicPagePath(page)}`;
}

export function localizedPublicPageAlternates(
  origin: string,
  locale: AppLocale,
  page: PublicSitePage,
): NonNullable<Metadata["alternates"]> {
  return {
    canonical: publicPageUrl(origin, locale, page),
    languages: Object.fromEntries(
      routing.locales.map((alternateLocale) => [
        alternateLocale,
        publicPageUrl(origin, alternateLocale, page),
      ]),
    ),
  };
}

export function getPublicPageAlternates(
  locale: AppLocale,
  page: PublicSitePage,
): Metadata["alternates"] | undefined {
  const origin = getPublicSiteOrigin();
  if (!origin || !isPublicIndexingEnabled()) return undefined;
  return localizedPublicPageAlternates(origin, locale, page);
}

export function getPublicSiteSitemap(): MetadataRoute.Sitemap {
  const origin = getPublicSiteOrigin();
  if (!origin || !isPublicIndexingEnabled()) return [];

  return publicSitePages.flatMap(({ key, changeFrequency, priority }) =>
    routing.locales.map((locale) => ({
      url: publicPageUrl(origin, locale, key),
      alternates: {
        languages: Object.fromEntries(
          routing.locales.map((alternateLocale) => [
            alternateLocale,
            publicPageUrl(origin, alternateLocale, key),
          ]),
        ),
      },
      changeFrequency,
      priority,
    })),
  );
}
