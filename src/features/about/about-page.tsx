import {
  ArrowDownRight,
  ArrowRight,
  CodeXml,
  Compass,
  GitFork,
  MessagesSquare,
  Share2,
  Star,
} from "lucide-react";
import { Suspense } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import {
  getPublicRepositoryStats,
  type PublicRepositoryStats,
} from "@/server/github/repository-stats";

const repositoryUrl = "https://github.com/juanNH/ReadmeGenerator";
const contributingGuideUrl = `${repositoryUrl}/blob/dev/CONTRIBUTING.md`;

const paths = [
  { key: "feedback", number: "01", icon: MessagesSquare, href: "issues" },
  { key: "build", number: "02", icon: CodeXml, href: "contributing" },
  { key: "share", number: "03", icon: Share2, href: "repository" },
] as const;

export async function AboutPage() {
  const repositoryStatsPromise = getPublicRepositoryStats();
  const t = await getTranslations("About");

  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <section className="mx-auto max-w-7xl px-5 pt-14 pb-16 sm:px-8 sm:pt-20 sm:pb-20 lg:px-10 lg:pt-24">
          <p className="font-mono text-xs tracking-[0.14em] text-accent uppercase">
            {t("eyebrow")}
          </p>
          <div className="mt-5 grid gap-8 lg:grid-cols-[1fr_0.65fr] lg:items-end lg:gap-16">
            <h1 className="max-w-3xl text-4xl leading-[1.08] font-semibold tracking-[-0.045em] sm:text-5xl lg:text-6xl">
              {t("title")}
            </h1>
            <p className="max-w-xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              {t("lede")}
            </p>
          </div>
        </section>

        <section aria-labelledby="origin-title" className="border-y border-border bg-surface">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 sm:py-18 lg:grid-cols-[0.75fr_1fr] lg:gap-20 lg:px-10">
            <div>
              <div className="flex size-11 items-center justify-center rounded-xl border border-accent/20 bg-accent-soft text-accent-soft-foreground">
                <Compass className="size-5" aria-hidden="true" />
              </div>
              <h2
                id="origin-title"
                className="mt-6 text-2xl font-semibold tracking-tight sm:text-3xl"
              >
                {t("originTitle")}
              </h2>
            </div>
            <div className="max-w-2xl space-y-5 text-sm leading-7 text-muted-foreground sm:text-base sm:leading-8">
              <p>{t("originStory")}</p>
              <p>{t("productBelief")}</p>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="help-title"
          className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24 lg:px-10"
        >
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="font-mono text-xs tracking-[0.14em] text-accent uppercase">
                {t("helpEyebrow")}
              </p>
              <h2
                id="help-title"
                className="mt-4 max-w-xl text-3xl leading-tight font-semibold tracking-[-0.035em] sm:text-4xl"
              >
                {t("helpTitle")}
              </h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
              {t("helpIntro")}
            </p>
          </div>

          <ol className="mt-10 grid gap-4 md:grid-cols-3 md:gap-5">
            {paths.map(({ key, number, icon: Icon, href }) => (
              <li key={key} className="min-w-0">
                <Card className="h-full border-border bg-surface shadow-none">
                  <CardContent className="flex h-full flex-col p-5 sm:p-6">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs tracking-wide text-accent">{number}</span>
                      <Icon className="size-5 text-muted-foreground" aria-hidden="true" />
                    </div>
                    <h3 className="mt-8 text-lg font-semibold tracking-tight">
                      {t(`paths.${key}.title`)}
                    </h3>
                    <p className="mt-3 flex-1 text-sm leading-6 text-muted-foreground">
                      {t(`paths.${key}.description`)}
                    </p>
                    {href === "contributing" ? (
                      <a
                        className="mt-7 inline-flex min-h-11 w-fit items-center gap-2 rounded-md font-medium text-accent underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        href={contributingGuideUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {t(`paths.${key}.action`)}
                        <ArrowRight className="size-4" aria-hidden="true" />
                      </a>
                    ) : (
                      <a
                        className="mt-7 inline-flex min-h-11 w-fit items-center gap-2 rounded-md font-medium text-accent underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        href={`${repositoryUrl}${href === "issues" ? "/issues" : ""}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {t(`paths.${key}.action`)}
                        <ArrowRight className="size-4" aria-hidden="true" />
                      </a>
                    )}
                    {key === "share" && (
                      <div className="mt-5 grid grid-cols-2 gap-2">
                        <a
                          href={`${repositoryUrl}/stargazers`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex min-h-12 min-w-0 items-center gap-2 rounded-lg border border-border bg-background/60 px-3 py-2 transition-colors hover:border-accent/40 hover:bg-accent-soft/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          <Star className="size-4 shrink-0 text-accent" aria-hidden="true" />
                          <span className="flex min-w-0 flex-col text-left leading-tight">
                            <span className="text-xs font-medium">
                              {t("paths.share.stats.star")}
                            </span>
                            <Suspense
                              fallback={<span className="mt-1 block h-[13px]" aria-hidden="true" />}
                            >
                              <RepositoryCount
                                metric="stars"
                                statsPromise={repositoryStatsPromise}
                              />
                            </Suspense>
                          </span>
                        </a>
                        <a
                          href={`${repositoryUrl}/forks`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex min-h-12 min-w-0 items-center gap-2 rounded-lg border border-border bg-background/60 px-3 py-2 transition-colors hover:border-accent/40 hover:bg-accent-soft/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          <GitFork className="size-4 shrink-0 text-accent" aria-hidden="true" />
                          <span className="flex min-w-0 flex-col text-left leading-tight">
                            <span className="text-xs font-medium">
                              {t("paths.share.stats.fork")}
                            </span>
                            <Suspense
                              fallback={<span className="mt-1 block h-[13px]" aria-hidden="true" />}
                            >
                              <RepositoryCount
                                metric="forks"
                                statsPromise={repositoryStatsPromise}
                              />
                            </Suspense>
                          </span>
                        </a>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-t border-border bg-surface">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-5 py-12 sm:px-8 md:flex-row md:items-center lg:px-10">
            <div className="flex items-start gap-4">
              <ArrowDownRight className="mt-1 size-5 shrink-0 text-accent" aria-hidden="true" />
              <div>
                <h2 className="text-xl font-semibold tracking-tight">{t("closingTitle")}</h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                  {t("closingDescription")}
                </p>
              </div>
            </div>
            <Button asChild>
              <Link href="/editor">
                {t("closingAction")}
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

async function RepositoryCount({
  metric,
  statsPromise,
}: {
  metric: "stars" | "forks";
  statsPromise: Promise<PublicRepositoryStats | null>;
}) {
  const [t, locale, repositoryStats] = await Promise.all([
    getTranslations("About"),
    getLocale(),
    statsPromise,
  ]);

  if (!repositoryStats) return null;

  const formatCount = new Intl.NumberFormat(locale);
  const count = repositoryStats[metric];

  return (
    <span
      className="mt-1 font-mono text-[11px] text-muted-foreground tabular-nums"
      aria-live="polite"
    >
      {t(`paths.share.stats.${metric}`, { count: formatCount.format(count) })}
    </span>
  );
}
