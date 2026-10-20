import { customSectionSchema, type CustomBlock, type CustomSection } from "./custom-content";
import {
  sectionReferenceSchema,
  type ProfileDocument,
  type SectionReference,
} from "./profile-schema";
import type { ProfileIssuePath, ProfileResult } from "./profile-result";
import { issuesFromValidationError } from "./profile-validation";

export type CreateId = () => string;

function rejected(
  code: "unknown_section" | "invalid_type" | "invalid_id" | "id_generation_failed",
  path: ProfileIssuePath,
): ProfileResult<never> {
  return { success: false, errors: [{ code, path }] };
}

function findSection(document: ProfileDocument, id: unknown): ProfileResult<CustomSection> {
  if (typeof id !== "string") return rejected("invalid_type", ["sectionId"]);
  if (!id.trim()) return rejected("invalid_id", ["sectionId"]);
  const section = document.customSections.find((entry) => entry.id === id);
  return section ? { success: true, data: section } : rejected("unknown_section", ["sectionId"]);
}

function sameReference(left: SectionReference, right: SectionReference): boolean {
  return left.kind === "module"
    ? right.kind === "module" && left.moduleId === right.moduleId
    : right.kind === "custom" && left.sectionId === right.sectionId;
}

/** Exclude existing identities, also across collections, while building an independent copy. */
function documentIds(document: ProfileDocument): Set<string> {
  const ids = new Set<string>();
  function collect(value: unknown) {
    if (Array.isArray(value)) {
      value.forEach(collect);
    } else if (value !== null && typeof value === "object") {
      for (const [key, entry] of Object.entries(value)) {
        if (key === "id" && typeof entry === "string") ids.add(entry);
        else collect(entry);
      }
    }
  }
  collect(document.data);
  collect(document.customSections);
  return ids;
}

function freshId(taken: Set<string>, createId: CreateId): string | null {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    let id: string;
    try {
      id = createId();
    } catch {
      return null;
    }
    if (typeof id === "string" && id.trim() && !taken.has(id)) {
      taken.add(id);
      return id;
    }
  }
  return null;
}

/** A new empty, included section is inserted after an explicit reference or at the end. */
export function addCustomSection(
  document: ProfileDocument,
  createId: CreateId,
  after?: SectionReference,
): ProfileResult<ProfileDocument> {
  let insertAt = document.sectionOrder.length;
  if (after !== undefined) {
    const reference = sectionReferenceSchema.safeParse(after);
    if (!reference.success) {
      return { success: false, errors: issuesFromValidationError(reference.error, ["after"]) };
    }
    const index = document.sectionOrder.findIndex((entry) => sameReference(entry, reference.data));
    if (index < 0) return rejected("unknown_section", ["after"]);
    insertAt = index + 1;
  }
  const id = freshId(documentIds(document), createId);
  if (id === null) return rejected("id_generation_failed", ["customSections"]);
  const section: CustomSection = { id, title: "", visible: true, blocks: [] };
  const sectionOrder = [...document.sectionOrder];
  sectionOrder.splice(insertAt, 0, { kind: "custom", sectionId: id });
  return {
    success: true,
    data: {
      ...document,
      sectionOrder,
      customSections: [...document.customSections, section],
    },
  };
}

/** Replace one complete section after structural validation; identity cannot be renamed. */
export function updateCustomSection(
  document: ProfileDocument,
  id: unknown,
  value: unknown,
): ProfileResult<ProfileDocument> {
  const found = findSection(document, id);
  if (!found.success) return found;
  const index = document.customSections.indexOf(found.data);
  const result = customSectionSchema.safeParse(value);
  if (!result.success) {
    return {
      success: false,
      errors: issuesFromValidationError(result.error, ["customSections", index]),
    };
  }
  if (result.data.id !== id) return rejected("invalid_id", ["customSections", index, "id"]);
  return {
    success: true,
    data: {
      ...document,
      customSections: document.customSections.map((section) =>
        section === found.data ? result.data : section,
      ),
    },
  };
}

export function setCustomSectionVisibility(
  document: ProfileDocument,
  id: unknown,
  visible: unknown,
): ProfileResult<ProfileDocument> {
  const found = findSection(document, id);
  if (!found.success) return found;
  if (typeof visible !== "boolean") return rejected("invalid_type", ["visible"]);
  if (found.data.visible === visible) return { success: true, data: document };
  return {
    success: true,
    data: {
      ...document,
      customSections: document.customSections.map((section) =>
        section === found.data ? { ...section, visible } : section,
      ),
    },
  };
}

/** Clone the full tree with new identities, or return an error without any partial changes. */
export function duplicateCustomSection(
  document: ProfileDocument,
  id: unknown,
  createId: CreateId,
): ProfileResult<ProfileDocument> {
  const found = findSection(document, id);
  if (!found.success) return found;
  const source = found.data;
  const taken = documentIds(document);
  const sectionId = freshId(taken, createId);
  if (sectionId === null) return rejected("id_generation_failed", ["customSections"]);
  const blocks: CustomBlock[] = [];
  for (const block of source.blocks) {
    const blockId = freshId(taken, createId);
    if (blockId === null) return rejected("id_generation_failed", ["customSections"]);
    if (block.type === "list") {
      const items: { id: string; text: string }[] = [];
      for (const item of block.items) {
        const itemId = freshId(taken, createId);
        if (itemId === null) return rejected("id_generation_failed", ["customSections"]);
        items.push({ id: itemId, text: item.text });
      }
      blocks.push({ ...block, id: blockId, items });
    } else {
      // Paragraphs, links, headings, dividers, quotes and images contain only scalar fields.
      blocks.push({ ...block, id: blockId });
    }
  }
  const copy: CustomSection = { ...source, id: sectionId, blocks };
  const sectionOrder = [...document.sectionOrder];
  const sourceIndex = sectionOrder.findIndex(
    (reference) => reference.kind === "custom" && reference.sectionId === source.id,
  );
  sectionOrder.splice(sourceIndex + 1, 0, { kind: "custom", sectionId });
  return {
    success: true,
    data: {
      ...document,
      sectionOrder,
      customSections: [...document.customSections, copy],
    },
  };
}

/** Remove exactly one instance and its order reference, preserving all other relative positions. */
export function removeCustomSection(
  document: ProfileDocument,
  id: unknown,
): ProfileResult<ProfileDocument> {
  const found = findSection(document, id);
  if (!found.success) return found;
  return {
    success: true,
    data: {
      ...document,
      customSections: document.customSections.filter((section) => section !== found.data),
      sectionOrder: document.sectionOrder.filter(
        (reference) => reference.kind !== "custom" || reference.sectionId !== id,
      ),
    },
  };
}
