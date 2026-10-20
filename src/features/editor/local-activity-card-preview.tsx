"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { MetricCardId } from "@/core/profile/module-content";
import { ActivityCardSample } from "@/modules/contributions/activity-card-sample";
import type { ActivityDataCardState } from "./activity-data-cache";

/** Only SVG produced by our pure renderers reaches this component, never authored SVG. */
export function LocalActivityCardPreview({
  state,
  card,
  href,
  alt,
  width,
  onRetry,
}: {
  state: ActivityDataCardState;
  card: MetricCardId;
  href: string;
  alt: string;
  width: number;
  onRetry: () => void;
}) {
  const t = useTranslations("Editor.preview");
  const locale = useLocale();
  if (state.status === "ready")
    return (
      <span className="block max-w-full min-w-0" style={{ width }}>
        <LocalSvgImage
          key={state.svg}
          svg={state.svg}
          href={href}
          alt={alt}
          width={width}
          card={card}
        />
        {state.supplement && (
          <span
            lang={locale}
            className="mt-2 block space-y-2 text-xs leading-5 text-muted-foreground"
          >
            <span role="status" aria-live="polite" className="block">
              {t(
                state.supplement.status === "loading"
                  ? "cardSupplementLoading"
                  : state.supplement.status === "error"
                    ? "cardSupplementFailure"
                    : "cardSupplementPending",
              )}
              {state.supplement.status === "error" && state.supplement.code && (
                <span className="block">{t(`cardErrors.${state.supplement.code}`)}</span>
              )}
            </span>
            {state.supplement.status === "error" && (
              <Button size="sm" variant="outline" onClick={onRetry}>
                {t("cardRetry")}
              </Button>
            )}
          </span>
        )}
      </span>
    );

  const loading = state.status === "loading";
  return (
    <span
      role="group"
      aria-label={alt}
      aria-busy={loading}
      className="block max-w-full min-w-0 space-y-2 rounded-lg border border-dashed border-border p-3"
      style={{ width }}
    >
      <span className={loading ? "animate-skeleton block" : "block"}>
        <ActivityCardSample card={card} />
      </span>
      <span
        lang={locale}
        role="status"
        aria-live="polite"
        className="block text-xs leading-5 text-muted-foreground"
      >
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <LoaderCircle aria-hidden="true" className="size-3.5 motion-safe:animate-spin" />
            {t("cardLoading")}
          </span>
        ) : state.status === "error" ? (
          <>
            <span className="block">{t("cardLoadFailure")}</span>
            <span className="block">{t(`cardErrors.${state.code}`)}</span>
          </>
        ) : (
          t("cardSample")
        )}
      </span>
      {state.status === "error" && (
        <Button lang={locale} size="sm" variant="outline" onClick={onRetry}>
          {t("cardRetry")}
        </Button>
      )}
    </span>
  );
}

function LocalSvgImage({
  svg,
  href,
  alt,
  width,
  card,
}: {
  svg: string;
  href: string;
  alt: string;
  width: number;
  card: MetricCardId;
}) {
  const t = useTranslations("Editor.preview");
  const locale = useLocale();
  const image = useRef<HTMLImageElement>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    // A Blob keeps the SVG in an image context. No markup is inserted into the page.
    const source = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    const element = image.current;
    if (element) element.src = source;
    return () => {
      if (element) element.removeAttribute("src");
      URL.revokeObjectURL(source);
    };
  }, [svg, attempt]);
  return failed ? (
    <span lang={locale} role="status" className="block space-y-2 text-xs text-muted-foreground">
      <ActivityCardSample card={card} />
      <span>{t("cardImageFailure")}</span>
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          setFailed(false);
          setAttempt((value) => value + 1);
        }}
      >
        {t("cardRetry")}
      </Button>
    </span>
  ) : (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={alt}>
      {/* eslint-disable-next-line @next/next/no-img-element -- Internal passive SVG Blob; never a provider URL or server image optimizer. */}
      <img
        ref={image}
        alt={alt}
        width={width}
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="block h-auto max-w-full rounded-lg"
      />
    </a>
  );
}
