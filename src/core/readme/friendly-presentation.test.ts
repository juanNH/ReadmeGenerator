import { describe, expect, it } from "vitest";
import { toHtml } from "hast-util-to-html";
import { createEmptyProfile, createEmptyProfileV1 } from "../profile/profile-operations";
import { parseProfileDocument } from "../profile/profile-validation";
import { parseProjectFile, serializeProjectFile } from "../project";
import { generateReadme } from "./generate-readme";
import { PROFILE_HTML_MAX_LENGTH } from "./profile-html";

function introduction(locale: "en" | "es" = "en") {
  const profile = createEmptyProfile(locale);
  profile.visibility.presentation = true;
  profile.data.presentation = {
    displayName: "Juan",
    headline: "I enjoy building useful things",
    bio: "",
    location: "🇦🇷 Argentina",
    format: { locationPlacement: "headline" },
  };
  return profile;
}

describe("presentation formatting", () => {
  it("round-trips all text and optional choices through project JSON without changing the document", () => {
    const profile = introduction();
    profile.data.presentation.displayName = "  Juan 👋 \r\nHerrera  ";
    profile.data.presentation.bio = "\ufeffI like learning.\r\n\r\n  And sharing. ";
    Object.assign(profile.data.presentation.format!, {
      displayNameTypography: "italic",
      headlineTypography: "monospace",
    });
    const original = structuredClone(profile);
    const saved = serializeProjectFile(profile);
    expect(saved.success).toBe(true);
    if (!saved.success) return;
    expect(parseProjectFile(saved.source)).toEqual({
      success: true,
      document: original,
      sourceVersion: 2,
    });
    expect(profile).toEqual(original);
  });

  it("keeps v2 formatting defaults out of the document while centering the generated headings", () => {
    const profile = introduction();
    delete profile.data.presentation.format;
    const defaultOutput = generateReadme(profile);
    expect(defaultOutput.success && defaultOutput.markdown).toContain(
      '<h1 align="center">Juan</h1>',
    );
    const parsed = parseProfileDocument(profile);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.data.presentation).not.toHaveProperty("format");
    expect(generateReadme(parsed.data)).toEqual(defaultOutput);
    profile.data.presentation.format = {};
    expect(generateReadme(profile)).toEqual(defaultOutput);
  });

  it("keeps legacy v1 closed to presentation options", () => {
    const profile = createEmptyProfileV1("en");
    Object.assign(profile.data.presentation, { format: { locationPlacement: "headline" } });
    expect(parseProfileDocument(profile)).toEqual({
      success: false,
      errors: [{ code: "unknown_property", path: ["data", "presentation", "format"] }],
    });
  });

  it.each([
    { style: "friendly" },
    { style: "classic" },
    { style: true },
    { locationPlacement: "auto" },
    { displayNameTypography: "Poppins" },
    { headlineTypography: "<script>" },
    { fontFamily: "Arial" },
  ])("rejects an unsupported option without dropping it: %j", (format) => {
    const profile = introduction();
    Object.assign(profile.data.presentation, { format });
    const original = structuredClone(profile);
    expect(parseProfileDocument(profile).success).toBe(false);
    expect(profile).toEqual(original);
  });

  it.each([
    ["en", "from"],
    ["es", "desde"],
  ] as const)("renders the complete %s title, headline and inline country once", (locale, from) => {
    const profile = introduction(locale);
    const original = structuredClone(profile);
    const result = generateReadme(profile);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.markdown).toContain('<h1 align="center">Juan</h1>');
    expect(result.markdown).toContain(
      `<h2 align="center">I enjoy building useful things ${from} <img`,
    );
    expect(result.markdown).not.toContain("<strong>");
    expect(result.markdown).not.toContain("Location:");
    expect(result.markdown).not.toContain("Ubicación:");
    expect(result.markdown.match(/<img /g)).toHaveLength(1);
    expect(result.markdown).toContain('width="20" height="15"');
    expect(result.customImages).toBeUndefined();
    expect(result.customHtml).toHaveLength(2);
    for (const fragment of result.customHtml ?? []) {
      expect(result.markdown.slice(fragment.start, fragment.end)).toBe(fragment.html);
      expect(toHtml(fragment.tree)).toContain('align="center"');
    }
    expect(profile).toEqual(original);
  });

  it("keeps explicit size and alignment overrides", () => {
    const profile = introduction();
    Object.assign(profile.data.presentation.format!, {
      displayNameLevel: 3,
      displayNameAlignment: "left",
      headlineLevel: 3,
      headlineAlignment: "right",
    });
    const result = generateReadme(profile);
    expect(result.success && result.markdown).toContain("### Juan");
    expect(result.success && result.markdown).toContain('<h3 align="right">I enjoy');
    expect(result.success && result.markdown).not.toContain("<strong>");
  });

  it.each([
    ["en", "📍 Currently based in"],
    ["es", "📍 Actualmente en"],
  ] as const)("keeps a location without a headline as a short %s line", (locale, label) => {
    const profile = introduction(locale);
    profile.data.presentation.displayName = "";
    profile.data.presentation.headline = "";
    profile.data.presentation.format = { locationAlignment: "center" };
    const result = generateReadme(profile);
    expect(result.success && result.markdown).toContain(`<p align="center">${label} <img`);
    expect(result.success && result.markdown).not.toMatch(/<h[1-6]/);
  });

  it("does not prepend a greeting and requires explicit location placement", () => {
    const profile = introduction();
    profile.data.presentation.format = {};
    const result = generateReadme(profile);
    expect(result.success && result.markdown).toContain("📍 Currently based in <img");
    expect(result.success && result.markdown).toContain('<h1 align="center">Juan</h1>');
    expect(result.success && result.markdown).toContain('<h2 align="center">I enjoy');
    expect(result.success && result.markdown).not.toContain("👋");
    expect(result.success && result.markdown).not.toContain("<strong>");
    expect(result.success && result.markdown).not.toContain("things from <img");
    profile.data.presentation.format = { locationPlacement: "headline" };
    const inlineLocation = generateReadme(profile);
    expect(inlineLocation.success && inlineLocation.markdown).toContain("things from <img");
  });

  it.each([
    ["italic", "em"],
    ["monospace", "code"],
  ] as const)(
    "renders %s titles as literal text with valid country and fragment ranges",
    (typography, tag) => {
      const profile = introduction();
      profile.data.presentation.displayName = "<b>Juan 🌱</b>";
      profile.data.presentation.headline = "![literal](https://example.com/image.png) ⌨️";
      profile.data.presentation.format = {
        displayNameTypography: typography,
        headlineTypography: typography,
        displayNameAlignment: "left",
        headlineAlignment: "right",
        locationPlacement: "displayName",
      };
      const before = structuredClone(profile);
      const result = generateReadme(profile);
      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected compatible presentation typography");
      expect(result.markdown).toContain(
        `<h1 align="left"><${tag}>&#x3C;b>Juan 🌱&#x3C;/b></${tag}> from <img`,
      );
      expect(result.markdown).toContain(
        `<h2 align="right"><${tag}>![literal](https://example.com/image.png) ⌨️</${tag}></h2>`,
      );
      expect(result.markdown).not.toContain("<b>");
      expect(result.markdown).not.toContain("style=");
      expect(result.markdown.match(/<img /g)).toHaveLength(1);
      expect(result.markdown).not.toContain("Currently based in");
      for (const fragment of result.customHtml ?? [])
        expect(result.markdown.slice(fragment.start, fragment.end)).toBe(fragment.html);
      expect(profile).toEqual(before);
    },
  );

  it("does not create a greeting, country or example text from empty fields", () => {
    const profile = introduction();
    Object.assign(profile.data.presentation, { displayName: " ", headline: "", location: "" });
    expect(generateReadme(profile)).toEqual({
      success: false,
      errors: [{ code: "empty_profile", path: [] }],
    });
  });

  it("keeps written HTML, Markdown images and unrecognized flags inert in combined text", () => {
    const profile = introduction();
    profile.data.presentation.displayName = '<script>alert("x")</script>';
    profile.data.presentation.headline = "![unsafe](https://evil.example/a.png) <b>literal</b>";
    profile.data.presentation.location = '🇦🇷 <img src="https://evil.example/country.png">';
    const result = generateReadme(profile);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.markdown).not.toContain("<script>");
    expect(result.markdown).not.toContain("<img ");
    expect(result.markdown).toContain("&#x3C;img");
    expect(result.markdown).toContain("![unsafe]");
    for (const fragment of result.customHtml ?? [])
      expect(toHtml(fragment.tree)).not.toMatch(/<(?:script|img|a|b)[ >]/);
  });

  it("reports both contributors to an oversized combined subtitle without truncating them", () => {
    const profile = introduction();
    profile.data.presentation.displayName = "";
    profile.data.presentation.headline = "h".repeat(15_000);
    profile.data.presentation.location = "l".repeat(16_000);
    const original = structuredClone(profile);
    expect(generateReadme(profile)).toEqual({
      success: false,
      errors: [
        { code: "invalid_html", path: ["data", "presentation", "headline"] },
        { code: "invalid_html", path: ["data", "presentation", "location"] },
      ],
    });
    expect(profile).toEqual(original);
  });

  it("shares the existing HTML document budget in output order", () => {
    const profile = introduction();
    profile.data.presentation.headline = "";
    profile.data.presentation.location = "";
    profile.customSections = [
      {
        id: "before",
        title: "",
        visible: true,
        blocks: Array.from({ length: 5 }, (_, index) => ({
          id: `block-${index}`,
          type: "html" as const,
          source: `<p>${"x".repeat(PROFILE_HTML_MAX_LENGTH - 7)}</p>`,
        })),
      },
    ];
    profile.sectionOrder.unshift({ kind: "custom", sectionId: "before" });
    expect(generateReadme(profile)).toEqual({
      success: false,
      errors: [{ code: "invalid_html", path: ["data", "presentation", "displayName"] }],
    });
  });
});
