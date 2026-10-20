import type { Root } from "hast";
import { toHtml } from "hast-util-to-html";
import { parseCountryLocation } from "../location";
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

/** Plain presentation fields retain their previous Markdown until formatting is chosen. */
export function renderPresentation(
  document: ProfileDocument,
  errors: ReadmeIssue[],
  htmlBudget: ProfileHtmlBudget,
): { markdown: string; htmlFragments: readonly CustomHtmlFragment[] } {
  const { displayName, headline, bio, location, format } = document.data.presentation;
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
  function appendHtml(source: string, field: "displayName" | "headline" | "bio" | "location") {
    const fragment = renderProfileHtml(source, ["data", "presentation", field], errors, htmlBudget);
    if (fragment) append(fragment.html, fragment);
  }

  for (const field of ["displayName", "headline"] as const) {
    const value = field === "displayName" ? displayName : headline;
    const text = normalizeInlineText(value);
    if (!text) continue;
    const level =
      field === "displayName" ? (format?.displayNameLevel ?? 1) : (format?.headlineLevel ?? 2);
    const alignment =
      field === "displayName" ? format?.displayNameAlignment : format?.headlineAlignment;
    if (alignment && alignment !== "left") {
      appendHtml(formattedTextSource(`h${level}`, text, alignment), field);
    } else append(`${"#".repeat(level)} ${escapeInlineText(value)}`);
  }
  const bioText = normalizeParagraphText(bio);
  if (bioText) {
    if (format?.bioAlignment && format.bioAlignment !== "left")
      appendHtml(formattedTextSource("p", bioText, format.bioAlignment), "bio");
    else append(escapeParagraphText(bio));
  }

  const countryLocation = parseCountryLocation(location);
  const locationText = normalizeInlineText(countryLocation?.text ?? location);
  if (locationText) {
    const label = readmeLabels[document.contentLocale].location;
    if (format?.locationAlignment && format.locationAlignment !== "left") {
      const tree: Root = {
        type: "root",
        children: [
          {
            type: "element",
            tagName: "p",
            properties: { align: format.locationAlignment },
            children: [
              { type: "text", value: `${label}: ` },
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
            ],
          },
        ],
      };
      appendHtml(toHtml(tree), "location");
    } else {
      const text = escapeInlineText(countryLocation?.text ?? location);
      const content = countryLocation
        ? `${countryFlagMarkup(countryLocation.country)} ${text}`
        : text;
      append(`${label}: ${content}`);
    }
  }
  return { markdown: sections.join("\n\n"), htmlFragments };
}
