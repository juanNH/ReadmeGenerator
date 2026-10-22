import type { ElementContent, Root } from "hast";
import { toHtml } from "hast-util-to-html";
import { parseCountryLocation } from "../location";
import type { PresentationTypography } from "../profile/module-content";
import type { ProfileDocument } from "../profile/profile-schema";
import { countryFlagMarkup } from "./country-flags";
import {
  formattedTextSource,
  renderProfileHtml,
  type ProfileHtmlBudget,
} from "./derived-profile-html";
import {
  escapeInlineText,
  escapeParagraphText,
  normalizeInlineText,
  normalizeParagraphText,
} from "./escape-markdown";
import { readmeLabels } from "./readme-labels";
import type { CustomHtmlFragment, ReadmeIssue } from "./readme-result";

function titleNodes(
  text: string,
  typography: PresentationTypography | undefined,
): ElementContent[] {
  const children: ElementContent[] = [{ type: "text", value: text }];
  return typography
    ? [
        {
          type: "element",
          tagName: typography === "italic" ? "em" : "code",
          properties: {},
          children,
        },
      ]
    : children;
}

/** Presentation text stays literal; name and headline default to centered output. */
export function renderPresentation(
  document: ProfileDocument,
  errors: ReadmeIssue[],
  htmlBudget: ProfileHtmlBudget,
): { markdown: string; htmlFragments: readonly CustomHtmlFragment[] } {
  const { displayName, headline, bio, location, format } = document.data.presentation;
  const labels = readmeLabels[document.contentLocale];
  const nameText = normalizeInlineText(displayName);
  const headlineText = normalizeInlineText(headline);
  const countryLocation = parseCountryLocation(location);
  const locationText = normalizeInlineText(countryLocation?.text ?? location);
  const locationInDisplayName = Boolean(
    format?.locationPlacement === "displayName" && nameText && locationText,
  );
  const locationInHeadline = Boolean(
    format?.locationPlacement === "headline" && headlineText && locationText,
  );
  const locationInSelectedField = locationInDisplayName || locationInHeadline;
  const sections: string[] = [];
  const htmlFragments: CustomHtmlFragment[] = [];
  let cursor = 0;

  function append(markdown: string, fragment?: { html: string; tree: Root }) {
    if (!markdown) return;
    if (sections.length) cursor += 2;
    if (fragment) {
      htmlFragments.push({
        ...fragment,
        start: cursor,
        end: cursor + markdown.length,
        headingLevel: 3,
      });
    }
    sections.push(markdown);
    cursor += markdown.length;
  }
  function appendHtml(
    source: string,
    field: "displayName" | "headline" | "bio" | "location",
    relatedField?: "location",
  ) {
    const previousErrors = errors.length;
    const fragment = renderProfileHtml(source, ["data", "presentation", field], errors, htmlBudget);
    if (fragment) append(fragment.html, fragment);
    else if (relatedField && errors.length > previousErrors)
      errors.push({ code: "invalid_html", path: ["data", "presentation", relatedField] });
  }

  function locationNodes(): ElementContent[] {
    return [
      ...(countryLocation
        ? [
            {
              type: "element" as const,
              tagName: "img",
              properties: {
                width: 20,
                height: 15,
                src: countryLocation.country.iconUrl,
                alt: "",
              },
              children: [],
            },
            { type: "text" as const, value: " " },
          ]
        : []),
      { type: "text", value: locationText },
    ];
  }

  if (nameText) {
    const level = format?.displayNameLevel ?? 1;
    const alignment = format?.displayNameAlignment ?? "center";
    if (locationInDisplayName || format?.displayNameTypography || alignment !== "left") {
      const children: ElementContent[] = [
        ...titleNodes(nameText, format?.displayNameTypography),
        ...(locationInDisplayName
          ? [{ type: "text" as const, value: ` ${labels.from} ` }, ...locationNodes()]
          : []),
      ];
      const tree: Root = {
        type: "root",
        children: [
          {
            type: "element",
            tagName: `h${level}`,
            properties: { align: alignment },
            children,
          },
        ],
      };
      appendHtml(toHtml(tree), "displayName", locationInDisplayName ? "location" : undefined);
    } else append(`${"#".repeat(level)} ${escapeInlineText(displayName)}`);
  }

  if (headlineText) {
    const level = format?.headlineLevel ?? 2;
    const alignment = format?.headlineAlignment ?? "center";
    if (locationInHeadline || format?.headlineTypography || alignment !== "left") {
      const children: ElementContent[] = [
        ...titleNodes(headlineText, format?.headlineTypography),
        ...(locationInHeadline
          ? [{ type: "text" as const, value: ` ${labels.from} ` }, ...locationNodes()]
          : []),
      ];
      const tree: Root = {
        type: "root",
        children: [
          {
            type: "element",
            tagName: `h${level}`,
            properties: { align: alignment },
            children,
          },
        ],
      };
      appendHtml(toHtml(tree), "headline", locationInHeadline ? "location" : undefined);
    } else append(`${"#".repeat(level)} ${escapeInlineText(headline)}`);
  }
  const bioText = normalizeParagraphText(bio);
  if (bioText) {
    if (format?.bioAlignment && format.bioAlignment !== "left")
      appendHtml(formattedTextSource("p", bioText, format.bioAlignment), "bio");
    else append(escapeParagraphText(bio));
  }

  if (locationText && !locationInSelectedField) {
    const label = `${labels.locationLine} `;
    const alignment = format?.locationAlignment ?? "left";
    if (alignment !== "left") {
      const tree: Root = {
        type: "root",
        children: [
          {
            type: "element",
            tagName: "p",
            properties: { align: alignment },
            children: [{ type: "text", value: label }, ...locationNodes()],
          },
        ],
      };
      appendHtml(toHtml(tree), "location");
    } else {
      const text = escapeInlineText(countryLocation?.text ?? location);
      const content = countryLocation
        ? `${countryFlagMarkup(countryLocation.country)} ${text}`
        : text;
      append(`${label}${content}`);
    }
  }
  return { markdown: sections.join("\n\n"), htmlFragments };
}
