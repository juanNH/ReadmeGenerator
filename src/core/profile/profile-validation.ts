import type { z } from "zod";
import { profileDocumentSchema } from "./profile-schema";
import type { ProfileDocument } from "./profile-schema";
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
    if (issue.code === "invalid_value" && path[0] === "moduleOrder") {
      return [{ code: "unknown_module", path }];
    }
    return [{ code: "invalid_value", path }];
  });
}

/** Validates a draft structure. A successful result is not permission to render or export it. */
export function parseProfileDocument(input: unknown): ProfileResult<ProfileDocument> {
  if (
    typeof input === "object" &&
    input !== null &&
    Object.hasOwn(input, "schemaVersion") &&
    "schemaVersion" in input &&
    input.schemaVersion !== 1
  ) {
    return { success: false, errors: [{ code: "unsupported_version", path: ["schemaVersion"] }] };
  }

  const result = profileDocumentSchema.safeParse(input);
  return result.success
    ? { success: true, data: result.data }
    : { success: false, errors: issuesFromValidationError(result.error) };
}
