import { describe, expect, it } from "vitest";
import { extendedStatIds } from "./extended-options";
import type { ExtendedProfileSnapshot } from "./extended-types";
import { renderExtendedProfileCard } from "./render-extended-profile";

function mixedAgeSnapshot(): ExtendedProfileSnapshot {
  return {
    username: "example-dev",
    displayName: "Public fixture",
    fetchedAt: "2026-12-31T23:59:50.000Z",
    period: { from: "2026-01-02", to: "2027-01-01" },
    stats: Object.fromEntries(
      extendedStatIds.map((id) => [id, { value: 9, partial: false, scope: "period" }]),
    ) as ExtendedProfileSnapshot["stats"],
    languages: { items: [], repositoriesAnalyzed: 0, repositoriesTotal: 0, truncated: false },
  };
}

describe("Extended temporal labels with incrementally cached data", () => {
  it.each([
    ["en", "period"],
    ["es", "período"],
  ] as const)(
    "uses the commit interval instead of older snapshot metadata in %s",
    (locale, label) => {
      const svg = renderExtendedProfileCard(mixedAgeSnapshot(), "extended-stats", locale, {
        stale: true,
        extended: { stats: { items: ["commits"], commitsPeriod: "year" } },
      });
      // Row, footnote and accessible description must agree on the implicit year.
      expect(svg).toContain(`${label} · 2027`);
      expect(svg).not.toContain(`${label} · 2026`);
    },
  );

  it("keeps an explicitly selected year ahead of either cached metadata date", () => {
    const svg = renderExtendedProfileCard(mixedAgeSnapshot(), "extended-stats", "en", {
      stale: true,
      extended: { stats: { items: ["commits"], commitsPeriod: "year", year: 2020 } },
    });
    expect(svg).toContain("period · 2020");
    expect(svg).not.toContain("period · 2027");
  });
});
