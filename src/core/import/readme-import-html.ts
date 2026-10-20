import type { Element, Nodes as HastNode } from "hast";
import { fromHtml } from "hast-util-from-html";
import type { Html, Nodes, RootContent } from "mdast";
import {
  README_IMPORT_MAX_DEPTH,
  README_IMPORT_MAX_LENGTH,
  README_IMPORT_MAX_NODES,
} from "./readme-import-types";

export type HtmlImportHeading = {
  readonly offset: number;
  readonly end: number;
  readonly depth: number;
  readonly label: string;
};

type HeadingCandidate = HtmlImportHeading;
type HtmlChunk = {
  readonly node: Html;
  readonly start: number;
  readonly end: number;
  readonly candidates: ReadonlyMap<number, HeadingCandidate>;
};
type OpenElement = { readonly tag: string; readonly candidate?: HeadingCandidate };
type TagToken = {
  readonly tag: string;
  readonly closing: boolean;
  readonly selfClosing: boolean;
  readonly end: number;
};

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
const rawTextTags = new Set([
  "script",
  "style",
  "title",
  "textarea",
  "xmp",
  "iframe",
  "noembed",
  "noframes",
]);
const uncertainResult = { headings: [], rootNodeOffsets: [], uncertain: true } as const;

function offset(value: number | undefined): value is number {
  return value !== undefined && Number.isSafeInteger(value) && value >= 0;
}

function headingLabel(element: Element): string {
  const pending: HastNode[] = [...element.children].reverse();
  let result = "";
  while (pending.length) {
    const node = pending.pop()!;
    if (node.type === "text") result += node.value;
    if (node.type !== "element") continue;
    if (["script", "style", "template", "noscript"].includes(node.tagName)) continue;
    if (node.tagName === "br") result += " ";
    if (node.tagName === "img" && typeof node.properties.alt === "string") {
      result += node.properties.alt;
    }
    for (let index = node.children.length - 1; index >= 0; index -= 1) {
      pending.push(node.children[index]!);
    }
  }
  return result.replace(/\s+/g, " ").trim();
}

/** Only HAST root elements supply labels. Tokens later verify their original closing ranges. */
function headingCandidates(
  node: Html,
  start: number,
  budget: { count: number },
): ReadonlyMap<number, HeadingCandidate> | null {
  const tree = fromHtml(node.value, { fragment: true });
  const pending = [{ node: tree as HastNode, depth: 0 }];
  while (pending.length) {
    const entry = pending.pop()!;
    budget.count += 1;
    if (budget.count > README_IMPORT_MAX_NODES || entry.depth > README_IMPORT_MAX_DEPTH) {
      return null;
    }
    if (!("children" in entry.node)) continue;
    for (const child of entry.node.children) {
      pending.push({ node: child, depth: entry.depth + 1 });
    }
  }
  const candidates = new Map<number, HeadingCandidate>();
  for (const child of tree.children) {
    if (child.type !== "element" || !/^h[1-6]$/.test(child.tagName)) continue;
    const localStart = child.position?.start.offset;
    const localEnd = child.position?.end.offset;
    if (!offset(localStart) || !offset(localEnd) || localEnd > node.value.length) return null;
    candidates.set(start + localStart, {
      offset: start + localStart,
      end: start + localEnd,
      depth: Number(child.tagName[1]),
      label: headingLabel(child),
    });
  }
  return candidates;
}

/** The scanner consumes HTML leaves already identified by remark, never Markdown or code. */
function readTag(source: string, start: number): TagToken | null {
  let index = start + 1;
  const closing = source[index] === "/";
  if (closing) index += 1;
  const nameStart = index;
  if (!/[a-z]/i.test(source[index] ?? "")) return null;
  while (index < source.length && /[\w:-]/.test(source[index]!)) index += 1;
  const tag = source.slice(nameStart, index).toLowerCase();
  if (!/[\s/>]/.test(source[index] ?? "")) return null;
  const attributesStart = index;
  let quote: '"' | "'" | undefined;
  for (; index < source.length; index += 1) {
    const character = source[index]!;
    if (quote) {
      if (character === quote) quote = undefined;
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (character === "<") {
      return null;
    } else if (character === ">") {
      const attributes = source.slice(attributesStart, index).trim();
      if (closing && attributes !== "") return null;
      return { tag, closing, selfClosing: attributes.endsWith("/"), end: index + 1 };
    }
  }
  return null;
}

function commentEnd(source: string, start: number): number | null {
  if (source.startsWith("<!--", start)) {
    const end = source.indexOf("-->", start + 4);
    return end < 0 ? null : end + 3;
  }
  if (source.startsWith("<![CDATA[", start)) {
    const end = source.indexOf("]]>", start + 9);
    return end < 0 ? null : end + 3;
  }
  // Declarations and processing instructions are uncommon in profile fragments. Their
  // recovery rules differ by HTML context, so they keep the import opaque.
  return null;
}

function scanChunk(
  chunk: HtmlChunk,
  stack: OpenElement[],
  headings: HtmlImportHeading[],
  budget: { tokens: number },
): boolean {
  const source = chunk.node.value;
  let index = 0;
  while (index < source.length) {
    const next = source.indexOf("<", index);
    if (next < 0) break;
    index = next;
    const current = stack.at(-1)?.tag;
    if (current === "plaintext") break;
    if (current && rawTextTags.has(current)) {
      // Script has additional escaped and double-escaped tokenizer states. A comment or
      // nested script-like token needs that full context, so keep this input opaque.
      if (
        current === "script" &&
        (source.startsWith("<!--", index) || /^<script(?:[\s/>]|$)/i.test(source.slice(index)))
      ) {
        return false;
      }
      const prefix = source.slice(index + 2, index + 2 + current.length).toLowerCase();
      const boundary = source[index + 2 + current.length];
      if (source[index + 1] !== "/" || prefix !== current || !/[\s>]/.test(boundary ?? "")) {
        index += 1;
        continue;
      }
    } else if (source[index + 1] === "!" || source[index + 1] === "?") {
      const end = commentEnd(source, index);
      if (end === null) return false;
      index = end;
      continue;
    } else if (!/^\/?[a-z]/i.test(source.slice(index + 1, index + 3))) {
      index += 1;
      continue;
    }
    const token = readTag(source, index);
    if (!token || ++budget.tokens > README_IMPORT_MAX_NODES * 2) return false;
    if (voidTags.has(token.tag)) {
      if (token.closing) return false;
    } else if (token.closing) {
      const opening = stack.pop();
      if (!opening || opening.tag !== token.tag) return false;
      if (opening.candidate) {
        if (opening.candidate.end !== chunk.start + token.end) return false;
        headings.push(opening.candidate);
      }
    } else {
      // HTML ignores a self-closing slash on ordinary elements. Do not invent an XML tree.
      if (token.selfClosing) return false;
      const candidate = stack.length === 0 ? chunk.candidates.get(chunk.start + index) : undefined;
      stack.push({ tag: token.tag, candidate });
      if (stack.length > README_IMPORT_MAX_DEPTH) return false;
    }
    index = token.end;
  }
  return true;
}

/**
 * Finds conservative HTML boundaries without filtering or serializing the source. Container
 * context survives Markdown block boundaries and inline HTML. Any ambiguous structure keeps
 * the full input together instead of proposing cuts through repaired or partial containers.
 */
export function findHtmlImportHeadings(nodes: readonly RootContent[]): {
  readonly headings: readonly HtmlImportHeading[];
  readonly rootNodeOffsets: readonly number[];
  readonly uncertain: boolean;
} {
  const stack: OpenElement[] = [];
  const headings: HtmlImportHeading[] = [];
  const rootNodeOffsets: number[] = [];
  const treeBudget = { count: 0 };
  const tokenBudget = { tokens: 0 };
  let sourceLength = 0;
  let previousEnd = 0;
  let visitedNodes = 0;
  try {
    for (const rootNode of nodes) {
      const start = rootNode.position?.start.offset;
      const end = rootNode.position?.end.offset;
      if (!offset(start) || !offset(end) || end < start || start < previousEnd) {
        return uncertainResult;
      }
      previousEnd = end;
      if (stack.length === 0) rootNodeOffsets.push(start);
      const chunks: HtmlChunk[] = [];
      const pending = [{ node: rootNode as Nodes, depth: 0 }];
      while (pending.length) {
        const entry = pending.pop()!;
        visitedNodes += 1;
        if (visitedNodes > README_IMPORT_MAX_NODES || entry.depth > README_IMPORT_MAX_DEPTH) {
          return uncertainResult;
        }
        if (entry.node.type === "html") {
          const htmlStart = entry.node.position?.start.offset;
          const htmlEnd = entry.node.position?.end.offset;
          if (
            !offset(htmlStart) ||
            !offset(htmlEnd) ||
            htmlStart < start ||
            htmlEnd > end ||
            htmlEnd - htmlStart !== entry.node.value.length
          )
            return uncertainResult;
          sourceLength += entry.node.value.length;
          if (sourceLength > README_IMPORT_MAX_LENGTH) return uncertainResult;
          const candidates =
            entry.node === rootNode
              ? headingCandidates(entry.node, htmlStart, treeBudget)
              : new Map<number, HeadingCandidate>();
          if (!candidates) return uncertainResult;
          chunks.push({ node: entry.node, start: htmlStart, end: htmlEnd, candidates });
        }
        if (!("children" in entry.node)) continue;
        for (const child of entry.node.children) {
          pending.push({ node: child, depth: entry.depth + 1 });
        }
      }
      chunks.sort((left, right) => left.start - right.start);
      let previousChunkEnd = start;
      for (const chunk of chunks) {
        if (chunk.start < previousChunkEnd || !scanChunk(chunk, stack, headings, tokenBudget)) {
          return uncertainResult;
        }
        previousChunkEnd = chunk.end;
      }
    }
  } catch {
    return uncertainResult;
  }
  if (stack.length > 0) return uncertainResult;
  return {
    headings: headings.sort((left, right) => left.offset - right.offset),
    rootNodeOffsets,
    uncertain: false,
  };
}
