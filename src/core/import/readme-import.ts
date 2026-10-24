import type { Definition, Nodes, Root, RootContent } from "mdast";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import { normalizeCodeLanguage } from "../code";
import type { CustomBlock, CustomSection } from "../profile/custom-content";
import { createEmptyProfile } from "../profile/profile-operations";
import type { ContentLocale, ProfileDocument, SectionReference } from "../profile/profile-schema";
import { parseProfileDocument } from "../profile/profile-validation";
import { generateReadme, parseReadmeManifest } from "../readme";
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
  README_IMPORT_MAX_SOURCE_LENGTH,
  type ImportedProfileResult,
  type ReadmeImportBuildOptions,
  type ReadmeImportModuleHint,
  type ReadmeImportModuleProposal,
  type ReadmeImportMode,
  type ReadmeImportRecovery,
  type ReadmeImportAnalysis,
  type ReadmeImportNotice,
  type ReadmeImportNoticeCode,
  type ReadmeImportProblem,
  type ReadmeImportProblemCode,
  type ReadmeImportSection,
} from "./readme-import-types";
import {
  proposeReadmeModule,
  suggestedReadmeModule,
  type ReadmeImportModuleId,
} from "./readme-module-proposals";

const parser = unified().use(remarkParse).use(remarkGfm).freeze();

function sourceRange(node: Nodes): { start?: number; end?: number } {
  return { start: node.position?.start.offset, end: node.position?.end.offset };
}

function makeDocument(
  contentLocale: ContentLocale,
  sections: readonly ReadmeImportSection[],
  destinationOverrides: Readonly<Record<string, ReadmeImportModuleId | "custom">> = {},
): ProfileDocument {
  const empty = createEmptyProfile(contentLocale);
  const data = { ...empty.data };
  const visibility = { ...empty.visibility };
  const customSections: CustomSection[] = [];
  const sectionOrder: SectionReference[] = [];
  const includedModules = new Set<ReadmeImportModuleId>();
  const includedCustomIds = new Set<string>();

  for (const section of sections) {
    const proposal = section.moduleProposal;
    const destination = destinationOverrides[section.id] ?? proposal?.moduleId ?? "custom";
    if (proposal && destination === proposal.moduleId && !includedModules.has(proposal.moduleId)) {
      includedModules.add(proposal.moduleId);
      switch (proposal.moduleId) {
        case "presentation":
          data.presentation = proposal.data;
          break;
        case "technologies":
          data.technologies = proposal.data;
          break;
        case "projects":
          data.projects = proposal.data;
          break;
        case "contributions":
          data.contributions = proposal.data;
          break;
        case "contact":
          data.contact = proposal.data;
          break;
      }
      visibility[proposal.moduleId] = true;
      sectionOrder.push({ kind: "module", moduleId: proposal.moduleId });
      continue;
    }

    const preferredId =
      section.manifestReference?.kind === "custom"
        ? section.manifestReference.sectionId
        : section.id;
    const id = !includedCustomIds.has(preferredId)
      ? preferredId
      : !includedCustomIds.has(section.id)
        ? section.id
        : `import-custom-${customSections.length + 1}`;
    includedCustomIds.add(id);
    customSections.push({
      id,
      title: section.title,
      visible: true,
      blocks: section.blocks.map((block) =>
        block.type === "list"
          ? { ...block, items: block.items.map((item) => ({ ...item })) }
          : { ...block },
      ),
    });
    sectionOrder.push({ kind: "custom", sectionId: id });
  }

  for (const reference of empty.sectionOrder) {
    if (
      reference.kind !== "module" ||
      !includedModules.has(reference.moduleId as ReadmeImportModuleId)
    )
      sectionOrder.push(reference);
  }

  return { ...empty, data, visibility, customSections, sectionOrder };
}

function makeCustomValidationDocument(
  contentLocale: ContentLocale,
  section: CustomSection,
): ProfileDocument {
  const empty = createEmptyProfile(contentLocale);
  return {
    ...empty,
    customSections: [section],
    sectionOrder: [...empty.sectionOrder, { kind: "custom", sectionId: section.id }],
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
  manifestReference: SectionReference | undefined,
  structuralManifest: boolean,
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
    if (
      node.type === "code" &&
      (node.meta ||
        (node.lang && (groupedHtml || !content.some((entry) => entry === node))) ||
        normalizeCodeLanguage(node.lang ?? "") === null)
    )
      notice("code_metadata_removed", node);
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

  function codeBlock(node: Extract<RootContent, { type: "code" }>): void {
    blocks.push({
      id: nextBlockId(),
      type: "code",
      source: node.value,
      language: normalizeCodeLanguage(node.lang ?? "") ?? "",
    });
  }

  function retainHtml(nodes: readonly RootContent[]): void {
    // Keep raw sources intact when they are already HTML. Mixed fragments are converted together,
    // including all reference definitions, so containers cannot be broken at guessed headings.
    const onlyRawHtml =
      nodes.length > 0 &&
      nodes.every(
        (node) =>
          node.type === "html" ||
          // Blank lines can make remark wrap inline image links in a paragraph. Keeping
          // these HTML-only leaves avoids inserting a second <p> into the authored one.
          (node.type === "paragraph" &&
            node.children.every(
              (child) => child.type === "html" || (child.type === "text" && !child.value.trim()),
            )),
      );
    const firstOffset = nodes[0]?.position?.start.offset;
    const lastOffset = nodes.at(-1)?.position?.end.offset;
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
    htmlBlock(nodes, original);
  }

  if (groupedHtml) {
    retainHtml(content);
  } else if (containsHtml) {
    // Independent fenced blocks retain their language even beside explicit HTML. An open
    // HTML container is handled above as one fragment so its semantics are never guessed.
    let pending: RootContent[] = [];
    for (const node of content) {
      if (node.type === "code") {
        if (pending.length) retainHtml(pending);
        pending = [];
        codeBlock(node);
      } else pending.push(node);
    }
    if (pending.length) retainHtml(pending);
  } else {
    for (const node of content) {
      if (node.type === "code") {
        codeBlock(node);
        continue;
      }
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
      makeCustomValidationDocument(contentLocale, { id, title, visible: true, blocks }),
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
  const activeImportModules = new Set<string>([
    "presentation",
    "technologies",
    "projects",
    "contributions",
    "contact",
  ]);
  const hintedModule =
    manifestReference?.kind === "module" && activeImportModules.has(manifestReference.moduleId)
      ? (manifestReference.moduleId as ReadmeImportModuleId)
      : undefined;
  const headingModule =
    !structuralManifest || manifestReference?.kind === "module"
      ? suggestedReadmeModule(title || label)
      : undefined;
  const mapping =
    structuralManifest && manifestReference?.kind !== "module"
      ? {}
      : proposeReadmeModule({ id, label, title }, content, definitions, hintedModule);
  const moduleProposal: ReadmeImportModuleProposal | undefined =
    errors.length === 0 ? mapping.proposal : undefined;
  const unconfirmedModule = moduleProposal
    ? undefined
    : (hintedModule ?? mapping.attemptedModule ?? headingModule);
  const moduleHint: ReadmeImportModuleHint | undefined = unconfirmedModule
    ? {
        moduleId: unconfirmedModule,
        confidence: "review",
        reason: hintedModule ? "manifest_reference" : "heading_alias",
      }
    : undefined;
  if (
    !moduleProposal &&
    (mapping.attemptedModule ||
      hintedModule ||
      (!structuralManifest && suggestedReadmeModule(title || label)))
  ) {
    const rangeNode = content[0] ?? segment.nodes[0];
    notices.push({
      code: "module_mapping_not_confirmed",
      sectionId: id,
      ...(rangeNode ? sourceRange(rangeNode) : {}),
    });
  }
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
    ...(moduleProposal ? { moduleProposal } : {}),
    ...(moduleHint ? { moduleHint } : {}),
    ...(manifestReference ? { manifestReference } : {}),
  };
}

function recoveryFromManifest(
  parsed: ReturnType<typeof parseReadmeManifest>,
): ReadmeImportRecovery {
  if (parsed.status === "absent") return { kind: "none" };
  if (parsed.status === "invalid") return { kind: "invalid" };
  if (parsed.status === "unsupported") return { kind: "unsupported", version: parsed.version };
  if (parsed.manifest.recoverySnapshot) {
    return {
      kind: "snapshot",
      snapshot: parsed.manifest.recoverySnapshot,
      matchesSource: parsed.matchesSource,
    };
  }
  return { kind: "structural", matchesSource: parsed.matchesSource };
}

function manifestReferenceForSegment(
  segment: ImportSegment,
  references: readonly (SectionReference & { readonly start: number; readonly end: number })[],
): SectionReference | undefined {
  const contained = references.filter(
    (reference) => reference.start >= segment.start && reference.end <= segment.end,
  );
  if (contained.length !== 1) return undefined;
  const reference = contained[0]!;
  return reference.kind === "module"
    ? { kind: "module", moduleId: reference.moduleId }
    : { kind: "custom", sectionId: reference.sectionId };
}

function removeRepeatedModuleProposals(
  sections: readonly ReadmeImportSection[],
): ReadmeImportSection[] {
  const counts = new Map<ReadmeImportModuleId, number>();
  for (const section of sections) {
    const moduleId = section.moduleProposal?.moduleId;
    if (moduleId) counts.set(moduleId, (counts.get(moduleId) ?? 0) + 1);
  }
  return sections.map((section) => {
    const moduleId = section.moduleProposal?.moduleId;
    if (!moduleId || (counts.get(moduleId) ?? 0) < 2) return section;
    return {
      id: section.id,
      label: section.label,
      title: section.title,
      source: section.source,
      start: section.start,
      end: section.end,
      blocks: section.blocks,
      representation: section.representation,
      errors: section.errors,
      moduleHint: section.moduleHint ?? {
        moduleId,
        confidence: "review",
        reason: "heading_alias",
      },
      ...(section.manifestReference ? { manifestReference: section.manifestReference } : {}),
      notices: [...section.notices, { code: "module_mapping_conflict", sectionId: section.id }],
    };
  });
}

function manifestNotices(parsed: ReturnType<typeof parseReadmeManifest>): ReadmeImportNotice[] {
  if (parsed.status === "invalid") return [{ code: "manifest_invalid", detail: parsed.reason }];
  if (parsed.status === "unsupported")
    return [{ code: "manifest_unsupported", detail: String(parsed.version) }];
  if (parsed.status === "valid" && !parsed.matchesSource) return [{ code: "manifest_stale" }];
  return [];
}

/** Parses the complete source locally. It never renders, loads a URL or mutates a profile. */
export function analyzeReadmeImport(
  source: string,
  contentLocale: ContentLocale,
): ReadmeImportAnalysis {
  const manifest = parseReadmeManifest(source);
  const recovery = recoveryFromManifest(manifest);
  const sourceForParsing = manifest.status === "valid" ? manifest.markdown : source;
  const initialNotices = manifestNotices(manifest);
  const empty = {
    source,
    contentLocale,
    sections: [],
    notices: initialNotices,
    recovery,
  } as const;
  if (!source.trim()) return { ...empty, errors: [{ code: "empty_source" }] };
  if (source.length > README_IMPORT_MAX_SOURCE_LENGTH) {
    return { ...empty, errors: [{ code: "source_too_large" }] };
  }
  if (sourceForParsing.length > README_IMPORT_MAX_LENGTH) {
    return { ...empty, errors: [{ code: "source_too_large" }] };
  }
  let root: Root;
  const initialBom = sourceForParsing.startsWith("\uFEFF");
  try {
    // remark skips a leading BOM without including it in source offsets. Parse it
    // explicitly and map every position back before slicing the untouched original.
    root = parser.parse(initialBom ? sourceForParsing.slice(1) : sourceForParsing) as Root;
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
    const canUseManifestRanges = manifest.status === "valid" && manifest.matchesSource;
    const ranges = canUseManifestRanges ? manifest.manifest.sections : [];
    const sections = splitSegments(root, sourceForParsing, groupedHtml).map((segment, index) =>
      analyzeSegment(
        segment,
        index,
        sourceForParsing,
        contentLocale,
        definitions,
        hasCrossNodeHtmlContext(segment.nodes),
        manifestReferenceForSegment(segment, ranges),
        canUseManifestRanges,
        () => `import-block-${++blockIndex}`,
      ),
    );
    return {
      source,
      contentLocale,
      sections: removeRepeatedModuleProposals(sections),
      notices: initialNotices,
      errors: [],
      recovery,
    };
  } catch {
    // Unsupported converter/parser input remains available as the original source, never partial output.
    return { ...empty, errors: [{ code: "parse_failed" }] };
  }
}

/** Only explicit selected IDs are applied. A blocked segment must be fixed or deliberately excluded. */
export function buildImportedProfile(
  analysis: ReadmeImportAnalysis,
  selectedSectionIds: readonly string[],
  options: ReadmeImportBuildOptions = {},
): ImportedProfileResult {
  const mode: ReadmeImportMode = options.mode ?? "markdown";
  if (mode === "snapshot") {
    if (analysis.recovery.kind !== "snapshot")
      return { success: false, errors: [{ code: "snapshot_unavailable" }] };
    const parsedSnapshot = parseProfileDocument(analysis.recovery.snapshot);
    if (!parsedSnapshot.success) return { success: false, errors: [{ code: "invalid_document" }] };
    const readme = generateReadme(parsedSnapshot.data);
    const originalManifest = parseReadmeManifest(analysis.source);
    return {
      success: true,
      mode,
      document: parsedSnapshot.data,
      readme: readme.success
        ? readme
        : {
            success: true,
            markdown:
              originalManifest.status === "valid" ? originalManifest.markdown : analysis.source,
          },
      ...(!readme.success ? { readmeErrors: readme.errors } : {}),
      excludedSectionIds: [],
    };
  }
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
  for (const [sectionId, destination] of Object.entries(options.destinationOverrides ?? {})) {
    const section = sections.find((entry) => entry.id === sectionId);
    if (
      !section?.moduleProposal ||
      (destination !== "custom" && destination !== section.moduleProposal.moduleId)
    ) {
      return { success: false, errors: [{ code: "invalid_selection" }] };
    }
  }
  const errors = sections.flatMap((section) => section.errors);
  if (errors.length > 0) return { success: false, errors };
  const candidate = makeDocument(analysis.contentLocale, sections, options.destinationOverrides);
  const parsed = parseProfileDocument(candidate);
  if (!parsed.success) return { success: false, errors: [{ code: "invalid_document" }] };
  const readme = generateReadme(parsed.data);
  if (!readme.success || readme.exportIssues?.length) {
    return { success: false, errors: [{ code: "generation_failed" }] };
  }
  return {
    success: true,
    mode,
    document: parsed.data,
    readme,
    excludedSectionIds: analysis.sections
      .filter((section) => !selected.has(section.id))
      .map((section) => section.id),
  };
}
