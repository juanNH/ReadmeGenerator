import { findContactProvider } from "../contact";
import type { ProfileModuleData } from "../profile/module-content";
import { contactIconMarkup } from "./contact-icons";
import { normalizeContactUrl } from "./contact-url";
import { escapeInlineText } from "./escape-markdown";
import type { ReadmeLabels } from "./readme-labels";
import type { ReadmeIssue } from "./readme-result";
import { renderSection } from "./render-helpers";
import { escapeLinkDestination } from "./web-url";

export function renderContact(
  data: ProfileModuleData["contact"],
  labels: ReadmeLabels,
  errors: ReadmeIssue[],
): string {
  const links: string[] = [];
  for (const [index, link] of data.links.entries()) {
    if (!link.label.trim() && !link.url.trim()) continue;
    const normalizedUrl = normalizeContactUrl(link.url);
    if (!normalizedUrl) {
      errors.push({ code: "invalid_url", path: ["data", "contact", "links", index, "url"] });
      continue;
    }
    const provider = findContactProvider(normalizedUrl);
    const label = escapeInlineText(link.label) || provider?.name || escapeInlineText(link.url);
    const icon = provider ? `${contactIconMarkup(provider)} ` : "";
    links.push(`- [${icon}${label}](${escapeLinkDestination(normalizedUrl)})`);
  }
  return renderSection(labels.contact, links.join("\n"));
}
