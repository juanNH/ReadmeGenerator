"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

/** The caller keys this component by public identity, keeping previous configurations local. */
export function ActivityCardPreview({
  src,
  href,
  alt,
  width,
}: {
  src: string;
  href: string;
  alt: string;
  width: number;
}) {
  const t = useTranslations("Editor.preview");
  const interfaceLocale = useLocale();
  const [loadedSource, setLoadedSource] = useState<string>();
  const [failedSource, setFailedSource] = useState<string>();
  const currentSource = useRef(src);
  // Cached images may finish before passive effects; update the guard in the commit phase.
  useLayoutEffect(() => {
    currentSource.current = src;
  }, [src]);
  const pending = loadedSource !== src;
  const failed = failedSource === src;
  const displayedSource = loadedSource ?? (failed ? undefined : src);

  function finish(source: string, success: boolean) {
    if (currentSource.current !== source) return;
    if (success) {
      setLoadedSource(source);
      setFailedSource(undefined);
    } else {
      setLoadedSource((previous) => (previous === source ? undefined : previous));
      setFailedSource(source);
    }
  }

  return (
    <span className="relative block max-w-full min-w-0">
      {displayedSource && (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-busy={pending && !failed}
          className="relative block"
        >
          {(loadedSource && pending && !failed ? [loadedSource, src] : [displayedSource]).map(
            (source) => (
              <Image
                key={source}
                src={source}
                alt={source === displayedSource ? alt : ""}
                aria-hidden={source === displayedSource ? undefined : true}
                width={width}
                height={260}
                loading={source === displayedSource ? "lazy" : "eager"}
                unoptimized
                referrerPolicy="no-referrer"
                onLoad={() => finish(source, true)}
                onError={() => finish(source, false)}
                className={
                  source === displayedSource
                    ? "block h-auto max-w-full rounded-lg"
                    : "pointer-events-none absolute top-0 left-0 h-auto max-w-full opacity-0"
                }
              />
            ),
          )}
        </a>
      )}
      {(pending || failed) && (
        <span
          lang={interfaceLocale}
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="mt-2 block text-xs leading-5 text-muted-foreground"
        >
          {failed
            ? t(loadedSource ? "cardUpdateFailure" : "cardLoadFailure")
            : t(loadedSource ? "cardUpdating" : "cardLoading")}
        </span>
      )}
      {failed && (
        <Button
          lang={interfaceLocale}
          type="button"
          size="sm"
          variant="outline"
          className="mt-2"
          onClick={() => {
            setFailedSource(undefined);
          }}
        >
          {t("cardRetry")}
        </Button>
      )}
    </span>
  );
}
