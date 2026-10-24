import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ActivityExportCheckResult } from "@/core/activity/export-check";

const { check } = vi.hoisted(() => ({ check: vi.fn() }));
vi.mock("@/server/activity-export-check", () => ({ checkActivityExportRequest: check }));

import { POST } from "./route";

beforeEach(() => check.mockReset());

describe("export card check route", () => {
  it.each<[ActivityExportCheckResult, number]>([
    [{ status: "ready", stale: false }, 200],
    [{ status: "failed", reason: "protected" }, 200],
    [{ status: "failed", reason: "invalid_request" }, 400],
    [{ status: "failed", reason: "busy" }, 503],
  ])("returns bounded serializable status without caching: %j", async (result, status) => {
    check.mockResolvedValue(result);
    const request = new Request("https://editor.example.com/api/cards/export-check", {
      method: "POST",
    });
    const response = await POST(request);
    expect(check).toHaveBeenCalledWith(request);
    expect(response.status).toBe(status);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(await response.json()).toEqual(result);
  });
});
