import type { z } from "zod";
import { profileDocumentSchema, profileDocumentV1Schema } from "./profile-schema";
import type { ProfileDocument, ProfileDocumentV1 } from "./profile-schema";
import {
  profileIssueCodes,
  type ProfileIssue,
  type ProfileIssueCode,
  type ProfileIssuePath,
  type ProfileResult,
} from "./profile-result";

function isProfileIssueCode(value: unknown): value is ProfileIssueCode {
  return profileIssueCodes.some((code) => code === value);
}

export function issuesFromValidationError(
  error: z.ZodError,
  prefix: ProfileIssuePath = [],
): ProfileIssue[] {
  return error.issues.flatMap((issue): ProfileIssue[] => {
    const path = [
      ...prefix,
      ...issue.path.map((part) => (typeof part === "number" ? part : String(part))),
    ];
    if (issue.code === "unrecognized_keys") {
      return issue.keys.map((key) => ({ code: "unknown_property", path: [...path, key] }));
    }
    if (issue.code === "custom" && isProfileIssueCode(issue.params?.profileCode)) {
      return [{ code: issue.params.profileCode, path }];
    }
    if (issue.code === "invalid_type") return [{ code: "invalid_type", path }];
    if (
      issue.code === "invalid_value" &&
      (path[0] === "moduleOrder" || path.at(-1) === "moduleId")
    ) {
      return [{ code: "unknown_module", path }];
    }
    return [{ code: "invalid_value", path }];
  });
}

/** Valid v1 data is copied without inferred content, new identities or translated text. */
export function migrateProfileV1(document: ProfileDocumentV1): ProfileDocument {
  const legacy = profileDocumentV1Schema.parse(document);
  return {
    schemaVersion: 2,
    contentLocale: legacy.contentLocale,
    data: legacy.data,
    visibility: legacy.visibility,
    sectionOrder: legacy.moduleOrder.map((moduleId) => ({ kind: "module", moduleId })),
    customSections: [],
  };
}

/** Validates known versions and returns current v2 data; export validation remains separate. */
export function parseProfileDocument(input: unknown): ProfileResult<ProfileDocument> {
  if (
    typeof input === "object" &&
    input !== null &&
    Object.hasOwn(input, "schemaVersion") &&
    "schemaVersion" in input &&
    input.schemaVersion !== 1 &&
    input.schemaVersion !== 2
  ) {
    return { success: false, errors: [{ code: "unsupported_version", path: ["schemaVersion"] }] };
  }

  if (
    typeof input === "object" &&
    input !== null &&
    "schemaVersion" in input &&
    input.schemaVersion === 1
  ) {
    const legacy = profileDocumentV1Schema.safeParse(input);
    return legacy.success
      ? { success: true, data: migrateProfileV1(legacy.data) }
      : { success: false, errors: issuesFromValidationError(legacy.error) };
  }

  const result = profileDocumentSchema.safeParse(input);
  return result.success
    ? { success: true, data: result.data }
    : { success: false, errors: issuesFromValidationError(result.error) };
}
