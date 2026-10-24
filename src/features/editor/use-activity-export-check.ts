"use client";

import { useEffect, useRef, useState } from "react";
import {
  activityExportCheckResultSchema,
  type ActivityExportCheckResult,
} from "@/core/activity/export-check";

export type ActivityExportCheckState =
  { status: "idle" } | { status: "checking" } | ActivityExportCheckResult;

const VERIFICATION_LIFETIME_MS = 5 * 60 * 1000;

/** Public image availability is checked only through the explicit action. */
export function useActivityExportCheck(sources: readonly string[]) {
  const key = JSON.stringify(sources);
  const [attempt, setAttempt] = useState<{ key: string; state: ActivityExportCheckState }>({
    key,
    state: { status: "idle" },
  });
  const requestRef = useRef<AbortController | null>(null);
  if (attempt.key !== key) {
    setAttempt({ key, state: { status: "idle" } });
  }
  const state: ActivityExportCheckState = attempt.key === key ? attempt.state : { status: "idle" };

  useEffect(() => {
    return () => {
      requestRef.current?.abort();
      requestRef.current = null;
    };
  }, [key]);

  useEffect(() => {
    if (attempt.key !== key || attempt.state.status !== "ready") return;
    const expiry = window.setTimeout(() => {
      setAttempt((current) => (current === attempt ? { key, state: { status: "idle" } } : current));
    }, VERIFICATION_LIFETIME_MS);
    return () => window.clearTimeout(expiry);
  }, [attempt, key]);

  async function check() {
    if (sources.length === 0) return;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setAttempt({ key, state: { status: "checking" } });
    let timedOut = false;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 35_000);
    try {
      const response = await fetch("/api/cards/export-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sources }),
        signal: controller.signal,
      });
      const parsed = activityExportCheckResultSchema.safeParse(await response.json());
      if (controller.signal.aborted) return;
      const result: ActivityExportCheckResult =
        parsed.success && (response.ok || parsed.data.status === "failed")
          ? parsed.data
          : { status: "failed", reason: "invalid_response" };
      setAttempt({ key, state: result });
    } catch {
      if (!controller.signal.aborted || timedOut) {
        setAttempt({
          key,
          state: { status: "failed", reason: timedOut ? "timeout" : "unreachable" },
        });
      }
    } finally {
      window.clearTimeout(timeout);
      if (requestRef.current === controller) requestRef.current = null;
    }
  }

  return { state, check };
}
