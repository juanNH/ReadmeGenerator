import { describe, expect, it, vi } from "vitest";
import { createContributorExampleProfile } from "@/core/profile/fixtures";
import { createEmptyProfile, createEmptyProfileV1 } from "@/core/profile/profile-operations";
import { clearProfileDraft } from "./clear-profile-draft";
import { LEGACY_PROFILE_DRAFT_STORAGE_KEY, PROFILE_DRAFT_STORAGE_KEY } from "./draft-storage";
import { IMPORT_BACKUP_STORAGE_KEY } from "./import-backup";

function createStorage() {
  const values = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => values.set(key, value)),
  };
}

describe("clearing the active README draft", () => {
  it.each(["en", "es"] as const)(
    "persists an entirely empty %s profile without replacing legacy or recovery records",
    (locale) => {
      const previous = createContributorExampleProfile();
      previous.contentLocale = locale;
      previous.visibility.presentation = false;
      previous.customSections = [
        {
          id: "hidden-custom",
          title: "Hidden source",
          visible: false,
          blocks: [{ id: "private-code", type: "code", source: "Keep no code", language: "json" }],
        },
      ];
      previous.sectionOrder.push({ kind: "custom", sectionId: "hidden-custom" });
      previous.data.knowledge.items = [
        { id: "retired", title: "Legacy", description: "Clear retired content too" },
      ];
      const original = JSON.stringify(previous);
      const storage = createStorage();
      const legacy = JSON.stringify(createEmptyProfileV1("es"));
      const backup = "Preserve this import backup byte for byte";
      storage.setItem(PROFILE_DRAFT_STORAGE_KEY, original);
      storage.setItem(LEGACY_PROFILE_DRAFT_STORAGE_KEY, legacy);
      storage.setItem(IMPORT_BACKUP_STORAGE_KEY, backup);
      storage.setItem.mockClear();

      const result = clearProfileDraft(locale, () => storage, false);

      expect(result).toEqual({ status: "saved", document: createEmptyProfile(locale) });
      expect(JSON.parse(storage.getItem(PROFILE_DRAFT_STORAGE_KEY)!)).toEqual(
        createEmptyProfile(locale),
      );
      expect(storage.getItem(LEGACY_PROFILE_DRAFT_STORAGE_KEY)).toBe(legacy);
      expect(storage.getItem(IMPORT_BACKUP_STORAGE_KEY)).toBe(backup);
      expect(storage.setItem.mock.calls.map(([key]) => key)).toEqual([PROFILE_DRAFT_STORAGE_KEY]);
      expect(JSON.stringify(previous)).toBe(original);
    },
  );

  it("creates only the current v2 key after an explicitly confirmed clear on a first visit", () => {
    const storage = createStorage();
    expect(clearProfileDraft("en", () => storage, false).status).toBe("saved");
    expect(storage.setItem.mock.calls).toEqual([
      [PROFILE_DRAFT_STORAGE_KEY, JSON.stringify(createEmptyProfile("en"))],
    ]);
  });

  it("writes an empty v2 draft while preserving a valid migrated v1 document", () => {
    const storage = createStorage();
    const legacy = createEmptyProfileV1("en");
    legacy.data.presentation.displayName = "Old legacy content";
    const serialized = JSON.stringify(legacy);
    storage.setItem(LEGACY_PROFILE_DRAFT_STORAGE_KEY, serialized);
    storage.setItem.mockClear();

    expect(clearProfileDraft("es", () => storage, false).status).toBe("saved");
    expect(storage.getItem(LEGACY_PROFILE_DRAFT_STORAGE_KEY)).toBe(serialized);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(JSON.parse(storage.getItem(PROFILE_DRAFT_STORAGE_KEY)!)).toEqual(
      createEmptyProfile("es"),
    );
  });

  it("does not even access storage when recovery protection or memory-only mode is active", () => {
    const getStorage = vi.fn(() => createStorage());

    expect(clearProfileDraft("es", getStorage, true)).toEqual({
      status: "memory_only",
      document: createEmptyProfile("es"),
    });
    expect(getStorage).not.toHaveBeenCalled();
  });

  it.each(["{broken", JSON.stringify({ ...createEmptyProfile("en"), schemaVersion: 3 })])(
    "protects a current draft that became invalid after hydration: %s",
    (original) => {
      const storage = createStorage();
      storage.setItem(PROFILE_DRAFT_STORAGE_KEY, original);
      storage.setItem.mockClear();

      expect(clearProfileDraft("es", () => storage, false)).toEqual({
        status: "memory_only",
        protection: "invalid",
        document: createEmptyProfile("es"),
      });
      expect(storage.getItem(PROFILE_DRAFT_STORAGE_KEY)).toBe(original);
      expect(storage.setItem).not.toHaveBeenCalled();
    },
  );

  it("does not use an invalid legacy record as permission to write a new v2 draft", () => {
    const storage = createStorage();
    storage.setItem(LEGACY_PROFILE_DRAFT_STORAGE_KEY, "broken legacy backup");
    storage.setItem.mockClear();

    expect(clearProfileDraft("es", () => storage, false).protection).toBe("invalid");
    expect(storage.getItem(PROFILE_DRAFT_STORAGE_KEY)).toBeNull();
    expect(storage.getItem(LEGACY_PROFILE_DRAFT_STORAGE_KEY)).toBe("broken legacy backup");
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("preserves the current draft and reports memory-only after a quota failure", () => {
    const storage = createStorage();
    const original = JSON.stringify(createContributorExampleProfile());
    storage.setItem(PROFILE_DRAFT_STORAGE_KEY, original);
    storage.setItem.mockImplementation(() => {
      throw new Error("Quota exceeded");
    });

    expect(clearProfileDraft("en", () => storage, false)).toEqual({
      status: "memory_only",
      document: createEmptyProfile("en"),
    });
    expect(storage.getItem(PROFILE_DRAFT_STORAGE_KEY)).toBe(original);
  });

  it("preserves storage when the read throws", () => {
    const storage = createStorage();
    storage.getItem.mockImplementation(() => {
      throw new Error("Storage blocked");
    });

    expect(clearProfileDraft("en", () => storage, false)).toEqual({
      status: "memory_only",
      protection: "unavailable",
      document: createEmptyProfile("en"),
    });
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("reports memory-only when the browser storage property itself throws", () => {
    expect(
      clearProfileDraft(
        "en",
        () => {
          throw new Error("localStorage getter blocked");
        },
        false,
      ),
    ).toEqual({
      status: "memory_only",
      protection: "unavailable",
      document: createEmptyProfile("en"),
    });
  });
});
