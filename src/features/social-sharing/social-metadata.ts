import type { Metadata } from "next";
import type { AppLocale } from "@/i18n/routing";

type BuildSocialMetadataInput = {
  origin: string | undefined;
  locale: AppLocale;
  title: string;
  description: string;
  imageAlt: string;
};

const socialImageSize = { width: 1200, height: 630 };

export function buildSocialMetadata({
  origin,
  locale,
  title,
  description,
  imageAlt,
}: BuildSocialMetadataInput): Pick<Metadata, "openGraph" | "twitter"> {
  // Without a validated origin, omit URLs instead of letting Next infer a preview host.
  // Route URLs belong in page-level metadata because this object is inherited by child routes.
  const imageUrl = origin ? new URL(`/${locale}/social-preview`, origin).toString() : undefined;
  const images = imageUrl
    ? [{ url: imageUrl, alt: imageAlt, ...socialImageSize, type: "image/png" }]
    : undefined;

  return {
    openGraph: {
      title,
      description,
      siteName: "GitHub Profile Generator",
      locale: locale === "es" ? "es_AR" : "en_US",
      type: "website",
      ...(images ? { images } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(images ? { images } : {}),
    },
  };
}
