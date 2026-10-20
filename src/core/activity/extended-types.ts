import { z } from "zod";
import type { ActivityErrorCode } from "./activity-types";
import { extendedStatIds } from "./extended-options";

const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const extendedMetricSchema = z.strictObject({
  value: z.number().finite().nonnegative().max(Number.MAX_SAFE_INTEGER).nullable(),
  scope: z.enum(["period", "lifetime", "snapshot"]),
  partial: z.boolean(),
});

export const extendedProfileSnapshotSchema = z.strictObject({
  username: z
    .string()
    .min(1)
    .max(39)
    .regex(/^[a-z\d](?:[a-z\d]|-(?=[a-z\d]))*$/i),
  displayName: z.string().min(1).max(200),
  fetchedAt: z.iso.datetime(),
  period: z.strictObject({ from: z.iso.date(), to: z.iso.date() }),
  stats: z.record(z.enum(extendedStatIds), extendedMetricSchema),
  languages: z.strictObject({
    items: z
      .array(
        z.strictObject({
          name: z.string().min(1).max(100),
          bytes: count,
          repositoryCount: count.max(300),
          color: z
            .string()
            .regex(/^#[a-f\d]{6}$/i)
            .nullable(),
        }),
      )
      .max(100),
    repositoriesAnalyzed: count.max(300),
    repositoriesTotal: count,
    truncated: z.boolean(),
  }),
});

export type ExtendedMetric = z.infer<typeof extendedMetricSchema>;
export type ExtendedProfileSnapshot = z.infer<typeof extendedProfileSnapshotSchema>;
export type ExtendedProfileResult =
  | { success: true; data: ExtendedProfileSnapshot; stale: boolean }
  | { success: false; code: ActivityErrorCode; retryAt?: string };
