import { describe, expect, it } from "vitest";
import { createEmptyProfile } from "../profile/profile-operations";
import type { ProfileDocument } from "../profile/profile-schema";
import {
  appendReadmeManifest,
  fingerprintReadmeBody,
  parseReadmeManifest,
  README_MANIFEST_FORMAT,
  README_MANIFEST_MAX_LENGTH,
  README_MANIFEST_MAX_SOURCE_LENGTH,
  README_MANIFEST_VERSION,
  type ReadmeManifest,
} from "./readme-manifest";
import { generateReadme } from "./generate-readme";

function manifestFor(markdown: string): ReadmeManifest {
  return {
    format: README_MANIFEST_FORMAT,
    version: README_MANIFEST_VERSION,
    bodyLength: markdown.length,
    bodyFingerprint: fingerprintReadmeBody(markdown),
    sections: [
      {
        kind: "module" as const,
        moduleId: "contact" as const,
        start: 0,
        end: markdown.indexOf("\n"),
      },
    ],
  };
}

describe("README import manifests", () => {
  it("round-trips a terminal structural manifest without changing the Markdown body", () => {
    const body = "## Contact\n\n- [Website](<https://example.com/>)\n";
    const appended = appendReadmeManifest(body, manifestFor(body));

    expect(appended.success).toBe(true);
    if (!appended.success) return;
    const parsed = parseReadmeManifest(appended.markdown);
    expect(parsed).toEqual({
      status: "valid",
      markdown: body,
      manifest: {
        ...manifestFor(body),
        sections: [{ kind: "module", moduleId: "contact", start: 0, end: 10 }],
      },
      matchesSource: true,
    });
  });

  it("separates the terminal comment from authored HTML and restores its exact body", () => {
    const body = "<div><p>Profile content</p></div>\n";
    const appended = appendReadmeManifest(body, manifestFor(body));

    expect(appended.success).toBe(true);
    if (!appended.success) return;
    expect(appended.markdown).toContain("</div>\n\n<!-- github-profile-generator:manifest:v1\n");
    expect(parseReadmeManifest(appended.markdown)).toMatchObject({
      status: "valid",
      markdown: body,
      matchesSource: true,
    });
  });

  it("retains a valid snapshot when the visible README body has been edited", () => {
    const body = "## Contact\n\n- [Website](<https://example.com/>)\n";
    const appended = appendReadmeManifest(body, manifestFor(body));
    expect(appended.success).toBe(true);
    if (!appended.success) return;

    const edited = appended.markdown.replace("Contact", "Links");
    const parsed = parseReadmeManifest(edited);
    expect(parsed.status).toBe("valid");
    if (parsed.status !== "valid") return;
    expect(parsed.markdown).toBe(body.replace("Contact", "Links"));
    expect(parsed.matchesSource).toBe(false);
    expect(parsed.manifest.sections[0]).toMatchObject({ kind: "module", moduleId: "contact" });
  });

  it("escapes comment terminators in a full snapshot and validates the exact v2 document", () => {
    const profile = createEmptyProfile("en");
    profile.visibility.presentation = true;
    profile.data.presentation.displayName = "Alex -- profile";
    const result = generateReadme(profile, { includeRecoverySnapshot: true });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.markdown).toContain("<!-- github-profile-generator:manifest:v1\n");
    const parsed = parseReadmeManifest(result.markdown);
    expect(parsed.status).toBe("valid");
    if (parsed.status !== "valid") return;
    expect(parsed.matchesSource).toBe(true);
    expect(parsed.manifest.recoverySnapshot).toEqual(profile);
    const payload = result.markdown
      .split("<!-- github-profile-generator:manifest:v1\n")[1]
      ?.split("\n-->\n")[0];
    expect(payload).toBeDefined();
    expect(payload).not.toContain("--");
    expect(parsed.manifest.sections).toEqual([
      expect.objectContaining({ kind: "module", moduleId: "presentation" }),
    ]);
  });

  it("does not add metadata unless the caller opts in", () => {
    const profile = createEmptyProfile("en");
    profile.visibility.presentation = true;
    profile.data.presentation.displayName = "Alex";
    const plain = generateReadme(profile);
    const marked = generateReadme(profile, { includeReadmeManifest: true });

    expect(plain.success).toBe(true);
    expect(marked.success).toBe(true);
    if (!plain.success || !marked.success) return;
    expect(parseReadmeManifest(plain.markdown).status).toBe("absent");
    const metadata = parseReadmeManifest(marked.markdown);
    expect(metadata.status).toBe("valid");
    if (metadata.status === "valid") {
      expect(metadata.markdown).toBe(plain.markdown);
      expect(metadata.manifest.sections[0]?.start).toBe(0);
      expect(metadata.manifest.sections[0]?.end).toBe(plain.markdown.length - 1);
    }
    expect(marked.customHtml).toEqual(plain.customHtml);
  });

  it("rejects an invalid embedded snapshot while preserving the original README", () => {
    const body = "## Contact\n";
    const payload = JSON.stringify({
      ...manifestFor(body),
      recoverySnapshot: { schemaVersion: 2 },
    });
    const source = `${body}<!-- github-profile-generator:manifest:v1\n${payload}\n-->\n`;

    expect(parseReadmeManifest(source)).toEqual({
      status: "invalid",
      markdown: source,
      reason: "invalid_document",
    });
  });

  it("rejects malformed and unsupported terminal markers without stripping the original source", () => {
    const body = "## Contact\n";
    const malformed = `${body}<!-- github-profile-generator:manifest:v1\n{\n-->\n`;
    expect(parseReadmeManifest(malformed)).toEqual({
      status: "invalid",
      markdown: malformed,
      reason: "malformed",
    });

    const unsupported = `${body}<!-- github-profile-generator:manifest:v2\n{}\n-->\n`;
    expect(parseReadmeManifest(unsupported)).toEqual({
      status: "unsupported",
      markdown: unsupported,
      version: 2,
    });
  });

  it("bounds the manifest and the complete source without truncating", () => {
    const body = `${"x".repeat(README_MANIFEST_MAX_SOURCE_LENGTH)}\n`;
    const appended = appendReadmeManifest(body, manifestFor(body));
    expect(appended).toEqual({ success: false, code: "too_large" });

    const tooLarge = `${"x".repeat(README_MANIFEST_MAX_SOURCE_LENGTH + 1)}<!-- github-profile-generator:manifest:v1\n{}\n-->\n`;
    expect(parseReadmeManifest(tooLarge)).toEqual({
      status: "invalid",
      markdown: tooLarge,
      reason: "too_large",
    });
    expect(README_MANIFEST_MAX_LENGTH).toBeLessThanOrEqual(README_MANIFEST_MAX_SOURCE_LENGTH);
  });

  it("returns an explicit export error when an opted-in profile snapshot exceeds the limit", () => {
    const profile: ProfileDocument = createEmptyProfile("en");
    profile.customSections = [
      {
        id: "long-code",
        title: "Code",
        visible: true,
        blocks: [0, 1, 2, 3].map((index) => ({
          id: `code-${index}`,
          type: "code" as const,
          source: "x".repeat(30_000),
          language: "",
        })),
      },
    ];
    profile.sectionOrder.push({ kind: "custom", sectionId: "long-code" });

    const withoutSnapshot = generateReadme(profile);
    const withSnapshot = generateReadme(profile, { includeRecoverySnapshot: true });
    expect(withoutSnapshot.success).toBe(true);
    expect(withSnapshot).toEqual({
      success: false,
      errors: [{ code: "recovery_manifest_too_large", path: [] }],
    });
  });
});
