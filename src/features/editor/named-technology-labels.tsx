import { Children, isValidElement, type ReactNode } from "react";
import { technologyCatalog } from "@/core/technologies";

// Family assets can name several tools; match the longest complete label first.
const toolsByLabelLength = [...technologyCatalog].sort(
  (left, right) => right.name.length - left.name.length,
);

type ImageProps = {
  src?: unknown;
  alt?: unknown;
  node?: { tagName?: unknown };
};

/** Keep only a generated icon and its existing plain label together in the preview. */
export function wrapNamedTechnologyLabels(children: ReactNode): ReactNode {
  const nodes = Children.toArray(children);
  const wrapped: ReactNode[] = [];
  let changed = false;

  for (let index = 0; index < nodes.length; index += 1) {
    const image = nodes[index];
    const text = nodes[index + 1];
    if (
      !isValidElement<ImageProps>(image) ||
      (image.type !== "img" && image.props.node?.tagName !== "img") ||
      image.props.alt !== "" ||
      typeof image.props.src !== "string" ||
      typeof text !== "string" ||
      !text.startsWith("\u00a0")
    ) {
      wrapped.push(image);
      continue;
    }

    const labelText = text.slice(1);
    const tool = toolsByLabelLength.find((entry) => {
      if (entry.iconUrl !== image.props.src || !labelText.startsWith(entry.name)) return false;
      const suffix = labelText.slice(entry.name.length);
      return suffix === "" || /^\s+$/.test(suffix) || suffix.startsWith(" · ");
    });
    if (!tool) {
      wrapped.push(image);
      continue;
    }

    wrapped.push(
      <span key={image.key} className="inline-flex max-w-full items-center gap-1 align-middle">
        {image}
        <span className="min-w-0 [overflow-wrap:anywhere]">{tool.name}</span>
      </span>,
    );
    const suffix = labelText.slice(tool.name.length);
    if (suffix) wrapped.push(suffix);
    index += 1;
    changed = true;
  }

  return changed ? wrapped : children;
}
