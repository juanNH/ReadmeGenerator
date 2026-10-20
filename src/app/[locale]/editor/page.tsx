import type { Metadata } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { SiteHeader } from "@/components/site-header";
import { EditorWorkspace } from "@/features/editor/editor-workspace";
import { routing } from "@/i18n/routing";
import { getPublicActivityBaseUrl } from "@/server/github/activity-service";

type EditorPageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: EditorPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Editor" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function EditorPage({ params }: EditorPageProps) {
  // Public card hosting is deployment configuration and may change after the build.
  await connection();
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const [t, messages] = await Promise.all([
    getTranslations({ locale, namespace: "Editor" }),
    getMessages({ locale }),
  ]);

  return (
    <>
      <SiteHeader variant="editor" />
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto max-w-[1600px] px-4 pt-4 pb-12 sm:px-8 sm:pt-6 lg:px-10"
      >
        <div className="mb-2 max-w-4xl space-y-1 sm:mb-6 sm:space-y-2">
          <p className="hidden font-mono text-xs tracking-[0.14em] text-muted-foreground uppercase sm:block">
            {t("pageEyebrow")}
          </p>
          <h1 className="text-2xl leading-tight font-semibold tracking-tight sm:text-3xl">
            {t("pageTitle")}
          </h1>
          <p className="text-sm leading-5 text-muted-foreground sm:hidden">
            {t("pageCompactDescription")}
          </p>
          <p className="hidden text-sm leading-6 text-muted-foreground sm:block">
            {t("pageDescription")}
          </p>
        </div>
        <NextIntlClientProvider
          messages={{
            Editor: messages.Editor,
            Modules: messages.Modules,
            EditorModules: messages.EditorModules,
            EditorNavigation: messages.EditorNavigation,
            ContactProviders: messages.ContactProviders,
          }}
        >
          <EditorWorkspace
            initialContentLocale={locale}
            activityCardBaseUrl={getPublicActivityBaseUrl()}
          />
        </NextIntlClientProvider>
      </main>
    </>
  );
}
