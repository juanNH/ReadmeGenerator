import type { ProfileDocument } from "@/core/profile/profile-schema";
import { parseProfileDocument } from "@/core/profile/profile-validation";
import { readProfileDraft, writeProfileDraft } from "./draft-storage";

export const IMPORT_BACKUP_STORAGE_KEY = "github-profile-generator.import-backup.v1";
export const MAX_IMPORT_SOURCE_LENGTH = 100_000;
export const MAX_IMPORT_BACKUP_LENGTH = 2_000_000;

/** This side record is not part of ProfileDocument or its migration keys. */
export type ImportBackup = {
  schemaVersion: 1;
  previousDocument: ProfileDocument;
  originalSource: string;
};

export type ImportBackupReadResult =
  | { status: "empty" }
  | { status: "available"; backup: ImportBackup }
  | { status: "invalid" }
  | { status: "unavailable" };

type BackupResult = { success: true; backup: ImportBackup } | { success: false };
type ImportStorage = Pick<Storage, "getItem" | "setItem">;
export type ImportStorageWriteResult =
  | { status: "saved" }
  | { status: "invalid" }
  | { status: "needs_memory_confirmation"; backupPersisted: boolean };

function parseCurrentDocument(input: unknown): ProfileDocument | null {
  if (
    typeof input !== "object" ||
    input === null ||
    !Object.hasOwn(input, "schemaVersion") ||
    !("schemaVersion" in input) ||
    input.schemaVersion !== 2
  )
    return null;
  const parsed = parseProfileDocument(input);
  return parsed.success ? parsed.data : null;
}

/** Copies and validates the live profile, including hidden and legacy content. */
export function createImportBackup(
  previousDocument: unknown,
  originalSource: unknown,
): BackupResult {
  try {
    if (typeof originalSource !== "string" || originalSource.length > MAX_IMPORT_SOURCE_LENGTH)
      return { success: false };
    const document = parseCurrentDocument(previousDocument);
    if (document === null) return { success: false };
    const backup: ImportBackup = { schemaVersion: 1, previousDocument: document, originalSource };
    return JSON.stringify(backup).length <= MAX_IMPORT_BACKUP_LENGTH
      ? { success: true, backup }
      : { success: false };
  } catch {
    return { success: false };
  }
}

function parseImportBackup(input: unknown): BackupResult {
  if (
    typeof input !== "object" ||
    input === null ||
    Object.keys(input).length !== 3 ||
    !Object.hasOwn(input, "schemaVersion") ||
    !("schemaVersion" in input) ||
    input.schemaVersion !== 1 ||
    !Object.hasOwn(input, "previousDocument") ||
    !("previousDocument" in input) ||
    !Object.hasOwn(input, "originalSource") ||
    !("originalSource" in input)
  )
    return { success: false };
  return createImportBackup(input.previousDocument, input.originalSource);
}

/** Reading preserves invalid, future and inaccessible records without rewriting them. */
export function readImportBackup(storage: Pick<Storage, "getItem">): ImportBackupReadResult {
  let serialized: string | null;
  try {
    serialized = storage.getItem(IMPORT_BACKUP_STORAGE_KEY);
  } catch {
    return { status: "unavailable" };
  }
  if (serialized === null) return { status: "empty" };
  if (serialized.length > MAX_IMPORT_BACKUP_LENGTH) return { status: "invalid" };
  try {
    const result = parseImportBackup(JSON.parse(serialized));
    return result.success ? { status: "available", backup: result.backup } : { status: "invalid" };
  } catch {
    return { status: "invalid" };
  }
}

/**
 * The user has confirmed replacement. Save its recovery record first; if the second
 * write fails, the old draft and the new recovery record remain independently usable.
 */
export function replaceProfileDraftWithImport(
  storage: ImportStorage,
  candidate: unknown,
  inputBackup: unknown,
): ImportStorageWriteResult {
  const parsed = parseImportBackup(inputBackup);
  let document: ProfileDocument | null;
  try {
    document = parseCurrentDocument(candidate);
  } catch {
    return { status: "invalid" };
  }
  if (!parsed.success || document === null) return { status: "invalid" };
  const previous = readImportBackup(storage);
  if (previous.status === "invalid" || previous.status === "unavailable")
    return { status: "needs_memory_confirmation", backupPersisted: false };
  const currentDraft = readProfileDraft(storage);
  if (currentDraft.status === "invalid" || currentDraft.status === "unavailable")
    return { status: "needs_memory_confirmation", backupPersisted: false };
  try {
    storage.setItem(IMPORT_BACKUP_STORAGE_KEY, JSON.stringify(parsed.backup));
  } catch {
    return { status: "needs_memory_confirmation", backupPersisted: false };
  }
  return writeProfileDraft(storage, document)
    ? { status: "saved" }
    : { status: "needs_memory_confirmation", backupPersisted: true };
}

/** Restoring never replaces the recovery record with another profile. */
export function restoreProfileDraftFromImportBackup(
  storage: ImportStorage,
  inputBackup: unknown,
): ImportStorageWriteResult {
  const parsed = parseImportBackup(inputBackup);
  if (!parsed.success) return { status: "invalid" };
  const stored = readImportBackup(storage);
  if (
    stored.status !== "available" ||
    JSON.stringify(stored.backup) !== JSON.stringify(parsed.backup)
  )
    return { status: "needs_memory_confirmation", backupPersisted: false };
  const currentDraft = readProfileDraft(storage);
  if (currentDraft.status === "invalid" || currentDraft.status === "unavailable")
    return { status: "needs_memory_confirmation", backupPersisted: true };
  return writeProfileDraft(storage, parsed.backup.previousDocument)
    ? { status: "saved" }
    : { status: "needs_memory_confirmation", backupPersisted: true };
}
