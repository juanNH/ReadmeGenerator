import { z } from "zod";
import type { ActivityErrorCode } from "./activity-types";
import { normalizeGitHubUsername } from "./github-username";

export const resourceKinds = Object.freeze(["repository", "gist", "wakatime"] as const);
export type ResourceKind = (typeof resourceKinds)[number];

/** Public identifiers only. Hosts, paths, query strings and credentials are never inputs. */
export function normalizeResourceTarget(kind: ResourceKind, raw: string): string | null {
  const value = raw.trim();
  if (kind === "repository") {
    const parts = value.split("/");
    const owner = parts[0] && normalizeGitHubUsername(parts[0]);
    const name = parts[1];
    return parts.length === 2 &&
      owner &&
      name &&
      /^[a-z\d_.-]{1,100}$/i.test(name) &&
      name !== "." &&
      name !== ".." &&
      parts[0] === parts[0]?.trim() &&
      !parts[0]?.startsWith("@")
      ? `${owner}/${name.toLowerCase()}`
      : null;
  }
  if (kind === "gist") return /^[a-f\d]{5,64}$/i.test(value) ? value.toLowerCase() : null;
  return /^[a-z\d_-]{1,64}$/i.test(value) && value.toLowerCase() !== "current"
    ? value.toLowerCase()
    : null;
}

function targetSchema(kind: ResourceKind) {
  return z
    .string()
    .max(140)
    .refine((value) => normalizeResourceTarget(kind, value) === value);
}

export const repositoryTargetSchema = targetSchema("repository");
export const gistTargetSchema = targetSchema("gist");
export const wakaTimeUsernameSchema = targetSchema("wakatime");
export const resourceTargetSchema = z
  .strictObject({ kind: z.enum(resourceKinds), target: z.string().max(140) })
  .refine((value) => normalizeResourceTarget(value.kind, value.target) === value.target, {
    path: ["target"],
  });

const countSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const ownerSchema = z
  .string()
  .min(1)
  .max(39)
  .regex(/^[a-z\d](?:[a-z\d]|-(?=[a-z\d]))*$/i);
const secondsSchema = z
  .number()
  .nonnegative()
  .max(8 * 24 * 60 * 60);
const periodSchema = z.strictObject({ from: z.iso.date(), to: z.iso.date() });

export const resourceSnapshotSchema = z
  .discriminatedUnion("kind", [
    z.strictObject({
      kind: z.literal("repository"),
      target: repositoryTargetSchema,
      fetchedAt: z.iso.datetime(),
      owner: ownerSchema,
      name: z
        .string()
        .min(1)
        .max(100)
        .regex(/^[a-z\d_.-]+$/i),
      description: z.string().max(1000),
      stars: countSchema,
      forks: countSchema,
      language: z
        .strictObject({
          name: z.string().min(1).max(100),
          color: z
            .string()
            .regex(/^#[a-f\d]{6}$/i)
            .nullable(),
        })
        .nullable(),
    }),
    z.strictObject({
      kind: z.literal("gist"),
      target: gistTargetSchema,
      fetchedAt: z.iso.datetime(),
      owner: ownerSchema,
      description: z.string().max(1000),
      files: countSchema,
      comments: countSchema,
      stars: countSchema,
      forks: countSchema,
      language: z
        .strictObject({
          name: z.string().min(1).max(100),
          color: z
            .string()
            .regex(/^#[a-f\d]{6}$/i)
            .nullable(),
        })
        .nullable(),
    }),
    z.strictObject({
      kind: z.literal("wakatime"),
      target: wakaTimeUsernameSchema,
      fetchedAt: z.iso.datetime(),
      range: z.literal("last_7_days"),
      period: periodSchema.optional(),
      languages: z
        .array(
          z.strictObject({
            name: z.string().min(1).max(100),
            seconds: secondsSchema,
            percent: z.number().nonnegative().max(100),
          }),
        )
        .max(100),
      totalSeconds: secondsSchema,
    }),
  ])
  .superRefine((snapshot, context) => {
    if (
      snapshot.kind === "repository" &&
      normalizeResourceTarget("repository", `${snapshot.owner}/${snapshot.name}`) !==
        snapshot.target
    ) {
      context.addIssue({
        code: "custom",
        path: ["target"],
        message: "Repository identity differs.",
      });
    }
    if (snapshot.kind !== "wakatime") return;
    const from = snapshot.period ? Date.parse(`${snapshot.period.from}T00:00:00Z`) : undefined;
    const to = snapshot.period ? Date.parse(`${snapshot.period.to}T00:00:00Z`) : undefined;
    if (from !== undefined && to !== undefined && (from > to || to - from > 8 * 86_400_000)) {
      context.addIssue({ code: "custom", path: ["period"], message: "Invalid seven-day period." });
    }
    const names = new Set<string>();
    let seconds = 0;
    for (const [index, language] of snapshot.languages.entries()) {
      const key = language.name.toLowerCase();
      if (names.has(key)) {
        context.addIssue({
          code: "custom",
          path: ["languages", index, "name"],
          message: "Duplicate language.",
        });
      }
      names.add(key);
      seconds += language.seconds;
    }
    if (seconds > snapshot.totalSeconds + 1) {
      context.addIssue({
        code: "custom",
        path: ["totalSeconds"],
        message: "Languages exceed total time.",
      });
    }
  });

export type ResourceSnapshot = z.infer<typeof resourceSnapshotSchema>;
export type ResourceResult =
  | { readonly success: true; readonly data: ResourceSnapshot; readonly stale: boolean }
  | { readonly success: false; readonly code: ActivityErrorCode; readonly retryAt?: string };
