import type { ProfileDocument } from "../profile/profile-schema";
import type { ProfileIssue } from "../profile/profile-result";
import { parseProfileDocument } from "../profile/profile-validation";

export const PROJECT_FILE_MAX_BYTES = 4 * 1024 * 1024;
export const PROJECT_FILE_MAX_DEPTH = 32;
export const PROJECT_FILE_MAX_VALUES = 50_000;

export type ProjectFileResult =
  | {
      readonly success: true;
      readonly document: ProfileDocument;
      readonly sourceVersion: 1 | 2;
    }
  | {
      readonly success: false;
      readonly code: "too_large" | "invalid_json" | "invalid_document" | "unsupported_version";
      readonly issues?: readonly ProfileIssue[];
    };

export type SerializedProjectFileResult =
  | { readonly success: true; readonly source: string }
  | { readonly success: false; readonly code: "too_large" | "invalid_document" };

/** Counts UTF-8 bytes, including lone surrogates encoded as the replacement character. */
function exceedsByteLimit(source: string): boolean {
  if (source.length > PROJECT_FILE_MAX_BYTES) return true;
  let bytes = 0;
  for (let index = 0; index < source.length; index++) {
    const unit = source.charCodeAt(index);
    if (unit <= 0x7f) bytes++;
    else if (unit <= 0x7ff) bytes += 2;
    else if (
      unit >= 0xd800 &&
      unit <= 0xdbff &&
      source.charCodeAt(index + 1) >= 0xdc00 &&
      source.charCodeAt(index + 1) <= 0xdfff
    ) {
      bytes += 4;
      index++;
    } else bytes += 3;
    if (bytes > PROJECT_FILE_MAX_BYTES) return true;
  }
  return false;
}

/** Limits container nesting before parsing; JSON.parse remains responsible for syntax. */
function exceedsSourceDepth(source: string): boolean {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (const character of source) {
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
    } else if (character === '"') inString = true;
    else if (character === "{" || character === "[") {
      if (++depth > PROJECT_FILE_MAX_DEPTH) return true;
    } else if (character === "}" || character === "]") depth--;
  }
  return false;
}

/** Bounds unknown trees without recursively visiting their children or running a schema. */
function hasBoundedValues(input: unknown): boolean {
  const pending: { value: unknown; depth: number }[] = [{ value: input, depth: 0 }];
  let count = 0;
  while (pending.length > 0) {
    const entry = pending.pop()!;
    if (++count > PROJECT_FILE_MAX_VALUES) return false;
    if (typeof entry.value !== "object" || entry.value === null) {
      if (
        typeof entry.value === "function" ||
        typeof entry.value === "symbol" ||
        typeof entry.value === "bigint"
      )
        return false;
      continue;
    }
    if (entry.depth >= PROJECT_FILE_MAX_DEPTH) return false;
    const values = Object.values(entry.value);
    if (count + pending.length + values.length > PROJECT_FILE_MAX_VALUES) return false;
    for (const value of values) pending.push({ value, depth: entry.depth + 1 });
  }
  return true;
}

/** Opens authored data only: incomplete or non-exportable README content remains valid. */
export function parseProjectFile(source: string): ProjectFileResult {
  if (exceedsByteLimit(source)) return { success: false, code: "too_large" };
  if (exceedsSourceDepth(source)) return { success: false, code: "invalid_document" };

  let input: unknown;
  try {
    // A file-level UTF-8 BOM is optional; BOMs inside JSON strings are authored content.
    input = JSON.parse(source.startsWith("\ufeff") ? source.slice(1) : source);
  } catch {
    return { success: false, code: "invalid_json" };
  }
  if (!hasBoundedValues(input)) return { success: false, code: "invalid_document" };

  const parsed = parseProfileDocument(input);
  if (!parsed.success) {
    return {
      success: false,
      code: parsed.errors.some((issue) => issue.code === "unsupported_version")
        ? "unsupported_version"
        : "invalid_document",
      issues: parsed.errors,
    };
  }
  if (!hasBoundedValues(parsed.data)) return { success: false, code: "invalid_document" };
  if (exceedsByteLimit(JSON.stringify(parsed.data))) return { success: false, code: "too_large" };
  // A successful structural parse guarantees that the original version is exactly 1 or 2.
  const sourceVersion = (input as { schemaVersion: 1 | 2 }).schemaVersion;
  return { success: true, document: parsed.data, sourceVersion };
}

/** Emits current v2 JSON and never returns a file that this reader cannot reopen. */
export function serializeProjectFile(document: ProfileDocument): SerializedProjectFileResult {
  try {
    if (document.schemaVersion !== 2 || !hasBoundedValues(document))
      return { success: false, code: "invalid_document" };
    const parsed = parseProfileDocument(document);
    if (!parsed.success) return { success: false, code: "invalid_document" };
    const formatted = `${JSON.stringify(parsed.data, null, 2)}\n`;
    const source = exceedsByteLimit(formatted) ? JSON.stringify(parsed.data) : formatted;
    const reopened = parseProjectFile(source);
    if (!reopened.success)
      return {
        success: false,
        code: reopened.code === "too_large" ? "too_large" : "invalid_document",
      };
    return { success: true, source };
  } catch {
    return { success: false, code: "invalid_document" };
  }
}
