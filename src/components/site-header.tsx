import { CodeXml, Info } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

export async function SiteHeader({ variant = "default" }: { variant?: "default" | "editor" }) {
  const t = await getTranslations("Navigation");
  const isEditor = variant === "editor";
  return (
    <header className="border-b border-border bg-background/95">
      <div
        className={cn(
          "mx-auto flex min-w-0 flex-wrap items-center justify-between sm:px-8 lg:px-10",
          isEditor ? "max-w-[100rem] gap-2 px-4 py-2" : "max-w-7xl gap-x-6 gap-y-2 px-5 py-4",
        )}
      >
        <Link
          href="/"
          aria-label={t("home")}
          className="flex min-h-11 max-w-full min-w-11 items-center justify-center gap-3 rounded-md sm:justify-start"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-foreground text-background">
            <CodeXml className="size-5" strokeWidth={1.6} aria-hidden="true" />
          </span>
          <span
            className={cn(
              "min-w-0 text-sm leading-tight font-semibold tracking-tight wrap-anywhere sm:text-base",
              isEditor && "hidden sm:block",
            )}
          >
            GitHub Profile
            <br className="sm:hidden" /> Generator<span className="text-accent">.</span>
          </span>
        </Link>
        {!isEditor && (
          <nav
            aria-label={t("main")}
            className="order-3 flex w-full max-w-full min-w-0 flex-wrap items-center gap-5 border-t border-border pt-2 text-sm sm:order-none sm:w-auto sm:border-0 sm:pt-0"
          >
            <Link
              href="/#modules"
              className="flex min-h-11 max-w-full min-w-0 items-center wrap-anywhere text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("modules")}
            </Link>
            <Link
              href="/editor"
              className="flex min-h-11 max-w-full min-w-0 items-center font-medium wrap-anywhere text-accent transition-colors hover:text-foreground"
            >
              {t("editor")}
            </Link>
            <Link
              href="/about"
              className="flex min-h-11 max-w-full min-w-0 items-center wrap-anywhere text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("about")}
            </Link>
          </nav>
        )}
        <div
          className={cn(
            "flex max-w-full min-w-0 shrink-0 flex-wrap items-center justify-end gap-1",
            isEditor && "ml-auto",
          )}
        >
          {isEditor && (
            <nav aria-label={t("main")} className="flex items-center">
              <Link
                href="/about"
                className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-md px-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:min-w-0"
              >
                <Info className="size-4" aria-hidden="true" />
                <span className="sr-only sm:not-sr-only">{t("about")}</span>
              </Link>
            </nav>
          )}
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
