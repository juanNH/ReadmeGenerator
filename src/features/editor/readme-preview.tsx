"use client";

import { createContext, useContext } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import Image from "next/image";
import { FileText, PenLine } from "lucide-react";
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import type { ContentLocale } from "@/core/profile/profile-schema";
import type { CustomHtmlFragment, CustomImageSource } from "@/core/readme";
import { normalizePublicImageUrl } from "@/core/readme/public-image";
import { findTechnology, findTechnologyByIconUrl } from "@/core/technologies";
import { findContactProviderByIconUrl } from "@/core/contact";
import { parseActivityCardUrl } from "@/core/activity";
import { findCountryByIconUrl } from "@/core/location";
import { remarkProfileIcons } from "./remark-profile-icons";
import { wrapNamedTechnologyLabels } from "./named-technology-labels";
import { PublicProfileImage } from "./public-profile-image";
import { ProfileHtmlPreview } from "./profile-html-preview";
import { remarkCustomHtml } from "./remark-custom-html";

const PreviewImagesContext = createContext<{
  customImages: readonly CustomImageSource[];
  customHtml: readonly CustomHtmlFragment[];
  activityCardBaseUrl?: string;
}>({ customImages: [], customHtml: [] });
type ReadmePreviewProps = {
  markdown: string | null;
  contentLocale: ContentLocale;
  loading: boolean;
  hasErrors: boolean;
  activityCardBaseUrl?: string;
  customImages?: readonly CustomImageSource[];
  customHtml?: readonly CustomHtmlFragment[];
};

export function ReadmePreview({
  markdown,
  contentLocale,
  loading,
  hasErrors,
  activityCardBaseUrl,
  customImages = [],
  customHtml = [],
}: ReadmePreviewProps) {
  const t = useTranslations("Editor.preview");

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-panel">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-raised/50 px-5 py-3.5">
        <span className="flex min-w-0 items-center gap-2 font-mono text-xs wrap-anywhere text-muted-foreground">
          <FileText className="size-3.5" aria-hidden="true" />
          README.md
        </span>
        <span className="text-xs text-muted-foreground">{t("fileLabel")}</span>
      </div>
      {loading ? (
        <div className="space-y-4 p-6 sm:p-8" role="status" aria-busy="true">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-16 w-full" />
          <span className="sr-only">{t("loading")}</span>
        </div>
      ) : markdown !== null ? (
        <article
          lang={contentLocale}
          aria-label={t("documentLabel")}
          className="min-h-72 p-6 text-sm leading-7 wrap-anywhere sm:p-8 [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-4 [&_li]:pl-1 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-4 [&_strong]:font-semibold [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-5"
        >
          <PreviewImagesContext.Provider value={{ customImages, customHtml, activityCardBaseUrl }}>
            <ReactMarkdown
              skipHtml
              remarkPlugins={[[remarkCustomHtml, { fragments: customHtml }], remarkProfileIcons]}
              allowedElements={[
                "h1",
                "h2",
                "h3",
                "p",
                "ul",
                "ol",
                "li",
                "a",
                "strong",
                "em",
                "br",
                "img",
                "hr",
                "blockquote",
                "div",
              ]}
              components={{
                img: PreviewImage,
                p: PreviewParagraph,
                div: PreviewHtmlSlot,
                h1: ({ children }) => (
                  <h3 className="mt-1 mb-5 border-b border-border pb-4 text-2xl leading-tight font-semibold tracking-tight">
                    {children}
                  </h3>
                ),
                h2: ({ children }) => (
                  <h3 className="mt-6 mb-3 text-lg leading-7 font-semibold tracking-tight">
                    {children}
                  </h3>
                ),
                h3: ({ children }) => (
                  <h4 className="mt-5 mb-3 text-base font-semibold">{children}</h4>
                ),
                hr: () => <hr className="my-6 border-0 border-t border-border" />,
                blockquote: ({ children }) => (
                  <blockquote className="my-5 border-l-4 border-accent/50 pl-4 text-muted-foreground [&_p]:my-2">
                    {children}
                  </blockquote>
                ),
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer">
                    {children}
                  </a>
                ),
              }}
            >
              {markdown}
            </ReactMarkdown>
          </PreviewImagesContext.Provider>
        </article>
      ) : (
        <div className="flex min-h-72 flex-col items-center justify-center px-6 py-10 text-center sm:px-8">
          <span className="mb-5 flex size-12 items-center justify-center rounded-lg border border-border bg-surface-raised">
            <PenLine className="size-5 text-muted-foreground" aria-hidden="true" />
          </span>
          <p className="text-base font-medium">{t(hasErrors ? "reviewTitle" : "emptyTitle")}</p>
          <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
            {t(hasErrors ? "reviewDescription" : "emptyDescription")}
          </p>
        </div>
      )}
    </div>
  );
}

// Stable paragraph and image component identities preserve load failures across unrelated edits.
const PreviewImage: Components["img"] = ({ src, alt }) => {
  const { customImages, activityCardBaseUrl } = useContext(PreviewImagesContext);
  const authoredImage = customImages.find((entry) => entry.src === src && entry.alt === alt);
  if (authoredImage && normalizePublicImageUrl(authoredImage.src) === authoredImage.src)
    return <PublicProfileImage key={authoredImage.src} {...authoredImage} />;
  const card = typeof src === "string" ? parseActivityCardUrl(src, activityCardBaseUrl) : null;
  if (card)
    return (
      <Image
        src={card.localUrl}
        alt={alt ?? ""}
        width={700}
        height={260}
        unoptimized
        className="block h-auto w-full max-w-full rounded-lg border border-border bg-white"
      />
    );
  const country = typeof src === "string" ? findCountryByIconUrl(src) : undefined;
  if (country && alt === "")
    return (
      <Image
        src={country.iconPath}
        alt=""
        aria-hidden="true"
        width={20}
        height={15}
        unoptimized
        className="inline-block h-[15px] w-5 shrink-0 rounded-[2px] align-middle"
      />
    );
  const technology =
    alt === "" && typeof src === "string"
      ? findTechnologyByIconUrl(src)
      : findTechnology(alt ?? "");
  const provider = typeof src === "string" ? findContactProviderByIconUrl(src) : undefined;
  const entry =
    technology?.iconUrl === src ? technology : provider && alt === "" ? provider : undefined;
  const size = entry === technology && alt !== "" ? 32 : 20;
  return entry ? (
    <Image
      src={entry.iconPath}
      alt={size === 32 ? entry.name : ""}
      aria-hidden={size === 20 ? true : undefined}
      width={size}
      height={size}
      unoptimized
      title={entry === technology && size === 20 ? undefined : entry.name}
      className={
        size === 32
          ? "inline-block size-8 shrink-0 rounded bg-white object-contain p-0.5 align-middle"
          : "inline-block size-5 shrink-0 rounded bg-white object-contain p-0.5 align-middle"
      }
    />
  ) : null;
};

const PreviewParagraph: Components["p"] = ({ node, children }) => {
  const isIconRow =
    node?.children.some((child) => child.type === "element" && child.tagName === "img") &&
    node.children.every(
      (child) =>
        (child.type === "element" && child.tagName === "img") ||
        (child.type === "text" && !child.value.trim()),
    );
  return (
    <p className={isIconRow ? "flex flex-wrap items-center gap-3" : undefined}>
      {wrapNamedTechnologyLabels(children)}
    </p>
  );
};

const PreviewHtmlSlot: Components["div"] = ({ node }) => {
  const { customHtml } = useContext(PreviewImagesContext);
  const index = node?.properties.dataProfileHtmlIndex;
  if (typeof index !== "string" || !/^\d+$/.test(index)) return null;
  const fragment = customHtml[Number(index)];
  return fragment ? <ProfileHtmlPreview fragment={fragment} /> : null;
};
