import type { CustomHtmlFragment } from "@/core/readme";

type Position = { start: { offset?: number }; end: { offset?: number } };
type MarkdownNode = {
  type: string;
  position?: Position;
  children?: MarkdownNode[];
  data?: Record<string, unknown>;
};

function isRoot(value: unknown): value is MarkdownNode & { children: MarkdownNode[] } {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    value.type === "root" &&
    "children" in value &&
    Array.isArray(value.children)
  );
}

/** Only complete, exact generated ranges become controlled HTML preview slots. */
export function remarkCustomHtml(options: { fragments?: readonly CustomHtmlFragment[] } = {}) {
  return (tree: unknown, file: { value?: unknown }) => {
    if (!isRoot(tree) || typeof file.value !== "string") return;
    const source = file.value;
    const replacements = new Map<number, { last: number; fragmentIndex: number }>();
    let previousEnd = 0;

    for (const [fragmentIndex, fragment] of (options.fragments ?? []).entries()) {
      const { start, end, html } = fragment;
      if (
        !Number.isSafeInteger(start) ||
        !Number.isSafeInteger(end) ||
        start < previousEnd ||
        start < 0 ||
        end <= start ||
        end > source.length ||
        source.slice(start, end) !== html ||
        !html.startsWith("<div>") ||
        !html.endsWith("</div>")
      )
        continue;

      const first = tree.children.findIndex((node) => node.position?.start.offset === start);
      const last = tree.children.findIndex((node) => node.position?.end.offset === end);
      if (
        first < 0 ||
        last < first ||
        tree.children[first]?.type !== "html" ||
        tree.children.slice(first, last + 1).some((node) => {
          const nodeStart = node.position?.start.offset;
          const nodeEnd = node.position?.end.offset;
          return (
            nodeStart === undefined || nodeEnd === undefined || nodeStart < start || nodeEnd > end
          );
        })
      )
        continue;

      replacements.set(first, { last, fragmentIndex });
      previousEnd = end;
    }

    const children: MarkdownNode[] = [];
    for (let index = 0; index < tree.children.length; index += 1) {
      const replacement = replacements.get(index);
      const child = tree.children[index];
      if (!child) continue;
      if (!replacement) {
        children.push(child);
        continue;
      }
      const last = tree.children[replacement.last];
      children.push({
        type: "profileHtml",
        position:
          child.position && last?.position
            ? { start: child.position.start, end: last.position.end }
            : undefined,
        data: {
          hName: "div",
          hProperties: { dataProfileHtmlIndex: String(replacement.fragmentIndex) },
        },
      });
      index = replacement.last;
    }
    tree.children = children;
  };
}
