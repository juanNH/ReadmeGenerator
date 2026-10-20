import type { ElementContent, Properties, Root, RootContent } from "hast";
import { fromHtml } from "hast-util-from-html";
import { sanitize, type Schema } from "hast-util-sanitize";
import { toHtml } from "hast-util-to-html";
import { normalizeInlineText } from "./escape-markdown";
import { normalizePublicImageUrl } from "./public-image";
import { normalizeWebUrl } from "./web-url";

export const PROFILE_HTML_MAX_LENGTH = 30_000;
export const PROFILE_HTML_MAX_NODES = 1500;
export const PROFILE_HTML_MAX_DEPTH = 32;
export const PROFILE_HTML_MAX_DOCUMENT_LENGTH = 150_000;

export const htmlNoticeCodes = [
  "unsupported_elements",
  "unsupported_attributes",
  "comments_removed",
  "repaired_html",
] as const;
export const htmlProblemCodes = [
  "too_large",
  "too_complex",
  "invalid_url",
  "missing_image_alt",
  "invalid_structure",
  "empty_html",
] as const;
export type HtmlNotice = { readonly code: (typeof htmlNoticeCodes)[number] };
export type HtmlProblem = { readonly code: (typeof htmlProblemCodes)[number] };
export type ProfileHtmlAnalysis = {
  readonly html: string;
  readonly tree: Root;
  readonly notices: HtmlNotice[];
  readonly errors: HtmlProblem[];
};

const allowedTags = [
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "div",
  "span",
  "a",
  "img",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
  "caption",
  "details",
  "summary",
  "pre",
  "code",
  "ul",
  "ol",
  "li",
  "blockquote",
  "strong",
  "b",
  "em",
  "i",
  "del",
  "s",
  "kbd",
  "sub",
  "sup",
  "br",
  "hr",
] as const;
const tagNames = new Set<string>(allowedTags);
const strippedTags = new Set([
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "svg",
  "math",
  "template",
  "form",
  "input",
  "button",
  "select",
  "option",
  "optgroup",
  "textarea",
  "noscript",
  "noembed",
  "noframes",
  "frame",
  "frameset",
  "head",
  "link",
  "meta",
  "base",
  "audio",
  "video",
  "source",
  "track",
  "canvas",
  "portal",
  "xmp",
  "plaintext",
  "title",
]);
const alignedTags = new Set([
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "div",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
  "caption",
]);
const elementAttributes: Record<string, readonly string[]> = {
  a: ["href", "ariaLabel"],
  img: ["src", "alt", "width", "height", "loading", "decoding", "referrerPolicy"],
  th: ["colSpan", "rowSpan", "scope"],
  td: ["colSpan", "rowSpan", "scope"],
  ol: ["start"],
  details: ["open"],
};

// All schema fields are explicit: the default sanitizer also allows relative URLs and extra attrs.
const htmlSchema: Schema = {
  allowComments: false,
  allowDoctypes: false,
  ancestors: {
    caption: ["table"],
    thead: ["table"],
    tbody: ["table"],
    tfoot: ["table"],
    tr: ["table"],
    th: ["tr"],
    td: ["tr"],
    li: ["ul", "ol"],
    summary: ["details"],
  },
  attributes: {
    "*": ["title"],
    ...Object.fromEntries(
      [...alignedTags].map((tag) => [tag, [["align", "left", "center", "right"]]]),
    ),
    a: ["href", "ariaLabel"],
    img: [
      "src",
      "alt",
      "width",
      "height",
      ["loading", "lazy"],
      ["decoding", "async"],
      ["referrerPolicy", "no-referrer"],
    ],
    th: [
      ["align", "left", "center", "right"],
      "colSpan",
      "rowSpan",
      ["scope", "row", "col", "rowgroup", "colgroup"],
    ],
    td: [
      ["align", "left", "center", "right"],
      "colSpan",
      "rowSpan",
      ["scope", "row", "col", "rowgroup", "colgroup"],
    ],
    ol: ["start"],
    details: ["open"],
  },
  clobber: ["id", "name"],
  clobberPrefix: "user-content-",
  protocols: { href: ["http", "https"], src: ["https"] },
  required: {},
  strip: [...strippedTags],
  tagNames: [...allowedTags],
};

function emptyTree(): Root {
  return { type: "root", children: [] };
}

/** Inspect iteratively before any application recursion, including template contents. */
function isTooComplex(root: Root): boolean {
  const pending: { node: Root | RootContent; depth: number }[] = [{ node: root, depth: 0 }];
  let count = 0;
  while (pending.length > 0) {
    const entry = pending.pop()!;
    if (++count > PROFILE_HTML_MAX_NODES || entry.depth > PROFILE_HTML_MAX_DEPTH) return true;
    if ("children" in entry.node) {
      for (const child of entry.node.children)
        pending.push({ node: child, depth: entry.depth + 1 });
    }
    if (entry.node.type === "element" && entry.node.content) {
      pending.push({ node: entry.node.content, depth: entry.depth + 1 });
    }
  }
  return false;
}

function boundedInteger(value: unknown, minimum: number, maximum: number): number | null {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && /^-?\d+$/.test(value)
        ? Number(value)
        : NaN;
  return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null;
}

function dimension(value: unknown, percentage: boolean): number | string | null {
  if (percentage && typeof value === "string" && /^\d+%$/.test(value)) {
    const parsed = boundedInteger(value.slice(0, -1), 1, 100);
    return parsed === null ? null : `${parsed}%`;
  }
  return boundedInteger(value, 1, 2000);
}

function readableName(children: readonly ElementContent[]): boolean {
  return children.some((child) =>
    child.type === "text"
      ? Boolean(normalizeInlineText(child.value))
      : child.type === "element" &&
        (child.tagName === "img"
          ? typeof child.properties.alt === "string" &&
            Boolean(normalizeInlineText(child.properties.alt))
          : readableName(child.children)),
  );
}

function containsInteractive(children: readonly ElementContent[], withinSummary: boolean): boolean {
  return children.some(
    (child) =>
      child.type === "element" &&
      (child.tagName === "details" ||
        child.tagName === "summary" ||
        (withinSummary && child.tagName === "a" && Object.hasOwn(child.properties, "href")) ||
        containsInteractive(child.children, withinSummary)),
  );
}

function hasContent(root: Root): boolean {
  const pending: (Root | RootContent)[] = [root];
  while (pending.length > 0) {
    const node = pending.pop()!;
    if (node.type === "text" && node.value.trim()) return true;
    if (node.type === "element" && (node.tagName === "img" || node.tagName === "hr")) return true;
    if ("children" in node) pending.push(...node.children);
  }
  return false;
}

function serializeHtml(tree: Root): string {
  const serializable = structuredClone(tree);
  const pending: (Root | RootContent)[] = [serializable];
  while (pending.length > 0) {
    const node = pending.pop()!;
    if (node.type === "element" && node.tagName === "pre") {
      const first = node.children[0];
      // HTML parsers discard one initial PRE line feed, including character references.
      if (first?.type === "text" && first.value.startsWith("\n")) {
        first.value = `\n${first.value}`;
      }
    }
    if ("children" in node) pending.push(...node.children);
  }
  // Keep semantic HTML line breaks, but never let CommonMark resume inside our HTML wrapper.
  return toHtml(serializable).replace(/\r/g, "&#13;").replace(/\n/g, "&#10;");
}

/** Analyze only; authored source stays untouched and no browser or network API is used. */
export function analyzeProfileHtml(source: string): ProfileHtmlAnalysis {
  const notices: HtmlNotice[] = [];
  const errors: HtmlProblem[] = [];
  const notice = (code: HtmlNotice["code"]) => {
    if (!notices.some((entry) => entry.code === code)) notices.push({ code });
  };
  const problem = (code: HtmlProblem["code"]) => {
    if (!errors.some((entry) => entry.code === code)) errors.push({ code });
  };
  const rejected = (): ProfileHtmlAnalysis => ({ html: "", tree: emptyTree(), notices, errors });
  if (source.length > PROFILE_HTML_MAX_LENGTH) {
    problem("too_large");
    return rejected();
  }
  if (!source.trim()) return rejected();
  let parsed: Root;
  try {
    parsed = fromHtml(source, { fragment: true, onerror: () => notice("repaired_html") });
  } catch (error) {
    problem(error instanceof RangeError ? "too_complex" : "invalid_structure");
    return rejected();
  }
  if (isTooComplex(parsed)) {
    problem("too_complex");
    return rejected();
  }

  function clean(node: RootContent, parent: string | null): ElementContent[] {
    if (node.type === "comment") {
      notice("comments_removed");
      return [];
    }
    if (node.type === "doctype") {
      notice("unsupported_elements");
      return [];
    }
    if (node.type === "text") return [{ type: "text", value: node.value }];
    if (node.type !== "element") {
      notice("unsupported_elements");
      return [];
    }
    if (!tagNames.has(node.tagName)) {
      notice("unsupported_elements");
      return strippedTags.has(node.tagName)
        ? []
        : node.children.flatMap((child) => clean(child, parent));
    }
    const children = node.children.flatMap((child) => clean(child, node.tagName));
    const properties: Properties = {};
    const permitted = new Set([
      "title",
      ...(elementAttributes[node.tagName] ?? []),
      ...(alignedTags.has(node.tagName) ? ["align"] : []),
    ]);
    for (const [key, value] of Object.entries(node.properties)) {
      if (!permitted.has(key)) {
        notice("unsupported_attributes");
        continue;
      }
      if (key === "title" || key === "ariaLabel") {
        if (typeof value === "string") properties[key] = normalizeInlineText(value);
        else notice("unsupported_attributes");
      } else if (key === "align" || key === "scope") {
        const values =
          key === "align" ? ["left", "center", "right"] : ["row", "col", "rowgroup", "colgroup"];
        if (typeof value === "string" && values.includes(value)) properties[key] = value;
        else notice("unsupported_attributes");
      } else if (key === "width" || key === "height") {
        const size = dimension(value, key === "width");
        if (size !== null) properties[key] = size;
        else notice("unsupported_attributes");
      } else if (key === "colSpan" || key === "rowSpan" || key === "start") {
        const number = boundedInteger(
          value,
          key === "start" ? -10_000 : 1,
          key === "start" ? 10_000 : 100,
        );
        if (number !== null) properties[key] = number;
        else notice("unsupported_attributes");
      } else if (key === "open") {
        properties.open = Boolean(value);
      } else if (key === "loading" || key === "decoding" || key === "referrerPolicy") {
        const expected = key === "loading" ? "lazy" : key === "decoding" ? "async" : "no-referrer";
        if (value !== expected) notice("unsupported_attributes");
      }
    }
    if (node.tagName === "img") {
      const src =
        typeof node.properties.src === "string"
          ? normalizePublicImageUrl(node.properties.src)
          : null;
      if (src === null) problem("invalid_url");
      else properties.src = src;
      if (!Object.hasOwn(node.properties, "alt") || typeof node.properties.alt !== "string")
        problem("missing_image_alt");
      else properties.alt = normalizeInlineText(node.properties.alt);
      properties.loading = "lazy";
      properties.decoding = "async";
      properties.referrerPolicy = "no-referrer";
    }
    if (node.tagName === "a" && Object.hasOwn(node.properties, "href")) {
      const href =
        typeof node.properties.href === "string" ? normalizeWebUrl(node.properties.href) : null;
      if (href === null) problem("invalid_url");
      else properties.href = href;
      if (!properties.ariaLabel && !readableName(children)) problem("invalid_structure");
      if (containsInteractive(children, false)) problem("invalid_structure");
    }
    if (node.tagName === "details") {
      const summaries = children.filter(
        (child) => child.type === "element" && child.tagName === "summary",
      );
      const first = children.find((child) => child.type !== "text" || Boolean(child.value.trim()));
      const summary = summaries[0];
      if (
        summaries.length !== 1 ||
        !summary ||
        summary.type !== "element" ||
        first !== summary ||
        !readableName(summary.children)
      )
        problem("invalid_structure");
    }
    const requiredParents: Record<string, readonly string[]> = {
      summary: ["details"],
      caption: ["table"],
      thead: ["table"],
      tbody: ["table"],
      tfoot: ["table"],
      tr: ["table", "thead", "tbody", "tfoot"],
      th: ["tr"],
      td: ["tr"],
      li: ["ul", "ol"],
    };
    const parents = requiredParents[node.tagName];
    if (parents && !parents.includes(parent ?? "")) problem("invalid_structure");
    if (node.tagName === "summary" && containsInteractive(children, true))
      problem("invalid_structure");
    return [{ type: "element", tagName: node.tagName, properties, children }];
  }

  const cleaned: Root = {
    type: "root",
    children: parsed.children.flatMap((node) => clean(node, null)),
  };
  const safe = sanitize(cleaned, htmlSchema) as Root;
  if (!hasContent(safe)) problem("empty_html");
  if (errors.length > 0) return rejected();
  const html = serializeHtml(safe);
  return { html, tree: safe, notices, errors };
}
