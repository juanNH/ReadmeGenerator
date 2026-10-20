import {
  reorderSections,
  setCustomSectionVisibility,
  setModuleVisibility,
} from "@/core/profile/profile-operations";
import type { ProfileDocument, SectionReference } from "@/core/profile/profile-schema";
import type { ReadmeIssue } from "@/core/readme";

export const editableModuleIds = [
  "presentation",
  "technologies",
  "projects",
  "contributions",
  "contact",
] as const;
export type EditableModuleId = (typeof editableModuleIds)[number];
// Custom identities are tagged to distinguish them from fixed modules, even for opaque IDs.
export type EditableSectionId = string;

export function isEditableModuleId(id: unknown): id is EditableModuleId {
  return editableModuleIds.some((editableId) => editableId === id);
}

export function sectionKey(reference: SectionReference): EditableSectionId {
  return reference.kind === "module" ? reference.moduleId : `custom:${reference.sectionId}`;
}

export function getCustomSection(document: ProfileDocument, id: EditableSectionId | null) {
  if (!id?.startsWith("custom:")) return undefined;
  return document.customSections.find((section) => section.id === id.slice(7));
}

export function editableSectionIds(document: ProfileDocument): EditableSectionId[] {
  return document.sectionOrder.flatMap((reference) =>
    reference.kind === "module"
      ? isEditableModuleId(reference.moduleId)
        ? [reference.moduleId]
        : []
      : [sectionKey(reference)],
  );
}

export function visibleEditableSections(document: ProfileDocument) {
  return editableSectionIds(document).filter((id) => isSectionIncluded(document, id));
}

/** Fixed-module projection retained for consumers that only need the five built-in forms. */
export function visibleEditableModules(document: ProfileDocument) {
  return visibleEditableSections(document).filter(isEditableModuleId);
}

export function isModuleIncluded(document: ProfileDocument, id: EditableModuleId): boolean {
  return document.visibility[id] || (id === "contributions" && document.visibility.metrics);
}

export function isSectionIncluded(document: ProfileDocument, id: EditableSectionId): boolean {
  return isEditableModuleId(id)
    ? isModuleIncluded(document, id)
    : getCustomSection(document, id)?.visible === true;
}

export function setEditableModuleVisibility(
  document: ProfileDocument,
  id: EditableModuleId,
  visible: boolean,
) {
  const result = setModuleVisibility(document, id, visible);
  if (!result.success || id !== "contributions") return result;
  return setModuleVisibility(
    result.data,
    "metrics",
    visible && document.data.metrics.cards.length > 0,
  );
}

export function setSectionVisibility(
  document: ProfileDocument,
  id: EditableSectionId,
  visible: boolean,
) {
  if (isEditableModuleId(id)) return setEditableModuleVisibility(document, id, visible);
  const section = getCustomSection(document, id);
  return setCustomSectionVisibility(document, section?.id, visible);
}

export function sectionHasErrors(
  document: ProfileDocument,
  id: EditableSectionId,
  errors: readonly ReadmeIssue[],
) {
  if (isEditableModuleId(id))
    return errors.some(
      (error) =>
        error.path[0] === "data" &&
        (error.path[1] === id || (id === "contributions" && error.path[1] === "metrics")),
    );
  const section = getCustomSection(document, id);
  const index = document.customSections.findIndex((entry) => entry === section);
  return (
    index >= 0 &&
    errors.some((error) => error.path[0] === "customSections" && error.path[1] === index)
  );
}

/** Reinsert included sections in their existing slots; hidden and retired references stay fixed. */
export function moveVisibleSectionToIndex(
  document: ProfileDocument,
  id: EditableSectionId,
  destination: number,
) {
  const visible = visibleEditableSections(document);
  const source = visible.indexOf(id);
  if (
    source < 0 ||
    !Number.isInteger(destination) ||
    destination < 0 ||
    destination >= visible.length ||
    source === destination
  )
    return { success: true, data: document } as const;
  const reordered = [...visible];
  reordered.splice(source, 1);
  reordered.splice(destination, 0, id);
  const references = new Map(
    document.sectionOrder.map((reference) => [sectionKey(reference), reference]),
  );
  let index = 0;
  const order = document.sectionOrder.map((reference) => {
    const key = sectionKey(reference);
    return visible.includes(key) ? references.get(reordered[index++]!)! : reference;
  });
  return reorderSections(document, order);
}

export function moveVisibleSection(
  document: ProfileDocument,
  id: EditableSectionId,
  direction: "up" | "down",
) {
  const visible = visibleEditableSections(document);
  return moveVisibleSectionToIndex(
    document,
    id,
    visible.indexOf(id) + (direction === "up" ? -1 : 1),
  );
}

export function moveVisibleModuleToIndex(
  document: ProfileDocument,
  id: EditableModuleId,
  destination: number,
) {
  return moveVisibleSectionToIndex(document, id, destination);
}

export function moveVisibleModule(
  document: ProfileDocument,
  id: EditableModuleId,
  direction: "up" | "down",
) {
  return moveVisibleSection(document, id, direction);
}
