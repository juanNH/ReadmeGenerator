import type { ProfileDocument } from "@/core/profile/profile-schema";
import { parseProfileDocument } from "@/core/profile/profile-validation";

export const PROFILE_DRAFT_STORAGE_KEY = "github-profile-generator.profile.v1";

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
  } catch {
    return { status: "unavailable" };
  }

  if (serialized === null) return { status: "empty" };

  try {
    const result = parseProfileDocument(JSON.parse(serialized));
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
