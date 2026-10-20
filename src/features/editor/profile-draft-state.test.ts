import { describe, expect, it } from "vitest";
import { createContributorExampleProfile } from "@/core/profile/fixtures";
import { createEmptyProfile } from "@/core/profile/profile-operations";
import { createImportBackup } from "./import-backup";
import { createDraftState, reduceDraft, type DraftState } from "./profile-draft-state";

function readyState(): DraftState {
  const profile = createContributorExampleProfile();
  profile.contentLocale = "es";
  const backup = createImportBackup(createEmptyProfile("en"), "# Exact original\r\n");
  if (!backup.success) throw new Error("The fixture must produce a valid backup.");
  return reduceDraft(createDraftState("en"), {
    type: "hydrated",
    result: { status: "restored", document: profile },
    backup: { status: "available", backup: backup.backup },
  });
}

describe("cleared profile draft transitions", () => {
  it("preserves the draft content language and import backup after clearing", () => {
    const previous = readyState();
    const dirty = reduceDraft(previous, {
      type: "updated",
      document: {
        ...previous.document,
        data: {
          ...previous.document.data,
          presentation: { ...previous.document.data.presentation, bio: "An unsaved edit" },
        },
      },
    });
    const next = reduceDraft(dirty, {
      type: "cleared",
      result: { status: "saved", document: createEmptyProfile(dirty.document.contentLocale) },
    });

    expect(next.document).toEqual(createEmptyProfile("es"));
    expect(next.importBackup).toBe(previous.importBackup);
    expect(next.importBackupStatus).toBe("available");
    expect(next.storageStatus).toBe("saved");
    expect(next.dirty).toBe(false);
    expect(next.revision).toBe(dirty.revision + 1);
    expect(dirty.document.data.presentation.bio).toBe("An unsaved edit");
  });

  it("invalidates previous persistence completions and leaves no pending draft to flush", () => {
    const previous = readyState();
    const dirty = reduceDraft(previous, {
      type: "updated",
      document: { ...previous.document, contentLocale: "en" },
    });
    const next = reduceDraft(dirty, {
      type: "cleared",
      result: { status: "saved", document: createEmptyProfile("en") },
    });

    expect(next.dirty).toBe(false);
    expect(next.revision).not.toBe(dirty.revision);
    expect(reduceDraft(next, { type: "persisted", revision: dirty.revision, success: true })).toBe(
      next,
    );
    expect(reduceDraft(next, { type: "persisted", revision: dirty.revision, success: false })).toBe(
      next,
    );
    expect(reduceDraft(next, { type: "persisted", revision: next.revision, success: false })).toBe(
      next,
    );
  });

  it.each(["invalid", "unavailable"] as const)(
    "retains %s recovery protection and keeps subsequent edits in memory",
    (storageStatus) => {
      const previous: DraftState = {
        ...readyState(),
        recoveryBlocked: true,
        storageStatus,
        dirty: true,
      };
      const next = reduceDraft(previous, {
        type: "cleared",
        result: { status: "memory_only", document: createEmptyProfile("es") },
      });
      const edited = reduceDraft(next, {
        type: "updated",
        document: { ...next.document, contentLocale: "en" },
      });

      expect(next.recoveryBlocked).toBe(true);
      expect(next.storageStatus).toBe(storageStatus);
      expect(next.dirty).toBe(false);
      expect(next.importBackup).toBe(previous.importBackup);
      expect(edited.recoveryBlocked).toBe(true);
      expect(edited.storageStatus).toBe(storageStatus);
      expect(edited.dirty).toBe(false);
    },
  );

  it("retains memory-only import mode rather than enabling autosave", () => {
    const previous: DraftState = {
      ...readyState(),
      importMemoryOnly: true,
      storageStatus: "unavailable",
    };
    const next = reduceDraft(previous, {
      type: "cleared",
      result: { status: "memory_only", document: createEmptyProfile("es") },
    });

    expect(next.importMemoryOnly).toBe(true);
    expect(next.storageStatus).toBe("unavailable");
    expect(next.dirty).toBe(false);
    const edited = reduceDraft(next, {
      type: "updated",
      document: { ...next.document, contentLocale: "en" },
    });
    expect(edited.dirty).toBe(false);
  });

  it.each(["invalid", "unavailable"] as const)(
    "protects storage that became %s after hydration",
    (protection) => {
      const previous = readyState();
      const next = reduceDraft(previous, {
        type: "cleared",
        result: { status: "memory_only", protection, document: createEmptyProfile("es") },
      });

      expect(next.recoveryBlocked).toBe(true);
      expect(next.storageStatus).toBe(protection);
      expect(next.dirty).toBe(false);
      expect(next.revision).toBe(previous.revision + 1);
      expect(next.importBackup).toBe(previous.importBackup);
    },
  );

  it("reports a failed durable write and prevents further autosaves from reviving data", () => {
    const previous = readyState();
    const next = reduceDraft(previous, {
      type: "cleared",
      result: { status: "memory_only", document: createEmptyProfile("es") },
    });
    expect(next.recoveryBlocked).toBe(false);
    expect(next.storageStatus).toBe("unavailable");
    expect(next.dirty).toBe(false);
    expect(next.importBackup).toBe(previous.importBackup);
    const edited = reduceDraft(next, {
      type: "updated",
      document: { ...next.document, contentLocale: "en" },
    });
    expect(edited.dirty).toBe(false);
  });

  it("does not apply clear before hydration completes", () => {
    const state = createDraftState("es");
    expect(
      reduceDraft(state, {
        type: "cleared",
        result: { status: "saved", document: createEmptyProfile("es") },
      }),
    ).toBe(state);
  });

  it("keeps explicit recovery restart separate from clearing protected content", () => {
    const previous: DraftState = {
      ...readyState(),
      recoveryBlocked: true,
      importMemoryOnly: true,
      storageStatus: "invalid",
    };
    const next = reduceDraft(previous, { type: "restarted" });
    expect(next.document).toEqual(createEmptyProfile("es"));
    expect(next.recoveryBlocked).toBe(false);
    expect(next.importMemoryOnly).toBe(false);
    expect(next.storageStatus).toBe("saving");
    expect(next.dirty).toBe(true);
    expect(next.importBackup).toBe(previous.importBackup);
  });
});
