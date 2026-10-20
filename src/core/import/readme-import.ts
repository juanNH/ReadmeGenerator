import type { Definition, Nodes, Root, RootContent } from "mdast";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import type { CustomBlock, CustomSection } from "../profile/custom-content";
import { createEmptyProfile } from "../profile/profile-operations";
import type { ContentLocale, ProfileDocument } from "../profile/profile-schema";
import { parseProfileDocument } from "../profile/profile-validation";
import { generateReadme } from "../readme/generate-readme";
import { normalizeInlineText } from "../readme/escape-markdown";
import { analyzeProfileHtml } from "../readme/profile-html";
import { normalizePublicImageUrl } from "../readme/public-image";
import { normalizeWebUrl } from "../readme/web-url";
import {
  collectDefinitions,
  hasCrossNodeHtmlContext,
  isManageableTree,
  nodeLabel,
  nodesToHtml,
  plainText,
  referenceKey,
  splitSegments,
  walkNodes,
  type ImportSegment,
} from "./readme-import-ast";
import {
  README_IMPORT_MAX_LENGTH,
  type ImportedProfileResult,
  type ReadmeImportAnalysis,
  type ReadmeImportNotice,
  type ReadmeImportNoticeCode,
  type ReadmeImportProblem,
  type ReadmeImportProblemCode,
  type ReadmeImportSection,
} from "./readme-import-types";

const parser = unified().use(remarkParse).use(remarkGfm).freeze();

function sourceRange(node: Nodes): { start?: number; end?: number } {
  return { start: node.position?.start.offset, end: node.position?.end.offset };
}

function makeDocument(
  contentLocale: ContentLocale,
  sections: readonly CustomSection[],
): ProfileDocument {
  const empty = createEmptyProfile(contentLocale);
  return {
    ...empty,
    customSections: [...sections],
    sectionOrder: [
      ...empty.sectionOrder,
      ...sections.map((section) => ({ kind: "custom" as const, sectionId: section.id })),
    ],
  };
}

function urlProblem(value: string): ReadmeImportProblemCode | null {
  if (value.startsWith("#")) return "anchor_link";
  if (!/^[a-z][a-z\d+.-]*:/i.test(value)) return "relative_url";
  return normalizeWebUrl(value) === null ? "invalid_url" : null;
}

function definitionFor(
  node: Nodes,
  definitions: ReadonlyMap<string, Definition>,
): Definition | undefined {
  return node.type === "linkReference" || node.type === "imageReference"
    ? definitions.get(referenceKey(node.identifier))
    : undefined;
}

function analyzeSegment(
  segment: ImportSegment,
  index: number,
  source: string,
  contentLocale: ContentLocale,
  definitions: ReadonlyMap<string, Definition>,
  groupedHtml: boolean,
  nextBlockId: () => string,
): ReadmeImportSection {
  const id = `import-section-${index + 1}`;
  const notices: ReadmeImportNotice[] = [];
  const errors: ReadmeImportProblem[] = [];
  const blocks: CustomBlock[] = [];
  let content = segment.nodes.filter((node) => node.type !== "definition");
  const first = content[0];
  const label =
    segment.label ||
    (first?.type === "heading" ? nodeLabel(first) : "") ||
    `${contentLocale === "es" ? "Contenido" : "Content"} ${index + 1}`;
  let title = "";

  function notice(code: ReadmeImportNoticeCode, node?: Nodes, detail?: string): void {
    if (notices.some((entry) => entry.code === code && entry.detail === detail)) return;
    notices.push({
      code,
      sectionId: id,
      ...(node ? sourceRange(node) : {}),
      ...(detail ? { detail } : {}),
    });
  }
  function problem(code: ReadmeImportProblemCode, node?: Nodes, detail?: string): void {
    errors.push({
      code,
      sectionId: id,
      ...(node ? sourceRange(node) : {}),
      ...(detail ? { detail } : {}),
    });
  }

  if (groupedHtml) notice("grouped_html_context");
  // An authored H2 can be the section title only when the generator will actually emit it.
  if (
    !groupedHtml &&
    first?.type === "heading" &&
    first.depth === 2 &&
    content.length > 1 &&
    plainText(first) !== null &&
    normalizeInlineText(plainText(first)!)
  ) {
    title = plainText(first)!;
    content = content.slice(1);
  }

  let containsHtml = false;
  walkNodes(content, (node) => {
    if (node.type === "html") containsHtml = true;
    if (node.type === "listItem" && typeof node.checked === "boolean") {
      problem("unsupported_format", node, "task_list");
    }
    if (node.type === "code" && (node.lang || node.meta)) notice("code_metadata_removed", node);
    if (node.type === "linkReference" || node.type === "imageReference") {
      notice("references_resolved", node);
      if (!definitionFor(node, definitions))
        problem("unsupported_format", node, "missing_reference");
    }
    if (node.type === "link" || node.type === "linkReference") {
      const destination = node.type === "link" ? node.url : definitionFor(node, definitions)?.url;
      if (destination !== undefined) {
        const code = urlProblem(destination);
        if (code) problem(code, node);
      }
    }
    if (node.type === "image" || node.type === "imageReference") {
      const destination = node.type === "image" ? node.url : definitionFor(node, definitions)?.url;
      if (destination !== undefined && normalizePublicImageUrl(destination) === null) {
        problem(urlProblem(destination) ?? "invalid_url", node);
      }
      if (!normalizeInlineText(node.alt ?? "")) problem("missing_image_alt", node);
    }
  });

  const definitionNodes = [...definitions.values()];
  function htmlBlock(nodes: readonly RootContent[], original?: string): void {
    const htmlSource = original ?? nodesToHtml(nodes, definitionNodes);
    const result = analyzeProfileHtml(htmlSource);
    blocks.push({ id: nextBlockId(), type: "html", source: htmlSource });
    notice(original === undefined ? "converted_to_html" : "retained_html", nodes[0]);
    for (const entry of result.notices) notice(`html_${entry.code}`, nodes[0]);
    for (const entry of result.errors) {
      problem(
        entry.code === "missing_image_alt" ? "missing_image_alt" : "invalid_html",
        nodes[0],
        entry.code,
      );
    }
  }

  if (containsHtml || groupedHtml) {
    // Keep raw sources intact when they are already HTML. Mixed fragments are converted together,
    // including all reference definitions, so containers cannot be broken at guessed headings.
    const onlyRawHtml =
      content.length > 0 &&
      content.every(
        (node) =>
          node.type === "html" ||
          // Blank lines can make remark wrap inline image links in a paragraph. Keeping
          // these HTML-only leaves avoids inserting a second <p> into the authored one.
          (node.type === "paragraph" &&
            node.children.every(
              (child) => child.type === "html" || (child.type === "text" && !child.value.trim()),
            )),
      );
    const firstOffset = content[0]?.position?.start.offset;
    const lastOffset = content.at(-1)?.position?.end.offset;
    const hasDefinitionBetween = segment.nodes.some(
      (node) =>
        node.type === "definition" &&
        (node.position?.start.offset ?? -1) >= (firstOffset ?? Infinity) &&
        (node.position?.end.offset ?? Infinity) <= (lastOffset ?? -1),
    );
    const original =
      onlyRawHtml && firstOffset !== undefined && lastOffset !== undefined && !hasDefinitionBetween
        ? source.slice(firstOffset, lastOffset)
        : undefined;
    htmlBlock(content, original);
  } else {
    for (const node of content) {
      const blockId = nextBlockId();
      if (node.type === "paragraph" && plainText(node) !== null) {
        blocks.push({ id: blockId, type: "paragraph", text: plainText(node)! });
        continue;
      }
      if (
        node.type === "heading" &&
        content.length > 1 &&
        node.depth === (title ? 3 : 2) &&
        plainText(node) !== null
      ) {
        blocks.push({ id: blockId, type: "heading", text: plainText(node)! });
        continue;
      }
      if (node.type === "thematicBreak") {
        blocks.push({ id: blockId, type: "divider" });
        continue;
      }
      if (
        node.type === "blockquote" &&
        node.children.length > 0 &&
        node.children.every((child) => child.type === "paragraph" && plainText(child) !== null)
      ) {
        blocks.push({
          id: blockId,
          type: "quote",
          text: node.children.map(plainText).join("\n\n"),
        });
        continue;
      }
      if (
        node.type === "list" &&
        !node.spread &&
        (!node.ordered || node.start === 1) &&
        node.children.every(
          (item) =>
            typeof item.checked !== "boolean" &&
            item.children.length === 1 &&
            item.children[0]?.type === "paragraph" &&
            plainText(item.children[0]) !== null,
        )
      ) {
        blocks.push({
          id: blockId,
          type: "list",
          style: node.ordered ? "ordered" : "unordered",
          items: node.children.map((item, itemIndex) => ({
            id: `${blockId}-item-${itemIndex + 1}`,
            text: plainText(item.children[0]!)!,
          })),
        });
        continue;
      }
      if (node.type === "paragraph" && node.children.length === 1) {
        const child = node.children[0]!;
        const definition = definitionFor(child, definitions);
        if (
          (child.type === "link" || child.type === "linkReference") &&
          plainText(child) !== null &&
          normalizeInlineText(plainText(child)!) &&
          !(child.type === "link" ? child.title : definition?.title)
        ) {
          blocks.push({
            id: blockId,
            type: "link",
            label: plainText(child)!,
            url: child.type === "link" ? child.url : (definition?.url ?? ""),
          });
          continue;
        }
        if (
          (child.type === "image" || child.type === "imageReference") &&
          !(child.type === "image" ? child.title : definition?.title)
        ) {
          blocks.push({
            id: blockId,
            type: "image",
            alt: child.alt ?? "",
            url: child.type === "image" ? child.url : (definition?.url ?? ""),
          });
          continue;
        }
      }
      htmlBlock([node]);
    }
  }

  if (blocks.some((block) => block.type !== "html")) notice("markdown_normalized");
  if (errors.length === 0) {
    const output = generateReadme(
      makeDocument(contentLocale, [{ id, title, visible: true, blocks }]),
    );
    if (!output.success) {
      for (const issue of output.errors) {
        problem(
          issue.code === "empty_profile" ? "empty_section" : "generation_failed",
          undefined,
          issue.code,
        );
      }
    }
  }
  const htmlCount = blocks.filter((block) => block.type === "html").length;
  return {
    id,
    label,
    title,
    source: source.slice(segment.start, segment.end),
    start: segment.start,
    end: segment.end,
    blocks,
    representation:
      errors.length > 0
        ? "blocked"
        : htmlCount === 0
          ? "visual"
          : htmlCount === blocks.length
            ? "html"
            : "mixed",
    notices,
    errors,
  };
}

/** Parses the complete source locally. It never renders, loads a URL or mutates a profile. */
export function analyzeReadmeImport(
  source: string,
  contentLocale: ContentLocale,
): ReadmeImportAnalysis {
  const empty = { source, contentLocale, sections: [], notices: [] };
  if (!source.trim()) return { ...empty, errors: [{ code: "empty_source" }] };
  if (source.length > README_IMPORT_MAX_LENGTH) {
    return { ...empty, errors: [{ code: "source_too_large" }] };
  }
  let root: Root;
  const initialBom = source.startsWith("\uFEFF");
  try {
    // remark skips a leading BOM without including it in source offsets. Parse it
    // explicitly and map every position back before slicing the untouched original.
    root = parser.parse(initialBom ? source.slice(1) : source) as Root;
  } catch (error) {
    return {
      ...empty,
      errors: [{ code: error instanceof RangeError ? "too_complex" : "parse_failed" }],
    };
  }
  if (!isManageableTree(root)) return { ...empty, errors: [{ code: "too_complex" }] };
  if (initialBom) {
    walkNodes([root], (node) => {
      if (!node.position) return;
      for (const point of [node.position.start, node.position.end]) {
        if (point.offset !== undefined) point.offset += 1;
        if (point.line === 1) point.column += 1;
      }
    });
  }
  const definitions = collectDefinitions(root);
  const groupedHtml = hasCrossNodeHtmlContext(root.children);
  let blockIndex = 0;
  try {
    const sections = splitSegments(root, source, groupedHtml).map((segment, index) =>
      analyzeSegment(
        segment,
        index,
        source,
        contentLocale,
        definitions,
        hasCrossNodeHtmlContext(segment.nodes),
        () => `import-block-${++blockIndex}`,
      ),
    );
    return { source, contentLocale, sections, notices: [], errors: [] };
  } catch {
    // Unsupported converter/parser input remains available as the original source, never partial output.
    return { ...empty, errors: [{ code: "parse_failed" }] };
  }
}

/** Only explicit selected IDs are applied. A blocked segment must be fixed or deliberately excluded. */
export function buildImportedProfile(
  analysis: ReadmeImportAnalysis,
  selectedSectionIds: readonly string[],
): ImportedProfileResult {
  if (analysis.errors.length > 0) return { success: false, errors: analysis.errors };
  if (selectedSectionIds.length === 0)
    return { success: false, errors: [{ code: "no_sections_selected" }] };
  const selected = new Set(selectedSectionIds);
  const available = new Set(analysis.sections.map((section) => section.id));
  if (
    selected.size !== selectedSectionIds.length ||
    selectedSectionIds.some((id) => !available.has(id))
  ) {
    return { success: false, errors: [{ code: "invalid_selection" }] };
  }
  const sections = analysis.sections.filter((section) => selected.has(section.id));
  const errors = sections.flatMap((section) => section.errors);
  if (errors.length > 0) return { success: false, errors };
  const candidate = makeDocument(
    analysis.contentLocale,
    sections.map((section) => ({
      id: section.id,
      title: section.title,
      visible: true,
      blocks: section.blocks.map((block) =>
        block.type === "list"
          ? { ...block, items: block.items.map((item) => ({ ...item })) }
          : { ...block },
      ),
    })),
  );
  const parsed = parseProfileDocument(candidate);
  if (!parsed.success) return { success: false, errors: [{ code: "invalid_document" }] };
  const readme = generateReadme(parsed.data);
  if (!readme.success || readme.exportIssues?.length) {
    return { success: false, errors: [{ code: "generation_failed" }] };
  }
  return {
    success: true,
    document: parsed.data,
    readme,
    excludedSectionIds: analysis.sections
      .filter((section) => !selected.has(section.id))
      .map((section) => section.id),
  };
}
