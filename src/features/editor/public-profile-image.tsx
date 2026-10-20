"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

/** User image requests stay in the browser; no server-side optimizer or image proxy. */
export function PublicProfileImage({ src, alt }: { src: string; alt: string }) {
  const t = useTranslations("Editor.preview");
  const locale = useLocale();
  const [failed, setFailed] = useState(false);

  if (failed)
    return (
      <span
        lang={locale}
        role="status"
        className="inline-flex w-full min-w-0 flex-col gap-2 rounded-lg border border-border bg-surface-raised p-4 text-sm text-muted-foreground"
      >
        <span className="inline-flex items-center gap-2 font-medium">
          <ImageOff aria-hidden="true" className="size-4 shrink-0" />
          {t("imageLoadFailure")}
        </span>
        <span>{alt}</span>
        <span className="text-xs leading-5">{t("imageLoadHelp")}</span>
        <a href={src} target="_blank" rel="noopener noreferrer" className="self-start">
          {t("openImage")}
        </a>
      </span>
    );

  return (
    // eslint-disable-next-line @next/next/no-img-element -- Arbitrary public hosts must never be fetched by the server optimizer.
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="block h-auto max-w-full rounded-lg"
    />
  );
}
