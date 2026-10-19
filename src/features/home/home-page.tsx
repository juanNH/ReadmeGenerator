import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  AtSign,
  BookOpen,
  Check,
  CodeXml,
  Compass,
  FileText,
  FolderGit2,
  GitPullRequest,
  GraduationCap,
  Layers3,
  Sprout,
  Terminal,
  TrendingUp,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";

const modules = [
  { key: "presentation", icon: Compass },
  { key: "knowledge", icon: BookOpen },
  { key: "technologies", icon: CodeXml },
  { key: "education", icon: GraduationCap },
  { key: "current", icon: Sprout },
  { key: "projects", icon: FolderGit2 },
  { key: "contributions", icon: GitPullRequest },
  { key: "metrics", icon: TrendingUp },
  { key: "contact", icon: AtSign },
] as const;

export async function HomePage() {
  const t = await getTranslations("Home");

  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 pt-14 pb-16 sm:px-8 sm:pt-20 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:px-10 lg:pt-24 lg:pb-24">
          <div className="min-w-0">
            <div className="mb-6 flex items-center gap-2.5 text-xs font-medium tracking-wide text-muted-foreground">
              <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
              {t("eyebrow")}
            </div>
            <h1 className="text-[clamp(2.75rem,5.4vw,4.75rem)] leading-[1.07] font-semibold tracking-[-0.055em]">
              {t("title")}
              <br />
              <span className="text-accent">{t("titleAccent")}</span>
            </h1>
            <p className="mt-7 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              {t("description")}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <a href="#modules">
                  {t("primary")}
                  <ArrowDown aria-hidden="true" />
                </a>
              </Button>
              <Button asChild variant="ghost">
                <Link href="/design-system">
                  {t("secondary")}
                  <ArrowUpRight aria-hidden="true" />
                </Link>
              </Button>
            </div>
            <p className="mt-6 max-w-sm text-xs leading-5 text-muted-foreground">{t("note")}</p>
          </div>

          <figure className="min-w-0">
            <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-panel">
              <div className="flex items-center justify-between gap-3 border-b border-border bg-surface-raised/50 px-5 py-3.5">
                <span className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                  <FileText className="size-3.5" aria-hidden="true" />
                  README.md
                </span>
                <span className="text-[11px] text-muted-foreground">{t("previewLabel")}</span>
              </div>
              <div className="p-6 sm:p-8">
                <div className="flex items-center gap-4">
                  <span
                    className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-accent/15 bg-accent-soft font-mono text-base font-medium text-accent-soft-foreground"
                    aria-hidden="true"
                  >
                    ar
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-xl font-semibold tracking-tight">{t("previewName")}</h2>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {t("previewRole")}
                    </p>
                  </div>
                </div>
                <p className="mt-5 text-sm leading-6 text-muted-foreground">{t("previewBio")}</p>
                <div className="mt-6 border-t border-border pt-5">
                  <h3 className="text-xs font-semibold">{t("previewKnowledge")}</h3>
                  <ul className="mt-3 space-y-2.5 text-xs leading-5 text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <Check className="size-3.5 shrink-0 text-accent" aria-hidden="true" />
                      {t("previewCapabilityOne")}
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="size-3.5 shrink-0 text-accent" aria-hidden="true" />
                      {t("previewCapabilityTwo")}
                    </li>
                  </ul>
                </div>
                <div className="mt-5">
                  <h3 className="text-xs font-semibold">{t("previewTechnologies")}</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {["TypeScript", "React", "React Native"].map((technology) => (
                      <Badge key={technology} variant="outline">
                        {technology}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
                  <span className="text-muted-foreground">{t("previewLearning")}</span>
                  <Badge variant="accent">Docker</Badge>
                  <Badge variant="accent">Jest</Badge>
                </div>
                <div className="mt-5 flex items-start gap-2.5 rounded-md bg-surface-raised px-3 py-3">
                  <GraduationCap
                    className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <div>
                    <h3 className="text-xs font-medium">{t("previewEducation")}</h3>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {t("previewEducationValue")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <figcaption className="mt-4 text-center font-mono text-[10px] leading-5 tracking-wide text-muted-foreground">
              {t("previewCaption")}
            </figcaption>
          </figure>
        </section>

        <section aria-label={t("principlesLabel")} className="border-y border-border bg-surface">
          <ul className="mx-auto grid max-w-7xl gap-5 px-5 py-6 text-sm sm:px-8 md:grid-cols-3 lg:px-10">
            {[
              { key: "principleOne", icon: BookOpen },
              { key: "principleTwo", icon: Layers3 },
              { key: "principleThree", icon: Sprout },
            ].map(({ key, icon: Icon }) => (
              <li key={key} className="flex items-center gap-3">
                <Icon className="size-4 shrink-0 text-accent" aria-hidden="true" />
                <span>{t(key as "principleOne" | "principleTwo" | "principleThree")}</span>
              </li>
            ))}
          </ul>
        </section>

        <section
          id="modules"
          aria-labelledby="modules-title"
          className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24 lg:px-10"
        >
          <p className="font-mono text-xs tracking-[0.14em] text-accent uppercase">
            {t("modulesEyebrow")}
          </p>
          <div className="mt-4 grid gap-5 lg:grid-cols-2 lg:gap-16">
            <h2
              id="modules-title"
              className="max-w-md text-3xl leading-tight font-semibold tracking-[-0.035em] sm:text-4xl"
            >
              {t("modulesTitle")}
            </h2>
            <p className="max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
              {t("modulesDescription")}
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map(({ key, icon: Icon }) => (
              <Card key={key} className="shadow-none">
                <CardContent className="p-5 sm:p-6">
                  <div className="mb-5 flex items-center justify-between">
                    <span className="flex size-9 items-center justify-center rounded-md border border-border bg-surface-raised">
                      <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
                    </span>
                    <span className="text-[11px] text-muted-foreground">{t("optional")}</span>
                  </div>
                  <h3 className="text-sm font-semibold">{t(`modules.${key}.title`)}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {t(`modules.${key}.description`)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section
          id="how-it-works"
          aria-labelledby="process-title"
          className="border-y border-border bg-surface"
        >
          <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
            <p className="font-mono text-xs tracking-[0.14em] text-accent uppercase">
              {t("processEyebrow")}
            </p>
            <h2
              id="process-title"
              className="mt-4 max-w-2xl text-3xl leading-tight font-semibold tracking-[-0.035em] sm:text-4xl"
            >
              {t("processTitle")}
            </h2>
            <ol className="mt-10 grid gap-8 md:grid-cols-3 md:gap-10">
              {(["choose", "compose", "personalize"] as const).map((step, index) => (
                <li key={step} className="border-t border-border pt-5">
                  <span className="font-mono text-xs text-accent" aria-hidden="true">
                    0{index + 1}
                  </span>
                  <h3 className="mt-4 text-base font-semibold">{t(`steps.${step}.title`)}</h3>
                  <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
                    {t(`steps.${step}.description`)}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-5 py-14 sm:px-8 md:flex-row md:items-center lg:px-10">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">{t("closingTitle")}</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              {t("closingDescription")}
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/design-system">
              {t("closingAction")}
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </section>
      </main>
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-6 text-xs text-muted-foreground sm:px-8 lg:px-10">
          <span className="flex items-center gap-2">
            <Terminal className="size-3.5" aria-hidden="true" />
            {t("footer")}
          </span>
          <span>{t("footerNote")}</span>
        </div>
      </footer>
    </>
  );
}
