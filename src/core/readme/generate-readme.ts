import type { ProfileDocument } from "../profile/profile-schema";
import { parseCountryLocation } from "../location";
import { countryFlagMarkup } from "./country-flags";
import { escapeInlineText, escapeParagraphText } from "./escape-markdown";
import { readmeLabels } from "./readme-labels";
import type { ReadmeIssue, ReadmeResult } from "./readme-result";
import { renderActivity } from "./render-activity";
import { renderContact } from "./render-contact";
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
 * Retired sections keep their v1 data but never participate in output or validation.
 */
export function generateReadme(
  document: ProfileDocument,
  options: { readonly activityCardBaseUrl?: string } = {},
): ReadmeResult {
  const sections: string[] = [];
  const errors: ReadmeIssue[] = [];
  const exportIssues: ReadmeIssue[] = [];
  const labels = readmeLabels[document.contentLocale];

  for (const moduleId of document.moduleOrder) {
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
    if (content) sections.push(content);
  }

  if (errors.length > 0) return { success: false, errors };
  if (sections.length === 0) {
    return { success: false, errors: [{ code: "empty_profile", path: [] }] };
  }
  return {
    success: true,
    markdown: `${sections.join("\n\n")}\n`,
    ...(exportIssues.length > 0 ? { exportIssues } : {}),
  };
}
