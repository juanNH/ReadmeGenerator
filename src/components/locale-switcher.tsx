"use client";

import { Globe2 } from "lucide-react";
import { hasLocale, useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export function LocaleSwitcher() {
  const locale = useLocale();
  const t = useTranslations("Controls");
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  return (
    <div className="relative flex min-h-11 items-center gap-2">
      <Globe2
        className="pointer-events-none absolute left-3 size-4 text-muted-foreground"
        aria-hidden="true"
      />
      <select
        aria-label={t("language")}
        aria-busy={isPending}
        className="min-h-11 rounded-md border border-transparent bg-transparent py-2 pr-2 pl-9 text-sm font-medium hover:bg-surface-raised disabled:opacity-60"
        value={locale}
        disabled={isPending}
        onChange={(event) => {
          const nextLocale = event.target.value;
          if (!hasLocale(routing.locales, nextLocale)) return;
          const destination = `${pathname}${window.location.search}${window.location.hash}`;
          startTransition(() => router.replace(destination, { locale: nextLocale, scroll: false }));
        }}
      >
        <option value="en" lang="en">
          English
        </option>
        <option value="es" lang="es">
          Español
        </option>
      </select>
      <span className="sr-only" role="status">
        {isPending ? t("changingLanguage") : ""}
      </span>
    </div>
  );
}
