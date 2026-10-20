"use client";

import { Globe2 } from "lucide-react";
import { hasLocale, useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

// Locale navigation remounts this component. This pending browser action must survive
// that remount, without being persisted or becoming part of the profile document.
let pendingLocation: {
  locale: string;
  pathname: string;
  search: string;
  hash: string;
  restoreFocus: boolean;
} | null = null;

export function LocaleSwitcher() {
  const locale = useLocale();
  const t = useTranslations("Controls");
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const selectorRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    function cancelPendingLocation() {
      pendingLocation = null;
    }
    window.addEventListener("popstate", cancelPendingLocation);
    return () => window.removeEventListener("popstate", cancelPendingLocation);
  }, []);

  useEffect(() => {
    const expected = pendingLocation;
    if (!expected || isPending) return;
    if (
      new URL(pathname, window.location.origin).pathname !== expected.pathname ||
      window.location.search !== expected.search
    ) {
      pendingLocation = null;
      return;
    }
    if (locale !== expected.locale) return;
    pendingLocation = null;
    // Next 16.4 can append a hash to a cached canonical URL that already contains it.
    // The supported native History API also synchronizes Next's router state.
    if (window.location.hash !== expected.hash) {
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}${expected.hash}`,
      );
    }
    if (expected.restoreFocus) selectorRef.current?.focus({ preventScroll: true });
  }, [isPending, locale, pathname]);
  return (
    <div className="relative flex min-h-11 items-center gap-2">
      <Globe2
        className="pointer-events-none absolute left-3 size-4 text-muted-foreground"
        aria-hidden="true"
      />
      <select
        ref={selectorRef}
        aria-label={t("language")}
        aria-busy={isPending}
        className="min-h-11 rounded-md border border-transparent bg-transparent py-2 pr-2 pl-9 text-base font-medium hover:bg-surface-raised disabled:opacity-60 sm:text-sm"
        value={locale}
        disabled={isPending}
        onChange={(event) => {
          const nextLocale = event.target.value;
          if (!hasLocale(routing.locales, nextLocale)) return;
          const routePathname = new URL(pathname, window.location.origin).pathname;
          const search = window.location.search;
          pendingLocation = {
            locale: nextLocale,
            pathname: routePathname,
            search,
            hash: window.location.hash,
            restoreFocus: document.activeElement === event.currentTarget,
          };
          const destination = `${routePathname}${search}`;
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
