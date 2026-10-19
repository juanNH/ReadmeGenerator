import type { ModuleId } from "@/core/modules/module-ids";
import { reorderModules, setModuleVisibility } from "@/core/profile/profile-operations";
import type { ProfileDocument } from "@/core/profile/profile-schema";

export const editableModuleIds = [
  "presentation",
  "technologies",
  "projects",
  "contributions",
  "contact",
] as const;

export type EditableModuleId = (typeof editableModuleIds)[number];

export function isEditableModuleId(id: ModuleId): id is EditableModuleId {
  return editableModuleIds.some((editableId) => editableId === id);
}

export function visibleEditableModules(document: ProfileDocument) {
  return document.moduleOrder
    .filter(isEditableModuleId)
    .filter((id) => isModuleIncluded(document, id));
}

export function isModuleIncluded(document: ProfileDocument, id: EditableModuleId): boolean {
  return document.visibility[id] || (id === "contributions" && document.visibility.metrics);
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

/** Reinsert a visible module while preserving hidden, retired and pending slots. */
export function moveVisibleModuleToIndex(
  document: ProfileDocument,
  id: EditableModuleId,
  destination: number,
) {
  const visible = visibleEditableModules(document);
  const source = visible.indexOf(id);
  if (
    source < 0 ||
    !Number.isInteger(destination) ||
    destination < 0 ||
    destination >= visible.length ||
    source === destination
  ) {
    return { success: true, data: document } as const;
  }
  const reordered = [...visible];
  reordered.splice(source, 1);
  reordered.splice(destination, 0, id);
  let index = 0;
  const order = document.moduleOrder.map((moduleId) =>
    isEditableModuleId(moduleId) && isModuleIncluded(document, moduleId)
      ? (reordered[index++] ?? moduleId)
      : moduleId,
  );
  return reorderModules(document, order);
}

/** Moving one position uses the same order operation as dragging to any position. */
export function moveVisibleModule(
  document: ProfileDocument,
  id: EditableModuleId,
  direction: "up" | "down",
) {
  const visible = visibleEditableModules(document);
  const index = visible.indexOf(id);
  if (index < 0) return { success: true, data: document } as const;
  return moveVisibleModuleToIndex(document, id, index + (direction === "up" ? -1 : 1));
}
