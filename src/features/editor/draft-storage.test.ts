import { describe, expect, it, vi } from "vitest";
import { createContributorExampleProfile } from "@/core/profile/fixtures";
import { createEmptyProfile } from "@/core/profile/profile-operations";
import { PROFILE_DRAFT_STORAGE_KEY, readProfileDraft, writeProfileDraft } from "./draft-storage";

function createStorage(serialized: string | null = null) {
  const values = new Map<string, string>();
  if (serialized !== null) values.set(PROFILE_DRAFT_STORAGE_KEY, serialized);
  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => values.set(key, value)),
  };
}

describe("profile draft storage", () => {
  it("treats a first visit as empty without creating a stored document", () => {
    const storage = createStorage();
    expect(readProfileDraft(storage)).toEqual({ status: "empty" });
    expect(storage.getItem).toHaveBeenCalledWith(PROFILE_DRAFT_STORAGE_KEY);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it.each(["en", "es"] as const)("round-trips an empty %s profile", (locale) => {
    const document = createEmptyProfile(locale);
    const storage = createStorage();

    expect(writeProfileDraft(storage, document)).toBe(true);
    expect(readProfileDraft(storage)).toEqual({ status: "restored", document });
  });

  it("restores all data, content language, order and hidden sections without writing", () => {
    const document = createContributorExampleProfile();
    document.contentLocale = "es";
    document.moduleOrder.reverse();
    document.visibility.presentation = false;
    const storage = createStorage(JSON.stringify(document));

    expect(readProfileDraft(storage)).toEqual({ status: "restored", document });
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it.each(["", "{broken-json", "null", "[]", "true", "{}", '"a profile"'])(
    "preserves an invalid stored value: %j",
    (serialized) => {
      const storage = createStorage(serialized);
      expect(readProfileDraft(storage)).toEqual({ status: "invalid" });
      expect(storage.getItem(PROFILE_DRAFT_STORAGE_KEY)).toBe(serialized);
      expect(storage.setItem).not.toHaveBeenCalled();
    },
  );

  it("preserves a future version rather than dropping its unknown data", () => {
    const serialized = JSON.stringify({
      ...createEmptyProfile("en"),
      schemaVersion: 2,
      futureProperty: "Keep me",
    });
    const storage = createStorage(serialized);

    expect(readProfileDraft(storage)).toEqual({ status: "invalid" });
    expect(storage.getItem(PROFILE_DRAFT_STORAGE_KEY)).toBe(serialized);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("rejects documents that violate module invariants", () => {
    const document = createEmptyProfile("en");
    document.moduleOrder = [];
    const storage = createStorage(JSON.stringify(document));
    expect(readProfileDraft(storage)).toEqual({ status: "invalid" });
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("reports blocked reads without throwing or attempting a replacement", () => {
    const storage = createStorage();
    storage.getItem.mockImplementation(() => {
      throw new Error("Storage access blocked");
    });
    expect(readProfileDraft(storage)).toEqual({ status: "unavailable" });
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("returns false on a quota failure and preserves the previously saved draft", () => {
    const original = JSON.stringify(createEmptyProfile("es"));
    const storage = createStorage(original);
    storage.setItem.mockImplementation(() => {
      throw new Error("Quota exceeded");
    });

    expect(writeProfileDraft(storage, createContributorExampleProfile())).toBe(false);
    expect(storage.getItem(PROFILE_DRAFT_STORAGE_KEY)).toBe(original);
  });

  it("only replaces an existing draft when a write is explicitly requested", () => {
    const storage = createStorage("corrupt but preserved");
    const document = createEmptyProfile("es");

    expect(readProfileDraft(storage)).toEqual({ status: "invalid" });
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(writeProfileDraft(storage, document)).toBe(true);
    expect(readProfileDraft(storage)).toEqual({ status: "restored", document });
    expect(storage.setItem).toHaveBeenCalledTimes(1);
  });
});
