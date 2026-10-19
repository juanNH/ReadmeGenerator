import type { ProfileModuleData } from "../profile/module-content";
import { escapeInlineText, escapeParagraphText } from "./escape-markdown";
import {
  joinBlocks,
  renderLabeledText,
  renderLink,
  renderList,
  renderSection,
} from "./render-helpers";
import type { ReadmeLabels } from "./readme-labels";
import type { ReadmeIssue } from "./readme-result";

export function renderProjects(
  data: ProfileModuleData["projects"],
  labels: ReadmeLabels,
  errors: ReadmeIssue[],
): string {
  const items = data.items.map((item, index) => {
    const name = escapeInlineText(item.name);
    const technologies = item.technologies.map(escapeInlineText).filter(Boolean).join(", ");
    const links = item.links.map((link, linkIndex) =>
      renderLink(
        link.label,
        link.url,
        ["data", "projects", "items", index, "links", linkIndex, "url"],
        errors,
      ),
    );
    return joinBlocks([
      name ? `**${name}**` : "",
      escapeParagraphText(item.description),
      renderLabeledText(labels.role, item.role),
      technologies ? `${labels.technologies}: ${technologies}` : "",
      links.filter(Boolean).join(" · "),
    ]);
  });
  return renderSection(labels.projects, renderList(items));
}
