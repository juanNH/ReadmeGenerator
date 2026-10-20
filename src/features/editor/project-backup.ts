import { PROJECT_FILE_MAX_BYTES, parseProjectFile, serializeProjectFile } from "@/core/project";
import type { ProfileDocument } from "@/core/profile/profile-schema";
import { readProfileDraft, writeProfileDraft } from "./draft-storage";

export const PROJECT_BACKUP_STORAGE_KEY = "github-profile-generator.project-backup.v1";
/** The project uses its shared 4 MiB budget; the side record adds at most 1 KiB. */
export const PROJECT_BACKUP_MAX_BYTES = PROJECT_FILE_MAX_BYTES + 1024;

/** Independent from the Markdown import backup: this record has no source Markdown. */
export type ProjectBackup = { schemaVersion: 1; previousDocument: ProfileDocument };
export type ProjectBackupReadResult =
  | { status: "empty" }
  | { status: "available"; backup: ProjectBackup }
  | { status: "invalid" }
  | { status: "unavailable" };
export type ProjectStorageWriteResult =
  | { status: "saved" }
  | { status: "invalid" }
  | {
      status: "needs_memory_confirmation";
      backupPersisted: boolean;
      /** Only a failed current-draft read changes draft recovery protection. */
      protection?: "invalid" | "unavailable";
    };
type BackupResult = { success: true; backup: ProjectBackup } | { success: false };
type ProjectStorage = Pick<Storage, "getItem" | "setItem">;

function parseCurrentDocument(input: unknown): ProfileDocument | null {
  try {
    if (
      typeof input !== "object" ||
      input === null ||
      !Object.hasOwn(input, "schemaVersion") ||
      !("schemaVersion" in input) ||
      input.schemaVersion !== 2
    )
      return null;
    const result = parseProjectFile(JSON.stringify(input));
    return result.success && serializeProjectFile(result.document).success ? result.document : null;
  } catch {
    return null;
  }
}

function withinBackupBudget(source: string): boolean {
  return (
    source.length <= PROJECT_BACKUP_MAX_BYTES &&
    new TextEncoder().encode(source).length <= PROJECT_BACKUP_MAX_BYTES
  );
}

/** Copies the latest active profile, retaining all hidden and legacy values. */
export function createProjectBackup(previousDocument: unknown): BackupResult {
  const document = parseCurrentDocument(previousDocument);
  if (document === null) return { success: false };
  const backup: ProjectBackup = { schemaVersion: 1, previousDocument: document };
  return withinBackupBudget(JSON.stringify(backup))
    ? { success: true, backup }
    : { success: false };
}

function parseProjectBackup(input: unknown): BackupResult {
  try {
    if (
      typeof input !== "object" ||
      input === null ||
      Object.keys(input).length !== 2 ||
      !Object.hasOwn(input, "schemaVersion") ||
      !("schemaVersion" in input) ||
      input.schemaVersion !== 1 ||
      !Object.hasOwn(input, "previousDocument") ||
      !("previousDocument" in input)
    )
      return { success: false };
    return createProjectBackup(input.previousDocument);
  } catch {
    return { success: false };
  }
}

/** Reading never rewrites unknown, oversized, corrupt or inaccessible records. */
export function readProjectBackup(storage: Pick<Storage, "getItem">): ProjectBackupReadResult {
  let source: string | null;
  try {
    source = storage.getItem(PROJECT_BACKUP_STORAGE_KEY);
  } catch {
    return { status: "unavailable" };
  }
  if (source === null) return { status: "empty" };
  if (!withinBackupBudget(source)) return { status: "invalid" };
  try {
    const result = parseProjectBackup(JSON.parse(source));
    return result.success ? { status: "available", backup: result.backup } : { status: "invalid" };
  } catch {
    return { status: "invalid" };
  }
}

/** Confirmed opening saves the previous profile before writing the new one. */
export function replaceProfileDraftWithProject(
  storage: ProjectStorage,
  candidate: unknown,
  inputBackup: unknown,
): ProjectStorageWriteResult {
  const parsed = parseProjectBackup(inputBackup);
  const document = parseCurrentDocument(candidate);
  if (!parsed.success || document === null) return { status: "invalid" };
  const previous = readProjectBackup(storage);
  if (previous.status === "invalid" || previous.status === "unavailable")
    return { status: "needs_memory_confirmation", backupPersisted: false };
  const current = readProfileDraft(storage);
  if (current.status === "invalid" || current.status === "unavailable")
    return {
      status: "needs_memory_confirmation",
      backupPersisted: false,
      protection: current.status,
    };
  try {
    storage.setItem(PROJECT_BACKUP_STORAGE_KEY, JSON.stringify(parsed.backup));
  } catch {
    return { status: "needs_memory_confirmation", backupPersisted: false };
  }
  return writeProfileDraft(storage, document)
    ? { status: "saved" }
    : { status: "needs_memory_confirmation", backupPersisted: true };
}

/** Restoring retains the same last recovery record instead of creating a history. */
export function restoreProfileDraftFromProjectBackup(
  storage: ProjectStorage,
  inputBackup: unknown,
): ProjectStorageWriteResult {
  const parsed = parseProjectBackup(inputBackup);
  if (!parsed.success) return { status: "invalid" };
  const stored = readProjectBackup(storage);
  if (
    stored.status !== "available" ||
    JSON.stringify(stored.backup) !== JSON.stringify(parsed.backup)
  )
    return { status: "needs_memory_confirmation", backupPersisted: false };
  const current = readProfileDraft(storage);
  if (current.status === "invalid" || current.status === "unavailable")
    return {
      status: "needs_memory_confirmation",
      backupPersisted: true,
      protection: current.status,
    };
  return writeProfileDraft(storage, parsed.backup.previousDocument)
    ? { status: "saved" }
    : { status: "needs_memory_confirmation", backupPersisted: true };
}
