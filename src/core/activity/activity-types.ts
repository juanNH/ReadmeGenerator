import { z } from "zod";

const countSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const dateSchema = z.iso.date();
const usernameSchema = z
  .string()
  .min(1)
  .max(39)
  .regex(/^[a-z\d](?:[a-z\d]|-(?=[a-z\d]))*$/i);

const highlightUrlSchema = z
  .string()
  .max(500)
  .refine((value) => {
    try {
      const url = new URL(value);
      return (
        url.protocol === "https:" &&
        url.hostname === "github.com" &&
        !url.port &&
        !url.username &&
        !url.password &&
        !url.search &&
        !url.hash &&
        /^\/[a-z\d-]+\/[a-z\d_.-]+\/(?:pull|issues)\/\d+$/i.test(url.pathname)
      );
    } catch {
      return false;
    }
  });

export const activitySnapshotSchema = z.strictObject({
  username: usernameSchema,
  fetchedAt: z.iso.datetime(),
  period: z.strictObject({ from: dateSchema, to: dateSchema }),
  calendar: z.strictObject({
    total: countSchema,
    weeks: z
      .array(
        z.strictObject({
          days: z
            .array(
              z.strictObject({
                date: dateSchema,
                count: countSchema,
                level: z.union([
                  z.literal(0),
                  z.literal(1),
                  z.literal(2),
                  z.literal(3),
                  z.literal(4),
                ]),
              }),
            )
            .max(7),
        }),
      )
      .max(54),
    includesPrivateCounts: z.boolean(),
  }),
  summary: z.strictObject({
    commits: countSchema,
    pullRequests: countSchema,
    issues: countSchema,
    reviews: countSchema,
  }),
  languages: z.strictObject({
    items: z
      .array(
        z.strictObject({
          name: z.string().min(1).max(100),
          bytes: countSchema,
          color: z
            .string()
            .regex(/^#[a-f\d]{6}$/i)
            .nullable(),
        }),
      )
      .max(100),
    repositoriesAnalyzed: countSchema.max(300),
    repositoriesTotal: countSchema,
    truncated: z.boolean(),
  }),
  highlights: z
    .array(
      z.strictObject({
        id: z.string().min(1).max(200),
        title: z.string().max(1000),
        url: highlightUrlSchema,
        kind: z.enum(["pull-request", "issue"]),
        repository: z.string().max(200),
      }),
    )
    .max(100),
});

export type ActivitySnapshot = z.infer<typeof activitySnapshotSchema>;

export const activityErrorCodes = Object.freeze([
  "invalid_username",
  "not_found",
  "not_configured",
  "rate_limited",
  "unavailable",
] as const);

export type ActivityErrorCode = (typeof activityErrorCodes)[number];

export type ActivityResult =
  | { readonly success: true; readonly data: ActivitySnapshot; readonly stale: boolean }
  | { readonly success: false; readonly code: ActivityErrorCode; readonly retryAt?: string };
