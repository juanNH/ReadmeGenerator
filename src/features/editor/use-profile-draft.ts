"use client";

import { useEffect, useRef, useState } from "react";
import { createEmptyProfile } from "@/core/profile/profile-operations";
import type { ContentLocale, ProfileDocument } from "@/core/profile/profile-schema";
import { parseProfileDocument } from "@/core/profile/profile-validation";
import { readProfileDraft, writeProfileDraft, type ProfileDraftReadResult } from "./draft-storage";
import {
  createImportBackup,
  readImportBackup,
  replaceProfileDraftWithImport,
  restoreProfileDraftFromImportBackup,
  type ImportBackup,
  type ImportBackupReadResult,
} from "./import-backup";

export type ProfileDraftStorageStatus =
  "new" | "restored" | "saving" | "saved" | "invalid" | "unavailable";

export type ImportBackupStatus = "loading" | ImportBackupReadResult["status"];
export type ImportOperationResult =
  | { status: "saved" }
  | { status: "memory_only" }
  | { status: "needs_memory_confirmation" }
  | { status: "invalid" }
  | { status: "not_ready" };

type DraftState = {
  document: ProfileDocument;
  hydration: "loading" | "ready";
  storageStatus: ProfileDraftStorageStatus;
  recoveryBlocked: boolean;
  dirty: boolean;
  revision: number;
  importBackup: ImportBackup | null;
  importBackupStatus: ImportBackupStatus;
  importMemoryOnly: boolean;
};

// Written only from client effects and events. Keeps unsaved work across navigation in this tab,
// including locale changes, but cannot survive a full reload when browser storage fails.
let inMemoryDraft: DraftState | null = null;

type DraftAction =
  | { type: "hydrated"; result: ProfileDraftReadResult; backup: ImportBackupReadResult }
  | { type: "resumed"; state: DraftState }
  | { type: "updated"; document: ProfileDocument }
  | { type: "persisted"; revision: number; success: boolean }
  | { type: "backup_available"; backup: ImportBackup }
  | {
      type: "replaced";
      document: ProfileDocument;
      backup: ImportBackup;
      memoryOnly: boolean;
    }
  | { type: "restarted" };

function createDraftState(initialLocale: ContentLocale): DraftState {
  return {
    document: createEmptyProfile(initialLocale),
    hydration: "loading",
    storageStatus: "new",
    recoveryBlocked: false,
    dirty: false,
    revision: 0,
    importBackup: null,
    importBackupStatus: "loading",
    importMemoryOnly: false,
  };
}

function reduceDraft(state: DraftState, action: DraftAction): DraftState {
  switch (action.type) {
    case "resumed":
      return state.hydration === "loading" ? action.state : state;
    case "hydrated": {
      if (state.hydration !== "loading") return state;
      const { result } = action;
      return {
        ...state,
        document: result.status === "restored" ? result.document : state.document,
        hydration: "ready",
        storageStatus: result.status === "empty" ? "new" : result.status,
        recoveryBlocked: result.status === "invalid" || result.status === "unavailable",
        importBackup: action.backup.status === "available" ? action.backup.backup : null,
        importBackupStatus: action.backup.status,
      };
    }
    case "updated": {
      if (state.hydration !== "ready" || action.document === state.document) return state;
      const canSave =
        !state.recoveryBlocked && !state.importMemoryOnly && state.storageStatus !== "unavailable";
      return {
        ...state,
        document: action.document,
        dirty: canSave,
        revision: state.revision + 1,
        storageStatus: canSave ? "saving" : state.storageStatus,
      };
    }
    case "persisted":
      if (
        state.revision !== action.revision ||
        !state.dirty ||
        state.recoveryBlocked ||
        state.importMemoryOnly
      ) {
        return state;
      }
      return {
        ...state,
        dirty: false,
        storageStatus: action.success ? "saved" : "unavailable",
      };
    case "backup_available":
      return { ...state, importBackup: action.backup, importBackupStatus: "available" };
    case "replaced":
      return {
        ...state,
        document: action.document,
        importBackup: action.backup,
        importBackupStatus: "available",
        importMemoryOnly: action.memoryOnly,
        dirty: false,
        revision: state.revision + 1,
        // A memory-only import never grants permission to overwrite protected recovery data.
        recoveryBlocked: action.memoryOnly ? state.recoveryBlocked : false,
        storageStatus: action.memoryOnly
          ? state.recoveryBlocked
            ? state.storageStatus
            : "unavailable"
          : "saved",
      };
    case "restarted":
      if (state.hydration !== "ready") return state;
      return {
        ...state,
        document: createEmptyProfile(state.document.contentLocale),
        recoveryBlocked: false,
        dirty: true,
        revision: state.revision + 1,
        storageStatus: "saving",
        importMemoryOnly: false,
      };
  }
}

function rememberDraft(state: DraftState) {
  inMemoryDraft =
    state.hydration === "ready" &&
    (state.dirty ||
      state.recoveryBlocked ||
      state.importMemoryOnly ||
      state.storageStatus === "unavailable")
      ? state
      : null;
}

/** Update the event/flush snapshot synchronously, before React commits the next render. */
function applyDraftAction(
  latestState: { current: DraftState },
  setState: (state: DraftState) => void,
  action: DraftAction,
) {
  const next = reduceDraft(latestState.current, action);
  if (next === latestState.current) return;
  latestState.current = next;
  rememberDraft(next);
  setState(next);
}

function readBrowserDraft(): ProfileDraftReadResult {
  try {
    return readProfileDraft(window.localStorage);
  } catch {
    // The localStorage property itself can throw before the adapter receives it.
    return { status: "unavailable" };
  }
}

function persistBrowserDraft(document: ProfileDocument): boolean {
  try {
    return writeProfileDraft(window.localStorage, document);
  } catch {
    return false;
  }
}

function readBrowserImportBackup(): ImportBackupReadResult {
  try {
    return readImportBackup(window.localStorage);
  } catch {
    return { status: "unavailable" };
  }
}

export type ProfileDraft = {
  document: ProfileDocument;
  updateDocument: (next: ProfileDocument) => void;
  hydration: DraftState["hydration"];
  storageStatus: ProfileDraftStorageStatus;
  recoveryBlocked: boolean;
  importBackup: ImportBackup | null;
  importBackupStatus: ImportBackupStatus;
  importMemoryOnly: boolean;
  /** The caller confirms replacement; a failed durable write never applies the import. */
  replaceWithImport: (
    candidate: ProfileDocument,
    source: string,
    allowMemoryOnly?: boolean,
  ) => ImportOperationResult;
  /** The caller confirms restoration; the recovery record itself stays intact. */
  restoreImportBackup: (allowMemoryOnly?: boolean) => ImportOperationResult;
  /** Call only after the user confirms replacement of their existing draft. */
  startNewDraft: () => void;
};

export function useProfileDraft(initialLocale: ContentLocale): ProfileDraft {
  // The initializer runs only for this editor mount. UI locale changes never translate a draft.
  const [state, setState] = useState(() => createDraftState(initialLocale));
  const latestState = useRef(state);

  useEffect(() => {
    // Keep the first server/client render identical and cancel Strict Mode's discarded read.
    const timer = window.setTimeout(() => {
      if (inMemoryDraft !== null) {
        applyDraftAction(latestState, setState, { type: "resumed", state: inMemoryDraft });
      } else {
        applyDraftAction(latestState, setState, {
          type: "hydrated",
          result: readBrowserDraft(),
          backup: readBrowserImportBackup(),
        });
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (
      state.hydration !== "ready" ||
      state.recoveryBlocked ||
      state.importMemoryOnly ||
      !state.dirty
    )
      return;

    const timer = window.setTimeout(() => {
      // Import, restore or a newer edit may have replaced this render before effect cleanup.
      const latest = latestState.current;
      if (
        latest.revision !== state.revision ||
        !latest.dirty ||
        latest.recoveryBlocked ||
        latest.importMemoryOnly
      )
        return;
      const success = persistBrowserDraft(latest.document);
      applyDraftAction(latestState, setState, {
        type: "persisted",
        revision: latest.revision,
        success,
      });
    }, 500);

    return () => window.clearTimeout(timer);
  }, [state]);

  useEffect(() => {
    function flushPendingDraft() {
      const latest = latestState.current;
      if (
        latest.hydration === "ready" &&
        latest.dirty &&
        !latest.recoveryBlocked &&
        !latest.importMemoryOnly
      ) {
        const success = persistBrowserDraft(latest.document);
        applyDraftAction(latestState, setState, {
          type: "persisted",
          revision: latest.revision,
          success,
        });
      }
    }

    function flushWhenHidden() {
      if (document.visibilityState === "hidden") flushPendingDraft();
    }

    window.addEventListener("pagehide", flushPendingDraft);
    document.addEventListener("visibilitychange", flushWhenHidden);
    return () => {
      window.removeEventListener("pagehide", flushPendingDraft);
      document.removeEventListener("visibilitychange", flushWhenHidden);
      // Locale navigation can unmount the editor before the debounce expires.
      flushPendingDraft();
    };
  }, []);

  function replaceWithImport(
    candidate: ProfileDocument,
    source: string,
    allowMemoryOnly = false,
  ): ImportOperationResult {
    const latest = latestState.current;
    if (latest.hydration !== "ready") return { status: "not_ready" };
    const backup = createImportBackup(latest.document, source);
    const parsed = parseProfileDocument(candidate);
    if (!backup.success || !parsed.success || candidate.schemaVersion !== 2)
      return { status: "invalid" };
    if (!allowMemoryOnly) {
      if (
        latest.recoveryBlocked ||
        latest.importMemoryOnly ||
        latest.storageStatus === "unavailable"
      )
        return { status: "needs_memory_confirmation" };
      try {
        const result = replaceProfileDraftWithImport(
          window.localStorage,
          parsed.data,
          backup.backup,
        );
        if (result.status !== "saved") {
          if (result.status === "needs_memory_confirmation" && result.backupPersisted)
            applyDraftAction(latestState, setState, {
              type: "backup_available",
              backup: backup.backup,
            });
          return { status: result.status };
        }
      } catch {
        return { status: "needs_memory_confirmation" };
      }
    }
    applyDraftAction(latestState, setState, {
      type: "replaced",
      document: parsed.data,
      backup: backup.backup,
      memoryOnly: allowMemoryOnly,
    });
    return { status: allowMemoryOnly ? "memory_only" : "saved" };
  }

  function restoreImportBackup(allowMemoryOnly = false): ImportOperationResult {
    const latest = latestState.current;
    if (latest.hydration !== "ready") return { status: "not_ready" };
    const storedBackup = latest.importBackup;
    if (storedBackup === null) return { status: "invalid" };
    const validatedBackup = createImportBackup(
      storedBackup.previousDocument,
      storedBackup.originalSource,
    );
    if (!validatedBackup.success) return { status: "invalid" };
    const backup = validatedBackup.backup;
    if (!allowMemoryOnly) {
      if (
        latest.recoveryBlocked ||
        latest.importMemoryOnly ||
        latest.storageStatus === "unavailable"
      )
        return { status: "needs_memory_confirmation" };
      try {
        const result = restoreProfileDraftFromImportBackup(window.localStorage, backup);
        if (result.status !== "saved") return { status: result.status };
      } catch {
        return { status: "needs_memory_confirmation" };
      }
    }
    applyDraftAction(latestState, setState, {
      type: "replaced",
      document: backup.previousDocument,
      backup,
      memoryOnly: allowMemoryOnly,
    });
    return { status: allowMemoryOnly ? "memory_only" : "saved" };
  }

  return {
    document: state.document,
    updateDocument: (document) =>
      applyDraftAction(latestState, setState, { type: "updated", document }),
    hydration: state.hydration,
    storageStatus: state.storageStatus,
    recoveryBlocked: state.recoveryBlocked,
    importBackup: state.importBackup,
    importBackupStatus: state.importBackupStatus,
    importMemoryOnly: state.importMemoryOnly,
    replaceWithImport,
    restoreImportBackup,
    startNewDraft: () => applyDraftAction(latestState, setState, { type: "restarted" }),
  };
}
