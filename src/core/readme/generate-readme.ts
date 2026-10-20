import type { ProfileDocument } from "../profile/profile-schema";
import { parseCountryLocation } from "../location";
import { countryFlagMarkup } from "./country-flags";
import { escapeInlineText, escapeParagraphText } from "./escape-markdown";
import { readmeLabels } from "./readme-labels";
import type {
  CustomHtmlFragment,
  CustomImageSource,
  ReadmeIssue,
  ReadmeResult,
} from "./readme-result";
import { PROFILE_HTML_MAX_DOCUMENT_LENGTH } from "./profile-html";
import { renderActivity } from "./render-activity";
import { renderContact } from "./render-contact";
import { renderCustomSectionWithListIndex } from "./render-custom";
import { renderProjects } from "./render-projects";
import { renderTechnologies } from "./render-technologies";

function renderPresentation(document: ProfileDocument): string {
  const { displayName, headline, bio, location } = document.data.presentation;
  const nameText = escapeInlineText(displayName);
  const headlineText = escapeInlineText(headline);
  const bioText = escapeParagraphText(bio);
  const countryLocation = parseCountryLocation(location);
  const locationText = escapeInlineText(countryLocation?.text ?? location);
  const locationContent = countryLocation
    ? `${countryFlagMarkup(countryLocation.country)} ${locationText}`
    : locationText;
  return [
    nameText && `# ${nameText}`,
    headlineText && `## ${headlineText}`,
    bioText,
    locationText && `${readmeLabels[document.contentLocale].location}: ${locationContent}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

/**
 * document must be structurally valid (from the factory, parser or domain operations).
 * Hidden data is preserved in the document and has no effect on export validation.
 * Retired sections keep their stored data but never participate in output or validation.
 */
export function generateReadme(
  document: ProfileDocument,
  options: { readonly activityCardBaseUrl?: string } = {},
): ReadmeResult {
  const sections: string[] = [];
  const errors: ReadmeIssue[] = [];
  const exportIssues: ReadmeIssue[] = [];
  const customImages: CustomImageSource[] = [];
  const customHtml: CustomHtmlFragment[] = [];
  const labels = readmeLabels[document.contentLocale];
  let customListIndex = 0;
  let cursor = 0;
  let htmlSourceLength = 0;
  for (const [sectionIndex, section] of document.customSections.entries()) {
    if (!section.visible) continue;
    for (const [blockIndex, block] of section.blocks.entries()) {
      if (block.type !== "html") continue;
      htmlSourceLength += block.source.length;
      if (htmlSourceLength > PROFILE_HTML_MAX_DOCUMENT_LENGTH) {
        return {
          success: false,
          errors: [
            {
              code: "invalid_html",
              path: ["customSections", sectionIndex, "blocks", blockIndex, "source"],
            },
          ],
        };
      }
    }
  }

  function append(markdown: string, htmlFragments: readonly CustomHtmlFragment[] = []) {
    if (!markdown) return;
    if (sections.length > 0) cursor += 2;
    for (const fragment of htmlFragments) {
      customHtml.push({ ...fragment, start: cursor + fragment.start, end: cursor + fragment.end });
    }
    sections.push(markdown);
    cursor += markdown.length;
  }

  for (const reference of document.sectionOrder) {
    if (reference.kind === "custom") {
      const index = document.customSections.findIndex(
        (section) => section.id === reference.sectionId,
      );
      const section = document.customSections[index];
      if (section?.visible) {
        const rendered = renderCustomSectionWithListIndex(
          section,
          index,
          errors,
          customListIndex,
          customImages,
        );
        customListIndex = rendered.nextListIndex;
        append(rendered.markdown, rendered.htmlFragments);
      }
      continue;
    }
    const moduleId = reference.moduleId;
    if (moduleId === "metrics") continue;
    if (moduleId === "contributions") {
      if (!document.visibility.contributions && !document.visibility.metrics) continue;
    } else if (!document.visibility[moduleId]) continue;

    let content: string;
    switch (moduleId) {
      case "presentation":
        content = renderPresentation(document);
        break;
      case "knowledge":
      case "education":
      case "current":
        continue;
      case "technologies":
        content = renderTechnologies(document.data.technologies, labels);
        break;
      case "projects":
        content = renderProjects(document.data.projects, labels, errors);
        break;
      case "contributions":
        content = renderActivity(
          document,
          labels,
          errors,
          exportIssues,
          options.activityCardBaseUrl,
        );
        break;
      case "contact":
        content = renderContact(document.data.contact, labels, errors);
        break;
    }
    append(content);
  }

  if (errors.length > 0) return { success: false, errors };
  if (sections.length === 0) {
    return { success: false, errors: [{ code: "empty_profile", path: [] }] };
  }
  return {
    success: true,
    markdown: `${sections.join("\n\n")}\n`,
    ...(exportIssues.length > 0 ? { exportIssues } : {}),
    ...(customImages.length > 0 ? { customImages } : {}),
    ...(customHtml.length > 0 ? { customHtml } : {}),
  };
}
