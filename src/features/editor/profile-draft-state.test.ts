import { describe, expect, it } from "vitest";
import { createContributorExampleProfile } from "@/core/profile/fixtures";
import { createEmptyProfile } from "@/core/profile/profile-operations";
import { createImportBackup } from "./import-backup";
import { createProjectBackup } from "./project-backup";
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
    projectBackup: { status: "empty" },
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

describe("project replacement draft transitions", () => {
  function backupFor(state: DraftState) {
    const result = createProjectBackup(state.document);
    if (!result.success) throw new Error("Valid fixture required.");
    return result.backup;
  }

  it("hydrates the project record separately from the Markdown recovery record", () => {
    const previous = readyState();
    const backup = backupFor(previous);
    const next = reduceDraft(createDraftState("en"), {
      type: "hydrated",
      result: { status: "restored", document: previous.document },
      backup: { status: "available", backup: previous.importBackup! },
      projectBackup: { status: "available", backup },
    });
    expect(next.projectBackup).toBe(backup);
    expect(next.projectBackupStatus).toBe("available");
    expect(next.importBackup).toBe(previous.importBackup);
    expect(next.dirty).toBe(false);
    expect(next.revision).toBe(0);
  });

  it.each(["empty", "invalid", "unavailable"] as const)(
    "retains the %s project recovery state without blocking healthy draft editing",
    (status) => {
      const next = reduceDraft(createDraftState("en"), {
        type: "hydrated",
        result: { status: "empty" },
        backup: { status: "empty" },
        projectBackup: { status },
      });
      expect(next.projectBackup).toBeNull();
      expect(next.projectBackupStatus).toBe(status);
      expect(next.recoveryBlocked).toBe(false);
      const edited = reduceDraft(next, {
        type: "updated",
        document: { ...next.document, contentLocale: "es" },
      });
      expect(edited.dirty).toBe(true);
    },
  );

  it("keeps the most recent unsaved profile as recovery data and invalidates old writes", () => {
    const previous = readyState();
    const dirty = reduceDraft(previous, {
      type: "updated",
      document: {
        ...previous.document,
        data: {
          ...previous.document.data,
          presentation: { ...previous.document.data.presentation, bio: "Latest unsaved input" },
        },
      },
    });
    const backup = backupFor(dirty);
    const candidate = createEmptyProfile("en");
    const next = reduceDraft(dirty, {
      type: "project_replaced",
      document: candidate,
      backup,
      memoryOnly: false,
    });
    expect(next.document).toBe(candidate);
    expect(next.projectBackup?.previousDocument.data.presentation.bio).toBe("Latest unsaved input");
    expect(next.importBackup).toBe(previous.importBackup);
    expect(next.importBackupStatus).toBe("available");
    expect(next.revision).toBe(dirty.revision + 1);
    expect(next.dirty).toBe(false);
    expect(next.storageStatus).toBe("saved");
    expect(next.importMemoryOnly).toBe(false);
    expect(reduceDraft(next, { type: "persisted", revision: dirty.revision, success: true })).toBe(
      next,
    );
  });

  it("a failed attempt preserves the current document while canceling pending writes", () => {
    const previous = readyState();
    const dirty = reduceDraft(previous, {
      type: "updated",
      document: { ...previous.document, contentLocale: "en" },
    });
    const backup = backupFor(dirty);
    const next = reduceDraft(dirty, { type: "project_write_blocked", backup });
    expect(next.document).toBe(dirty.document);
    expect(next.projectBackup).toBe(backup);
    expect(next.projectBackupStatus).toBe("available");
    expect(next.importBackup).toBe(previous.importBackup);
    expect(next.importMemoryOnly).toBe(true);
    expect(next.dirty).toBe(false);
    expect(next.revision).toBe(dirty.revision + 1);
    expect(next.storageStatus).toBe("unavailable");
    expect(reduceDraft(next, { type: "persisted", revision: dirty.revision, success: true })).toBe(
      next,
    );
    const edited = reduceDraft(next, {
      type: "updated",
      document: { ...next.document, contentLocale: "es" },
    });
    expect(edited.dirty).toBe(false);
    expect(edited.importMemoryOnly).toBe(true);
  });

  it.each(["invalid", "unavailable"] as const)(
    "does not turn new %s protection into permission to overwrite storage",
    (protection) => {
      const previous = readyState();
      const blocked = reduceDraft(previous, { type: "project_write_blocked", protection });
      const backup = backupFor(previous);
      const next = reduceDraft(blocked, {
        type: "project_replaced",
        document: createEmptyProfile("en"),
        backup,
        memoryOnly: true,
      });
      expect(blocked.document).toBe(previous.document);
      expect(next.storageStatus).toBe(protection);
      expect(next.recoveryBlocked).toBe(true);
      expect(next.importMemoryOnly).toBe(true);
      expect(next.projectBackup).toBe(backup);
      expect(next.importBackup).toBe(previous.importBackup);
      expect(next.dirty).toBe(false);
    },
  );

  it("retains a memory-only replacement and both recovery records across locale navigation", () => {
    const previous = readyState();
    const backup = backupFor(previous);
    const replaced = reduceDraft(previous, {
      type: "project_replaced",
      document: createEmptyProfile("en"),
      backup,
      memoryOnly: true,
    });
    const resumed = reduceDraft(createDraftState("es"), { type: "resumed", state: replaced });
    expect(resumed).toBe(replaced);
    expect(resumed.document.contentLocale).toBe("en");
    expect(resumed.importMemoryOnly).toBe(true);
    expect(resumed.projectBackup).toBe(backup);
    expect(resumed.importBackup).toBe(previous.importBackup);
  });

  it("clearing and Markdown replacements leave the project recovery record intact", () => {
    const initial = readyState();
    const backup = backupFor(initial);
    const previous: DraftState = {
      ...initial,
      projectBackup: backup,
      projectBackupStatus: "available",
    };
    const cleared = reduceDraft(previous, {
      type: "cleared",
      result: { document: createEmptyProfile("es"), status: "saved" },
    });
    const imported = reduceDraft(previous, {
      type: "replaced",
      document: createEmptyProfile("en"),
      backup: previous.importBackup!,
      memoryOnly: false,
    });
    const restarted = reduceDraft(previous, { type: "restarted" });
    for (const next of [cleared, imported, restarted]) {
      expect(next.projectBackup).toBe(backup);
      expect(next.projectBackupStatus).toBe("available");
    }
  });

  it("does not apply project actions before hydration completes", () => {
    const loading = createDraftState("es");
    const backup = backupFor(readyState());
    expect(reduceDraft(loading, { type: "project_write_blocked" })).toBe(loading);
    expect(
      reduceDraft(loading, {
        type: "project_replaced",
        document: createEmptyProfile("en"),
        backup,
        memoryOnly: false,
      }),
    ).toBe(loading);
  });
});
