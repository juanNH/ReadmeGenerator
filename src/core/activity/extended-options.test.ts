import { describe, expect, it } from "vitest";
import {
  extendedLanguageOptionsSchema,
  extendedOptionsSchema,
  extendedStatsOptionsSchema,
  resourceCardOptionsSchema,
} from "./extended-options";

describe("Extended persisted options", () => {
  it("preserves absent choices without enabling ranking or inserting defaults", () => {
    expect(extendedOptionsSchema.parse({})).toEqual({});
    expect(extendedStatsOptionsSchema.parse({ items: ["commits"] })).toEqual({
      items: ["commits"],
    });
    expect(extendedLanguageOptionsSchema.parse({})).toEqual({});
  });

  it.each([
    { items: [] },
    { items: ["commits", "commits"] },
    { items: ["skill"] },
    { repositories: ["octocat/repo", "OctoCat/Repo"] },
    { roles: [] },
    { roles: ["OWNER", "OWNER"] },
    { owners: ["octocat", "other OR is:private"] },
    { repositories: ["https://github.com/octocat/repo"] },
    { year: 2007 },
    { year: 2101 },
    { theme: "arbitrary" },
  ])("rejects unrepresentable or unsafe statistic choices: %j", (options) => {
    expect(extendedStatsOptionsSchema.safeParse(options).success).toBe(false);
  });

  it("allows either language weight but rejects a zero total", () => {
    expect(extendedLanguageOptionsSchema.safeParse({ sizeWeight: 0, countWeight: 1 }).success).toBe(
      true,
    );
    expect(extendedLanguageOptionsSchema.safeParse({ sizeWeight: 1, countWeight: 0 }).success).toBe(
      true,
    );
    expect(extendedLanguageOptionsSchema.safeParse({ sizeWeight: 0 }).success).toBe(false);
    expect(extendedLanguageOptionsSchema.safeParse({ sizeWeight: 0, countWeight: 0 }).success).toBe(
      false,
    );
  });

  it("requires an explicit contributor only when repository counters are selected", () => {
    expect(resourceCardOptionsSchema.safeParse({ contributionStats: [] }).success).toBe(true);
    expect(
      resourceCardOptionsSchema.safeParse({ contributionStats: ["authoredIssues"] }).success,
    ).toBe(false);
    expect(
      resourceCardOptionsSchema.parse({
        contributionUsername: "octocat",
        contributionStats: ["authoredIssues"],
      }),
    ).toEqual({ contributionUsername: "octocat", contributionStats: ["authoredIssues"] });
  });

  it.each([
    { repositories: Array.from({ length: 13 }, (_, index) => `octocat/repo-${index}`) },
    { gists: ["abcde", "ABCDE"] },
    { gists: ["https://gist.github.com/octocat/abcde"] },
    { wakatimeUsername: "current" },
    { wakatimeUsername: "CURRENT" },
    { wakatimeUsername: "person?api_key=secret" },
    {
      resourceOptions: {
        contributionUsername: "octocat",
        contributionStats: ["authoredIssues", "authoredIssues"],
      },
    },
  ])("rejects resource aliases, injected endpoints and ambiguous targets: %j", (options) => {
    expect(extendedOptionsSchema.safeParse(options).success).toBe(false);
  });
});
