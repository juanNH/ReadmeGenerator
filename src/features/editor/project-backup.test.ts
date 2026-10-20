import { describe, expect, it, vi } from "vitest";
import { PROJECT_FILE_MAX_BYTES, serializeProjectFile } from "@/core/project";
import { createContributorExampleProfile } from "@/core/profile/fixtures";
import { createEmptyProfile, createEmptyProfileV1 } from "@/core/profile/profile-operations";
import { LEGACY_PROFILE_DRAFT_STORAGE_KEY, PROFILE_DRAFT_STORAGE_KEY } from "./draft-storage";
import { IMPORT_BACKUP_STORAGE_KEY } from "./import-backup";
import {
  createProjectBackup,
  PROJECT_BACKUP_MAX_BYTES,
  PROJECT_BACKUP_STORAGE_KEY,
  readProjectBackup,
  replaceProfileDraftWithProject,
  restoreProfileDraftFromProjectBackup,
} from "./project-backup";

function createStorage() {
  const values = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
    }),
  };
}

function exampleBackup() {
  const previous = createContributorExampleProfile();
  previous.contentLocale = "es";
  previous.visibility.presentation = false;
  previous.sectionOrder.reverse();
  previous.data.knowledge.items = [
    { id: "legacy-item", title: "Hidden legacy content", description: "Preserve me" },
  ];
  previous.customSections = [
    {
      id: "custom-source",
      title: "Unpublished",
      visible: false,
      blocks: [
        { id: "literal-source", type: "code", source: "\ufeff💻\r\n  source\r\n", language: "" },
      ],
    },
  ];
  previous.sectionOrder.push({ kind: "custom", sectionId: "custom-source" });
  const result = createProjectBackup(previous);
  if (!result.success) throw new Error("The fixture must produce a valid project recovery record.");
  return result.backup;
}

describe("project recovery records", () => {
  it("keeps a recovery record whose authored tree exceeds the project complexity budget", () => {
    const storage = createStorage();
    const previous = createEmptyProfile("en");
    const source = JSON.stringify({
      schemaVersion: 1,
      previousDocument: {
        ...previous,
        data: {
          ...previous.data,
          contact: { links: Array.from({ length: 50_001 }, () => "incompatible") },
        },
      },
    });
    storage.setItem(PROJECT_BACKUP_STORAGE_KEY, source);
    storage.setItem.mockClear();
    expect(readProjectBackup(storage)).toEqual({ status: "invalid" });
    expect(storage.getItem(PROJECT_BACKUP_STORAGE_KEY)).toBe(source);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("backs up the complete active profile before replacing the draft", () => {
    const storage = createStorage();
    const backup = exampleBackup();
    const candidate = createEmptyProfile("en");
    candidate.data.presentation.displayName = "Opened project";
    storage.setItem(PROFILE_DRAFT_STORAGE_KEY, JSON.stringify(backup.previousDocument));
    const legacy = JSON.stringify(createEmptyProfileV1("es"));
    storage.setItem(LEGACY_PROFILE_DRAFT_STORAGE_KEY, legacy);
    const markdownBackup = '{"invalid-but-protected":"exact source"}';
    storage.setItem(IMPORT_BACKUP_STORAGE_KEY, markdownBackup);
    storage.setItem.mockClear();

    expect(replaceProfileDraftWithProject(storage, candidate, backup)).toEqual({ status: "saved" });
    expect(storage.setItem.mock.calls.map(([key]) => key)).toEqual([
      PROJECT_BACKUP_STORAGE_KEY,
      PROFILE_DRAFT_STORAGE_KEY,
    ]);
    expect(readProjectBackup(storage)).toEqual({ status: "available", backup });
    expect(JSON.parse(storage.getItem(PROFILE_DRAFT_STORAGE_KEY)!)).toEqual(candidate);
    expect(storage.getItem(IMPORT_BACKUP_STORAGE_KEY)).toBe(markdownBackup);
    expect(storage.getItem(LEGACY_PROFILE_DRAFT_STORAGE_KEY)).toBe(legacy);
    expect(backup.previousDocument.visibility.presentation).toBe(false);
    expect(backup.previousDocument.data.knowledge.items[0]?.description).toBe("Preserve me");
    expect(backup.previousDocument.customSections[0]?.blocks[0]).toMatchObject({
      source: "\ufeff💻\r\n  source\r\n",
    });
    expect(serializeProjectFile(backup.previousDocument).success).toBe(true);
    expect(Object.keys(backup)).toEqual(["schemaVersion", "previousDocument"]);
  });

  it("copies the live draft so subsequent edits cannot mutate recovery data", () => {
    const previous = createEmptyProfile("en");
    previous.data.presentation.bio = "Before confirmation";
    const result = createProjectBackup(previous);
    expect(result.success).toBe(true);
    previous.data.presentation.bio = "Edited afterward";
    if (result.success)
      expect(result.backup.previousDocument.data.presentation.bio).toBe("Before confirmation");
  });

  it("reads an absent backup without writing any record", () => {
    const storage = createStorage();
    expect(readProjectBackup(storage)).toEqual({ status: "empty" });
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it.each(["", "{broken", "null", "[]", "true", "{}", '"text"'])(
    "protects invalid stored JSON %j",
    (source) => {
      const storage = createStorage();
      storage.setItem(PROJECT_BACKUP_STORAGE_KEY, source);
      storage.setItem.mockClear();
      expect(readProjectBackup(storage)).toEqual({ status: "invalid" });
      expect(
        replaceProfileDraftWithProject(storage, createEmptyProfile("en"), exampleBackup()),
      ).toEqual({
        status: "needs_memory_confirmation",
        backupPersisted: false,
      });
      expect(storage.getItem(PROJECT_BACKUP_STORAGE_KEY)).toBe(source);
      expect(storage.setItem).not.toHaveBeenCalled();
    },
  );

  it.each([
    { ...exampleBackup(), schemaVersion: 2 },
    { ...exampleBackup(), extraProperty: "Unknown" },
    { ...exampleBackup(), originalSource: "This is not a Markdown backup" },
    { ...exampleBackup(), previousDocument: createEmptyProfileV1("en") },
    { ...exampleBackup(), previousDocument: { ...createEmptyProfile("en"), sectionOrder: [] } },
  ])("keeps incompatible records intact", (input) => {
    const storage = createStorage();
    const source = JSON.stringify(input);
    storage.setItem(PROJECT_BACKUP_STORAGE_KEY, source);
    storage.setItem.mockClear();
    expect(readProjectBackup(storage)).toEqual({ status: "invalid" });
    expect(storage.getItem(PROJECT_BACKUP_STORAGE_KEY)).toBe(source);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("shares the project UTF-8 budget and allows only its explicit envelope overhead", () => {
    expect(PROJECT_BACKUP_MAX_BYTES).toBe(PROJECT_FILE_MAX_BYTES + 1024);
    const previous = createEmptyProfile("en");
    previous.data.presentation.bio = "💻".repeat(PROJECT_FILE_MAX_BYTES / 4);
    expect(createProjectBackup(previous)).toEqual({ success: false });
    const storage = createStorage();
    const oversized = '"' + "💻".repeat(PROJECT_BACKUP_MAX_BYTES / 4) + '"';
    expect(oversized.length).toBeLessThan(PROJECT_BACKUP_MAX_BYTES);
    storage.setItem(PROJECT_BACKUP_STORAGE_KEY, oversized);
    storage.setItem.mockClear();
    expect(readProjectBackup(storage)).toEqual({ status: "invalid" });
    expect(storage.getItem(PROJECT_BACKUP_STORAGE_KEY)).toBe(oversized);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("accepts an incomplete README project without enabling its export", () => {
    const previous = createEmptyProfile("en");
    previous.data.contact.links = [{ id: "unfinished-link", label: "Work", url: "https://" }];
    expect(createProjectBackup(previous).success).toBe(true);
  });

  it("keeps the draft unchanged if the recovery record write fails", () => {
    const storage = createStorage();
    const backup = exampleBackup();
    const previous = JSON.stringify(backup.previousDocument);
    storage.setItem(PROFILE_DRAFT_STORAGE_KEY, previous);
    storage.setItem.mockClear();
    storage.setItem.mockImplementation(() => {
      throw new Error("Quota exceeded");
    });
    expect(replaceProfileDraftWithProject(storage, createEmptyProfile("en"), backup)).toEqual({
      status: "needs_memory_confirmation",
      backupPersisted: false,
    });
    expect(storage.getItem(PROFILE_DRAFT_STORAGE_KEY)).toBe(previous);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(storage.setItem.mock.calls[0]?.[0]).toBe(PROJECT_BACKUP_STORAGE_KEY);
  });

  it("retains the readable recovery record and old draft when the second write fails", () => {
    const storage = createStorage();
    const backup = exampleBackup();
    const previous = JSON.stringify(backup.previousDocument);
    storage.setItem(PROFILE_DRAFT_STORAGE_KEY, previous);
    const save = storage.setItem.getMockImplementation()!;
    storage.setItem.mockImplementation((key, value) => {
      if (key === PROFILE_DRAFT_STORAGE_KEY) throw new Error("Candidate quota exceeded");
      save(key, value);
    });
    expect(replaceProfileDraftWithProject(storage, createEmptyProfile("en"), backup)).toEqual({
      status: "needs_memory_confirmation",
      backupPersisted: true,
    });
    expect(storage.getItem(PROFILE_DRAFT_STORAGE_KEY)).toBe(previous);
    expect(readProjectBackup(storage)).toEqual({ status: "available", backup });
  });

  it("does not write when a side record cannot be read", () => {
    const storage = createStorage();
    storage.getItem.mockImplementation(() => {
      throw new Error("Storage blocked");
    });
    expect(readProjectBackup(storage)).toEqual({ status: "unavailable" });
    expect(
      replaceProfileDraftWithProject(storage, createEmptyProfile("en"), exampleBackup()),
    ).toEqual({
      status: "needs_memory_confirmation",
      backupPersisted: false,
    });
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it.each(["invalid", "unavailable"] as const)(
    "protects a current draft that became %s after hydration",
    (status) => {
      const storage = createStorage();
      storage.setItem(PROFILE_DRAFT_STORAGE_KEY, "Unrecognized stored value");
      const get = storage.getItem.getMockImplementation()!;
      if (status === "unavailable")
        storage.getItem.mockImplementation((key) => {
          if (key === PROFILE_DRAFT_STORAGE_KEY) throw new Error("Draft read blocked");
          return get(key);
        });
      storage.setItem.mockClear();
      expect(
        replaceProfileDraftWithProject(storage, createEmptyProfile("en"), exampleBackup()),
      ).toEqual({
        status: "needs_memory_confirmation",
        backupPersisted: false,
        protection: status,
      });
      expect(storage.setItem).not.toHaveBeenCalled();
    },
  );

  it.each([
    { schemaVersion: 99 },
    createEmptyProfileV1("en"),
    { ...createEmptyProfile("en"), extra: true },
  ])("rejects an invalid candidate without writing either key", (candidate) => {
    const storage = createStorage();
    expect(replaceProfileDraftWithProject(storage, candidate, exampleBackup())).toEqual({
      status: "invalid",
    });
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("replaces only the previous valid project record on a later confirmed opening", () => {
    const storage = createStorage();
    const first = exampleBackup();
    storage.setItem(PROJECT_BACKUP_STORAGE_KEY, JSON.stringify(first));
    const second = createProjectBackup(createEmptyProfile("en"));
    if (!second.success) throw new Error("Valid fixture required.");
    expect(replaceProfileDraftWithProject(storage, first.previousDocument, second.backup)).toEqual({
      status: "saved",
    });
    expect(readProjectBackup(storage)).toEqual({ status: "available", backup: second.backup });
  });

  it("restores without changing either backup or the legacy draft", () => {
    const storage = createStorage();
    const backup = exampleBackup();
    const source = JSON.stringify(backup);
    const legacy = JSON.stringify(createEmptyProfileV1("es"));
    const markdown = "Protected original Markdown record";
    storage.setItem(PROJECT_BACKUP_STORAGE_KEY, source);
    storage.setItem(LEGACY_PROFILE_DRAFT_STORAGE_KEY, legacy);
    storage.setItem(IMPORT_BACKUP_STORAGE_KEY, markdown);
    storage.setItem(PROFILE_DRAFT_STORAGE_KEY, JSON.stringify(createEmptyProfile("en")));
    storage.setItem.mockClear();
    expect(restoreProfileDraftFromProjectBackup(storage, backup)).toEqual({ status: "saved" });
    expect(storage.setItem.mock.calls.map(([key]) => key)).toEqual([PROFILE_DRAFT_STORAGE_KEY]);
    expect(storage.getItem(PROJECT_BACKUP_STORAGE_KEY)).toBe(source);
    expect(storage.getItem(IMPORT_BACKUP_STORAGE_KEY)).toBe(markdown);
    expect(storage.getItem(LEGACY_PROFILE_DRAFT_STORAGE_KEY)).toBe(legacy);
    expect(JSON.parse(storage.getItem(PROFILE_DRAFT_STORAGE_KEY)!)).toEqual(
      backup.previousDocument,
    );
  });

  it("protects a backup changed by another tab before restoration", () => {
    const storage = createStorage();
    const backup = exampleBackup();
    const changed = JSON.stringify({ ...backup, previousDocument: createEmptyProfile("en") });
    storage.setItem(PROJECT_BACKUP_STORAGE_KEY, changed);
    storage.setItem.mockClear();
    expect(restoreProfileDraftFromProjectBackup(storage, backup)).toEqual({
      status: "needs_memory_confirmation",
      backupPersisted: false,
    });
    expect(storage.getItem(PROJECT_BACKUP_STORAGE_KEY)).toBe(changed);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("retains both records if restoring encounters quota failure", () => {
    const storage = createStorage();
    const backup = exampleBackup();
    const source = JSON.stringify(backup);
    const current = JSON.stringify(createEmptyProfile("en"));
    storage.setItem(PROJECT_BACKUP_STORAGE_KEY, source);
    storage.setItem(PROFILE_DRAFT_STORAGE_KEY, current);
    storage.setItem.mockImplementation(() => {
      throw new Error("Quota exceeded");
    });
    expect(restoreProfileDraftFromProjectBackup(storage, backup)).toEqual({
      status: "needs_memory_confirmation",
      backupPersisted: true,
    });
    expect(storage.getItem(PROJECT_BACKUP_STORAGE_KEY)).toBe(source);
    expect(storage.getItem(PROFILE_DRAFT_STORAGE_KEY)).toBe(current);
  });
});
