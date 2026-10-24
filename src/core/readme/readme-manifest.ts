import {
  sectionReferenceSchema,
  type ProfileDocument,
  type SectionReference,
} from "../profile/profile-schema";
import { parseProfileDocument } from "../profile/profile-validation";

export const README_MANIFEST_FORMAT = "github-profile-generator";
export const README_MANIFEST_VERSION = 1;
export const README_MANIFEST_MAX_LENGTH = 100_000;
export const README_MANIFEST_MAX_SOURCE_LENGTH = 200_000;

const markerPrefix = "<!-- github-profile-generator:manifest:v";
const valueLimit = 50_000;
const depthLimit = 32;

export type ReadmeManifestSection = SectionReference & {
  readonly start: number;
  readonly end: number;
};

export type ReadmeManifest = {
  readonly format: typeof README_MANIFEST_FORMAT;
  readonly version: typeof README_MANIFEST_VERSION;
  readonly bodyLength: number;
  readonly bodyFingerprint: string;
  readonly sections: readonly ReadmeManifestSection[];
  readonly recoverySnapshot?: ProfileDocument;
};

export type ReadmeManifestParseResult =
  | { readonly status: "absent"; readonly markdown: string }
  | {
      readonly status: "valid";
      /** Exact Markdown before the terminal metadata comment. */
      readonly markdown: string;
      readonly manifest: ReadmeManifest;
      /** False means the source was edited after this manifest was produced. */
      readonly matchesSource: boolean;
    }
  | {
      readonly status: "invalid";
      /** Invalid metadata remains part of the original source for ordinary review. */
      readonly markdown: string;
      readonly reason: "malformed" | "too_large" | "invalid_document";
    }
  | {
      readonly status: "unsupported";
      /** Unsupported metadata remains part of the original source for ordinary review. */
      readonly markdown: string;
      readonly version: number;
    };

export type AppendReadmeManifestResult =
  | { readonly success: true; readonly markdown: string }
  | { readonly success: false; readonly code: "too_large" | "invalid_manifest" };

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(
  value: UnknownRecord,
  required: readonly string[],
  optional: readonly string[] = [],
): boolean {
  const allowed = new Set([...required, ...optional]);
  return (
    required.every((key) => Object.hasOwn(value, key)) &&
    Object.keys(value).every((key) => allowed.has(key))
  );
}

/** FNV-1a over UTF-16 code units; this detects edits, not authenticity or tampering. */
export function fingerprintReadmeBody(body: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < body.length; index++) {
    hash ^= body.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function exceedsJsonDepth(source: string): boolean {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (const character of source) {
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
    } else if (character === '"') inString = true;
    else if (character === "{" || character === "[") {
      if (++depth > depthLimit) return true;
    } else if (character === "}" || character === "]") depth--;
  }
  return false;
}

function hasBoundedValues(input: unknown): boolean {
  const pending: { value: unknown; depth: number }[] = [{ value: input, depth: 0 }];
  let count = 0;
  while (pending.length > 0) {
    const entry = pending.pop()!;
    if (++count > valueLimit) return false;
    if (!isRecord(entry.value) && !Array.isArray(entry.value)) continue;
    if (entry.depth >= depthLimit) return false;
    const values = Array.isArray(entry.value) ? entry.value : Object.values(entry.value);
    if (count + pending.length + values.length > valueLimit) return false;
    for (const value of values) pending.push({ value, depth: entry.depth + 1 });
  }
  return true;
}

function parseSections(value: unknown, bodyLength: number): ReadmeManifestSection[] | null {
  if (!Array.isArray(value)) return null;
  const sections: ReadmeManifestSection[] = [];
  const references = new Set<string>();
  let previousEnd = 0;

  for (const candidate of value) {
    if (
      !isRecord(candidate) ||
      !hasOnlyKeys(candidate, ["kind", "start", "end"], ["moduleId", "sectionId"])
    )
      return null;
    if (
      !Number.isSafeInteger(candidate.start) ||
      !Number.isSafeInteger(candidate.end) ||
      (candidate.start as number) < previousEnd ||
      (candidate.start as number) < 0 ||
      (candidate.end as number) <= (candidate.start as number) ||
      (candidate.end as number) > bodyLength
    )
      return null;

    const { start, end, ...reference } = candidate;
    const parsedReference = sectionReferenceSchema.safeParse(reference);
    if (!parsedReference.success) return null;
    if (
      parsedReference.data.kind === "module" &&
      ["knowledge", "education", "current", "metrics"].includes(parsedReference.data.moduleId)
    )
      return null;
    const key =
      parsedReference.data.kind === "module"
        ? `module:${parsedReference.data.moduleId}`
        : `custom:${parsedReference.data.sectionId}`;
    if (references.has(key)) return null;
    references.add(key);
    sections.push({ ...parsedReference.data, start: start as number, end: end as number });
    previousEnd = end as number;
  }
  return sections.length > 0 ? sections : null;
}

function parseManifest(value: unknown): ReadmeManifest | null {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(
      value,
      ["format", "version", "bodyLength", "bodyFingerprint", "sections"],
      ["recoverySnapshot"],
    ) ||
    value.format !== README_MANIFEST_FORMAT ||
    value.version !== README_MANIFEST_VERSION ||
    !Number.isSafeInteger(value.bodyLength) ||
    (value.bodyLength as number) < 1 ||
    (value.bodyLength as number) > README_MANIFEST_MAX_SOURCE_LENGTH ||
    typeof value.bodyFingerprint !== "string" ||
    !/^fnv1a32:[0-9a-f]{8}$/.test(value.bodyFingerprint)
  )
    return null;

  const sections = parseSections(value.sections, value.bodyLength as number);
  if (!sections) return null;

  let recoverySnapshot: ProfileDocument | undefined;
  if (Object.hasOwn(value, "recoverySnapshot")) {
    const rawSnapshot = value.recoverySnapshot;
    if (!isRecord(rawSnapshot) || rawSnapshot.schemaVersion !== 2) return null;
    const parsed = parseProfileDocument(rawSnapshot);
    if (!parsed.success || parsed.data.schemaVersion !== 2) return null;
    recoverySnapshot = parsed.data;
  }

  return {
    format: README_MANIFEST_FORMAT,
    version: README_MANIFEST_VERSION,
    bodyLength: value.bodyLength as number,
    bodyFingerprint: value.bodyFingerprint,
    sections,
    ...(recoverySnapshot ? { recoverySnapshot } : {}),
  };
}

function safeJson(value: ReadmeManifest): string {
  // HTML comments terminate on `--`, including when it appears inside user-authored text.
  return JSON.stringify(value).replace(/--/g, "\\u002d\\u002d");
}

/** Appends one bounded terminal comment without changing the Markdown body or its offsets. */
export function appendReadmeManifest(
  markdown: string,
  manifest: ReadmeManifest,
): AppendReadmeManifestResult {
  if (!markdown.endsWith("\n")) return { success: false, code: "invalid_manifest" };
  if (markdown.length >= README_MANIFEST_MAX_SOURCE_LENGTH)
    return { success: false, code: "too_large" };
  const parsedManifest = parseManifest(manifest);
  if (
    !parsedManifest ||
    parsedManifest.bodyLength !== markdown.length ||
    parsedManifest.bodyFingerprint !== fingerprintReadmeBody(markdown)
  )
    return { success: false, code: "invalid_manifest" };

  const marker = `${markerPrefix}${README_MANIFEST_VERSION}\n${safeJson(parsedManifest)}\n-->\n`;
  if (
    marker.length > README_MANIFEST_MAX_LENGTH ||
    markdown.length + marker.length > README_MANIFEST_MAX_SOURCE_LENGTH
  )
    return { success: false, code: "too_large" };
  return { success: true, markdown: `${markdown}${marker}` };
}

/** Parses only the exact terminal manifest. Arbitrary HTML comments are not metadata. */
export function parseReadmeManifest(source: string): ReadmeManifestParseResult {
  const markerIndex = source.lastIndexOf(markerPrefix);
  if (markerIndex < 0) return { status: "absent", markdown: source };

  const original = { markdown: source } as const;
  const trailer = source.slice(markerIndex);
  if (
    source.length > README_MANIFEST_MAX_SOURCE_LENGTH ||
    trailer.length > README_MANIFEST_MAX_LENGTH
  )
    return { status: "invalid", ...original, reason: "too_large" };
  const header = /^<!-- github-profile-generator:manifest:v(\d+)\r?\n/.exec(trailer);
  if (!header) return { status: "invalid", ...original, reason: "malformed" };

  const version = Number(header[1]);
  if (!Number.isSafeInteger(version) || version < 1)
    return { status: "invalid", ...original, reason: "malformed" };
  const marker = /^<!-- github-profile-generator:manifest:v\d+\r?\n([\s\S]*?)\r?\n-->\r?\n?$/.exec(
    trailer,
  );
  if (!marker || !marker[1]) return { status: "invalid", ...original, reason: "malformed" };
  if (version !== README_MANIFEST_VERSION) return { status: "unsupported", ...original, version };
  if (exceedsJsonDepth(marker[1])) return { status: "invalid", ...original, reason: "malformed" };
  let value: unknown;
  try {
    value = JSON.parse(marker[1]);
  } catch {
    return { status: "invalid", ...original, reason: "malformed" };
  }
  if (!hasBoundedValues(value)) return { status: "invalid", ...original, reason: "too_large" };
  const manifest = parseManifest(value);
  if (!manifest) return { status: "invalid", ...original, reason: "invalid_document" };

  const markdown = source.slice(0, markerIndex);
  return {
    status: "valid",
    markdown,
    manifest,
    matchesSource:
      markdown.length === manifest.bodyLength &&
      fingerprintReadmeBody(markdown) === manifest.bodyFingerprint,
  };
}
