import { describe, expect, it } from "vitest";
import { toHtml } from "hast-util-to-html";
import { createEmptyProfile, createEmptyProfileV1 } from "../profile/profile-operations";
import type { ProfileModuleData } from "../profile/module-content";
import { parseProfileDocument } from "../profile/profile-validation";
import { countryCatalog } from "../location";
import { generateReadme } from "./generate-readme";
import { PROFILE_HTML_MAX_LENGTH } from "./profile-html";

function profile(changes: Partial<ProfileModuleData["presentation"]> = {}) {
  const document = createEmptyProfile("en");
  document.visibility.presentation = true;
  document.data.presentation = {
    displayName: "Juan",
    headline: "I build things",
    bio: "A few words.\n\nMy interests.",
    location: "Argentina",
    ...changes,
  };
  return document;
}

describe("presentation formatting contract", () => {
  it("accepts every optional v2 choice without inserting defaults or mutating input", () => {
    const document = profile({
      format: {
        displayNameLevel: 2,
        displayNameAlignment: "center",
        headlineLevel: 3,
        headlineAlignment: "right",
        bioAlignment: "left",
        locationAlignment: "center",
      },
    });
    const before = structuredClone(document);
    expect(parseProfileDocument(document)).toEqual({ success: true, data: document });
    expect(document).toEqual(before);
    const old = profile();
    const parsed = parseProfileDocument(old);
    expect(parsed).toEqual({ success: true, data: old });
    if (!parsed.success) throw new Error("Expected valid old v2");
    expect(Object.hasOwn(parsed.data.data.presentation, "format")).toBe(false);
  });

  it("keeps v1 closed while migrating its exact former presentation", () => {
    const legacy = createEmptyProfileV1("es");
    legacy.data.presentation.displayName = "Juan";
    const parsed = parseProfileDocument(legacy);
    expect(parsed.success).toBe(true);
    if (!parsed.success) throw new Error("Expected valid legacy profile");
    expect(parsed.data.data.presentation).toEqual(legacy.data.presentation);
    expect(Object.hasOwn(parsed.data.data.presentation, "format")).toBe(false);
    const extended = {
      ...legacy,
      data: { ...legacy.data, presentation: { ...legacy.data.presentation, format: {} } },
    };
    expect(parseProfileDocument(extended)).toEqual({
      success: false,
      errors: [{ code: "unknown_property", path: ["data", "presentation", "format"] }],
    });
  });

  it.each([
    { displayNameLevel: 0 },
    { headlineLevel: 4 },
    { displayNameAlignment: "justify" },
    { headlineAlignment: null },
    { bioAlignment: "middle" },
    { locationAlignment: "inherit" },
    { css: "color: red" },
  ])("rejects unknown format choices without dropping the original: %j", (format) => {
    const document = profile();
    Object.assign(document.data.presentation, { format });
    const before = structuredClone(document);
    expect(parseProfileDocument(document).success).toBe(false);
    expect(document).toEqual(before);
  });

  it("allows empty format as an explicit valid choice without expanding its shape", () => {
    const document = profile({ format: {} });
    expect(parseProfileDocument(document)).toEqual({ success: true, data: document });
    expect(generateReadme(document)).toEqual(generateReadme(profile()));
  });
});

describe("presentation formatting output", () => {
  it("retains the exact original output when format is absent or default choices are explicit", () => {
    const expected = {
      success: true,
      markdown:
        "# Juan\n\n## I build things\n\nA few words\\.\n\nMy interests\\.\n\nLocation: Argentina\n",
    };
    expect(generateReadme(profile())).toEqual(expected);
    expect(
      generateReadme(
        profile({
          format: {
            displayNameLevel: 1,
            displayNameAlignment: "left",
            headlineLevel: 2,
            headlineAlignment: "left",
            bioAlignment: "left",
            locationAlignment: "left",
          },
        }),
      ),
    ).toEqual(expected);
  });

  it("uses native Markdown for chosen heading levels when alignment stays left", () => {
    const result = generateReadme(
      profile({ bio: "", location: "", format: { displayNameLevel: 3, headlineLevel: 1 } }),
    );
    expect(result).toEqual({ success: true, markdown: "### Juan\n\n# I build things\n" });
  });

  it("escapes all formatted field text and publishes exact UTF-16 fragment ranges", () => {
    const document = profile({
      displayName: '👋 Juan <script>alert("x")</script>',
      headline: '<img src="https://evil.example/a.png"> **Developer**',
      bio: "First <b>literal</b>.\n\n![not an image](https://evil.example/image.png)",
      location: '<a href="javascript:alert(1)">Home</a>',
      format: {
        displayNameLevel: 1,
        displayNameAlignment: "center",
        headlineLevel: 3,
        headlineAlignment: "right",
        bioAlignment: "center",
        locationAlignment: "right",
      },
    });
    document.customSections = [
      {
        id: "before",
        title: "",
        visible: true,
        blocks: [{ id: "b", type: "paragraph", text: "🌱 Before" }],
      },
    ];
    document.sectionOrder.unshift({ kind: "custom", sectionId: "before" });
    const result = generateReadme(document);
    expect(result.success).toBe(true);
    if (!result.success) throw new Error(JSON.stringify(result.errors));
    expect(result.customHtml).toHaveLength(4);
    for (const fragment of result.customHtml ?? []) {
      expect(result.markdown.slice(fragment.start, fragment.end)).toBe(fragment.html);
      expect(fragment.headingLevel).toBe(3);
      const treeHtml = toHtml(fragment.tree);
      expect(treeHtml).not.toContain("<script>");
      expect(treeHtml).not.toContain("<img ");
      expect(treeHtml).not.toContain("<a ");
    }
    expect(result.markdown).toContain('<h1 align="center">👋 Juan &#x3C;script>');
    expect(result.markdown).toContain('<h3 align="right">&#x3C;img');
    expect(result.markdown).toContain('<p align="center">First &#x3C;b>literal&#x3C;/b>');
    expect(result.markdown).toContain('<p align="center">![not an image]');
    expect(result.customImages).toBeUndefined();
  });

  it("keeps the country flag from the fixed catalog within aligned location HTML", () => {
    const document = profile({
      displayName: "",
      headline: "",
      bio: "",
      location: "🇦🇷 Argentina",
      format: { locationAlignment: "center" },
    });
    document.contentLocale = "es";
    const result = generateReadme(document);
    expect(result.success).toBe(true);
    if (!result.success) throw new Error(JSON.stringify(result.errors));
    const flag = countryCatalog.find((country) => country.code === "AR");
    expect(flag).toBeDefined();
    expect(result.markdown).toContain('align="center">Ubicación: <img');
    expect(result.markdown).toContain(`src="${flag!.iconUrl}" alt=""`);
    expect(result.markdown).toContain('width="20" height="15"');
    expect(result.customImages).toBeUndefined();
    expect(result.customHtml).toHaveLength(1);
    const fragment = result.customHtml![0]!;
    expect(result.markdown.slice(fragment.start, fragment.end)).toBe(fragment.html);
  });

  it("shares the HTML document budget with explicit custom fragments in output order", () => {
    const document = profile({
      displayName: "Juan",
      headline: "",
      bio: "",
      location: "",
      format: { displayNameAlignment: "center" },
    });
    document.customSections = [
      {
        id: "html",
        title: "",
        visible: true,
        blocks: Array.from({ length: 5 }, (_, index) => ({
          id: `h${index}`,
          type: "html" as const,
          source: `<p>${"x".repeat(PROFILE_HTML_MAX_LENGTH - 7)}</p>`,
        })),
      },
    ];
    document.sectionOrder.unshift({ kind: "custom", sectionId: "html" });
    expect(generateReadme(document)).toEqual({
      success: false,
      errors: [{ code: "invalid_html", path: ["data", "presentation", "displayName"] }],
    });
  });

  it.each(["displayName", "headline", "bio", "location"] as const)(
    "enforces each formatted %s fragment limit without truncating the draft",
    (field) => {
      const document = profile({
        displayName: "",
        headline: "",
        bio: "",
        location: "",
        [field]: "x".repeat(PROFILE_HTML_MAX_LENGTH),
        format: {
          displayNameAlignment: "center",
          headlineAlignment: "right",
          bioAlignment: "center",
          locationAlignment: "right",
        },
      });
      const before = structuredClone(document);
      expect(generateReadme(document)).toEqual({
        success: false,
        errors: [{ code: "invalid_html", path: ["data", "presentation", field] }],
      });
      expect(document).toEqual(before);
    },
  );

  it("does not validate hidden presentation formatting or add metadata for it", () => {
    const document = profile({
      displayName: "x".repeat(PROFILE_HTML_MAX_LENGTH),
      format: { displayNameAlignment: "center" },
    });
    document.visibility.presentation = false;
    document.visibility.contact = true;
    document.data.contact.links = [{ id: "site", label: "Website", url: "https://example.com" }];
    const result = generateReadme(document);
    expect(result.success).toBe(true);
    if (!result.success) throw new Error(JSON.stringify(result.errors));
    expect(result.customHtml).toBeUndefined();
    expect(result.markdown).not.toContain("xxxxx");
  });

  it("omits empty formatted fields without creating empty headings or paragraphs", () => {
    expect(
      generateReadme(
        profile({
          displayName: " ",
          headline: "",
          bio: "\n\n",
          location: "",
          format: {
            displayNameAlignment: "center",
            headlineLevel: 3,
            bioAlignment: "right",
            locationAlignment: "center",
          },
        }),
      ),
    ).toEqual({ success: false, errors: [{ code: "empty_profile", path: [] }] });
  });
});
