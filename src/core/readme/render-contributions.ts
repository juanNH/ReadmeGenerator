import type { ProfileModuleData } from "../profile/module-content";
import {
  joinBlocks,
  renderList,
  renderOptionalWebLink,
  renderSection,
  renderTitledDescription,
} from "./render-helpers";
import type { ReadmeLabels } from "./readme-labels";
import type { ReadmeIssue } from "./readme-result";

export function renderContributions(
  data: ProfileModuleData["contributions"],
  labels: ReadmeLabels,
  errors: ReadmeIssue[],
): string {
  return renderSection(labels.contributions, renderContributionItems(data, labels, errors));
}

export function renderContributionItems(
  data: ProfileModuleData["contributions"],
  labels: ReadmeLabels,
  errors: ReadmeIssue[],
): string {
  const items = data.items.map((item, index) =>
    joinBlocks([
      renderTitledDescription(item.title, item.description),
      renderOptionalWebLink(
        item.url,
        labels.moreInformation,
        ["data", "contributions", "items", index, "url"],
        errors,
      ),
    ]),
  );
  return renderList(items);
}
