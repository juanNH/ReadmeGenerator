import type { ProfileDocument } from "../profile/profile-schema";
import { escapeLinkDestination, normalizeContactUrl } from "./contact-url";
import { escapeInlineText, escapeParagraphText } from "./escape-markdown";
import type { ReadmeIssue, ReadmeResult } from "./readme-result";

const labels = {
  en: { location: "Location", contact: "Contact" },
  es: { location: "Ubicación", contact: "Contacto" },
} as const;

function renderPresentation(document: ProfileDocument): string {
  const { displayName, headline, bio, location } = document.data.presentation;
  const nameText = escapeInlineText(displayName);
  const headlineText = escapeInlineText(headline);
  const bioText = escapeParagraphText(bio);
  const locationText = escapeInlineText(location);
  return [
    nameText && `# ${nameText}`,
    headlineText && `## ${headlineText}`,
    bioText,
    locationText && `${labels[document.contentLocale].location}: ${locationText}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function renderContact(document: ProfileDocument, errors: ReadmeIssue[]): string {
  const links: string[] = [];
  for (const [index, link] of document.data.contact.links.entries()) {
    if (!link.label.trim() && !link.url.trim()) continue;
    const url = normalizeContactUrl(link.url);
    if (url === null) {
      errors.push({ code: "invalid_url", path: ["data", "contact", "links", index, "url"] });
      continue;
    }
    const label = escapeInlineText(link.label) || escapeInlineText(link.url);
    links.push(`- [${label}](${escapeLinkDestination(url)})`);
  }
  return links.length > 0
    ? `## ${labels[document.contentLocale].contact}\n\n${links.join("\n")}`
    : "";
}

/**
 * document must be structurally valid (from the factory, parser or domain operations).
 * Hidden data is preserved in the document and has no effect on export validation.
 */
export function generateReadme(document: ProfileDocument): ReadmeResult {
  const sections: string[] = [];
  const errors: ReadmeIssue[] = [];

  for (const moduleId of document.moduleOrder) {
    if (!document.visibility[moduleId]) continue;

    if (moduleId !== "presentation" && moduleId !== "contact") {
      errors.push({ code: "unsupported_module", path: ["visibility", moduleId] });
      continue;
    }

    const content =
      moduleId === "presentation" ? renderPresentation(document) : renderContact(document, errors);
    if (content) sections.push(content);
  }

  if (errors.length > 0) return { success: false, errors };
  if (sections.length === 0) {
    return { success: false, errors: [{ code: "empty_profile", path: [] }] };
  }
  return { success: true, markdown: `${sections.join("\n\n")}\n` };
}
