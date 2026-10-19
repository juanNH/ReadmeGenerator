import type { ProfileModuleData } from "../profile/module-content";
import { findTechnology } from "../technologies";
import { escapeInlineText } from "./escape-markdown";
import { joinBlocks, renderList, renderSection, renderTitledDescription } from "./render-helpers";
import type { ReadmeLabels } from "./readme-labels";
import { namedTechnologyIconMarkup } from "./technology-icons";

export function renderTechnologies(
  data: ProfileModuleData["technologies"],
  labels: ReadmeLabels,
): string {
  const groups = data.groups.map((group) => {
    const blocks: string[] = [];
    let icons: string[] = [];
    function flushIcons() {
      if (icons.length > 0) blocks.push(icons.join(" · "));
      icons = [];
    }
    for (const item of group.items) {
      const technology = findTechnology(item.name);
      if (!item.context.trim() && item.name.trim()) {
        const name = escapeInlineText(technology?.name ?? item.name);
        icons.push(technology ? `${namedTechnologyIconMarkup(technology)}&nbsp;${name}` : name);
      } else {
        flushIcons();
        const text = renderTitledDescription(item.name, item.context);
        if (text)
          blocks.push(
            renderList([technology ? `${namedTechnologyIconMarkup(technology)} ${text}` : text]),
          );
      }
    }
    flushIcons();
    const items = joinBlocks(blocks);
    if (!items) return "";
    const name = escapeInlineText(group.name);
    return name ? `### ${name}\n\n${items}` : items;
  });
  return renderSection(labels.technologies, joinBlocks(groups));
}
