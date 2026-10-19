"use client";

import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { normalizeGitHubUsername } from "@/core/activity/github-username";
import {
  activityErrorCodes,
  activitySnapshotSchema,
  type ActivityErrorCode,
  type ActivitySnapshot,
} from "@/core/activity/activity-types";

const activityResultSchema = z.discriminatedUnion("success", [
  z.strictObject({ success: z.literal(true), data: activitySnapshotSchema, stale: z.boolean() }),
  z.strictObject({
    success: z.literal(false),
    code: z.enum(activityErrorCodes),
    retryAt: z.iso.datetime().optional(),
  }),
]);

type ActivityState =
  | { status: "idle" }
  | { status: "loading"; previous?: ActivitySnapshot }
  | { status: "success"; data: ActivitySnapshot; stale: boolean }
  | {
      status: "error";
      code: ActivityErrorCode;
      retryAt?: string;
      previous?: ActivitySnapshot;
    };

/** Remote snapshots stay in this form; only an explicit query retrieves public activity. */
export function useGitHubActivity(username: string) {
  const normalizedUsername = normalizeGitHubUsername(username);
  const usernameKey = normalizedUsername ?? username.trim().toLowerCase();
  const [result, setResult] = useState<{ username: string; state: ActivityState }>({
    username: usernameKey,
    state: { status: "idle" },
  });
  const request = useRef<{ id: number; controller: AbortController | null }>({
    id: 0,
    controller: null,
  });
  const state: ActivityState = result.username === usernameKey ? result.state : { status: "idle" };

  if (result.username !== usernameKey) {
    setResult({ username: usernameKey, state: { status: "idle" } });
  }

  useEffect(() => {
    const current = request.current;
    return () => {
      current.controller?.abort();
      current.id += 1;
    };
  }, [usernameKey]);

  async function query() {
    request.current.controller?.abort();
    if (!normalizedUsername) {
      request.current.id += 1;
      setResult({ username: usernameKey, state: { status: "error", code: "invalid_username" } });
      return;
    }
    const controller = new AbortController();
    const id = request.current.id + 1;
    request.current.id = id;
    request.current.controller = controller;
    const previous =
      state.status === "success" ? state.data : "previous" in state ? state.previous : undefined;
    setResult({ username: usernameKey, state: { status: "loading", previous } });

    try {
      const response = await fetch(
        `/api/github/activity?${new URLSearchParams({ username: normalizedUsername })}`,
        { signal: controller.signal, cache: "no-store", headers: { Accept: "application/json" } },
      );
      const parsed = activityResultSchema.safeParse(await response.json());
      if (controller.signal.aborted || request.current.id !== id) return;
      if (!parsed.success) throw new Error("Invalid activity response.");
      const value = parsed.data;
      if (value.success) {
        if (value.data.username.toLowerCase() !== usernameKey)
          throw new Error("Activity response belongs to a different account.");
        setResult({
          username: usernameKey,
          state: { status: "success", data: value.data, stale: value.stale },
        });
      } else {
        setResult({
          username: usernameKey,
          state: { status: "error", code: value.code, retryAt: value.retryAt, previous },
        });
      }
    } catch {
      if (controller.signal.aborted || request.current.id !== id) return;
      setResult({
        username: usernameKey,
        state: { status: "error", code: "unavailable", previous },
      });
    }
  }

  return { state, query };
}
