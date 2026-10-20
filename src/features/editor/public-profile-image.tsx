"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

/** User image requests stay in the browser; no server-side optimizer or image proxy. */
export function PublicProfileImage({
  src,
  alt,
  width,
  height,
  inline = false,
  linked = false,
}: {
  src: string;
  alt: string;
  width?: number | string;
  height?: number;
  inline?: boolean;
  linked?: boolean;
}) {
  const t = useTranslations("Editor.preview");
  const locale = useLocale();
  const [failed, setFailed] = useState(false);

  if (failed)
    return (
      <span
        lang={locale}
        role={linked ? undefined : "status"}
        aria-live="polite"
        aria-atomic="true"
        className="inline-flex w-full min-w-0 flex-col gap-2 rounded-lg border border-border bg-surface-raised p-4 text-sm text-muted-foreground"
      >
        <span className="inline-flex items-center gap-2 font-medium">
          <ImageOff aria-hidden="true" className="size-4 shrink-0" />
          {t("imageLoadFailure")}
        </span>
        <span>{alt}</span>
        <span className="text-xs leading-5">{t("imageLoadHelp")}</span>
        {!linked && (
          <a href={src} target="_blank" rel="noopener noreferrer" className="self-start">
            {t("openImage")}
          </a>
        )}
      </span>
    );

  return (
    // eslint-disable-next-line @next/next/no-img-element -- Arbitrary public hosts must never be fetched by the server optimizer.
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={
        inline
          ? "inline-block max-w-full object-contain align-middle"
          : "block h-auto max-w-full rounded-lg"
      }
      style={inline ? { width, height: height ?? "auto" } : undefined}
    />
  );
}
