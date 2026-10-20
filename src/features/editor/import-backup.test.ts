import { describe, expect, it, vi } from "vitest";
import { createContributorExampleProfile } from "@/core/profile/fixtures";
import { createEmptyProfile, createEmptyProfileV1 } from "@/core/profile/profile-operations";
import { LEGACY_PROFILE_DRAFT_STORAGE_KEY, PROFILE_DRAFT_STORAGE_KEY } from "./draft-storage";
import {
  createImportBackup,
  IMPORT_BACKUP_STORAGE_KEY,
  MAX_IMPORT_BACKUP_LENGTH,
  MAX_IMPORT_SOURCE_LENGTH,
  readImportBackup,
  replaceProfileDraftWithImport,
  restoreProfileDraftFromImportBackup,
} from "./import-backup";

function createStorage() {
  const values = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
    }),
  };
}

function exampleBackup(source = "# Imported\r\n\r\nExact source\n") {
  const previous = createContributorExampleProfile();
  previous.contentLocale = "es";
  previous.visibility.presentation = false;
  previous.sectionOrder.reverse();
  previous.data.knowledge.items = [
    { id: "legacy-item", title: "Hidden legacy content", description: "Preserve me" },
  ];
  const result = createImportBackup(previous, source);
  if (!result.success) throw new Error("The fixture must create a valid recovery record.");
  return result.backup;
}

describe("README import recovery records", () => {
  it("distinguishes the previous full profile from the exact imported source", () => {
    const source = "\ufeff# Imported 💻\r\n\r\n  - two spaces\n<!-- exact -->\r\n";
    const backup = exampleBackup(source);
    const storage = createStorage();
    const candidate = createEmptyProfile("en");
    candidate.data.presentation.displayName = "New imported profile";
    storage.setItem(PROFILE_DRAFT_STORAGE_KEY, JSON.stringify(backup.previousDocument));
    storage.setItem.mockClear();

    expect(replaceProfileDraftWithImport(storage, candidate, backup)).toEqual({ status: "saved" });
    expect(storage.setItem.mock.calls.map(([key]) => key)).toEqual([
      IMPORT_BACKUP_STORAGE_KEY,
      PROFILE_DRAFT_STORAGE_KEY,
    ]);
    expect(readImportBackup(storage)).toEqual({ status: "available", backup });
    expect(JSON.parse(storage.getItem(PROFILE_DRAFT_STORAGE_KEY)!)).toEqual(candidate);
    expect(backup.originalSource).toBe(source);
    expect(backup.previousDocument.visibility.presentation).toBe(false);
    expect(backup.previousDocument.data.knowledge.items[0]?.description).toBe("Preserve me");
  });

  it("copies the live draft without mutating it or sharing nested input objects", () => {
    const previous = createEmptyProfile("en");
    previous.data.presentation.bio = "Before confirmation";
    const result = createImportBackup(previous, "Original");
    expect(result.success).toBe(true);
    previous.data.presentation.bio = "Edited later";
    if (result.success)
      expect(result.backup.previousDocument.data.presentation.bio).toBe("Before confirmation");
  });

  it("reads a missing record without creating a backup or draft", () => {
    const storage = createStorage();
    expect(readImportBackup(storage)).toEqual({ status: "empty" });
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it.each(["", "{broken", "null", "[]", "true", "{}", '"text"'])(
    "preserves invalid backup JSON: %j",
    (serialized) => {
      const storage = createStorage();
      storage.setItem(IMPORT_BACKUP_STORAGE_KEY, serialized);
      storage.setItem.mockClear();
      expect(readImportBackup(storage)).toEqual({ status: "invalid" });
      expect(storage.getItem(IMPORT_BACKUP_STORAGE_KEY)).toBe(serialized);
      expect(storage.setItem).not.toHaveBeenCalled();
      expect(
        replaceProfileDraftWithImport(storage, createEmptyProfile("en"), exampleBackup()),
      ).toEqual({ status: "needs_memory_confirmation", backupPersisted: false });
      expect(storage.setItem).not.toHaveBeenCalled();
    },
  );

  it.each([
    { ...exampleBackup(), schemaVersion: 2 },
    { ...exampleBackup(), extraProperty: "Unknown data" },
    { ...exampleBackup(), originalSource: null },
    { ...exampleBackup(), previousDocument: createEmptyProfileV1("en") },
    {
      ...exampleBackup(),
      previousDocument: { ...createEmptyProfile("en"), sectionOrder: [] },
    },
  ])("rejects incompatible records without replacing them", (input) => {
    const storage = createStorage();
    const original = JSON.stringify(input);
    storage.setItem(IMPORT_BACKUP_STORAGE_KEY, original);
    storage.setItem.mockClear();
    expect(readImportBackup(storage)).toEqual({ status: "invalid" });
    expect(storage.getItem(IMPORT_BACKUP_STORAGE_KEY)).toBe(original);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("bounds source and serialized recovery data before exposing them", () => {
    const previous = createEmptyProfile("en");
    expect(createImportBackup(previous, "x".repeat(MAX_IMPORT_SOURCE_LENGTH)).success).toBe(true);
    expect(createImportBackup(previous, "x".repeat(MAX_IMPORT_SOURCE_LENGTH + 1))).toEqual({
      success: false,
    });
    previous.data.presentation.bio = "x".repeat(MAX_IMPORT_BACKUP_LENGTH);
    expect(createImportBackup(previous, "source")).toEqual({ success: false });
    const storage = createStorage();
    const oversized = "x".repeat(MAX_IMPORT_BACKUP_LENGTH + 1);
    storage.setItem(IMPORT_BACKUP_STORAGE_KEY, oversized);
    storage.setItem.mockClear();
    expect(readImportBackup(storage)).toEqual({ status: "invalid" });
    expect(storage.getItem(IMPORT_BACKUP_STORAGE_KEY)).toBe(oversized);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("does not replace the current draft if the backup cannot be stored", () => {
    const storage = createStorage();
    const backup = exampleBackup();
    const original = JSON.stringify(backup.previousDocument);
    storage.setItem(PROFILE_DRAFT_STORAGE_KEY, original);
    storage.setItem.mockClear();
    storage.setItem.mockImplementation(() => {
      throw new Error("Quota exceeded");
    });
    expect(replaceProfileDraftWithImport(storage, createEmptyProfile("en"), backup)).toEqual({
      status: "needs_memory_confirmation",
      backupPersisted: false,
    });
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(storage.setItem.mock.calls[0]?.[0]).toBe(IMPORT_BACKUP_STORAGE_KEY);
    expect(storage.getItem(PROFILE_DRAFT_STORAGE_KEY)).toBe(original);
  });

  it("keeps the previous draft and readable backup when the candidate write fails", () => {
    const storage = createStorage();
    const backup = exampleBackup();
    const original = JSON.stringify(backup.previousDocument);
    const legacy = JSON.stringify(createEmptyProfileV1("es"));
    storage.setItem(PROFILE_DRAFT_STORAGE_KEY, original);
    storage.setItem(LEGACY_PROFILE_DRAFT_STORAGE_KEY, legacy);
    const save = storage.setItem.getMockImplementation()!;
    storage.setItem.mockImplementation((key, value) => {
      if (key === PROFILE_DRAFT_STORAGE_KEY) throw new Error("Second write exceeded quota");
      save(key, value);
    });
    expect(replaceProfileDraftWithImport(storage, createEmptyProfile("en"), backup)).toEqual({
      status: "needs_memory_confirmation",
      backupPersisted: true,
    });
    expect(storage.getItem(PROFILE_DRAFT_STORAGE_KEY)).toBe(original);
    expect(storage.getItem(LEGACY_PROFILE_DRAFT_STORAGE_KEY)).toBe(legacy);
    expect(readImportBackup(storage)).toEqual({ status: "available", backup });
  });

  it("reports inaccessible side records without attempting writes", () => {
    const storage = createStorage();
    storage.getItem.mockImplementation(() => {
      throw new Error("Storage access blocked");
    });
    expect(readImportBackup(storage)).toEqual({ status: "unavailable" });
    expect(
      replaceProfileDraftWithImport(storage, createEmptyProfile("en"), exampleBackup()),
    ).toEqual({ status: "needs_memory_confirmation", backupPersisted: false });
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("protects a current draft that became invalid after recovery", () => {
    const storage = createStorage();
    const backup = exampleBackup();
    const invalidCurrent = "Invalid value from another tab";
    storage.setItem(PROFILE_DRAFT_STORAGE_KEY, invalidCurrent);
    storage.setItem.mockClear();
    expect(replaceProfileDraftWithImport(storage, createEmptyProfile("en"), backup)).toEqual({
      status: "needs_memory_confirmation",
      backupPersisted: false,
    });
    expect(storage.setItem).not.toHaveBeenCalled();
    storage.setItem(IMPORT_BACKUP_STORAGE_KEY, JSON.stringify(backup));
    storage.setItem.mockClear();
    expect(restoreProfileDraftFromImportBackup(storage, backup)).toEqual({
      status: "needs_memory_confirmation",
      backupPersisted: true,
    });
    expect(storage.getItem(PROFILE_DRAFT_STORAGE_KEY)).toBe(invalidCurrent);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("rejects an invalid candidate before writing either record", () => {
    const storage = createStorage();
    expect(replaceProfileDraftWithImport(storage, { schemaVersion: 99 }, exampleBackup())).toEqual({
      status: "invalid",
    });
    expect(
      replaceProfileDraftWithImport(storage, createEmptyProfileV1("en"), exampleBackup()),
    ).toEqual({ status: "invalid" });
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("replaces only the last valid side record after a subsequent explicit import", () => {
    const storage = createStorage();
    const first = exampleBackup("First import");
    const second = exampleBackup("Second import");
    storage.setItem(IMPORT_BACKUP_STORAGE_KEY, JSON.stringify(first));
    expect(replaceProfileDraftWithImport(storage, createEmptyProfile("en"), second)).toEqual({
      status: "saved",
    });
    expect(readImportBackup(storage)).toEqual({ status: "available", backup: second });
  });

  it("restores the previous full profile without replacing its source or recovery record", () => {
    const storage = createStorage();
    const backup = exampleBackup();
    const sourceRecord = JSON.stringify(backup);
    storage.setItem(IMPORT_BACKUP_STORAGE_KEY, sourceRecord);
    storage.setItem(PROFILE_DRAFT_STORAGE_KEY, JSON.stringify(createEmptyProfile("en")));
    storage.setItem.mockClear();
    expect(restoreProfileDraftFromImportBackup(storage, backup)).toEqual({ status: "saved" });
    expect(storage.setItem.mock.calls.map(([key]) => key)).toEqual([PROFILE_DRAFT_STORAGE_KEY]);
    expect(storage.getItem(IMPORT_BACKUP_STORAGE_KEY)).toBe(sourceRecord);
    expect(JSON.parse(storage.getItem(PROFILE_DRAFT_STORAGE_KEY)!)).toEqual(
      backup.previousDocument,
    );
    expect(restoreProfileDraftFromImportBackup(storage, backup)).toEqual({ status: "saved" });
    expect(storage.getItem(IMPORT_BACKUP_STORAGE_KEY)).toBe(sourceRecord);
  });

  it("asks for a memory fallback if the side record changed or became corrupt", () => {
    const storage = createStorage();
    const backup = exampleBackup("Original record");
    const changed = JSON.stringify(exampleBackup("Another tab changed the record"));
    storage.setItem(IMPORT_BACKUP_STORAGE_KEY, changed);
    storage.setItem.mockClear();
    expect(restoreProfileDraftFromImportBackup(storage, backup)).toEqual({
      status: "needs_memory_confirmation",
      backupPersisted: false,
    });
    expect(storage.getItem(IMPORT_BACKUP_STORAGE_KEY)).toBe(changed);
    expect(storage.setItem).not.toHaveBeenCalled();
    storage.setItem(IMPORT_BACKUP_STORAGE_KEY, "corrupt");
    storage.setItem.mockClear();
    expect(restoreProfileDraftFromImportBackup(storage, backup)).toEqual({
      status: "needs_memory_confirmation",
      backupPersisted: false,
    });
    expect(storage.getItem(IMPORT_BACKUP_STORAGE_KEY)).toBe("corrupt");
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("leaves both records intact when restoring encounters quota failure", () => {
    const storage = createStorage();
    const backup = exampleBackup();
    const serialized = JSON.stringify(backup);
    const current = JSON.stringify(createEmptyProfile("en"));
    storage.setItem(IMPORT_BACKUP_STORAGE_KEY, serialized);
    storage.setItem(PROFILE_DRAFT_STORAGE_KEY, current);
    storage.setItem.mockImplementation(() => {
      throw new Error("Quota exceeded");
    });
    expect(restoreProfileDraftFromImportBackup(storage, backup)).toEqual({
      status: "needs_memory_confirmation",
      backupPersisted: true,
    });
    expect(storage.getItem(IMPORT_BACKUP_STORAGE_KEY)).toBe(serialized);
    expect(storage.getItem(PROFILE_DRAFT_STORAGE_KEY)).toBe(current);
  });
});
