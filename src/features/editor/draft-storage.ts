import type { ProfileDocument } from "@/core/profile/profile-schema";
import { migrateProfileV1, parseProfileDocument } from "@/core/profile/profile-validation";
import { profileDocumentV1Schema } from "@/core/profile/profile-schema";

export const PROFILE_DRAFT_STORAGE_KEY = "github-profile-generator.profile.v2";
export const LEGACY_PROFILE_DRAFT_STORAGE_KEY = "github-profile-generator.profile.v1";

export type ProfileDraftReadResult =
  | { readonly status: "empty" }
  | { readonly status: "restored"; readonly document: ProfileDocument }
  | { readonly status: "invalid" }
  | { readonly status: "unavailable" };

/** Reading never changes the original, including corrupt or incompatible drafts. */
export function readProfileDraft(storage: Pick<Storage, "getItem">): ProfileDraftReadResult {
  let serialized: string | null;
  try {
    serialized = storage.getItem(PROFILE_DRAFT_STORAGE_KEY);
    if (serialized === null) {
      const legacy = storage.getItem(LEGACY_PROFILE_DRAFT_STORAGE_KEY);
      if (legacy === null) return { status: "empty" };
      try {
        const result = profileDocumentV1Schema.safeParse(JSON.parse(legacy));
        return result.success
          ? { status: "restored", document: migrateProfileV1(result.data) }
          : { status: "invalid" };
      } catch {
        return { status: "invalid" };
      }
    }
  } catch {
    return { status: "unavailable" };
  }

  if (serialized === null) return { status: "empty" };

  try {
    const input: unknown = JSON.parse(serialized);
    if (
      typeof input !== "object" ||
      input === null ||
      !("schemaVersion" in input) ||
      input.schemaVersion !== 2
    )
      return { status: "invalid" };
    const result = parseProfileDocument(input);
    return result.success ? { status: "restored", document: result.data } : { status: "invalid" };
  } catch {
    return { status: "invalid" };
  }
}

/** The caller supplies a valid document and controls whether replacement is permitted. */
export function writeProfileDraft(
  storage: Pick<Storage, "setItem">,
  document: ProfileDocument,
): boolean {
  try {
    storage.setItem(PROFILE_DRAFT_STORAGE_KEY, JSON.stringify(document));
    return true;
  } catch {
    return false;
  }
}
