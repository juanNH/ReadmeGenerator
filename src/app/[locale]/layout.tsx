import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { buildSocialMetadata } from "@/features/social-sharing/social-metadata";
import { routing } from "@/i18n/routing";
import { geistMono, geistSans } from "@/lib/fonts";
import { getPublicSiteOrigin, isPublicIndexingEnabled } from "@/server/public-site-origin";
import "../globals.css";

type LocaleLayoutProps = { children: ReactNode; params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LocaleLayoutProps): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const [metadata, social] = await Promise.all([
    getTranslations({ locale, namespace: "Metadata" }),
    getTranslations({ locale, namespace: "SocialSharing" }),
  ]);
  const origin = getPublicSiteOrigin();
  const indexable = isPublicIndexingEnabled() && origin !== undefined;
  return {
    title: { default: metadata("title"), template: "%s · GitHub Profile Generator" },
    description: metadata("description"),
    applicationName: "GitHub Profile Generator",
    ...(origin ? { metadataBase: new URL(origin) } : {}),
    robots: { index: indexable, follow: indexable },
    ...buildSocialMetadata({
      origin,
      locale,
      title: metadata("socialTitle"),
      description: metadata("description"),
      imageAlt: social("alt"),
    }),
  };
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const [messages, t] = await Promise.all([
    getMessages({ locale }),
    getTranslations({ locale, namespace: "Navigation" }),
  ]);

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <ThemeProvider>
          <NextIntlClientProvider
            locale={locale}
            messages={{ Controls: messages.Controls, Navigation: messages.Navigation }}
            timeZone="UTC"
          >
            <a
              href="#main-content"
              className="sr-only fixed top-3 left-3 z-50 rounded-md bg-accent px-5 py-3 font-medium text-accent-foreground focus:not-sr-only"
            >
              {t("skip")}
            </a>
            {children}
          </NextIntlClientProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
