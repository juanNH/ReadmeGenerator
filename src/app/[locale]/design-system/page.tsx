import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  BadgeDemo,
  ButtonDemo,
  FeedbackDemo,
  FieldDemo,
  ModuleDemo,
} from "@/features/design-system/component-demos";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const sectionKeys = ["foundations", "buttons", "fields", "badges", "modules", "feedback"] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "DesignSystem" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

function ShowcaseSection({
  id,
  number,
  title,
  description,
  children,
}: {
  id: string;
  number: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-28 space-y-6">
      <div className="flex items-start gap-4">
        <span className="pt-1 font-mono text-xs text-muted-foreground" aria-hidden="true">
          {number}
        </span>
        <div className="min-w-0 space-y-2">
          <h2 id={`${id}-title`} className="text-2xl font-semibold tracking-tight">
            {title}
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

export default async function DesignSystemPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const [t, messages] = await Promise.all([
    getTranslations({ locale, namespace: "DesignSystem" }),
    getMessages({ locale }),
  ]);
  const swatches = [
    { key: "canvas", className: "bg-background", token: "background" },
    { key: "surface", className: "bg-surface", token: "surface" },
    { key: "raised", className: "bg-surface-raised", token: "surface-raised" },
    { key: "accent", className: "bg-accent", token: "accent" },
    { key: "text", className: "bg-foreground", token: "foreground" },
    { key: "muted", className: "bg-muted-foreground", token: "muted-foreground" },
  ] as const;

  return (
    <>
      <SiteHeader />
      <NextIntlClientProvider messages={{ DesignSystem: messages.DesignSystem }}>
        <main
          tabIndex={-1}
          id="main-content"
          className="mx-auto max-w-7xl px-5 pt-10 pb-16 sm:px-8 sm:pt-16 lg:px-12"
        >
          <div className="mb-12 border-b border-border pb-10 sm:mb-16 sm:pb-14">
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
              <p className="font-mono text-xs tracking-[0.14em] text-muted-foreground uppercase">
                {t("eyebrow")}
              </p>
              <Badge variant="outline">{t("version")}</Badge>
            </div>
            <h1 className="max-w-4xl text-4xl leading-[1.12] font-semibold tracking-[-0.045em] whitespace-pre-line sm:text-5xl lg:text-6xl">
              {t("title")}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground">
              {t("description")}
            </p>
            <p className="mt-6 max-w-2xl rounded-md border border-border bg-surface px-4 py-3 text-xs leading-5 text-muted-foreground">
              {t("demoNotice")}
            </p>
          </div>

          <div className="grid items-start gap-10 lg:grid-cols-[176px_minmax(0,1fr)] lg:gap-14">
            <nav aria-label={t("navLabel")} className="lg:sticky lg:top-28">
              <p className="mb-3 px-2 text-xs font-medium text-muted-foreground">{t("navLabel")}</p>
              <div className="flex flex-wrap gap-1 lg:flex-col">
                {sectionKeys.map((key, index) => (
                  <a
                    key={key}
                    href={`#${key}`}
                    className="flex min-h-11 items-center gap-3 rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none"
                  >
                    <span className="font-mono text-[11px]" aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {t(`${key}.title`)}
                  </a>
                ))}
              </div>
            </nav>

            <div className="min-w-0 space-y-16 sm:space-y-20">
              <ShowcaseSection
                id="foundations"
                number="01"
                title={t("foundations.title")}
                description={t("foundations.description")}
              >
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
                  {swatches.map(({ key, className, token }) => (
                    <div
                      key={key}
                      className="min-w-0 rounded-md border border-border bg-surface p-2"
                    >
                      <div
                        className={`mb-3 h-16 rounded-sm border border-foreground/10 ${className}`}
                        aria-hidden="true"
                      />
                      <p className="text-xs font-medium">{t(`foundations.${key}`)}</p>
                      <p className="mt-1 font-mono text-[10px] leading-4 break-all text-muted-foreground">
                        {token}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="grid gap-5 xl:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>{t("foundations.typeTitle")}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="max-w-sm text-3xl leading-tight font-semibold tracking-[-0.035em]">
                        {t("foundations.typeDisplay")}
                      </p>
                      <p className="text-sm leading-6 text-muted-foreground">
                        {t("foundations.typeBody")}
                      </p>
                      <Separator />
                      <p className="font-mono text-xs leading-5 text-muted-foreground">
                        {t("foundations.typeMono")}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>{t("foundations.spacingTitle")}</CardTitle>
                      <CardDescription>{t("foundations.spacingBody")}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap items-end gap-5" aria-hidden="true">
                        {[4, 8, 16, 24, 32].map((space) => (
                          <div key={space} className="flex flex-col items-center gap-3">
                            <div
                              className="w-7 rounded-sm bg-accent-soft"
                              style={{ height: space * 1.5 }}
                            />
                            <span className="font-mono text-[10px] text-muted-foreground">
                              {space}
                            </span>
                          </div>
                        ))}
                      </div>
                      <p className="mt-5 text-xs leading-5 text-muted-foreground">
                        {t("foundations.radiusLabel")}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </ShowcaseSection>
              <ShowcaseSection
                id="buttons"
                number="02"
                title={t("buttons.title")}
                description={t("buttons.description")}
              >
                <ButtonDemo />
              </ShowcaseSection>
              <ShowcaseSection
                id="fields"
                number="03"
                title={t("fields.title")}
                description={t("fields.description")}
              >
                <FieldDemo />
              </ShowcaseSection>
              <ShowcaseSection
                id="badges"
                number="04"
                title={t("badges.title")}
                description={t("badges.description")}
              >
                <BadgeDemo />
              </ShowcaseSection>
              <ShowcaseSection
                id="modules"
                number="05"
                title={t("modules.title")}
                description={t("modules.description")}
              >
                <ModuleDemo />
              </ShowcaseSection>
              <ShowcaseSection
                id="feedback"
                number="06"
                title={t("feedback.title")}
                description={t("feedback.description")}
              >
                <FeedbackDemo />
              </ShowcaseSection>
            </div>
          </div>

          <footer className="mt-16 flex flex-wrap items-center justify-between gap-5 border-t border-border pt-8 sm:mt-24">
            <p className="text-xs leading-5 text-muted-foreground">{t("footer")}</p>
            <Button asChild variant="ghost">
              <Link href="/">
                <ArrowLeft aria-hidden="true" />
                {t("backHome")}
                <ArrowUpRight aria-hidden="true" />
              </Link>
            </Button>
          </footer>
        </main>
      </NextIntlClientProvider>
    </>
  );
}
