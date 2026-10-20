import { createEmptyProfile } from "@/core/profile/profile-operations";
import type { ContentLocale, ProfileDocument } from "@/core/profile/profile-schema";
import { readProfileDraft, writeProfileDraft } from "./draft-storage";

export type ClearProfileDraftResult = {
  document: ProfileDocument;
  status: "saved" | "memory_only";
  /** A failed read protects the stored value, while a failed write only disables autosave. */
  protection?: "invalid" | "unavailable";
};

/**
 * The caller confirmed clearing the active README. A protected or unreadable value
 * remains intact; legacy migration and import recovery records are never written.
 */
export function clearProfileDraft(
  contentLocale: ContentLocale,
  getStorage: () => Pick<Storage, "getItem" | "setItem">,
  storageProtected: boolean,
): ClearProfileDraftResult {
  const document = createEmptyProfile(contentLocale);
  if (storageProtected) return { document, status: "memory_only" };
  try {
    const storage = getStorage();
    const current = readProfileDraft(storage);
    if (current.status === "invalid" || current.status === "unavailable") {
      return { document, status: "memory_only", protection: current.status };
    }
    return { document, status: writeProfileDraft(storage, document) ? "saved" : "memory_only" };
  } catch {
    // Accessing window.localStorage itself can throw before the storage adapter runs.
    return { document, status: "memory_only", protection: "unavailable" };
  }
}
