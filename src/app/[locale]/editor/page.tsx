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
      <SiteHeader />
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto max-w-[1600px] px-5 pt-6 pb-16 sm:px-8 lg:px-10"
      >
        <div className="mb-6 max-w-4xl space-y-2">
          <p className="font-mono text-xs tracking-[0.14em] text-muted-foreground uppercase">
            {t("pageEyebrow")}
          </p>
          <h1 className="text-2xl leading-tight font-semibold tracking-tight sm:text-3xl">
            {t("pageTitle")}
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">{t("pageDescription")}</p>
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
