import type { Metadata } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { EditorWorkspace } from "@/features/editor/editor-workspace";
import { routing } from "@/i18n/routing";

type EditorPageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: EditorPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Editor" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function EditorPage({ params }: EditorPageProps) {
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
        className="mx-auto max-w-7xl px-5 pt-10 pb-20 sm:px-8 sm:pt-14 lg:px-10"
      >
        <div className="mb-10 max-w-3xl space-y-4">
          <p className="font-mono text-xs tracking-[0.14em] text-muted-foreground uppercase">
            {t("pageEyebrow")}
          </p>
          <h1 className="text-3xl leading-[1.12] font-semibold tracking-[-0.045em] sm:text-4xl lg:text-5xl">
            {t("pageTitle")}
          </h1>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground">
            {t("pageDescription")}
          </p>
        </div>
        <NextIntlClientProvider messages={{ Editor: messages.Editor, Modules: messages.Modules }}>
          <EditorWorkspace initialContentLocale={locale} />
        </NextIntlClientProvider>
      </main>
    </>
  );
}
