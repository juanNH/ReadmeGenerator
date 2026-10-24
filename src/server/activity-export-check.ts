import "server-only";

import { z } from "zod";
import { parseActivityCardUrl } from "@/core/activity";
import { parseResourceCardUrl } from "@/core/activity/resource-urls";
import type {
  ActivityExportCheckFailureReason,
  ActivityExportCheckResult,
} from "@/core/activity/export-check";
import { getPublicActivityBaseUrl } from "./github/activity-service";

const maximumBodyBytes = 512 * 1024;
const maximumCards = 32;
const maximumConcurrentHeads = 4;
const maximumChecksPerMinute = 12;
const maximumHeadsPerMinute = 60;
const bodyReadTimeoutMs = 5_000;
const headTimeoutMs = 15_000;
const checkTimeoutMs = 30_000;

const inputSchema = z.strictObject({
  sources: z.array(z.string().min(1).max(12_000)).min(1).max(maximumCards),
});

// These bounds apply to this process, independently from the provider scheduler.
// Only one check can own the four outbound slots; there is no unbounded queue.
let activeCheck = false;
let minuteStartedAt = 0;
let checksThisMinute = 0;
let headsThisMinute = 0;

function failed(reason: ActivityExportCheckFailureReason): ActivityExportCheckResult {
  return { status: "failed", reason };
}

function refreshMinute() {
  const now = Date.now();
  if (now - minuteStartedAt >= 60_000 || now < minuteStartedAt) {
    minuteStartedAt = now;
    checksThisMinute = 0;
    headsThisMinute = 0;
  }
}

/** Read only bounded UTF-8 JSON; neither Content-Length nor client timing is trusted. */
async function readInput(request: Request): Promise<unknown> {
  const type = request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
  const length = request.headers.get("content-length");
  if (
    type !== "application/json" ||
    (length !== null && (!/^\d+$/.test(length) || Number(length) > maximumBodyBytes)) ||
    !request.body ||
    request.signal.aborted
  )
    return null;

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  let cancelled = false;
  const cancel = () => {
    cancelled = true;
    void reader.cancel().catch(() => {});
  };
  const timer = setTimeout(cancel, bodyReadTimeoutMs);
  request.signal.addEventListener("abort", cancel, { once: true });
  try {
    while (!cancelled) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maximumBodyBytes) {
        cancel();
        return null;
      }
      chunks.push(value);
    }
    if (cancelled) return null;
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
  } catch {
    cancel();
    return null;
  } finally {
    clearTimeout(timer);
    request.signal.removeEventListener("abort", cancel);
    reader.releaseLock();
  }
}

function classifyResponse(response: Response): ActivityExportCheckResult {
  if (response.status >= 300 && response.status < 400) return failed("protected");
  if (response.status === 400 || response.status === 404) return failed("incompatible");
  if (response.status === 401 || response.status === 403) return failed("protected");
  if (response.status !== 200) return failed("unavailable");
  const type = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
  if (type !== "image/svg+xml") return failed("invalid_response");
  const state = response.headers.get("x-activity-state");
  if (state === "unavailable") return failed("unavailable");
  if (state !== "ready" && state !== "stale") return failed("invalid_response");
  return { status: "ready", stale: state === "stale" };
}

async function checkSource(source: string, signal: AbortSignal) {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, headTimeoutMs);
  try {
    const response = await fetch(source, {
      method: "HEAD",
      credentials: "omit",
      redirect: "manual",
      cache: "no-store",
      headers: { Accept: "image/svg+xml" },
      signal: AbortSignal.any([signal, controller.signal]),
    });
    // HEAD should have no body. Discard an unexpected one without reading it.
    void response.body?.cancel().catch(() => {});
    return classifyResponse(response);
  } catch {
    return failed(timedOut ? "timeout" : "unreachable");
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Check only exact images emitted by our generators at the configured origin.
 * No incoming header, credential, body, redirect target or arbitrary host is forwarded.
 */
export async function checkActivityCardExport(
  input: unknown,
  signal?: AbortSignal,
): Promise<ActivityExportCheckResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return failed("invalid_request");
  const origin = getPublicActivityBaseUrl();
  if (!origin) return failed("not_configured");
  if (
    parsed.data.sources.some(
      (source) => !parseActivityCardUrl(source, origin) && !parseResourceCardUrl(source, origin),
    )
  )
    return failed("invalid_request");
  if (signal?.aborted) return failed("unreachable");

  refreshMinute();
  if (activeCheck || checksThisMinute >= maximumChecksPerMinute) return failed("busy");
  checksThisMinute++;
  activeCheck = true;
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, checkTimeoutMs);
  const combinedSignal = signal ? AbortSignal.any([controller.signal, signal]) : controller.signal;
  const sources = [...new Set(parsed.data.sources)];
  let cursor = 0;
  let failure: ActivityExportCheckResult | null = null;
  let stale = false;

  async function worker() {
    while (!failure && !combinedSignal.aborted && cursor < sources.length) {
      refreshMinute();
      if (headsThisMinute >= maximumHeadsPerMinute) {
        failure = failed("busy");
        controller.abort();
        return;
      }
      const source = sources[cursor++]!;
      headsThisMinute++;
      const result = await checkSource(source, combinedSignal);
      if (failure) return;
      if (result.status === "failed") {
        failure = timedOut ? failed("timeout") : result;
        controller.abort();
        return;
      }
      stale ||= result.stale;
    }
  }

  try {
    await Promise.all(
      Array.from({ length: Math.min(maximumConcurrentHeads, sources.length) }, worker),
    );
    if (failure) return failure;
    if (combinedSignal.aborted) return failed(timedOut ? "timeout" : "unreachable");
    return { status: "ready", stale };
  } finally {
    clearTimeout(timer);
    controller.abort();
    activeCheck = false;
  }
}

export async function checkActivityExportRequest(request: Request) {
  return checkActivityCardExport(await readInput(request), request.signal);
}
