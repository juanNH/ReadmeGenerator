import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { getPublicPageAlternates } from "@/server/public-site-metadata";

type PrivacyPageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PrivacyPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Privacy" });
  const alternates = getPublicPageAlternates(locale, "privacy");
  return {
    title: t("metadata.title"),
    description: t("metadata.description"),
    ...(alternates ? { alternates } : {}),
  };
}

export default async function PrivacyPage({ params }: PrivacyPageProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Privacy" });

  return (
    <>
      <SiteHeader />
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto max-w-7xl px-5 pt-12 pb-16 sm:px-8 sm:pt-16 lg:px-10"
      >
        <article className="mx-auto max-w-3xl space-y-10">
          <header className="space-y-4">
            <p className="font-mono text-xs tracking-[0.14em] text-muted-foreground uppercase">
              {t("eyebrow")}
            </p>
            <h1 className="text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
              {t("title")}
            </h1>
            <p className="text-base leading-7 text-muted-foreground">{t("intro")}</p>
          </header>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold tracking-tight">{t("device.title")}</h2>
            <p className="leading-7 text-muted-foreground">{t("device.body")}</p>
            <p className="leading-7 text-muted-foreground">{t("device.theme")}</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold tracking-tight">{t("requests.title")}</h2>
            <p className="leading-7 text-muted-foreground">{t("requests.body")}</p>
            <p className="leading-7 text-muted-foreground">{t("requests.about")}</p>
            <p className="leading-7 text-muted-foreground">{t("requests.cards")}</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold tracking-tight">{t("images.title")}</h2>
            <p className="leading-7 text-muted-foreground">{t("images.body")}</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold tracking-tight">{t("hosting.title")}</h2>
            <p className="leading-7 text-muted-foreground">{t("hosting.body")}</p>
            <p className="leading-7 text-muted-foreground">{t("hosting.githubNotice")}</p>
          </section>

          <section className="space-y-3 border-t border-border pt-8">
            <h2 className="text-xl font-semibold tracking-tight">{t("links.title")}</h2>
            <ul className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
              <li>
                <a
                  className="underline underline-offset-4"
                  href="https://github.com/juanNH/ReadmeGenerator"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("links.repository")}
                </a>
              </li>
              <li>
                <a
                  className="underline underline-offset-4"
                  href="https://github.com/juanNH/ReadmeGenerator/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("links.issues")}
                </a>
              </li>
              <li>
                <a
                  className="underline underline-offset-4"
                  href="https://github.com/juanNH/ReadmeGenerator/blob/dev/CONTRIBUTING.md"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("links.contributing")}
                </a>
              </li>
              <li>
                <a
                  className="underline underline-offset-4"
                  href="https://github.com/juanNH/ReadmeGenerator/blob/main/LICENSE"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("links.license")}
                </a>
              </li>
              <li>
                <a
                  className="underline underline-offset-4"
                  href="https://github.com/juanNH/ReadmeGenerator/blob/main/THIRD_PARTY_NOTICES.md"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("links.notices")}
                </a>
              </li>
              <li>
                <Link className="underline underline-offset-4" href="/">
                  {t("links.home")}
                </Link>
              </li>
            </ul>
          </section>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
