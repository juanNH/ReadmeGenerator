import { describe, expect, it } from "vitest";
import type { CustomSection } from "../profile/custom-content";
import {
  createEmptyProfile,
  duplicateCustomSection,
  setCustomSectionVisibility,
} from "../profile/profile-operations";
import { parseProfileDocument } from "../profile/profile-validation";
import { parseProjectFile, serializeProjectFile } from "../project";
import { generateReadme } from "./generate-readme";
import { PROFILE_HTML_MAX_DOCUMENT_LENGTH, PROFILE_HTML_MAX_LENGTH } from "./profile-html";
import { renderCustomSectionWithListIndex } from "./render-custom";
import type { ReadmeIssue } from "./readme-result";

function profile(changes: Partial<CustomSection> = {}) {
  const document = createEmptyProfile("en");
  document.customSections = [
    {
      id: "custom",
      title: "My internal section name",
      visible: true,
      blocks: [{ id: "body", type: "paragraph", text: "My visible content" }],
      ...changes,
    },
  ];
  document.sectionOrder.push({ kind: "custom", sectionId: "custom" });
  return document;
}

describe("custom section title visibility", () => {
  it.each([undefined, true, false])(
    "exports a named section with showTitle %s and preserves the authored setting",
    (showTitle) => {
      const document = profile(showTitle === undefined ? {} : { showTitle });
      const parsed = parseProfileDocument(document);
      expect(parsed).toEqual({ success: true, data: document });
      if (!parsed.success) throw new Error("Expected a valid profile");
      expect(Object.hasOwn(parsed.data.customSections[0]!, "showTitle")).toBe(
        showTitle !== undefined,
      );
      expect(generateReadme(parsed.data)).toEqual({
        success: true,
        markdown:
          showTitle === false
            ? "My visible content\n"
            : "## My internal section name\n\nMy visible content\n",
      });
      expect(parsed.data.customSections[0]!.title).toBe("My internal section name");
    },
  );

  it("rejects a non-boolean visibility value without changing the input", () => {
    const input = profile();
    Object.assign(input.customSections[0]!, { showTitle: "false" });
    const original = structuredClone(input);
    const parsed = parseProfileDocument(input);
    expect(parsed).toMatchObject({
      success: false,
      errors: [{ code: "invalid_type", path: ["customSections", 0, "showTitle"] }],
    });
    expect(input).toEqual(original);
  });

  it("does not validate or spend HTML budget on a hidden formatted title", () => {
    const document = profile({
      title: "x".repeat(PROFILE_HTML_MAX_LENGTH + 1),
      showTitle: false,
      titleLevel: 1,
      titleAlignment: "center",
    });
    const budget = { sourceLength: PROFILE_HTML_MAX_DOCUMENT_LENGTH - 1 };
    const errors: ReadmeIssue[] = [];
    const result = renderCustomSectionWithListIndex(
      document.customSections[0]!,
      0,
      errors,
      0,
      [],
      budget,
    );
    expect(result).toEqual({ markdown: "My visible content", nextListIndex: 0 });
    expect(errors).toEqual([]);
    expect(budget.sourceLength).toBe(PROFILE_HTML_MAX_DOCUMENT_LENGTH - 1);
    expect(generateReadme(document)).toEqual({ success: true, markdown: "My visible content\n" });

    document.customSections[0]!.showTitle = true;
    expect(generateReadme(document)).toEqual({
      success: false,
      errors: [{ code: "invalid_html", path: ["customSections", 0, "title"] }],
    });
  });

  it("uses the untitled hierarchy for implicit headings while preserving explicit HTML and levels", () => {
    const document = profile({
      showTitle: false,
      blocks: [
        { id: "implicit", type: "heading", text: "Details", alignment: "center" },
        { id: "explicit", type: "heading", text: "Chosen level", level: 3 },
        { id: "html", type: "html", source: "<h1>Authored HTML</h1>" },
      ],
    });
    const result = generateReadme(document);
    expect(result.success).toBe(true);
    if (!result.success) throw new Error("Expected a generated README");
    expect(result.markdown).toBe(
      '<div><h2 align="center">Details</h2></div>\n\n### Chosen level\n\n<div><h1>Authored HTML</h1></div>\n',
    );
    expect(result.customHtml).toHaveLength(2);
    for (const fragment of result.customHtml!) {
      expect(fragment.headingLevel).toBe(3);
      expect(result.markdown.slice(fragment.start, fragment.end)).toBe(fragment.html);
    }
  });

  it("keeps name, title visibility and formatting through section inclusion, duplication and JSON", () => {
    const document = profile({ showTitle: false, titleLevel: 1, titleAlignment: "right" });
    const hidden = setCustomSectionVisibility(document, "custom", false);
    if (!hidden.success) throw new Error("Expected hidden section");
    const shown = setCustomSectionVisibility(hidden.data, "custom", true);
    if (!shown.success) throw new Error("Expected included section");
    expect(shown.data).toEqual(document);

    let nextId = 0;
    const duplicated = duplicateCustomSection(shown.data, "custom", () => `copy-${++nextId}`);
    if (!duplicated.success) throw new Error("Expected duplicate");
    expect(duplicated.data.customSections[1]).toEqual({
      ...document.customSections[0],
      id: "copy-1",
      blocks: [{ id: "copy-2", type: "paragraph", text: "My visible content" }],
    });
    const serialized = serializeProjectFile(duplicated.data);
    if (!serialized.success) throw new Error("Expected serialized project");
    const reopened = parseProjectFile(serialized.source);
    expect(reopened).toEqual({ success: true, document: duplicated.data, sourceVersion: 2 });
    if (!reopened.success) throw new Error("Expected reopened project");
    expect(generateReadme(reopened.document)).toEqual(generateReadme(duplicated.data));
    expect(document.customSections[0]!.title).toBe("My internal section name");
  });
});
