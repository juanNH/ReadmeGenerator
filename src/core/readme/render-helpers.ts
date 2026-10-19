import { escapeInlineText, escapeParagraphText } from "./escape-markdown";
import type { ReadmeIssue } from "./readme-result";
import { escapeLinkDestination, normalizeWebUrl } from "./web-url";

export function joinBlocks(blocks: readonly string[]): string {
  return blocks.filter(Boolean).join("\n\n");
}

export function renderSection(title: string, content: string): string {
  return content ? `## ${title}\n\n${content}` : "";
}

export function renderList(items: readonly string[]): string {
  return items
    .filter(Boolean)
    .map((item) => `- ${item.replace(/\n/g, "\n  ")}`)
    .join("\n\n");
}

export function renderTitledDescription(title: string, description: string): string {
  const titleText = escapeInlineText(title);
  const descriptionText = escapeParagraphText(description);
  if (!titleText) return descriptionText;
  return descriptionText ? `**${titleText}**: ${descriptionText}` : `**${titleText}**`;
}

export function renderLabeledText(label: string, value: string): string {
  const text = escapeInlineText(value);
  return text ? `${label}: ${text}` : "";
}

/** Empty link rows are omitted; a label alone still requires a valid URL. */
export function renderLink(
  label: string,
  url: string,
  path: ReadmeIssue["path"],
  errors: ReadmeIssue[],
  normalize: (value: string) => string | null = normalizeWebUrl,
): string {
  if (!label.trim() && !url.trim()) return "";
  const normalizedUrl = normalize(url);
  if (normalizedUrl === null) {
    errors.push({ code: "invalid_url", path });
    return "";
  }
  const labelText = escapeInlineText(label) || escapeInlineText(url);
  return `[${labelText}](${escapeLinkDestination(normalizedUrl)})`;
}

export function renderOptionalWebLink(
  url: string,
  label: string,
  path: ReadmeIssue["path"],
  errors: ReadmeIssue[],
): string {
  return url.trim() ? renderLink(label, url, path, errors) : "";
}
