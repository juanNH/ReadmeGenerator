import type { Definition, Nodes, Root, RootContent } from "mdast";
import { toHast } from "mdast-util-to-hast";
import { toHtml } from "hast-util-to-html";
import { README_IMPORT_MAX_DEPTH, README_IMPORT_MAX_NODES } from "./readme-import-types";
import { findHtmlImportHeadings } from "./readme-import-html";

export function childrenOf(node: Nodes): readonly Nodes[] {
  return "children" in node ? node.children : [];
}

/** Traversal is bounded before any recursive conversion or serialization is attempted. */
export function isManageableTree(root: Root): boolean {
  const pending = [{ node: root as Nodes, depth: 0 }];
  let count = 0;
  while (pending.length) {
    const entry = pending.pop()!;
    count += 1;
    if (count > README_IMPORT_MAX_NODES || entry.depth > README_IMPORT_MAX_DEPTH) return false;
    for (const child of childrenOf(entry.node)) {
      pending.push({ node: child, depth: entry.depth + 1 });
    }
  }
  return true;
}

export function walkNodes(nodes: readonly Nodes[], visit: (node: Nodes) => void): void {
  const pending = [...nodes].reverse();
  while (pending.length) {
    const node = pending.pop()!;
    visit(node);
    const children = childrenOf(node);
    for (let index = children.length - 1; index >= 0; index -= 1) pending.push(children[index]!);
  }
}

export function plainText(node: Nodes): string | null {
  if (node.type === "text") return node.value;
  if (!("children" in node)) return null;
  // Only immediate text children are plain. Descending through emphasis, links or code would
  // silently flatten precisely the formatting this importer must keep as explicit HTML.
  return node.children.every((child) => child.type === "text")
    ? node.children.map((child) => (child.type === "text" ? child.value : "")).join("")
    : null;
}

export function nodeLabel(node: Nodes): string {
  let label = "";
  walkNodes([node], (child) => {
    if (child.type === "text" || child.type === "inlineCode") label += child.value;
    if (child.type === "image" || child.type === "imageReference") label += child.alt ?? "";
  });
  return label.replace(/\s+/g, " ").trim();
}

export function referenceKey(identifier: string): string {
  return identifier.toUpperCase();
}

export function collectDefinitions(root: Root): Map<string, Definition> {
  const definitions = new Map<string, Definition>();
  walkNodes([root], (node) => {
    if (node.type !== "definition") return;
    const key = referenceKey(node.identifier);
    if (!definitions.has(key)) definitions.set(key, node);
  });
  return definitions;
}

/** Definitions precede fragments so the first definition in the full document always wins. */
export function nodesToHtml(
  nodes: readonly RootContent[],
  definitions: readonly Definition[],
): string {
  const tree = toHast(
    { type: "root", children: [...definitions, ...nodes] },
    { allowDangerousHtml: true },
  );
  // Raw HTML is only serialized to an inert string. The caller immediately applies profile policy.
  return tree ? toHtml(tree, { allowDangerousHtml: true }) : "";
}

const voidTags = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

/**
 * This scans only raw HTML tokens already identified by the Markdown parser. It does not parse
 * Markdown. An uncertain container keeps the whole document together rather than splitting it.
 */
export function hasCrossNodeHtmlContext(nodes: readonly RootContent[]): boolean {
  const stack: string[] = [];
  let crossesBoundary = false;
  for (const node of nodes) {
    walkNodes([node], (child) => {
      if (child.type !== "html") return;
      const tokens = child.value.matchAll(
        /<!--[\s\S]*?(?:-->|$)|<![^>]*>|<\/?([a-z][\w:-]*)\b(?:[^"'<>]|"[^"]*"|'[^']*')*>/gi,
      );
      for (const token of tokens) {
        if (!token[1]) continue;
        const tag = token[1].toLowerCase();
        if (voidTags.has(tag)) continue;
        if (token[0].startsWith("</")) {
          const index = stack.lastIndexOf(tag);
          if (index === -1) crossesBoundary = true;
          else stack.splice(index);
        } else stack.push(tag);
      }
    });
    if (stack.length > 0) crossesBoundary = true;
  }
  return crossesBoundary;
}

export type ImportSegment = {
  readonly nodes: readonly RootContent[];
  readonly start: number;
  readonly end: number;
  readonly label?: string;
};

function splitMarkdownSegments(root: Root, source: string, keepTogether: boolean): ImportSegment[] {
  if (keepTogether) return [{ nodes: root.children, start: 0, end: source.length }];
  const segments: ImportSegment[] = [];
  let nodes: RootContent[] = [];
  let start = 0;
  let hasContent = false;
  for (const node of root.children) {
    if (node.type === "heading" && node.depth <= 2 && hasContent) {
      const end = node.position?.start.offset ?? start;
      segments.push({ nodes, start, end });
      nodes = [];
      start = end;
      hasContent = false;
    }
    nodes.push(node);
    if (node.type !== "definition") hasContent = true;
  }
  if (nodes.length > 0) segments.push({ nodes, start, end: source.length });
  return segments;
}

function sourcePoint(lineStarts: readonly number[], offset: number) {
  let low = 0;
  let high = lineStarts.length;
  while (low + 1 < high) {
    const middle = Math.floor((low + high) / 2);
    if (lineStarts[middle]! <= offset) low = middle;
    else high = middle;
  }
  return {
    line: low + 1,
    column: offset - lineStarts[low]! + 1,
    offset,
  };
}

/** Only raw HTML is split internally; Markdown nodes remain complete AST units. */
function sliceSegmentNodes(
  nodes: readonly RootContent[],
  start: number,
  end: number,
  source: string,
  lineStarts: readonly number[],
): RootContent[] | null {
  const result: RootContent[] = [];
  for (const node of nodes) {
    const nodeStart = node.position?.start.offset;
    const nodeEnd = node.position?.end.offset;
    if (nodeStart === undefined || nodeEnd === undefined) return null;
    if (nodeStart >= end || nodeEnd <= start) continue;
    if (nodeStart >= start && nodeEnd <= end) {
      result.push(node);
      continue;
    }
    if (node.type !== "html") return null;
    const from = Math.max(start, nodeStart);
    const to = Math.min(end, nodeEnd);
    result.push({
      type: "html",
      value: source.slice(from, to),
      position: { start: sourcePoint(lineStarts, from), end: sourcePoint(lineStarts, to) },
    });
  }
  return result;
}

function hasSourceBody(source: string, start: number, end: number): boolean {
  return (
    source
      .slice(start, end)
      .replace(/<!--[\s\S]*?-->/g, "")
      .trim().length > 0
  );
}

/** HTML headings use their authored hierarchy, with consecutive opening headings kept together. */
export function splitSegments(root: Root, source: string, keepTogether: boolean): ImportSegment[] {
  const detected = findHtmlImportHeadings(root.children);
  if (detected.uncertain) return [{ nodes: root.children, start: 0, end: source.length }];
  if (detected.headings.length === 0) return splitMarkdownSegments(root, source, keepTogether);

  const rootOffsets = new Set(detected.rootNodeOffsets);
  const headings = [
    ...detected.headings,
    ...root.children.flatMap((node) => {
      const offset = node.position?.start.offset;
      const end = node.position?.end.offset;
      return node.type === "heading" &&
        offset !== undefined &&
        end !== undefined &&
        rootOffsets.has(offset)
        ? [{ offset, end, depth: node.depth, label: nodeLabel(node) }]
        : [];
    }),
  ].sort((left, right) => left.offset - right.offset);
  let openingEnd = 0;
  let openingBody = false;
  let openingH1 = false;
  const sectionHeadings = headings.filter((heading) => {
    openingBody ||= hasSourceBody(source, openingEnd, heading.offset);
    openingEnd = heading.end;
    const tagline = !openingBody && openingH1 && heading.depth === 2;
    if (!openingBody && heading.depth === 1) openingH1 = true;
    return !tagline;
  });
  // An H2 paired with an opening H1 can be a tagline; a standalone H2 still defines hierarchy.
  const sectionDepth = sectionHeadings.some((heading) => heading.depth === 2) ? 2 : 3;
  const boundaries: Array<{ start: number; label?: string }> = [{ start: 0 }];
  let previousEnd = 0;
  let hasBody = false;
  for (const heading of headings) {
    // Comments between two opening headings do not turn a tagline into a new section.
    hasBody ||= hasSourceBody(source, previousEnd, heading.offset);
    if (heading.depth <= sectionDepth && hasBody && heading.offset > boundaries.at(-1)!.start) {
      boundaries.push({ start: heading.offset, label: heading.label });
      hasBody = false;
    } else if (!boundaries.at(-1)!.label && !hasBody) {
      boundaries.at(-1)!.label = heading.label;
    }
    previousEnd = heading.end;
  }

  const segments: ImportSegment[] = [];
  const lineStarts = [0, ...source.matchAll(/\r\n|\r|\n/g)].map((entry) =>
    typeof entry === "number" ? entry : entry.index + entry[0].length,
  );
  for (let index = 0; index < boundaries.length; index += 1) {
    const boundary = boundaries[index]!;
    const end = boundaries[index + 1]?.start ?? source.length;
    const nodes = sliceSegmentNodes(root.children, boundary.start, end, source, lineStarts);
    if (nodes === null) return [{ nodes: root.children, start: 0, end: source.length }];
    segments.push({ ...boundary, end, nodes });
  }
  return segments;
}
