import { describe, expect, it } from "vitest";
import { createEmptyProfile } from "../profile/profile-operations";
import type { ContentLocale, ProfileDocument } from "../profile/profile-schema";
import { generateReadme, type ReadmeResult } from "./index";

function markdown(result: ReadmeResult): string {
  if (!result.success) throw new Error(`Expected Markdown: ${JSON.stringify(result.errors)}`);
  return result.markdown;
}

function presentationProfile(): ProfileDocument {
  const profile = createEmptyProfile("en");
  profile.visibility.presentation = true;
  profile.data.presentation = {
    displayName: "Alex Rivera",
    headline: "I build useful things",
    bio: "I enjoy learning.\n\nCurrently exploring accessible interfaces.",
    location: "Argentina",
  };
  return profile;
}

function contactProfile(url = "https://example.com", label = "Website"): ProfileDocument {
  const profile = createEmptyProfile("en");
  profile.visibility.contact = true;
  profile.data.contact.links = [{ id: "website", label, url }];
  return profile;
}

function retiredSectionsProfile(locale: ContentLocale = "en"): ProfileDocument {
  const profile = createEmptyProfile(locale);
  profile.visibility.knowledge = true;
  profile.visibility.education = true;
  profile.visibility.current = true;
  profile.data.knowledge.items = [
    { id: "\ud800", title: "Retired knowledge", description: "Existing personal text" },
  ];
  profile.data.education.items = [
    {
      id: "saved-study",
      kind: "certification",
      title: "Retired education",
      institution: "Saved institution",
      status: "in-progress",
      startDate: "Saved start",
      endDate: "Saved end",
      description: "Saved study details",
      url: "javascript:alert(1)",
    },
  ];
  profile.data.current.items = [
    {
      id: "saved-activity",
      kind: "learning",
      description: "Retired current activity",
      url: "mailto:alex@example.com",
    },
  ];
  return profile;
}

function freezeDeep<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    for (const child of Object.values(value)) freezeDeep(child);
    Object.freeze(value);
  }
  return value;
}

describe("README sections and export readiness", () => {
  it("renders presentation with optional fields and stable spacing", () => {
    expect(markdown(generateReadme(presentationProfile()))).toBe(
      '<div><h1 align="center">Alex Rivera</h1></div>\n\n<div><h2 align="center">I build useful things</h2></div>\n\nI enjoy learning\\.\n\nCurrently exploring accessible interfaces\\.\n\n📍 Currently based in Argentina\n',
    );
  });

  it("exports contact alone without a presentation or display name", () => {
    expect(markdown(generateReadme(contactProfile()))).toBe(
      "## Contact\n\n- [Website](<https://example.com/>)\n",
    );
  });

  it.each([
    ["displayName", "Alex", '<div><h1 align="center">Alex</h1></div>\n'],
    ["headline", "Developer", '<div><h2 align="center">Developer</h2></div>\n'],
    ["bio", "Learning in public", "Learning in public\n"],
    ["location", "Argentina", "📍 Currently based in Argentina\n"],
  ] as const)("allows presentation to contain only %s", (field, value, expected) => {
    const profile = createEmptyProfile("en");
    profile.visibility.presentation = true;
    profile.data.presentation[field] = value;
    expect(markdown(generateReadme(profile))).toBe(expected);
  });

  it("uses document content language for generated labels", () => {
    const profile = presentationProfile();
    profile.contentLocale = "es";
    profile.visibility.contact = true;
    profile.data.contact.links = [{ id: "mail", label: "Correo", url: "mailto:alex@example.com" }];
    const output = markdown(generateReadme(profile));
    expect(output).toContain("📍 Actualmente en Argentina");
    expect(output).toContain("## Contacto\n\n- [Correo](<mailto:alex@example.com>)");
    expect(output).not.toContain("Currently based in");
  });

  it("follows sectionOrder for combined sections", () => {
    const profile = presentationProfile();
    profile.visibility.contact = true;
    profile.data.contact.links = contactProfile().data.contact.links;
    profile.sectionOrder = [
      { kind: "module", moduleId: "contact" },
      ...profile.sectionOrder.filter(
        (reference) => reference.kind !== "module" || reference.moduleId !== "contact",
      ),
    ];
    const output = markdown(generateReadme(profile));
    expect(output.indexOf("## Contact")).toBeLessThan(
      output.indexOf('<h1 align="center">Alex Rivera</h1>'),
    );
  });

  it("omits hidden data including invalid links and unsupported sections", () => {
    const profile = presentationProfile();
    profile.data.contact.links = contactProfile("javascript:alert(1)").data.contact.links;
    profile.data.knowledge.items = [{ id: "learning", title: "Skills", description: "Testing" }];
    expect(generateReadme(profile)).toEqual(generateReadme(presentationProfile()));
  });

  it("reports empty output when all modules are hidden", () => {
    const profile = presentationProfile();
    profile.visibility.presentation = false;
    expect(generateReadme(profile)).toEqual({
      success: false,
      errors: [{ code: "empty_profile", path: [] }],
    });
  });

  it("does not invent a heading for empty or whitespace-only modules", () => {
    const profile = createEmptyProfile("en");
    profile.visibility.presentation = true;
    profile.visibility.contact = true;
    profile.data.presentation.bio = " \t\n ";
    profile.data.contact.links = [{ id: "empty", label: " \n ", url: "\t" }];
    expect(generateReadme(profile)).toEqual({
      success: false,
      errors: [{ code: "empty_profile", path: [] }],
    });
  });

  it("omits visible metrics when no cards have been selected", () => {
    const profile = presentationProfile();
    profile.visibility.metrics = true;
    expect(generateReadme(profile)).toEqual(generateReadme(presentationProfile()));
  });

  it("collects failures deterministically without returning partial Markdown", () => {
    const profile = contactProfile("javascript:alert(1)");
    profile.visibility.metrics = true;
    profile.data.metrics = { username: "not a username", cards: ["summary"] };
    expect(generateReadme(profile)).toEqual({
      success: false,
      errors: [
        { code: "invalid_username", path: ["data", "metrics", "username"] },
        { code: "invalid_url", path: ["data", "contact", "links", 0, "url"] },
      ],
    });
  });

  it("is deterministic and leaves a deeply frozen document unchanged", () => {
    const profile = freezeDeep(presentationProfile());
    const original = JSON.stringify(profile);
    expect(generateReadme(profile)).toEqual(generateReadme(profile));
    expect(JSON.stringify(profile)).toBe(original);
  });
});

describe("retired sections remain stored without participating in output", () => {
  it.each(["en", "es"] as const)(
    "ignores all visible retired content and its invalid URLs in %s without changing the document",
    (locale) => {
      const profile = retiredSectionsProfile(locale);
      profile.visibility.presentation = true;
      profile.data.presentation.bio = "A brief personal introduction";
      const expected = createEmptyProfile(locale);
      expected.visibility.presentation = true;
      expected.data.presentation.bio = profile.data.presentation.bio;
      const before = structuredClone(profile);

      expect(generateReadme(freezeDeep(profile))).toEqual(generateReadme(expected));
      expect(markdown(generateReadme(profile))).toBe("A brief personal introduction\n");
      expect(profile).toEqual(before);
      expect(profile.schemaVersion).toBe(2);
      expect(profile.sectionOrder).toHaveLength(9);
    },
  );

  it.each(["knowledge", "education", "current"] as const)(
    "reports empty output when only retired %s is visible despite saved content",
    (moduleId) => {
      const profile = retiredSectionsProfile();
      for (const reference of profile.sectionOrder)
        if (reference.kind === "module")
          profile.visibility[reference.moduleId] = reference.moduleId === moduleId;
      const before = structuredClone(profile);

      expect(generateReadme(freezeDeep(profile))).toEqual({
        success: false,
        errors: [{ code: "empty_profile", path: [] }],
      });
      expect(profile).toEqual(before);
      expect(profile.visibility[moduleId]).toBe(true);
    },
  );

  it("reports only empty_profile when all three retired sections contain visible content", () => {
    const profile = freezeDeep(retiredSectionsProfile());
    const before = JSON.stringify(profile);
    expect(generateReadme(profile)).toEqual({
      success: false,
      errors: [{ code: "empty_profile", path: [] }],
    });
    expect(JSON.stringify(profile)).toBe(before);
  });
});

describe("plain-text Markdown escaping", () => {
  it("keeps Markdown and HTML entered as a name inert", () => {
    const profile = createEmptyProfile("en");
    profile.visibility.presentation = true;
    profile.data.presentation.displayName =
      '![image](https://evil.test) <img src=x onerror="alert(1)"> &copy;';
    profile.data.presentation.format = { displayNameAlignment: "left" };
    expect(markdown(generateReadme(profile))).toBe(
      '# \\!\\[image\\]\\(https&#58;//evil\\.test\\) &lt;img src\\=x onerror\\="alert\\(1\\)"&gt; &amp;copy;\n',
    );
  });

  it("prevents headings, lists, quote blocks, fences and indented code in a biography", () => {
    const profile = createEmptyProfile("en");
    profile.visibility.presentation = true;
    profile.data.presentation.bio =
      "# header\r\n> quoted\r\n- item\r\n1. order\r\n```html\r\n    <script>alert(1)</script>\r\n---\r\n===\r\n";
    expect(markdown(generateReadme(profile))).toBe(
      "\\# header\n&gt; quoted\n\\- item\n1\\. order\n\\`\\`\\`html\n&lt;script&gt;alert\\(1\\)&lt;/script&gt;\n\\-\\-\\-\n\\=\\=\\=\n",
    );
  });

  it("preserves paragraphs without accepting indentation or trailing-space hard breaks", () => {
    const profile = createEmptyProfile("en");
    profile.visibility.presentation = true;
    profile.data.presentation.bio = "  First  \nline\n \t\n    Second\n\n\nThird  ";
    expect(markdown(generateReadme(profile))).toBe("First\nline\n\nSecond\n\nThird\n");
  });

  it("keeps link labels on one line and escapes nested link syntax", () => {
    const profile = contactProfile(
      "https://example.com",
      "[click](javascript:alert(1))\n# Heading",
    );
    expect(markdown(generateReadme(profile))).toBe(
      "## Contact\n\n- [\\[click\\]\\(javascript&#58;alert\\(1\\)\\) \\# Heading](<https://example.com/>)\n",
    );
  });

  it("protects literal entities, addresses and backslashes", () => {
    const profile = createEmptyProfile("en");
    profile.visibility.presentation = true;
    profile.data.presentation.bio = "&lt;script&gt; https://example.com alex@example.com \\path";
    expect(markdown(generateReadme(profile))).toBe(
      "&amp;lt;script&amp;gt; https&#58;//example\\.com alex&#64;example\\.com \\\\path\n",
    );
  });

  it("replaces nonprinting controls and directional override controls only in output", () => {
    const profile = createEmptyProfile("en");
    profile.visibility.presentation = true;
    profile.data.presentation.bio = "Alex\u0000\u001b\u202eprofile\u2066";
    expect(markdown(generateReadme(profile))).toBe("Alex\ufffd\ufffd\ufffdprofile\ufffd\n");
    expect(profile.data.presentation.bio).toContain("\u202e");
  });
});

describe("contact URL export rules", () => {
  it.each([
    ["https://example.com/profile", "https://example.com/profile"],
    ["http://localhost:3000/alex", "http://localhost:3000/alex"],
    ["HTTPS://EXAMPLE.COM", "https://example.com/"],
    ["https://münich.example/alex", "https://xn--mnich-kva.example/alex"],
    ["mailto:alex+work@example.com", "mailto:alex+work@example.com"],
    ["MAILTO:Alex@Example.com", "mailto:Alex@Example.com"],
    ["mailto:alex.o'rivera@example.com", "mailto:alex.o'rivera@example.com"],
  ])("accepts an explicit supported contact URL: %s", (input, expected) => {
    expect(markdown(generateReadme(contactProfile(input)))).toContain(`(<${expected}>)`);
  });

  it.each([
    "",
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:alert(1)",
    "file:///tmp/profile",
    "ftp://example.com",
    "//example.com",
    "/profile",
    "example.com",
    "https:example.com",
    "https:/example.com",
    "https://",
    "https:////example.com",
    "https://user:password@example.com",
    "https://@example.com",
    "https://user@example.com",
    "https://example.com:99999",
    " https://example.com",
    "https://example.com ",
    "https://example.com/a b",
    "https://example.com/\nprofile",
    "https://example.com/\tprofile",
    "https://example.com/\u0000profile",
    "https://example.com/\u0085profile",
    "https://example.com/\\profile",
    "mailto:alex@example.com?subject=Hello",
    "mailto:alex@example.com#fragment",
    "mailto:alex%0d%0a@example.com",
    "mailto:alex@example.com,other@example.com",
    "mailto:alex@example.com;other@example.com",
    "mailto:alex@localhost",
    "mailto:alex@-example.com",
    "mailto:alex@example..com",
    "mailto:alex..rivera@example.com",
    "mailto:.alex@example.com",
    "mailto:alex@",
    "mailto:@example.com",
  ])("rejects an invalid or unsupported contact URL: %s", (url) => {
    expect(generateReadme(contactProfile(url))).toEqual({
      success: false,
      errors: [{ code: "invalid_url", path: ["data", "contact", "links", 0, "url"] }],
    });
  });

  it("uses an escaped URL as the label when a label is empty", () => {
    expect(markdown(generateReadme(contactProfile("https://example.com", " \n ")))).toBe(
      "## Contact\n\n- [https&#58;//example\\.com](<https://example.com/>)\n",
    );
  });

  it("retains original array indices in errors when empty contacts are skipped", () => {
    const profile = contactProfile();
    profile.data.contact.links = [
      { id: "empty", label: "", url: "" },
      { id: "invalid", label: "Website", url: "javascript:alert(1)" },
    ];
    expect(generateReadme(profile)).toEqual({
      success: false,
      errors: [{ code: "invalid_url", path: ["data", "contact", "links", 1, "url"] }],
    });
  });

  it("encodes entities and delimiters without altering the resulting link target", () => {
    const profile = contactProfile("https://example.com/a(b)?copy=1&copy;=2#section", "Website");
    expect(markdown(generateReadme(profile))).toBe(
      "## Contact\n\n- [Website](<https://example.com/a(b)?copy=1&amp;copy;=2#section>)\n",
    );
  });
});
