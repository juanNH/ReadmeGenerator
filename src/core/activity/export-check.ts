import { z } from "zod";

export const activityExportCheckFailureReasonSchema = z.enum([
  "not_configured",
  "protected",
  "incompatible",
  "unavailable",
  "invalid_response",
  "unreachable",
  "timeout",
  "busy",
  "invalid_request",
]);

export type ActivityExportCheckFailureReason = z.infer<
  typeof activityExportCheckFailureReasonSchema
>;

/** A temporary check of the public URLs, never part of ProfileDocument. */
export const activityExportCheckResultSchema = z.discriminatedUnion("status", [
  z.strictObject({ status: z.literal("ready"), stale: z.boolean() }),
  z.strictObject({
    status: z.literal("failed"),
    reason: activityExportCheckFailureReasonSchema,
  }),
]);

export type ActivityExportCheckResult = z.infer<typeof activityExportCheckResultSchema>;
