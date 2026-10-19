import { ArrowUpRight, CodeXml } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Link } from "@/i18n/navigation";

export async function SiteHeader() {
  const t = await getTranslations("Navigation");
  return (
    <header className="border-b border-border bg-background/95">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-4 sm:px-8 lg:px-10">
        <Link
          href="/"
          aria-label={t("home")}
          className="flex min-h-11 items-center gap-3 rounded-md"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-foreground text-background">
            <CodeXml className="size-5" strokeWidth={1.6} aria-hidden="true" />
          </span>
          <span className="text-sm leading-tight font-semibold tracking-tight sm:text-base">
            GitHub Profile
            <br className="sm:hidden" /> Generator<span className="text-accent">.</span>
          </span>
        </Link>
        <nav
          aria-label={t("main")}
          className="order-3 flex w-full items-center gap-5 border-t border-border pt-2 text-sm sm:order-none sm:w-auto sm:border-0 sm:pt-0"
        >
          <Link
            href="/#modules"
            className="flex min-h-11 items-center text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("modules")}
          </Link>
          <Link
            href="/editor"
            className="flex min-h-11 items-center font-medium text-accent transition-colors hover:text-foreground"
          >
            {t("editor")}
          </Link>
          <Link href="/design-system" className="flex min-h-11 items-center gap-1.5 font-medium">
            {t("designSystem")}
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </Link>
        </nav>
        <div className="flex shrink-0 items-center gap-1">
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
