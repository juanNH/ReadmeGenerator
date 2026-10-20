import { describe, expect, it } from "vitest";
import { extendedFilterKey, extendedMetricKey } from "@/core/activity/extended-data-plan";
import { parseActivityDataRecord } from "./activity-data-record";

const now = Date.parse("2026-10-20T12:00:00Z");
function row() {
  return {
    key: "extended:sample-dev:2026-10-20:metric:followers",
    value: {
      kind: "metric",
      fetchedAt: "2026-10-20T12:00:00.000Z",
      stale: false,
      day: "2026-10-20",
      username: "sample-dev",
      displayName: "Public person",
      period: { from: "2025-10-20", to: "2026-10-20" },
      data: { value: 0, scope: "snapshot", partial: false },
    },
  };
}
const record = (entries: unknown[]) => ({ version: 1, entries });

describe("versioned disposable activity records", () => {
  it("round-trips validated public fields with their original dates and real zero", () => {
    expect(parseActivityDataRecord(record([row()]), now)).toEqual(record([row()]));
  });
  it("rejects malformed versions, unsupported envelope properties and oversized caches", () => {
    expect(parseActivityDataRecord({ version: 2, entries: [row()] }, now).entries).toEqual([]);
    expect(
      parseActivityDataRecord({ ...record([row()]), authorization: "never persisted" }, now)
        .entries,
    ).toEqual([]);
    expect(parseActivityDataRecord(record(Array.from({ length: 513 }, row)), now).entries).toEqual(
      [],
    );
    expect(
      parseActivityDataRecord(record([{ ...row(), extra: "x".repeat(8 * 1024 * 1024) }]), now)
        .entries,
    ).toEqual([]);
  });
  it("drops invalid rows, SVGs, errors and credentials without discarding valid siblings", () => {
    const invalid = [
      { ...row(), value: { ...row().value, token: "never persisted" } },
      { ...row(), value: { ...row().value, svg: "<svg/>" } },
      { ...row(), value: { ...row().value, kind: "error", code: "unavailable" } },
      {
        ...row(),
        value: { ...row().value, data: { value: -1, partial: false, scope: "snapshot" } },
      },
    ];
    expect(parseActivityDataRecord(record([...invalid, row()]), now)).toEqual(record([row()]));
  });
  it("validates username, kind, dates, canonical filters and derived-field keys", () => {
    const invalidKeys = [
      "extended:another-dev:2026-10-20:metric:followers",
      "extended:sample-dev:2026-10-20:languages:followers",
      "extended:sample-dev:2026-99-99:metric:followers",
      "extended:sample-dev:2026-10-20:metric:mergedPullRequestPercentage",
      'extended:sample-dev:2026-10-20:metric:["stars","bad filter"]',
      "resource:repository:owner/repo",
      "basic:sample-dev:2026-10-20",
    ];
    for (const key of invalidKeys)
      expect(parseActivityDataRecord(record([{ ...row(), key }]), now).entries).toEqual([]);
    const options = {
      owners: ["another-owner"],
      roles: ["COLLABORATOR"] as const,
      commitsPeriod: "year" as const,
      year: 2024,
    };
    const valid = {
      ...row(),
      key: `extended:sample-dev:2026-10-20:metric:${extendedMetricKey("commits", { ...options, roles: [...options.roles] }, new Date(now))}`,
    };
    expect(parseActivityDataRecord(record([valid]), now).entries).toHaveLength(1);
    const invalid = { ...valid, key: valid.key.replace("collaborator", "administrator") };
    expect(parseActivityDataRecord(record([invalid]), now).entries).toEqual([]);
  });
  it("validates complete language samples and effective repository filters", () => {
    const language = {
      ...row(),
      key: `extended:sample-dev:2026-10-20:languages:${extendedFilterKey({}, true)}`,
      value: {
        ...row().value,
        kind: "languages",
        data: { items: [], repositoriesAnalyzed: 0, repositoriesTotal: 0, truncated: false },
      },
    };
    expect(parseActivityDataRecord(record([language]), now).entries).toHaveLength(1);
    expect(
      parseActivityDataRecord(
        record([{ ...language, key: language.key.replace("owner", "invalid") }]),
        now,
      ).entries,
    ).toEqual([]);
  });
  it("retains at most 24 hours without rejuvenating stale fields and tolerates small clock skew", () => {
    const original = row();
    expect(parseActivityDataRecord(record([original]), now + 31 * 60_000)).toEqual(
      record([original]),
    );
    expect(parseActivityDataRecord(record([original]), now + 24 * 60 * 60_000).entries).toEqual([]);
    expect(parseActivityDataRecord(record([original]), now - 1_000).entries).toHaveLength(1);
    expect(parseActivityDataRecord(record([original]), now - 6_000).entries).toEqual([]);
  });
  it("keeps one canonical entry for duplicate keys", () => {
    expect(parseActivityDataRecord(record([row(), row()]), now).entries).toHaveLength(1);
  });
});
