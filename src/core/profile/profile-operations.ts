import { defaultModuleOrder, isModuleId } from "../modules/module-ids";
import { moduleRegistry } from "../modules/module-registry";
import {
  moduleOrderSchema,
  profileDocumentSchema,
  type ContentLocale,
  type ProfileDocument,
  type ProfileDocumentV1,
} from "./profile-schema";
import type { ProfileResult } from "./profile-result";
import { issuesFromValidationError, migrateProfileV1 } from "./profile-validation";

export {
  addCustomSection,
  duplicateCustomSection,
  removeCustomSection,
  setCustomSectionVisibility,
  updateCustomSection,
  type CreateId,
} from "./custom-section-operations";

/** The locale is supplied by the caller; this factory never reads UI or browser state. */
export function createEmptyProfileV1(contentLocale: ContentLocale): ProfileDocumentV1 {
  return {
    schemaVersion: 1,
    contentLocale,
    data: {
      presentation: moduleRegistry.presentation.createEmptyData(),
      knowledge: moduleRegistry.knowledge.createEmptyData(),
      technologies: moduleRegistry.technologies.createEmptyData(),
      education: moduleRegistry.education.createEmptyData(),
      current: moduleRegistry.current.createEmptyData(),
      projects: moduleRegistry.projects.createEmptyData(),
      contributions: moduleRegistry.contributions.createEmptyData(),
      metrics: { username: "", cards: [] },
      contact: moduleRegistry.contact.createEmptyData(),
    },
    moduleOrder: [...defaultModuleOrder],
    visibility: {
      presentation: false,
      knowledge: false,
      technologies: false,
      education: false,
      current: false,
      projects: false,
      contributions: false,
      metrics: false,
      contact: false,
    },
  };
}

/** Current drafts use a single mixed order, with no random or clock-dependent identities. */
export function createEmptyProfile(contentLocale: ContentLocale): ProfileDocument {
  return migrateProfileV1(createEmptyProfileV1(contentLocale));
}

/** document must come from the factory or parser; only operation arguments are untrusted. */
export function setModuleVisibility(
  document: ProfileDocument,
  moduleId: unknown,
  visible: unknown,
): ProfileResult<ProfileDocument> {
  if (!isModuleId(moduleId)) {
    return { success: false, errors: [{ code: "unknown_module", path: ["moduleId"] }] };
  }
  if (typeof visible !== "boolean") {
    return { success: false, errors: [{ code: "invalid_type", path: ["visible"] }] };
  }
  return {
    success: true,
    data: { ...document, visibility: { ...document.visibility, [moduleId]: visible } },
  };
}

/** Validates the entire mixed order, including references to every custom section. */
export function reorderSections(
  document: ProfileDocument,
  sectionOrder: unknown,
): ProfileResult<ProfileDocument> {
  const result = profileDocumentSchema.safeParse({ ...document, sectionOrder });
  if (!result.success) {
    return { success: false, errors: issuesFromValidationError(result.error) };
  }
  const order = result.data.sectionOrder;
  const unchanged = order.every((reference, index) => {
    const previous = document.sectionOrder[index];
    return reference.kind === "module"
      ? previous?.kind === "module" && previous.moduleId === reference.moduleId
      : previous?.kind === "custom" && previous.sectionId === reference.sectionId;
  });
  return {
    success: true,
    data: unchanged ? document : { ...document, sectionOrder: order },
  };
}

/** Compatibility operation: reorder only fixed slots and keep custom positions intact. */
export function reorderModules(
  document: ProfileDocument,
  moduleOrder: unknown,
): ProfileResult<ProfileDocument> {
  const result = moduleOrderSchema.safeParse(moduleOrder);
  if (!result.success) {
    return { success: false, errors: issuesFromValidationError(result.error, ["moduleOrder"]) };
  }
  let index = 0;
  const order = document.sectionOrder.map((reference) =>
    reference.kind === "module"
      ? { kind: "module" as const, moduleId: result.data[index++]! }
      : reference,
  );
  return reorderSections(document, order);
}
