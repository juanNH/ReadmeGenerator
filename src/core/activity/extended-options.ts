import { z } from "zod";

export const extendedStatIds = [
  "stars",
  "commits",
  "pullRequests",
  "issues",
  "reviews",
  "repositoriesContributedTo",
  "allTimeContributions",
  "allTimeRepositoriesContributedTo",
  "discussionsStarted",
  "discussionsAnswered",
  "mergedPullRequests",
  "mergedPullRequestPercentage",
  "authoredPullRequests",
  "commentedPullRequests",
  "reviewedPullRequests",
  "authoredIssues",
  "commentedIssues",
  "followers",
] as const;
export type ExtendedStatId = (typeof extendedStatIds)[number];
export const defaultExtendedStats: readonly ExtendedStatId[] = [
  "stars",
  "commits",
  "pullRequests",
  "issues",
  "reviews",
  "repositoriesContributedTo",
];

const repositoryName = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z\d_.-]+$/i)
  .refine((value) => value !== "." && value !== "..");
const ownerName = z
  .string()
  .min(1)
  .max(39)
  .regex(/^[a-z\d](?:[a-z\d]|-(?=[a-z\d]))*$/i);
const repositoryTarget = z
  .string()
  .max(140)
  .refine((value) => {
    const parts = value.split("/");
    return (
      parts.length === 2 &&
      ownerName.safeParse(parts[0]).success &&
      repositoryName.safeParse(parts[1]).success
    );
  });
const stringList = <T extends z.ZodType<string>>(schema: T, max = 20) =>
  z
    .array(schema)
    .max(max)
    .refine((values) => new Set(values.map((value) => value.toLowerCase())).size === values.length);
export const repositoryRoles = ["OWNER", "ORGANIZATION_MEMBER", "COLLABORATOR"] as const;
const filters = {
  repositories: stringList(repositoryTarget).optional(),
  owners: stringList(ownerName).optional(),
  roles: z
    .array(z.enum(repositoryRoles))
    .min(1)
    .max(3)
    .refine((values) => new Set(values).size === values.length)
    .optional(),
  excludeRepositories: stringList(repositoryName).optional(),
};

export const extendedStatsOptionsSchema = z.strictObject({
  items: z
    .array(z.enum(extendedStatIds))
    .min(1)
    .max(extendedStatIds.length)
    .refine((values) => new Set(values).size === values.length)
    .optional(),
  commitsPeriod: z.enum(["period", "year", "all"]).optional(),
  year: z.number().int().min(2008).max(2100).optional(),
  includeOwnRepositories: z.boolean().optional(),
  showRank: z.boolean().optional(),
  rankIcon: z.enum(["letter", "percentile", "github"]).optional(),
  ...filters,
});
export type ExtendedStatsOptions = z.infer<typeof extendedStatsOptionsSchema>;

export const extendedLanguageOptionsSchema = z
  .strictObject({
    layout: z.enum(["normal", "compact", "donut", "donut-vertical", "pie"]).optional(),
    count: z.number().int().min(1).max(20).optional(),
    format: z.enum(["percentages", "bytes"]).optional(),
    hidden: stringList(z.string().min(1).max(100)).optional(),
    hideProgress: z.boolean().optional(),
    hideValues: z.boolean().optional(),
    sizeWeight: z.number().min(0).max(2).optional(),
    countWeight: z.number().min(0).max(2).optional(),
    ...filters,
  })
  .refine((value) => (value.sizeWeight ?? 1) + (value.countWeight ?? 0) > 0, {
    path: ["countWeight"],
    message: "At least one language weight must be positive.",
  });
export type ExtendedLanguageOptions = z.infer<typeof extendedLanguageOptionsSchema>;

export const repositoryContributionStatIds = [
  "authoredPullRequests",
  "commentedPullRequests",
  "reviewedPullRequests",
  "authoredIssues",
  "commentedIssues",
] as const;
export const resourceCardOptionsSchema = z
  .strictObject({
    contributionUsername: ownerName.optional(),
    contributionStats: z
      .array(z.enum(repositoryContributionStatIds))
      .max(5)
      .refine((values) => new Set(values).size === values.length)
      .optional(),
    showOwner: z.boolean().optional(),
    descriptionLines: z.number().int().min(1).max(3).optional(),
    displayFormat: z.enum(["time", "percent"]).optional(),
    languageCount: z.number().int().min(1).max(20).optional(),
    hideProgress: z.boolean().optional(),
    hideLanguages: stringList(z.string().min(1).max(100)).optional(),
    layout: z.enum(["default", "compact"]).optional(),
  })
  .refine((value) => !value.contributionStats?.length || !!value.contributionUsername, {
    path: ["contributionUsername"],
    message: "A public username is required for repository contribution counters.",
  });
export type ResourceCardOptions = z.infer<typeof resourceCardOptionsSchema>;

export const extendedOptionsSchema = z.strictObject({
  stats: extendedStatsOptionsSchema.optional(),
  languages: extendedLanguageOptionsSchema.optional(),
  repositories: stringList(repositoryTarget, 12).optional(),
  gists: stringList(
    z
      .string()
      .min(5)
      .max(64)
      .regex(/^[a-f\d]+$/i),
    12,
  ).optional(),
  wakatimeUsername: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z\d_-]+$/i)
    .refine((value) => value.toLowerCase() !== "current")
    .optional(),
  resourceOptions: resourceCardOptionsSchema.optional(),
});
export type ExtendedOptions = z.infer<typeof extendedOptionsSchema>;
