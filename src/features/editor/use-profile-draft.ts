"use client";

import { useEffect, useReducer, useRef } from "react";
import { createEmptyProfile } from "@/core/profile/profile-operations";
import type { ContentLocale, ProfileDocument } from "@/core/profile/profile-schema";
import { readProfileDraft, writeProfileDraft, type ProfileDraftReadResult } from "./draft-storage";

export type ProfileDraftStorageStatus =
  "new" | "restored" | "saving" | "saved" | "invalid" | "unavailable";

type DraftState = {
  document: ProfileDocument;
  hydration: "loading" | "ready";
  storageStatus: ProfileDraftStorageStatus;
  recoveryBlocked: boolean;
  dirty: boolean;
  revision: number;
};

// Written only from client effects. Keeps unsaved work across client navigation in this tab,
// including locale changes, but cannot survive a full reload when browser storage fails.
let inMemoryDraft: DraftState | null = null;

type DraftAction =
  | { type: "hydrated"; result: ProfileDraftReadResult }
  | { type: "resumed"; state: DraftState }
  | { type: "updated"; document: ProfileDocument }
  | { type: "persisted"; revision: number; success: boolean }
  | { type: "restarted" };

function createDraftState(initialLocale: ContentLocale): DraftState {
  return {
    document: createEmptyProfile(initialLocale),
    hydration: "loading",
    storageStatus: "new",
    recoveryBlocked: false,
    dirty: false,
    revision: 0,
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
      };
    }
    case "updated": {
      if (state.hydration !== "ready" || action.document === state.document) return state;
      const canSave = !state.recoveryBlocked && state.storageStatus !== "unavailable";
      return {
        ...state,
        document: action.document,
        dirty: canSave,
        revision: state.revision + 1,
        storageStatus: canSave ? "saving" : state.storageStatus,
      };
    }
    case "persisted":
      if (state.revision !== action.revision || !state.dirty || state.recoveryBlocked) {
        return state;
      }
      return {
        ...state,
        dirty: false,
        storageStatus: action.success ? "saved" : "unavailable",
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
      };
  }
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

export type ProfileDraft = {
  document: ProfileDocument;
  updateDocument: (next: ProfileDocument) => void;
  hydration: DraftState["hydration"];
  storageStatus: ProfileDraftStorageStatus;
  recoveryBlocked: boolean;
  /** Call only after the user confirms replacement of their existing draft. */
  startNewDraft: () => void;
};

export function useProfileDraft(initialLocale: ContentLocale): ProfileDraft {
  // The initializer runs only for this editor mount. UI locale changes never translate a draft.
  const [state, dispatch] = useReducer(reduceDraft, initialLocale, createDraftState);
  const latestState = useRef(state);

  useEffect(() => {
    latestState.current = state;
    if (state.hydration !== "ready") return;
    if (state.recoveryBlocked || state.storageStatus === "unavailable") {
      inMemoryDraft = state;
    } else if (state.storageStatus === "saved" || state.storageStatus === "restored") {
      inMemoryDraft = null;
    }
  }, [state]);

  useEffect(() => {
    // Keep the first server/client render identical and cancel Strict Mode's discarded read.
    const timer = window.setTimeout(() => {
      if (inMemoryDraft !== null) {
        dispatch({ type: "resumed", state: inMemoryDraft });
      } else {
        dispatch({ type: "hydrated", result: readBrowserDraft() });
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (state.hydration !== "ready" || state.recoveryBlocked || !state.dirty) return;

    const timer = window.setTimeout(() => {
      const success = persistBrowserDraft(state.document);
      inMemoryDraft = success ? null : { ...state, dirty: false, storageStatus: "unavailable" };
      dispatch({ type: "persisted", revision: state.revision, success });
    }, 500);

    return () => window.clearTimeout(timer);
  }, [state]);

  useEffect(() => {
    function flushPendingDraft() {
      const latest = latestState.current;
      if (latest.hydration === "ready" && latest.dirty && !latest.recoveryBlocked) {
        const success = persistBrowserDraft(latest.document);
        latestState.current = {
          ...latest,
          dirty: false,
          storageStatus: success ? "saved" : "unavailable",
        };
        inMemoryDraft = success ? null : latestState.current;
        dispatch({ type: "persisted", revision: latest.revision, success });
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

  return {
    document: state.document,
    updateDocument: (document) => dispatch({ type: "updated", document }),
    hydration: state.hydration,
    storageStatus: state.storageStatus,
    recoveryBlocked: state.recoveryBlocked,
    startNewDraft: () => dispatch({ type: "restarted" }),
  };
}
