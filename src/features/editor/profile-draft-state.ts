import { createEmptyProfile } from "@/core/profile/profile-operations";
import type { ContentLocale, ProfileDocument } from "@/core/profile/profile-schema";
import type { ProfileDraftReadResult } from "./draft-storage";
import type { ImportBackup, ImportBackupReadResult } from "./import-backup";
import type { ClearProfileDraftResult } from "./clear-profile-draft";
export type ProfileDraftStorageStatus =
  "new" | "restored" | "saving" | "saved" | "invalid" | "unavailable";

export type ImportBackupStatus = "loading" | ImportBackupReadResult["status"];
export type DraftState = {
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

export type DraftAction =
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
  | { type: "cleared"; result: ClearProfileDraftResult }
  | { type: "restarted" };

export function createDraftState(initialLocale: ContentLocale): DraftState {
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

export function reduceDraft(state: DraftState, action: DraftAction): DraftState {
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
    case "cleared": {
      if (state.hydration !== "ready") return state;
      const { result } = action;
      return {
        ...state,
        document: result.document,
        dirty: false,
        revision: state.revision + 1,
        recoveryBlocked: state.recoveryBlocked || result.protection !== undefined,
        storageStatus:
          result.status === "saved"
            ? "saved"
            : state.recoveryBlocked
              ? state.storageStatus
              : (result.protection ?? "unavailable"),
      };
    }
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
