import { CodeXml } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

const repositoryUrl = "https://github.com/juanNH/ReadmeGenerator";
const defaultBranchUrl = `${repositoryUrl}/blob/main`;
const contributingGuideUrl = `${repositoryUrl}/blob/dev/CONTRIBUTING.md`;

const footerLinkClassName =
  "inline-flex min-h-9 items-center rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

export async function SiteFooter() {
  const t = await getTranslations("Footer");
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-5 pt-10 pb-6 sm:px-8 sm:pt-12 lg:px-10">
        <div className="grid gap-9 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:gap-16">
          <div className="max-w-sm">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center gap-3 rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <span className="flex size-9 items-center justify-center rounded-lg bg-foreground text-background">
                <CodeXml className="size-5" strokeWidth={1.6} aria-hidden="true" />
              </span>
              <span className="text-sm font-semibold tracking-tight">{t("brand")}</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-6 text-muted-foreground">
              {t("description")}
            </p>
          </div>

          <nav aria-label={t("exploreNavigation")}>
            <h2 className="font-mono text-xs tracking-[0.12em] text-muted-foreground uppercase">
              {t("explore")}
            </h2>
            <ul className="mt-3 space-y-1">
              <li>
                <Link href="/editor" className={footerLinkClassName}>
                  {t("editor")}
                </Link>
              </li>
              <li>
                <Link href="/about" className={footerLinkClassName}>
                  {t("about")}
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label={t("projectNavigation")}>
            <h2 className="font-mono text-xs tracking-[0.12em] text-muted-foreground uppercase">
              {t("project")}
            </h2>
            <ul className="mt-3 space-y-1">
              <li>
                <a href={repositoryUrl} className={footerLinkClassName}>
                  {t("repository")}
                </a>
              </li>
              <li>
                <a href={`${repositoryUrl}/issues`} className={footerLinkClassName}>
                  {t("issues")}
                </a>
              </li>
              <li>
                <a href={contributingGuideUrl} className={footerLinkClassName}>
                  {t("contributing")}
                </a>
              </li>
              <li>
                <a href={`${defaultBranchUrl}/LICENSE`} className={footerLinkClassName}>
                  {t("license")}
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-9 flex flex-col gap-2 border-t border-border pt-5 text-xs leading-5 text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>{t("copyright", { year })}</p>
          <p>
            {t("openSource")}{" "}
            <a
              href={`${defaultBranchUrl}/LICENSE`}
              className="font-medium text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground"
            >
              {t("license")}
            </a>
            <span aria-hidden="true"> · </span>
            {t("independent")}
          </p>
        </div>
      </div>
    </footer>
  );
}
