import { defaultModuleOrder, isModuleId } from "../modules/module-ids";
import { moduleRegistry } from "../modules/module-registry";
import { moduleOrderSchema, type ContentLocale, type ProfileDocument } from "./profile-schema";
import type { ProfileResult } from "./profile-result";
import { issuesFromValidationError } from "./profile-validation";

/** The locale is supplied by the caller; this factory never reads UI or browser state. */
export function createEmptyProfile(contentLocale: ContentLocale): ProfileDocument {
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
      metrics: moduleRegistry.metrics.createEmptyData(),
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

/** Keeps hidden modules in the order and copies the supplied array to avoid aliasing. */
export function reorderModules(
  document: ProfileDocument,
  moduleOrder: unknown,
): ProfileResult<ProfileDocument> {
  const result = moduleOrderSchema.safeParse(moduleOrder);
  return result.success
    ? { success: true, data: { ...document, moduleOrder: result.data } }
    : { success: false, errors: issuesFromValidationError(result.error, ["moduleOrder"]) };
}
